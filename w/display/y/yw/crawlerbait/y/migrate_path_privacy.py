#!/usr/bin/env python3
"""Migrate current-tree Crawlerbait paths and legacy 404 evidence through the public path membrane."""
from __future__ import annotations

from pathlib import Path
import argparse
import importlib.util
import json
import os
import sys

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))
ROOT = HERE.parent
CAPTURE_ROOT = ROOT / "x" / "captures"
CHECKPOINT_PATH = ROOT / "x" / "checkpoint.json"
CURSOR_PATH = ROOT / "x" / "cursor.json"
RETAINED_ROOT = ROOT / "x" / "retained-bootstrap"
SEAL_PATH = RETAINED_ROOT / "seal.json"

spec = importlib.util.spec_from_file_location("crawlerbait_capture", HERE / "capture.py")
C = importlib.util.module_from_spec(spec)
spec.loader.exec_module(C)

path_spec = importlib.util.spec_from_file_location("crawlerbait_path_privacy", HERE / "path_privacy.py")
P = importlib.util.module_from_spec(path_spec)
path_spec.loader.exec_module(P)


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def traffic_records(value: dict) -> list[dict]:
    zones = (value.get("published_response") or {}).get("data", {}).get("viewer", {}).get("zones", [])
    records = zones[0].get("records") if len(zones) == 1 else None
    if not isinstance(records, list):
        raise RuntimeError("traffic capture has no records")
    return records


def migrate_traffic_capture(value: dict, key: bytes) -> tuple[dict, int]:
    if value.get("version") != 5 or value.get("source") != "cloudflare:httpRequestsAdaptive":
        raise RuntimeError("path migration requires canonical v5 traffic capture")
    transform = (value.get("publication_transform") or {}).get("clientRequestPath") or {}
    already = transform.get("domain") == P.PATH_DOMAIN and transform.get("raw_unoffered_path_persisted") is False

    out = json.loads(json.dumps(value))
    changed = 0
    records = traffic_records(out)
    if not already:
        for record in records:
            old = P.canonical_path(record.get("clientRequestPath"))
            new = P.public_path(key, old)
            if new != old:
                changed += 1
            record["clientRequestPath"] = new
        out.setdefault("historical_path_migration", {
            "migrated_on": "2026-10-02",
            "raw_unoffered_paths_removed": True,
            "offered_public_paths_remain_literal": True,
            "query_in_path_transform": False,
        })

    out.setdefault("publication_transform", {})["clientRequestPath"] = {
        "scheme": "literal offered path else HMAC-SHA256 opaque Bait path",
        "domain": P.PATH_DOMAIN,
        "raw_unoffered_path_persisted": False,
        "offered_public_paths_literal": True,
        "key_epoch": C.IDENTITY_KEY_EPOCH,
    }
    for record in records:
        path = P.canonical_path(record.get("clientRequestPath"))
        if not P.public_path_shape_valid(path):
            raise RuntimeError(f"traffic migration left an unsafe public path: {path!r}")
    return out, changed


def _merge_route(out: dict, raw_path: str, count: int, first, last, materialized, sampled: bool, key: bytes) -> None:
    if count <= 0:
        return
    path = P.public_path(key, raw_path)
    record = out.setdefault(path, {
        "path": path,
        "observed_404": 0,
        "first_observed_window": first,
        "last_observed_window": last,
        "materialized_at": materialized,
        "sampled": False,
    })
    record["observed_404"] += int(count)
    if first:
        cur = record.get("first_observed_window") or first
        if str(first.get("start") or "") < str(cur.get("start") or ""):
            record["first_observed_window"] = first
    if last:
        cur = record.get("last_observed_window") or last
        if str(last.get("end") or "") > str(cur.get("end") or ""):
            record["last_observed_window"] = last
    record["sampled"] = bool(record.get("sampled") or sampled)


