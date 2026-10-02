#!/usr/bin/env python3
"""One-time current-tree migration to the Crawlerbait-owned path membrane."""
from __future__ import annotations

from pathlib import Path
import argparse
import importlib.util
import json
import os

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
CAPTURE_ROOT = ROOT / "x" / "captures"
CHECKPOINT_PATH = ROOT / "x" / "checkpoint.json"
CURSOR_PATH = ROOT / "x" / "cursor.json"
MANIFEST_PATH = CAPTURE_ROOT / "manifest.json"

spec = importlib.util.spec_from_file_location("crawlerbait_capture", HERE / "capture.py")
C = importlib.util.module_from_spec(spec)
spec.loader.exec_module(C)

membrane_spec = importlib.util.spec_from_file_location("crawlerbait_path_membrane", HERE / "path_membrane.py")
P = importlib.util.module_from_spec(membrane_spec)
membrane_spec.loader.exec_module(P)


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def records(value: dict) -> list[dict]:
    zones = (value.get("published_response") or {}).get("data", {}).get("viewer", {}).get("zones", [])
    rows = zones[0].get("records") if len(zones) == 1 else None
    if not isinstance(rows, list):
        raise RuntimeError("traffic capture has no canonical records")
    return rows


def migrate_capture(value: dict, key: bytes) -> tuple[dict, int]:
    out = json.loads(json.dumps(value))
    transform = (out.get("publication_transform") or {}).get("clientRequestPath") or {}
    already = (
        transform.get("domain") == P.PATH_DOMAIN
        and transform.get("raw_unoffered_path_persisted") is False
        and transform.get("offered_resolution") == P.OFFERED_RESOLUTION
    )
    if already:
        return out, 0

    prior_public = (
        transform.get("domain") == P.PATH_DOMAIN
        and transform.get("raw_unoffered_path_persisted") is False
    )
    changed = 0
    for row in records(out):
        old = P.canonical_path(row.get("clientRequestPath"))
        if prior_public and P.opaque_path_shape_valid(old):
            new = old
        else:
            new = P.public_path(key, old)
        changed += int(new != old)
        row["clientRequestPath"] = new
        if not P.public_path_shape_valid(new):
            raise RuntimeError(f"unsafe migrated path: {new!r}")

    out.setdefault("publication_transform", {})["clientRequestPath"] = {
        "scheme": "Crawlerbait-owned literal path else HMAC-SHA256 opaque Bait path",
        "domain": P.PATH_DOMAIN,
        "raw_unoffered_path_persisted": False,
        "offered_public_paths_literal": True,
        "offered_resolution": P.OFFERED_RESOLUTION,
        "key_epoch": C.IDENTITY_KEY_EPOCH,
    }
    out["organism_boundary_migration"] = {
        "migrated_on": "2026-10-02",
        "offered_resolution": P.OFFERED_RESOLUTION,
        "foreign_site_holon_paths_literal": False,
        "already_opaque_identity_preserved": True,
    }
    return out, changed


def migrate_checkpoint(value: dict, key: bytes) -> tuple[dict, int]:
    out = json.loads(json.dumps(value))
    routes = out.get("routes") or {}
    privacy = out.get("privacy_migration") or {}
    prior_public = (
        privacy.get("path_domain") == P.PATH_DOMAIN
        and privacy.get("raw_unoffered_paths_removed") is True
    )
    changed = 0
    rebuilt = {}
    for old, route in routes.items():
        old = P.canonical_path(old)
        new = old if (prior_public and P.opaque_path_shape_valid(old)) else P.public_path(key, old)
        changed += int(new != old)
        row = json.loads(json.dumps(route))
        row["path"] = new
        if new in rebuilt:
            rebuilt[new]["observed_404"] = int(rebuilt[new].get("observed_404") or 0) + int(row.get("observed_404") or 0)
        else:
            rebuilt[new] = row
    out["routes"] = rebuilt
    out.setdefault("privacy_migration", {}).update({
        "path_domain": P.PATH_DOMAIN,
        "offered_resolution": P.OFFERED_RESOLUTION,
        "raw_unoffered_paths_removed": True,
        "exact_user_agents_removed": True,
    })
    return out, changed


def self_test():
    key = C.identity_key("01" * 32)
    opaque = "/~/" + "a" * 24
    sample = {
        "version": 5,
        "source": "cloudflare:httpRequestsAdaptive",
        "publication_transform": {
            "clientRequestPath": {
                "domain": P.PATH_DOMAIN,
                "raw_unoffered_path_persisted": False,
                "offered_resolution": "exact-source-owned-public-artifact-v1",
            }
        },
        "published_response": {"data": {"viewer": {"zones": [{"records": [
            {"clientRequestPath": opaque},
            {"clientRequestPath": "/assets/old-bundle/site-organism-papers.js"},
            {"clientRequestPath": "/crawlerbait/state.json"},
        ]}]}}},
    }
    migrated, changed = migrate_capture(sample, key)
    rows = records(migrated)
    assert rows[0]["clientRequestPath"] == opaque
    assert rows[1]["clientRequestPath"].startswith("/~/")
    assert rows[2]["clientRequestPath"] == "/crawlerbait/state.json"
    assert changed == 1
    again, changed_again = migrate_capture(migrated, key)
    assert changed_again == 0 and again == migrated
    P.self_test()
    print("PASS · foreign host literals become opaque while existing opaque Baits keep identity")


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
        raise SystemExit("CRAWLERBAIT_ID_KEY is required")
    key = C.identity_key(secret)

    files_changed = paths_changed = total_records = 0
    for path in sorted(CAPTURE_ROOT.glob("*.traffic.json")):
        before = read_json(path)
        after, changed = migrate_capture(before, key)
        total_records += len(records(after))
        paths_changed += changed
        if after != before:
            files_changed += 1
            if args.write:
                write_json(path, after)

    checkpoint_before = read_json(CHECKPOINT_PATH)
    checkpoint_after, checkpoint_paths = migrate_checkpoint(checkpoint_before, key)
    if args.write and checkpoint_after != checkpoint_before:
        write_json(CHECKPOINT_PATH, checkpoint_after)

    cursor = read_json(CURSOR_PATH)
    cursor.setdefault("path_privacy", {}).update({
        "scheme": "Crawlerbait-owned literal / otherwise keyed opaque Bait path",
        "domain": P.PATH_DOMAIN,
        "key_epoch": C.IDENTITY_KEY_EPOCH,
        "key_fingerprint": C.identity_key_fingerprint(key),
        "raw_unoffered_path_persisted": False,
        "offered_resolution": P.OFFERED_RESOLUTION,
    })
    if args.write:
        write_json(CURSOR_PATH, cursor)

    if MANIFEST_PATH.is_file():
        manifest = read_json(MANIFEST_PATH)
        manifest.setdefault("path_law", {}).update({
            "domain": P.PATH_DOMAIN,
            "offered_resolution": P.OFFERED_RESOLUTION,
            "foreign_site_holon_paths_literal": False,
            "already_opaque_identity_preserved": True,
        })
        if args.write:
            write_json(MANIFEST_PATH, manifest)

    print(json.dumps({
        "traffic_capture_files_changed": files_changed,
        "traffic_records": total_records,
        "traffic_paths_changed": paths_changed,
        "checkpoint_paths_changed": checkpoint_paths,
        "offered_resolution": P.OFFERED_RESOLUTION,
    }, sort_keys=True))


if __name__ == "__main__":
    main()
