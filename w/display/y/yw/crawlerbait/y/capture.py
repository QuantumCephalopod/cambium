#!/usr/bin/env python3
"""Capture every newly available Cloudflare raw HTTP event into durable public Traces."""
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


def graphql(token: str, query: str, variables: dict | None = None) -> dict:
    body = json.dumps({"query": query, "variables": variables or {}}).encode("utf-8")
    request = urllib.request.Request(
        GRAPHQL_ENDPOINT,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "sss-crawlerbait-capture/3",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:1500]
        raise RuntimeError(f"Cloudflare GraphQL HTTP {exc.code}: {detail}") from exc
    if payload.get("errors"):
        raise RuntimeError("Cloudflare GraphQL error: " + json.dumps(payload["errors"], ensure_ascii=False)[:3000])
    return payload


SETTINGS_QUERY = r'''query CrawlerbaitRawSettings($zoneTag: string) {
  viewer {
    zones(filter: {zoneTag: $zoneTag}) {
      settings {
        httpRequestsAdaptive {
          enabled
          availableFields
          maxDuration
          maxNumberOfFields
          maxPageSize
          notOlderThan
        }
      }
    }
  }
}'''

INTROSPECTION_QUERY = r'''query CrawlerbaitRawSchema {
  __schema {
    queryType { name }
    types {
      kind
      name
      fields(includeDeprecated: true) {
        name
        args { name type { kind name ofType { kind name ofType { kind name } } } }
        type { kind name ofType { kind name ofType { kind name ofType { kind name } } } }
      }
    }
  }
}'''


def zone_settings(payload: dict) -> dict:
    zones = payload.get("data", {}).get("viewer", {}).get("zones", [])
    if len(zones) != 1:
        raise RuntimeError("Cloudflare settings did not return exactly one zone")
    cfg = zones[0].get("settings", {}).get("httpRequestsAdaptive") or {}
    required = ("enabled", "availableFields", "maxDuration", "maxNumberOfFields", "maxPageSize", "notOlderThan")
    if any(k not in cfg for k in required):
        raise RuntimeError("httpRequestsAdaptive settings incomplete")
    if not cfg.get("enabled"):
        raise RuntimeError("httpRequestsAdaptive is not enabled")
    fields = cfg.get("availableFields")
    if not isinstance(fields, list) or not fields:
        raise RuntimeError("httpRequestsAdaptive exposes no available fields")
    return cfg


def named_type(type_ref: dict | None) -> str | None:
    current = type_ref or {}
    while current:
        if current.get("name"):
            return current["name"]
        current = current.get("ofType") or {}
    return None


def schema_types(introspection: dict) -> dict[str, dict]:
    return {
        t["name"]: t
        for t in introspection.get("data", {}).get("__schema", {}).get("types", [])
        if isinstance(t, dict) and isinstance(t.get("name"), str)
    }


def type_fields(types: dict[str, dict], type_name: str) -> dict[str, dict]:
    return {
        f["name"]: f
        for f in (types.get(type_name) or {}).get("fields") or []
        if isinstance(f, dict) and isinstance(f.get("name"), str)
    }


def dataset_record_type(introspection: dict) -> tuple[dict[str, dict], str]:
    types = schema_types(introspection)
    query_name = introspection.get("data", {}).get("__schema", {}).get("queryType", {}).get("name")
    query = type_fields(types, query_name)
    viewer_type = named_type((query.get("viewer") or {}).get("type"))
    viewer = type_fields(types, viewer_type)
    zone_type = named_type((viewer.get("zones") or {}).get("type"))
    zone = type_fields(types, zone_type)
    record_type = named_type((zone.get("httpRequestsAdaptive") or {}).get("type"))
    if not all((query_name, viewer_type, zone_type, record_type)):
        raise RuntimeError("could not resolve viewer.zones.httpRequestsAdaptive through live schema")
    return types, record_type


def resolve_available_field(types: dict[str, dict], root_type: str, advertised: str) -> list[str]:
    direct = type_fields(types, root_type)
    if advertised in direct:
        return [advertised]
    candidates = sorted(
        (name for name in direct if advertised.startswith(name + "_")),
        key=len,
        reverse=True,
    )
    for parent in candidates:
        child_type = named_type(direct[parent].get("type"))
        if not child_type:
            continue
        try:
            return [parent] + resolve_available_field(types, child_type, advertised[len(parent) + 1:])
        except RuntimeError:
            pass
    raise RuntimeError(f'provider advertised field "{advertised}" but live schema cannot resolve it')


