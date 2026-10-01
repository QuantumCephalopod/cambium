#!/usr/bin/env python3
"""Collapse legacy v4 public traffic fields into opaque phenotype DNA before retiring readable values."""
from __future__ import annotations

from pathlib import Path
import argparse
import hashlib
import hmac
import importlib.util
import json
import os

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
CAPTURE_ROOT = ROOT / "x" / "captures"
CURSOR_PATH = ROOT / "x" / "cursor.json"

spec = importlib.util.spec_from_file_location("crawlerbait_capture", HERE / "capture.py")
C = importlib.util.module_from_spec(spec)
spec.loader.exec_module(C)

PUBLIC_KEYS = {
    "datetime",
    "clientRequestPath",
    "clientRequestHTTPMethodName",
    "edgeResponseStatus",
}
PRIVATE_RECOGNITION_KEYS = {
    "clientIP",
    "clientIPIdentity",
    "userAgent",
}
NEVER_KEYS = {"clientRequestQuery"}


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def records_from(value: dict) -> list[dict]:
    zones = (value.get("published_response") or {}).get("data", {}).get("viewer", {}).get("zones", [])
    records = zones[0].get("records") if len(zones) == 1 else None
    if not isinstance(records, list):
        raise RuntimeError("legacy capture has no records")
    return records


def legacy_being_id(record: dict) -> str:
    network = str(record.get("clientIPIdentity") or "")
    ua = str(record.get("userAgent") or "")
    if not network:
        raise RuntimeError("legacy record is missing clientIPIdentity")
    return hashlib.sha256((network + "\x00" + ua).encode("utf-8", "replace")).hexdigest()[:24]


def auxiliary_tree(record: dict) -> dict:
    # Preserve every previously captured provider value except:
    # - the query, which is intentionally excreted;
    # - private recognition substrate;
    # - the exact functional encounter fields that remain public separately.
    excluded = PUBLIC_KEYS | PRIVATE_RECOGNITION_KEYS | NEVER_KEYS
    return {
        key: value
        for key, value in record.items()
        if key not in excluded
    }


