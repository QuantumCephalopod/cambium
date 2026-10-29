#!/usr/bin/env python3
"""Prove that moving entire site-holon bodies remounts them without internal edits."""
from pathlib import Path
from hashlib import sha256
import argparse
import importlib.util
import json
import os
import subprocess
import sys
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


def basic_acceptance():
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


def complete_acceptance():
    """Exercise the ordinary, unmodified full gate after a move and new admission.

    The default relocation subtest remains finite and is also run by the child
    full checker. Only this explicitly requested enclosing experiment clones the
    repository and invokes that complete checker; no acceptance gate is skipped.
    """
    with tempfile.TemporaryDirectory(prefix='display-complete-relocation-') as td:
        clone = Path(td) / 'repo'
        shutil.copytree(ROOT, clone,
                        ignore=shutil.ignore_patterns('.git', '_site', '__pycache__', '*.pyc'))
        candidate_path = clone / 'y/build.py'
        candidate_spec = importlib.util.spec_from_file_location('relocated_build', candidate_path)
        candidate = importlib.util.module_from_spec(candidate_spec)
        candidate_spec.loader.exec_module(candidate)
        sites = candidate.discover_sites()
        original = site_by_id(sites, 'organism:papers')
        before = digest_tree(original['site_dir'])
        address = next('wxyz' * 31 + gene + 'xyz' for gene in 'wxzy'
                       if 'wxyz' * 31 + gene + 'xyz' not in {s['address'] for s in sites})
        target = candidate.SITE_ROOT / ('y' + address) / 'renamed-papers-carrier'
        target.parent.mkdir()
        old_parent = original['site_dir'].parent
        shutil.move(original['site_dir'], target)
        old_parent.rmdir()
        # No knowledge of either current owner's schema is needed for admission.
        occupied = {s['address'] for s in candidate.discover_sites()}
        extra_address = next('yyyy' + g for g in 'wxzy' if 'yyyy' + g not in occupied)
        extra = candidate.SITE_ROOT / ('y' + extra_address) / 'unrelated-owner'
        extra.mkdir(parents=True)
        for role in ('_stomach', '_feed', '_root', '_waste', 'RITUALS/organism'):
            (extra / role).mkdir(parents=True)
        (extra / 'RITUALS/organism/RITUAL.md').write_text('Fixture-owned source, presentation and lifecycle.\n')
        manifest = {'version': 2, 'id': 'test:unrelated-admission', 'title': 'Unrelated owner',
                    'local_scope': 'unrelated', 'shader': {'id': 'shader:unrelated', 'palette': [.1,.2,.3]},
                    'manifestation': {'background_inspect': False}, 'projection': 'owned.json',
                    'renderer': 'body.js', 'style': 'body.css', 'ui_grid': 'screen.json'}
        (extra / 'site.json').write_text(json.dumps(manifest))
        (extra / 'owned.json').write_text(json.dumps({'root': {'noun': 'Fixture', 'children': {}}}))
        (extra / 'screen.json').write_text(json.dumps({'schema': candidate.UI_GRID_SCHEMA, 'meta': {'name': 'independent'},
                                                     'splits': [''], 'fields': {'viewport': {'cells': ['w']}}, 'elements': {}}))
        (extra / 'body.js').write_text('/* independently admitted fixture renderer */\n')
        (extra / 'body.css').write_text('/* independently admitted fixture skin */\n')
        environment = {**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'}
        for command in ([sys.executable, str(clone / 'y/site-public.py')],
                        [sys.executable, str(clone / 'y/check.py')]):
            result = subprocess.run(command, cwd=clone, env=environment, capture_output=True, text=True)
            if result.returncode:
                raise AssertionError(f"complete relocated/admitted gate failed: {command[-1]}\n{result.stdout}\n{result.stderr}")
            print(result.stdout.strip())
        assert digest_tree(target) == before, 'complete acceptance changed relocated owner bytes'
        mounts = candidate.site_mounts()['mounts']
        assert any(m['interlocutor'] == original['id'] and m['address'] == address for m in mounts)
        assert any(m['interlocutor'] == manifest['id'] and m['address'] == extra_address for m in mounts)
        print('PASS · unchanged Papers body at a new 128-symbol mount/carrier and unrelated owner admission pass the complete ordinary build/check path')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--complete', action='store_true', help='also run the full ordinary checker in a relocated/admitted repository')
    if parser.parse_args().complete:
        complete_acceptance()
    else:
        basic_acceptance()
