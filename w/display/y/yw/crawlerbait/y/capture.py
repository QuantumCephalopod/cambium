#!/usr/bin/env python3
"""Capture only not-yet-owned Cloudflare 404 windows into durable local Traces."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import argparse
import json
import os
import urllib.error
import urllib.request

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
POLICY_PATH = ROOT / "z" / "policy.json"
CURSOR_PATH = ROOT / "x" / "cursor.json"
CAPTURE_ROOT = ROOT / "x" / "captures"
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


def valid_zone(zone: str) -> bool:
    return len(zone) == 32 and all(c in "0123456789abcdefABCDEF" for c in zone)


def cloudflare_query(zone: str, start: datetime, end: datetime, limit: int) -> str:
    if not valid_zone(zone):
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
            "User-Agent": "sss-crawlerbait-capture/1",
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


def windows(start: datetime, end: datetime, width_seconds: int):
    cursor = start
    while cursor < end:
        stop = min(end, cursor + timedelta(seconds=width_seconds))
        yield cursor, stop
        cursor = stop


def capture_filename(start: datetime, end: datetime) -> str:
    def compact(value: datetime) -> str:
        return stamp(value).replace("-", "").replace(":", "")
    return f"{compact(start)}--{compact(end)}.json"


def capture_payload(start: datetime, end: datetime, groups: list, captured_at: datetime) -> dict:
    return {
        "version": 1,
        "source": "cloudflare:httpRequestsAdaptiveGroups",
        "captured_at": stamp(captured_at),
        "window": {"start": stamp(start), "end": stamp(end)},
        "query": {
            "requestSource": "eyeball",
            "edgeResponseStatus_geq": 404,
            "edgeResponseStatus_lt": 405,
            "groupBy": ["clientRequestPath", "userAgent"],
        },
        "groups": groups,
    }


def persist_capture(payload: dict) -> tuple[Path, bool]:
    start = parse_time(payload["window"]["start"])
    end = parse_time(payload["window"]["end"])
    path = CAPTURE_ROOT / capture_filename(start, end)
    encoded = json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if path.is_file():
        if path.read_text(encoding="utf-8") != encoded:
            raise RuntimeError(f"immutable capture collision at {path.name}")
        return path, False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(encoded, encoding="utf-8")
    return path, True


def self_test():
    t0 = datetime(2026, 9, 17, 0, 0, tzinfo=timezone.utc)
    chunks = list(windows(t0, t0 + timedelta(hours=49), 24 * 3600))
    assert len(chunks) == 3
    assert capture_filename(t0, t0 + timedelta(hours=6)) == "20260917T000000Z--20260917T060000Z.json"
    payload = capture_payload(t0, t0 + timedelta(hours=6), [], t0 + timedelta(hours=7))
    assert payload["groups"] == []
    assert payload["window"]["start"] == "2026-09-17T00:00:00Z"
    assert "Authorization" not in json.dumps(payload)
    print("PASS · capture appends only new immutable provider windows and preserves empty windows as coverage")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--now")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        self_test()
        return

    policy = read_json(POLICY_PATH)
    cursor = read_json(CURSOR_PATH)
    if cursor.get("version") != 1 or not isinstance(cursor.get("last_capture_end"), str):
        raise SystemExit("crawlerbait capture cursor is missing or invalid")

    now = parse_time(args.now) if args.now else datetime.now(timezone.utc)
    end = now.astimezone(timezone.utc) - timedelta(minutes=int(policy["settle_delay_minutes"]))
    start = parse_time(cursor["last_capture_end"])
    if end <= start:
        print(json.dumps({"status": "no-window", "cursor": stamp(start)}))
        return

    token = os.environ.get("CLOUDFLARE_ANALYTICS_TOKEN", "").strip()
    zone = os.environ.get("CLOUDFLARE_ZONE_TAG", "").strip()
    if not token or not zone:
        raise SystemExit("crawlerbait capture is unarmed: CLOUDFLARE_ANALYTICS_TOKEN and CLOUDFLARE_ZONE_TAG are required")

    width_seconds = int(policy["max_window_hours"]) * 3600
    limit = int(policy["query_limit"])
    captured = []
    created = 0
    total_groups = 0
    for chunk_start, chunk_end in windows(start, end, width_seconds):
        groups = fetch_groups(token, zone, chunk_start, chunk_end, limit)
        total_groups += len(groups)
        payload = capture_payload(chunk_start, chunk_end, groups, now)
        item = {
            "start": stamp(chunk_start),
            "end": stamp(chunk_end),
            "groups": len(groups),
            "file": capture_filename(chunk_start, chunk_end),
        }
        if args.write:
            _, was_created = persist_capture(payload)
            item["created"] = was_created
            created += int(was_created)
        captured.append(item)

    if args.write:
        write_json(CURSOR_PATH, {"version": 1, "last_capture_end": stamp(end)})

    print(json.dumps({
        "status": "captured" if captured else "no-window",
        "window": {"start": stamp(start), "end": stamp(end)},
        "chunks": captured,
        "created_files": created,
        "groups": total_groups,
    }, indent=2))


if __name__ == "__main__":
    main()
