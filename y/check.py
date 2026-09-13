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
    for ritual in ('organism','navigation','site-holon'):
        check((DISPLAY/'RITUALS'/ritual/'RITUAL.md').is_file(), f'display {ritual} ritual missing')
    for member in ('navigation-physiology.js','navigation-physiology.test.cjs','site-holon.js','site-holon.test.cjs','site-fold.js','site-runtime.js','site-runtime.css','site-mounts.json'):
        check((DISPLAY/member).is_file(), f'display runtime member missing: {member}')

    projection=build.root_projection()
    mounts=build.site_mounts()
    check(projection['source']['organism']=='main-root', 'public projection is not main-root')
    check(projection['source']['home'].startswith('main-root-cambium-split-'), 'public projection lacks root split HOME')
    check([projection['root']['children'][g]['noun'] for g in 'wxzy']==['Form','Continuity','Care','Inquiry'], 'public 4V diverges from Drive root')
    check([projection['root']['children'][g]['gene'] for g in 'wxzy']==['CREATE','COPY','CONTROL','CULTIVATE'], 'public CCCC mapping changed')
    check(projection['constitution']['4V']=={'w':'Form','x':'Continuity','z':'Care','y':'Inquiry'}, 'projection constitution 4V mismatch')
    check(projection['occupancy']=={'w':['morphogenetic-painting'],'x':['ternary','mnemos-autobiography'],'z':['regeneration'],'y':['papers']}, 'root organ placement projection changed')
    check(projection['membranes']=={'provider':['Google AI Studio'],'unresolved':['muses'],'stomach':['legacy']}, 'root membrane/tree-eye projection changed')
    check(len(mounts['sites'])==5, 'root plus four first-rank sites must be mounted')
    check(len({s['id'] for s in mounts['sites']})==5, 'site identities must be stable and unique')
    check({tuple(s['witnesses']) for s in mounts['sites']}=={('',),('w',),('x',),('z',),('y',)}, 'production root site witnesses diverged')

    build.verify_artifact(artifact)
    actual=(artifact/'index.html').read_text(encoding='utf-8')
    check(actual==build.render(), 'artifact HTML is stale')
    p=Page(); p.feed(actual)
    check(len(p.ids)==len(set(p.ids)), 'duplicate element ids')
    for element_id in ('stage','stage2d','locus-stage','navTwin','axis-x','axis-y','commit','root-projection','site-mounts','site-state','tetra-fold'):
        check(element_id in p.ids, f'missing interaction surface: {element_id}')

    match=re.search(r'<script id="root-projection" type="application/json">(.*?)</script>', actual, re.S)
    check(bool(match), 'embedded main-root projection missing')
    embedded=json.loads(match.group(1)); check(embedded==projection, 'embedded projection differs from admitted Display tissue')
    mm=re.search(r'<script id="site-mounts" type="application/json">(.*?)</script>', actual, re.S)
    check(bool(mm), 'embedded site mount registry missing')
    check(json.loads(mm.group(1))==mounts, 'embedded site mount registry differs from canonical Display mount tissue')

    nav_src=(DISPLAY/'navigation-physiology.js').read_text(encoding='utf-8')
    view_src=(DISPLAY/'root-view.js').read_text(encoding='utf-8')
    runtime_src=(DISPLAY/'site-runtime.js').read_text(encoding='utf-8')
    fold_src=(DISPLAY/'site-fold.js').read_text(encoding='utf-8')
    css_src=(DISPLAY/'root-view.css').read_text(encoding='utf-8')
    runtime_css=(DISPLAY/'site-runtime.css').read_text(encoding='utf-8')
    check('function collectStructure' in nav_src and 'hasFullSplit' in nav_src, 'realized-only structural traversal missing')
    check('showRelation' not in view_src and 'hitBig' not in view_src and 'data-rel=' not in actual, 'ambient relation hit/highlight system returned')
    check('location.hash' not in view_src and 'URLSearchParams' not in view_src, 'root inspection was coupled directly to file routing')
    check('SSSDisplayRuntime' in runtime_src and 'registry.resolve' in runtime_src, 'production commit does not resolve through site-holon registry')
    check('createActivityBus' in (DISPLAY/'site-holon.js').read_text(encoding='utf-8'), 'identity-bound activity receptor missing')
    check("['open','closing','closed','opening','open']" in fold_src, 'tetrahedral closure phase contract missing')
    check('fold-facet' in runtime_css and 'clip-path' in runtime_css, 'four-facet transition skin missing')
    check('two axes · two knobs' in actual, 'two-axis control contract missing')
    check('axisValue(axis' in nav_src, 'independent axis mapping missing')
    check('setPointerCapture' in view_src, 'pointer capture missing from direct manipulation')
    check('touch-action:none' in css_src, 'touch manipulation does not own its fullscreen gesture')
    check('overflow:hidden' in css_src, 'fullscreen no-scroll contract missing')
    check('prefers-reduced-motion' in css_src and 'prefers-reduced-motion' in runtime_css, 'reduced-motion accommodation missing')
    check('PAGE main:root · VIEW main:root' in actual, 'inspect/commit state language missing')
    check('provider aperture · Google AI Studio · not an address' in css_src, 'tree-eye boundary disappeared')
    check('philosophy · root' not in actual.lower(), 'superseded Philosophy root leaked into public main')

    srcs={s.get('src') for s in p.scripts if s.get('src')}
    check(srcs=={
        'assets/address.js','assets/site-holon.js','assets/site-fold.js','assets/navigation-physiology.js','assets/root-view.js','assets/site-runtime.js'
    }, 'unexpected public script surface')
    styles={d.get('href') for d in p.links if d.get('rel')=='stylesheet'}
    check(styles=={'assets/root-view.css','assets/site-runtime.css'}, 'unexpected public stylesheet surface')
    check(not any((u or '').startswith(('http://','https://','//')) for u in srcs|styles), 'remote application dependency leaked into membrane')

    for source in (DISPLAY/'root-view.js',DISPLAY/'navigation-physiology.js',DISPLAY/'site-holon.js',DISPLAY/'site-fold.js',DISPLAY/'site-runtime.js',ROOT/'z/address.js'):
        result=subprocess.run(['node','--check',str(source)],capture_output=True,text=True)
        check(result.returncode==0, result.stderr or f'javascript syntax failure: {source.name}')

    nav=subprocess.run(['node',str(DISPLAY/'navigation-physiology.test.cjs')],capture_output=True,text=True)
    check(nav.returncode==0, nav.stderr or 'navigation physiology witness failed')
    cell=subprocess.run(['node',str(DISPLAY/'site-holon.test.cjs')],capture_output=True,text=True)
    check(cell.returncode==0, cell.stderr or 'site-holon cell witness failed')

    for rel in ('assets/root-view.css','assets/site-runtime.css','assets/root-view.js','assets/navigation-physiology.js','assets/address.js','assets/site-holon.js','assets/site-fold.js','assets/site-runtime.js','assets/favicon.svg','.nojekyll'):
        check((artifact/rel).is_file(), f'missing artifact member {rel}')
    check(not (ROOT/'index.html').exists(), 'generated membrane must not be committed at host root')
    check((ROOT/'.github/workflows/pages.yml').is_file(), 'Pages workflow missing')
    check((ROOT/'CNAME').read_text(encoding='utf-8').strip()=='sss.saarland', 'unexpected custom domain')

    print(json.dumps({
        'status':'pass',
        'structural_checks':count,
        'display':'unsplit organ',
        'public_root':'main-root',
        'site_holon':'production mounted / identity-locus separated / fold membrane / activity receptor',
        'root_4V':['Form','Continuity','Care','Inquiry'],
        'renderer':'accepted WebGL v3 physiology + locus shader membrane',
        'navigation':'realized-only / inspect!=commit / commit resolves through stable site identity',
        'artifact':artifact.relative_to(ROOT).as_posix() if artifact.is_relative_to(ROOT) else str(artifact)
    },indent=2))


if __name__=='__main__':
    main()
