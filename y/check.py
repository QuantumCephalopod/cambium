#!/usr/bin/env python3
"""Standard-library structural witness for minimal phenotype + local cambium."""
from pathlib import Path
import html.parser, importlib.util, json, subprocess, re
HERE=Path(__file__).resolve().parent
ROOT=HERE.parent if HERE.name=='y' else HERE
count=0

def check(condition, why):
    global count; count+=1
    if not condition: raise AssertionError(why)

class Page(html.parser.HTMLParser):
    def __init__(self): super().__init__(); self.ids=[]; self.links=[]; self.scripts=[]
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if 'id' in d:self.ids.append(d['id'])
        if tag in ('a','link') and 'href' in d:self.links.append(d['href'])
        if tag=='script':self.scripts.append(d)

def main():
    spec=importlib.util.spec_from_file_location('compose',ROOT/'y/build.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
    actual=(ROOT/'index.html').read_text(encoding='utf-8');check(actual==mod.render(),'generated HTML is stale')
    p=Page();p.feed(actual)
    check(len(p.ids)==len(set(p.ids)),'duplicate element ids')
    check('lang="en"' in actual,'missing document language')
    check('<meta name="robots" content="noindex, nofollow">' in actual,'review-only indexing marker missing')
    script_src=[s.get('src') for s in p.scripts if 'src' in s]
    check(script_src==['z/address.js','z/navigation.js','w/view.js','z/app.js'],'unexpected application script surface')
    check(all((ROOT/src).is_file() for src in script_src),'missing local application script')
    check('localStorage.' not in actual and 'document.cookie' not in actual,'unexpected browser persistence')
    check('mailto:' not in actual,'public contact has not been approved')
    check('aria-label="places in cambium"' in actual,'named navigation landmark missing')
    check(actual.count('<nav ')==1,'more than one public navigation landmark')
    check('INDEX.yaml' in actual and 'INDEX.json' not in actual,'script-free phenotype link is stale')
    payload=json.loads(re.search(r'<script id="cambium-data" type="application/json">(.*?)</script>',actual,re.S).group(1))
    check(set(payload)=={'index','copy'},'test fixture is embedded in public skin')
    check('tabindex="0" role="group"' in actual,'map lacks keyboard rotation support')
    style=(ROOT/'w/style.css').read_text(encoding='utf-8')
    check('prefers-reduced-motion' in style,'missing reduced-motion accommodation')
    check('role="status"' in actual and 'role="alert"' in actual,'live announcements absent')
    check('skip to content' in actual,'missing skip link')
    check('/*__' not in actual,'template slots remain')
    for href in p.links:
        if href.startswith(('#','data:','https:')):continue
        check((ROOT/href).is_file(),'broken local link '+href)
    for name in ('address.js','navigation.js','app.js','view.js'):
        arm='w' if name=='view.js' else 'z';source=ROOT/arm/name
        result=subprocess.run(['node','--check',str(source)],capture_output=True,text=True)
        check(result.returncode==0,result.stderr)
    phenotype=mod.load_yaml(ROOT/'INDEX.yaml');mod.validate_index(phenotype)
    check(set(phenotype)==set('wxzy'),'root phenotype changed')
    check(all(set(phenotype[g])=={'noun'} for g in 'wxzy'),'unearned descendant or metadata in phenotype')
    check([phenotype[g]['noun'] for g in 'wxzy']==['expression','continuity','orientation','renewal'],'root nouns changed')
    cambium=mod.load_yaml(ROOT/'_cambium.yaml');mod.validate_cambium(cambium)
    runtime=mod.runtime_index();nodes=mod.semantic_nodes(runtime);paths=[p for p,_ in nodes]
    check(paths==['','w','x','z','y'],'unexpected semantic depth')
    check(runtime['name']=='cambium','derived runtime root changed')
    check(runtime['whole']==cambium['1T'],'runtime root does not derive from 1T')
    for g in 'wxzy':
        check(runtime[g]['name']==phenotype[g]['noun'],f'{g} name not derived from phenotype')
        check(runtime[g]['whole']==cambium['4V'][g],f'{g} whole not derived from root cambium')
    body={p.relative_to(ROOT).as_posix() for a in 'wxzy' for p in (ROOT/a).iterdir() if p.is_file() and p.name!='_cambium.yaml' and not p.name.startswith('.')}
    atlas={carrier for _,node in nodes for carrier in node.get('tissue',{}).values()}
    check(body==atlas,'runtime projection does not address complete leaf tissue: '+str(body^atlas))
    check(not (ROOT/'INDEX.json').exists(),'rich legacy INDEX.json survived canonical migration')
    check((ROOT/'INDEX.yaml').is_file(),'minimal phenotype missing')
    check((ROOT/'_cambium.yaml').is_file(),'root closed split anatomy missing')
    for shell in ('_stomach','_waste','SKILLS'):check((ROOT/shell).is_dir(),'missing shell '+shell)
    check((ROOT/'CNAME').read_text().strip()=='sss.saarland','unexpected custom domain')
    check((ROOT/'SKILLS/START_HERE.md').is_file(),'no reentry receptor')
    check(not (ROOT/'ROOT_SPLIT.md').exists(),'closed differentiation diary still lives at root')
    check((ROOT/'_stomach/root-differentiation.md').is_file(),'retained differentiation nutrient missing')
    check(not (ROOT/'INDEX.md').exists(),'duplicate generated atlas survived')
    print(json.dumps({'status':'pass','structural_checks':count,'phenotype':'INDEX.yaml','constitution':'_cambium.yaml'},indent=2))
if __name__=='__main__':main()
