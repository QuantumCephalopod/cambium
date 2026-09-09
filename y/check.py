#!/usr/bin/env python3
"""Structural witness for cambium, Display, and the Philosophy root encounter."""
from pathlib import Path
import argparse
import html.parser
import importlib.util
import json
import re
import subprocess

ROOT=Path(__file__).resolve().parent.parent
DISPLAY=ROOT/'w'/'display'
PHILOSOPHY=DISPLAY/'philosophy'
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
    args=ap.parse_args()
    artifact=args.artifact if args.artifact.is_absolute() else ROOT/args.artifact
    build=load_build()

    phenotype=build.load_yaml(ROOT/'INDEX.yaml');build.validate_index(phenotype)
    root_c=build.local_cambium('');host_runtime=build.runtime_index()
    check(host_runtime['whole']==root_c['1T'],'host runtime whole diverges from cambium')
    check([host_runtime[g]['name'] for g in GENES]==['expression','continuity','orientation','renewal'],'host phenotype changed unexpectedly')
    check(all(not any(g in host_runtime[p] for g in GENES) for p in GENES),'unearned host descendants appeared')
    check((ROOT/'RITUALS/organism/RITUAL.md').is_file(),'host ritual receptor missing')
    check(not (ROOT/'SKILLS').exists(),'legacy host SKILLS receptor remains')
    for role in ('_stomach','_feed','_root','_waste'):
        check((ROOT/role).is_dir(),f'host lifecycle role missing: {role}')
    host_feed=read_feed(ROOT,'cambium')

    check(DISPLAY.is_dir(),'nested display organ missing')
    check((DISPLAY/'INDEX.yaml').read_text(encoding='utf-8').strip()=='{}','display internal phenotype must remain unsplit')
    check(not (DISPLAY/'_cambium.yaml').exists(),'display falsely claims an internal split')
    check((DISPLAY/'RITUALS/organism/RITUAL.md').is_file(),'display ritual receptor missing')
    for role in ('_stomach','_feed','_root','_waste'):
        check((DISPLAY/role).is_dir(),f'display lifecycle role missing: {role}')
    display_feed=read_feed(DISPLAY,'display')
    check((ROOT/'w/interface.md').is_file(),'host expression membrane missing')
    check((DISPLAY/'philosophy.interface.md').is_file(),'display↔philosophy membrane missing')

    check(PHILOSOPHY.is_dir(),'philosophy root encounter organism missing')
    philosophy_index=build.load_yaml(PHILOSOPHY/'INDEX.yaml');build.validate_index(philosophy_index)
    philosophy_c=build.load_yaml(PHILOSOPHY/'_cambium.yaml');build.validate_cambium(philosophy_c,'philosophy/_cambium.yaml')
    public_index=build.public_index()
    check(public_index['name']=='philosophy','public root is not philosophy')
    check(public_index['whole']==philosophy_c['1T'],'public root whole diverges from philosophy constitution')
    check([public_index[g]['name'] for g in GENES]==['Inquiry','Continuity','Care','Becoming'],'philosophy phenotype changed unexpectedly')
    for role in ('_stomach','_feed','_root','_waste'):
        check((PHILOSOPHY/role).is_dir(),f'philosophy lifecycle role missing: {role}')
    check((PHILOSOPHY/'RITUALS/organism/RITUAL.md').is_file(),'philosophy ritual receptor missing')
    encounter=json.loads((PHILOSOPHY/'encounter.json').read_text(encoding='utf-8'))
    check(encounter['language_is_expression_not_address'] is True,'language became semantic address')
    check(encounter['lateral_contract']==['address','CCCC','concept','question'],'4-step lateral invariant changed')
    pages=build.load_public_pages(public_index,encounter)
    check(set(pages)==set(GENES),'philosophy root encounter does not expose exactly its four realized loci')
    check([pages[g]['gene'] for g in GENES]==['CREATE','COPY','CONTROL','CULTIVATE'],'CCCC mapping changed')
    check(all(set(pages[g]['expressions'])=={'de','en'} for g in GENES),'DE/EN coverage incomplete')

    for name in ('content.json','papers.json','template.html','style.css','philosophy.css','papers.css','view.js','philosophy-view.js','papers-view.js','favicon.svg'):
        check((DISPLAY/name).is_file(),f'missing display tissue {name}')
    check((ROOT/'.github/workflows/pages.yml').is_file(),'Pages workflow missing')
    check((ROOT/'y/feed.py').is_file(),'HOME→feed carrier missing')
    check((ROOT/'z/address.js').is_file() and (ROOT/'z/navigation.js').is_file() and (ROOT/'z/app.js').is_file(),'host orientation interface incomplete')
    check(not (ROOT/'index.html').exists(),'generated membrane must not be committed at host root')

    build.verify_artifact(artifact)
    actual=(artifact/'index.html').read_text(encoding='utf-8')
    check(actual==build.render(),'artifact HTML is stale')
    p=Page();p.feed(actual)
    check(len(p.ids)==len(set(p.ids)),'duplicate element ids')
    check('lang="de"' in actual,'default document language is not German')
    check('<meta name="robots" content="noindex, nofollow">' in actual,'review-only indexing marker missing')
    check('aria-label="places in the current whole"' in actual,'recursive navigation landmark missing')
    check('turnable tetrahedral navigation surface' in actual,'tetrahedron is not exposed as the invariant navigation object')
    check('Adresse → CCCC → Begriff → Frage' in actual,'4-step lateral surface missing')
    check('data-language="de"' in actual and 'data-language="en"' in actual,'language switch missing')
    check(actual.count('<nav ')==1,'more than one public navigation landmark')
    check('/*__' not in actual and '{{' not in actual,'template slots remain')
    check(all(s.get('src','').startswith('assets/') for s in p.scripts if 'src' in s),'non-artifact application script leaked into membrane')

    expected_scripts={
        'assets/address.js','assets/navigation.js','assets/view.js','assets/papers-view.js',
        'assets/philosophy-view.js','assets/app.js'
    }
    check({s.get('src') for s in p.scripts if 'src' in s}==expected_scripts,'membrane script interface changed unexpectedly')
    check({'assets/style.css','assets/philosophy.css','assets/papers.css','assets/favicon.svg'} <= set(p.links),'display visual assets are not membrane-local')
    check(all(token not in actual for token in ('_stomach/','_feed/','_root/','_waste/','RITUALS/','SKILLS/')),'organ shell/receptor leaked into public membrane')

    match=re.search(r'<script id="cambium-data" type="application/json">(.*?)</script>',actual,re.S)
    check(bool(match),'runtime projection missing')
    payload=json.loads(match.group(1))
    expected_payload={'public_root','index','copy','translations','encounter','pages','papers'}
    check(set(payload)==expected_payload,'unexpected public payload surface')
    check(payload['public_root']=='philosophy','public root identity changed')
    check(payload['index']==public_index,'public runtime index differs from Philosophy body')
    check(payload['encounter']==encounter,'public encounter differs from Philosophy source')
    check(set(payload['translations'])=={'de','en'},'language projections changed')
    check(payload['copy']==payload['translations']['de'],'default display expression is not German')
    check(set(payload['pages'])==set(GENES),'public Philosophy pages incomplete')
    check(payload['copy']['brand']=='self-similar-systems saar','public identity changed')

    build.validate_papers(payload['papers']);check(True,'papers projection invalid')
    check(payload['papers']['source']=='papers/_feed','display papers projection lost source identity')
    check([payload['papers']['phenotype'][g] for g in GENES]==['Genesis','Continuity','Governance','Evolution'],'papers address space changed unexpectedly')
    check(sum(len(payload['papers']['groups'][g]) for g in GENES)==48,'papers projection must carry 48 source organisms')
    check('drive.google.com' not in json.dumps(payload['papers']),'private Drive pointers leaked into public papers projection')

    style=(DISPLAY/'style.css').read_text(encoding='utf-8')+(DISPLAY/'philosophy.css').read_text(encoding='utf-8')
    check('prefers-reduced-motion' in style,'reduced-motion accommodation missing')
    check('localStorage.' not in actual and 'document.cookie' not in actual,'unexpected browser persistence')
    check('mailto:' not in actual,'public contact has not been approved')
    for rel in ('assets/style.css','assets/philosophy.css','assets/papers.css','assets/favicon.svg',
                'assets/view.js','assets/philosophy-view.js','assets/papers-view.js',
                'assets/address.js','assets/navigation.js','assets/app.js','.nojekyll'):
        check((artifact/rel).is_file(),f'missing artifact member {rel}')

    for source in (DISPLAY/'view.js',DISPLAY/'philosophy-view.js',DISPLAY/'papers-view.js',
                   ROOT/'z/address.js',ROOT/'z/navigation.js',ROOT/'z/app.js'):
        result=subprocess.run(['node','--check',str(source)],capture_output=True,text=True)
        check(result.returncode==0,result.stderr or f'javascript syntax failure: {source}')
    compile((ROOT/'y/browser-check.py').read_text(encoding='utf-8'),str(ROOT/'y/browser-check.py'),'exec');check(True,'browser-check syntax')
    check((ROOT/'CNAME').read_text(encoding='utf-8').strip()=='sss.saarland','unexpected custom domain')

    print(json.dumps({
        'status':'pass',
        'structural_checks':count,
        'host':'cambium',
        'organ':'display',
        'root_encounter':'philosophy',
        'philosophy_4V':[public_index[g]['name'] for g in GENES],
        'display_invariant':'address -> CCCC -> concept -> question',
        'languages':encounter['available_languages'],
        'host_feed_home':host_feed['reflected_home_event'],
        'display_feed_home':display_feed['reflected_home_event'],
        'artifact':artifact.relative_to(ROOT).as_posix() if artifact.is_relative_to(ROOT) else str(artifact)
    },indent=2))


if __name__=='__main__':
    main()
