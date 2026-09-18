#!/usr/bin/env python3
"""Build one persistent public Display membrane from tree-addressed site-holons."""
from pathlib import Path
from hashlib import sha256
import argparse
import html
import json
import re
import shutil

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
DISPLAY = ROOT / 'w' / 'display'
SITE_ROOT = DISPLAY / 'y'
GENES = 'wxzy'
SITE_ID = re.compile(r'^[A-Za-z0-9][A-Za-z0-9:._-]{0,200}$')


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
    expected = {
        '4V': set(GENES),
        '6E': {'wx','wz','wy','xz','xy','zy'},
        '4F': {'wxz','wxy','wzy','xzy'},
    }
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
        raise ValueError(f'Philosophy projection node {path} has unexpected fields')
    if not all(isinstance(node[k], str) and node[k].strip() for k in ('noun','de','en','gene')):
        raise ValueError(f'Philosophy projection node {path} is unnamed')
    if node['gene'] not in {'CREATE','COPY','CONTROL','CULTIVATE'}:
        raise ValueError(f'Philosophy projection node {path} has invalid CCCC gene')
    if not isinstance(node['one'], dict) or set(node['one']) != {'de','en'}:
        raise ValueError(f'Philosophy projection node {path} lacks bilingual encounter copy')
    if not isinstance(node['children'], dict):
        raise ValueError(f'Philosophy projection node {path} children must be a mapping')
    if node['children'] and set(node['children']) != set(GENES):
        raise ValueError(f'Philosophy projection node {path} invents a partial recursive rank')
    for gene in GENES:
        if gene in node['children']:
            _validate_display_node(node['children'][gene], path + gene)


def validate_root_projection(data):
    expected = {'source','root','occupancy','membranes','constitution'}
    if not isinstance(data, dict) or set(data) != expected:
        raise ValueError('Philosophy projection has an unexpected shape')
    source = data['source']
    if set(source) != {'organism','home','authority'} or source['organism'] != 'main-root':
        raise ValueError('Philosophy projection source identity is invalid')
    root = data['root']
    if not isinstance(root, dict) or set(root) != {'noun','children'} or root['noun'] != 'Self-Similar Systems':
        raise ValueError('Philosophy projection root identity is invalid')
    if set(root['children']) != set(GENES):
        raise ValueError('Philosophy projection must expose exactly realized root 4V')
    names = {'w':'CREATE','x':'COPY','z':'CONTROL','y':'CULTIVATE'}
    for gene in GENES:
        _validate_display_node(root['children'][gene], gene)
        if root['children'][gene]['gene'] != names[gene]:
            raise ValueError(f'Philosophy projection {gene} remaps fixed CCCC DNA')
    validate_cambium(data['constitution'], 'Philosophy projection constitution')
    if set(data['occupancy']) != set(GENES):
        raise ValueError('Philosophy projection occupancy must preserve four host loci')
    return data


def validate_papers_projection(data):
    if data.get('source') != 'papers/_feed':
        raise ValueError('Papers projection source boundary changed')
    if set(data.get('phenotype', {})) != set(GENES) or set(data.get('groups', {})) != set(GENES):
        raise ValueError('Papers projection must expose realized local root 4V')
    for gene in GENES:
        if not isinstance(data['phenotype'][gene], str) or not data['phenotype'][gene]:
            raise ValueError('Papers phenotype contains an empty locus')
        if not isinstance(data['groups'][gene], list):
            raise ValueError('Papers group is not a list')
        for item in data['groups'][gene]:
            if set(item) != {'id','title'}:
                raise ValueError('Papers projection crossed its public boundary')
    return data


def _inside(site_dir, relative):
    if not isinstance(relative, str) or not relative or Path(relative).is_absolute():
        raise ValueError(f'{site_dir}: site member path must be relative')
    p = (site_dir / relative).resolve()
    try:
        p.relative_to(site_dir.resolve())
    except ValueError as exc:
        raise ValueError(f'{site_dir}: site member escaped holon body') from exc
    if not p.is_file():
        raise ValueError(f'{site_dir}: missing site member {relative}')
    return p


