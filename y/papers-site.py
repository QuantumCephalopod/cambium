#!/usr/bin/env python3
from pathlib import Path
import argparse, json

ROOT=Path(__file__).resolve().parent.parent
DISPLAY=ROOT/'w'/'display'


def load():
    papers=json.loads((DISPLAY/'papers.json').read_text(encoding='utf-8'))
    mounts=json.loads((DISPLAY/'papers-site-mounts.json').read_text(encoding='utf-8'))
    if papers.get('source')!='papers/_feed' or set(papers.get('phenotype',{}))!=set('wxzy') or set(papers.get('groups',{}))!=set('wxzy'):
        raise ValueError('invalid Papers public projection')
    for gene in 'wxzy':
        for item in papers['groups'][gene]:
            if set(item)!={'id','title'}:
                raise ValueError('Papers projection crossed its public boundary')
    if mounts.get('scope')!='papers' or len(mounts.get('sites',[]))!=1:
        raise ValueError('invalid Papers site registry')
    site=mounts['sites'][0]
    if site.get('id')!='organism:papers' or site.get('witnesses')!=['']:
        raise ValueError('Papers identity must mount at restarted local root')
    return papers,mounts


def render():
    papers,mounts=load()
    text=(DISPLAY/'papers-template.html').read_text(encoding='utf-8')
    a='/*__PAPERS_DATA__*/'; b='/*__PAPERS_MOUNTS__*/'
    if text.count(a)!=1 or text.count(b)!=1:
        raise ValueError('invalid Papers template slots')
    enc=lambda v: json.dumps(v,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('&','\\u0026')
    return '<!-- Papers: second production site-holon specimen; local address space restarts at root. -->\n'+text.replace(a,enc({'papers':papers})).replace(b,enc(mounts))


def files():
    src={
      'assets/papers-site.css':DISPLAY/'papers-site.css',
      'assets/papers.css':DISPLAY/'papers.css',
      'assets/papers-view.js':DISPLAY/'papers-view.js',
      'assets/papers-site-runtime.js':DISPLAY/'papers-site-runtime.js',
      'assets/address.js':ROOT/'z'/'address.js',
      'assets/site-holon.js':DISPLAY/'site-holon.js',
      'assets/site-fold.js':DISPLAY/'site-fold.js',
      'assets/site-runtime.css':DISPLAY/'site-runtime.css',
      'assets/favicon.svg':DISPLAY/'favicon.svg'}
    out={'papers/index.html':render().encode()}
    for dest,path in src.items(): out[dest]=path.read_bytes()
    return out


def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--artifact',type=Path,default=ROOT/'_site'); ap.add_argument('--check',action='store_true'); args=ap.parse_args()
    target=args.artifact if args.artifact.is_absolute() else ROOT/args.artifact
    expected=files()
    if args.check:
        for rel,data in expected.items():
            path=target/rel
            if not path.is_file() or path.read_bytes()!=data: raise ValueError('stale Papers artifact: '+rel)
        html=(target/'papers/index.html').read_text(encoding='utf-8')
        for token in ('organism:papers','id="papers-groups"','id="tetra-fold"','../assets/site-holon.js','../assets/papers-site-runtime.js'):
            if token not in html: raise ValueError('missing Papers invariant surface: '+token)
        print('Papers site-holon specimen PASS')
    else:
        for rel,data in expected.items():
            path=target/rel; path.parent.mkdir(parents=True,exist_ok=True); path.write_bytes(data)
        print('built Papers site-holon specimen')

if __name__=='__main__': main()
