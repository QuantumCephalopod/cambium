#!/usr/bin/env python3
"""Build/witness the Display membrane plus identity-owned site-holon static public files."""
from pathlib import Path
import argparse
import importlib.util

ROOT = Path(__file__).resolve().parent.parent
BUILD_PATH = ROOT / "y" / "build.py"
spec = importlib.util.spec_from_file_location("display_build", BUILD_PATH)
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)

RESERVED_FILES = {"index.html", ".nojekyll", "CNAME"}
RESERVED_PREFIXES = ("assets/",)


def site_public_files(sites=None):
    """Return root-relative public files carried beside each holon's declared projection."""
    out = {}
    owners = {}
    for site in (build.discover_sites() if sites is None else sites):
        # Public secretion is body-local and follows the site's projection membrane.
        # A root projection therefore looks beside itself; a differentiated holon may
        # carry projection + public surface together in one local child without Display
        # learning the child's semantic name or gene.
        projection_parent = Path(site["projection"]).parent
        root = site["site_dir"] / projection_parent / "public"
        if not root.exists() and not root.is_symlink():
            continue
        if not root.is_dir() or root.is_symlink():
            raise ValueError(f'{root.relative_to(ROOT)}/public must be a real directory')
        for source in sorted(root.rglob("*")):
            if source.is_symlink():
                raise ValueError(f'{source.relative_to(ROOT)}: symlink is not a lawful public carrier')
            if source.is_dir():
                continue
            resolved = source.resolve()
            try:
                resolved.relative_to(root.resolve())
            except ValueError as exc:
                raise ValueError(f'{source.relative_to(ROOT)} escaped site public surface') from exc
            rel = source.relative_to(root).as_posix()
            if rel in RESERVED_FILES or any(rel == p[:-1] or rel.startswith(p) for p in RESERVED_PREFIXES):
                raise ValueError(f'{site["id"]}: public path {rel!r} is reserved by the Display artifact')
            if rel in out:
                raise ValueError(f'public path collision: {rel!r} claimed by {owners[rel]} and {site["id"]}')
            out[rel] = source.read_bytes()
            owners[rel] = site["id"]
    return out


def artifact_files():
    sites = build.discover_sites()
    files = dict(build.artifact_files(sites))
    for rel, data in site_public_files(sites).items():
        if rel in files:
            raise ValueError(f'public path collision with base Display artifact: {rel}')
        files[rel] = data
    return files


def write_artifact(target: Path):
    return build.artifact.replace(target, ROOT, artifact_files)


def verify_artifact(target: Path):
    target = target.resolve()
    expected = artifact_files()
    if not target.is_dir():
        raise ValueError(f"missing artifact directory: {target}")
    actual = {p.relative_to(target).as_posix(): p.read_bytes() for p in target.rglob("*") if p.is_file()}
    if set(actual) != set(expected):
        raise ValueError(f"artifact file-set mismatch: {sorted(set(actual) ^ set(expected))}")
    for rel, data in expected.items():
        if actual[rel] != data:
            raise ValueError(f"stale artifact byte content: {rel}")
    return expected


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--artifact", type=Path, default=ROOT / "_site", help="disposable _site directory or an explicit directory outside the repository")
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()
    target = args.artifact if args.artifact.is_absolute() else ROOT / args.artifact
    if args.check:
        files = verify_artifact(target)
        print(f"display + site public surfaces exactly match {len(files)} files")
    else:
        files = write_artifact(target)
        print(f"built {target} ({sum(map(len, files.values()))} bytes across {len(files)} files)")


if __name__ == "__main__":
    main()