def legacy_groups(value: dict) -> list:
    if value.get("version") == 1 and isinstance(value.get("groups"), list):
        return value["groups"]
    zones = (value.get("provider_response") or {}).get("data", {}).get("viewer", {}).get("zones", [])
    if value.get("version") == 2 and len(zones) == 1 and isinstance(zones[0].get("groups"), list):
        return zones[0]["groups"]
    raise RuntimeError("legacy capture has no groups")


def migrate_legacy_checkpoint(key: bytes) -> tuple[dict, int, int, list[Path]]:
    checkpoint = read_json(CHECKPOINT_PATH)
    routes = checkpoint.get("routes")
    if not isinstance(routes, dict):
        raise RuntimeError("legacy checkpoint routes missing")
    before = sum(int(r.get("observed_404") or 0) for r in routes.values())
    out_routes: dict = {}
    for raw_path, route in routes.items():
        _merge_route(
            out_routes,
            raw_path,
            int(route.get("observed_404") or 0),
            route.get("first_observed_window"),
            route.get("last_observed_window"),
            route.get("materialized_at"),
            bool(route.get("sampled")),
            key,
        )

    expected = checkpoint.get("last_complete_end")
    legacy_files = sorted(CAPTURE_ROOT.glob("*.capture.json"))
    for path in legacy_files:
        value = read_json(path)
        window = value.get("window") or {}
        if window.get("start") != expected:
            raise RuntimeError(f"legacy capture gap before {path.name}")
        for group in legacy_groups(value):
            dims = group.get("dimensions") or {}
            count = int(round(float(group.get("count") or 0)))
            interval = float((group.get("avg") or {}).get("sampleInterval") or 1)
            _merge_route(
                out_routes,
                P.canonical_path(dims.get("clientRequestPath")),
                count,
                {"start": window.get("start"), "end": window.get("end")},
                {"start": window.get("start"), "end": window.get("end")},
                window.get("end"),
                interval > 1.000001,
                key,
            )
            before += max(0, count)
        expected = window.get("end")

    after = sum(int(r.get("observed_404") or 0) for r in out_routes.values())
    if before != after:
        raise RuntimeError(f"legacy 404 count changed during privacy migration: {before} != {after}")

    cursor = read_json(CURSOR_PATH)
    target_end = cursor.get("legacy_404_last_capture_end")
    if target_end and expected != target_end:
        raise RuntimeError(f"legacy privacy migration ended at {expected}, cursor expects {target_end}")

    migrated = {
        "version": 4,
        "last_complete_end": expected,
        "applied_capture_end": expected,
        "routes": out_routes,
        "privacy_migration": {
            "migrated_on": "2026-10-02",
            "path_domain": P.PATH_DOMAIN,
            "raw_unoffered_paths_removed": True,
            "exact_user_agents_removed": True,
            "signature_dimension_retired": True,
            "legacy_capture_files_coalesced": len(legacy_files),
        },
    }
    return migrated, before, after, legacy_files


def retire_retained_bootstrap() -> tuple[int, dict | None]:
    if not RETAINED_ROOT.is_dir():
        return 0, None
    raw_files = sorted(RETAINED_ROOT.glob("*.raw.json"))
    seal = read_json(SEAL_PATH) if SEAL_PATH.is_file() else {}
    retired = len(raw_files)
    for path in raw_files:
        path.unlink()
    seal = {
        "version": 2,
        "sealed": True,
        "captured_at": seal.get("captured_at"),
        "retained_window": seal.get("retained_window"),
        "provider_limits": seal.get("provider_limits"),
        "returned_groups": seal.get("returned_groups"),
        "leaf_windows": seal.get("leaf_windows"),
        "saturated_minimum_windows": seal.get("saturated_minimum_windows"),
        "raw_carriers_retired": True,
        "retired_raw_file_count": retired or int(seal.get("retired_raw_file_count") or 0),
        "current_evidence": "../checkpoint.json",
        "law": "Legacy readable raw bootstrap carriers were coalesced into the privacy-migrated aggregate checkpoint and retired from the current tree.",
    }
    write_json(SEAL_PATH, seal)
    return retired, seal


