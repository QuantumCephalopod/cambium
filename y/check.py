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
        check(set(index['dna'])==set('wxzy'),'DNA mismatch')
        check([n['path'] for n in index['nodes']]==['','w','x','z','y'],'unexpected semantic depth')
        check(index['nodes'][0]['role']=='wood','root must be navigation wood')
        check(all(n['children']==[] for n in index['nodes'][1:]),'unearned descendant split')
        check(all(n['occupants'] for n in index['nodes'][1:]),'empty semantic arm')
        files=index['files'];check(len({f['id'] for f in files})==len(files),'duplicate stable tissue id')
        body={p.relative_to(ROOT).as_posix() for a in 'wxzy' for p in (ROOT/a).rglob('*') if p.is_file() and '__pycache__' not in p.parts}
        atlas={f['path'] for f in files}
        check(body==atlas,'atlas does not address the complete body: '+str(body^atlas))
        for f in files:
            check((ROOT/f['path']).is_file(),'missing occupant '+f['path'])
            check(f['path'][0]==f['locus'],'wrong primary physical locus')
            check(f['id'] in next(n for n in index['nodes'] if n['path']==f['locus'])['occupants'],'unbound occupant')
        for a in 'wxzy':
            check(not any(p.is_dir() and p.name!='__pycache__' for p in (ROOT/a).iterdir()),'unearned convenience depth')
        check((ROOT/'CNAME').read_text().strip()=='sss.saarland','unexpected custom domain')
        check((ROOT/'SKILLS/START_HERE.md').is_file(),'no reentry receptor')
        check((ROOT/'ROOT_SPLIT.md').is_file(),'split receipt missing')
        check((ROOT/'INDEX.md').read_text()==mod.render_index(index),'human atlas projection stale')
    print(json.dumps({'status':'pass','structural_checks':count,'stage':'split' if SPLIT else 'flat'},indent=2))
if __name__=='__main__':main()
