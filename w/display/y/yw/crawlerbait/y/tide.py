#!/usr/bin/env python3
"""Metabolize already-captured local Traces into current Crawlerbait state, Baits and Membrane."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from hashlib import sha256
from html import escape
from pathlib import Path
import argparse
import json
import shutil

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
BAIT_ROOT = ROOT / "w"
TRACE_ROOT = ROOT / "x"
STATE_PATH = TRACE_ROOT / "state.json"
CHECKPOINT_PATH = TRACE_ROOT / "checkpoint.json"
CAPTURE_ROOT = TRACE_ROOT / "captures"
PROJECTION_PATH = ROOT / "z" / "projection.json"
PUBLIC_ROOT = ROOT / "z" / "public"
ADDRESS_ALPHABET = "wxzy"


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def stamp(value: datetime) -> str:
    return value.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def initial_state(start: str | None = None):
    return {"version": 4, "last_complete_end": start, "applied_capture_end": start, "routes": {}}


def normalize_state(value: dict) -> dict:
    if value.get("version") not in (3, 4) or not isinstance(value.get("routes"), dict):
        raise ValueError("crawlerbait trace state must be generation 3 or 4")
    out = json.loads(json.dumps(value))
    out["version"] = 4
    applied = out.get("applied_capture_end") or out.get("last_complete_end")
    out["applied_capture_end"] = applied
    return out


def load_state():
    if not STATE_PATH.is_file():
        raise SystemExit("crawlerbait derived trace state is missing")
    return normalize_state(read_json(STATE_PATH))


def observed_path(raw) -> str:
    return raw if isinstance(raw, str) else str(raw)


def public_signature(user_agent) -> dict:
    raw = user_agent if isinstance(user_agent, str) else str(user_agent)
    return {"id": sha256(raw.encode("utf-8", "replace")).hexdigest()[:16], "claimed_user_agent": raw}


def empty_record(path: str, start: str, end: str):
    return {
        "path": path,
        "observed_404": 0,
        "first_observed_window": {"start": start, "end": end},
        "last_observed_window": {"start": start, "end": end},
        "materialized_at": end,
        "sampled": False,
        "signatures": {},
    }


def assimilate(state: dict, groups: list, start: datetime, end: datetime):
    out = json.loads(json.dumps(state))
    changed = False
    start_s, end_s = stamp(start), stamp(end)
    for group in groups:
        dims = group.get("dimensions") or {}
        path = observed_path(dims.get("clientRequestPath", ""))
        count = int(round(float(group.get("count") or 0)))
        if count <= 0:
            continue
        record = out["routes"].setdefault(path, empty_record(path, start_s, end_s))
        record["observed_404"] += count
        record["last_observed_window"] = {"start": start_s, "end": end_s}
        interval = float((group.get("avg") or {}).get("sampleInterval") or 1)
        record["sampled"] = bool(record.get("sampled") or interval > 1.000001)
        sig = public_signature(dims.get("userAgent", ""))
        item = record["signatures"].setdefault(sig["id"], {**sig, "observed_404": 0})
        item["observed_404"] += count
        changed = True
    return out, changed


def capture_paths():
    if not CAPTURE_ROOT.is_dir():
        return []
    return sorted(
        p for p in CAPTURE_ROOT.iterdir()
        if p.is_file() and p.name != "manifest.json" and p.name.endswith((".capture.json", ".json"))
    )


def capture_groups(value: dict) -> list:
    if value.get("version") == 1 and isinstance(value.get("groups"), list):
        return value["groups"]
    if value.get("version") == 2 and isinstance(value.get("provider_response"), dict):
        zones = value["provider_response"].get("data", {}).get("viewer", {}).get("zones", [])
        if len(zones) == 1 and isinstance(zones[0].get("groups"), list):
            return zones[0]["groups"]
    raise RuntimeError("capture has no usable Cloudflare group payload")


def load_capture(path: Path) -> dict:
    value = read_json(path)
    if value.get("source") != "cloudflare:httpRequestsAdaptiveGroups":
        raise RuntimeError(f"invalid crawlerbait capture {path.name}")
    window = value.get("window") or {}
    if not isinstance(window.get("start"), str) or not isinstance(window.get("end"), str):
        raise RuntimeError(f"capture {path.name} has no valid window")
    capture_groups(value)
    return value


def apply_capture(state: dict, capture: dict):
    out = normalize_state(state)
    start = parse_time(capture["window"]["start"])
    end = parse_time(capture["window"]["end"])
    applied_s = out.get("applied_capture_end")
    if not applied_s:
        raise RuntimeError("derived state has no applied capture cursor")
    applied = parse_time(applied_s)
    if end <= applied:
        return out, False
    if start < applied < end:
        raise RuntimeError("capture overlaps the applied cursor")
    if start != applied:
        raise RuntimeError(f"capture gap: state ends {stamp(applied)} but next capture starts {stamp(start)}")
    out, _ = assimilate(out, capture_groups(capture), start, end)
    out["version"] = 4
    out["applied_capture_end"] = stamp(end)
    out["last_complete_end"] = stamp(end)
    return out, True


def apply_pending(state: dict):
    out = normalize_state(state)
    applied_files = []
    for path in capture_paths():
        next_state, applied = apply_capture(out, load_capture(path))
        if applied:
            out = next_state
            applied_files.append(path.name)
    return out, applied_files


def replay_from_checkpoint():
    if not CHECKPOINT_PATH.is_file():
        raise RuntimeError("crawlerbait local replay checkpoint is missing")
    state = normalize_state(read_json(CHECKPOINT_PATH))
    state["applied_capture_end"] = state.get("last_complete_end")
    for path in capture_paths():
        state, _ = apply_capture(state, load_capture(path))
    return state


def identity_code(path: str) -> str:
    out = []
    for byte in sha256(path.encode("utf-8", "replace")).digest():
        for shift in (6, 4, 2, 0):
            out.append(ADDRESS_ALPHABET[(byte >> shift) & 3])
    return "".join(out)


def bait_addresses(paths) -> dict[str, str]:
    paths = sorted(set(paths))
    codes = {path: identity_code(path) for path in paths}
    addresses = {}
    for path in paths:
        code = codes[path]
        depth = 1
        while any(other != path and codes[other].startswith(code[:depth]) for other in paths):
            depth += 1
            if depth > len(code):
                raise RuntimeError("bait identity hash collision exhausted address code")
        addresses[path] = code[:depth]
    if len(set(addresses.values())) != len(addresses):
        raise RuntimeError("bait-space exact raw occupancy collision")
    return addresses


def bait_dir(address: str) -> Path:
    return BAIT_ROOT / ("w" + address)


def local_bait_parts(path: str):
    if not isinstance(path, str) or not path.startswith("/") or path == "/":
        return None
    if any(ord(ch) < 32 for ch in path) or any(ch in path for ch in ("\\", "?", "#", "%")):
        return None
    parts = path.rstrip("/")[1:].split("/")
    if not parts or any(part in ("", ".", "..") or part.startswith(".") for part in parts):
        return None
    if any(len(part.encode("utf-8")) > 180 for part in parts):
        return None
    return parts


def receipt_id(path: str) -> str:
    return sha256(path.encode("utf-8", "replace")).hexdigest()[:20]


def public_href(path: str) -> str:
    parts = local_bait_parts(path)
    if parts:
        return "/crawlerbait/bait/" + "/".join(parts) + "/"
    return f"/crawlerbait/receipt/{receipt_id(path)}/"


def bait_snapshot(record: dict, address: str) -> dict:
    return {
        "version": 1,
        "id": receipt_id(record["path"]),
        "bait_address": address,
        "observed_path": record["path"],
        "observed_404": record["observed_404"],
        "first_observed_window": record["first_observed_window"],
        "last_observed_window": record["last_observed_window"],
        "materialized_at": record["materialized_at"],
        "sampled": bool(record["sampled"]),
        "signatures": sorted(record["signatures"].values(), key=lambda s: (-s["observed_404"], s["id"])),
        "public_href": public_href(record["path"]),
    }


def render_bait_space(state: dict):
    if BAIT_ROOT.exists():
        shutil.rmtree(BAIT_ROOT)
    BAIT_ROOT.mkdir(parents=True, exist_ok=True)
    addresses = bait_addresses(state["routes"])
    for path in sorted(state["routes"]):
        target = bait_dir(addresses[path])
        target.mkdir(parents=True, exist_ok=False)
        write_json(target / "bait.json", bait_snapshot(state["routes"][path], addresses[path]))


def route_output(path: str) -> Path:
    parts = local_bait_parts(path)
    if parts:
        return PUBLIC_ROOT / "crawlerbait" / "bait" / Path(*parts) / "index.html"
    return PUBLIC_ROOT / "crawlerbait" / "receipt" / receipt_id(path) / "index.html"


def projection_from(state: dict):
    addresses = bait_addresses(state["routes"])
    routes = sorted(state["routes"].values(), key=lambda r: (-r["observed_404"], r["path"]))
    signature_ids = {sid for r in routes for sid in r["signatures"]}
    return {
        "source": "crawlerbait/x/state.json",
        "trace_source": "crawlerbait/x/checkpoint.json + crawlerbait/x/captures/*.json",
        "bait_space": "crawlerbait:w",
        "updated_at": state.get("last_complete_end"),
        "summary": {
            "baits": len(routes),
            "observed_404": sum(r["observed_404"] for r in routes),
            "observed_signatures": len(signature_ids),
        },
        "policy": {
            "observation_domain": "all captured Cloudflare 404 groups",
            "growth_gate": "none",
            "public_namespace": "/crawlerbait/",
            "bait_addressing": "shortest unique prefix of stable path identity in tetrahedral bait-space",
        },
        "routes": [
            {
                "address": addresses[r["path"]],
                "path": r["path"],
                "href": public_href(r["path"]),
                "path_shape_preserved": local_bait_parts(r["path"]) is not None,
                "observed_404": r["observed_404"],
                "materialized_at": r["materialized_at"],
                "last_observed_window": r["last_observed_window"],
                "sampled": r["sampled"],
                "signatures": sorted(r["signatures"].values(), key=lambda s: (-s["observed_404"], s["id"])),
            }
            for r in routes
        ],
    }


def page(title: str, body: str) -> str:
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><title>{escape(title)}</title><link rel="alternate" type="application/json" href="/crawlerbait/state.json"><style>:root{{color-scheme:dark}}body{{max-width:760px;margin:7vh auto;padding:24px;font:16px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;background:#071016;color:#d8e1df}}a{{color:#ff8a5b}}code{{color:#ffd3c2}}.dim{{color:#8fa29e}}li{{margin:.45rem 0;overflow-wrap:anywhere}}</style></head><body>{body}</body></html>'''


def render_public(state: dict):
    projection = projection_from(state)
    if PUBLIC_ROOT.exists():
        shutil.rmtree(PUBLIC_ROOT)
    (PUBLIC_ROOT / "crawlerbait").mkdir(parents=True, exist_ok=True)
    write_json(PUBLIC_ROOT / "crawlerbait" / "state.json", projection)
    links = "".join(
        f'<li><a href="{escape(r["href"], quote=True)}"><code>{escape(r["path"])}</code></a> · bait:{escape(r["address"])} · {r["observed_404"]} observations</li>'
        for r in projection["routes"]
    ) or '<li class="dim">No 404 pressure observed yet.</li>'
    hub = (
        '<p class="dim">organism:crawlerbait · static machine-facing reef</p>'
        '<h1>crawlerbait</h1>'
        '<p>captured traces · local metabolism · static bait-space</p>'
        f'<h2>observed baits</h2><ul>{links}</ul>'
        '<p><a href="/crawlerbait/state.json">machine-readable projection</a></p>'
    )
    (PUBLIC_ROOT / "crawlerbait" / "index.html").write_text(page("crawlerbait", hub), encoding="utf-8")
    all_links = "".join(
        f'<li><a href="{escape(r["href"], quote=True)}">{escape(r["path"])}</a></li>'
        for r in projection["routes"]
    )
    for route in projection["routes"]:
        sigs = "".join(
            f'<li><code>{escape(s["claimed_user_agent"])}</code> · <code>{escape(s["id"])}</code> · {s["observed_404"]}</li>'
            for s in route["signatures"]
        ) or '<li class="dim">No retained signature.</li>'
        representation = (
            "crawlerbait-local bait path mirrors observed path shape"
            if route["path_shape_preserved"]
            else "crawlerbait-local deterministic receipt"
        )
        body = (
            '<p><a href="/crawlerbait/">← crawlerbait</a></p>'
            f'<p class="dim">bait-space {escape(route["address"])} · captured 404 trace</p>'
            f'<h1><code>{escape(route["path"])}</code></h1>'
            '<ul>'
            f'<li>observed 404 requests: <strong>{route["observed_404"]}</strong></li>'
            f'<li>bait address: <code>{escape(route["address"])}</code></li>'
            f'<li>materialized: <code>{escape(route["materialized_at"])}</code></li>'
            f'<li>representation: <code>{escape(representation)}</code></li>'
            f'<li>adaptive sampling observed: <code>{str(bool(route["sampled"])).lower()}</code></li>'
            '</ul>'
            f'<h2>observed claimed user-agents</h2><ul>{sigs}</ul>'
            f'<h2>other observed paths</h2><ul>{all_links}</ul>'
            '<small>User-Agent strings are claims made by clients and are spoofable. The current sensor does not request client IP addresses.</small>'
        )
        out = route_output(route["path"])
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page(f'{route["path"]} · crawlerbait', body), encoding="utf-8")


def write_outputs(state: dict):
    write_json(STATE_PATH, state)
    render_bait_space(state)
    write_json(PROJECTION_PATH, projection_from(state))
    render_public(state)


def self_test():
    start = datetime(2026, 9, 17, 0, 0, tzinfo=timezone.utc)
    middle = start + timedelta(hours=6)
    end = middle + timedelta(hours=6)
    state = initial_state(stamp(start))
    first = {
        "version": 1,
        "source": "cloudflare:httpRequestsAdaptiveGroups",
        "window": {"start": stamp(start), "end": stamp(middle)},
        "groups": [
            {"count": 3, "avg": {"sampleInterval": 1}, "dimensions": {"clientRequestPath": "/login", "userAgent": "CrabBot/1.0"}},
            {"count": 1, "avg": {"sampleInterval": 1}, "dimensions": {"clientRequestPath": "/.env", "userAgent": "Spray/9"}},
        ],
    }
    state, applied = apply_capture(state, first)
    assert applied and state["applied_capture_end"] == stamp(middle)
    empty = {
        "version": 1,
        "source": "cloudflare:httpRequestsAdaptiveGroups",
        "window": {"start": stamp(middle), "end": stamp(end)},
        "groups": [],
    }
    state, applied = apply_capture(state, empty)
    assert applied and state["applied_capture_end"] == stamp(end)
    assert set(state["routes"]) == {"/login", "/.env"}
    addresses = bait_addresses(state["routes"])
    assert len(set(addresses.values())) == 2
    assert public_href("/login") == "/crawlerbait/bait/login/"
    assert public_href("/.env").startswith("/crawlerbait/receipt/")
    print("PASS · tide consumes local captures only; empty windows advance continuity without touching Cloudflare")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        self_test()
        return

    state = load_state()
    next_state, applied_files = apply_pending(state)
    print(json.dumps({
        "status": "metabolized" if applied_files else "no-pending-captures",
        "captures": applied_files,
        "paths": len(next_state["routes"]),
        "applied_capture_end": next_state.get("applied_capture_end"),
    }, indent=2))
    if args.write and applied_files:
        write_outputs(next_state)
    elif args.write:
        print("no local captures pending; downstream body left byte-identical")


if __name__ == "__main__":
    main()
