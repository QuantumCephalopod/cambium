#!/usr/bin/env python3
"""One bounded Cloudflare observation tide for the independently rooted Crawlerbait holon."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from hashlib import sha256
from html import escape
from pathlib import Path
import argparse
import copy
import json
import os
import re
import shutil
import urllib.error
import urllib.request

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
POLICY_PATH = ROOT / "z" / "policy.json"
STATE_PATH = ROOT / "x" / "state.json"
PROJECTION_PATH = ROOT / "w" / "projection.json"
PUBLIC_ROOT = ROOT / "w" / "public"
GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql"
SEGMENT = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$")
ZONE_TAG = re.compile(r"^[A-Fa-f0-9]{32}$")
UA_TOKEN = re.compile(r"^\s*([A-Za-z0-9._+-]+(?:/[A-Za-z0-9._+-]+)?)")


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def stamp(value: datetime) -> str:
    return value.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def initial_state():
    return {"version": 1, "last_complete_end": None, "candidates": {}, "routes": {}}


def load_state():
    state = read_json(STATE_PATH) if STATE_PATH.is_file() else initial_state()
    if state.get("version") != 1 or not isinstance(state.get("candidates"), dict) or not isinstance(state.get("routes"), dict):
        raise ValueError("unsupported crawlerbait state")
    return state


def safe_path(raw: str, policy: dict) -> str | None:
    if not isinstance(raw, str) or not raw.startswith("/") or len(raw) > int(policy["max_path_length"]):
        return None
    if any(c in raw for c in ("%", "?", "#", "\\")) or any(ord(ch) < 32 for ch in raw):
        return None
    normalized = raw.rstrip("/") or "/"
    if normalized == "/":
        return None
    for prefix in policy["reserved_prefixes"]:
        if normalized == prefix or normalized.startswith(prefix + "/"):
            return None
    parts = normalized[1:].split("/")
    if len(parts) > int(policy["max_depth"]) or any(not SEGMENT.fullmatch(part) for part in parts):
        return None
    return "/" + "/".join(parts)


def public_signature(user_agent: str):
    raw = user_agent if isinstance(user_agent, str) else ""
    digest = sha256(raw.encode("utf-8", "replace")).hexdigest()[:16]
    match = UA_TOKEN.match(raw)
    family = match.group(1)[:80] if match else "unknown"
    return {"id": digest, "claimed_family": family}


def cloudflare_query(zone: str, start: datetime, end: datetime, limit: int) -> str:
    if not ZONE_TAG.fullmatch(zone):
        raise ValueError("CLOUDFLARE_ZONE_TAG must be 32 hex characters")
    return f'''{{
  viewer {{
    zones(filter: {{ zoneTag: "{zone}" }}) {{
      groups: httpRequestsAdaptiveGroups(
        filter: {{
          datetime_geq: "{stamp(start)}"
          datetime_lt: "{stamp(end)}"
          requestSource: "eyeball"
          edgeResponseStatus_geq: 404
          edgeResponseStatus_lt: 405
        }}
        limit: {int(limit)}
        orderBy: [count_DESC]
      ) {{
        count
        avg {{ sampleInterval }}
        dimensions {{ clientRequestPath userAgent }}
      }}
    }}
  }}
}}'''


def fetch_groups(token: str, zone: str, start: datetime, end: datetime, limit: int):
    body = json.dumps({"query": cloudflare_query(zone, start, end, limit)}).encode()
    request = urllib.request.Request(
        GRAPHQL_ENDPOINT,
        data=body,
        method="POST",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json", "User-Agent": "sss-crawlerbait-tide/2"},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:1000]
        raise RuntimeError(f"Cloudflare GraphQL HTTP {exc.code}: {detail}") from exc
    if payload.get("errors"):
        raise RuntimeError("Cloudflare GraphQL error: " + json.dumps(payload["errors"], ensure_ascii=False)[:1500])
    zones = payload.get("data", {}).get("viewer", {}).get("zones", [])
    if len(zones) != 1 or not isinstance(zones[0].get("groups"), list):
        raise RuntimeError("unexpected Cloudflare GraphQL response")
    return zones[0]["groups"]


def empty_record(path: str, start: str, end: str):
    return {
        "path": path,
        "observed_404": 0,
        "first_observed_window": {"start": start, "end": end},
        "last_observed_window": {"start": start, "end": end},
        "sampled": False,
        "signatures": {},
    }


def assimilate(state: dict, groups: list, start: datetime, end: datetime, policy: dict):
    out = copy.deepcopy(state)
    changed = False
    start_s, end_s = stamp(start), stamp(end)
    for group in groups:
        dims = group.get("dimensions") or {}
        path = safe_path(dims.get("clientRequestPath"), policy)
        count = int(round(float(group.get("count") or 0)))
        if not path or count <= 0:
            continue
        target = out["routes"] if path in out["routes"] else out["candidates"]
        record = target.setdefault(path, empty_record(path, start_s, end_s))
        sig = public_signature(dims.get("userAgent", ""))
        record["observed_404"] += count
        record["last_observed_window"] = {"start": start_s, "end": end_s}
        interval = float((group.get("avg") or {}).get("sampleInterval") or 1)
        record["sampled"] = bool(record.get("sampled") or interval > 1.000001)
        item = record["signatures"].setdefault(sig["id"], {**sig, "observed_404": 0})
        item["observed_404"] += count
        limit = int(policy["max_signatures_per_path"])
        record["signatures"] = dict(sorted(record["signatures"].items(), key=lambda kv: (-kv[1]["observed_404"], kv[0]))[:limit])
        changed = True

    eligible = sorted(
        (r for r in out["candidates"].values() if r["observed_404"] >= int(policy["min_404_requests"])),
        key=lambda r: (-r["observed_404"], r["path"]),
    )
    capacity = max(0, int(policy["max_total_routes"]) - len(out["routes"]))
    for record in eligible[: min(int(policy["max_new_routes_per_tide"]), capacity)]:
        path = record["path"]
        grown = out["candidates"].pop(path)
        grown["materialized_at"] = end_s
        out["routes"][path] = grown
        changed = True

    max_candidates = int(policy["max_candidates"])
    if len(out["candidates"]) > max_candidates:
        keep = sorted(out["candidates"].values(), key=lambda r: (-r["observed_404"], r["path"]))[:max_candidates]
        out["candidates"] = {r["path"]: r for r in keep}
        changed = True
    if changed:
        out["last_complete_end"] = end_s
    return out, changed


def projection_from(state: dict, policy: dict):
    routes = sorted(state["routes"].values(), key=lambda r: (-r["observed_404"], r["path"]))
    return {
        "source": "crawlerbait/x/state.json",
        "updated_at": state.get("last_complete_end"),
        "summary": {
            "grown_routes": len(routes),
            "unresolved_candidates": len(state["candidates"]),
            "observed_404": sum(r["observed_404"] for r in routes),
        },
        "policy": {k: policy[k] for k in ("min_404_requests", "max_new_routes_per_tide", "max_total_routes")},
        "routes": [
            {
                "path": r["path"],
                "href": r["path"].rstrip("/") + "/",
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
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><title>{escape(title)}</title><link rel="alternate" type="application/json" href="/crawlerbait/state.json"><style>:root{{color-scheme:dark}}body{{max-width:760px;margin:7vh auto;padding:24px;font:16px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;background:#071016;color:#d8e1df}}a{{color:#ff8a5b}}code{{color:#ffd3c2}}.dim{{color:#8fa29e}}li{{margin:.45rem 0}}</style></head><body>{body}</body></html>'''


def route_output(path: str) -> Path:
    return PUBLIC_ROOT.joinpath(*path.strip("/").split("/"), "index.html")


def render_public(state: dict, policy: dict):
    projection = projection_from(state, policy)
    if PUBLIC_ROOT.exists():
        shutil.rmtree(PUBLIC_ROOT)
    (PUBLIC_ROOT / "crawlerbait").mkdir(parents=True, exist_ok=True)
    write_json(PUBLIC_ROOT / "crawlerbait" / "state.json", projection)
    links = "".join(f'<li><a href="{escape(r["href"], quote=True)}"><code>{escape(r["path"])}</code></a> · {r["observed_404"]} prior 404 observations</li>' for r in projection["routes"]) or '<li class="dim">No route has crossed the growth gate yet.</li>'
    hub = f'<p class="dim">organism:crawlerbait · static machine-facing reef</p><h1>crawlerbait</h1><p>Cloudflare observes ordinary public traffic. A bounded later tide sediments recurring 404 pressure into static pages. No bait request executes a Worker.</p><h2>grown routes</h2><ul>{links}</ul><p><a href="/crawlerbait/state.json">machine-readable projection</a></p>'
    (PUBLIC_ROOT / "crawlerbait" / "index.html").write_text(page("crawlerbait", hub), encoding="utf-8")
    all_links = "".join(f'<li><a href="{escape(r["href"], quote=True)}">{escape(r["path"])}</a></li>' for r in projection["routes"])
    for route in projection["routes"]:
        sigs = "".join(f'<li><code>{escape(s["claimed_family"])}</code> · <code>{escape(s["id"])}</code> · {s["observed_404"]}</li>' for s in route["signatures"]) or '<li class="dim">No retained signature.</li>'
        body = f'<p><a href="/crawlerbait/">← crawlerbait</a></p><p class="dim">404 sediment · previously absent path</p><h1><code>{escape(route["path"])}</code></h1><p>This static page materialized after repeated requests for this path were observed returning 404 at the Cloudflare membrane.</p><ul><li>prior 404 observations: <strong>{route["observed_404"]}</strong></li><li>materialized: <code>{escape(route["materialized_at"])}</code></li><li>adaptive sampling observed: <code>{str(bool(route["sampled"])).lower()}</code></li></ul><h2>observed signatures</h2><ul>{sigs}</ul><h2>other grown routes</h2><ul>{all_links}</ul><small>User-Agent families are self-claimed and spoofable. Raw IPs and raw User-Agent strings are not published.</small>'
        out = route_output(route["path"])
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page(f'{route["path"]} · crawlerbait', body), encoding="utf-8")


def compute_window(state: dict, policy: dict, now: datetime):
    end = now.astimezone(timezone.utc) - timedelta(minutes=int(policy["settle_delay_minutes"]))
    start = parse_time(state["last_complete_end"]) if state.get("last_complete_end") else end - timedelta(hours=int(policy["bootstrap_hours"]))
    return max(start, end - timedelta(hours=int(policy["max_window_hours"]))), end


def fixture_groups(path: Path):
    value = read_json(path)
    if isinstance(value, list):
        return value
    zones = value.get("data", {}).get("viewer", {}).get("zones", [])
    if len(zones) == 1 and isinstance(zones[0].get("groups"), list):
        return zones[0]["groups"]
    raise ValueError("fixture must be a group list or Cloudflare GraphQL response")


def self_test():
    policy = read_json(POLICY_PATH)
    start = datetime(2026, 9, 17, 0, 0, tzinfo=timezone.utc)
    end = start + timedelta(hours=6)
    groups = [
        {"count": 3, "avg": {"sampleInterval": 1}, "dimensions": {"clientRequestPath": "/login", "userAgent": "CrabBot/1.0"}},
        {"count": 1, "avg": {"sampleInterval": 1}, "dimensions": {"clientRequestPath": "/admin", "userAgent": "Other/1"}},
        {"count": 99, "avg": {"sampleInterval": 1}, "dimensions": {"clientRequestPath": "/assets/nope", "userAgent": "Spray/9"}},
        {"count": 99, "avg": {"sampleInterval": 1}, "dimensions": {"clientRequestPath": "/.env", "userAgent": "Spray/9"}},
    ]
    state, changed = assimilate(initial_state(), groups, start, end, policy)
    assert changed and "/login" in state["routes"] and "/admin" in state["candidates"]
    assert "/assets/nope" not in state["candidates"] and "/.env" not in state["candidates"]
    assert projection_from(state, policy)["source"] == "crawlerbait/x/state.json"
    assert route_output("/login").as_posix().endswith("w/public/login/index.html")
    print("PASS · crawlerbait local y/adaptation tide obeys z/boundary and x/continuity before w/sediment")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--fixture", type=Path)
    ap.add_argument("--now")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        self_test(); return
    policy, state = read_json(POLICY_PATH), load_state()
    now = parse_time(args.now) if args.now else datetime.now(timezone.utc)
    start, end = compute_window(state, policy, now)
    if end <= start:
        print(json.dumps({"status": "no-window"})); return
    if args.fixture:
        groups = fixture_groups(args.fixture)
    else:
        token = os.environ.get("CLOUDFLARE_ANALYTICS_TOKEN", "").strip()
        zone = os.environ.get("CLOUDFLARE_ZONE_TAG", "").strip()
        if not token or not zone:
            raise SystemExit("crawlerbait tide is unarmed: CLOUDFLARE_ANALYTICS_TOKEN and CLOUDFLARE_ZONE_TAG are required")
        groups = fetch_groups(token, zone, start, end, int(policy["query_limit"]))
    next_state, changed = assimilate(state, groups, start, end, policy)
    print(json.dumps({"status": "changed" if changed else "no-admitted-pressure", "window": {"start": stamp(start), "end": stamp(end)}, "groups": len(groups), "routes": len(next_state["routes"]), "candidates": len(next_state["candidates"])}, indent=2))
    if args.write and changed:
        write_json(STATE_PATH, next_state)
        write_json(PROJECTION_PATH, projection_from(next_state, policy))
        render_public(next_state, policy)
    elif args.write:
        print("no admitted pressure; organism left byte-identical")


if __name__ == "__main__":
    main()
