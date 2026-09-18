#!/usr/bin/env python3
"""Metabolize owned web-traffic Traces into Baits, traffic beings and public Membrane."""
from __future__ import annotations

from datetime import datetime, timezone
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


def observed_path(raw) -> str:
    return raw if isinstance(raw, str) else str(raw or "")


# --- legacy 404 evidence: preserved, never extended ---------------------------------

def normalize_legacy_state(value: dict) -> dict:
    if value.get("version") not in (3, 4) or not isinstance(value.get("routes"), dict):
        raise ValueError("legacy crawlerbait checkpoint must be generation 3 or 4")
    out = json.loads(json.dumps(value))
    out["version"] = 4
    out["applied_capture_end"] = out.get("applied_capture_end") or out.get("last_complete_end")
    return out


def legacy_capture_paths():
    return sorted(CAPTURE_ROOT.glob("*.capture.json")) if CAPTURE_ROOT.is_dir() else []


def legacy_groups(value: dict) -> list:
    if value.get("version") == 1 and isinstance(value.get("groups"), list):
        return value["groups"]
    provider = value.get("provider_response") or {}
    zones = provider.get("data", {}).get("viewer", {}).get("zones", [])
    if value.get("version") == 2 and len(zones) == 1 and isinstance(zones[0].get("groups"), list):
        return zones[0]["groups"]
    raise RuntimeError("legacy capture has no group payload")


def assimilate_legacy(state: dict, groups: list, start: str, end: str):
    out = json.loads(json.dumps(state))
    for group in groups:
        dims = group.get("dimensions") or {}
        path = observed_path(dims.get("clientRequestPath", ""))
        count = int(round(float(group.get("count") or 0)))
        if count <= 0:
            continue
        record = out["routes"].setdefault(path, {
            "path": path,
            "observed_404": 0,
            "first_observed_window": {"start": start, "end": end},
            "last_observed_window": {"start": start, "end": end},
            "materialized_at": end,
            "sampled": False,
            "signatures": {},
        })
        record["observed_404"] += count
        record["last_observed_window"] = {"start": start, "end": end}
        interval = float((group.get("avg") or {}).get("sampleInterval") or 1)
        record["sampled"] = bool(record.get("sampled") or interval > 1.000001)
        ua = str(dims.get("userAgent") or "")
        sid = sha256(ua.encode("utf-8", "replace")).hexdigest()[:16]
        sig = record["signatures"].setdefault(sid, {"id": sid, "claimed_user_agent": ua, "observed_404": 0})
        sig["observed_404"] += count
    return out


def replay_legacy():
    state = normalize_legacy_state(read_json(CHECKPOINT_PATH))
    expected = state.get("last_complete_end")
    for path in legacy_capture_paths():
        value = read_json(path)
        if value.get("source") != "cloudflare:httpRequestsAdaptiveGroups":
            raise RuntimeError(f"invalid legacy capture {path.name}")
        window = value.get("window") or {}
        if window.get("start") != expected:
            raise RuntimeError(f"legacy capture gap before {path.name}")
        state = assimilate_legacy(state, legacy_groups(value), window["start"], window["end"])
        expected = window["end"]
    state["last_complete_end"] = expected
    state["applied_capture_end"] = expected
    return state


# --- canonical raw web-traffic evidence ----------------------------------------------

def raw_capture_paths():
    return sorted(CAPTURE_ROOT.glob("*.traffic.json")) if CAPTURE_ROOT.is_dir() else []


def raw_records(value: dict) -> list:
    if value.get("version") != 3 or value.get("source") != "cloudflare:httpRequestsAdaptive":
        raise RuntimeError("invalid raw traffic capture")
    provider = value.get("provider_response") or {}
    zones = provider.get("data", {}).get("viewer", {}).get("zones", [])
    if len(zones) != 1 or not isinstance(zones[0].get("records"), list):
        raise RuntimeError("raw traffic capture has no records payload")
    return zones[0]["records"]


