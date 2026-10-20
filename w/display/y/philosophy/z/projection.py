"""Philosophy Care owns the truth of its public projection of this body."""
import json
import re


def _validate_display_node(node, path, genes):
    required = {'noun','de','en','gene','one','children'}
    if not isinstance(node, dict) or set(node) != required:
        raise ValueError(f'Philosophy projection node {path} has unexpected fields')
    if not all(isinstance(node[k], str) and node[k].strip() for k in ('noun','de','en','gene')):
        raise ValueError(f'Philosophy projection node {path} is unnamed')
    if node['gene'] not in {'CREATE','COPY','CONTROL','CULTIVATE'}:
        raise ValueError(f'Philosophy projection node {path} has invalid CCCC gene')
    if not isinstance(node['one'], dict) or set(node['one']) != {'de','en'}:
        raise ValueError(f'Philosophy projection node {path} lacks bilingual encounter copy')
    if not isinstance(node['children'], dict):
        raise ValueError(f'Philosophy projection node {path} children must be a mapping')
    if node['children'] and set(node['children']) != set(genes):
        raise ValueError(f'Philosophy projection node {path} invents a partial recursive rank')
    for gene in genes:
        if gene in node['children']:
            _validate_display_node(node['children'][gene], path + gene, genes)


def derive(site_dir, common):
    """Derive the overview projection only from the site's own INDEX, _cambium and locus content."""
    GENES = common['genes']
    load_yaml, validate_index, validate_cambium = (common[k] for k in ('load_yaml', 'validate_index', 'validate_cambium'))
    index = load_yaml(site_dir/'INDEX.yaml'); validate_index(index)
    constitution = load_yaml(site_dir/'_cambium.yaml'); validate_cambium(constitution, f'{site_dir.name} _cambium.yaml')
    site = json.loads((site_dir/'site.json').read_text(encoding='utf-8'))
    names = common['apertures']
    children = {}
    for gene in GENES:
        if any(g in index[gene] for g in GENES):
            raise ValueError(f'{site_dir.name}:{gene} realized a deeper rank that the overview projection cannot yet derive')
        content = json.loads((site_dir/gene/'content.json').read_text(encoding='utf-8'))
        if content.get('address') != gene or content.get('gene') != names[gene] or content.get('canonical_concept') != index[gene]['noun']:
            raise ValueError(f'{site_dir.name}/{gene}/content.json disagrees with INDEX.yaml phenotype')
        expressions = content['expressions']
        children[gene] = {
            'noun': index[gene]['noun'],
            'de': expressions['de']['concept'],
            'en': expressions['en']['concept'],
            'gene': names[gene],
            'one': {'de': expressions['de']['question'], 'en': expressions['en']['question']},
            'children': {},
        }
    encounter = json.loads((site_dir/'encounter.json').read_text(encoding='utf-8'))
    languages = encounter['available_languages']
    expression = {'': {l: {k: encounter['expressions'][l][k] for k in ('title', 'mission', 'position')} for l in languages}}
    for gene in GENES:
        content = json.loads((site_dir/gene/'content.json').read_text(encoding='utf-8'))
        expression[gene] = {l: {'body': content['expressions'][l]['body'], **({'encounters': content['expressions'][l]['encounters']} if content['expressions'][l].get('encounters') else {})} for l in languages}
    for address, langs in expression.items():
        for l, fields in langs.items():
            for k, v in fields.items():
                if k == 'encounters':
                    if (not isinstance(v, list) or not v
                            or any(not isinstance(e, dict) or set(e) != {'interlocutor', 'label'}
                                   or not isinstance(e['interlocutor'], str)
                                   or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9:._-]{0,200}', e['interlocutor'])
                                   or not isinstance(e['label'], str) or not e['label'].strip() for e in v)):
                        raise ValueError(f'{site_dir.name} expression {address}/{l} has invalid encounter')
                    continue
                texts = v if isinstance(v, list) else [v]
                if not texts or any(not isinstance(t, str) or not t.strip() for t in texts):
                    raise ValueError(f'{site_dir.name} expression {address or "ε"}/{l}/{k} is empty')
    return {
        'source': {'organism': site['id'].split(':', 1)[1], 'derived_from': ['INDEX.yaml', '_cambium.yaml', 'encounter.json', 'w/x/z/y content.json']},
        'root': {'noun': site['title'], 'children': children},
        'constitution': constitution,
        'expression': expression,
    }


def validate(data, site_dir, common):
    GENES = common['genes']
    expected = derive(site_dir, common)
    for gene in GENES:
        _validate_display_node(expected['root']['children'][gene], gene, GENES)
    if data != expected:
        raise ValueError(f'{site_dir.name}/projection.json is not derived from its own body; regenerate through --derive-site-projection with its stable identity')
    return data
