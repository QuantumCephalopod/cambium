#!/usr/bin/env python3
"""Build one persistent public Display membrane from tree-addressed site-holons."""
from pathlib import Path
from hashlib import sha256
import argparse
import html
import importlib.util
import json
import re
from types import MappingProxyType

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
_artifact_spec = importlib.util.spec_from_file_location('cambium_artifact', HERE / 'artifact.py')
artifact = importlib.util.module_from_spec(_artifact_spec)
_artifact_spec.loader.exec_module(artifact)
DISPLAY = ROOT / 'w' / 'display'
SITE_ROOT = DISPLAY / 'y'
GENES = 'wxzy'
APERTURES = MappingProxyType({'w':'CREATE', 'x':'COPY', 'z':'CONTROL', 'y':'CULTIVATE'})
SITE_ID = re.compile(r'^[A-Za-z0-9][A-Za-z0-9:._-]{0,200}$')
UI_GRID_SCHEMA = 'sss.display.ui-grid.v2'
LIFECYCLE_ROLES = {'_stomach', '_feed', '_root', '_waste'}


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
    if set(index) != set(GENES):
        raise ValueError('root INDEX.yaml must contain exactly the realized w/x/z/y phenotype')
    pending = [(index[g], g) for g in reversed(GENES)]
    while pending:
        node, path = pending.pop()
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
        pending.extend((node[g], path + g) for g in reversed(children))


def display_loci():
    """Yield current realized Display semantic loci without crossing organism membranes."""
    index=load_yaml(DISPLAY/'INDEX.yaml'); validate_index(index)
    rows=[]
    pending=[(index[g],g,DISPLAY/g) for g in reversed(GENES)]
    while pending:
        node,address,folder=pending.pop()
        if not folder.is_dir():
            raise ValueError(f'Display phenotype locus {address} is missing at {folder.relative_to(ROOT)}')
        rows.append({'address':address,'folder':folder,'node':node})
        children=[g for g in GENES if g in node]
        for gene in reversed(children):
            child_address=address+gene
            pending.append((node[gene],child_address,folder/child_address))
    return rows


def display_dependencies():
    """Resolve direct foreign package occupants by stable identity through current Display anatomy."""
    found={}
    for locus in display_loci():
        address,folder,node=locus['address'],locus['folder'],locus['node']
        semantic_children={address+g for g in GENES if g in node}
        for child in sorted((p for p in folder.iterdir() if p.is_dir()),key=lambda p:p.name):
            if child.name in semantic_children or (child/'site.json').is_file():
                continue
            witness=child/'VERSION.json'
            if not witness.is_file():
                continue
            try:
                meta=json.loads(witness.read_text(encoding='utf-8'))
            except Exception as exc:
                raise ValueError(f'{witness.relative_to(ROOT)} is not valid JSON') from exc
            identity=meta.get('package')
            if not isinstance(identity,str) or not identity.strip():
                continue
            if identity in found:
                raise ValueError(f'duplicate Display dependency identity {identity}')
            version=meta.get('version')
            if not isinstance(version,str) or not version.strip():
                raise ValueError(f'{witness.relative_to(ROOT)} dependency {identity} lacks version')
            found[identity]={
                'identity':identity,
                'version':version,
                'address':address,
                'body':child,
                'slug':re.sub(r'[^A-Za-z0-9_-]+','-',identity).strip('-').lower(),
            }
    return found


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


def _inside(site_dir, relative, *, must_exist=True):
    if not isinstance(relative, str) or not relative or Path(relative).is_absolute():
        raise ValueError(f'{site_dir}: site member path must be relative')
    p = (site_dir / relative).resolve()
    try:
        p.relative_to(site_dir.resolve())
    except ValueError as exc:
        raise ValueError(f'{site_dir}: site member escaped holon body') from exc
    if must_exist and not p.is_file():
        raise ValueError(f'{site_dir}: missing site member {relative}')
    if not must_exist and (not p.parent.is_dir() or (p.exists() and not p.is_file())):
        raise ValueError(f'{site_dir}: invalid derived site member {relative}')
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
    required = {'version','id','title','local_scope','shader','manifestation','projection','renderer','style','ui_grid'}
    if not isinstance(data, dict) or not required <= set(data) or set(data) - required - {'feed_preview', 'build'} or data.get('version') != 2:
        raise ValueError(f'{site_dir.relative_to(ROOT)}/site.json: invalid v2 site-holon contract')
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
    allowed_manifestation = {'background_inspect','background_drag'}
    if (
        not isinstance(manifestation, dict)
        or 'background_inspect' not in manifestation
        or not set(manifestation) <= allowed_manifestation
        or not isinstance(manifestation['background_inspect'], bool)
        or ('background_drag' in manifestation and not isinstance(manifestation['background_drag'], bool))
    ):
        raise ValueError(f'{site_dir.relative_to(ROOT)}: invalid manifestation contract')
    if 'feed_preview' in data and (not isinstance(data['feed_preview'], str) or not data['feed_preview'].startswith('_feed/')):
        raise ValueError(f'{site_dir.relative_to(ROOT)}: feed_preview must be owned within local _feed')
    if 'build' in data:
        hook = data['build']
        if (not isinstance(hook, dict) or 'module' not in hook
                or set(hook) - {'module', 'witness'}
                or any(not isinstance(value, str) or not value for value in hook.values())):
            raise ValueError(f'{site_dir}: invalid owner build contract')
    return {
        **data,
        'manifestation': {
            **manifestation,
            'background_drag': manifestation.get('background_drag', True),
        },
    }