def selection_tree(paths: list[list[str]]) -> dict:
    tree = {}
    for path in paths:
        cursor = tree
        for part in path:
            cursor = cursor.setdefault(part, {})
    return tree


def render_selection(tree: dict) -> str:
    out = []
    for name in sorted(tree):
        children = tree[name]
        out.append(name if not children else f"{name} {{ {render_selection(children)} }}")
    return " ".join(out)


def raw_query(zone: str, start: datetime, end: datetime, limit: int, selection: str) -> str:
    if not valid_zone(zone):
        raise ValueError("CLOUDFLARE_ZONE_TAG must be 32 hex characters")
    return (
        '{ viewer { zones(filter: { zoneTag: "' + zone + '" }) { '
        'records: httpRequestsAdaptive('
        'filter: { datetime_geq: "' + stamp(start) + '" datetime_lt: "' + stamp(end) + '" } '
        'limit: ' + str(int(limit)) + ') { ' + selection + ' }'
        ' } } }'
    )


def records_from_payload(payload: dict) -> list:
    zones = payload.get("data", {}).get("viewer", {}).get("zones", [])
    if len(zones) != 1 or not isinstance(zones[0].get("records"), list):
        raise RuntimeError("unexpected Cloudflare httpRequestsAdaptive response")
    return zones[0]["records"]


def compact(value: datetime) -> str:
    return stamp(value).replace("-", "").replace(":", "")


def capture_filename(start: datetime, end: datetime) -> str:
    return f"{compact(start)}--{compact(end)}.traffic.json"


def capture_payload(start: datetime, end: datetime, provider_response: dict, captured_at: datetime,
                    advertised_fields: list[str], selection: str) -> dict:
    return {
        "version": 3,
        "source": "cloudflare:httpRequestsAdaptive",
        "captured_at": stamp(captured_at),
        "window": {"start": stamp(start), "end": stamp(end)},
        "semantic_filters": [],
        "transport_filter": "datetime range only",
        "advertised_fields": advertised_fields,
        "graphql_selection": selection,
        "provider_response": provider_response,
    }


def persist_capture(value: dict) -> tuple[Path, bool]:
    start = parse_time(value["window"]["start"])
    end = parse_time(value["window"]["end"])
    path = CAPTURE_ROOT / capture_filename(start, end)
    encoded = json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if path.is_file():
        if path.read_text(encoding="utf-8") != encoded:
            raise RuntimeError(f"immutable traffic capture collision at {path.name}")
        return path, False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(encoded, encoding="utf-8")
    return path, True


