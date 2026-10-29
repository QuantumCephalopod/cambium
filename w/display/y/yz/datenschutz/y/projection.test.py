"""Independent acceptance/refusal of Datenschutz's facts, expression and publication."""
from copy import deepcopy
import json
from pathlib import Path
import shutil
import subprocess
import tempfile


def _refuses(operation):
    try:
        operation()
    except (ValueError, KeyError, TypeError):
        return
    raise AssertionError('Datenschutz accepted a changed source/public obligation')


def witness(body, common, operations):
    assert {p.name for p in body.iterdir()} == {
        'INDEX.yaml', '_cambium.yaml', 'site.json', 'RITUALS',
        '_root', '_feed', '_stomach', '_waste', *common['genes'],
    }, 'realized split retained a fifth active root carrier'
    manifest = json.loads((body / 'site.json').read_text(encoding='utf-8'))
    projection = body / manifest['projection']
    original = projection.read_bytes()
    data = json.loads(original)
    assert operations['derive'](body, common) == data
    operations['validate'](data, body, common)
    assert data['contact']['email'] == 'privacy@sss.saarland'
    assert data['controller']['address'][0] == 'Katharinenstr. 6A, 1. OG'
    assert all(Path(manifest[key]).parts[0] in common['genes'] for key in ('projection', 'renderer', 'style', 'ui_grid'))
    assert all((body / gene).is_dir() and any((body / gene).iterdir()) for gene in common['genes'])
    for change in (lambda d: d['contact'].update(email='changed@example.invalid'),
                   lambda d: d.update(private='not public')):
        wrong = deepcopy(data)
        change(wrong)
        _refuses(lambda: operations['validate'](wrong, body, common))
    # Each existing child contributes real input; even re-derivation must refuse
    # a claim which no longer agrees with the approved publication or readiness.
    cases = (('w/title.json', lambda d: d.update(en='Changed notice')),
        ('x/provenance.json', lambda d: d['controller'].update(name='Changed controller')),
        ('y/remedy.json', lambda d: d.update(email='changed@example.invalid')),
        ('z/publication.json', lambda d: d.update(publication='NOT_READY')),
        ('x/provenance.json', lambda d: d['draft'].update(status='not-confirmed')))
    with tempfile.TemporaryDirectory(prefix='privacy-source-') as temporary:
        copied = Path(temporary) / 'body'
        shutil.copytree(body, copied)
        for member, change in cases:
            source = copied / member
            before = source.read_bytes()
            wrong = json.loads(before)
            change(wrong)
            source.write_text(json.dumps(wrong), encoding='utf-8')
            _refuses(lambda: operations['validate'](operations['derive'](copied, common), copied, common))
            source.write_bytes(before)
        notice = copied / Path(manifest['projection']).parent / 'public/privacy/index.html'
        notice.write_text(notice.read_text(encoding='utf-8').replace(data['contact']['email'], 'missing@example.invalid'), encoding='utf-8')
        _refuses(lambda: operations['validate'](data, copied, common))
    subprocess.run(['node', str(body / 'y/render.test.cjs')], check=True)
    assert projection.read_bytes() == original


def integration(body, capabilities):
    """The actual artifact must retain both complete source-owned notice bytes."""
    manifest = json.loads((body / 'site.json').read_text(encoding='utf-8'))
    public = body / Path(manifest['projection']).parent / 'public'
    for member in ('privacy/index.html', 'privacy/en/index.html'):
        expected = (public / member).read_bytes()
        assert capabilities['public_files'][member] == expected
        assert (capabilities['artifact'] / member).read_bytes() == expected
