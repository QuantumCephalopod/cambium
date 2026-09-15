#!/usr/bin/env python3
"""Structural witness for the persistent two-specimen Display membrane."""
from pathlib import Path
import argparse, html.parser, importlib.util, json, subprocess

ROOT=Path(__file__).resolve().parent.parent
DISPLAY=ROOT/'w'/'display'
count=0

def check(condition,why):
    global count; count+=1
    if not condition: raise AssertionError(why)

class Page(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(); self.ids=[]; self.scripts=[]; self.links=[]
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if 'id' in d:self.ids.append(d['id'])
        if tag=='script':self.scripts.append(d)
        if tag=='link':self.links.append(d)

def load_build():
    p=ROOT/'y/build.py'; spec=importlib.util.spec_from_file_location('compose',p); mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); return mod

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--artifact',type=Path,default=ROOT/'_site'); args=ap.parse_args()
    artifact=args.artifact if args.artifact.is_absolute() else ROOT/args.artifact
    build=load_build()
    check((DISPLAY/'INDEX.yaml').read_text().strip()=='{}','Display must remain internally unsplit')
    check(not (DISPLAY/'_cambium.yaml').exists(),'Display falsely claims local semantic split')
    for ritual in ('organism','navigation','site-holon'):
        check((DISPLAY/'RITUALS'/ritual/'RITUAL.md').is_file(),f'missing {ritual} ritual')
    for member in ('world-view.js','navigation-physiology.js','site-holon.js','site-fold.js','display-runtime-v2.js','locus-shader.js','interlocutor-philosophy.js','interlocutor-papers.js','interlocutors.css','navigation-aperture.css','navigation-aperture.js','site-mounts.json'):
        check((DISPLAY/member).is_file(),f'missing Display member {member}')

    mainp=build.root_projection(); papers=build.papers_projection(); mounts=build.site_mounts()
    check(mainp['source']['organism']=='main-root','main projection identity changed')
    check([mainp['root']['children'][g]['noun'] for g in 'wxzy']==['Form','Continuity','Care','Inquiry'],'main root 4V changed')
    check([papers['phenotype'][g] for g in 'wxzy']==['Genesis','Continuity','Governance','Evolution'],'Papers local 4V changed')
    ids={x['id'] for x in mounts['interlocutors']}; check(ids=={'organism:philosophy','organism:papers'},'first two page-organism identities changed')
    rel={(m['interlocutor'],m['scope'],m['address']) for m in mounts['mounts']}
    check(('organism:philosophy','main','') in rel,'Philosophy must mount at main root')
    check(('organism:papers','main','y') in rel,'Papers must mount at main:y')
    philosophy=next(x for x in mounts['interlocutors'] if x['id']=='organism:philosophy')
    paper=next(x for x in mounts['interlocutors'] if x['id']=='organism:papers')
    check(philosophy['manifestation']['background_inspect'] is True,'Philosophy lost background inspection specialty')
    check(paper['manifestation']['background_inspect'] is False,'Papers must not inherit Philosophy background inspection')
    check(paper['local_scope']=='papers','Papers must preserve its independent local root identity')
    check(philosophy['shader']['id']!=paper['shader']['id'],'shader identity must belong to interlocutor identity')

    build.verify_artifact(artifact)
    actual=(artifact/'index.html').read_text(encoding='utf-8')
    check(actual==build.render(),'artifact HTML stale')
    p=Page(); p.feed(actual)
    check(len(p.ids)==len(set(p.ids)),'duplicate element ids')
    for eid in ('navTwin','axis-x','axis-y','mini','mini-trigger','mini-pocket','mini-core','commit','root-projection','papers-projection','site-mounts','site-state','tetra-fold','philosophy-interlocutor','papers-interlocutor','philosophy-background','papers-background'):
        check(eid in p.ids,f'missing invariant surface {eid}')
    check(not (artifact/'papers/index.html').exists(),'Papers regressed to a separate document/page')

    bundle=build.asset_bundle_id(); prefix=f'assets/{bundle}/'
    srcs={s.get('src') for s in p.scripts if s.get('src')}
    expected_scripts={prefix+x for x in ('address.js','site-holon.js','site-fold.js','navigation-physiology.js','world-view.js','interlocutor-philosophy.js','interlocutor-papers.js','locus-shader.js','navigation-aperture.js','display-runtime-v2.js')}
    check(srcs==expected_scripts,'unexpected public script surface or mixed membrane generation')
    styles={d.get('href') for d in p.links if d.get('rel')=='stylesheet'}
    expected_styles={prefix+x for x in ('root-view.css','site-runtime.css','interlocutors.css','navigation-aperture.css')}
    check(styles==expected_styles,'unexpected stylesheet surface or mixed membrane generation')
    icons={d.get('href') for d in p.links if d.get('rel')=='icon'}
    check(icons=={prefix+'favicon.svg'},'favicon escaped membrane bundle namespace')
    public_refs=srcs|styles|icons
    check(public_refs and all(x.startswith(prefix) for x in public_refs),'public assets do not share one immutable membrane bundle')
    check(all(not x.startswith('assets/') or x.startswith(prefix) for x in public_refs),'legacy flat asset URL survived bundle generation')
    check(f'<!-- membrane bundle {bundle};' in actual,'HTML does not declare its membrane bundle generation')
    bundle_dir=artifact/'assets'/bundle
    check(bundle_dir.is_dir(),'content-addressed membrane bundle directory missing')
    check({p.name for p in bundle_dir.iterdir() if p.is_file()}==set(build.asset_sources()),'bundle file set diverges from source contract')

    nav=(DISPLAY/'navigation-physiology.js').read_text(); world=(DISPLAY/'world-view.js').read_text(); runtime=(DISPLAY/'display-runtime-v2.js').read_text(); holon=(DISPLAY/'site-holon.js').read_text(); aperture=(DISPLAY/'navigation-aperture.js').read_text(); aperture_css=(DISPLAY/'navigation-aperture.css').read_text(); fields=(DISPLAY/'locus-shader.js').read_text()
    check('semanticPoint' in nav and 'locus:A.key(path)' in nav,'semantic place is not exact recursive locus')
    check('center:[...record.center]' in nav,'camera focus is not the centroid of the selected recursive split-tet')
    check("twin.addEventListener('pointerdown'" in world,'global minimap navigation missing')
    check('GLOBAL_TARGETS' in world and 'for(const t of GLOBAL_TARGETS)' in world,'global minimap does not derive visible targets from mounted page-organisms')
    check("sss:global-navigate" in world and 'requestGlobalTarget' in world,'global minimap still inspects Philosophy instead of requesting organism navigation')
    check("targetPoint(t){return t.path===''?[0,0,0]" in world and 'strokeRect' in world,'Philosophy overview mount is not a distinct global-centroid target')
    check("const GLOBAL_SCOPE='main'" in runtime and 'resolveGlobal' in runtime and 'registry.resolve(GLOBAL_SCOPE' in runtime,'global navigator is not pinned to the global host address space')
    check('W.setScope({id:GLOBAL_SCOPE,projection:MAIN})' in runtime,'global navigator does not initialize from the global main projection')
    check('W.setGlobalTargets(globalTargets())' in runtime and 'W.setActiveGlobalAddress' in runtime,'runtime does not project global mount targets into the navigator')
    check("addEventListener('sss:global-navigate'" in runtime and 'navigateGlobal' in runtime,'global navigator does not directly change the active page-organism encounter')
    check("Papers.render({projection:PAPERS,path:''})" in runtime,'global navigator leaked into Papers-local navigation')
    check("scopeId=r.interlocutors" not in runtime and "scopeId='papers'" not in runtime,'interlocutor entry still hijacks global navigator scope')
    check('raw address already occupied; differentiate before mounting another interlocutor' in holon,'raw-address pile-up is not rejected before preemptive differentiation')
    check('getAtAddress' in holon,'registry cannot witness exact global address occupancy')
    check('interactive:true' in runtime and 'interactive:false' in runtime,'Philosophy/Papers background specialties collapsed')
    check('W.orientation' in fields,'interlocutor backgrounds do not share global orientation state')
    check('AXIS_SETTLE_EPS' in world and "dataset.latched='true'" in world,'settle-to-lock exact axis behavior missing')
    check('HOME_ORIENT' in world and 'qSlerp' in world and 'philosophy-swingback' in world,'Philosophy orientation swingback physiology missing')
    check('location.assign' not in runtime and 'location.href' not in runtime,'document redirect architecture returned')
    check('localScope' in holon,'interlocutor local root identity missing')
    check('new Set()' in holon and 'loci.get(key).add(id)' in holon,'quotient locus cannot compose interlocutors from distinct addresses')
    check('active.length === 2' in holon and "mode:'grid'" in holon,'multi-interlocutor composition law missing')
    check("data-aperture=\"closed\"" in actual and 'aria-controls="mini-pocket"' in actual,'global navigator is not aperture-owned')
    check('class="shape-square"' in actual and 'class="shape-diamond"' in actual,'single/split aperture marker variants missing')
    check("dataset.aperture='open'" in aperture and "dataset.pinned" in aperture,'aperture open/pin state missing')
    check('--trigger-shape-rotate:45deg' in aperture_css and '--pocket-open-clip:polygon(8% 14%,92% 14%,92% 86%,8% 86%)' in aperture_css,'split seam diamond-to-rect cavity law missing')
    check('@keyframes aperture-shell-resolve' in aperture_css and '--shell-rotate-closed:45deg' in aperture_css,'split aperture resolve animation missing')
    check('#mini-trigger .shape-diamond{display:none}' in aperture_css,'single encounter must default to square membrane port')
    check('#mini-pocket' in aperture_css and 'pointer-events:none' in aperture_css,'closed navigator still consumes interlocutor content interaction')

    for source in ('world-view.js','navigation-physiology.js','site-holon.js','site-fold.js','display-runtime-v2.js','locus-shader.js','interlocutor-philosophy.js','interlocutor-papers.js','navigation-aperture.js'):
        result=subprocess.run(['node','--check',str(DISPLAY/source)],capture_output=True,text=True)
        check(result.returncode==0,result.stderr or f'JS syntax failure {source}')
    for test in ('navigation-physiology.test.cjs','site-holon.test.cjs'):
        result=subprocess.run(['node',str(DISPLAY/test)],capture_output=True,text=True)
        check(result.returncode==0,result.stderr or f'test failed {test}')
    result=subprocess.run(['node',str(ROOT/'y/test-address.cjs')],env={**__import__('os').environ,'SITE_DIR':str(artifact)},capture_output=True,text=True)
    check(result.returncode==0,result.stderr or 'address witness failed')

    print(json.dumps({
        'status':'pass','checks':count,'display':'one persistent membrane',
        'bundle':bundle,'asset_generation':'one content-addressed namespace',
        'specimens':['organism:philosophy','organism:papers'],
        'navigation':'global minimap exposes mounted organism targets only and jumps directly between encounters / Philosophy background inspects realized addresses / camera frames recursive split centroids',
        'placement':'exact raw-address pile-up forbidden; differentiate before adding another site; quotient-coalesced distinct addresses still compose',
        'mounting':'page-organism identity and local root independent of global host locus',
        'artifact':'single index.html'
    },indent=2))

if __name__=='__main__': main()