def freeze_window(token: str, zone: str, start: datetime, end: datetime, limit: int,
                  fields: list[str], selection: str, captured_at: datetime, write: bool) -> list[dict]:
    provider = graphql(token, raw_query(zone, start, end, limit, selection))
    records = records_from_payload(provider)
    duration = int((end - start).total_seconds())
    if len(records) >= limit and duration > 1:
        mid = start + timedelta(seconds=max(1, duration // 2))
        return (
            freeze_window(token, zone, start, mid, limit, fields, selection, captured_at, write)
            + freeze_window(token, zone, mid, end, limit, fields, selection, captured_at, write)
        )
    if len(records) >= limit:
        raise RuntimeError("raw provider page remains saturated at one-second resolution")
    value = capture_payload(start, end, provider, captured_at, fields, selection)
    created = False
    if write:
        _, created = persist_capture(value)
    return [{
        "start": stamp(start),
        "end": stamp(end),
        "records": len(records),
        "file": capture_filename(start, end),
        "created": created,
    }]


def raw_cursor(value: dict) -> str | None:
    if value.get("version") == 2:
        raw = value.get("raw_last_capture_end")
        return raw if isinstance(raw, str) and raw else None
    if value.get("version") == 1:
        return None
    raise RuntimeError("unsupported crawlerbait capture cursor")


def self_test():
    fake = {
        "data": {"__schema": {
            "queryType": {"name": "Query"},
            "types": [
                {"name": "Query", "fields": [{"name": "viewer", "type": {"kind": "OBJECT", "name": "Viewer"}}]},
                {"name": "Viewer", "fields": [{"name": "zones", "type": {"kind": "LIST", "ofType": {"kind": "OBJECT", "name": "Zone"}}}]},
                {"name": "Zone", "fields": [{"name": "httpRequestsAdaptive", "type": {"kind": "LIST", "ofType": {"kind": "OBJECT", "name": "Request"}}}]},
                {"name": "Request", "fields": [
                    {"name": "datetime", "type": {"kind": "SCALAR", "name": "DateTime"}},
                    {"name": "clientIP", "type": {"kind": "SCALAR", "name": "String"}},
                    {"name": "nested", "type": {"kind": "OBJECT", "name": "Nested"}},
                ]},
                {"name": "Nested", "fields": [{"name": "score", "type": {"kind": "SCALAR", "name": "Int"}}]},
            ]
        }}
    }
    types, record_type = dataset_record_type(fake)
    assert resolve_available_field(types, record_type, "nested_score") == ["nested", "score"]
    selection = render_selection(selection_tree([
        resolve_available_field(types, record_type, f)
        for f in ("datetime", "clientIP", "nested_score")
    ]))
    assert "nested { score }" in selection
    t0 = datetime(2026, 9, 18, 0, 0, tzinfo=timezone.utc)
    payload = {"data": {"viewer": {"zones": [{"records": []}]}}}
    cap = capture_payload(t0, t0 + timedelta(hours=1), payload, t0, ["datetime"], "datetime")
    assert cap["semantic_filters"] == []
    assert records_from_payload(payload) == []
    assert capture_filename(t0, t0 + timedelta(hours=1)).endswith(".traffic.json")
    print("PASS · capture asks for every provider-advertised raw HTTP field with time bounds only")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--now")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        self_test()
        return

    token = os.environ.get("CLOUDFLARE_ANALYTICS_TOKEN", "").strip()
    zone = os.environ.get("CLOUDFLARE_ZONE_TAG", "").strip()
    if not token or not zone:
        raise SystemExit("crawlerbait capture is unarmed: CLOUDFLARE_ANALYTICS_TOKEN and CLOUDFLARE_ZONE_TAG are required")

    policy = read_json(POLICY_PATH)
    cursor = read_json(CURSOR_PATH)
    now = parse_time(args.now) if args.now else datetime.now(timezone.utc)

    settings_payload = graphql(token, SETTINGS_QUERY, {"zoneTag": zone})
    cfg = zone_settings(settings_payload)
    introspection = graphql(token, INTROSPECTION_QUERY)
    types, record_type = dataset_record_type(introspection)

    fields = list(cfg["availableFields"])
    max_fields = int(cfg["maxNumberOfFields"])
    if len(fields) > max_fields:
        raise RuntimeError(
            f"provider exposes {len(fields)} raw fields but permits only {max_fields} per request; "
            "refusing to omit or heuristically join fields"
        )
    resolved = [resolve_available_field(types, record_type, field) for field in fields]
    selection = render_selection(selection_tree(resolved))

    acquisition_now = datetime.now(timezone.utc) if not args.now else now
    end = acquisition_now - timedelta(minutes=int(policy["settle_delay_minutes"]))
    retention_edge = (
        acquisition_now - timedelta(seconds=int(cfg["notOlderThan"])) + timedelta(seconds=2)
    ).replace(microsecond=0)
    previous = raw_cursor(cursor)
    start = parse_time(previous) if previous else retention_edge
    lost_gap = None
    if start < retention_edge:
        lost_gap = {"start": stamp(start), "end": stamp(retention_edge)}
        start = retention_edge
    if end <= start:
        print(json.dumps({"status": "no-window", "cursor": stamp(start), "raw_fields": len(fields)}))
        return

    width_seconds = min(int(cfg["maxDuration"]), int(policy["max_window_hours"]) * 3600)
    limit = int(cfg["maxPageSize"])
    leaves = []
    pointer = start
    while pointer < end:
        stop = min(end, pointer + timedelta(seconds=width_seconds))
        leaves.extend(freeze_window(token, zone, pointer, stop, limit, fields, selection, acquisition_now, args.write))
        pointer = stop

    if args.write:
        write_json(CURSOR_PATH, {
            "version": 2,
            "source": "cloudflare:httpRequestsAdaptive",
            "raw_last_capture_end": stamp(end),
            "legacy_404_last_capture_end": cursor.get("legacy_404_last_capture_end")
                or cursor.get("last_capture_end"),
            "provider_available_fields": fields,
            "provider_limits": {
                "maxDuration": int(cfg["maxDuration"]),
                "maxNumberOfFields": max_fields,
                "maxPageSize": limit,
                "notOlderThan": int(cfg["notOlderThan"]),
            },
            "unrecoverable_gap": lost_gap,
        })

    print(json.dumps({
        "status": "captured",
        "window": {"start": stamp(start), "end": stamp(end)},
        "raw_fields": len(fields),
        "records": sum(item["records"] for item in leaves),
        "created_files": sum(int(item["created"]) for item in leaves),
        "chunks": leaves,
        "unrecoverable_gap": lost_gap,
    }, indent=2))


if __name__ == "__main__":
    main()
