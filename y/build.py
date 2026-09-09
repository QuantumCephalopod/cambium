#!/usr/bin/env python3
"""Build the public Display membrane from the admitted main-root projection.

The repository is a publication carrier. The visitor-facing main page depicts the
current Self-Similar Systems root projection admitted into Display, while Display
itself remains an independently rooted unsplit organ.
"""
from pathlib import Path
import argparse
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


def _validate_display_node(node, path):
    required = {'noun','de','en','gene','one','children'}
    if not isinstance(node, dict) or set(node) != required:
        raise ValueError(f'main-root projection node {path} has unexpected fields')
    if not all(isinstance(node[k], str) and node[k].strip() for k in ('noun','de','en','gene')):
        raise ValueError(f'main-root projection node {path} is unnamed')
    if node['gene'] not in {'CREATE','COPY','CONTROL','CULTIVATE'}:
        raise ValueError(f'main-root projection node {path} has invalid CCCC gene')
    if not isinstance(node['one'], dict) or set(node['one']) != {'de','en'} or not all(
        isinstance(node['one'][k], str) and node['one'][k].strip() for k in ('de','en')):
        raise ValueError(f'main-root projection node {path} lacks bilingual encounter copy')
    if not isinstance(node['children'], dict):
        raise ValueError(f'main-root projection node {path} children must be a mapping')
    if node['children'] and set(node['children']) != set(GENES):
        raise ValueError(f'main-root projection node {path} invents a partial recursive rank')
    for gene in GENES:
        if gene in node['children']:
            _validate_display_node(node['children'][gene], path + gene)


def validate_root_projection(data):
    expected = {'source','root','occupancy','membranes','constitution'}
    if not isinstance(data, dict) or set(data) != expected:
        raise ValueError('w/display/main-root.json has an unexpected projection shape')
    source = data['source']
    if set(source) != {'organism','home','authority'} or source['organism'] != 'main-root':
        raise ValueError('main-root projection source identity is invalid')
    if source['authority'] != 'independently-rooted Drive organism':
        raise ValueError('main-root projection authority boundary is invalid')
    if not isinstance(source['home'], str) or not source['home'].startswith('main-root-'):
        raise ValueError('main-root projection needs a root HOME identity')
    root = data['root']
    if not isinstance(root, dict) or set(root) != {'noun','children'} or root['noun'] != 'Self-Similar Systems':
        raise ValueError('main-root projection root identity is invalid')
    if not isinstance(root['children'], dict) or set(root['children']) != set(GENES):
        raise ValueError('main-root projection must expose exactly the realized root 4V')
    gene_names = {'w':'CREATE','x':'COPY','z':'CONTROL','y':'CULTIVATE'}
    for gene in GENES:
        _validate_display_node(root['children'][gene], gene)
        if root['children'][gene]['gene'] != gene_names[gene]:
            raise ValueError(f'main-root projection {gene} remaps fixed CCCC DNA')
    constitution = data['constitution']
    validate_cambium(constitution, 'main-root projection constitution')
    for gene in GENES:
        if constitution['4V'][gene] != root['children'][gene]['noun']:
            raise ValueError(f'main-root projection {gene} diverges from constitution')
    occupancy = data['occupancy']
    if not isinstance(occupancy, dict) or set(occupancy) != set(GENES):
        raise ValueError('main-root occupancy must preserve four host loci')
    if any(not isinstance(v, list) or any(not isinstance(x,str) or not x for x in v) for v in occupancy.values()):
        raise ValueError('main-root occupancy contains invalid whole identity')
    membranes = data['membranes']
    if not isinstance(membranes, dict) or set(membranes) != {'provider','unresolved','stomach'}:
        raise ValueError('main-root membrane projection is invalid')
    if any(not isinstance(v,list) or any(not isinstance(x,str) or not x for x in v) for v in membranes.values()):
        raise ValueError('main-root membrane projection contains invalid boundary identity')
    return data


def root_projection():
    return validate_root_projection(json.loads((DISPLAY / 'main-root.json').read_text(encoding='utf-8')))


def render():
    data = root_projection()
    text = (DISPLAY / 'template.html').read_text(encoding='utf-8')
    marker = '/*__ROOT_DATA__*/'
    if text.count(marker) != 1:
        raise ValueError('display template must contain exactly one root projection slot')
    payload = json.dumps(data, ensure_ascii=False, separators=(',',':')).replace('<','\\u003c').replace('&','\\u0026')
    text = text.replace(marker, payload)
    if '/*__ROOT_DATA__*/' in text:
        raise ValueError('unresolved root projection slot')
    return '<!-- secreted from w/display/; public main depicts the admitted main-root projection. -->\n' + text


def artifact_files():
    sources = {
        'assets/root-view.css': DISPLAY / 'root-view.css',
        'assets/root-view.js': DISPLAY / 'root-view.js',
        'assets/navigation-physiology.js': DISPLAY / 'navigation-physiology.js',
        'assets/favicon.svg': DISPLAY / 'favicon.svg',
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
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--artifact', type=Path, default=ROOT/'_site', help='Pages artifact directory')
    ap.add_argument('--check', action='store_true', help='verify an existing artifact without writing')
    args = ap.parse_args()
    target = args.artifact if args.artifact.is_absolute() else ROOT/args.artifact
    if args.check:
        verify_artifact(target)
        print('display membrane exactly matches the admitted main-root WebGL projection')
    else:
        write_artifact(target)
        size = sum(len(v) for v in artifact_files().values())
        print(f'built {target} ({size} bytes across {len(artifact_files())} files)')


if __name__ == '__main__':
    main()
