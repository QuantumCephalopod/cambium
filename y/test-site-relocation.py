#!/usr/bin/env python3
"""Prove that moving entire site-holon bodies remounts them without internal edits."""
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
        for identity in ('organism:papers', 'organism:crawlerbait'):
            before = build.discover_sites()
            original = site_by_id(before, identity)
            body_before = digest_tree(original['site_dir'])
            contract = {key: original[key] for key in
                        ('id', 'title', 'local_scope', 'shader', 'manifestation', 'build')}
            occupied = {site['address'] for site in before}
            address = next('wxyz' * 31 + gene + 'xyz' for gene in 'wxzy'
                           if 'wxyz' * 31 + gene + 'xyz' not in occupied)
            source = original['site_dir']
            target = build.SITE_ROOT / ('y' + address) / 'changed-carrier-name'
            target.parent.mkdir()
            old_parent = source.parent
            shutil.move(source, target)
            old_parent.rmdir()

            relocated = site_by_id(build.discover_sites(), identity)
            assert relocated['address'] == address
            assert {key: relocated[key] for key in contract} == contract
            assert build.witness_site_build(relocated), 'declared owner witness was disconnected'
            assert digest_tree(target) == body_before, 'relocation or witness changed body bytes'
            registry = build.site_mounts()
            mount = next(m for m in registry['mounts'] if m['interlocutor'] == identity)
            assert mount == {'interlocutor': identity, 'scope': 'main', 'address': address}

    finally:
        build.DISPLAY, build.SITE_ROOT = old_display, old_site_root

print('PASS · real Papers and Crawlerbait bodies relocate to dynamically free 128-symbol addresses under changed carrier names; owner validation and independent evidence retain exact internal bytes')