def traffic_identity(record: dict) -> dict:
    ip = str(record.get("clientIP") or "")
    ua = str(record.get("userAgent") or "")
    basis = (ip + "\x00" + ua).encode("utf-8", "replace")
    return {
        "id": sha256(basis).hexdigest()[:24],
        "client_ip": ip,
        "user_agent": ua,
    }


def bump_set(counter: dict, value) -> None:
    raw = str(value or "")
    if raw:
        counter[raw] = int(counter.get(raw, 0)) + 1


def empty_route(path: str):
    return {
        "path": path,
        "legacy_404_observations": 0,
        "raw_requests": 0,
        "first_seen": None,
        "last_seen": None,
        "statuses": {},
        "crawlers": {},
    }


def assimilate_raw(state: dict, record: dict, source_file: str, source_index: int):
    path = observed_path(record.get("clientRequestPath", ""))
    moment = str(record.get("datetime") or "")
    route = state["routes"].setdefault(path, empty_route(path))
    route["raw_requests"] += 1
    if moment:
        route["first_seen"] = moment if not route["first_seen"] else min(route["first_seen"], moment)
        route["last_seen"] = moment if not route["last_seen"] else max(route["last_seen"], moment)
    status = str(record.get("edgeResponseStatus") or "")
    if status:
        route["statuses"][status] = int(route["statuses"].get(status, 0)) + 1

    identity = traffic_identity(record)
    cid = identity["id"]
    route["crawlers"][cid] = int(route["crawlers"].get(cid, 0)) + 1
    crawler = state["crawlers"].setdefault(cid, {
        **identity,
        "events": 0,
        "first_seen": None,
        "last_seen": None,
        "baits": {},
        "countries": {},
        "asns": {},
        "devices": {},
        "verified_bot_categories": {},
    })
    crawler["events"] += 1
    crawler["baits"][path] = int(crawler["baits"].get(path, 0)) + 1
    if moment:
        crawler["first_seen"] = moment if not crawler["first_seen"] else min(crawler["first_seen"], moment)
        crawler["last_seen"] = moment if not crawler["last_seen"] else max(crawler["last_seen"], moment)
    bump_set(crawler["countries"], record.get("clientCountryName"))
    bump_set(crawler["asns"], record.get("clientAsn"))
    bump_set(crawler["devices"], record.get("clientDeviceType"))
    bump_set(crawler["verified_bot_categories"], record.get("verifiedBotCategory"))

    state["encounters"].append({
        "t": moment,
        "crawler": cid,
        "path": path,
        "status": record.get("edgeResponseStatus"),
        "method": record.get("clientRequestHTTPMethodName"),
        "query": record.get("clientRequestQuery"),
        "source_file": source_file,
        "source_index": source_index,
    })


def rebuild_state():
    legacy = replay_legacy()
    state = {
        "version": 5,
        "legacy_404_through": legacy.get("last_complete_end"),
        "raw_capture_start": None,
        "raw_capture_end": None,
        "raw_requests": 0,
        "routes": {},
        "crawlers": {},
        "encounters": [],
    }

    for path, old in legacy["routes"].items():
        route = state["routes"].setdefault(path, empty_route(path))
        route["legacy_404_observations"] = int(old.get("observed_404") or 0)
        first = (old.get("first_observed_window") or {}).get("start")
        last = (old.get("last_observed_window") or {}).get("end")
        route["first_seen"] = first
        route["last_seen"] = last

    previous_end = None
    for path in raw_capture_paths():
        value = read_json(path)
        window = value.get("window") or {}
        start, end = window.get("start"), window.get("end")
        if not isinstance(start, str) or not isinstance(end, str):
            raise RuntimeError(f"raw traffic capture {path.name} has invalid window")
        if previous_end is not None and start != previous_end:
            raise RuntimeError(f"raw traffic capture gap before {path.name}")
        if state["raw_capture_start"] is None:
            state["raw_capture_start"] = start
        state["raw_capture_end"] = end
        previous_end = end
        records = raw_records(value)
        state["raw_requests"] += len(records)
        for index, record in enumerate(records):
            assimilate_raw(state, record, path.name, index)

    state["encounters"].sort(key=lambda e: (e.get("t") or "", e["source_file"], e["source_index"]))
    return state


