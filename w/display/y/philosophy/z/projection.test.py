"""Independent positive and refusal evidence for Philosophy's public surface."""
from copy import deepcopy
import json
from pathlib import Path
import shutil
import tempfile
import subprocess


def _refuses(operation):
    try:
        operation()
    except (ValueError, KeyError, TypeError):
        return
    raise AssertionError('Philosophy accepted a changed public/source obligation')


def witness(body, common, operations):
    assert {p.name for p in body.iterdir()} == {
        'INDEX.yaml', '_cambium.yaml', 'site.json', 'RITUALS',
        '_root', '_feed', '_stomach', '_waste', *common['genes'],
    }, 'realized split retained a fifth active root carrier'
    manifest = json.loads((body / 'site.json').read_text(encoding='utf-8'))
    assert manifest['manifestation'].get('background_drag', True) is True
    projection = body / manifest['projection']
    data = json.loads(projection.read_text(encoding='utf-8'))
    assert data['source']['organism'] == 'philosophy'
    assert data['expression']['']['de']['title'] == 'Philosophy'
    assert data['expression']['']['en']['title'] == 'Philosophy'
    assert {gene: node['noun'] for gene, node in data['root']['children'].items()} == {'w': 'Inquiry', 'x': 'Continuity', 'z': 'Care', 'y': 'Becoming'}
    renderer = (body / manifest['renderer']).read_text(encoding='utf-8')
    assert 'philosophy-global-site' in renderer and 'requestGlobalTarget' in renderer
    assert all(Path(manifest[key]).parts[0] in common['genes'] for key in ('projection', 'renderer', 'style', 'ui_grid'))
    subprocess.run(['node', str(body / 'w/render.test.cjs')], check=True)
    assert operations['derive'](body, common) == data
    operations['validate'](data, body, common)
    for change in (
        lambda d: d['root']['children']['w']['one'].update(en='Changed question'),
        lambda d: d['root']['children']['x'].update(noun='Changed noun'),
        lambda d: d.update(private='not a public field'),
    ):
        wrong = deepcopy(data)
        change(wrong)
        _refuses(lambda: operations['validate'](wrong, body, common))
    # Mutate owned source copies, never the admitted body. Validation must retain
    # its source obligations even if a projection is regenerated from bad input.
    cases = (
        ('w/content.json', lambda d: d.update(canonical_concept='Changed source noun')),
        ('x/content.json', lambda d: d.update(gene='INVALID')),
        ('z/content.json', lambda d: d['expressions']['en'].update(concept='')),
        ('y/content.json', lambda d: d['expressions']['en'].update(body=[])),
        ('w/content.json', lambda d: d['expressions']['en'].update(encounters=[{'interlocutor': '../escape', 'label': 'Invalid'}])),
        ('x/encounter.json', lambda d: d['expressions']['en'].update(mission='')),
    )
    with tempfile.TemporaryDirectory(prefix='philosophy-projection-') as temporary:
        copied = Path(temporary) / 'body'
        copied.mkdir()
        for name in ('INDEX.yaml', '_cambium.yaml', 'site.json'):
            shutil.copyfile(body / name, copied / name)
        for gene in common['genes']:
            (copied / gene).mkdir()
            shutil.copyfile(body / gene / 'content.json', copied / gene / 'content.json')
        shutil.copyfile(body / 'x/encounter.json', copied / 'x/encounter.json')
        for name, change in cases:
            path = copied / name
            original = path.read_bytes()
            wrong = json.loads(original)
            change(wrong)
            path.write_text(json.dumps(wrong), encoding='utf-8')
            _refuses(lambda: operations['validate'](operations['derive'](copied, common), copied, common))
            path.write_bytes(original)
        index = copied / 'INDEX.yaml'
        original = index.read_text(encoding='utf-8')
        index.write_text(original.replace('  noun: Inquiry', '  noun: Inquiry\n  w:\n    noun: Partial'), encoding='utf-8')
        _refuses(lambda: operations['derive'](copied, common))
        index.write_text(original.replace('  noun: Inquiry', '  noun: Inquiry\n' + ''.join(f'  {g}:\n    noun: Child\n' for g in common['genes'])), encoding='utf-8')
        _refuses(lambda: operations['derive'](copied, common))
    assert json.loads(projection.read_text(encoding='utf-8')) == data


def integration(body, capabilities):
    """Care witnesses Philosophy's chosen footprint through shared measurement."""
    subprocess.run(['node', '-e', r"""
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const body = process.argv[1], G = require(process.argv[2]);
const manifest = JSON.parse(fs.readFileSync(path.join(body, 'site.json')));
const state = G.normalizeState(JSON.parse(fs.readFileSync(path.join(body, manifest.ui_grid))));
const box = id => G.fieldInfo(state, id).bounds;
assert.deepEqual(box('timeline'), {x:.25,y:.875,w:.5,h:.125});
assert.deepEqual(box('compass'), {x:.75,y:.5,w:.25,h:.5});
assert.deepEqual(box('description'), {x:0,y:.25,w:.25,h:.75});
assert.deepEqual(box('viewport'), {x:.25,y:.25,w:.625,h:.625});
assert.equal(state.fields.viewport.cells.length, 25);
assert.deepEqual(state.fields.viewport.cells.filter(c => state.fields.compass.cells.includes(c)), ['zxw','zxy','zzw']);
console.log('Philosophy owner footprint through shared UI measurement PASS');
""", str(body), str(capabilities['ui_grid'])], check=True)
