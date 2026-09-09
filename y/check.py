#!/usr/bin/env python3
"""Standard-library structural witness for cambium + the nested unsplit display organ."""
from pathlib import Path
import argparse
import html.parser
import importlib.util
import json
import re
import subprocess

ROOT=Path(__file__).resolve().parent.parent
DISPLAY=ROOT/'w'/'display'
GENES='wxzy'
count=0


def check(condition, why):
    global count
    count+=1
    if not condition:
        raise AssertionError(why)


class Page(html.parser.HTMLParser):
    def __init__(self):
        super().__init__();self.ids=[];self.links=[];self.scripts=[]
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if 'id' in d:self.ids.append(d['id'])
        if tag in ('a','link') and 'href' in d:self.links.append(d['href'])
        if tag=='script':self.scripts.append(d)


def load_build():
    path=ROOT/'y/build.py'
    spec=importlib.util.spec_from_file_location('compose',path)
    mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);return mod


def read_feed(root, owner):
    path=root/'_feed/current.json'
    check(path.is_file(),f'{owner} current _feed missing')
    data=json.loads(path.read_text(encoding='utf-8'))
    check(data.get('owner')==owner,f'{owner} _feed owner mismatch')
    check(data.get('boundary')=='LOCAL_BODY_ONLY',f'{owner} _feed boundary mismatch')
    event=data.get('reflected_home_event')
    check(isinstance(event,str) and event,f'{owner} _feed has no reflected HOME')
    check((root/'_root'/f'{event}.json').is_file(),f'{owner} _feed reflects unknown HOME')
    return data


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--artifact',type=Path,default=ROOT/'_site')
    args=ap.parse_args();artifact=args.artifact if args.artifact.is_absolute() else ROOT/args.artifact
    build=load_build()

    phenotype=build.load_yaml(ROOT/'INDEX.yaml');build.validate_index(phenotype)
    root_c=build.local_cambium('');runtime=build.runtime_index()
    check(list(runtime)==['name','whole','tissue','w','x','z','y'],'runtime root shape changed')
    check(runtime['whole']==root_c['1T'],'runtime whole diverges from root cambium')
    check([runtime[g]['name'] for g in GENES]==['expression','continuity','orientation','renewal'],'root phenotype changed unexpectedly')
    check(all(not any(g in runtime[p] for g in GENES) for p in GENES),'unearned host descendants appeared')
    check(all(runtime[p].get('tissue')=={} for p in GENES),'runtime projection leaked carrier topology into host places')

    # Same discoverable organism interface regardless of substrate.
    check((ROOT/'RITUALS/organism/RITUAL.md').is_file(),'host ritual receptor missing')
    check(not (ROOT/'SKILLS').exists(),'legacy host SKILLS receptor remains')
    for role in ('_stomach','_feed','_root','_waste'):
        check((ROOT/role).is_dir(),f'host lifecycle role missing: {role}')
    host_feed=read_feed(ROOT,'cambium')

    # Every realized host vertex has a carrier root. Raw letters are addresses; semantic
    # names remain in INDEX.yaml rather than being copied into folder names.
    for gene in GENES:
        check((ROOT/gene).is_dir(),f'missing carrier root for realized host limb {gene}')
    check((ROOT/'w/interface.md').is_file(),'host expression membrane missing')
    check((ROOT/'x/continuity.md').is_file(),'host continuity interface missing')
    check('w ⟦ display:root ⟧' in (ROOT/'w/interface.md').read_text(encoding='utf-8'),'host expression membrane does not preserve organ scope transition')
    check('w/display/content.json' in (ROOT/'x/continuity.md').read_text(encoding='utf-8'),'host continuity interface is not bound to display content ownership')
    check(not (ROOT/'display').exists(),'display organ still floats at host root')

    check(DISPLAY.is_dir(),'nested display organ missing')
    check((DISPLAY/'INDEX.yaml').read_text(encoding='utf-8').strip()=='{}','display internal phenotype must remain unsplit')
    check(not (DISPLAY/'_cambium.yaml').exists(),'display falsely claims an internal closed split')
    check((DISPLAY/'RITUALS/organism/RITUAL.md').is_file(),'display ritual receptor missing')
    check(not (DISPLAY/'SKILLS').exists(),'legacy display SKILLS receptor remains')
    for role in ('_stomach','_feed','_root','_waste'):
        check((DISPLAY/role).is_dir(),f'display lifecycle role missing: {role}')
    display_feed=read_feed(DISPLAY,'display')

    for name in ('content.json','papers.json','template.html','style.css','papers.css','view.js','papers-view.js','favicon.svg'):
        check((DISPLAY/name).is_file(),f'missing display tissue {name}')
    check((DISPLAY/'_stomach/INCOMING — cambium becoming.md').is_file(),'display becoming nutrient missing')
    check((DISPLAY/'_stomach/INCOMING — care propagates.md').is_file(),'display care nutrient missing')
    check((DISPLAY/'_stomach/observations.md').is_file(),'display observations nutrient missing')
    check((DISPLAY/'_waste/.gitkeep').is_file(),'display waste shell missing')
    check(not (ROOT/'_stomach/INCOMING — cambium becoming.md').exists(),'display nutrient still duplicated in host stomach')
    check(not (ROOT/'_stomach/observations.md').exists(),'display observation still duplicated in host stomach')

    check(not (ROOT/'w/_cambium.yaml').exists(),'unsplit host expression limb falsely claims a local split')
    check(not (ROOT/'x/_cambium.yaml').exists(),'unsplit host continuity limb falsely claims a local split')
    check(not (ROOT/'index.html').exists(),'generated membrane must not be committed at host root')
    check(not (ROOT/'.nojekyll').exists(),'deployment marker belongs to artifact, not living host root')
    check((ROOT/'.github/workflows/pages.yml').is_file(),'Pages pump workflow missing')
    check((ROOT/'y/feed.py').is_file(),'HOME→feed mechanical carrier missing')
    check((ROOT/'z/address.js').is_file() and (ROOT/'z/navigation.js').is_file() and (ROOT/'z/app.js').is_file(),'host orientation interface incomplete')
    check((ROOT/'y/interaction.md').is_file(),'renewal interaction witness missing')
    check('INDEX.json' not in (ROOT/'y/interaction.md').read_text(encoding='utf-8'),'stale rich-index law remains in living interaction tissue')

    build.verify_artifact(artifact)
    actual=(artifact/'index.html').read_text(encoding='utf-8')
    check(actual==build.render(),'artifact HTML is stale')
    p=Page();p.feed(actual)
    check(len(p.ids)==len(set(p.ids)),'duplicate element ids')
    check('lang="en"' in actual,'missing document language')
    check('<meta name="robots" content="noindex, nofollow">' in actual,'review-only indexing marker missing')
    check('aria-label="places in cambium"' in actual,'named navigation landmark missing')
    check(actual.count('<nav ')==1,'more than one public navigation landmark')
    check('skip to content' in actual,'skip link missing')
    check('/*__' not in actual and '{{' not in actual,'template slots remain')
    check(all(s.get('src','').startswith('assets/') for s in p.scripts if 'src' in s),'non-artifact application script leaked into membrane')
    check({s.get('src') for s in p.scripts if 'src' in s}=={'assets/address.js','assets/navigation.js','assets/view.js','assets/papers-view.js','assets/app.js'},'membrane script interface changed')
    check('assets/style.css' in p.links and 'assets/papers.css' in p.links and 'assets/favicon.svg' in p.links,'display visual assets are not membrane-local')
    check(all(token not in actual for token in ('_stomach/','_feed/','_root/','_waste/','RITUALS/','SKILLS/')),'organ shell/receptor leaked into public membrane')

    match=re.search(r'<script id="cambium-data" type="application/json">(.*?)</script>',actual,re.S)
    check(bool(match),'runtime projection missing')
    payload=json.loads(match.group(1))
    check(set(payload)=={'index','copy','papers'},'unexpected public payload surface')
    check(payload['index']==runtime,'public runtime index differs from derived host projection')
    check(set(payload['copy']['organs'])==set(GENES),'current display copy map changed unexpectedly')
    check(payload['copy']['brand']=='self-similar-systems saar','public identity changed')
    build.validate_papers(payload['papers']);check(True,'papers projection invalid')
    check(payload['papers']['source']=='papers/_feed','display papers projection lost source identity')
    check(payload['papers']['refresh']=='REFRESH ACKNOWLEDGED','display papers projection is not acknowledged')
    check([payload['papers']['phenotype'][g] for g in GENES]==['Genesis','Continuity','Governance','Evolution'],'papers address space changed unexpectedly')
    check([len(payload['papers']['groups'][g]) for g in GENES]==[6,18,18,6],'first papers projection no longer matches admitted source-organism census')
    check(sum(len(payload['papers']['groups'][g]) for g in GENES)==48,'first papers projection must carry 48 source organisms')
    check('drive.google.com' not in json.dumps(payload['papers']),'private Drive pointers leaked into public papers projection')

    style=(DISPLAY/'style.css').read_text(encoding='utf-8')
    check('prefers-reduced-motion' in style,'reduced-motion accommodation missing from display tissue')
    check('localStorage.' not in actual and 'document.cookie' not in actual,'unexpected browser persistence')
    check('mailto:' not in actual,'public contact has not been approved')
    for rel in ('assets/style.css','assets/papers.css','assets/favicon.svg','assets/view.js','assets/papers-view.js','assets/address.js','assets/navigation.js','assets/app.js','.nojekyll'):
        check((artifact/rel).is_file(),f'missing artifact member {rel}')

    for source in (DISPLAY/'view.js',DISPLAY/'papers-view.js',ROOT/'z/address.js',ROOT/'z/navigation.js',ROOT/'z/app.js'):
        result=subprocess.run(['node','--check',str(source)],capture_output=True,text=True)
        check(result.returncode==0,result.stderr or f'javascript syntax failure: {source}')
    compile((ROOT/'y/browser-check.py').read_text(encoding='utf-8'),str(ROOT/'y/browser-check.py'),'exec');check(True,'browser-check syntax')
    check((ROOT/'CNAME').read_text(encoding='utf-8').strip()=='sss.saarland','unexpected intended custom domain')

    print(json.dumps({
        'status':'pass','structural_checks':count,'host':'cambium','organ':'display',
        'host_feed_home':host_feed['reflected_home_event'],
        'display_feed_home':display_feed['reflected_home_event'],
        'display_host_locus':'w','display_physical_root':'w/display',
        'display_internal_state':'unsplit','papers_projection_event':payload['papers']['event_id'],
        'papers_source_organisms':48,
        'artifact':artifact.relative_to(ROOT).as_posix() if artifact.is_relative_to(ROOT) else str(artifact)
    },indent=2))

if __name__=='__main__':
    main()
