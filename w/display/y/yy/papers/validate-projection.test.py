"""Papers keeps independent evidence for its public projection boundary."""
from copy import deepcopy
import json


def witness(body, common, operations):
    data = json.loads((body / 'projection.json').read_text(encoding='utf-8'))
    operations['validate'](data, body, common)
    for change in (
        lambda d: d.update(source='private research'),
        lambda d: d['phenotype'].pop('w'),
        lambda d: d['phenotype'].update(extra='Invented rank'),
        lambda d: d['phenotype'].update(x=''),
        lambda d: d['groups'].pop('z'),
        lambda d: d['groups'].update(y={}),
        lambda d: d['groups'].update(w=[{'id': 'test', 'title': 'Public', 'private': 'Refuse'}]),
        lambda d: d['groups'].update(x=[{'id': 'test'}]),
    ):
        wrong = deepcopy(data)
        change(wrong)
        try:
            operations['validate'](wrong, body, common)
        except ValueError:
            continue
        raise AssertionError('Papers accepted a changed public boundary')
    assert json.loads((body / 'projection.json').read_text(encoding='utf-8')) == data
