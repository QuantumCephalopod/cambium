#!/usr/bin/env python3
"""Recursive splits require local closure, complete children and no fifth bucket."""
from pathlib import Path
import importlib.util
import hashlib
import shutil
import tempfile
import unittest
from unittest.mock import patch


def module(name, filename):
    spec=importlib.util.spec_from_file_location(name,Path(__file__).with_name(filename))
    result=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


build=module('differentiation_build','build.py')
witness=module('differentiation_check','check.py')


class Differentiation(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.root=Path(self.temp.name)
        # Exercise another gene and rank, independently of Orientation's file map.
        (self.root/'INDEX.yaml').write_text('w:\n  noun: Whole\n  w:\n    noun: Source\n  x:\n    noun: Carrier\n  z:\n    noun: Bound\n  y:\n    noun: Growth\nx:\n  noun: Other\nz:\n  noun: Other\ny:\n  noun: Other\n')
        for gene in 'wxzy':
            (self.root/gene).mkdir()
            (self.root/'w'/('w'+gene)).mkdir()
        constitution={'4V':list('wxzy'),'6E':['wx','wz','wy','xz','xy','zy'],'4F':['wxz','wxy','wzy','xzy']}
        text=''.join(rank+':\n'+''.join('  '+key+': "Fixture claim"\n' for key in keys) for rank,keys in constitution.items())+'1T: "Fixture whole"\n'
        (self.root/'w/_cambium.yaml').write_text(text)

    def tearDown(self):
        self.temp.cleanup()

    def check(self):
        with patch.object(build,'DISPLAY',self.root),patch.object(build,'ROOT',self.root):
            witness.check_display_differentiations(build)

    def test_complete_split_and_opaque_foreign_interior(self):
        # A foreign occupant's interior is outside Display's realized genealogy.
        foreign=self.root/'w/ww/foreign'
        foreign.mkdir()
        (foreign/'_cambium.yaml').write_text('foreign internal syntax')
        self.check()

    def test_fifth_functional_bucket_is_refused(self):
        (self.root/'w/unassigned.js').write_text('active tissue')
        with self.assertRaisesRegex(AssertionError,'fifth functional bucket'):
            self.check()

    def test_missing_constitution_is_refused(self):
        (self.root/'w/_cambium.yaml').unlink()
        with self.assertRaisesRegex(AssertionError,'lacks local constitution'):
            self.check()

    def test_missing_realized_child_is_refused(self):
        (self.root/'w/wz').rmdir()
        with self.assertRaisesRegex(ValueError,'missing'):
            self.check()

    def test_unrepresented_constitution_is_refused(self):
        (self.root/'x/_cambium.yaml').write_text('unearned')
        with self.assertRaisesRegex(AssertionError,'unrepresented split'):
            self.check()

    def test_native_dependencies_survive_finer_custody_and_carrier_rename(self):
        native=build.display_dependencies()
        identities=['@chenglou/pretext','@sss/spritesheet']
        selected={identity:native[identity] for identity in identities}
        expected=build.dependency_projection('same-generation',selected)
        def bytes_at(folder):
            return {p.relative_to(folder).as_posix():hashlib.sha256(p.read_bytes()).hexdigest()
                    for p in folder.rglob('*') if p.is_file()}
        originals={identity:bytes_at(dep['body']) for identity,dep in selected.items()}
        for i,(identity,dep) in enumerate(selected.items()):
            shutil.copytree(dep['body'],self.root/'w/ww'/('occupant-'+str(i)))
        with patch.object(build,'DISPLAY',self.root),patch.object(build,'ROOT',self.root):
            before=build.display_dependencies()
            self.assertEqual(build.dependency_projection('same-generation',before),expected)
            self.assertEqual({d['address'] for d in before.values()},{'ww'})
            index=self.root/'INDEX.yaml'
            source='  w:\n    noun: Source\n'
            children=''.join('    '+g+':\n      noun: Child\n' for g in 'wxzy')
            index.write_text(index.read_text().replace(source,source+children))
            for gene in 'wxzy':
                (self.root/'w/ww'/('ww'+gene)).mkdir()
            shutil.copyfile(self.root/'w/_cambium.yaml',self.root/'w/ww/_cambium.yaml')
            for i,identity in enumerate(identities):
                (self.root/'w/ww'/('occupant-'+str(i))).rename(
                    self.root/'w/ww/wwx'/('renamed-'+str(i)))
            witness.check_display_differentiations(build)
            after=build.display_dependencies()
            self.assertEqual(set(after),set(identities))
            self.assertEqual({d['address'] for d in after.values()},{'wwx'})
            self.assertEqual(build.dependency_projection('same-generation',after),expected)
            self.assertEqual({identity:bytes_at(dep['body']) for identity,dep in after.items()},originals)


if __name__=='__main__':
    unittest.main()