def _site_address(site_dir):
    parent = site_dir.parent
    if parent == SITE_ROOT:
        return '', 'y'
    if parent.parent != SITE_ROOT:
        raise ValueError(f'{site_dir.relative_to(ROOT)}: site-holon must be direct at overview or inside one absolute address folder')
    physical = parent.name
    if len(physical) < 2 or physical[0] != 'y' or any(c not in GENES for c in physical):
        raise ValueError(f'{parent.relative_to(ROOT)}: invalid Display Population address folder')
    return physical[1:], physical


def _validate_site_manifest(site_dir, data):
    required = {'version','id','title','local_scope','shader','manifestation','projection','renderer','style'}
    if not isinstance(data, dict) or set(data) != required or data.get('version') != 1:
        raise ValueError(f'{site_dir.relative_to(ROOT)}/site.json: invalid v1 site-holon contract')
    if not isinstance(data['id'], str) or not SITE_ID.match(data['id']):
        raise ValueError(f'{site_dir.relative_to(ROOT)}: invalid interlocutor identity')
    if not isinstance(data['title'], str) or not data['title'].strip():
        raise ValueError(f'{site_dir.relative_to(ROOT)}: missing site title')
    if not isinstance(data['local_scope'], str) or not SITE_ID.match(data['local_scope']):
        raise ValueError(f'{site_dir.relative_to(ROOT)}: invalid local scope')
    shader = data['shader']
    if not isinstance(shader, dict) or set(shader) != {'id','palette'} or not SITE_ID.match(str(shader.get('id',''))):
        raise ValueError(f'{site_dir.relative_to(ROOT)}: invalid shader contract')
    palette = shader['palette']
    if not isinstance(palette, list) or len(palette) != 3 or any(not isinstance(v, (int,float)) for v in palette):
        raise ValueError(f'{site_dir.relative_to(ROOT)}: shader palette must contain three numbers')
    manifestation = data['manifestation']
    if not isinstance(manifestation, dict) or set(manifestation) != {'background_inspect'} or not isinstance(manifestation['background_inspect'], bool):
        raise ValueError(f'{site_dir.relative_to(ROOT)}: invalid manifestation contract')
    return data


def discover_sites():
    if not SITE_ROOT.is_dir():
        raise ValueError('Display Population vertex/site-space is missing')
    found = []
    ids, addresses = set(), set()
    site_files = sorted(SITE_ROOT.rglob('site.json'))
    if not site_files:
        raise ValueError('Display Population has no site-holons')
    for site_file in site_files:
        site_dir = site_file.parent
        address, physical = _site_address(site_dir)
        if any(c not in GENES for c in address):
            raise ValueError(f'{site_dir.relative_to(ROOT)}: site address violates tetrahedral alphabet')
        data = _validate_site_manifest(site_dir, json.loads(site_file.read_text(encoding='utf-8')))
        if data['id'] in ids:
            raise ValueError(f'duplicate site identity: {data["id"]}')
        if address in addresses:
            raise ValueError(f'exact raw site address already occupied: {address or "ε"}; differentiate before admitting another holon')
        ids.add(data['id']); addresses.add(address)
        projection_path = _inside(site_dir, data['projection'])
        renderer_path = _inside(site_dir, data['renderer'])
        style_path = _inside(site_dir, data['style'])
        projection = json.loads(projection_path.read_text(encoding='utf-8'))
        if data['id'] == 'organism:philosophy':
            validate_root_projection(projection)
        elif data['id'] == 'organism:papers':
            validate_papers_projection(projection)
        found.append({
            **data,
            'address': address,
            'physical_address': physical,
            'site_dir': site_dir,
            'projection_data': projection,
            'renderer_path': renderer_path,
            'style_path': style_path,
        })

    roots = [s for s in found if s['address'] == '']
    if len(roots) != 1:
        raise ValueError('Display site-space must contain exactly one overview site-holon')

    # Address folders are actual population, never empty potential geometry.
    for child in sorted(p for p in SITE_ROOT.iterdir() if p.is_dir()):
        if (child/'site.json').is_file():
            continue
        name = child.name
        if len(name) >= 2 and name[0] == 'y' and all(c in GENES for c in name):
            direct = [p for p in child.iterdir() if p.is_dir() and (p/'site.json').is_file()]
            if len(direct) != 1:
                raise ValueError(f'{child.relative_to(ROOT)}: address folder must contain exactly one direct site-holon')
            continue
        raise ValueError(f'{child.relative_to(ROOT)}: Population contains a non-holon/non-address directory')

    return sorted(found, key=lambda s: (len(s['address']), s['address'], s['id']))


