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


def render():
    files = inputs()
    data = {k: json.loads(files[k].read_text(encoding='utf-8')) for k in ('index', 'copy')}
    for n in data['index']['nodes']:
        if n['path'] and n['path'] not in data['copy']['organs']:
            raise ValueError(f'missing public interpretation for {n["path"]}')
    for f in data['index'].get('files', []):
        p = Path(f['path'])
        if p.is_absolute() or '..' in p.parts or ':' in str(p) or not (ROOT / p).is_file():
            raise ValueError(f'invalid or missing tissue path: {p}')
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


def render_index(index):
    lines = ['# index — cambium', '',
      '> generated from `INDEX.json`; edit the living atlas, not this projection.', '',
      '## current whole', '',
      'the website has one realized root split and four unsplit living limbs. the root is navigation wood. the first semantic receipt is [`ROOT_SPLIT.md`](ROOT_SPLIT.md).', '',
      '`w = CREATE · x = COPY · z = CONTROL · y = CULTIVATE`', '',
      'the generated `index.html` is the outward skin, not an independently authored root content chamber. no upload or public launch is asserted.', '',
      '## complete body atlas', '']
    for n in index['nodes'][1:]:
        lines += [f"### {n['path']} — {n['name']}", '',
          f"gene: {n['gene'].lower()} · locus: `{n['locus']}` · parent: root · children: none · state: living unsplit cambium", '',
          '| stable occupant | current carrier | role |', '|---|---|---|']
        for f in index['files']:
            if f['id'] in n['occupants']:
                lines.append(f"| `{f['id']}` | [{f['path']}]({f['path']}) | {f['role']} |")
        lines.append('')
    lines += ['## shell and substrate', '', '| surface | role |', '|---|---|']
    for item in index['shell']:
        path=item['path']; lines.append(f"| [{path}]({path}) | {item['role']} |")
    lines += ['', '## geometry and semantic restraint', '',
      'one public navigator reads only the realized atlas. every visible step takes its noun from its full-prefix record, not a gene-label substitution. exact address identity is independent of camera pose. the geometry specimen stays in renewal tests and is not embedded in the public skin.', '',
      'there is no second website split. named dual ancestry appears only where the atlas contains both realized witnesses. tests exercise deeper named paths without publishing fabricated branches.', '',
      '## frontier', '', index['frontier']['positive']+'.', '',
      index['frontier']['next']+'.', '',
      'open: public contact, legal/privacy review, licensing, app write authorization, commit/readback, Pages and DNS/HTTPS verification. [`_stomach/launch.md`](_stomach/launch.md) owns that unresolved intake.', '',
      'scope of checks: exact finite addresses, generated-body consistency and browser interactions. not a proof of the dense-carrier compass and not a full accessibility/security/legal audit.', '']
    return '\n'.join(lines)


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--check',action='store_true',help='fail if the checked-in skin is stale')
    ap.add_argument('--output',type=Path,help='write a self-contained preview outside the repo')
    args=ap.parse_args()
    target=args.output or ROOT/'index.html'; result=render()
    if args.check:
        if not target.exists() or target.read_text(encoding='utf-8')!=result: raise SystemExit('stale skin: run python y/build.py')
        print('skin is a deterministic projection of the current sources')
        if (ROOT / 'INDEX.json').exists() and (ROOT/'INDEX.md').read_text(encoding='utf-8') != render_index(json.loads((ROOT/'INDEX.json').read_text())):
            raise SystemExit('stale human atlas')
    else:
        target.parent.mkdir(parents=True,exist_ok=True);target.write_text(result,encoding='utf-8')
        if not args.output and (ROOT/'INDEX.json').exists():
            (ROOT/'INDEX.md').write_text(render_index(json.loads((ROOT/'INDEX.json').read_text())),encoding='utf-8')
        print(f'built {target} ({len(result.encode())} bytes)')
if __name__=='__main__':main()