# --- recursive bait-space addressing -------------------------------------------------

def identity_block(path: str, block: int) -> str:
    raw = path.encode("utf-8", "replace")
    digest = sha256(raw).digest() if block == 0 else sha256(
        raw + b"\x00crawlerbait-address-v1\x00" + str(block).encode("ascii")
    ).digest()
    out = []
    for byte in digest:
        for shift in (6, 4, 2, 0):
            out.append(ADDRESS_ALPHABET[(byte >> shift) & 3])
    return "".join(out)


def identity_prefix(path: str, length: int) -> str:
    if length < 1:
        return ""
    blocks = (length + 127) // 128
    return "".join(identity_block(path, block) for block in range(blocks))[:length]


def bait_addresses(paths) -> dict[str, str]:
    paths = sorted(set(paths))
    addresses = {}
    cache = {}

    def prefix(path: str, depth: int) -> str:
        key = (path, depth)
        if key not in cache:
            cache[key] = identity_prefix(path, depth)
        return cache[key]

    for path in paths:
        depth = 1
        while any(other != path and prefix(other, depth) == prefix(path, depth) for other in paths):
            depth += 1
        addresses[path] = prefix(path, depth)
    if len(set(addresses.values())) != len(addresses):
        raise RuntimeError("bait-space exact raw occupancy collision")
    return addresses


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
    return "/crawlerbait/bait/" + "/".join(parts) + "/" if parts else f"/crawlerbait/receipt/{receipt_id(path)}/"


def bait_snapshot(route: dict, address: str) -> dict:
    return {
        "version": 2,
        "id": receipt_id(route["path"]),
        "bait_address": address,
        "observed_path": route["path"],
        "raw_requests": route["raw_requests"],
        "legacy_404_observations": route["legacy_404_observations"],
        "first_seen": route["first_seen"],
        "last_seen": route["last_seen"],
        "crawlers": [
            {"id": cid, "events": count}
            for cid, count in sorted(route["crawlers"].items(), key=lambda x: (-x[1], x[0]))
        ],
        "public_href": public_href(route["path"]),
    }


def render_bait_space(state: dict):
    if BAIT_ROOT.exists():
        shutil.rmtree(BAIT_ROOT)
    BAIT_ROOT.mkdir(parents=True, exist_ok=True)
    addresses = bait_addresses(state["routes"])
    for path in sorted(state["routes"]):
        target = BAIT_ROOT / ("w" + addresses[path])
        target.mkdir(parents=True, exist_ok=False)
        write_json(target / "bait.json", bait_snapshot(state["routes"][path], addresses[path]))


# --- public embodiment ----------------------------------------------------------------

