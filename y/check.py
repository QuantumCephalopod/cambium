#!/usr/bin/env python3
"""Structural witness for the current main-root WebGL display membrane."""
from pathlib import Path
import argparse
import html.parser
import importlib.util
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parent.parent
DISPLAY = ROOT / 'w' / 'display'
count = 0


def check(condition, why):
    global count
    count += 1
    if not condition:
        raise AssertionError(why)


class Page(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(); self.ids=[]; self.scripts=[]; self.links=[]
    def handle_starttag(self, tag, attrs):
        d=dict(attrs)
        if 'id' in d: self.ids.append(d['id'])
        if tag == 'script': self.scripts.append(d)
        if tag == 'link': self.links.append(d)


def load_build():
    path=ROOT/'y/build.py'
    spec=importlib.util.spec_from_file_location('compose', path)
    mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); return mod


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--artifact', type=Path, default=ROOT/'_site')
    args=ap.parse_args()
    artifact=args.artifact if args.artifact.is_absolute() else ROOT/args.artifact
    build=load_build()

    check((DISPLAY/'INDEX.yaml').read_text(encoding='utf-8').strip()=='{}', 'display internal phenotype must remain unsplit')
    check(not (DISPLAY/'_cambium.yaml').exists(), 'display falsely claims an internal semantic split')
    check((DISPLAY/'RITUALS/organism/RITUAL.md').is_file(), 'display organism ritual missing')
    check((DISPLAY/'RITUALS/navigation/RITUAL.md').is_file(), 'display navigation ritual missing')
    check((DISPLAY/'navigation-physiology.js').is_file(), 'navigation physiology core missing')
    check((DISPLAY/'navigation-physiology.test.cjs').is_file(), 'navigation physiology witness missing')

    projection=build.root_projection()
    check(projection['source']['organism']=='main-root', 'public projection is not main-root')
    check(projection['source']['home'].startswith('main-root-cambium-split-'), 'public projection lacks root split HOME')
    check([projection['root']['children'][g]['noun'] for g in 'wxzy']==['Form','Continuity','Care','Inquiry'], 'public 4V diverges from Drive root')
    check([projection['root']['children'][g]['gene'] for g in 'wxzy']==['CREATE','COPY','CONTROL','CULTIVATE'], 'public CCCC mapping changed')
    check(projection['constitution']['4V']=={'w':'Form','x':'Continuity','z':'Care','y':'Inquiry'}, 'projection constitution 4V mismatch')
    check(projection['occupancy']=={'w':['morphogenetic-painting'],'x':['ternary','mnemos-autobiography'],'z':['regeneration'],'y':['papers']}, 'root organ placement projection changed')
    check(projection['membranes']=={'provider':['Google AI Studio'],'unresolved':['muses'],'stomach':['legacy']}, 'root membrane/tree-eye projection changed')

    build.verify_artifact(artifact)
    actual=(artifact/'index.html').read_text(encoding='utf-8')
    check(actual==build.render(), 'artifact HTML is stale')
    p=Page(); p.feed(actual)
    check(len(p.ids)==len(set(p.ids)), 'duplicate element ids')
    for element_id in ('stage','stage2d','navTwin','axis-x','axis-y','commit','root-projection'):
        check(element_id in p.ids, f'missing interaction surface: {element_id}')

    match=re.search(r'<script id="root-projection" type="application/json">(.*?)</script>', actual, re.S)
    check(bool(match), 'embedded main-root projection missing')
    embedded=json.loads(match.group(1))
    check(embedded==projection, 'embedded projection differs from admitted Display tissue')

    nav_src=(DISPLAY/'navigation-physiology.js').read_text(encoding='utf-8')
    view_src=(DISPLAY/'root-view.js').read_text(encoding='utf-8')
    css_src=(DISPLAY/'root-view.css').read_text(encoding='utf-8')
    check('function collectStructure' in nav_src and 'hasFullSplit' in nav_src, 'realized-only structural traversal missing')
    check('showRelation' not in view_src and 'hitBig' not in view_src and 'data-rel=' not in actual, 'ambient relation hit/highlight system returned')
    check('location.hash' not in view_src and 'URLSearchParams' not in view_src, 'inspection was coupled back to URL/file routing')
    check('two axes · two knobs' in actual, 'two-axis control contract missing')
    check('axisValue(axis' in nav_src, 'independent axis mapping missing')
    check('setPointerCapture' in view_src, 'pointer capture missing from direct manipulation')
    check('touch-action:none' in css_src, 'touch manipulation does not own its fullscreen gesture')
    check('overflow:hidden' in css_src, 'fullscreen no-scroll contract missing')
    check('prefers-reduced-motion' in css_src, 'reduced-motion accommodation missing')
    check('PAGE main:root · VIEW main:root' in actual, 'inspect/commit state language missing')
    check('provider aperture · Google AI Studio · not an address' in css_src, 'tree-eye boundary disappeared')
    check('philosophy · root' not in actual.lower(), 'superseded Philosophy root leaked into public main')

    srcs={s.get('src') for s in p.scripts if s.get('src')}
    check(srcs=={'assets/navigation-physiology.js','assets/root-view.js'}, 'unexpected public script surface')
    styles={d.get('href') for d in p.links if d.get('rel')=='stylesheet'}
    check(styles=={'assets/root-view.css'}, 'unexpected public stylesheet surface')
    check(not any((u or '').startswith(('http://','https://','//')) for u in srcs|styles), 'remote application dependency leaked into membrane')

    for source in (DISPLAY/'root-view.js', DISPLAY/'navigation-physiology.js'):
        result=subprocess.run(['node','--check',str(source)],capture_output=True,text=True)
        check(result.returncode==0, result.stderr or f'javascript syntax failure: {source.name}')

    nav=subprocess.run(['node',str(DISPLAY/'navigation-physiology.test.cjs')],capture_output=True,text=True)
    check(nav.returncode==0, nav.stderr or 'navigation physiology witness failed')

    for rel in ('assets/root-view.css','assets/root-view.js','assets/navigation-physiology.js','assets/favicon.svg','.nojekyll'):
        check((artifact/rel).is_file(), f'missing artifact member {rel}')
    check(not (ROOT/'index.html').exists(), 'generated membrane must not be committed at host root')
    check((ROOT/'.github/workflows/pages.yml').is_file(), 'Pages workflow missing')
    check((ROOT/'CNAME').read_text(encoding='utf-8').strip()=='sss.saarland', 'unexpected custom domain')

    print(json.dumps({
        'status':'pass',
        'structural_checks':count,
        'display':'unsplit organ',
        'public_root':'main-root',
        'root_4V':['Form','Continuity','Care','Inquiry'],
        'renderer':'accepted WebGL v3 physiology',
        'navigation':'realized-only / direct-drag / minimap / independent-axis / inspect!=commit',
        'artifact':artifact.relative_to(ROOT).as_posix() if artifact.is_relative_to(ROOT) else str(artifact)
    },indent=2))


if __name__=='__main__':
    main()