def phenotype_token(key: bytes, being_id: str, aux: dict) -> str:
    material = json.dumps(aux, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hmac.new(
        key,
        (C.PHENOTYPE_DOMAIN + "\x00" + being_id + "\x00" + material).encode("utf-8", "replace"),
        hashlib.sha256,
    ).hexdigest()


def migrate_capture(value: dict, key: bytes, key_fingerprint: str) -> dict:
    if value.get("version") != 4 or value.get("source") != "cloudflare:httpRequestsAdaptive":
        raise RuntimeError("expected canonical v4 traffic capture")

    old_transform = (value.get("publication_transform") or {}).get("clientIP") or {}
    old_fingerprint = old_transform.get("key_fingerprint")
    if old_fingerprint and old_fingerprint != key_fingerprint:
        raise RuntimeError("legacy capture belongs to a different recognition-key epoch")

    public = []
    tokens: dict[str, list[str]] = {}
    for record in records_from(value):
        being = legacy_being_id(record)
        public.append({
            "datetime": record.get("datetime"),
            "beingId": being,
            "clientRequestPath": record.get("clientRequestPath"),
            "clientRequestHTTPMethodName": record.get("clientRequestHTTPMethodName"),
            "edgeResponseStatus": record.get("edgeResponseStatus"),
        })
        token = phenotype_token(key, being, auxiliary_tree(record))
        tokens.setdefault(being, []).append(token)

    genomes = C.public_genomes(key, [r["beingId"] for r in public], tokens)
    advertised = list(value.get("advertised_fields") or [])
    aux_fields = [
        field for field in advertised
        if field not in C.NEVER_CAPTURE_FIELDS and field not in set(C.CORE_FIELDS)
    ]

    return {
        "version": 5,
        "source": "cloudflare:httpRequestsAdaptive",
        "captured_at": value.get("captured_at"),
        "window": value.get("window"),
        "semantic_filters": [],
        "transport_filter": "datetime range only",
        "provider_advertised_fields": advertised,
        # Historically the query was captured; this list describes only the original carrier.
        "never_captured_fields": [],
        "current_law_never_captures": sorted(C.NEVER_CAPTURE_FIELDS),
        "private_recognition_fields": ["clientIP", "userAgent"],
        "public_record_fields": list(C.PUBLIC_RECORD_FIELDS),
        "functional_provider_fields": list(C.CORE_FIELDS),
        # The historical provider fit in one request. Its complete auxiliary tree is
        # collapsed as one phenotype shard before the readable representation retires.
        "phenotype_field_shards": [aux_fields] if aux_fields else [],
        "historical_migration": {
            "source_version": 4,
            "migrated_on": "2026-10-01",
            "query_value_removed": True,
            "network_pseudonym_removed": True,
            "exact_user_agent_removed": True,
            "auxiliary_values_collapsed_to_phenotype": True,
            "readable_auxiliary_values_removed_after_condensation": True,
            "note": "Current-tree migration only; earlier Git history was already public and is not rewritten.",
        },
        "publication_transform": {
            "beingId": {
                "scheme": "legacy artwork identity preserved from private-recognition tuple",
                "network_pseudonym_persisted": False,
                "exact_user_agent_persisted": False,
                "literal_client_ip_persisted": False,
                "key_epoch": C.IDENTITY_KEY_EPOCH,
                "key_fingerprint": key_fingerprint,
            },
            "phenotype": {
                "scheme": "keyed irreversible field-interference",
                "domain": C.PHENOTYPE_DOMAIN,
                "raw_provider_values_persisted": False,
                "source_values_collapsed_before_retirement": True,
            },
        },
        "phenotype_by_being": genomes,
        "published_response": {"data": {"viewer": {"zones": [{"records": public}]}}},
    }


def self_test():
    key = C.identity_key("01" * 32)
    fp = C.identity_key_fingerprint(key)
    network = C.client_ip_identity(key, "203.0.113.7")
    base = {
        "version": 4,
        "source": "cloudflare:httpRequestsAdaptive",
        "captured_at": "2026-09-18T00:01:00Z",
        "window": {"start": "2026-09-18T00:00:00Z", "end": "2026-09-18T01:00:00Z"},
        "semantic_filters": [],
        "advertised_fields": list(C.CORE_FIELDS) + ["clientRequestQuery", "clientCountryName", "nested_score"],
        "publication_transform": {"clientIP": {"key_fingerprint": fp}},
        "published_response": {"data": {"viewer": {"zones": [{"records": [{
            "datetime": "2026-09-18T00:00:01Z",
            "clientIPIdentity": network,
            "userAgent": "Crab/1",
            "clientRequestPath": "/a",
            "clientRequestHTTPMethodName": "GET",
            "edgeResponseStatus": 200,
            "clientRequestQuery": "?secret=discard",
            "clientCountryName": "DE",
            "nested": {"score": 2, "labels": ["alpha", "beta"]},
        }]}]}}},
    }
    a = migrate_capture(base, key, fp)
    rec = records_from(a)[0]
    assert set(rec) == set(C.PUBLIC_RECORD_FIELDS)
    being = rec["beingId"]
    assert a["phenotype_by_being"][being]["samples"] == 1
    assert a["historical_migration"]["auxiliary_values_collapsed_to_phenotype"] is True
    assert "clientRequestQuery" not in rec and "clientIPIdentity" not in rec and "userAgent" not in rec

    query_changed = json.loads(json.dumps(base))
    query_changed["published_response"]["data"]["viewer"]["zones"][0]["records"][0]["clientRequestQuery"] = "?other"
    b = migrate_capture(query_changed, key, fp)
    assert b["phenotype_by_being"][being]["genome"] == a["phenotype_by_being"][being]["genome"], "query must not enter DNA"

    aux_changed = json.loads(json.dumps(base))
    aux_changed["published_response"]["data"]["viewer"]["zones"][0]["records"][0]["nested"]["labels"].append("gamma")
    d = migrate_capture(aux_changed, key, fp)
    assert d["phenotype_by_being"][being]["genome"] != a["phenotype_by_being"][being]["genome"], "nested auxiliary values must enter DNA"
    print("PASS · legacy readable provider values collapse into opaque DNA before retirement; query does not")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        self_test()
        return

    secret = os.environ.get("CRAWLERBAIT_ID_KEY", "").strip()
    if not secret:
        raise SystemExit("CRAWLERBAIT_ID_KEY is required for historical phenotype condensation")
    key = C.identity_key(secret)
    fp = C.identity_key_fingerprint(key)

    changed = records = samples = 0
    for path in sorted(CAPTURE_ROOT.glob("*.traffic.json")):
        value = read_json(path)
        if value.get("version") == 5:
            continue
        migrated = migrate_capture(value, key, fp)
        if args.write:
            write_json(path, migrated)
        changed += 1
        public_records = records_from(migrated)
        records += len(public_records)
        samples += sum(int(v.get("samples") or 0) for v in migrated["phenotype_by_being"].values())

    if args.write and CURSOR_PATH.is_file():
        cursor = read_json(CURSOR_PATH)
        old_identity = cursor.get("identity") or {}
        previous_fp = old_identity.get("key_fingerprint") or (old_identity.get("clientIP") or {}).get("key_fingerprint")
        if previous_fp and previous_fp != fp:
            raise RuntimeError("cursor recognition-key fingerprint differs from migration key")
        cursor["never_captured_fields"] = sorted(C.NEVER_CAPTURE_FIELDS)
        cursor["identity"] = {
            "key_fingerprint": fp,
            "scheme": C.IDENTITY_SCHEME,
            "key_epoch": C.IDENTITY_KEY_EPOCH,
            "literal_client_ip_persisted": False,
            "network_pseudonym_persisted": False,
            "exact_user_agent_persisted": False,
            "public_identity": "opaque artwork-local beingId only",
        }
        write_json(CURSOR_PATH, cursor)

    print(json.dumps({
        "migrated_capture_files": changed,
        "functional_records": records,
        "phenotype_samples": samples,
        "query_in_dna": False,
    }, sort_keys=True))


if __name__ == "__main__":
    main()
