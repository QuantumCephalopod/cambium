#!/usr/bin/env python3
"""Build cambium's public Pages artifact from the nested display organ plus host interfaces.

Canonical host anatomy remains INDEX.yaml + address-local _cambium.yaml. Visitor-facing
content/presentation lives in w/display/. The generated _site directory is an ephemeral
outward membrane, never living organism anatomy.
"""
from pathlib import Path
import argparse
import html
import json
import shutil

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
DISPLAY = ROOT / 'w' / 'display'
GENES = 'wxzy'


def scalar(text):
    text = text.strip()
    if not text:
        return {}
    if text.startswith(('"', "'")):
        return json.loads(text) if text.startswith('"') else text[1:-1]
    return text


def load_yaml(path):
    """Strict tiny YAML subset sufficient for canonical INDEX/_cambium surfaces."""
    root, stack = {}, [(-1, {})]
    root = stack[0][1]
    for number, raw in enumerate(path.read_text(encoding='utf-8').splitlines(), 1):
        if not raw.strip() or raw.lstrip().startswith('#'):
            continue
        if raw.strip() == '{}':
            if root:
                raise ValueError(f'{path.name}:{number}: empty mapping must stand alone')
            continue
        indent = len(raw) - len(raw.lstrip(' '))
        if indent % 2:
            raise ValueError(f'{path.name}:{number}: indentation must use two-space steps')
        line = raw.strip()
        if ':' not in line:
            raise ValueError(f'{path.name}:{number}: expected key: value')
        key, value = line.split(':', 1)
        key = key.strip()
        while stack[-1][0] >= indent:
            stack.pop()
        parent = stack[-1][1]
        if key in parent:
            raise ValueError(f'{path.name}:{number}: duplicate key {key}')
        parsed = scalar(value)
        parent[key] = parsed
        if isinstance(parsed, dict):
            stack.append((indent, parsed))
    return root


def validate_index(index):
    def walk(node, path=''):
        if not isinstance(node, dict):
            raise ValueError(f'{path or "root"} phenotype must be a mapping')
        keys = set(node)
        if path:
            if not isinstance(node.get('noun'), str) or not node['noun'].strip():
                raise ValueError(f'{path} needs one atomic noun')
            keys.remove('noun')
        if not keys <= set(GENES):
            raise ValueError(f'{path or "root"} contains non-phenotype fields: {sorted(keys-set(GENES))}')
        children = [g for g in GENES if g in node]
        if children and len(children) != 4:
            raise ValueError(f'{path or "root"} has an incomplete realized CCCC split')
        for g in children:
            walk(node[g], path + g)
    if set(index) != set(GENES):
        raise ValueError('root INDEX.yaml must contain exactly the realized w/x/z/y phenotype')
    for g in GENES:
        walk(index[g], g)


def validate_cambium(c, label='_cambium.yaml'):
    expected = {'4V': set(GENES), '6E': {'wx','wz','wy','xz','xy','zy'},
                '4F': {'wxz','wxy','wzy','xzy'}}
    if set(c) != {'4V','6E','4F','1T'}:
        raise ValueError(f'{label} contains noncanonical fields')
    for rank, keys in expected.items():
        if not isinstance(c[rank], dict) or set(c[rank]) != keys:
            raise ValueError(f'{label} {rank} is incomplete')
        if any(not isinstance(v, str) or not v.strip() for v in c[rank].values()):
            raise ValueError(f'{label} {rank} contains an empty closure')
    if not isinstance(c['1T'], str) or not c['1T'].strip():
        raise ValueError(f'{label} 1T is empty')


def validate_papers(papers):
    expected = {'source','event_id','refresh','observed_at_utc','boundary','phenotype','groups'}
    if set(papers) != expected:
        raise ValueError('w/display/papers.json has an unexpected public projection shape')
    if papers['source'] != 'papers/_feed' or papers['refresh'] != 'REFRESH ACKNOWLEDGED':
        raise ValueError('papers projection is not bound to an acknowledged local feed')
    if not isinstance(papers['event_id'], str) or not papers['event_id'].startswith('papers-'):
        raise ValueError('papers projection needs its source feed event identity')
    if set(papers['phenotype']) != set(GENES) or set(papers['groups']) != set(GENES):
        raise ValueError('papers projection must preserve exactly its own realized root loci')
    seen = set()
    for gene in GENES:
        if not isinstance(papers['phenotype'][gene], str) or not papers['phenotype'][gene].strip():
            raise ValueError(f'papers phenotype {gene} is unnamed')
        group = papers['groups'][gene]
        if not isinstance(group, list):
            raise ValueError(f'papers group {gene} must be a list')
        for item in group:
            if not isinstance(item, dict) or set(item) != {'id','title'}:
                raise ValueError(f'papers group {gene} contains non-public fields')
            if not isinstance(item['id'], str) or not item['id'].startswith('S.'):
                raise ValueError('papers projection currently admits source-organism identities only')
            if not isinstance(item['title'], str) or not item['title'].strip():
                raise ValueError(f'papers source {item.get("id", "?")} has no title')
            if item['id'] in seen:
                raise ValueError(f'duplicate papers source identity {item["id"]}')
            seen.add(item['id'])
    if not seen:
        raise ValueError('papers projection is empty')


