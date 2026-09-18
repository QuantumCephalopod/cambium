#!/usr/bin/env python3
"""ONE-TIME: freeze the complete raw HTTP-request surface Cloudflare exposes for this zone.

No semantic traffic filters are permitted here. Time bounds, page size, field-count
limits, and recursive window splitting are transport constraints only.

Plaintext output is PRIVATE material. The GitHub workflow encrypts it before any
artifact leaves the runner; plaintext must never enter the public repository.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import argparse
import hashlib
import json
import os
import urllib.error
import urllib.parse
import urllib.request

API = "https://api.cloudflare.com/client/v4"
GRAPHQL = API + "/graphql"


def stamp(value: datetime) -> str:
    return value.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for block in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def request_bytes(url: str, token: str, *, method="GET", data: bytes | None = None,
                  content_type: str | None = None, timeout=60) -> tuple[int, bytes, dict]:
    headers = {"Authorization": f"Bearer {token}", "User-Agent": "sss-crawlerbait-provider-raw/1"}
    if content_type:
        headers["Content-Type"] = content_type
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.status, response.read(), dict(response.headers.items())
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read(), dict(exc.headers.items())


def rest_json(url: str, token: str) -> dict:
    status, raw, headers = request_bytes(url, token)
    parsed = None
    try:
        parsed = json.loads(raw.decode("utf-8"))
    except Exception:
        pass
    return {"http_status": status, "headers": headers, "body": parsed if parsed is not None else raw.decode("utf-8", "replace")}


def graphql(token: str, query: str, variables: dict | None = None) -> dict:
    payload = json.dumps({"query": query, "variables": variables or {}}).encode("utf-8")
    status, raw, headers = request_bytes(GRAPHQL, token, method="POST", data=payload, content_type="application/json")
    try:
        body = json.loads(raw.decode("utf-8"))
    except Exception as exc:
        raise RuntimeError(f"GraphQL returned non-JSON HTTP {status}: {raw[:500]!r}") from exc
    if status >= 400:
        raise RuntimeError(f"GraphQL HTTP {status}: {json.dumps(body, ensure_ascii=False)[:2000]}")
    if body.get("errors"):
        raise RuntimeError("GraphQL error: " + json.dumps(body["errors"], ensure_ascii=False)[:3000])
    return {"http_status": status, "headers": headers, "body": body}


SETTINGS_QUERY = r'''query ProviderRawSettings($zoneTag: string) {
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

INTROSPECTION_QUERY = r'''query ProviderRawSchema {
  __schema {
    queryType { name }
    types {
      kind
      name
      fields(includeDeprecated: true) {
        name
        isDeprecated
        deprecationReason
        args { name type { kind name ofType { kind name ofType { kind name } } } }
        type { kind name ofType { kind name ofType { kind name ofType { kind name } } } }
      }
      inputFields { name type { kind name ofType { kind name ofType { kind name } } } }
      enumValues(includeDeprecated: true) { name isDeprecated deprecationReason }
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
        raise RuntimeError("httpRequestsAdaptive settings incomplete: " + json.dumps(cfg, ensure_ascii=False))
    if not cfg.get("enabled"):
        raise RuntimeError("httpRequestsAdaptive is not enabled for this zone/token")
    fields = cfg.get("availableFields")
    if not isinstance(fields, list) or not fields:
        raise RuntimeError("httpRequestsAdaptive exposes no availableFields")
    return cfg


def chunks(values: list[str], n: int) -> list[list[str]]:
    if n < 1:
        raise ValueError("field chunk width must be positive")
    return [values[i:i+n] for i in range(0, len(values), n)]


def field_slices(fields: list[str], max_fields: int) -> list[list[str]]:
    """Cover every available field while respecting the provider field-count limit."""
    ordered = list(dict.fromkeys(fields))
    anchors = [f for f in ("datetime", "rayName") if f in ordered]
    rest = [f for f in ordered if f not in anchors]
    payload_width = max_fields - len(anchors)
    if payload_width <= 0:
        return chunks(ordered, max_fields)
    return [anchors + part for part in chunks(rest, payload_width)] or [anchors]


def raw_query(zone: str, start: datetime, end: datetime, limit: int, fields: list[str]) -> str:
    selection = " ".join(fields)
    return (
        '{ viewer { zones(filter: { zoneTag: "' + zone + '" }) { '
        'records: httpRequestsAdaptive('
        'filter: { datetime_geq: "' + stamp(start) + '" datetime_lt: "' + stamp(end) + '" } '
        'limit: ' + str(int(limit)) + ' orderBy: [datetime_ASC]) { ' + selection + ' }'
        ' } } }'
    )


def gql_records(response: dict) -> list:
    zones = response.get("data", {}).get("viewer", {}).get("zones", [])
    if len(zones) != 1 or not isinstance(zones[0].get("records"), list):
        raise RuntimeError("unexpected httpRequestsAdaptive response")
    return zones[0]["records"]


def compact(value: datetime) -> str:
    return stamp(value).replace("-", "").replace(":", "")


def freeze_graphql_leaf(token: str, zone: str, start: datetime, end: datetime,
                        fields: list[str], max_fields: int, limit: int,
                        out: Path, write: bool) -> list[dict]:
    slices = field_slices(fields, max_fields)
    fetched: list[tuple[list[str], dict, list]] = []
    saturated = False
    for subset in slices:
        response = graphql(token, raw_query(zone, start, end, limit, subset))["body"]
        records = gql_records(response)
        saturated = saturated or len(records) >= limit
        fetched.append((subset, response, records))

    duration = int((end - start).total_seconds())
    if saturated and duration > 1:
        mid = start + timedelta(seconds=max(1, duration // 2))
        if not start < mid < end:
            raise RuntimeError("cannot bisect saturated raw HTTP window")
        return (
            freeze_graphql_leaf(token, zone, start, mid, fields, max_fields, limit, out, write)
            + freeze_graphql_leaf(token, zone, mid, end, fields, max_fields, limit, out, write)
        )

    base = f"{compact(start)}--{compact(end)}"
    files = []
    counts = []
    for index, (subset, response, records) in enumerate(fetched):
        name = f"{base}.fields-{index:03d}.json"
        path = out / "graphql-httpRequestsAdaptive" / name
        carrier = {
            "version": 1,
            "source": "cloudflare:graphql:httpRequestsAdaptive",
            "purpose": "provider-raw HTTP event freeze; no semantic traffic filters",
            "window": {"start": stamp(start), "end": stamp(end)},
            "fields": subset,
            "provider_response": response,
        }
        if write:
            write_json(path, carrier)
        files.append(path.relative_to(out).as_posix())
        counts.append(len(records))

    return [{
        "start": stamp(start), "end": stamp(end), "duration_seconds": duration,
        "field_slices": len(slices), "records_per_slice": counts,
        "saturated_at_one_second": bool(saturated and duration <= 1),
        "files": files,
    }]


def freeze_graphql(token: str, zone: str, now: datetime, cfg: dict, out: Path, write: bool) -> dict:
    fields = list(cfg["availableFields"])
    max_duration = int(cfg["maxDuration"])
    max_fields = int(cfg["maxNumberOfFields"])
    limit = int(cfg["maxPageSize"])
    retained = int(cfg["notOlderThan"])
    end = now - timedelta(minutes=5)
    start = now - timedelta(seconds=retained) + timedelta(seconds=1)
    leaves = []
    cursor = start
    while cursor < end:
        stop = min(end, cursor + timedelta(seconds=max_duration))
        leaves.extend(freeze_graphql_leaf(token, zone, cursor, stop, fields, max_fields, limit, out, write))
        cursor = stop
    bad = [leaf for leaf in leaves if leaf["saturated_at_one_second"]]
    return {
        "source": "cloudflare:graphql:httpRequestsAdaptive",
        "rawness": "raw HTTP request events with Cloudflare adaptive sampling",
        "semantic_filters": [],
        "transport_filter": "datetime range only",
        "retained_window": {"start": stamp(start), "end": stamp(end)},
        "available_fields": fields,
        "provider_limits": {
            "maxDuration": max_duration, "maxNumberOfFields": max_fields,
            "maxPageSize": limit, "notOlderThan": retained,
        },
        "leaves": leaves,
        "saturated_one_second_leaves": bad,
        "complete_within_provider_surface": not bad,
    }


def freeze_logpull(token: str, zone: str, now: datetime, out: Path, write: bool) -> dict:
    fields_probe = rest_json(f"{API}/zones/{zone}/logs/received/fields", token)
    if write:
        write_json(out / "discovery" / "logpull-fields.json", fields_probe)
    if fields_probe["http_status"] != 200 or not isinstance(fields_probe["body"], dict):
        return {"available": False, "probe_http_status": fields_probe["http_status"], "reason": "logs/received/fields unavailable to current plan/token"}
    body = fields_probe["body"]
    field_map = body.get("result") if isinstance(body.get("result"), dict) else body
    fields = sorted(k for k in field_map.keys() if isinstance(k, str))
    if not fields:
        return {"available": False, "probe_http_status": 200, "reason": "Logpull field list empty"}

    end = now - timedelta(minutes=5)
    start = now - timedelta(days=7) + timedelta(seconds=1)
    cursor = start
    files = []
    while cursor < end:
        stop = min(end, cursor + timedelta(hours=1))
        params = urllib.parse.urlencode({
            "start": stamp(cursor), "end": stamp(stop),
            "fields": ",".join(fields), "timestamps": "rfc3339",
        })
        status, raw, headers = request_bytes(f"{API}/zones/{zone}/logs/received?{params}", token, timeout=120)
        if status >= 400:
            return {
                "available": False, "probe_http_status": 200,
                "reason": f"Logpull data request failed HTTP {status}",
                "failed_window": {"start": stamp(cursor), "end": stamp(stop)},
            }
        name = f"{compact(cursor)}--{compact(stop)}.ndjson"
        path = out / "logpull-http-requests" / name
        if write:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
        files.append({"file": path.relative_to(out).as_posix(), "bytes": len(raw), "start": stamp(cursor), "end": stamp(stop)})
        cursor = stop
    return {
        "available": True,
        "source": "cloudflare:logpull:/logs/received",
        "rawness": "edge HTTP request logs",
        "semantic_filters": [],
        "transport_filter": "datetime range only",
        "fields": fields,
        "retained_window": {"start": stamp(start), "end": stamp(end)},
        "files": files,
        "complete_within_provider_surface": True,
    }


def probe_log_surfaces(token: str, zone: str, out: Path, write: bool) -> dict:
    probes = {}
    endpoints = {
        "logpull_fields": f"{API}/zones/{zone}/logs/received/fields",
        "log_explorer_available": f"{API}/zones/{zone}/logs/explorer/datasets/available",
        "log_explorer_configured": f"{API}/zones/{zone}/logs/explorer/datasets",
        "logpush_http_request_fields": f"{API}/zones/{zone}/logpush/datasets/http_requests/fields",
    }
    for name, url in endpoints.items():
        value = rest_json(url, token)
        probes[name] = {"http_status": value["http_status"]}
        if write:
            write_json(out / "discovery" / f"{name}.json", value)
    return probes


def self_test() -> None:
    fields = ["a", "datetime", "b", "rayName", "c", "d"]
    slices = field_slices(fields, 4)
    assert slices == [["datetime", "rayName", "a", "b"], ["datetime", "rayName", "c", "d"]]
    q = raw_query("0" * 32, datetime(2026, 9, 18, tzinfo=timezone.utc), datetime(2026, 9, 18, 1, tzinfo=timezone.utc), 10000, ["datetime", "clientIP"])
    assert "httpRequestsAdaptive" in q and "clientIP" in q
    assert "edgeResponseStatus" not in q and "requestSource" not in q
    assert "datetime_geq" in q and "datetime_lt" in q
    print("PASS · provider-raw exporter has no semantic traffic filter and covers all provider-advertised fields")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--output", type=Path, default=Path("_private/crawlerbait-provider-raw"))
    ap.add_argument("--now")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        self_test()
        return

    token = os.environ.get("CLOUDFLARE_ANALYTICS_TOKEN", "").strip()
    zone = os.environ.get("CLOUDFLARE_ZONE_TAG", "").strip()
    if not token or not zone:
        raise SystemExit("CLOUDFLARE_ANALYTICS_TOKEN and CLOUDFLARE_ZONE_TAG are required")
    if len(zone) != 32 or any(c not in "0123456789abcdefABCDEF" for c in zone):
        raise SystemExit("CLOUDFLARE_ZONE_TAG must be a 32-character hex zone id")

    out = args.output.resolve()
    if out.exists() and any(out.iterdir()):
        raise SystemExit(f"refusing to mix provider-raw custody with existing bytes: {out}")
    now = parse_time(args.now) if args.now else datetime.now(timezone.utc)
    if args.write:
        out.mkdir(parents=True, exist_ok=True)

    introspection = graphql(token, INTROSPECTION_QUERY)
    settings = graphql(token, SETTINGS_QUERY, {"zoneTag": zone})
    cfg = zone_settings(settings["body"])
    if args.write:
        write_json(out / "discovery" / "graphql-introspection.json", introspection)
        write_json(out / "discovery" / "graphql-httpRequestsAdaptive-settings.json", settings)
    probes = probe_log_surfaces(token, zone, out, args.write)

    graphql_raw = freeze_graphql(token, zone, now, cfg, out, args.write)
    logpull = freeze_logpull(token, zone, now, out, args.write)

    manifest = {
        "version": 1,
        "captured_at": stamp(now),
        "scope": "complete raw HTTP-request surfaces exposed by Cloudflare to this zone/token during retained history",
        "law": "no semantic traffic filters; provider/plan/retention/sampling/transport limits are recorded, never silently replaced by local relevance choices",
        "zone_id_sha256": hashlib.sha256(zone.encode("ascii")).hexdigest(),
        "surfaces": {"graphql_httpRequestsAdaptive": graphql_raw, "logpull_http_requests": logpull},
        "surface_probes": probes,
    }
    manifest["complete_within_accessible_surfaces"] = bool(
        graphql_raw["complete_within_provider_surface"] and
        (not logpull.get("available") or logpull.get("complete_within_provider_surface"))
    )
    if args.write:
        write_json(out / "MANIFEST.json", manifest)
        inventory = []
        for path in sorted(p for p in out.rglob("*") if p.is_file()):
            inventory.append({"file": path.relative_to(out).as_posix(), "bytes": path.stat().st_size, "sha256": sha256_file(path)})
        write_json(out / "SHA256-INVENTORY.json", inventory)

    print(json.dumps(manifest, indent=2))
    if graphql_raw["saturated_one_second_leaves"]:
        raise SystemExit("provider page ceiling remains saturated at one-second resolution; archive is explicit but incomplete")


if __name__ == "__main__":
    main()
