#!/usr/bin/env python3
"""Deep semantic traversal has no Python call-stack rank ceiling.

The virtual carrier isolates semantic depth from finite filesystem path limits.
Actual missing-locus refusal and shallow physical path/order remain witnessed.
"""
from pathlib import Path
import importlib.util
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('phenotype_build', Path(__file__).with_name('build.py'))
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


def spine(depth):
    root = {g: {'noun': 'Whole'} for g in build.GENES}
    current = root['w']
    for _ in range(depth):
        current.update({g: {'noun': 'Whole'} for g in build.GENES})
        current = current['w']
    return root, current


class Carrier:
    """A path-capable test carrier; no deep OS directory tree is implied."""
    def __init__(self, name='', parent=None, missing=None):
        self.name, self.parent, self.missing = name, parent, missing

    def __truediv__(self, name):
        return Carrier(name, self, self.missing)

    def is_dir(self):
        return self.name != self.missing

    def relative_to(self, _):
        parts, current = [], self
        while current.parent is not None:
            parts.append(current.name)
            current = current.parent
        return '/'.join(reversed(parts))


class PhenotypeDepth(unittest.TestCase):
    def test_deep_complete_phenotype_and_loci(self):
        index, _ = spine(1600)
        build.validate_index(index)
        with patch.object(build, 'DISPLAY', Carrier()), patch.object(build, 'load_yaml', return_value=index):
            rows = build.display_loci()
        self.assertEqual(len(rows), 6404)
        self.assertEqual(rows[1600]['address'], 'w' * 1601)
        self.assertIs(rows[0]['node'], index['w'])
        self.assertEqual([row['address'] for row in rows[-3:]], ['x', 'z', 'y'])

    def test_deep_invalid_split_is_refused_without_stack_failure(self):
        index, tip = spine(1600)
        tip['w'] = {'noun': 'Residue'}
        with self.assertRaisesRegex(ValueError, 'incomplete realized CCCC split'):
            build.validate_index(index)
        tip.clear(); tip.update(noun='Whole', unexpected='residue')
        with self.assertRaisesRegex(ValueError, 'non-phenotype fields'):
            build.validate_index(index)

    def test_shallow_order_paths_and_missing_locus(self):
        index, _ = spine(1)
        with patch.object(build, 'DISPLAY', Carrier()), patch.object(build, 'load_yaml', return_value=index):
            rows = build.display_loci()
        self.assertEqual([row['address'] for row in rows], ['w', 'ww', 'wx', 'wz', 'wy', 'x', 'z', 'y'])
        self.assertEqual([row['folder'].relative_to(None) for row in rows],
                         ['w', 'w/ww', 'w/wx', 'w/wz', 'w/wy', 'x', 'z', 'y'])
        with patch.object(build, 'DISPLAY', Carrier(missing='wx')), patch.object(build, 'load_yaml', return_value=index):
            with self.assertRaisesRegex(ValueError, 'locus wx is missing'):
                build.display_loci()


if __name__ == '__main__':
    unittest.main()
