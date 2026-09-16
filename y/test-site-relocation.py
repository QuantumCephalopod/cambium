#!/usr/bin/env python3
"""Prove that moving one entire site-holon body remounts it without internal edits."""
from pathlib import Path
from hashlib import sha256
import importlib.util
import shutil
import tempfile

ROOT = Path(__file__).resolve().parent.parent
BUILD_PATH = ROOT / 'y' / 'build.py'
spec = importlib.util.spec_from_file_location('display_build', BUILD_PATH)
build = importlib.util.module_from_spec(spec); spec.loader.exec_module(build)


def digest_tree(root: Path):
    out = {}
    for p in sorted(x for x in root.rglob('*') if x.is_file()):
        out[p.relative_to(root).as_posix()] = sha256(p.read_bytes()).hexdigest()
    return out


def site_by_id(sites, identity):
    return next(s for s in sites if s['id'] == identity)


with tempfile.TemporaryDirectory(prefix='display-relocation-') as td:
    temp_root = Path(td)
    temp_display = temp_root / 'display'
    shutil.copytree(build.DISPLAY, temp_display)

    old_display, old_site_root = build.DISPLAY, build.SITE_ROOT
    try:
        build.DISPLAY = temp_display
        build.SITE_ROOT = temp_display / 'y'
        before = build.discover_sites()
        papers_before = site_by_id(before, 'organism:papers')
        body_before = digest_tree(papers_before['site_dir'])
        identity_before = {
            'id': papers_before['id'], 'title': papers_before['title'],
            'local_scope': papers_before['local_scope'], 'shader': papers_before['shader'],
            'manifestation': papers_before['manifestation'],
        }
        assert papers_before['address'] == 'y'

        src = temp_display / 'y' / 'yy' / 'papers'
        dst_parent = temp_display / 'y' / 'yx'
        dst_parent.mkdir()
        shutil.move(str(src), str(dst_parent / 'papers'))
        (temp_display / 'y' / 'yy').rmdir()

        after = build.discover_sites()
        papers_after = site_by_id(after, 'organism:papers')
        body_after = digest_tree(papers_after['site_dir'])
        identity_after = {
            'id': papers_after['id'], 'title': papers_after['title'],
            'local_scope': papers_after['local_scope'], 'shader': papers_after['shader'],
            'manifestation': papers_after['manifestation'],
        }
        assert papers_after['address'] == 'x'
        assert body_after == body_before, 'relocation mutated Papers body bytes'
        assert identity_after == identity_before, 'relocation mutated Papers identity contract'

        registry = build.site_mounts()
        mount = next(m for m in registry['mounts'] if m['interlocutor'] == 'organism:papers')
        assert mount == {'interlocutor':'organism:papers','scope':'main','address':'x'}
    finally:
        build.DISPLAY, build.SITE_ROOT = old_display, old_site_root

print('PASS · whole Papers body relocated y -> x with zero internal edits; tree alone remounted identity')
