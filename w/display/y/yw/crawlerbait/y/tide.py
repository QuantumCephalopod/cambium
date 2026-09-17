#!/usr/bin/env python3
"""One bounded Cloudflare observation tide for the independently rooted Crawlerbait holon."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from hashlib import sha256
from html import escape
from pathlib import Path
import argparse
import json
import os
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
    return {"version": 2, "last_complete_end": None, "routes": {}}


def load_state():
    state = read_json(STATE_PATH) if STATE_PATH.is_file() else initial_state()
    if state.get("version") != 2 or not isinstance(state.get("routes"), dict):
        raise SystemExit("crawlerbait continuity needs an unfiltered retained-history reseed (run workflow with full_history=true)")
    return state


def observed_path(raw) -> str:
    # Cloudflare's clientRequestPath is evidence. Preserve it as received instead
    # of deciding whether the request "looks useful".
    return raw if isinstance(raw, str) else str(raw)


def public_signature(user_agent) -> dict:
    raw = user_agent if isinstance(user_agent, str) else str(user_agent)
    return {
        "id": sha256(raw.encode("utf-8", "replace")).hexdigest()[:16],
        "claimed_user_agent": raw,
    }


def cloudflare_query(zone: str, start: datetime, end: datetime, limit: int) -> str:
    if len(zone) != 32 or any(c not in "0123456789abcdefABCDEF" for c in zone):
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
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "sss-crawlerbait-tide/4",
        },
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
        "materialized_at": end,
        "sampled": False,
        "signatures": {},
    }


def assimilate(state: dict, groups: list, start: datetime, end: datetime, policy: dict):
    # Deliberately no semantic admission gate, recurrence threshold, ranking,
    # candidate pool, route cap or signature cap. If Cloudflare returned a 404
    # group, it belongs to Continuity.
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

    if changed:
        out["last_complete_end"] = end_s
    return out, changed


def local_bait_parts(path: str):
    """Mirror an ordinary observed path only *inside* Crawlerbait's bait subtree.

    This is a carrier decision, never an observation filter. Paths that cannot be
    mirrored as ordinary filesystem components receive a deterministic receipt.
    """
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


def route_output(path: str) -> Path:
    parts = local_bait_parts(path)
    if parts:
        return PUBLIC_ROOT / "crawlerbait" / "bait" / Path(*parts) / "index.html"
    return PUBLIC_ROOT / "crawlerbait" / "receipt" / receipt_id(path) / "index.html"


def projection_from(state: dict, policy: dict):
    routes = sorted(state["routes"].values(), key=lambda r: (-r["observed_404"], r["path"]))
    signature_ids = {sid for r in routes for sid in r["signatures"]}
    return {
        "source": "crawlerbait/x/state.json",
        "updated_at": state.get("last_complete_end"),
        "summary": {
            "grown_routes": len(routes),
            "unresolved_candidates": 0,
            "observed_404": sum(r["observed_404"] for r in routes),
            "observed_signatures": len(signature_ids),
        },
        "policy": {
            "observation_domain": "all Cloudflare 404 groups returned in each queried window",
            "growth_gate": "none",
            "public_namespace": "/crawlerbait/",
        },
        "routes": [
            {
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


def render_public(state: dict, policy: dict):
    projection = projection_from(state, policy)
    if PUBLIC_ROOT.exists():
        shutil.rmtree(PUBLIC_ROOT)
    (PUBLIC_ROOT / "crawlerbait").mkdir(parents=True, exist_ok=True)
    write_json(PUBLIC_ROOT / "crawlerbait" / "state.json", projection)

    links = "".join(
        f'<li><a href="{escape(r["href"], quote=True)}"><code>{escape(r["path"])}</code></a> · {r["observed_404"]} observed 404 requests</li>'
        for r in projection["routes"]
    ) or '<li class="dim">No 404 pressure observed yet.</li>'
    hub = (
        '<p class="dim">organism:crawlerbait · static machine-facing reef</p>'
        '<h1>crawlerbait</h1>'
        '<p>Every 404 group returned by the Cloudflare sensor is retained. '
        'Observed addresses are data; every public receipt remains inside /crawlerbait/.</p>'
        f'<h2>observed paths</h2><ul>{links}</ul>'
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
            '<p class="dim">404 sediment · observed address retained as data</p>'
            f'<h1><code>{escape(route["path"])}</code></h1>'
            '<p>This receipt exists because Cloudflare observed requests for this path returning 404.</p>'
            '<ul>'
            f'<li>observed 404 requests: <strong>{route["observed_404"]}</strong></li>'
            f'<li>materialized: <code>{escape(route["materialized_at"])}</code></li>'
            f'<li>representation: <code>{escape(representation)}</code></li>'
            f'<li>adaptive sampling observed: <code>{str(bool(route["sampled"])).lower()}</code></li>'
            '</ul>'
            f'<h2>observed claimed user-agents</h2><ul>{sigs}</ul>'
            f'<h2>other observed paths</h2><ul>{all_links}</ul>'
            '<small>User-Agent strings are claims made by clients and are spoofable. '
            'The current sensor does not request client IP addresses.</small>'
        )
        out = route_output(route["path"])
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page(f'{route["path"]} · crawlerbait', body), encoding="utf-8")


def compute_window(state: dict, policy: dict, now: datetime):
    end = now.astimezone(timezone.utc) - timedelta(minutes=int(policy["settle_delay_minutes"]))
    start = parse_time(state["last_complete_end"]) if state.get("last_complete_end") else end - timedelta(hours=24)
    return max(start, end - timedelta(hours=int(policy["max_window_hours"])),), end


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
    assert policy == {"version": 2, "settle_delay_minutes": 10, "max_window_hours": 24, "query_limit": 5000}
    start = datetime(2026, 9, 17, 0, 0, tzinfo=timezone.utc)
    end = start + timedelta(hours=6)
    groups = [
        {"count": 3, "avg": {"sampleInterval": 1}, "dimensions": {"clientRequestPath": "/login", "userAgent": "CrabBot/1.0"}},
        {"count": 1, "avg": {"sampleInterval": 1}, "dimensions": {"clientRequestPath": "/admin", "userAgent": "Other/1"}},
        {"count": 99, "avg": {"sampleInterval": 1}, "dimensions": {"clientRequestPath": "/assets/nope", "userAgent": "Spray/9"}},
        {"count": 99, "avg": {"sampleInterval": 1}, "dimensions": {"clientRequestPath": "/.env", "userAgent": "Spray/9"}},
        {"count": 1, "avg": {"sampleInterval": 1}, "dimensions": {"clientRequestPath": "/papers", "userAgent": "ScopeProbe/1"}},
    ]
    state, changed = assimilate(initial_state(), groups, start, end, policy)
    assert changed
    assert set(state["routes"]) == {"/login", "/admin", "/assets/nope", "/.env", "/papers"}
    assert state["routes"]["/admin"]["observed_404"] == 1
    assert next(iter(state["routes"]["/login"]["signatures"].values()))["claimed_user_agent"] == "CrabBot/1.0"
    assert public_href("/login") == "/crawlerbait/bait/login/"
    assert public_href("/assets/nope") == "/crawlerbait/bait/assets/nope/"
    assert public_href("/.env").startswith("/crawlerbait/receipt/")
    assert public_href("/papers") == "/crawlerbait/bait/papers/"
    assert route_output("/papers").as_posix().endswith("w/public/crawlerbait/bait/papers/index.html")
    assert all(public_href(p).startswith("/crawlerbait/") for p in state["routes"])
    assert projection_from(state, policy)["summary"]["unresolved_candidates"] == 0
    print("PASS · every observed 404 stays data-complete while all sediment remains inside /crawlerbait/")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--fixture", type=Path)
    ap.add_argument("--now")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        self_test()
        return

    policy, state = read_json(POLICY_PATH), load_state()
    now = parse_time(args.now) if args.now else datetime.now(timezone.utc)
    start, end = compute_window(state, policy, now)
    if end <= start:
        print(json.dumps({"status": "no-window"}))
        return

    if args.fixture:
        groups = fixture_groups(args.fixture)
    else:
        token = os.environ.get("CLOUDFLARE_ANALYTICS_TOKEN", "").strip()
        zone = os.environ.get("CLOUDFLARE_ZONE_TAG", "").strip()
        if not token or not zone:
            raise SystemExit("crawlerbait tide is unarmed: CLOUDFLARE_ANALYTICS_TOKEN and CLOUDFLARE_ZONE_TAG are required")
        groups = fetch_groups(token, zone, start, end, int(policy["query_limit"]))

    next_state, changed = assimilate(state, groups, start, end, policy)
    print(json.dumps({
        "status": "changed" if changed else "no-observed-404-pressure",
        "window": {"start": stamp(start), "end": stamp(end)},
        "groups": len(groups),
        "paths": len(next_state["routes"]),
    }, indent=2))
    if args.write and changed:
        write_json(STATE_PATH, next_state)
        write_json(PROJECTION_PATH, projection_from(next_state, policy))
        render_public(next_state, policy)
    elif args.write:
        print("no observed 404 pressure; organism left byte-identical")


if __name__ == "__main__":
    main()
