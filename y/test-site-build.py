#!/usr/bin/env python3
"""Witness owner build dispatch without knowing any current site's schema."""
from pathlib import Path
from hashlib import sha256
import importlib.util
import json
import shutil
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('owner_build', Path(__file__).with_name('build.py'))
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


def digest(root):
    return {p.relative_to(root).as_posix(): sha256(p.read_bytes()).hexdigest()
            for p in root.rglob('*') if p.is_file()}


class SiteBuild(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='site-build-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.population = self.root / 'display' / 'y'
        self.population.mkdir(parents=True)
        self.saved = build.ROOT, build.DISPLAY, build.SITE_ROOT
        build.ROOT, build.DISPLAY, build.SITE_ROOT = self.root, self.root / 'display', self.population
        self.addCleanup(self.restore)
        self.overview = self.body(self.population / 'overview', 'test:overview', False)
        self.site = self.body(self.population / 'yw' / 'unfamiliar-body', 'test:unfamiliar', True)

    def restore(self):
        build.ROOT, build.DISPLAY, build.SITE_ROOT = self.saved

    def body(self, folder, identity, hook):
        folder.mkdir(parents=True)
        manifest = {'version': 2, 'id': identity, 'title': identity, 'local_scope': identity,
                    'shader': {'id': 'shader:' + identity, 'palette': [.1, .2, .3]},
                    'manifestation': {'background_inspect': False},
                    'projection': 'projection.json', 'renderer': 'render.js',
                    'style': 'style.css', 'ui_grid': 'ui-grid.json'}
        if hook:
            manifest['build'] = {'module': 'owned.py', 'witness': 'owned.test.py'}
        for name, value in {'site.json': manifest, 'projection.json': {'owned': 7},
                            'ui-grid.json': {'schema': build.UI_GRID_SCHEMA}}.items():
            (folder / name).write_text(json.dumps(value))
        (folder / 'render.js').write_text('/* owner renderer */\n')
        (folder / 'style.css').write_text('/* owner skin */\n')
        if hook:
            (folder / 'owned.py').write_text('''import json
def derive(body, common):
    return {"owned": json.loads((body / "source.json").read_text())["value"]}
def validate(data, body, common):
    if data != derive(body, common):
        raise ValueError("owner-specific drift")
''')
            (folder / 'owned.test.py').write_text('''def witness(body, common, operations):
    assert operations["derive"](body, common) == {"owned": 7}
    try:
        operations["validate"]({"owned": 8}, body, common)
    except ValueError:
        return
    raise AssertionError("owner accepted changed source")
''')
            (folder / 'source.json').write_text('{"value": 7}')
        return folder

    def record(self):
        return next(s for s in build.discover_sites() if s['id'] == 'test:unfamiliar')

    def manifest(self, value):
        p = self.site / 'site.json'
        data = json.loads(p.read_text())
        data['build'] = value
        p.write_text(json.dumps(data))

    def test_unknown_owner_and_optional_absence_are_read_only(self):
        before = digest(self.population)
        sites = build.discover_sites()
        self.assertTrue(build.witness_site_build(self.record()))
        self.assertFalse(build.witness_site_build(next(s for s in sites if s['address'] == '')))
        self.assertEqual(digest(self.population), before)

    def test_owner_refusal_is_not_bypassed(self):
        (self.site / 'projection.json').write_text('{"owned": 8}')
        with self.assertRaisesRegex(ValueError, 'owner-specific drift'):
            build.discover_sites()

    def test_explicit_derivation_repairs_missing_or_invalid_projection(self):
        for contents in (None, '{not JSON', '{"owned": 8}'):
            p = self.site / 'projection.json'
            if contents is None:
                p.unlink()
            else:
                p.write_text(contents)
            before = digest(self.site)
            result = build.derive_site_projection('test:unfamiliar')
            self.assertEqual(result, p.resolve())
            self.assertEqual(json.loads(p.read_text()), {'owned': 7})
            after = digest(self.site)
            before.pop('projection.json', None); after.pop('projection.json')
            self.assertEqual(before, after)
            self.record()

    def test_rejected_derivation_keeps_old_projection(self):
        p = self.site / 'owned.py'
        p.write_text(p.read_text() + '\ndef derive(body, common):\n    return {"owned": 8}\n')
        # The independent validator retains its source-owned obligation.
        p.write_text(p.read_text().replace('if data != derive(body, common):', 'if data != {"owned": 7}:'))
        before = (self.site / 'projection.json').read_bytes()
        with self.assertRaisesRegex(ValueError, 'owner-specific drift'):
            build.derive_site_projection('test:unfamiliar')
        self.assertEqual((self.site / 'projection.json').read_bytes(), before)

    def test_whole_hook_body_moves_without_internal_edits(self):
        build.derive_site_projection('test:unfamiliar')
        before = digest(self.site)
        address = 'wxyz' * 32
        target = self.population / ('y' + address) / 'different-carrier-name'
        target.parent.mkdir()
        old_parent = self.site.parent
        shutil.move(self.site, target); old_parent.rmdir(); self.site = target
        site = self.record()
        self.assertEqual(site['address'], address)
        self.assertTrue(build.witness_site_build(site))
        build.derive_site_projection('test:unfamiliar')
        self.assertEqual(digest(target), before)

    def test_build_members_cannot_escape_the_body(self):
        outside = self.root / 'outside.py'
        outside.write_text('raise AssertionError("must not run")')
        for member in (str(outside), '../../outside.py'):
            with self.subTest(member=member):
                self.manifest({'module': member})
                with self.assertRaisesRegex(ValueError, 'relative|escaped'):
                    build.discover_sites()
        (self.site / 'escape.py').symlink_to(outside)
        self.manifest({'module': 'escape.py'})
        with self.assertRaisesRegex(ValueError, 'escaped'):
            build.discover_sites()
        self.manifest({'module': 'owned.py', 'witness': '../../outside.py'})
        with self.assertRaisesRegex(ValueError, 'escaped'):
            build.discover_sites()

    def test_hook_contract_errors_refuse_instead_of_silently_skipping(self):
        for value in ('owned.py', {}, {'module': 3}, {'module': 'owned.py', 'unknown': 1}):
            with self.subTest(value=value):
                self.manifest(value)
                with self.assertRaisesRegex(ValueError, 'build'):
                    build.discover_sites()
        self.manifest({'module': 'missing.py'})
        with self.assertRaisesRegex(ValueError, 'missing site member'):
            build.discover_sites()
        self.manifest({'module': 'owned.py'})
        (self.site / 'owned.py').write_text('def derive(body, common): return {}\n')
        with self.assertRaisesRegex(ValueError, 'validate'):
            build.discover_sites()

    def test_changed_module_and_independent_witness_are_reacquired(self):
        self.record()
        p = self.site / 'owned.py'; p.write_text(p.read_text().replace('"owner-specific drift"', '"fresh owner refusal"'))
        (self.site / 'projection.json').write_text('{}')
        with self.assertRaisesRegex(ValueError, 'fresh owner refusal'):
            self.record()
        (self.site / 'projection.json').write_text('{"owned": 7}')
        (self.site / 'owned.test.py').write_text('def witness(body, common, operations): raise AssertionError("independent evidence refused")\n')
        with self.assertRaisesRegex(AssertionError, 'independent evidence refused'):
            build.witness_site_build(self.record())

    def test_missing_identity_or_deriver_refuses_without_writes(self):
        before = digest(self.population)
        for identity in ('test:missing', 'test:overview'):
            with self.subTest(identity=identity), self.assertRaisesRegex(ValueError, 'identity|derive'):
                build.derive_site_projection(identity)
        self.assertEqual(digest(self.population), before)


if __name__ == '__main__':
    unittest.main()
