#!/usr/bin/env python3
"""Bounded Cloudflare 404 tide -> static crawlerbait sediment."""
from __future__ import annotations

from pathlib import Path
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from html import escape
import argparse
import copy
import json
import os
import re
import shutil
import urllib.error
import urllib.request

HERE = Path(__file__).resolve().parent
POLICY_PATH = HERE / "bait" / "policy.json"
STATE_PATH = HERE / "bait" / "state.json"
PROJECTION_PATH = HERE / "projection.json"
PUBLIC_ROOT = HERE / "public"
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
    return {
        "version": 1,
        "last_complete_end": None,
        "candidates": {},
        "routes": {},
    }


def load_state():
    if not STATE_PATH.is_file():
        return initial_state()
    state = read_json(STATE_PATH)
    if state.get("version") != 1 or not isinstance(state.get("candidates"), dict) or not isinstance(state.get("routes"), dict):
        raise ValueError("crawlerbait state has an unsupported shape")
    return state


def safe_path(raw: str, policy: dict) -> str | None:
    if not isinstance(raw, str) or not raw.startswith("/") or len(raw) > int(policy["max_path_length"]):
        return None
    if "%" in raw or "?" in raw or "#" in raw or "\\" in raw or any(ord(ch) < 32 for ch in raw):
        return None
    normalized = raw.rstrip("/") or "/"
    if normalized == "/":
        return None
    for prefix in policy["reserved_prefixes"]:
        if normalized == prefix or normalized.startswith(prefix + "/"):
            return None
    parts = normalized[1:].split("/")
    if len(parts) > int(policy["max_depth"]):
        return None
    if any(not SEGMENT.fullmatch(part) for part in parts):
        return None
    return "/" + "/".join(parts)


def public_signature(user_agent: str):
    ua = user_agent if isinstance(user_agent, str) else ""
    digest = sha256(ua.encode("utf-8", "replace")).hexdigest()[:16]
    match = UA_TOKEN.match(ua)
    label = match.group(1)[:80] if match else "unknown"
    return {"id": digest, "claimed_family": label}