def root_projection():
    site = next((s for s in discover_sites() if s['id'] == 'organism:philosophy'), None)
    if not site:
        raise ValueError('Philosophy site-holon missing')
    return site['projection_data']


def papers_projection():
    site = next((s for s in discover_sites() if s['id'] == 'organism:papers'), None)
    if not site:
        raise ValueError('Papers site-holon missing')
    return site['projection_data']


def site_mounts():
    sites = discover_sites()
    return {
        'version': 3,
        'source': 'w/display/y tree',
        'interlocutors': [
            {
                'id': s['id'],
                'title': s['title'],
                'local_scope': s['local_scope'],
                'shader': s['shader'],
                'manifestation': s['manifestation'],
            }
            for s in sites
        ],
        'mounts': [
            {'interlocutor': s['id'], 'scope': 'main', 'address': s['address']}
            for s in sites
        ],
    }


def site_projections():
    return {s['id']: s['projection_data'] for s in discover_sites()}


def _enc(v):
    return json.dumps(v, ensure_ascii=False, separators=(',',':')).replace('<','\\u003c').replace('&','\\u0026')


def _slug(site_id):
    return re.sub(r'[^A-Za-z0-9_-]+', '-', site_id).strip('-').lower()


def asset_sources():
    """One immutable membrane-generation asset set, including identity-owned site tissue."""
    out = {
        'root-view.css': DISPLAY/'w'/'root-view.css',
        'site-runtime.css': DISPLAY/'z'/'site-runtime.css',
        'interlocutors.css': DISPLAY/'w'/'interlocutors.css',
        'navigation-aperture.css': DISPLAY/'z'/'navigation-aperture.css',
        'display-safe-area.css': DISPLAY/'z'/'display-safe-area.css',
        'world-view.js': DISPLAY/'z'/'world-view.js',
        'navigation-physiology.js': DISPLAY/'z'/'navigation-physiology.js',
        'address.js': ROOT/'z'/'address.js',
        'site-holon.js': DISPLAY/'x'/'site-holon.js',
        'site-fold.js': DISPLAY/'z'/'site-fold.js',
        'locus-shader.js': DISPLAY/'w'/'locus-shader.js',
        'navigation-aperture.js': DISPLAY/'z'/'navigation-aperture.js',
        'display-safe-area.js': DISPLAY/'z'/'display-safe-area.js',
        'display-runtime-v2.js': DISPLAY/'x'/'display-runtime-v2.js',
        'favicon.svg': DISPLAY/'w'/'favicon.svg',
    }
    slugs = set()
    for site in discover_sites():
        slug = _slug(site['id'])
        if not slug or slug in slugs:
            raise ValueError(f'non-unique public site asset slug: {site["id"]}')
        slugs.add(slug)
        out[f'site-{slug}.css'] = site['style_path']
        out[f'site-{slug}.js'] = site['renderer_path']
    return out


def asset_bundle_id():
    h = sha256()
    for name, source in sorted(asset_sources().items()):
        if not source.is_file():
            raise ValueError(f'missing membrane dependency: {source.relative_to(ROOT)}')
        data = source.read_bytes()
        h.update(name.encode('utf-8')); h.update(b'\0'); h.update(data); h.update(b'\0')
    return h.hexdigest()[:16]


