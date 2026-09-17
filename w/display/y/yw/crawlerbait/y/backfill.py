#!/usr/bin/env python3
"""One-time retained-history catch-up for the Crawlerbait Cloudflare tide."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import argparse
import copy
import importlib.util
import json
import os
import urllib.error
import urllib.request

HERE = Path(__file__).resolve().parent
GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql"


def load_tide():
    spec = importlib.util.spec_from_file_location("crawlerbait_tide", HERE / "tide.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


T = load_tide()


def settings_query(zone: str) -> str:
    if not T.ZONE_TAG.fullmatch(zone):
        raise ValueError("CLOUDFLARE_ZONE_TAG must be 32 hex characters")
    return f'''{{
  viewer {{
    zones(filter: {{ zoneTag: "{zone}" }}) {{
      settings {{
        httpRequestsAdaptive {{
          enabled
          maxDuration
          maxPageSize
          notOlderThan
        }}
      }}
    }}
  }}
}}'''


def fetch_limits(token: str, zone: str):
    body = json.dumps({"query": settings_query(zone)}).encode()
    request = urllib.request.Request(
        GRAPHQL_ENDPOINT,
        data=body,
        method="POST",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json", "User-Agent": "sss-crawlerbait-backfill/1"},
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
    if len(zones) != 1:
        raise RuntimeError("unexpected Cloudflare settings response")
    limits = zones[0].get("settings", {}).get("httpRequestsAdaptive") or {}
    if not limits.get("enabled"):
        raise RuntimeError("Cloudflare httpRequestsAdaptive analytics are not enabled for this zone/token")
    for key in ("maxDuration", "maxPageSize", "notOlderThan"):
        if not isinstance(limits.get(key), (int, float)) or limits[key] <= 0:
            raise RuntimeError(f"Cloudflare settings omitted usable {key}")
    return {k: int(limits[k]) if k != "enabled" else True for k in limits}


def windows(start: datetime, end: datetime, width_seconds: int):
    cursor = start
    while cursor < end:
        stop = min(end, cursor + timedelta(seconds=width_seconds))
        yield cursor, stop
        cursor = stop


def run_backfill(token: str, zone: str, now: datetime):
    policy = T.read_json(T.POLICY_PATH)
    original = T.load_state()
    if original.get("last_complete_end") is not None:
        raise SystemExit("crawlerbait backfill refused: continuity cursor already exists; historical catch-up is one-time")

    limits = fetch_limits(token, zone)
    now = now.astimezone(timezone.utc)
    end = now - timedelta(minutes=int(policy["settle_delay_minutes"]))
    # notOlderThan is measured from request time, not from the settled end.
    # Leave one minute at the provider retention edge so the oldest query does not age out mid-run.
    start = now - timedelta(seconds=limits["notOlderThan"]) + timedelta(minutes=1)
    if end <= start:
        raise RuntimeError("Cloudflare retained-history window is empty")

    width = min(int(limits["maxDuration"]), int(policy["max_window_hours"]) * 3600)
    query_limit = min(int(policy["query_limit"]), int(limits["maxPageSize"]))
    no_growth = copy.deepcopy(policy)
    no_growth["max_new_routes_per_tide"] = 0

    state = copy.deepcopy(original)
    total_groups = 0
    queried = []
    for chunk_start, chunk_end in windows(start, end, width):
        groups = T.fetch_groups(token, zone, chunk_start, chunk_end, query_limit)
        total_groups += len(groups)
        queried.append({"start": T.stamp(chunk_start), "end": T.stamp(chunk_end), "groups": len(groups)})
        state, _ = T.assimilate(state, groups, chunk_start, chunk_end, no_growth)

    # All retained history gets one growth budget, regardless of how many provider-sized chunks were required.
    state, _ = T.assimilate(state, [], start, end, policy)
    state["last_complete_end"] = T.stamp(end)
    changed = state != original
    summary = {
        "status": "changed" if changed else "no-admitted-pressure",
        "retained_seconds": limits["notOlderThan"],
        "provider_max_window_seconds": limits["maxDuration"],
        "window": {"start": T.stamp(start), "end": T.stamp(end)},
        "chunks": queried,
        "groups": total_groups,
        "routes": len(state["routes"]),
        "candidates": len(state["candidates"]),
    }
    return policy, state, changed, summary


def self_test():
    policy = T.read_json(T.POLICY_PATH)
    no_growth = copy.deepcopy(policy)
    no_growth["max_new_routes_per_tide"] = 0
    t0 = datetime(2026, 9, 10, 0, 0, tzinfo=timezone.utc)
    state = T.initial_state()
    first = [{"count": 1, "avg": {"sampleInterval": 1}, "dimensions": {"clientRequestPath": "/login", "userAgent": "CrabBot/1"}}]
    second = [{"count": 1, "avg": {"sampleInterval": 1}, "dimensions": {"clientRequestPath": "/login", "userAgent": "CrabBot/1"}}]
    state, _ = T.assimilate(state, first, t0, t0 + timedelta(hours=24), no_growth)
    assert "/login" in state["candidates"] and not state["routes"]
    state, _ = T.assimilate(state, second, t0 + timedelta(hours=24), t0 + timedelta(hours=48), no_growth)
    assert state["candidates"]["/login"]["observed_404"] == 2 and not state["routes"]
    state, changed = T.assimilate(state, [], t0, t0 + timedelta(hours=48), policy)
    assert changed and "/login" in state["routes"] and len(state["routes"]) <= int(policy["max_new_routes_per_tide"])
    assert len(list(windows(t0, t0 + timedelta(hours=49), 24 * 3600))) == 3
    print("PASS · retained history is chunked at provider limits and receives one crawlerbait growth budget")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--now")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        self_test(); return

    token = os.environ.get("CLOUDFLARE_ANALYTICS_TOKEN", "").strip()
    zone = os.environ.get("CLOUDFLARE_ZONE_TAG", "").strip()
    if not token or not zone:
        raise SystemExit("crawlerbait backfill is unarmed: CLOUDFLARE_ANALYTICS_TOKEN and CLOUDFLARE_ZONE_TAG are required")
    now = T.parse_time(args.now) if args.now else datetime.now(timezone.utc)
    policy, state, changed, summary = run_backfill(token, zone, now)
    print(json.dumps(summary, indent=2))
    if args.write and changed:
        T.write_json(T.STATE_PATH, state)
        T.write_json(T.PROJECTION_PATH, T.projection_from(state, policy))
        T.render_public(state, policy)
    elif args.write:
        print("no admitted pressure; organism left byte-identical")


if __name__ == "__main__":
    main()
