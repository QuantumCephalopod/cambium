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

def metabolite_compression(text):
    hits = re.findall(r"(?:^|\n)Compression:\s*(.+?)(?=\n\n|\Z)", str(text or ""), re.S)
    return " ".join(hits[-1].split()) if hits else ""

def metabolite_earning(text):
    hit = re.search(r"Minimal(?: source)? body:\s*[^\n]*?:([wxyz]{1,4})\b", str(text or ""))
    return hit.group(1) if hit else ""

def build_body(identity, inquiry):
    body = {
        "id": identity["id"],
        "locus": identity["locus"],
        "title": identity["title"],
        "parents": identity.get("parents", []),
        "state": str(inquiry.get("state") or "PARTIAL").upper(),
        "boundary": str(inquiry.get("boundary") or ""),
        "edges": [],
        "faces": [],
        "volume": None,
        "metabolites": [],
        "gaps": []
    }
    vertices = []
    for row in inquiry.get("sections") or []:
        if not isinstance(row, list) or len(row) < 4:
            continue
        kind, key, title, text = [str(x or "") for x in row[:4]]
        item = {"id": key, "title": title, "text": text}
        if kind == "vertex":
            vertices.append(item)
        elif kind == "edge":
            body["edges"].append(item)
        elif kind == "face":
            body["faces"].append(item)
        elif kind == "volume":
            body["volume"] = item
        elif kind == "metabolite":
            earning = metabolite_earning(text)
            compression = metabolite_compression(text)
            if earning:
                item["earning"] = earning
            if compression:
                item["compression"] = compression
            body["metabolites"].append(item)
        elif kind == "projection-gap":
            body["gaps"].append(item)
        elif kind == "boundary" and not body["boundary"]:
            body["boundary"] = text
    if vertices:
        body["vertices"] = vertices
    return body

def load_previous(path):
    if not path:
        return {}
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except Exception:
        return {}

def materialize(state, previous):
    units = verify_state(state)
    root = (units.get("root") or {}).get("value")
    if not isinstance(root, dict):
        raise ValueError("root unit missing")
    phenotype = parse_phenotype(root.get("phenotype"))
    groups = {gene: [] for gene in GENES}
    holons = {gene: [] for gene in GENES}
    identities = {}

    for unit_key, unit in sorted(units.items()):
        if unit_key == "root" or unit_key.startswith("inquiry:"):
            continue
        value = unit["value"]
        if not isinstance(value, dict):
            raise ValueError("identity unit is not an object: " + unit_key)
        if unit_key.startswith("source:"):
            organism_id, kind = unit_key[7:], "source"
        elif unit_key.startswith("holon:"):
            organism_id, kind = unit_key[6:], "holon"
        else:
            raise ValueError("unknown Papers unit key: " + unit_key)
        locus = str(value.get("locus") or "")
        if locus not in GENES:
            raise ValueError("invalid outward locus for " + organism_id)
        parents = list(value.get("parents") or []) if kind == "holon" else []
        if kind == "holon" and parents and len(parents) != 4:
            raise ValueError("Holon parent relation is not fourfold: " + organism_id)
        identity = {
            "id": organism_id,
            "kind": kind,
            "rank": str(value.get("rank") or ("S" if kind == "source" else "")),
            "locus": locus,
            "title": str(value.get("title") or organism_id),
            "parents": parents
        }
        identities[organism_id] = identity
        target = groups if kind == "source" else holons
        target[locus].append({"id": organism_id, "title": identity["title"]})

    old_projection = (((previous or {}).get("snapshot") or {}).get("projection") or {})
    old_source_meta = old_projection.get("source_meta")
    if not isinstance(old_source_meta, dict):
        old_source_meta = {}

    source_meta, holon_meta, bodies, rank_counts = {}, {}, {}, {}

    for organism_id, identity in identities.items():
        inquiry = (units.get("inquiry:" + organism_id) or {}).get("value")
        if not isinstance(inquiry, dict):
            inquiry = {
                "state": "PARTIAL",
                "boundary": "",
                "sections": [[
                    "projection-gap",
                    "pending",
                    "INQUIRY PROJECTION PENDING",
                    "Current organism identity is public, but its bounded Inquiry body has not yet been projected."
                ]]
            }
        body = build_body(identity, inquiry)
        bodies[organism_id] = body

        if identity["kind"] == "source":
            prior = old_source_meta.get(organism_id)
            if isinstance(prior, list) and len(prior) >= 3:
                source_meta[organism_id] = prior[:3]
            else:
                source_meta[organism_id] = [
                    "",
                    "tetrahedralized · 4V/6E/4F/1T · " + str(len(body["metabolites"])) + " derived invariants",
                    []
                ]
        else:
            rank = identity["rank"] or "nH"
            rank_counts[rank] = rank_counts.get(rank, 0) + 1
            wisdom = ""
            if isinstance(body.get("volume"), dict) and body["volume"].get("text"):
                wisdom = "1T — " + body["volume"]["text"]
            metabolite_lines = []
            for metabolite in body["metabolites"]:
                label = metabolite.get("title") or metabolite.get("id") or "metabolite"
                payload = metabolite.get("compression") or metabolite.get("text") or ""
                metabolite_lines.append(label + " — " + payload)
            if metabolite_lines:
                wisdom += ("\n\n" if wisdom else "") + "\n\n".join(metabolite_lines)
            holon_meta[organism_id] = [
                identity["parents"],
                "4V/6E/4F/1T · " + str(len(body["metabolites"])) + " surviving metabolites",
                "UNDERIVED",
                wisdom
            ]

    source_count = sum(len(groups[gene]) for gene in GENES)
    holon_count = sum(len(holons[gene]) for gene in GENES)
    if isinstance(root.get("source_count"), int) and root["source_count"] != source_count:
        raise ValueError("source count disagrees with root unit")
    if isinstance(root.get("holon_count"), int) and root["holon_count"] != holon_count:
        raise ValueError("holon count disagrees with root unit")

    event = str((state.get("last_event") or {}).get("event_id") or state["public_revision"])
    observed = str(state.get("materialized_at") or "")
    projection = {
        "source": "papers/_feed",
        "event_id": event,
        "observed_at_utc": observed,
        "boundary": "public outer-body projection only; private carriers and nested-organ interiors remain outside the site membrane",
        "phenotype": phenotype,
        "population": {
            "registry_sources": source_count,
            "boundary_sources": source_count,
            "holons": holon_count,
            "wounded_sources": 0,
            "ranks": rank_counts
        },
        "groups": groups,
        "holons": holons,
        "source_meta": source_meta,
        "holon_meta": holon_meta
    }
    return {
        "version": 2,
        "event_id": event,
        "site_id": "organism:papers",
        "kind": "HOME",
        "public_revision": state["public_revision"],
        "snapshot": {
            "schema": "papers-public-shadow.v2",
            "source": "papers/_feed",
            "inquiry_home_event": event,
            "projection_base_event": event,
            "boundary": "same-origin static public materialization of the accepted Papers public-unit state",
            "public_revision": state["public_revision"],
            "projection": projection,
            "inquiry": {"bodies": bodies}
        }
    }

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", type=Path)
    ap.add_argument("--output", type=Path)
    ap.add_argument("--previous", type=Path)
    args = ap.parse_args()
    if not args.input or not args.output:
        ap.error("--input and --output are required")
    state = json.loads(args.input.read_text(encoding="utf-8"))
    previous = load_previous(args.previous or args.output)
    result = materialize(state, previous)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8"
    )
    print(result["public_revision"])

if __name__ == "__main__":
    main()
