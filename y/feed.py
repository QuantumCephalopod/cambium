#!/usr/bin/env python3
"""Project organism-local _feed/current.json from newly durable HOME objects.

This is mechanical substrate physiology. It does not decide whether HOME is valid,
what an organism means, what should be admitted, or what should be published.

The invariant relation is:

    durable HOME -> asynchronous local _feed refresh

Git supplies the event carrier; organism semantics remain in shared/local RITUALS.
"""
from __future__ import annotations

from argparse import ArgumentParser
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
import subprocess

from build import load_yaml, validate_index, validate_cambium

ROOT = Path(__file__).resolve().parent.parent


def git(*args: str) -> str:
    p = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return p.stdout


def changed_home_paths(before: str, after: str) -> list[Path]:
    before = (before or "").strip()
    after = (after or "HEAD").strip() or "HEAD"

    if not before or set(before) == {"0"}:
        out = git("show", "--format=", "--name-status", "--diff-filter=A", after)
    else:
        out = git("diff", "--name-status", "--diff-filter=A", before, after)

    found: list[Path] = []
    for raw in out.splitlines():
        if not raw.strip():
            continue
        fields = raw.split("\t")
        path = Path(fields[-1])
        parts = path.parts
        if "_root" not in parts or path.suffix != ".json":
            continue
        i = parts.index("_root")
        if i != len(parts) - 2:
            continue
        found.append(path)
    return sorted(set(found))


def organism_root(home_path: Path) -> Path:
    parts = home_path.parts
    i = parts.index("_root")
    return ROOT.joinpath(*parts[:i]) if i else ROOT


def local(path: Path, root: Path) -> str:
    rel = path.relative_to(root)
    return rel.as_posix()


def read_root_event(path: Path) -> dict:
    data = json.loads((ROOT / path).read_text(encoding="utf-8"))
    if path.stem != data.get("event_id"):
        raise ValueError(f"{path}: filename must equal event_id")
    return data


def read_home(path: Path) -> dict | None:
    data = read_root_event(path)
    if data.get("kind") != "HOME":
        return None
    required = {
        "event_id", "home_at_utc", "organism", "entrypoint", "outcome",
        "changed_scope", "context", "kind", "delivery_state"
    }
    missing = required - set(data)
    if missing:
        raise ValueError(f"{path}: HOME missing {sorted(missing)}")
    return data


def phenotype(root: Path):
    p = root / "INDEX.yaml"
    if not p.is_file():
        return None
    data = load_yaml(p)
    if data:
        validate_index(data)
    return data


def constitution(root: Path):
    p = root / "_cambium.yaml"
    if not p.is_file():
        return None
    data = load_yaml(p)
    validate_cambium(data, local(p, root))
    return data


def rituals(root: Path) -> list[dict]:
    r = root / "RITUALS"
    if not r.is_dir():
        raise ValueError(f"{local(root, ROOT) or 'root'} has no RITUALS receptor")
    out = []
    for p in sorted(r.glob("*/RITUAL.md")):
        text = p.read_text(encoding="utf-8")
        out.append({
            "path": local(p, root),
            "sha256": sha256(text.encode("utf-8")).hexdigest(),
        })
    if not out:
        raise ValueError(f"{local(root, ROOT) or 'root'} RITUALS has no local RITUAL.md")
    return out


def direct_names(path: Path) -> list[str]:
    if not path.is_dir():
        raise ValueError(f"missing shell role {path.relative_to(ROOT)}")
    return sorted(p.name for p in path.iterdir() if p.name != ".gitkeep")


def projection(root: Path, home: dict, source_revision: str) -> dict:
    return {
        "owner": home["organism"],
        "reflected_home_event": home["event_id"],
        "observed_at_utc": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "boundary": "LOCAL_BODY_ONLY",
        "phenotype": phenotype(root),
        "constitution": constitution(root),
        "rituals": rituals(root),
        "shell": {
            "stomach_direct": direct_names(root / "_stomach"),
            "waste_direct_count": len(direct_names(root / "_waste")),
            "root_history": "_root",
            "feed": "_feed/current.json",
        },
        "home": {
            "outcome": home["outcome"],
            "changed_scope": home["changed_scope"],
            "delivery_state": home["delivery_state"],
        },
        "substrate_witness": {
            "kind": "git",
            "source_revision": source_revision,
        },
    }


def write_feed(root: Path, home: dict, source_revision: str) -> Path | None:
    out = root / "_feed" / "current.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.is_file():
        existing = json.loads(out.read_text(encoding="utf-8"))
        if existing.get("reflected_home_event") == home["event_id"]:
            print(f"{out.relative_to(ROOT)} already reflects {home['event_id']}")
            return None
    body = projection(root, home, source_revision)
    out.write_text(
        json.dumps(body, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return out


def main() -> None:
    ap = ArgumentParser()
    ap.add_argument("--before", default="")
    ap.add_argument("--after", default="HEAD")
    args = ap.parse_args()

    root_events = changed_home_paths(args.before, args.after)
    if not root_events:
        print("no new durable HOME pressure; feeds unchanged")
        return

    grouped: dict[Path, list[tuple[Path, dict]]] = {}
    for path in root_events:
        home = read_home(path)
        if home is None:
            print(f"{path}: skipped non-HOME root ring")
            continue
        root = organism_root(path)
        grouped.setdefault(root, []).append((path, home))

    if not grouped:
        print("no new durable HOME pressure; feeds unchanged")
        return

    changed = []
    for root, items in grouped.items():
        items.sort(key=lambda x: (x[1]["home_at_utc"], x[1]["event_id"]))
        path, home = items[-1]
        out = write_feed(root, home, args.after)
        if out is None:
            continue
        changed.append(out.relative_to(ROOT).as_posix())
        print(f"{path}: projected {out.relative_to(ROOT)}")

    if changed:
        print("feed projections:", ", ".join(changed))
    else:
        print("feeds already current")


if __name__ == "__main__":
    main()