def self_test():
    key = C.identity_key("01" * 32)
    exact_asset = next(iter(sorted(p for p in P.offered_public_paths() if p.startswith("/assets/"))))
    base = {
        "version": 5,
        "source": "cloudflare:httpRequestsAdaptive",
        "publication_transform": {},
        "published_response": {"data": {"viewer": {"zones": [{"records": [
            {"datetime": "2026-10-01T00:00:00Z", "beingId": "b" * 24, "clientRequestPath": "/reset/alice@example.org/token", "clientRequestHTTPMethodName": "GET", "edgeResponseStatus": 404},
            {"datetime": "2026-10-01T00:00:01Z", "beingId": "b" * 24, "clientRequestPath": exact_asset, "clientRequestHTTPMethodName": "GET", "edgeResponseStatus": 200},
            {"datetime": "2026-10-01T00:00:02Z", "beingId": "b" * 24, "clientRequestPath": "/assets/not-offered-private-probe", "clientRequestHTTPMethodName": "GET", "edgeResponseStatus": 404},
            {"datetime": "2026-10-01T00:00:03Z", "beingId": "b" * 24, "clientRequestPath": "/__live/private/secret", "clientRequestHTTPMethodName": "POST", "edgeResponseStatus": 200},
        ]}]}}},
    }
    migrated, changed = migrate_traffic_capture(base, key)
    rows = traffic_records(migrated)
    assert changed == 3
    assert rows[0]["clientRequestPath"].startswith("/~/")
    assert rows[1]["clientRequestPath"] == exact_asset
    assert rows[2]["clientRequestPath"].startswith("/~/")
    assert rows[3]["clientRequestPath"].startswith("/__live/~/")
    assert "alice" not in json.dumps(migrated)
    again, changed_again = migrate_traffic_capture(migrated, key)
    assert changed_again == 0 and again == migrated
    P.self_test()
    print("PASS · current-tree raw paths cross the keyed Bait membrane before persistence")


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
        raise SystemExit("CRAWLERBAIT_ID_KEY is required for path privacy migration")
    key = C.identity_key(secret)
    fp = C.identity_key_fingerprint(key)

    changed_files = changed_paths = records = 0
    for path in sorted(CAPTURE_ROOT.glob("*.traffic.json")):
        value = read_json(path)
        migrated, changed = migrate_traffic_capture(value, key)
        records += len(traffic_records(migrated))
        if migrated != value:
            changed_files += 1
            changed_paths += changed
            if args.write:
                write_json(path, migrated)

    checkpoint, legacy_before, legacy_after, legacy_files = migrate_legacy_checkpoint(key)
    checkpoint_changed = checkpoint != read_json(CHECKPOINT_PATH)
    if args.write and checkpoint_changed:
        write_json(CHECKPOINT_PATH, checkpoint)
        for path in legacy_files:
            path.unlink()

    retired_bootstrap = 0
    if args.write:
        retired_bootstrap, _seal = retire_retained_bootstrap()

    cursor = read_json(CURSOR_PATH)
    cursor_changed = (cursor.get("path_privacy") or {}).get("domain") != P.PATH_DOMAIN
    cursor["path_privacy"] = {
        "scheme": "offered-literal / otherwise keyed opaque Bait path",
        "domain": P.PATH_DOMAIN,
        "key_epoch": C.IDENTITY_KEY_EPOCH,
        "key_fingerprint": fp,
        "raw_unoffered_path_persisted": False,
    }
    if args.write and cursor_changed:
        write_json(CURSOR_PATH, cursor)

    print(json.dumps({
        "traffic_capture_files_changed": changed_files,
        "traffic_records": records,
        "raw_paths_replaced": changed_paths,
        "legacy_404_before": legacy_before,
        "legacy_404_after": legacy_after,
        "legacy_capture_files_coalesced": len(legacy_files),
        "retained_bootstrap_raw_files_retired": retired_bootstrap,
        "path_domain": P.PATH_DOMAIN,
    }, sort_keys=True))


if __name__ == "__main__":
    main()
