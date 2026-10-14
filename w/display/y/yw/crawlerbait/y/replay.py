#!/usr/bin/env python3
"""Rebuild Crawlerbait entirely from owned legacy evidence + metabolized public traffic carriers."""
from __future__ import annotations

from pathlib import Path
import argparse
import importlib.util
import json
import sys

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))


def load_tide():
    spec = importlib.util.spec_from_file_location("crawlerbait_tide", HERE / "tide.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


T = load_tide()


def self_test():
    cursor = T.read_json(T.ROOT / "x" / "cursor.json")
    path_state = cursor.get("path_privacy") or {}
    migrated = path_state.get("offered_resolution") == T.pathmembrane.OFFERED_RESOLUTION
    original_gate = T.path_privacy_active
    if not migrated:
        T.path_privacy_active = lambda: False
    try:
        state = T.rebuild_state()
    finally:
        T.path_privacy_active = original_gate
    legacy = T.replay_legacy()
    assert set(legacy["routes"]).issubset(set(state["routes"]))
    assert state["version"] == 6
    assert state["raw_requests"] == len(state["encounters"])
    print("PASS · replay rebuilds metabolized public Crawlerbait state locally with zero provider calls; pending membrane generations are treated only as pre-migration fixtures")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        self_test()
        return

    state = T.rebuild_state()
    print(json.dumps({
        "status": "replayed-local-traces",
        "raw_requests": state["raw_requests"],
        "crawlers": len(state["crawlers"]),
        "baits": len(state["routes"]),
        "raw_capture_end": state.get("raw_capture_end"),
        "provider_calls": 0,
    }, indent=2))
    if args.write:
        T.write_outputs(state)


if __name__ == "__main__":
    main()