def query_text(zone_tag: str, start: datetime, end: datetime, limit: int) -> str:
    if not ZONE_TAG.fullmatch(zone_tag):
        raise ValueError("CLOUDFLARE_ZONE_TAG must be a 32-character hexadecimal zone tag")
    return f'''{{
  viewer {{
    zones(filter: {{ zoneTag: "{zone_tag}" }}) {{
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


def cloudflare_groups(token: str, zone_tag: str, start: datetime, end: datetime, limit: int):
    payload = json.dumps({"query": query_text(zone_tag, start, end, limit)}).encode("utf-8")
    request = urllib.request.Request(
        GRAPHQL_ENDPOINT,
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "sss-crawlerbait-tide/1",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:1000]
        raise RuntimeError(f"Cloudflare GraphQL HTTP {exc.code}: {detail}") from exc
    if body.get("errors"):
        raise RuntimeError("Cloudflare GraphQL error: " + json.dumps(body["errors"], ensure_ascii=False)[:1500])
    zones = body.get("data", {}).get("viewer", {}).get("zones", [])
    if len(zones) != 1:
        raise RuntimeError(f"expected exactly one Cloudflare zone result, got {len(zones)}")
    groups = zones[0].get("groups", [])
    if not isinstance(groups, list):
        raise RuntimeError("Cloudflare GraphQL groups response is not a list")
    return groups


def empty_pressure(path: str, start: str, end: str):
    return {
        "path": path,
        "observed_404": 0,
        "first_observed_window": {"start": start, "end": end},
        "last_observed_window": {"start": start, "end": end},
        "sampled": False,
        "signatures": {},
    }


def trim_signatures(record: dict, policy: dict):
    limit = int(policy["max_signatures_per_path"])
    items = sorted(record["signatures"].items(), key=lambda kv: (-kv[1]["observed_404"], kv[0]))[:limit]
    record["signatures"] = dict(items)


def observe_record(record: dict, group: dict, start_s: str, end_s: str, policy: dict):
    count = int(round(float(group.get("count") or 0)))
    if count <= 0:
        return False
    dims = group.get("dimensions") or {}
    sig = public_signature(dims.get("userAgent", ""))
    interval = float((group.get("avg") or {}).get("sampleInterval") or 1)
    record["observed_404"] += count
    record["last_observed_window"] = {"start": start_s, "end": end_s}
    record["sampled"] = bool(record.get("sampled") or interval > 1.000001)
    current = record["signatures"].setdefault(sig["id"], {**sig, "observed_404": 0})
    current["observed_404"] += count
    trim_signatures(record, policy)
    return True


def assimilate(state: dict, groups: list, start: datetime, end: datetime, policy: dict):
    state = copy.deepcopy(state)
    changed = False
    start_s, end_s = stamp(start), stamp(end)
    for group in groups:
        dims = group.get("dimensions") or {}
        path = safe_path(dims.get("clientRequestPath"), policy)
        if not path:
            continue
        target_map = state["routes"] if path in state["routes"] else state["candidates"]
        record = target_map.get(path)
        if record is None:
            record = empty_pressure(path, start_s, end_s)
            target_map[path] = record
        changed = observe_record(record, group, start_s, end_s, policy) or changed

    eligible = [
        record for record in state["candidates"].values()
        if record["observed_404"] >= int(policy["min_404_requests"])
    ]
    eligible.sort(key=lambda record: (-record["observed_404"], record["path"]))
    capacity = max(0, int(policy["max_total_routes"]) - len(state["routes"]))
    grow_n = min(int(policy["max_new_routes_per_tide"]), capacity, len(eligible))
    for record in eligible[:grow_n]:
        path = record["path"]
        grown = state["candidates"].pop(path)
        grown["materialized_at"] = end_s
        state["routes"][path] = grown
        changed = True

    max_candidates = int(policy["max_candidates"])
    if len(state["candidates"]) > max_candidates:
        keep = sorted(
            state["candidates"].values(),
            key=lambda record: (
                -record["observed_404"],
                record["last_observed_window"]["end"],
                record["path"],
            ),
        )[:max_candidates]
        state["candidates"] = {record["path"]: record for record in keep}
        changed = True

    if changed:
        state["last_complete_end"] = end_s
    return state, changed


def projection_from(state: dict, policy: dict):
    routes = sorted(state["routes"].values(), key=lambda record: (-record["observed_404"], record["path"]))
    return {
        "source": "crawlerbait/bait/state.json",
        "updated_at": state.get("last_complete_end"),
        "summary": {
            "grown_routes": len(routes),
            "unresolved_candidates": len(state["candidates"]),
            "observed_404": sum(record["observed_404"] for record in routes),
        },
        "policy": {
            "min_404_requests": policy["min_404_requests"],
            "max_new_routes_per_tide": policy["max_new_routes_per_tide"],
            "max_total_routes": policy["max_total_routes"],
        },
        "routes": [
            {
                "path": record["path"],
                "href": record["path"].rstrip("/") + "/",
                "observed_404": record["observed_404"],
                "materialized_at": record["materialized_at"],
                "last_observed_window": record["last_observed_window"],
                "sampled": record["sampled"],
                "signatures": sorted(
                    record["signatures"].values(),
                    key=lambda sig: (-sig["observed_404"], sig["id"]),
                ),
            }
            for record in routes
        ],
    }


def html_page(title: str, body: str, json_ld: dict | None = None):
    structured = ""
    if json_ld is not None:
        structured = '<script type="application/ld+json">' + json.dumps(json_ld, ensure_ascii=False).replace("<", "\\u003c") + "</script>"
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="index,follow">
<title>{escape(title)}</title>
<link rel="alternate" type="application/json" href="/crawlerbait/state.json">
<style>
:root{{color-scheme:dark}}body{{max-width:760px;margin:7vh auto;padding:24px;font:16px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;background:#071016;color:#d8e1df}}a{{color:#ff8a5b}}code{{color:#ffd3c2}}.dim{{color:#8fa29e}}.reef{{border-left:1px solid #35504c;padding-left:18px}}li{{margin:.45rem 0}}h1,h2{{font-weight:600}}small{{color:#8fa29e}}
</style>
{structured}
</head>
<body>{body}</body>
</html>
'''


