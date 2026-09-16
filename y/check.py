#!/usr/bin/env python3
"""Structural witness for the tree-addressed Display organism."""
from pathlib import Path
import argparse, html.parser, importlib.util, json, os, subprocess

ROOT=Path(__file__).resolve().parent.parent
DISPLAY=ROOT/'w'/'display'
count=0

def check(condition,why):
    global count; count+=1
    if not condition: raise AssertionError(why)

class Page(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(); self.ids=[]; self.scripts=[]; self.links=[]; self.interlocutors=[]
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if 'id' in d:self.ids.append(d['id'])
        if 'data-interlocutor' in d:self.interlocutors.append(d['data-interlocutor'])
        if tag=='script':self.scripts.append(d)
        if tag=='link':self.links.append(d)

def load_build():
    p=ROOT/'y/build.py'; spec=importlib.util.spec_from_file_location('compose',p); mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); return mod

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--artifact',type=Path,default=ROOT/'_site'); args=ap.parse_args()
    artifact=args.artifact if args.artifact.is_absolute() else ROOT/args.artifact
    build=load_build()

    index=build.load_yaml(DISPLAY/'INDEX.yaml'); build.validate_index(index)
    check({g:index[g]['noun'] for g in 'wxzy'}=={'w':'Embodiment','x':'Continuity','z':'Orientation','y':'Population'},'Display 4V phenotype changed')
    constitution=build.load_yaml(DISPLAY/'_cambium.yaml'); build.validate_cambium(constitution,'w/display/_cambium.yaml')
    allowed_root={'INDEX.yaml','RITUALS','_cambium.yaml','_feed','_root','_stomach','_waste','w','x','z','y'}
    check({p.name for p in DISPLAY.iterdir()}==allowed_root,'Display root retains noncanonical or active tissue')
    check(not (ROOT/'w'/'interface.md').exists(),'ad-hoc w/interface.md membrane file returned')
    for gene in 'wxzy': check((DISPLAY/gene).is_dir() and not (DISPLAY/gene/'ROLE.md').exists(),f'Display vertex {gene} is missing or still marker-only')
    for ritual in ('organism','navigation','site-holon'): check((DISPLAY/'RITUALS'/ritual/'RITUAL.md').is_file(),f'missing {ritual} ritual')

    sites=build.discover_sites(); by_id={s['id']:s for s in sites}
    check(set(by_id)=={'organism:philosophy','organism:papers'},'unexpected first Population site set')
    check(by_id['organism:philosophy']['address']=='','Philosophy must occupy site-space overview')
    check(by_id['organism:papers']['address']=='y','Papers must occupy site-space y')
    check(by_id['organism:philosophy']['site_dir']==DISPLAY/'y'/'philosophy','Philosophy physical body not at display/y/philosophy')
    check(by_id['organism:papers']['site_dir']==DISPLAY/'y'/'yy'/'papers','Papers physical body not at display/y/yy/papers')
    check((DISPLAY/'y'/'philosophy'/'INDEX.yaml').is_file(),'Philosophy local recursive body was not transplanted')
    check((DISPLAY/'y'/'philosophy'/'_cambium.yaml').is_file(),'Philosophy local constitution was not transplanted')
    registry=build.site_mounts()
    check(registry['version']==3 and registry['source']=='w/display/y tree','mount registry is not tree-derived')
    rel={(m['interlocutor'],m['scope'],m['address']) for m in registry['mounts']}
    check(rel=={('organism:philosophy','main',''),('organism:papers','main','y')},'tree-derived mount relation changed')
    check(build.root_projection()['source']['organism']=='main-root','Philosophy projection identity changed')
    check(build.papers_projection()['source']=='papers/_feed','Papers projection boundary changed')

    build_source=(ROOT/'y/build.py').read_text(encoding='utf-8')
    check("site-mounts.json" not in build_source,'flat site-mounts.json remains build authority')
    check("main-root.json" not in build_source and "papers.json" not in build_source,'flat page projection remains build authority')
    assets=build.asset_sources()
    check('interlocutor-philosophy.js' not in assets and 'interlocutor-papers.js' not in assets,'flat interlocutor adapters remain public authority')
    check(any(k.startswith('site-organism-philosophy') for k in assets),'Philosophy identity-owned assets missing')
    check(any(k.startswith('site-organism-papers') for k in assets),'Papers identity-owned assets missing')

    build.verify_artifact(artifact)
    actual=(artifact/'index.html').read_text(encoding='utf-8'); check(actual==build.render(),'artifact HTML stale')
    p=Page(); p.feed(actual); check(len(p.ids)==len(set(p.ids)),'duplicate element ids')
    for eid in ('navTwin','axis-x','axis-y','mini','mini-trigger','mini-pocket','mini-core','commit','site-registry','site-projections','site-state','tetra-fold','interlocutor-stage'):
        check(eid in p.ids,f'missing invariant surface {eid}')
    check(set(p.interlocutors)=={'organism:philosophy','organism:papers'},'generic site surfaces do not match discovered Population')
    check(not (artifact/'papers/index.html').exists(),'Papers regressed to a separate document/page')

    bundle=build.asset_bundle_id(); prefix=f'assets/{bundle}/'
    srcs={s.get('src') for s in p.scripts if s.get('src')}; styles={d.get('href') for d in p.links if d.get('rel')=='stylesheet'}; icons={d.get('href') for d in p.links if d.get('rel')=='icon'}
    expected_scripts={prefix+n for n in assets if n.endswith('.js')}; expected_styles={prefix+n for n in assets if n.endswith('.css')}; expected_icons={prefix+n for n in assets if n.endswith('.svg')}
    check(srcs==expected_scripts,'unexpected public script surface or mixed generation')
    check(styles==expected_styles,'unexpected public stylesheet surface or mixed generation')
    check(icons==expected_icons,'favicon escaped membrane bundle namespace')
    public_refs=srcs|styles|icons; check(public_refs and all(x.startswith(prefix) for x in public_refs),'public assets do not share one immutable bundle')
    check(f'<!-- membrane bundle {bundle};' in actual,'HTML does not declare membrane bundle generation')
    bundle_dir=artifact/'assets'/bundle; check(bundle_dir.is_dir(),'content-addressed membrane bundle missing')
    check({q.name for q in bundle_dir.iterdir() if q.is_file()}==set(assets),'bundle file set diverges from tree-derived asset contract')

    nav=(DISPLAY/'z'/'navigation-physiology.js').read_text(); world=(DISPLAY/'z'/'world-view.js').read_text(); runtime=(DISPLAY/'x'/'display-runtime-v2.js').read_text(); holon=(DISPLAY/'x'/'site-holon.js').read_text(); fold=(DISPLAY/'z'/'site-fold.js').read_text(); site_css=(DISPLAY/'z'/'site-runtime.css').read_text(); aperture=(DISPLAY/'z'/'navigation-aperture.js').read_text(); aperture_css=(DISPLAY/'z'/'navigation-aperture.css').read_text(); fields=(DISPLAY/'w'/'locus-shader.js').read_text()
    check('semanticPoint' in nav and 'locus:A.key(path)' in nav,'semantic place is not exact recursive locus')
    check('center:[...record.center]' in nav,'camera focus is not recursive split-tet centroid')
    check('GLOBAL_TARGETS' in world and 'hitTarget' in world and 'sss:global-navigate' in world,'global minimap is not direct mounted-site navigation')
    check('swingback' not in world.lower(),'automatic Philosophy swingback returned')
    check("document.getElementById('site-registry')" in runtime and "document.getElementById('site-projections')" in runtime,'runtime is not fed by tree-derived registry/projections')
    check('organism:philosophy' not in runtime and 'organism:papers' not in runtime,'central runtime still names specimen identities')
    check('SSSInterlocutorModules' in runtime and 'Modules.get(id)' in runtime,'generic interlocutor module registry missing')
    check('W.setGlobalTargets(globalTargets())' in runtime,'global navigator not synchronized from discovered mounts')
    check('raw address already occupied' in holon and 'getRawOccupant' in holon,'raw-address exclusion primitive missing')
    check('W.orientation' in fields,'interlocutor backgrounds do not share global orientation')
    check('AXIS_SETTLE_EPS' in world and "dataset.latched='true'" in world,'exact settle-to-lock behavior missing')
    check('context.origin' in fold and '--fold-x' in fold and '--fold-y' in fold,'transition is not anchored to chosen target')
    check('clip-path:polygon(0 0,100% 0,var(--fold-x) var(--fold-y))' in site_css,'target-origin tetrahedral iris missing')
    check("data-aperture=\"closed\"" in actual and "dataset.aperture='open'" in aperture,'global navigator is not aperture-owned')
    check('@keyframes aperture-shell-resolve' in aperture_css,'split aperture resolve animation missing')
    check('location.assign' not in runtime and 'location.href' not in runtime,'document redirect architecture returned')

    js_sources=['z/world-view.js','z/navigation-physiology.js','x/site-holon.js','z/site-fold.js','x/display-runtime-v2.js','w/locus-shader.js','z/navigation-aperture.js']+[s['renderer_path'].relative_to(DISPLAY).as_posix() for s in sites]
    for source in js_sources:
        result=subprocess.run(['node','--check',str(DISPLAY/source)],capture_output=True,text=True); check(result.returncode==0,result.stderr or f'JS syntax failure {source}')
    for test in ('z/navigation-physiology.test.cjs','x/site-holon.test.cjs','z/site-fold.test.cjs'):
        result=subprocess.run(['node',str(DISPLAY/test)],capture_output=True,text=True); check(result.returncode==0,result.stderr or f'test failed {test}')
    result=subprocess.run(['node',str(ROOT/'y/test-address.cjs')],env={**os.environ,'SITE_DIR':str(artifact)},capture_output=True,text=True); check(result.returncode==0,result.stderr or 'address witness failed')
    result=subprocess.run(['python3',str(ROOT/'y/test-site-relocation.py')],capture_output=True,text=True); check(result.returncode==0,result.stderr or 'whole-site relocation witness failed')

    print(json.dumps({
        'status':'pass','checks':count,'display_4V':{g:index[g]['noun'] for g in 'wxzy'},
        'population':'w/display/y tree is canonical mount truth',
        'sites':{s['id']:s['address'] or 'ε' for s in sites},
        'runtime':'generic identity modules; no specimen names in central runtime',
        'relocation':'whole Papers body moves by folder with zero internal edits',
        'bundle':bundle,'artifact':'single index.html'
    },indent=2))

if __name__=='__main__': main()
