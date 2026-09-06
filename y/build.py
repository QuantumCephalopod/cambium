#!/usr/bin/env python3
"""Compile the public skin from canonical phenotype + living tissue.
No network, package manager or external dependencies. INDEX.yaml stays minimal;
the richer browser registry is a derived projection, never a second anatomy.
"""
from pathlib import Path
import argparse
import html
import json
from urllib.parse import quote

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent if HERE.name == 'y' else HERE
GENES = 'wxzy'


def inputs():
    return {
        'index': ROOT / 'INDEX.yaml', 'cambium': ROOT / '_cambium.yaml',
        'copy': ROOT / 'x/contract.json', 'template': ROOT / 'w/template.html',
        'favicon': ROOT / 'w/favicon.svg'
    }


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


def validate_cambium(c):
    expected = {'4V': set(GENES), '6E': {'wx','wz','wy','xz','xy','zy'},
                '4F': {'wxz','wxy','wzy','xzy'}}
    if set(c) != {'4V','6E','4F','1T'}:
        raise ValueError('_cambium.yaml contains noncanonical fields')
    for rank, keys in expected.items():
        if not isinstance(c[rank], dict) or set(c[rank]) != keys:
            raise ValueError(f'_cambium.yaml {rank} is incomplete')
        if any(not isinstance(v, str) or not v.strip() for v in c[rank].values()):
            raise ValueError(f'_cambium.yaml {rank} contains an empty closure')
    if not isinstance(c['1T'], str) or not c['1T'].strip():
        raise ValueError('_cambium.yaml 1T is empty')


def leaf_tissue(path):
    folder = ROOT / path
    if not folder.is_dir():
        raise ValueError(f'missing realized address folder: {path}')
    result = {}
    for file in sorted(folder.iterdir(), key=lambda p: p.name):
        if file.is_file() and file.name != '_cambium.yaml' and not file.name.startswith('.'):
            carrier = file.relative_to(ROOT).as_posix()
            result[file.name] = carrier
    return result


def local_cambium(path):
    p = ROOT / path / '_cambium.yaml' if path else ROOT / '_cambium.yaml'
    if not p.is_file():
        raise ValueError(f'missing closed split anatomy: {p.relative_to(ROOT)}')
    data = load_yaml(p); validate_cambium(data); return data


def runtime_index():
    """Derive the richer browser registry without enlarging canonical INDEX.yaml."""
    phenotype = load_yaml(inputs()['index']); validate_index(phenotype)
    root_c = local_cambium('')
    root = {'name':'cambium', 'whole':root_c['1T'], 'tissue':{}}

    def build(node, path, inherited_whole):
        out = {'name':node['noun'].strip(), 'whole':inherited_whole, 'tissue':{}}
        children = [g for g in GENES if g in node]
        if children:
            c = local_cambium(path)
            if c['1T'] != inherited_whole:
                raise ValueError(f'{path} parent whole disagrees with local 1T')
            for g in children:
                out[g] = build(node[g], path + g, c['4V'][g])
        else:
            out['tissue'] = leaf_tissue(path)
        return out

    for g in GENES:
        root[g] = build(phenotype[g], g, root_c['4V'][g])
    return root


def render():
    files = inputs()
    copy = json.loads(files['copy'].read_text(encoding='utf-8'))
    index = runtime_index()
    for path, node in semantic_nodes(index):
        if path and path not in copy['organs']:
            raise ValueError(f'missing public interpretation for {path}')
        for carrier in node.get('tissue', {}).values():
            p = ROOT / carrier
            if not p.is_file():
                raise ValueError(f'missing derived tissue carrier: {carrier}')
    text = files['template'].read_text(encoding='utf-8')
    subs = {'EYEBROW':copy['eyebrow'],'PRACTICE_LABEL':copy['practice_label'],'PRACTICE':copy['practice'],
            'LOCATION':copy['location'],'FOOTER':copy['footer']}
    subs.update({f'HEAD{i}':s for i,s in enumerate(copy['headline'])})
    for key, value in subs.items(): text = text.replace('{{'+key+'}}', html.escape(value))
    icon = files['favicon'].read_text(encoding='utf-8')
    text = text.replace('{{FAVICON}}', 'data:image/svg+xml,' + quote(icon))
    payload = json.dumps({'index':index,'copy':copy}, ensure_ascii=False, separators=(',',':')).replace('<','\\u003c').replace('&','\\u0026')
    text = text.replace('/*__DATA__*/', payload)
    if '/*__' in text or '{{' in text: raise ValueError('unresolved template slot')
    return '<!-- generated from INDEX.yaml + _cambium.yaml + living w/x/z/y tissue by y/build.py; edit living sources, not this skin. -->\n'+text


def semantic_nodes(index):
    out=[]
    def walk(node,path=''):
        out.append((path,node))
        for g in GENES:
            if g in node: walk(node[g],path+g)
    walk(index);return out


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--check',action='store_true',help='fail if the checked-in skin is stale')
    ap.add_argument('--output',type=Path,help='write a self-contained preview outside the repo')
    args=ap.parse_args();target=args.output or ROOT/'index.html';result=render()
    if args.check:
        if not target.exists() or target.read_text(encoding='utf-8')!=result: raise SystemExit('stale skin: run python y/build.py')
        print('skin is a deterministic projection of minimal phenotype, closed cambium and living tissue')
    else:
        target.parent.mkdir(parents=True,exist_ok=True);target.write_text(result,encoding='utf-8')
        print(f'built {target} ({len(result.encode())} bytes)')
if __name__=='__main__':main()
