"""Independent owner-source evidence and declared shared-resource integration."""
from copy import deepcopy
import json
import subprocess


def witness(body, common, operations):
    manifest = json.loads((body / 'site.json').read_text())
    data = json.loads((body / manifest['projection']).read_text())
    operations['validate'](data, body, common)
    for change in (lambda d: d.update(organ='foreign'), lambda d: d.update(works={}),
                   lambda d: d['works'].append(deepcopy(d['works'][0])),
                   lambda d: d['works'][0].pop('id')):
        changed = deepcopy(data)
        change(changed)
        try:
            operations['validate'](changed, body, common)
        except ValueError:
            continue
        raise AssertionError('Schattenseiten accepted changed work admission')


def integration(body, capabilities):
    commands = [['node', str(body / 'render.test.cjs'), str(capabilities['representation_handoff']),
                 str(capabilities['navigation']), str(capabilities['ui_grid'])]]
    grid_test = """const assert=require('node:assert/strict'),fs=require('node:fs'),G=require(process.argv[1]);
const manifest=JSON.parse(fs.readFileSync(process.argv[2]+'/site.json'));
const raw=JSON.parse(fs.readFileSync(process.argv[2]+'/'+manifest.ui_grid));
const s=G.normalizeState(raw),box=id=>G.fieldInfo(s,id).bounds;
assert.deepEqual(box('timeline'),{x:.25,y:.875,w:.5,h:.125});
assert.deepEqual(box('compass'),{x:.75,y:.5,w:.25,h:.5});
assert.deepEqual(box('description'),{x:0,y:.25,w:.25,h:.75});
assert.deepEqual(box('viewport'),{x:.25,y:.25,w:.625,h:.625});
assert.equal(s.fields.viewport.cells.length,25);
assert.deepEqual(s.fields.viewport.cells.filter(c=>s.fields.compass.cells.includes(c)),['zxw','zxy','zzw']);"""
    commands.append(['node', '-e', grid_test, str(capabilities['ui_grid']), str(body)])
    for command in commands:
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode:
            raise AssertionError(result.stderr or result.stdout or 'Schattenseiten integration witness failed')