def _population_site_files():
    """Read admitted mount positions; never descend through an owned body."""
    if not SITE_ROOT.is_dir():
        raise ValueError('Display Population vertex/site-space is missing')
    if (SITE_ROOT / 'site.json').is_file():
        raise ValueError('Display Population is a mount container, not a site-holon body')
    site_files = []
    for child in sorted(p for p in SITE_ROOT.iterdir() if p.is_dir()):
        if child.name in LIFECYCLE_ROLES:
            continue
        if (child / 'site.json').is_file():
            site_files.append(child / 'site.json')
            continue
        name = child.name
        if len(name) >= 2 and name[0] == 'y' and all(c in GENES for c in name):
            direct = sorted(p / 'site.json' for p in child.iterdir()
                            if p.is_dir() and p.name not in LIFECYCLE_ROLES
                            and (p / 'site.json').is_file())
            if len(direct) != 1:
                raise ValueError(f'{child.relative_to(ROOT)}: address folder must contain exactly one direct site-holon')
            site_files.extend(direct)
            continue
        raise ValueError(f'{child.relative_to(ROOT)}: Population contains a non-holon/non-address directory')
    if not site_files:
        raise ValueError('Display Population has no site-holons')
    return site_files


def _build_common():
    """Only shared organism invariants cross into the source owner's build."""
    return MappingProxyType({'genes': GENES, 'apertures': APERTURES,
                             'load_yaml': load_yaml, 'validate_index': validate_index,
                             'validate_cambium': validate_cambium})


def _build_member_path(site, member):
    path = _inside(site['site_dir'], member)
    if path.suffix != '.py':
        raise ValueError(f"{site['id']}: owner build member must be Python")
    return path


def _load_build_member(site, member):
    path = _build_member_path(site, member)
    namespace = {'__file__': str(path), '__name__': 'site_build_' + sha256(str(path).encode()).hexdigest()[:16]}
    # Compile source afresh without writing bytecode into the movable body.
    exec(compile(path.read_bytes(), str(path), 'exec'), namespace)
    return namespace


def _owner_build(site):
    hook = site.get('build')
    if hook is None:
        return None
    for member in hook.values():
        _build_member_path(site, member)
    module = _load_build_member(site, hook['module'])
    if not callable(module.get('validate')):
        raise ValueError(f"{site['id']}: owner build must expose validate")
    if 'derive' in module and not callable(module['derive']):
        raise ValueError(f"{site['id']}: owner derive is not callable")
    return {key: module[key] for key in ('validate', 'derive') if key in module}


def witness_site_build(site):
    """Run the declared owner's independent evidence, without naming its schema."""
    if not site.get('build', {}).get('witness'):
        return False
    operations = _owner_build(site)
    module = _load_build_member(site, site['build']['witness'])
    if not callable(module.get('witness')):
        raise ValueError(f"{site['id']}: owner build evidence must expose witness")
    module['witness'](site['site_dir'], _build_common(), MappingProxyType(operations))
    return True


def witness_site_integration(site, capabilities):
    """Run optional owner-declared evidence against explicitly lent host resources."""
    if not site.get('build', {}).get('witness'):
        return False
    module = _load_build_member(site, site['build']['witness'])
    integration = module.get('integration')
    if integration is None:
        return False
    if not callable(integration):
        raise ValueError(f"{site['id']}: owner integration evidence is not callable")
    module['integration'](site['site_dir'], MappingProxyType(dict(capabilities)))
    return True


