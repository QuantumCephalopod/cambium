#!/usr/bin/env python3
"""Pure Papers public-state -> same-origin shadow materialization."""
from pathlib import Path
import argparse
import hashlib
import json
import re

GENES = ("w", "x", "z", "y")

def canonical_strings(value):
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if isinstance(value, list):
        return "[" + ",".join(canonical_strings(x) for x in value) + "]"
    raise ValueError("revision ledger supports only strings and arrays")

def ledger_revision(units):
    rows = [[key, units[key]["revision"]] for key in sorted(units)]
    raw = canonical_strings(rows).encode("utf-8")
    return "sha256:" + hashlib.sha256(raw).hexdigest()

def verify_state(state):
    if state.get("version") != 2 or state.get("site_id") != "organism:papers":
        raise ValueError("not a Papers v2 state")
    units = state.get("units")
    if not isinstance(units, dict):
        raise ValueError("missing unit map")
    for key, unit in units.items():
        if not isinstance(unit, dict) or not isinstance(unit.get("revision"), str) or "value" not in unit:
            raise ValueError("malformed unit: " + key)
    if ledger_revision(units) != state.get("public_revision"):
        raise ValueError("public revision does not match unit ledger")
    return units

def parse_phenotype(text):
    out, gene = {}, None
    for raw in str(text or "").replace("\ufeff", "").splitlines():
        line = raw.strip()
        if re.fullmatch(r"[wxzy]:", line):
            gene = line[0]
            continue
        hit = re.fullmatch(r"noun:\s*(.+)", line)
        if hit and gene:
            out[gene] = hit.group(1).strip().strip("'\"")
            gene = None
    if set(out) != set(GENES):
        raise ValueError("incomplete Papers phenotype")
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", type=Path)
    ap.add_argument("--output", type=Path)
    args = ap.parse_args()
    if not args.input or not args.output:
        ap.error("--input and --output are required")
    state = json.loads(args.input.read_text(encoding="utf-8"))
    units = verify_state(state)
    root = (units.get("root") or {}).get("value") or {}
    result = {
        "version": 2,
        "site_id": "organism:papers",
        "public_revision": state["public_revision"],
        "phenotype": parse_phenotype(root.get("phenotype"))
    }
    args.output.write_text(json.dumps(result, ensure_ascii=False) + "\n", encoding="utf-8")

if __name__ == "__main__":
    main()