def route_output(path: str) -> Path:
    parts = path.strip("/").split("/")
    return PUBLIC_ROOT.joinpath(*parts, "index.html")


def render_public(state: dict, policy: dict):
    projection = projection_from(state, policy)
    if PUBLIC_ROOT.exists():
        shutil.rmtree(PUBLIC_ROOT)
    PUBLIC_ROOT.mkdir(parents=True)
    write_json(PUBLIC_ROOT / "crawlerbait" / "state.json", projection)

    links = "".join(
        f'<li><a href="{escape(route["href"], quote=True)}"><code>{escape(route["path"])}</code></a> · {route["observed_404"]} prior 404 observations</li>'
        for route in projection["routes"]
    ) or '<li class="dim">No route has crossed the growth gate yet.</li>'
    hub_body = f'''<p class="dim">organism:crawlerbait · static machine-facing reef</p>
<h1>crawlerbait</h1>
<p>The web touches this site. Cloudflare observes the contact. A bounded tide periodically sediments recurring 404 pressure into static pages. No bait request executes a Worker.</p>
<div class="reef"><h2>grown routes</h2><ul>{links}</ul></div>
<p><a href="/crawlerbait/state.json">machine-readable current projection</a></p>
<small>tide, not real-time · claimed crawler families are observations, not authenticated identities</small>'''
    hub_ld = {
        "@context": "https://schema.org",
        "@type": "Dataset",
        "name": "SSS crawlerbait",
        "url": "https://sss.saarland/crawlerbait/",
        "distribution": {
            "@type": "DataDownload",
            "contentUrl": "https://sss.saarland/crawlerbait/state.json",
            "encodingFormat": "application/json",
        },
    }
    (PUBLIC_ROOT / "crawlerbait").mkdir(parents=True, exist_ok=True)
    (PUBLIC_ROOT / "crawlerbait" / "index.html").write_text(
        html_page("crawlerbait", hub_body, hub_ld), encoding="utf-8"
    )

    all_links = "".join(
        f'<li><a href="{escape(route["href"], quote=True)}">{escape(route["path"])}</a></li>'
        for route in projection["routes"]
    )
    for route in projection["routes"]:
        sigs = "".join(
            f'<li><code>{escape(sig["claimed_family"])}</code> · signature <code>{escape(sig["id"])}</code> · {sig["observed_404"]}</li>'
            for sig in route["signatures"]
        ) or '<li class="dim">No retained signature.</li>'
        body = f'''<p><a href="/crawlerbait/">← crawlerbait</a></p>
<p class="dim">404 sediment · previously absent path</p>
<h1><code>{escape(route["path"])}</code></h1>
<p>This static page was materialized after repeated requests for this path were observed returning 404 at the Cloudflare membrane.</p>
<ul>
<li>prior 404 observations: <strong>{route["observed_404"]}</strong></li>
<li>materialized: <code>{escape(route["materialized_at"])}</code></li>
<li>latest observed window ended: <code>{escape(route["last_observed_window"]["end"])}</code></li>
<li>adaptive sampling observed: <code>{str(bool(route["sampled"])).lower()}</code></li>
</ul>
<h2>observed signatures</h2><ul>{sigs}</ul>
<h2>other grown routes</h2><ul>{all_links}</ul>
<small>User-Agent family strings are self-claimed and spoofable. Raw IP addresses and raw User-Agent strings are not published.</small>'''
        ld = {
            "@context": "https://schema.org",
            "@type": "Dataset",
            "name": f"crawlerbait receipt {route['path']}",
            "url": "https://sss.saarland" + route["href"],
            "dateModified": route["last_observed_window"]["end"],
            "measurementTechnique": "Cloudflare httpRequestsAdaptiveGroups aggregated 404 observation",
        }
        out = route_output(route["path"])
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html_page(f"{route['path']} · crawlerbait", body, ld), encoding="utf-8")