def derive_site_projection(identity=None):
    """Explicit owner derivation may repair its projection before normal discovery."""
    sites = _site_manifests()
    matches = [site for site in sites if site['id'] == identity] if identity is not None else [site for site in sites if site['address'] == '']
    if len(matches) != 1:
        raise ValueError(f'unknown site identity: {identity}')
    site = matches[0]
    owner = _owner_build(site)
    if owner is None or 'derive' not in owner:
        raise ValueError(f"{site['id']}: owner has no derive operation")
    projection = owner['derive'](site['site_dir'], _build_common())
    owner['validate'](projection, site['site_dir'], _build_common())
    payload = json.dumps(projection, ensure_ascii=False, indent=2) + '\n'
    path = _inside(site['site_dir'], site['projection'], must_exist=False)
    path.write_text(payload, encoding='utf-8')
    return path


def _site_manifests():
    found = []
    ids, addresses = set(), set()
    site_files = _population_site_files()
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
        found.append({**data, 'address': address, 'physical_address': physical, 'site_dir': site_dir})
    if len([site for site in found if site['address'] == '']) != 1:
        raise ValueError('Display site-space must contain exactly one overview site-holon')
    return sorted(found, key=lambda site: (len(site['address']), site['address'], site['id']))


def discover_sites():
    found = []
    for data in _site_manifests():
        site_dir, address, physical = data['site_dir'], data['address'], data['physical_address']
        projection_path = _inside(site_dir, data['projection'])
        renderer_path = _inside(site_dir, data['renderer'])
        style_path = _inside(site_dir, data['style'])
        ui_grid_path = _inside(site_dir, data['ui_grid'])
        ui_grid = json.loads(ui_grid_path.read_text(encoding='utf-8'))
        if not isinstance(ui_grid, dict) or ui_grid.get('schema') != UI_GRID_SCHEMA:
            raise ValueError(f'{site_dir.relative_to(ROOT)}: invalid canonical UI-grid carrier')
        projection = json.loads(projection_path.read_text(encoding='utf-8'))
        feed_preview = None
        if data.get('feed_preview'):
            preview_path = _inside(site_dir, data['feed_preview'])
            if preview_path.stat().st_size > 16384:
                raise ValueError(f'{site_dir.relative_to(ROOT)}: feed preview is not bounded')
            feed_preview = json.loads(preview_path.read_text(encoding='utf-8'))
            root = feed_preview.get('root') if isinstance(feed_preview, dict) else None
            if (feed_preview.get('schema') != 'sss.display.feed-preview.v1'
                    or feed_preview.get('identity') != data['id']
                    or not isinstance(root, dict)
                    or set(root.get('children', {})) != set(GENES)
                    or any(not isinstance(root['children'][g], dict)
                           or not isinstance(root['children'][g].get('noun'), str)
                           or not root['children'][g]['noun']
                           or root['children'][g].get('children') != {}
                           for g in GENES)):
                raise ValueError(f'{site_dir.relative_to(ROOT)}: invalid child-owned feed preview')
            if (site_dir / 'INDEX.yaml').is_file():
                index = load_yaml(site_dir / 'INDEX.yaml')
                if any(root['children'][g]['noun'] != index[g]['noun'] for g in GENES):
                    raise ValueError(f'{site_dir.relative_to(ROOT)}: feed preview drifted from local INDEX')
            elif isinstance(projection.get('phenotype'), dict):
                if any(root['children'][g]['noun'] != projection['phenotype'][g] for g in GENES):
                    raise ValueError(f'{site_dir.relative_to(ROOT)}: feed preview drifted from source phenotype')
        owner = _owner_build(data)
        if owner is not None:
            owner['validate'](projection, site_dir, _build_common())
        found.append({
            **data,
            'address': address,
            'physical_address': physical,
            'site_dir': site_dir,
            'projection_data': projection,
            'projection_path': projection_path,
            'feed_preview_data': feed_preview,
            'renderer_path': renderer_path,
            'style_path': style_path,
            'ui_grid_path': ui_grid_path,
            'ui_grid_data': ui_grid,
        })

    return found


def site_mounts(sites=None):
    sites = discover_sites() if sites is None else sites
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


def site_projections(sites=None):
    # Child-owned _feed capsules orient parents; detailed source crosses only on encounter.
    return {s['id']: s['feed_preview_data'] or s['projection_data'] for s in (discover_sites() if sites is None else sites)}


def site_feed_urls(bundle, sites=None):
    return {s['id']: f'assets/{bundle}/site-{_slug(s["id"])}-feed.json'
            for s in (discover_sites() if sites is None else sites) if s['feed_preview_data'] is not None}


