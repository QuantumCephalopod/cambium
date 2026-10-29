#!/usr/bin/env python3
"""Counterexamples for both publication writers and the public carrier boundary."""
from pathlib import Path
import importlib.util
import os
import tempfile
import unittest
from unittest.mock import patch


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


build = load('artifact_build_test', 'build.py')
public = load('artifact_public_test', 'site-public.py')


def contents(root):
    return {str(p.relative_to(root)): p.read_bytes() for p in root.rglob('*') if p.is_file()}


class ArtifactBoundary(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='artifact-boundary-')
        self.addCleanup(self.temp.cleanup)
        self.area = Path(self.temp.name)
        self.root = self.area / 'source'
        self.root.mkdir()
        (self.root / 'y').mkdir()
        (self.root / 'y' / 'renew.py').write_bytes(b'living source')
        (self.root / 'INDEX.yaml').write_bytes(b'living phenotype')
        self.payload = {'index.html': b'new page', 'assets/body.js': b'new body'}

    def writers(self):
        return (build, public)

    def shared(self, writer):
        return writer.artifact if writer is build else writer.build.artifact

    def test_source_targets_and_aliases_are_refused_before_acquisition(self):
        source_before = contents(self.root)
        directory_alias = self.area / 'source-alias'
        directory_alias.symlink_to(self.root, target_is_directory=True)
        file_alias = self.area / 'file-alias'
        file_alias.symlink_to(self.root / 'INDEX.yaml')
        escape = self.root / 'outside-link'
        escape.symlink_to(self.area / 'external', target_is_directory=True)
        rejected = [self.root, self.root.parent, self.root / 'y', self.root / 'INDEX.yaml',
                    self.root / 'y' / 'new-output', directory_alias, directory_alias / 'y',
                    file_alias, escape / 'output', self.root / '_other-output']
        for writer in self.writers():
            with patch.object(writer, 'ROOT', self.root), patch.object(writer, 'artifact_files') as acquire:
                for target in rejected:
                    with self.subTest(writer=writer.__name__, target=str(target)):
                        with self.assertRaises(ValueError):
                            writer.write_artifact(target)
                acquire.assert_not_called()
        self.assertEqual(contents(self.root), source_before)

    def test_both_writers_replace_only_disposable_output_with_exact_bytes(self):
        for writer in self.writers():
            for target in (self.root / '_site', self.area / (writer.__name__ + '-external')):
                with self.subTest(writer=writer.__name__, target=str(target)):
                    target.mkdir(exist_ok=True)
                    (target / 'old.txt').write_bytes(b'old artifact')
                    with patch.object(writer, 'ROOT', self.root), patch.object(writer, 'artifact_files', return_value=self.payload) as acquire:
                        result = writer.write_artifact(target)
                        acquire.assert_called_once_with()
                    self.assertIs(result, self.payload)
                    self.assertEqual(contents(target), self.payload)
                    self.assertEqual((self.root / 'y/renew.py').read_bytes(), b'living source')

    def test_symlink_output_and_existing_file_are_refused(self):
        elsewhere = self.area / 'elsewhere'
        elsewhere.mkdir()
        (elsewhere / 'keep').write_bytes(b'keep')
        target = self.root / '_site'
        target.symlink_to(elsewhere, target_is_directory=True)
        file = self.area / 'existing-file'
        file.write_bytes(b'keep file')
        for writer in self.writers():
            with patch.object(writer, 'ROOT', self.root), patch.object(writer, 'artifact_files') as acquire:
                for destination in (target, file):
                    with self.assertRaises(ValueError):
                        writer.write_artifact(destination)
                acquire.assert_not_called()
        self.assertTrue(target.is_symlink())
        self.assertEqual(contents(elsewhere), {'keep': b'keep'})
        self.assertEqual(file.read_bytes(), b'keep file')

    def test_acquisition_failure_preserves_previous_artifact(self):
        for writer in self.writers():
            target = self.area / (writer.__name__ + '-failed-acquisition')
            target.mkdir()
            (target / 'old').write_bytes(b'previous')
            with patch.object(writer, 'ROOT', self.root), patch.object(writer, 'artifact_files', side_effect=ValueError('source refused')):
                with self.assertRaisesRegex(ValueError, 'source refused'):
                    writer.write_artifact(target)
            self.assertEqual(contents(target), {'old': b'previous'})

    def test_staging_failure_preserves_previous_artifact(self):
        original = Path.write_bytes
        def failing(path, data):
            if path.name == 'body.js':
                raise OSError('no room for candidate')
            return original(path, data)
        for writer in self.writers():
            target = self.area / (writer.__name__ + '-failed-stage')
            target.mkdir()
            (target / 'old').write_bytes(b'previous')
            with patch.object(writer, 'ROOT', self.root), patch.object(writer, 'artifact_files', return_value=self.payload), patch.object(Path, 'write_bytes', failing):
                with self.assertRaisesRegex(OSError, 'no room'):
                    writer.write_artifact(target)
            self.assertEqual(contents(target), {'old': b'previous'})
            self.assertEqual(list(self.area.glob('.' + target.name + '-*')), [])

    def test_install_failure_restores_previous_artifact(self):
        original = os.replace
        for writer in self.writers():
            target = self.area / (writer.__name__ + '-failed-install')
            target.mkdir()
            (target / 'old').write_bytes(b'previous')
            def failing(source, destination):
                if '-stage-' in Path(source).name:
                    raise OSError('candidate install interrupted')
                return original(source, destination)
            with patch.object(writer, 'ROOT', self.root), patch.object(writer, 'artifact_files', return_value=self.payload), patch.object(self.shared(writer).os, 'replace', failing):
                with self.assertRaisesRegex(OSError, 'install interrupted'):
                    writer.write_artifact(target)
            self.assertEqual(contents(target), {'old': b'previous'})
            self.assertEqual(list(self.area.glob('.' + target.name + '-*')), [])

    def test_invalid_member_cannot_escape_or_replace_previous_artifact(self):
        for writer in self.writers():
            target = self.area / (writer.__name__ + '-invalid-members')
            target.mkdir()
            (target / 'old').write_bytes(b'previous')
            for name in ('../escape', '/absolute', 'a/../escape', './escape', 'a//b', 'a\\b', ''):
                with self.subTest(writer=writer.__name__, member=name):
                    with patch.object(writer, 'ROOT', self.root), patch.object(writer, 'artifact_files', return_value={name: b'bad'}):
                        with self.assertRaises(ValueError):
                            writer.write_artifact(target)
                    self.assertEqual(contents(target), {'old': b'previous'})