def projection_from(state: dict):
    addresses = bait_addresses(state["routes"])
    routes = sorted(
        state["routes"].values(),
        key=lambda r: (-(r["raw_requests"] + r["legacy_404_observations"]), r["path"]),
    )
    crawlers = []
    for crawler in sorted(state["crawlers"].values(), key=lambda c: (-c["events"], c["id"])):
        c = json.loads(json.dumps(crawler))
        c["baits"] = [
            {"address": addresses[path], "path": path, "events": count}
            for path, count in sorted(crawler["baits"].items(), key=lambda x: (-x[1], x[0]))
        ]
        crawlers.append(c)

    encounters = [
        {**event, "bait_address": addresses[event["path"]]}
        for event in state["encounters"]
    ]
    return {
        "source": "crawlerbait/x/state.json",
        "trace_source": "crawlerbait/x/captures/*.traffic.json (+ preserved legacy 404 evidence)",
        "bait_space": "crawlerbait:w",
        "updated_at": state.get("raw_capture_end") or state.get("legacy_404_through"),
        "summary": {
            "baits": len(routes),
            "web_requests": state["raw_requests"],
            "crawlers": len(crawlers),
            "legacy_404_observations": sum(r["legacy_404_observations"] for r in routes),
        },
        "policy": {
            "observation_domain": "all captured Cloudflare httpRequestsAdaptive web traffic",
            "semantic_filters": [],
            "traffic_identity": "exact clientIP + userAgent tuple",
            "growth_gate": "none",
            "public_namespace": "/crawlerbait/",
            "bait_addressing": "shortest unique prefix of an unbounded stable path-identity stream in tetrahedral bait-space",
        },
        "raw_capture_start": state.get("raw_capture_start"),
        "raw_capture_end": state.get("raw_capture_end"),
        "routes": [
            {
                "address": addresses[r["path"]],
                "path": r["path"],
                "href": public_href(r["path"]),
                "path_shape_preserved": local_bait_parts(r["path"]) is not None,
                "raw_requests": r["raw_requests"],
                "legacy_404_observations": r["legacy_404_observations"],
                "first_seen": r["first_seen"],
                "last_seen": r["last_seen"],
                "crawlers": [
                    {"id": cid, "events": count}
                    for cid, count in sorted(r["crawlers"].items(), key=lambda x: (-x[1], x[0]))
                ],
            }
            for r in routes
        ],
        "crawlers": crawlers,
        "encounters": encounters,
    }


def raw_public_manifest():
    files = []
    for path in raw_capture_paths():
        value = read_json(path)
        records = raw_records(value)
        rel = (
            "w/display/y/yw/crawlerbait/x/captures/" + path.name
        )
        files.append({
            "file": path.name,
            "window": value["window"],
            "records": len(records),
            "github": "https://github.com/self-similar-systems/cambium/blob/main/" + rel,
            "raw": "https://raw.githubusercontent.com/self-similar-systems/cambium/main/" + rel,
        })
    return {
        "source": "crawlerbait/x/captures/*.traffic.json",
        "semantic_filters": [],
        "fields": "every field Cloudflare advertised to the live httpRequestsAdaptive sensor at capture time",
        "files": files,
    }