def site_ui_grids(sites=None):
    return {s['id']: s['ui_grid_data'] for s in (discover_sites() if sites is None else sites)}


def _enc(v):
    return json.dumps(v, ensure_ascii=False, separators=(',',':')).replace('<','\\u003c').replace('&','\\u0026')


def _slug(site_id):
    return re.sub(r'[^A-Za-z0-9_-]+', '-', site_id).strip('-').lower()


def template_asset_sources(sites=None):
    """Template-linked Display assets plus identity-owned site tissue."""
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
        'site-fold-particles.js': DISPLAY/'z'/'site-fold-particles.js',
        'goo-material.js': DISPLAY/'w'/'goo-material.js',
        'locus-shader.js': DISPLAY/'w'/'locus-shader.js',
        'navigation-aperture.js': DISPLAY/'z'/'navigation-aperture.js',
        'display-safe-area.js': DISPLAY/'z'/'display-safe-area.js',
        'display-glass.js': DISPLAY/'z'/'display-glass.js',
        'display-lens.js': DISPLAY/'z'/'display-lens.js',
        'display-label-ink.js': DISPLAY/'w'/'display-label-ink.js',
        'ui-grid.js': DISPLAY/'w'/'ui-grid.js',
        'display-type.js': DISPLAY/'w'/'display-type.js',
        'display-text-tissue.js': DISPLAY/'w'/'display-text-tissue.js',
        'orthogonal-text.js': DISPLAY/'w'/'orthogonal-text.js',
        'representation-handoff.js': DISPLAY/'x'/'representation-handoff.js',
        'feed-acquisition.js': DISPLAY/'x'/'feed-acquisition.js',
        'recursive-fold.js': DISPLAY/'x'/'recursive-fold.js',
        'display-runtime-v2.js': DISPLAY/'x'/'display-runtime-v2.js',
        'favicon.svg': DISPLAY/'w'/'favicon.svg',
    }
    slugs = set()
    for site in (discover_sites() if sites is None else sites):
        slug = _slug(site['id'])
        if not slug or slug in slugs:
            raise ValueError(f'non-unique public site asset slug: {site["id"]}')
        slugs.add(slug)
        out[f'site-{slug}.css'] = site['style_path']
        out[f'site-{slug}.js'] = site['renderer_path']
    return out


def dependency_asset_sources(dependencies=None):
    out={}
    slugs=set()
    for identity,dep in sorted((display_dependencies() if dependencies is None else dependencies).items()):
        slug=dep['slug']
        if not slug or slug in slugs:
            raise ValueError(f'non-unique Display dependency slug for {identity}')
        slugs.add(slug)
        for source in sorted(dep['body'].rglob('*')):
            if source.is_symlink():
                raise ValueError(f'Display dependency may not contain symlink: {source.relative_to(ROOT)}')
            if source.is_file():
                rel=source.relative_to(dep['body']).as_posix()
                out[f'dependencies/{slug}/{rel}']=source
    return out


def asset_sources(sites=None, dependencies=None, template_sources=None):
    sites = discover_sites() if sites is None else sites
    out = dict(template_asset_sources(sites) if template_sources is None else template_sources)
    # Immutable detailed feed bytes are emitted separately, never inside the global HTML.
    for site in sites:
        if site['feed_preview_data'] is not None:
            out[f'site-{_slug(site["id"])}-feed.json'] = site['projection_path']
    for name,source in dependency_asset_sources(dependencies).items():
        if name in out:
            raise ValueError(f'Display dependency asset collides with membrane asset: {name}')
        out[name]=source
    return out


def dependency_projection(bundle, dependencies=None):
    return {
        identity:{'version':dep['version'],'base':f'assets/{bundle}/dependencies/{dep["slug"]}/'}
        for identity,dep in sorted((display_dependencies() if dependencies is None else dependencies).items())
    }


# Strip only structural JSON whitespace: strings and number lexemes stay exact.
_JSON_TRANSPORT = re.compile(rb'("(?:[^"\\]|\\.)*")|[ \t\r\n]+')

def json_transport(data):
    return _JSON_TRANSPORT.sub(lambda match: match.group(1) or b'', data)


def _asset_bytes(sources):
    assets = {}
    for name, source in sources.items():
        if not source.is_file():
            raise ValueError(f'missing membrane dependency: {source.relative_to(ROOT)}')
        data = source.read_bytes()
        assets[name] = json_transport(data) if name.endswith('.json') else data
    return assets


