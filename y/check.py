#!/usr/bin/env python3
"""Standard-library structural witness. No network and no write side effects."""
from pathlib import Path
import html.parser
import importlib.util
import json
import subprocess

HERE=Path(__file__).resolve().parent
ROOT=HERE.parent if HERE.name=='y' else HERE
SPLIT=(ROOT/'w').is_dir()
count=0

def check(condition, why):
    global count
    count+=1
    if not condition:raise AssertionError(why)

class Page(html.parser.HTMLParser):
    def __init__(self):super().__init__();self.ids=[];self.links=[];self.scripts=[];self.hidden=0
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if 'id' in d:self.ids.append(d['id'])
        if tag in ('a','link') and 'href' in d:self.links.append(d['href'])
        if tag=='script':self.scripts.append(d)

def main():
    build=ROOT/('y/build.py' if SPLIT else 'build.py')
    spec=importlib.util.spec_from_file_location('compose',build);mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
    actual=(ROOT/'index.html').read_text(encoding='utf-8');check(actual==mod.render(),'generated HTML is stale')
    p=Page();p.feed(actual)
    check(len(p.ids)==len(set(p.ids)),'duplicate element ids')
    check('lang="en"' in actual,'missing document language')
    check('<meta name="robots" content="noindex, nofollow">' in actual,'review-only indexing marker missing')
    check(all('src' not in s for s in p.scripts),'external application script')
    check('localStorage.' not in actual and 'document.cookie' not in actual,'unexpected browser persistence')
    check('mailto:' not in actual,'public contact has not been approved')
    check('aria-label="places in cambium"' in actual,'named navigation landmark missing')
    check(actual.count('<nav ')==1,'more than one public navigation landmark')
    check('id="mode-study"' not in actual and 'id="study-controls"' not in actual,'demo navigation leaked into the public skin')
    import re
    payload=json.loads(re.search(r'<script id="cambium-data" type="application/json">(.*?)</script>',actual,re.S).group(1))
    check(set(payload)=={'index','copy'},'test fixture is embedded in public skin')
    check('tabindex="0" role="group"' in actual,'map lacks keyboard rotation support')
    check('prefers-reduced-motion' in actual,'missing reduced-motion accommodation')
    check('role="status"' in actual and 'role="alert"' in actual,'live announcements absent')
    check('skip to content' in actual,'missing skip link')
    check('/*__' not in actual,'template slots remain')
    for href in p.links:
        if href.startswith(('#','data:','https:')):continue
        check((ROOT/href).is_file(),'broken local link '+href)
    for name in ('address.js','navigation.js','app.js','view.js'):
        arm='w' if name=='view.js' else 'z'
        source=ROOT/arm/name if SPLIT else ROOT/name
        result=subprocess.run(['node','--check',str(source)],capture_output=True,text=True)
        check(result.returncode==0,result.stderr)
    if SPLIT:
        index=json.loads((ROOT/'INDEX.json').read_text())
        nodes=mod.semantic_nodes(index);paths=[path for path,_ in nodes]
        check(paths==['','w','x','z','y'],'unexpected semantic depth')
        check(index['name']=='cambium','root semantic name changed')
        check(bool(index['whole'].strip()),'root semantic whole missing')
        check(all(g in index for g in 'wxzy'),'root CCCC body incomplete')
        check(all(not any(g in index[p] for g in 'wxzy') for p in 'wxzy'),'unearned descendant split')
        check(all(index[p].get('tissue') for p in 'wxzy'),'empty semantic arm')
        forbidden_root={'nodes','files','closure','root_receipt','frontier','publication','geometry','schema','dna'}
        check(not (forbidden_root & set(index)),'flat/meta schema leaked back into the semantic index')
        forbidden_local={'path','parent','children','gene','depth','locus','split_receipt','birth_receipt','status','role'}
        check(all(not (forbidden_local & set(node)) for _,node in nodes),'derivable bookkeeping stored inside semantic body')
        body={p.relative_to(ROOT).as_posix() for a in 'wxzy' for p in (ROOT/a).rglob('*') if p.is_file() and '__pycache__' not in p.parts}
        atlas={carrier for _,node in nodes for carrier in node.get('tissue',{}).values()}
        check(body==atlas,'semantic index does not address the complete living body: '+str(body^atlas))
        for carrier in atlas:check((ROOT/carrier).is_file(),'missing addressed tissue '+carrier)
        for a in 'wxzy':
            check(not any(p.is_dir() and p.name!='__pycache__' for p in (ROOT/a).iterdir()),'unearned convenience depth')
        for shell in ('_stomach','_waste','SKILLS'):
            check(isinstance(index.get(shell),dict) and index[shell].get('whole'),'missing shell orientation '+shell)
            for carrier in index[shell].get('tissue',{}).values():check((ROOT/carrier).is_file(),'missing shell tissue '+carrier)
        check((ROOT/'CNAME').read_text().strip()=='sss.saarland','unexpected custom domain')
        check((ROOT/'SKILLS/START_HERE.md').is_file(),'no reentry receptor')
        check(not (ROOT/'ROOT_SPLIT.md').exists(),'closed differentiation diary still lives at root')
        check((ROOT/'_stomach/root-differentiation.md').is_file(),'retained differentiation nutrient missing')
        check(not (ROOT/'INDEX.md').exists(),'duplicate generated atlas survived semantic-index correction')
    print(json.dumps({'status':'pass','structural_checks':count,'stage':'split' if SPLIT else 'flat'},indent=2))
if __name__=='__main__':main()
