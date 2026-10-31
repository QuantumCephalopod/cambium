#!/usr/bin/env python3
"""Recursive splits require local closure, complete children and no fifth bucket."""
from pathlib import Path
import importlib.util
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


if __name__=='__main__':
    unittest.main()