def local_cambium(path):
    p = ROOT / path / '_cambium.yaml' if path else ROOT / '_cambium.yaml'
    if not p.is_file():
        raise ValueError(f'missing closed split anatomy: {p.relative_to(ROOT)}')
    data = load_yaml(p)
    validate_cambium(data, p.relative_to(ROOT).as_posix())
    return data


def runtime_index():
    """Derive browser navigation state without enlarging canonical phenotype."""
    phenotype = load_yaml(ROOT / 'INDEX.yaml')
    validate_index(phenotype)
    root_c = local_cambium('')
    root = {'name':'cambium', 'whole':root_c['1T'], 'tissue':{}}

    def build(node, path, inherited_whole):
        out = {'name':node['noun'].strip(), 'whole':inherited_whole, 'tissue':{}}
        children = [g for g in GENES if g in node]
        if children:
            c = local_cambium(path)
            if c['1T'] != inherited_whole:
                raise ValueError(f'{path} inherited whole disagrees with local 1T')
            for g in children:
                out[g] = build(node[g], path + g, c['4V'][g])
        return out

    for g in GENES:
        root[g] = build(phenotype[g], g, root_c['4V'][g])
    return root


def semantic_nodes(index):
    out=[]
    def walk(node,path=''):
        out.append((path,node))
        for g in GENES:
            if g in node:
                walk(node[g],path+g)
    walk(index)
    return out


def render():
    copy = json.loads((DISPLAY / 'content.json').read_text(encoding='utf-8'))
    papers = json.loads((DISPLAY / 'papers.json').read_text(encoding='utf-8'))
    validate_papers(papers)
    index = runtime_index()
    organs = copy.get('organs')
    if not isinstance(organs, dict):
        raise ValueError('w/display/content.json needs the current public place copy map')
    for path, _node in semantic_nodes(index):
        if path and path not in organs:
            raise ValueError(f'display content has no public interpretation for realized host path {path}')

    text = (DISPLAY / 'template.html').read_text(encoding='utf-8')
    subs = {
        'EYEBROW':copy['eyebrow'], 'PRACTICE_LABEL':copy['practice_label'],
        'PRACTICE':copy['practice'], 'LOCATION':copy['location'], 'FOOTER':copy['footer']
    }
    subs.update({f'HEAD{i}':s for i,s in enumerate(copy['headline'])})
    for key, value in subs.items():
        text = text.replace('{{'+key+'}}', html.escape(value))
    payload = json.dumps({'index':index,'copy':copy,'papers':papers}, ensure_ascii=False, separators=(',',':')).replace('<','\\u003c').replace('&','\\u0026')
    text = text.replace('/*__DATA__*/', payload)
    if '/*__' in text or '{{' in text:
        raise ValueError('unresolved display membrane slot')
    return '<!-- secreted from w/display/ through cambium host interfaces; generated membrane, not organism anatomy. -->\n' + text


def artifact_files():
    sources = {
        'assets/style.css': DISPLAY / 'style.css',
        'assets/papers.css': DISPLAY / 'papers.css',
        'assets/favicon.svg': DISPLAY / 'favicon.svg',
        'assets/view.js': DISPLAY / 'view.js',
        'assets/papers-view.js': DISPLAY / 'papers-view.js',
        'assets/address.js': ROOT / 'z/address.js',
        'assets/navigation.js': ROOT / 'z/navigation.js',
        'assets/app.js': ROOT / 'z/app.js',
    }
    files = {'index.html': render().encode('utf-8'), '.nojekyll': b''}
    for dest, source in sources.items():
        if not source.is_file():
            raise ValueError(f'missing membrane dependency: {source.relative_to(ROOT)}')
        files[dest] = source.read_bytes()
    return files


def write_artifact(target):
    target = target.resolve()
    if target == ROOT.resolve() or target == DISPLAY.resolve():
        raise ValueError('artifact target must be outside living anatomy')
    if target.exists():
        if target.is_dir():
            shutil.rmtree(target)
        else:
            target.unlink()
    for relative, data in artifact_files().items():
        path = target / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)


def verify_artifact(target):
    target = target.resolve()
    expected = artifact_files()
    if not target.is_dir():
        raise ValueError(f'missing artifact directory: {target}')
    actual = {p.relative_to(target).as_posix():p.read_bytes() for p in target.rglob('*') if p.is_file()}
    if set(actual) != set(expected):
        raise ValueError(f'artifact file-set mismatch: {sorted(set(actual)^set(expected))}')
    for path, data in expected.items():
        if actual[path] != data:
            raise ValueError(f'stale artifact byte content: {path}')


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--artifact',type=Path,default=ROOT/'_site',help='Pages artifact directory')
    ap.add_argument('--check',action='store_true',help='verify an existing artifact without writing')
    args=ap.parse_args()
    target=args.artifact if args.artifact.is_absolute() else ROOT/args.artifact
    if args.check:
        verify_artifact(target)
        print('display membrane exactly matches current nested organ + host interfaces')
    else:
        write_artifact(target)
        size=sum(len(v) for v in artifact_files().values())
        print(f'built {target} ({size} bytes across {len(artifact_files())} files)')

if __name__=='__main__':
    main()