def _bundle_id(assets):
    h = sha256()
    for name, data in sorted(assets.items()):
        h.update(name.encode('utf-8')); h.update(b'\0'); h.update(data); h.update(b'\0')
    return h.hexdigest()[:16]


def asset_bundle_id():
    return _bundle_id(_asset_bytes(asset_sources()))


def _site_surfaces(sites=None):
    rows = []
    for site in (discover_sites() if sites is None else sites):
        sid = html.escape(site['id'], quote=True)
        title = html.escape(site['title'], quote=True)
        rows.append(
            f'  <section class="interlocutor" data-interlocutor="{sid}" hidden>'
            f'<canvas class="interlocutor-background" aria-label="{title} local tetrahedral background"></canvas>'
            f'<div class="interlocutor-field-labels"></div>'
            f'<div class="interlocutor-content"></div></section>'
        )
    return '\n'.join(rows)


def _site_style_links(sites=None):
    return '\n'.join(
        f'<link rel="stylesheet" href="assets/site-{_slug(s["id"])}.css">'
        for s in (discover_sites() if sites is None else sites)
    )


def _site_script_tags(sites=None):
    return '\n'.join(
        f'<script src="assets/site-{_slug(s["id"])}.js"></script>'
        for s in (discover_sites() if sites is None else sites)
    )


def render(sites=None, *, bundle=None, template_sources=None, dependencies=None):
    sites = discover_sites() if sites is None else sites
    dependencies = display_dependencies() if dependencies is None else dependencies
    template_sources = template_asset_sources(sites) if template_sources is None else template_sources
    text = (DISPLAY/'w'/'template.html').read_text(encoding='utf-8')
    if bundle is None:
        bundle = _bundle_id(_asset_bytes(asset_sources(sites, dependencies, template_sources)))
    replacements = {
        '/*__INTERLOCUTOR_SURFACES__*/': _site_surfaces(sites),
        '/*__SITE_STYLES__*/': _site_style_links(sites),
        '/*__SITE_REGISTRY__*/': _enc(site_mounts(sites)),
        '/*__SITE_PROJECTIONS__*/': _enc(site_projections(sites)),
        '/*__SITE_FEED_URLS__*/': _enc(site_feed_urls(bundle, sites)),
        '/*__SITE_UI_GRIDS__*/': _enc(site_ui_grids(sites)),
        '/*__DISPLAY_DEPENDENCIES__*/': _enc(dependency_projection(bundle, dependencies)),
        '/*__SITE_SCRIPTS__*/': _site_script_tags(sites),
    }
    for marker, value in replacements.items():
        if text.count(marker) != 1:
            raise ValueError(f'display template must contain exactly one {marker} slot')
        text = text.replace(marker, value)

    for name in template_sources:
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


def artifact_files(sites=None):
    # One operation owns this acquired source state. Nothing survives into the next
    # invocation, derivation or source mutation; callers must not retain these rows.
    sites = discover_sites() if sites is None else sites
    dependencies = display_dependencies()
    template_sources = template_asset_sources(sites)
    assets = _asset_bytes(asset_sources(sites, dependencies, template_sources))
    bundle = _bundle_id(assets)
    files = {'index.html': render(sites, bundle=bundle, template_sources=template_sources,
                                 dependencies=dependencies).encode('utf-8'), '.nojekyll': b''}
    files.update((f'assets/{bundle}/{name}', data) for name, data in assets.items())
    return files


def write_artifact(target):
    return artifact.replace(target, ROOT, artifact_files)


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
    return expected


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--artifact', type=Path, default=ROOT/'_site', help='disposable _site directory or an explicit directory outside the repository')
    ap.add_argument('--check', action='store_true')
    derivation = ap.add_mutually_exclusive_group()
    derivation.add_argument('--derive-site-projection', metavar='IDENTITY', help='derive the declared projection through its source owner')
    derivation.add_argument('--derive-root-projection', action='store_true', help='derive the current overview through its source owner')
    args = ap.parse_args()
    if args.derive_site_projection is not None or args.derive_root_projection:
        path = derive_site_projection(args.derive_site_projection)
        print(f'derived {path.relative_to(ROOT)}'); return
    target = args.artifact if args.artifact.is_absolute() else ROOT/args.artifact
    if args.check:
        files = verify_artifact(target)
        print(f'display membrane exactly matches {len(files)} files')
    else:
        files = write_artifact(target)
        print(f'built {target} ({sum(map(len,files.values()))} bytes across {len(files)} files)')


if __name__ == '__main__':
    main()
