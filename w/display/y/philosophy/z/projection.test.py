"""Independent positive and refusal evidence for Philosophy's public surface."""
from copy import deepcopy
import json
from pathlib import Path
import shutil
import tempfile


def _refuses(operation):
    try:
        operation()
    except (ValueError, KeyError, TypeError):
        return
    raise AssertionError('Philosophy accepted a changed public/source obligation')


def witness(body, common, operations):
    data = json.loads((body / 'projection.json').read_text(encoding='utf-8'))
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
        ('encounter.json', lambda d: d['expressions']['en'].update(mission='')),
    )
    with tempfile.TemporaryDirectory(prefix='philosophy-projection-') as temporary:
        copied = Path(temporary) / 'body'
        copied.mkdir()
        for name in ('INDEX.yaml', '_cambium.yaml', 'site.json', 'encounter.json'):
            shutil.copyfile(body / name, copied / name)
        for gene in common['genes']:
            (copied / gene).mkdir()
            shutil.copyfile(body / gene / 'content.json', copied / gene / 'content.json')
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
    assert json.loads((body / 'projection.json').read_text(encoding='utf-8')) == data
