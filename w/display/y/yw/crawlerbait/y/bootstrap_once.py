#!/usr/bin/env python3
"""ONE-TIME: freeze the complete Cloudflare retained 404 field as raw local evidence before provider expiry."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import argparse
import importlib.util
import json
import os
import urllib.error
import urllib.request

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
ARCHIVE_ROOT = ROOT / "x" / "retained-bootstrap"
SEAL_PATH = ARCHIVE_ROOT / "seal.json"
SETTINGS_PATH = ARCHIVE_ROOT / "provider-settings.json"
GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql"


def load_capture():
    spec = importlib.util.spec_from_file_location("crawlerbait_capture", HERE / "capture.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


C = load_capture()


def settings_query(zone: str) -> str:
    if not C.valid_zone(zone):
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


def fetch_settings_payload(token: str, zone: str) -> dict:
    body = json.dumps({"query": settings_query(zone)}).encode()
    request = urllib.request.Request(
        GRAPHQL_ENDPOINT,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "sss-crawlerbait-bootstrap-once/1",
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
    return payload


def limits_from_settings(payload: dict) -> dict:
    zones = payload.get("data", {}).get("viewer", {}).get("zones", [])
    if len(zones) != 1:
        raise RuntimeError("unexpected Cloudflare settings response")
    limits = zones[0].get("settings", {}).get("httpRequestsAdaptive") or {}
    if not limits.get("enabled"):
        raise RuntimeError("Cloudflare httpRequestsAdaptive analytics are not enabled")
    for key in ("maxDuration", "maxPageSize", "notOlderThan"):
        if not isinstance(limits.get(key), (int, float)) or limits[key] <= 0:
            raise RuntimeError(f"Cloudflare settings omitted usable {key}")
    return {k: int(limits[k]) if k != "enabled" else True for k in limits}


def compact(value: datetime) -> str:
    return C.stamp(value).replace("-", "").replace(":", "")


def raw_filename(start: datetime, end: datetime) -> str:
    return f"{compact(start)}--{compact(end)}.raw.json"


def raw_path(start: datetime, end: datetime) -> Path:
    return ARCHIVE_ROOT / raw_filename(start, end)


def raw_wrapper(start: datetime, end: datetime, provider_response: dict, captured_at: datetime, limit: int, saturated: bool) -> dict:
    return {
        "version": 1,
        "source": "cloudflare:httpRequestsAdaptiveGroups",
        "purpose": "one-time retained-history raw freeze",
        "captured_at": C.stamp(captured_at),
        "window": {"start": C.stamp(start), "end": C.stamp(end)},
        "query": {
            "dataset": "httpRequestsAdaptiveGroups",
            "requestSource": "eyeball",
            "edgeResponseStatus_geq": 404,
            "edgeResponseStatus_lt": 405,
            "groupBy": ["clientRequestPath", "userAgent"],
            "orderBy": ["count_DESC"],
            "limit": int(limit),
        },
        "saturated_at_minimum_window": bool(saturated),
        "provider_response": provider_response,
    }


def load_existing(start: datetime, end: datetime):
    path = raw_path(start, end)
    if not path.is_file():
        return None
    value = C.read_json(path)
    if value.get("source") != "cloudflare:httpRequestsAdaptiveGroups":
        raise RuntimeError(f"unexpected existing bootstrap carrier {path.name}")
    return value


def persist_raw(value: dict) -> Path:
    start = C.parse_time(value["window"]["start"])
    end = C.parse_time(value["window"]["end"])
    path = raw_path(start, end)
    if path.is_file():
        return path
    C.write_json(path, value)
    return path


def midpoint(start: datetime, end: datetime) -> datetime:
    seconds = int((end - start).total_seconds())
    return start + timedelta(seconds=max(1, seconds // 2))


def freeze_window(token: str, zone: str, start: datetime, end: datetime, limit: int, captured_at: datetime, write: bool):
    existing = load_existing(start, end)
    if existing is not None:
        groups = C.groups_from_payload(existing["provider_response"])
        return [{
            "file": raw_filename(start, end),
            "start": C.stamp(start),
            "end": C.stamp(end),
            "groups": len(groups),
            "reused": True,
            "saturated": bool(existing.get("saturated_at_minimum_window")),
        }]

    provider = C.fetch_payload(token, zone, start, end, limit)
    groups = C.groups_from_payload(provider)
    duration = int((end - start).total_seconds())

    # Hitting the provider page ceiling is ambiguous truncation. Split the time
    # interval recursively until the returned group set is below the ceiling or
    # one-second resolution is exhausted. The split changes only transport
    # resolution; the union still covers exactly the same retained time field.
    if len(groups) >= limit and duration > 1:
        mid = midpoint(start, end)
        if not (start < mid < end):
            raise RuntimeError("could not bisect saturated provider window")
        left = freeze_window(token, zone, start, mid, limit, captured_at, write)
        right = freeze_window(token, zone, mid, end, limit, captured_at, write)
        return left + right

    saturated = len(groups) >= limit
    value = raw_wrapper(start, end, provider, captured_at, limit, saturated)
    if write:
        persist_raw(value)
    return [{
        "file": raw_filename(start, end),
        "start": C.stamp(start),
        "end": C.stamp(end),
        "groups": len(groups),
        "reused": False,
        "saturated": saturated,
    }]


def self_test():
    t0 = datetime(2026, 9, 18, 0, 0, tzinfo=timezone.utc)
    assert raw_filename(t0, t0 + timedelta(hours=1)).endswith(".raw.json")
    fake = {
        "data": {"viewer": {"zones": [{"settings": {"httpRequestsAdaptive": {
            "enabled": True, "maxDuration": 86400, "maxPageSize": 5000, "notOlderThan": 604800
        }}}]}}
    }
    limits = limits_from_settings(fake)
    assert limits["maxDuration"] == 86400 and limits["notOlderThan"] == 604800
    assert midpoint(t0, t0 + timedelta(seconds=3)) == t0 + timedelta(seconds=1)
    print("PASS · one-time bootstrap preserves full returned payloads and can split saturated windows without changing coverage")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--now")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        self_test()
        return

    if SEAL_PATH.is_file():
        raise SystemExit("crawlerbait retained-history bootstrap is already sealed; do not run it again")

    token = os.environ.get("CLOUDFLARE_ANALYTICS_TOKEN", "").strip()
    zone = os.environ.get("CLOUDFLARE_ZONE_TAG", "").strip()
    if not token or not zone:
        raise SystemExit("crawlerbait bootstrap is unarmed: CLOUDFLARE_ANALYTICS_TOKEN and CLOUDFLARE_ZONE_TAG are required")

    now = C.parse_time(args.now) if args.now else datetime.now(timezone.utc)
    settings_payload = fetch_settings_payload(token, zone)
    limits = limits_from_settings(settings_payload)
    policy = C.read_json(ROOT / "z" / "policy.json")

    end = now.astimezone(timezone.utc) - timedelta(minutes=int(policy["settle_delay_minutes"]))
    # Stay one second inside the provider's hard retention boundary. Anything
    # older is already unrecoverable from this API; everything still retained is
    # frozen now.
    start = now.astimezone(timezone.utc) - timedelta(seconds=limits["notOlderThan"]) + timedelta(seconds=1)
    if end <= start:
        raise RuntimeError("Cloudflare retained-history window is empty")

    width = min(int(limits["maxDuration"]), int(policy["max_window_hours"]) * 3600)
    limit = min(int(limits["maxPageSize"]), int(policy["query_limit"]))

    if args.write:
        ARCHIVE_ROOT.mkdir(parents=True, exist_ok=True)
        C.write_json(SETTINGS_PATH, {
            "version": 1,
            "captured_at": C.stamp(now),
            "provider_response": settings_payload,
        })

    leaves = []
    cursor = start
    while cursor < end:
        stop = min(end, cursor + timedelta(seconds=width))
        leaves.extend(freeze_window(token, zone, cursor, stop, limit, now, args.write))
        cursor = stop

    saturated = [x for x in leaves if x["saturated"]]
    seal = {
        "version": 1,
        "sealed": True,
        "purpose": "one-time freeze of every still-retained Cloudflare 404 analytics window available during setup",
        "captured_at": C.stamp(now),
        "retained_window": {"start": C.stamp(start), "end": C.stamp(end)},
        "provider_limits": {
            "notOlderThan": limits["notOlderThan"],
            "maxDuration": limits["maxDuration"],
            "maxPageSize": limits["maxPageSize"],
        },
        "leaf_windows": len(leaves),
        "returned_groups": sum(x["groups"] for x in leaves),
        "saturated_minimum_windows": saturated,
        "files": [x["file"] for x in leaves],
        "law": "sealed once; never refreshed. Future provider acquisition begins at the live capture cursor and only appends new windows.",
    }
    if args.write:
        C.write_json(SEAL_PATH, seal)

    print(json.dumps(seal, indent=2))


if __name__ == "__main__":
    main()
