#!/usr/bin/env python3
"""Capture exact functional encounters plus opaque phenotype interference without publishing recognition material."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import argparse
import hashlib
import hmac
import ipaddress
import json
import os
import urllib.error
import urllib.request

import path_privacy as pathmembrane

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
POLICY_PATH = ROOT / "z" / "policy.json"
CURSOR_PATH = ROOT / "x" / "cursor.json"
CAPTURE_ROOT = ROOT / "x" / "captures"
GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql"
IDENTITY_SCHEME = "hmac-sha256"
IDENTITY_DOMAIN = "crawlerbait:clientIP:v1"
IDENTITY_KEY_EPOCH = "v1"
PHENOTYPE_DOMAIN = "crawlerbait:phenotype:v1"
NEVER_CAPTURE_FIELDS = {"clientRequestQuery"}
CORE_FIELDS = (
    "datetime",
    "clientIP",
    "userAgent",
    "clientRequestPath",
    "clientRequestHTTPMethodName",
    "edgeResponseStatus",
)
AUX_RECOGNITION_FIELDS = ("clientIP", "userAgent", "datetime")
PUBLIC_RECORD_FIELDS = (
    "datetime",
    "beingId",
    "clientRequestPath",
    "clientRequestHTTPMethodName",
    "edgeResponseStatus",
)


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


def identity_key(value: str) -> bytes:
    raw = value.strip()
    if len(raw) != 64 or any(ch not in "0123456789abcdefABCDEF" for ch in raw):
        raise ValueError("CRAWLERBAIT_ID_KEY must be exactly 64 hexadecimal characters (32 random bytes)")
    return bytes.fromhex(raw)


def identity_key_fingerprint(key: bytes) -> str:
    return hashlib.sha256(key).hexdigest()[:16]


def canonical_ip(value) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""
    try:
        return ipaddress.ip_address(raw).compressed
    except ValueError as exc:
        raise RuntimeError(f"Cloudflare returned an invalid clientIP value: {raw!r}") from exc


def client_ip_identity(key: bytes, value) -> str | None:
    canonical = canonical_ip(value)
    if not canonical:
        return None
    digest = hmac.new(
        key,
        (IDENTITY_DOMAIN + "\x00" + canonical).encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"ip:{IDENTITY_KEY_EPOCH}:{digest}"


def public_being_id(key: bytes, client_ip, user_agent) -> str:
    network = client_ip_identity(key, client_ip)
    if not network:
        raise RuntimeError("Cloudflare traffic event is missing clientIP for private recognition")
    ua = str(user_agent or "")
    return hashlib.sha256((network + "\x00" + ua).encode("utf-8", "replace")).hexdigest()[:24]


def value_at(record: dict, path: list[str]):
    value = record
    for part in path:
        if not isinstance(value, dict):
            return None
        value = value.get(part)
    return value


def tetra_chunks(items: list[str], capacity: int) -> list[list[str]]:
    if capacity < 1:
        raise RuntimeError("provider field limit leaves no room beyond recognition spine")
    items = list(items)
    if len(items) <= capacity:
        return [items] if items else []
    width = (len(items) + 3) // 4
    out = []
    for i in range(0, len(items), width):
        out.extend(tetra_chunks(items[i:i + width], capacity))
    return out


def merge_tokens(target: dict[str, list[str]], source: dict[str, list[str]]) -> None:
    for being_id, tokens in source.items():
        target.setdefault(being_id, []).extend(tokens)


def phenotype_tokens(key: bytes, records: list[dict]) -> dict[str, list[str]]:
    """Collapse the actual returned auxiliary shard tree into opaque per-Being signal.

    The auxiliary query contains only the private recognition spine plus the shard.
    Strip the spine, then hash the complete remaining provider structure as returned,
    including nested lists/objects. Nothing readable crosses the publication membrane.
    """
    out: dict[str, list[str]] = {}
    for record in records:
        being_id = public_being_id(key, record.get("clientIP"), record.get("userAgent"))
        values = {
            field: value
            for field, value in record.items()
            if field not in set(AUX_RECOGNITION_FIELDS)
        }
        material = json.dumps(values, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        token = hmac.new(
            key,
            (PHENOTYPE_DOMAIN + "\x00" + being_id + "\x00" + material).encode("utf-8", "replace"),
            hashlib.sha256,
        ).hexdigest()
        out.setdefault(being_id, []).append(token)
    return out


def public_core_response(provider_response: dict, key: bytes) -> dict:
    public_records = []
    for record in records_from_payload(provider_response):
        public_records.append({
            "datetime": record.get("datetime"),
            "beingId": public_being_id(key, record.get("clientIP"), record.get("userAgent")),
            "clientRequestPath": pathmembrane.public_path(key, record.get("clientRequestPath")),
            "clientRequestHTTPMethodName": record.get("clientRequestHTTPMethodName"),
            "edgeResponseStatus": record.get("edgeResponseStatus"),
        })
    return {"data": {"viewer": {"zones": [{"records": public_records}]}}}


def public_genomes(key: bytes, being_ids: list[str], tokens: dict[str, list[str]]) -> dict[str, dict]:
    out = {}
    for being_id in sorted(set(being_ids) | set(tokens)):
        parts = sorted(tokens.get(being_id) or [])
        if parts:
            digest = hashlib.sha256(
                ("crawlerbait:public-phenotype:v1\x00" + being_id + "\x00" + "\x00".join(parts)).encode("utf-8")
            ).hexdigest()
        else:
            digest = hmac.new(
                key,
                ("crawlerbait:public-phenotype-fallback:v1\x00" + being_id).encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()
        out[being_id] = {"genome": digest, "samples": len(parts)}
    return out


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


def capture_payload(start: datetime, end: datetime, public_response: dict, captured_at: datetime,
                    advertised_fields: list[str], excluded_fields: list[str], core_fields: list[str],
                    phenotype_groups: list[list[str]], genomes: dict[str, dict],
                    key_fingerprint: str) -> dict:
    return {
        "version": 5,
        "source": "cloudflare:httpRequestsAdaptive",
        "captured_at": stamp(captured_at),
        "window": {"start": stamp(start), "end": stamp(end)},
        "semantic_filters": [],
        "transport_filter": "datetime range only",
        "provider_advertised_fields": advertised_fields,
        "never_captured_fields": excluded_fields,
        "private_recognition_fields": ["clientIP", "userAgent"],
        "public_record_fields": list(PUBLIC_RECORD_FIELDS),
        "functional_provider_fields": core_fields,
        "phenotype_field_shards": phenotype_groups,
        "publication_transform": {
            "beingId": {
                "scheme": "sha256(HMAC-SHA256(clientIP) || exact userAgent)",
                "network_pseudonym_persisted": False,
                "exact_user_agent_persisted": False,
                "literal_client_ip_persisted": False,
                "key_epoch": IDENTITY_KEY_EPOCH,
                "key_fingerprint": key_fingerprint,
            },
            "phenotype": {
                "scheme": "keyed irreversible field-interference",
                "domain": PHENOTYPE_DOMAIN,
                "raw_provider_values_persisted": False,
            },
            "clientRequestPath": {
                "scheme": "literal offered path else HMAC-SHA256 opaque Bait path",
                "domain": pathmembrane.PATH_DOMAIN,
                "raw_unoffered_path_persisted": False,
                "offered_public_paths_literal": True,
                "offered_resolution": pathmembrane.OFFERED_RESOLUTION,
                "key_epoch": IDENTITY_KEY_EPOCH,
            },
        },
        "phenotype_by_being": genomes,
        "published_response": public_response,
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


def collect_aux_window(token: str, zone: str, start: datetime, end: datetime, limit: int,
                       selection: str, key: bytes) -> dict[str, list[str]]:
    provider = graphql(token, raw_query(zone, start, end, limit, selection))
    records = records_from_payload(provider)
    duration = int((end - start).total_seconds())
    if len(records) >= limit and duration > 1:
        mid = start + timedelta(seconds=max(1, duration // 2))
        out: dict[str, list[str]] = {}
        merge_tokens(out, collect_aux_window(token, zone, start, mid, limit, selection, key))
        merge_tokens(out, collect_aux_window(token, zone, mid, end, limit, selection, key))
        return out
    if len(records) >= limit:
        raise RuntimeError("phenotype provider page remains saturated at one-second resolution")
    return phenotype_tokens(key, records)


def freeze_window(token: str, zone: str, start: datetime, end: datetime, limit: int,
                  advertised_fields: list[str], core_fields: list[str], core_selection: str,
                  aux_specs: list[tuple[list[str], str]],
                  captured_at: datetime, write: bool, key: bytes, key_fingerprint: str) -> list[dict]:
    provider = graphql(token, raw_query(zone, start, end, limit, core_selection))
    records = records_from_payload(provider)
    duration = int((end - start).total_seconds())
    if len(records) >= limit and duration > 1:
        mid = start + timedelta(seconds=max(1, duration // 2))
        return (
            freeze_window(token, zone, start, mid, limit, advertised_fields, core_fields, core_selection,
                          aux_specs, captured_at, write, key, key_fingerprint)
            + freeze_window(token, zone, mid, end, limit, advertised_fields, core_fields, core_selection,
                            aux_specs, captured_at, write, key, key_fingerprint)
        )
    if len(records) >= limit:
        raise RuntimeError("functional provider page remains saturated at one-second resolution")

    public_response = public_core_response(provider, key)
    being_ids = [record["beingId"] for record in records_from_payload(public_response)]
    tokens: dict[str, list[str]] = {}
    for _fields, selection in aux_specs:
        merge_tokens(tokens, collect_aux_window(token, zone, start, end, limit, selection, key))
    genomes = public_genomes(key, being_ids, tokens)

    value = capture_payload(
        start, end, public_response, captured_at, advertised_fields,
        sorted(NEVER_CAPTURE_FIELDS), core_fields,
        [fields for fields, _selection in aux_specs],
        genomes, key_fingerprint,
    )
    created = False
    if write:
        _, created = persist_capture(value)
    return [{
        "start": stamp(start),
        "end": stamp(end),
        "records": len(records),
        "file": capture_filename(start, end),
        "created": created,
        "phenotype_shards": len(aux_specs),
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
                    {"name": "userAgent", "type": {"kind": "SCALAR", "name": "String"}},
                    {"name": "clientRequestPath", "type": {"kind": "SCALAR", "name": "String"}},
                    {"name": "clientRequestHTTPMethodName", "type": {"kind": "SCALAR", "name": "String"}},
                    {"name": "clientRequestQuery", "type": {"kind": "SCALAR", "name": "String"}},
                    {"name": "edgeResponseStatus", "type": {"kind": "SCALAR", "name": "Int"}},
                    {"name": "nested", "type": {"kind": "OBJECT", "name": "Nested"}},
                ]},
                {"name": "Nested", "fields": [{"name": "score", "type": {"kind": "SCALAR", "name": "Int"}}]},
            ]
        }}
    }
    types, record_type = dataset_record_type(fake)
    assert resolve_available_field(types, record_type, "nested_score") == ["nested", "score"]
    assert tetra_chunks(list("abcdefghij"), 3) == [list("abc"), list("def"), list("ghi"), list("j")]

    key = identity_key("01" * 32)
    a = public_being_id(key, "203.0.113.7", "Crab/1")
    b = public_being_id(key, "203.0.113.7", "Crab/1")
    c = public_being_id(key, "203.0.113.8", "Crab/1")
    assert a == b and a != c
    assert len(a) == 24

    provider = {"data": {"viewer": {"zones": [{"records": [{
        "datetime": "2026-09-18T00:00:01Z",
        "clientIP": "203.0.113.7",
        "userAgent": "Crab/1",
        "clientRequestPath": "/a",
        "clientRequestHTTPMethodName": "GET",
        "clientRequestQuery": "?secret=never-store-me",
        "edgeResponseStatus": 200,
        "nested": {"score": 2, "labels": ["alpha", "beta"]},
    }]}]}}}
    public = public_core_response(provider, key)
    record = records_from_payload(public)[0]
    assert set(record) == set(PUBLIC_RECORD_FIELDS)
    assert record["beingId"] == a
    assert "clientIP" not in record and "userAgent" not in record and "clientRequestQuery" not in record
    assert record["clientRequestPath"].startswith("/~/")
    assert "/a" not in record["clientRequestPath"]
    assert pathmembrane.public_path_shape_valid(record["clientRequestPath"])

    toks = phenotype_tokens(key, records_from_payload(provider))
    genomes = public_genomes(key, [a], toks)
    assert len(genomes[a]["genome"]) == 64 and genomes[a]["samples"] == 1
    assert genomes[a]["genome"] != json.dumps({"nested": {"score": 2, "labels": ["alpha", "beta"]}}, sort_keys=True)
    changed = json.loads(json.dumps(provider))
    changed["data"]["viewer"]["zones"][0]["records"][0]["nested"]["labels"].append("gamma")
    changed_genome = public_genomes(key, [a], phenotype_tokens(key, records_from_payload(changed)))[a]["genome"]
    assert changed_genome != genomes[a]["genome"], "nested auxiliary structure must contribute to phenotype"

    available = list(CORE_FIELDS) + ["clientRequestQuery", "nested_score"]
    capture_fields = [field for field in available if field not in NEVER_CAPTURE_FIELDS]
    assert "clientRequestQuery" not in capture_fields
    pathmembrane.self_test()
    print("PASS · private recognition, path membrane and phenotype are public-safe; query is never captured")


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
    identity_secret = os.environ.get("CRAWLERBAIT_ID_KEY", "").strip()
    if not token or not zone or not identity_secret:
        raise SystemExit(
            "crawlerbait capture is unarmed: CLOUDFLARE_ANALYTICS_TOKEN, "
            "CLOUDFLARE_ZONE_TAG and CRAWLERBAIT_ID_KEY are required"
        )
    try:
        key = identity_key(identity_secret)
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc
    key_fingerprint = identity_key_fingerprint(key)

    policy = read_json(POLICY_PATH)
    cursor = read_json(CURSOR_PATH)
    identity_meta = cursor.get("identity") or {}
    previous_identity = identity_meta.get("key_fingerprint") or (identity_meta.get("clientIP") or {}).get("key_fingerprint")
    if previous_identity and previous_identity != key_fingerprint:
        raise SystemExit(
            "CRAWLERBAIT_ID_KEY changed while key_epoch is still v1; refusing to sever longitudinal identity"
        )
    now = parse_time(args.now) if args.now else datetime.now(timezone.utc)

    settings_payload = graphql(token, SETTINGS_QUERY, {"zoneTag": zone})
    cfg = zone_settings(settings_payload)
    introspection = graphql(token, INTROSPECTION_QUERY)
    types, record_type = dataset_record_type(introspection)

    advertised_fields = list(cfg["availableFields"])
    captured_fields = [field for field in advertised_fields if field not in NEVER_CAPTURE_FIELDS]
    missing_core = [field for field in CORE_FIELDS if field not in captured_fields]
    if missing_core:
        raise RuntimeError("provider no longer exposes required functional fields: " + ", ".join(missing_core))

    resolved_by_field = {
        field: resolve_available_field(types, record_type, field)
        for field in captured_fields
    }
    core_fields = list(CORE_FIELDS)
    core_selection = render_selection(selection_tree([resolved_by_field[field] for field in core_fields]))

    max_fields = int(cfg["maxNumberOfFields"])
    recognition_spine = [field for field in AUX_RECOGNITION_FIELDS if field in captured_fields]
    aux_fields = [field for field in captured_fields if field not in set(core_fields)]
    aux_capacity = max_fields - len(recognition_spine)
    aux_groups = tetra_chunks(aux_fields, aux_capacity)
    aux_specs = []
    for group in aux_groups:
        requested = recognition_spine + group
        selection = render_selection(selection_tree([resolved_by_field[field] for field in requested]))
        aux_specs.append((group, selection))

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
        print(json.dumps({
            "status": "no-window",
            "cursor": stamp(start),
            "provider_fields": len(advertised_fields),
            "captured_fields": len(captured_fields),
            "phenotype_shards": len(aux_specs),
        }))
        return

    width_seconds = min(int(cfg["maxDuration"]), int(policy["max_window_hours"]) * 3600)
    limit = int(cfg["maxPageSize"])
    leaves = []
    pointer = start
    while pointer < end:
        stop = min(end, pointer + timedelta(seconds=width_seconds))
        leaves.extend(
            freeze_window(
                token, zone, pointer, stop, limit,
                advertised_fields, core_fields, core_selection, aux_specs,
                acquisition_now, args.write, key, key_fingerprint,
            )
        )
        pointer = stop

    if args.write:
        write_json(CURSOR_PATH, {
            "version": 2,
            "source": "cloudflare:httpRequestsAdaptive",
            "raw_last_capture_end": stamp(end),
            "legacy_404_last_capture_end": cursor.get("legacy_404_last_capture_end")
                or cursor.get("last_capture_end"),
            "provider_available_fields": advertised_fields,
            "never_captured_fields": sorted(NEVER_CAPTURE_FIELDS),
            "identity": {
                "key_fingerprint": key_fingerprint,
                "scheme": IDENTITY_SCHEME,
                "key_epoch": IDENTITY_KEY_EPOCH,
                "literal_client_ip_persisted": False,
                "network_pseudonym_persisted": False,
                "exact_user_agent_persisted": False,
                "public_identity": "opaque artwork-local beingId only",
            },
            "path_privacy": {
                "scheme": "offered-literal / otherwise keyed opaque Bait path",
                "domain": pathmembrane.PATH_DOMAIN,
                "raw_unoffered_path_persisted": False,
                "key_epoch": IDENTITY_KEY_EPOCH,
            },
            "provider_limits": {
                "maxDuration": int(cfg["maxDuration"]),
                "maxNumberOfFields": max_fields,
                "maxPageSize": limit,
                "notOlderThan": int(cfg["notOlderThan"]),
            },
            "phenotype_shards": [group for group, _selection in aux_specs],
            "unrecoverable_gap": lost_gap,
        })

    print(json.dumps({
        "status": "captured",
        "window": {"start": stamp(start), "end": stamp(end)},
        "provider_fields": len(advertised_fields),
        "captured_fields": len(captured_fields),
        "never_captured_fields": sorted(NEVER_CAPTURE_FIELDS),
        "phenotype_shards": len(aux_specs),
        "records": sum(item["records"] for item in leaves),
        "created_files": sum(int(item["created"]) for item in leaves),
        "chunks": leaves,
        "unrecoverable_gap": lost_gap,
    }, indent=2))


if __name__ == "__main__":
    main()