def page(title: str, body: str) -> str:
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><title>{escape(title)}</title><link rel="alternate" type="application/json" href="/crawlerbait/state.json"><style>:root{{color-scheme:dark}}body{{max-width:860px;margin:7vh auto;padding:24px;font:16px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;background:#071016;color:#d8e1df}}a{{color:#ff8a5b}}code{{color:#ffd3c2}}.dim{{color:#8fa29e}}li{{margin:.45rem 0;overflow-wrap:anywhere}}</style></head><body>{body}</body></html>'''


def render_public(state: dict):
    projection = projection_from(state)
    if PUBLIC_ROOT.exists():
        shutil.rmtree(PUBLIC_ROOT)
    root = PUBLIC_ROOT / "crawlerbait"
    root.mkdir(parents=True, exist_ok=True)
    write_json(root / "state.json", projection)
    write_json(root / "traffic.json", raw_public_manifest())

    links = "".join(
        f'<li><a href="{escape(r["href"], quote=True)}"><code>{escape(r["path"])}</code></a> · bait:{escape(r["address"])} · {r["raw_requests"]} raw requests</li>'
        for r in projection["routes"]
    ) or '<li class="dim">No observed traffic yet.</li>'
    hub = (
        '<p class="dim">organism:crawlerbait · public web-traffic organism</p>'
        '<h1>crawlerbait</h1>'
        f'<p>{projection["summary"]["web_requests"]} raw requests · {projection["summary"]["crawlers"]} traffic beings · {projection["summary"]["baits"]} baits</p>'
        f'<h2>baits</h2><ul>{links}</ul>'
        '<p><a href="/crawlerbait/state.json">public organism state</a> · '
        '<a href="/crawlerbait/traffic.json">public raw traffic captures</a></p>'
    )
    (root / "index.html").write_text(page("crawlerbait", hub), encoding="utf-8")

    by_id = {c["id"]: c for c in projection["crawlers"]}
    for route in projection["routes"]:
        beings = "".join(
            f'<li><code>{escape(by_id[item["id"]]["client_ip"])}</code> · '
            f'<code>{escape(by_id[item["id"]]["user_agent"])}</code> · '
            f'{item["events"]} events · <code>{escape(item["id"])}</code></li>'
            for item in route["crawlers"]
        ) or '<li class="dim">Only preserved legacy 404 evidence exists for this bait.</li>'
        body = (
            '<p><a href="/crawlerbait/">← crawlerbait</a></p>'
            f'<p class="dim">bait-space {escape(route["address"])} · public web-traffic locus</p>'
            f'<h1><code>{escape(route["path"])}</code></h1>'
            '<ul>'
            f'<li>raw requests: <strong>{route["raw_requests"]}</strong></li>'
            f'<li>legacy 404 observations: <strong>{route["legacy_404_observations"]}</strong></li>'
            f'<li>bait address: <code>{escape(route["address"])}</code></li>'
            f'<li>first seen: <code>{escape(str(route["first_seen"] or "—"))}</code></li>'
            f'<li>last seen: <code>{escape(str(route["last_seen"] or "—"))}</code></li>'
            '</ul>'
            f'<h2>traffic beings observed here</h2><ul>{beings}</ul>'
            '<p><a href="/crawlerbait/traffic.json">exact raw capture files ↗</a></p>'
        )
        parts = local_bait_parts(route["path"])
        out = root / "bait" / Path(*parts) / "index.html" if parts else root / "receipt" / receipt_id(route["path"]) / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page(f'{route["path"]} · crawlerbait', body), encoding="utf-8")


def write_outputs(state: dict):
    write_json(STATE_PATH, state)
    render_bait_space(state)
    write_json(PROJECTION_PATH, projection_from(state))
    render_public(state)


def self_test():
    state = {
        "version": 5,
        "legacy_404_through": None,
        "raw_capture_start": "2026-09-18T00:00:00Z",
        "raw_capture_end": "2026-09-18T01:00:00Z",
        "raw_requests": 0,
        "routes": {},
        "crawlers": {},
        "encounters": [],
    }
    r1 = {
        "datetime": "2026-09-18T00:01:00Z",
        "clientIP": "203.0.113.7",
        "userAgent": "Crab/1",
        "clientRequestPath": "/a",
        "clientRequestQuery": "",
        "clientRequestHTTPMethodName": "GET",
        "edgeResponseStatus": 200,
        "clientCountryName": "DE",
    }
    r2 = {**r1, "datetime": "2026-09-18T00:02:00Z", "clientRequestPath": "/b"}
    assimilate_raw(state, r1, "a.traffic.json", 0)
    assimilate_raw(state, r2, "a.traffic.json", 1)
    state["raw_requests"] = 2
    assert len(state["crawlers"]) == 1
    crawler = next(iter(state["crawlers"].values()))
    assert set(crawler["baits"]) == {"/a", "/b"}
    assert len(state["encounters"]) == 2
    addresses = bait_addresses(state["routes"])
    assert len(set(addresses.values())) == 2
    legacy = "".join(
        ADDRESS_ALPHABET[(byte >> shift) & 3]
        for byte in sha256("/a".encode("utf-8")).digest()
        for shift in (6, 4, 2, 0)
    )
    assert identity_prefix("/a", 128) == legacy
    assert len(identity_prefix("/a", 513)) == 513
    print("PASS · tide makes exact IP+UA traffic beings span every bait they touched; no event ordering is invented")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        self_test()
        return

    state = rebuild_state()
    print(json.dumps({
        "status": "rebuilt-from-owned-traces",
        "raw_requests": state["raw_requests"],
        "crawlers": len(state["crawlers"]),
        "baits": len(state["routes"]),
        "raw_capture_end": state.get("raw_capture_end"),
    }, indent=2))
    if args.write:
        write_outputs(state)


if __name__ == "__main__":
    main()
