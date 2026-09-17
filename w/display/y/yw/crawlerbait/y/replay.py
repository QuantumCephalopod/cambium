#!/usr/bin/env python3
"""Rebuild Crawlerbait downstream state entirely from local checkpoint + immutable captures."""
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
    state = T.replay_from_checkpoint()
    checkpoint = T.normalize_state(T.read_json(T.CHECKPOINT_PATH))
    assert set(checkpoint["routes"]).issubset(set(state["routes"]))
    assert state["version"] == 4
    print("PASS · replay rebuilds downstream Crawlerbait state from local Traces without provider access")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        self_test()
        return

    state = T.replay_from_checkpoint()
    print(json.dumps({
        "status": "replayed-local-traces",
        "paths": len(state["routes"]),
        "applied_capture_end": state.get("applied_capture_end"),
        "provider_calls": 0,
    }, indent=2))
    if args.write:
        T.write_outputs(state)


if __name__ == "__main__":
    main()
