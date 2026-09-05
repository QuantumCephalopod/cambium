#!/usr/bin/env python3
"""Compile the public skin. No network, package manager or external dependencies.
The output is a projection, not a second source of content or navigation truth.
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
    split = (ROOT / 'w').is_dir()
    def p(name, arm): return ROOT / arm / name if split else ROOT / name
    return {
        'index': ROOT / ('INDEX.json' if split else 'index-flat.json'),
        'copy': p('contract.json', 'x'), 'specimen': p('specimen.json', 'y'),
        'template': p('template.html', 'w'), 'style': p('style.css', 'w'),
        'favicon': p('favicon.svg', 'w'), 'address': p('address.js', 'z'),
        'navigation': p('navigation.js', 'z'), 'view': p('view.js', 'w'), 'app': p('app.js', 'z')
    }


def semantic_nodes(index):
    """Return (raw_address, semantic_object) in recursive address order."""
    out = []
    def walk(node, path=''):
        if not isinstance(node, dict):
            raise ValueError(f'{path or "root"} is not a semantic object')
        if not isinstance(node.get('name'), str) or not node['name'].strip():
            raise ValueError(f'{path or "root"} needs an atomic semantic name')
        if not isinstance(node.get('whole'), str) or not node['whole'].strip():
            raise ValueError(f'{path or "root"} needs its current semantic whole')
        children = [g for g in GENES if g in node]
        if children and len(children) != 4:
            raise ValueError(f'{path or "root"} has an incomplete CCCC differentiation')
        tissue = node.get('tissue', {})
        if not isinstance(tissue, dict):
            raise ValueError(f'{path or "root"} tissue must be a semantic carrier map')
        for name, carrier in tissue.items():
            if not isinstance(name, str) or not name.strip() or not isinstance(carrier, str) or not carrier.strip():
                raise ValueError(f'{path or "root"} has malformed tissue')
        out.append((path, node))
        for g in children:
            walk(node[g], path + g)
    walk(index)
    return out


def validate_carrier(carrier):
    p = Path(carrier)
    if p.is_absolute() or '..' in p.parts or ':' in str(p) or not (ROOT / p).is_file():
        raise ValueError(f'invalid or missing tissue path: {p}')


def validate_shell(index):
    for key in ('_stomach', '_waste', 'SKILLS'):
        shell = index.get(key)
        if not isinstance(shell, dict) or not isinstance(shell.get('whole'), str) or not shell['whole'].strip():
            raise ValueError(f'missing semantic shell orientation for {key}')
        tissue = shell.get('tissue', {})
        if not isinstance(tissue, dict):
            raise ValueError(f'{key} tissue must be a semantic carrier map')
        for carrier in tissue.values():
            validate_carrier(carrier)


def render():
    files = inputs()
    data = {k: json.loads(files[k].read_text(encoding='utf-8')) for k in ('index', 'copy')}
    nodes = semantic_nodes(data['index'])
    validate_shell(data['index'])
    for path, node in nodes:
        if path and path not in data['copy']['organs']:
            raise ValueError(f'missing public interpretation for {path}')
        for carrier in node.get('tissue', {}).values():
            validate_carrier(carrier)
    text = files['template'].read_text(encoding='utf-8')
    copy = data['copy']
    subs = {'EYEBROW':copy['eyebrow'],'PRACTICE_LABEL':copy['practice_label'],'PRACTICE':copy['practice'],
            'LOCATION':copy['location'],'FOOTER':copy['footer']}
    subs.update({f'HEAD{i}':s for i,s in enumerate(copy['headline'])})
    for key, value in subs.items(): text = text.replace('{{'+key+'}}', html.escape(value))
    icon = files['favicon'].read_text(encoding='utf-8')
    text = text.replace('{{FAVICON}}', 'data:image/svg+xml,' + quote(icon))
    payload = json.dumps(data, ensure_ascii=False, separators=(',',':')).replace('<','\\u003c').replace('&','\\u0026')
    text = text.replace('/*__DATA__*/', payload)
    for k in ('style','address','navigation','view','app'):
        body = files[k].read_text(encoding='utf-8')
        if k!='style' and '</script' in body.lower(): raise ValueError('unsafe inline script delimiter')
        text=text.replace('/*__'+k.upper()+'__*/',body)
    if '/*__' in text or '{{' in text: raise ValueError('unresolved template slot')
    return '<!-- generated from w/x/z/y by y/build.py; edit source tissue, not this skin. -->\n'+text


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--check',action='store_true',help='fail if the checked-in skin is stale')
    ap.add_argument('--output',type=Path,help='write a self-contained preview outside the repo')
    args=ap.parse_args()
    target=args.output or ROOT/'index.html'; result=render()
    if args.check:
        if not target.exists() or target.read_text(encoding='utf-8')!=result: raise SystemExit('stale skin: run python y/build.py')
        print('skin is a deterministic projection of the current semantic organism')
    else:
        target.parent.mkdir(parents=True,exist_ok=True);target.write_text(result,encoding='utf-8')
        print(f'built {target} ({len(result.encode())} bytes)')
if __name__=='__main__':main()