def compute_window(state: dict, policy: dict, now: datetime):
    end = now.astimezone(timezone.utc) - timedelta(minutes=int(policy["settle_delay_minutes"]))
    prior = state.get("last_complete_end")
    if prior:
        start = parse_time(prior)
    else:
        start = end - timedelta(hours=int(policy["bootstrap_hours"]))
    max_window = timedelta(hours=int(policy["max_window_hours"]))
    if end - start > max_window:
        start = end - max_window
    return start, end


def fixture_groups(path: Path):
    data = read_json(path)
    if isinstance(data, list):
        return data
    zones = data.get("data", {}).get("viewer", {}).get("zones", [])
    if len(zones) == 1 and isinstance(zones[0].get("groups"), list):
        return zones[0]["groups"]
    raise ValueError("fixture must be a group list or Cloudflare GraphQL response")


def self_test():
    policy = {
        "min_404_requests": 2,
        "max_new_routes_per_tide": 4,
        "max_total_routes": 8,
        "max_candidates": 8,
        "max_signatures_per_path": 3,
        "max_path_length": 96,
        "max_depth": 3,
        "reserved_prefixes": ["/assets", "/crawlerbait", "/robots.txt", "/sitemap.xml", "/favicon.ico"],
        "bootstrap_hours": 24,
        "settle_delay_minutes": 10,
        "max_window_hours": 24,
        "query_limit": 5000,
    }
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
    assert state["routes"]["/login"]["signatures"]
    assert safe_path("/docs/api", policy) == "/docs/api"
    assert safe_path("/docs/api.json", policy) is None
    assert route_output("/login").as_posix().endswith("public/login/index.html")
    print("PASS · bounded crawlerbait tide grows repeated safe 404 pressure only")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--write", action="store_true", help="persist state/projection/public sediment")
    ap.add_argument("--fixture", type=Path, help="read groups from a local fixture instead of Cloudflare")
    ap.add_argument("--now", help="override current UTC time (ISO-8601) for reproducible tests")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        self_test()
        return

    policy = read_json(POLICY_PATH)
    state = load_state()
    now = parse_time(args.now) if args.now else datetime.now(timezone.utc)
    start, end = compute_window(state, policy, now)
    if end <= start:
        print(json.dumps({"status": "no-window", "start": stamp(start), "end": stamp(end)}))
        return

    if args.fixture:
        groups = fixture_groups(args.fixture)
    else:
        token = os.environ.get("CLOUDFLARE_ANALYTICS_TOKEN", "").strip()
        zone = os.environ.get("CLOUDFLARE_ZONE_TAG", "").strip()
        if not token or not zone:
            raise SystemExit(
                "crawlerbait tide is unarmed: CLOUDFLARE_ANALYTICS_TOKEN and CLOUDFLARE_ZONE_TAG are required"
            )
        groups = cloudflare_groups(token, zone, start, end, int(policy["query_limit"]))

    next_state, changed = assimilate(state, groups, start, end, policy)
    summary = {
        "status": "changed" if changed else "no-admitted-pressure",
        "window": {"start": stamp(start), "end": stamp(end)},
        "groups": len(groups),
        "routes": len(next_state["routes"]),
        "candidates": len(next_state["candidates"]),
    }
    print(json.dumps(summary, indent=2))
    if args.write and changed:
        write_json(STATE_PATH, next_state)
        projection = projection_from(next_state, policy)
        write_json(PROJECTION_PATH, projection)
        render_public(next_state, policy)
    elif args.write:
        print("no admitted pressure; repository left byte-identical")


if __name__ == "__main__":
    main()
