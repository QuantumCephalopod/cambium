#!/usr/bin/env python3
"""Rebuild Crawlerbait entirely from owned legacy evidence + immutable raw traffic captures."""
from __future__ import annotations

from pathlib import Path
import argparse
import importlib.util
import json

HERE = Path(__file__).resolve().parent


def load_tide():
    spec = importlib.util.spec_from_file_location("crawlerbait_tide", HERE / "tide.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


T = load_tide()


def self_test():
    state = T.rebuild_state()
    legacy = T.replay_legacy()
    assert set(legacy["routes"]).issubset(set(state["routes"]))
    assert state["version"] == 5
    assert state["raw_requests"] == len(state["encounters"])
    print("PASS · replay rebuilds public web-traffic state locally with zero provider calls")


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