class PublicCarrierBoundary(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='public-carrier-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.body = self.root / 'body'
        self.carrier = self.body / 'public'
        self.carrier.mkdir(parents=True)
        self.site = {'id': 'test:unrelated-owner', 'projection': 'projection.json', 'site_dir': self.body}

    def test_files_and_nested_directories_publish_exact_bytes(self):
        (self.carrier / 'route').mkdir()
        (self.carrier / 'route/page.txt').write_bytes(b'ordinary owned file')
        with patch.object(public, 'ROOT', self.root):
            self.assertEqual(public.site_public_files([self.site]), {'route/page.txt': b'ordinary owned file'})

    def test_file_directory_and_broken_symlinks_are_refused(self):
        outside = self.root / 'outside'
        outside.mkdir()
        (outside / 'private').write_bytes(b'not publishable')
        for target in (outside, outside / 'private', outside / 'missing'):
            link = self.carrier / 'link'
            link.symlink_to(target)
            with self.subTest(target=str(target)), patch.object(public, 'ROOT', self.root):
                with self.assertRaisesRegex(ValueError, 'symlink'):
                    public.site_public_files([self.site])
            link.unlink()
        self.assertEqual(contents(outside), {'private': b'not publishable'})

    def test_broken_public_root_link_is_not_an_absent_aperture(self):
        self.carrier.rmdir()
        self.carrier.symlink_to(self.root / 'missing')
        with patch.object(public, 'ROOT', self.root):
            with self.assertRaisesRegex(ValueError, 'real directory'):
                public.site_public_files([self.site])


if __name__ == '__main__':
    unittest.main()