def _site_surfaces():
    rows = []
    for site in discover_sites():
        sid = html.escape(site['id'], quote=True)
        title = html.escape(site['title'], quote=True)
        rows.append(
            f'  <section class="interlocutor" data-interlocutor="{sid}" hidden>'
            f'<canvas class="interlocutor-background" aria-label="{title} local tetrahedral background"></canvas>'
            f'<div class="interlocutor-field-labels" aria-hidden="true"></div>'
            f'<div class="interlocutor-content"></div></section>'
        )
    return '\n'.join(rows)


def _site_style_links():
    return '\n'.join(
        f'<link rel="stylesheet" href="assets/site-{_slug(s["id"])}.css">'
        for s in discover_sites()
    )


def _site_script_tags():
    return '\n'.join(
        f'<script src="assets/site-{_slug(s["id"])}.js"></script>'
        for s in discover_sites()
    )


def render():
    text = (DISPLAY/'w'/'template.html').read_text(encoding='utf-8')
    replacements = {
        '/*__INTERLOCUTOR_SURFACES__*/': _site_surfaces(),
        '/*__SITE_STYLES__*/': _site_style_links(),
        '/*__SITE_REGISTRY__*/': _enc(site_mounts()),
        '/*__SITE_PROJECTIONS__*/': _enc(site_projections()),
        '/*__SITE_SCRIPTS__*/': _site_script_tags(),
    }
    for marker, value in replacements.items():
        if text.count(marker) != 1:
            raise ValueError(f'display template must contain exactly one {marker} slot')
        text = text.replace(marker, value)

    bundle = asset_bundle_id()
    for name in asset_sources():
        flat = f'assets/{name}'
        # Asset rewriting is an HTML-reference operation, not a free-text
        # substitution. Site projections intentionally contain arbitrary observed
        # web traffic, including paths such as /assets/root-view.css; those bytes
        # must never be mistaken for Display template asset references.
        pattern = re.compile(
            r"(?P<attr>\b(?:href|src)=)(?P<quote>['\"])"
            + re.escape(flat)
            + r"(?P=quote)"
        )
        matches = list(pattern.finditer(text))
        if len(matches) != 1:
            raise ValueError(f'display template must reference exactly one {flat}')
        text = pattern.sub(
            lambda m: f'{m.group("attr")}{m.group("quote")}assets/{bundle}/{name}{m.group("quote")}',
            text,
            count=1,
        )

    return (
        f'<!-- membrane bundle {bundle}; tree-addressed Display generation; '
        'physical Population anatomy is the mount truth. -->\n' + text
    )


def artifact_files():
    bundle = asset_bundle_id()
    files = {'index.html': render().encode('utf-8'), '.nojekyll': b''}
    for name, source in asset_sources().items():
        files[f'assets/{bundle}/{name}'] = source.read_bytes()
    return files


def write_artifact(target):
    target = target.resolve()
    if target in (ROOT.resolve(), DISPLAY.resolve()):
        raise ValueError('artifact target must be outside living anatomy')
    if target.exists():
        shutil.rmtree(target) if target.is_dir() else target.unlink()
    for rel, data in artifact_files().items():
        path = target/rel; path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(data)


def verify_artifact(target):
    target = target.resolve(); expected = artifact_files()
    if not target.is_dir():
        raise ValueError(f'missing artifact directory: {target}')
    actual = {p.relative_to(target).as_posix(): p.read_bytes() for p in target.rglob('*') if p.is_file()}
    if set(actual) != set(expected):
        raise ValueError(f'artifact file-set mismatch: {sorted(set(actual)^set(expected))}')
    for path, data in expected.items():
        if actual[path] != data:
            raise ValueError(f'stale artifact byte content: {path}')


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--artifact', type=Path, default=ROOT/'_site')
    ap.add_argument('--check', action='store_true')
    args = ap.parse_args()
    target = args.artifact if args.artifact.is_absolute() else ROOT/args.artifact
    if args.check:
        verify_artifact(target); print(f'display membrane exactly matches bundle {asset_bundle_id()}')
    else:
        write_artifact(target); files = artifact_files()
        print(f'built {target} bundle={asset_bundle_id()} ({sum(map(len,files.values()))} bytes across {len(files)} files)')


if __name__ == '__main__':
    main()
