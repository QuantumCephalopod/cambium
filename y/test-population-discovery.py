#!/usr/bin/env python3
"""Witness mount discovery without borrowing any current site's identity/schema."""
from pathlib import Path
from hashlib import sha256
import importlib.util
import json
import os
import shutil
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('population_build', Path(__file__).with_name('build.py'))
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


def digest_tree(root):
    return {p.relative_to(root).as_posix(): sha256(p.read_bytes()).hexdigest()
            for p in root.rglob('*') if p.is_file()}


class PopulationDiscovery(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='population-discovery-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.population = self.root / 'display' / 'y'
        self.population.mkdir(parents=True)
        self.saved = build.ROOT, build.DISPLAY, build.SITE_ROOT
        build.ROOT, build.DISPLAY, build.SITE_ROOT = self.root, self.root / 'display', self.population
        self.addCleanup(self.restore)
        self.overview = self.body(self.population / 'overview', 'test:overview')

    def restore(self):
        build.ROOT, build.DISPLAY, build.SITE_ROOT = self.saved

    def body(self, folder, identity):
        folder.mkdir(parents=True)
        manifest = {'version': 2, 'id': identity, 'title': identity, 'local_scope': identity,
                    'shader': {'id': 'shader:' + identity, 'palette': [0.1, 0.2, 0.3]},
                    'manifestation': {'background_inspect': False},
                    'projection': 'projection.json', 'renderer': 'render.js',
                    'style': 'style.css', 'ui_grid': 'ui-grid.json'}
        for name, value in {'site.json': manifest, 'projection.json': {},
                            'ui-grid.json': {'schema': build.UI_GRID_SCHEMA}}.items():
            (folder / name).write_text(json.dumps(value))
        (folder / 'render.js').write_text('/* owned renderer */\n')
        (folder / 'style.css').write_text('/* owned skin */\n')
        return folder

    def mounts(self):
        return {row['interlocutor']: row['address'] for row in build.site_mounts()['mounts']}

    def test_owned_archives_and_local_population_do_not_become_parent_mounts(self):
        nested = self.body(self.population / 'yxz' / 'body', 'test:mounted')
        expected = self.mounts()
        for owner in (self.overview, nested):
            for role in ('_stomach', '_feed', '_root', '_waste'):
                archive = owner / role / 'retired' / 'site.json'
                archive.parent.mkdir(parents=True)
                archive.write_text('{not a live manifest')
            self.body(owner / 'y' / 'ywx' / 'local-body', 'test:overview')
        before = {p: digest_tree(p) for p in (self.overview, nested)}
        self.assertEqual(self.mounts(), expected)
        self.assertEqual({p: digest_tree(p) for p in before}, before)

    def test_lifecycle_shells_are_not_mount_positions(self):
        self.body(self.population / 'yw' / 'body', 'test:mounted')
        for container in (self.population, self.population / 'yw'):
            for role in ('_stomach', '_feed', '_root', '_waste'):
                shell = container / role
                shell.mkdir()
                (shell / 'site.json').write_text('{retired or unresolved')
                self.body(shell / 'nested', 'test:overview')
        self.assertEqual(self.mounts(), {'test:overview': '', 'test:mounted': 'w'})

    def test_whole_body_moves_to_long_recursive_address_without_internal_edits(self):
        body = self.body(self.population / 'yxz' / 'arbitrary-name', 'test:movable')
        self.body(body / '_waste' / 'old-body', 'test:movable')
        before = digest_tree(body)
        address = 'wxyz' * 32
        destination = self.population / ('y' + address) / body.name
        destination.parent.mkdir()
        shutil.move(body, destination)
        body.parent.rmdir()
        self.assertEqual(self.mounts(), {'test:overview': '', 'test:movable': address})
        self.assertEqual(digest_tree(destination), before)

    def test_discovery_does_not_enumerate_owned_interiors(self):
        body = self.body(self.population / 'yxx' / 'body', 'test:mounted')
        def guarded(operation):
            def run(path):
                folder = Path(path)
                if any(folder == owner or owner in folder.parents for owner in (self.overview, body)):
                    raise AssertionError('parent discovery entered an owned body')
                return operation(path)
            return run
        with patch.object(os, 'scandir', guarded(os.scandir)), patch.object(os, 'listdir', guarded(os.listdir)):
            self.assertEqual(self.mounts(), {'test:overview': '', 'test:mounted': 'xx'})

    def test_quotient_coalescence_does_not_collapse_distinct_raw_mounts(self):
        self.body(self.population / 'yxyw' / 'one', 'test:one')
        self.body(self.population / 'yxwy' / 'two', 'test:two')
        self.assertEqual(self.mounts(), {'test:overview': '', 'test:one': 'xyw', 'test:two': 'xwy'})

    def test_missing_overview_and_manifest_at_container_remain_invalid(self):
        shutil.rmtree(self.overview)
        with self.assertRaisesRegex(ValueError, 'no site-holons'):
            self.mounts()
        self.body(self.population / 'yw' / 'body', 'test:mounted')
        with self.assertRaisesRegex(ValueError, 'exactly one overview site-holon'):
            self.mounts()
        (self.population / 'site.json').write_text('{}')
        with self.assertRaisesRegex(ValueError, 'mount container'):
            self.mounts()

    def test_empty_and_undiscovered_nested_slots_remain_invalid(self):
        folder = self.population / 'ywx'
        folder.mkdir()
        with self.assertRaisesRegex(ValueError, 'exactly one direct site-holon'):
            self.mounts()
        self.body(folder / 'extra-container' / 'body', 'test:hidden')
        with self.assertRaisesRegex(ValueError, 'exactly one direct site-holon'):
            self.mounts()

    def test_malformed_mount_directories_still_fail(self):
        for name in ('ybad', 'wx', '_other'):
            with self.subTest(name=name):
                folder = self.population / name
                self.body(folder / 'body', 'test:hidden')
                with self.assertRaisesRegex(ValueError, 'non-holon/non-address'):
                    self.mounts()
                shutil.rmtree(folder)

    def test_raw_occupancy_and_identity_collisions_still_fail(self):
        self.body(self.population / 'yw' / 'one', 'test:one')
        two = self.body(self.population / 'yw' / 'two', 'test:two')
        with self.assertRaisesRegex(ValueError, 'exactly one direct site-holon'):
            self.mounts()
        shutil.rmtree(two)
        self.body(self.population / 'yx' / 'other', 'test:one')
        with self.assertRaisesRegex(ValueError, 'duplicate site identity'):
            self.mounts()

    def test_overview_occupancy_and_live_manifest_validation_still_fail(self):
        other = self.body(self.population / 'another', 'test:other')
        with self.assertRaisesRegex(ValueError, 'exact raw site address already occupied'):
            self.mounts()
        shutil.rmtree(other)
        (self.overview / 'site.json').write_text('{}')
        with self.assertRaisesRegex(ValueError, 'invalid v2 site-holon contract'):
            self.mounts()


if __name__ == '__main__':
    unittest.main()
