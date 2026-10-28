#!/usr/bin/env python3
"""Structural witness for the tree-addressed Display organism."""
from pathlib import Path
import argparse, ctypes.util, html.parser, importlib.util, json, os, re, subprocess

ROOT=Path(__file__).resolve().parent.parent
DISPLAY=ROOT/'w'/'display'
count=0

def check(condition,why):
    global count; count+=1
    if not condition: raise AssertionError(why)

def check_current_intakes(root):
    """A direct current intake cannot be a completed-work approval queue.

    This checks declared current status only. Semantic retirement still belongs
    to the organism; historical waste/HOME and genuine partial work are not
    inferred as open/closed by searching their prose.
    """
    for path in sorted((root/'_stomach').glob('*.md')):
        status=next((line.split(':',1)[1].strip().lower() for line in path.read_text(encoding='utf-8-sig').splitlines() if line.strip().lower().startswith('status:')), '')
        normalized=re.sub(r'[_–—-]+',' ',status)
        completed='implemented native' in normalized and not any(word in normalized for word in ('partial','residual'))
        gate=any(marker in normalized for marker in ('owner acceptance pending','owner promotion pending','live visitor acceptance pending','live owner acceptance pending','exact candidate visitor acceptance pending','exact candidate visitor witness pending'))
        check(not (completed or gate),f'{path}: spent intake/personal acceptance gate remains current; inherit shared Metabolism, close bounded work through HOME and local waste, or name a genuinely unfinished functional remainder')

class Page(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(); self.ids=[]; self.scripts=[]; self.links=[]; self.interlocutors=[]; self.label_hosts=[]; self.hidden_stack=[]
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        # Inactive site sections are hidden until mounted. A permanent ARIA
        # barrier must not survive that activation around native body buttons.
        hidden=d.get('aria-hidden')=='true' or any(v for _,v in self.hidden_stack)
        if 'interlocutor-field-labels' in d.get('class','').split():self.label_hosts.append(hidden)
        if tag not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}:self.hidden_stack.append((tag,hidden))
        if 'id' in d:self.ids.append(d['id'])
        if 'data-interlocutor' in d:self.interlocutors.append(d['data-interlocutor'])
        if tag=='script':self.scripts.append(d)
        if tag=='link':self.links.append(d)
    def handle_endtag(self,tag):
        for i in range(len(self.hidden_stack)-1,-1,-1):
            if self.hidden_stack[i][0]==tag:
                del self.hidden_stack[i:]; break

def load_module(path,name):
    spec=importlib.util.spec_from_file_location(name,path); mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); return mod

def load_build(): return load_module(ROOT/'y/build.py','compose')
def load_public(): return load_module(ROOT/'y/site-public.py','site_public')

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--artifact',type=Path,default=ROOT/'_site'); args=ap.parse_args()
    artifact=args.artifact if args.artifact.is_absolute() else ROOT/args.artifact
    build=load_build(); public=load_public()

    index=build.load_yaml(DISPLAY/'INDEX.yaml'); build.validate_index(index)
    check({g:index[g]['noun'] for g in 'wxzy'}=={'w':'Embodiment','x':'Continuity','z':'Orientation','y':'Population'},'Display 4V phenotype changed')
    constitution=build.load_yaml(DISPLAY/'_cambium.yaml'); build.validate_cambium(constitution,'w/display/_cambium.yaml')
    allowed_root={'INDEX.yaml','RITUALS','_cambium.yaml','_feed','_root','_stomach','_waste','w','x','z','y'}
    check({p.name for p in DISPLAY.iterdir()}==allowed_root,'Display root retains noncanonical or active tissue')
    check(not (ROOT/'w'/'interface.md').exists(),'ad-hoc w/interface.md membrane file returned')
    for gene in 'wxzy': check((DISPLAY/gene).is_dir() and not (DISPLAY/gene/'ROLE.md').exists(),f'Display vertex {gene} is missing or still marker-only')
    for ritual in ('organism','navigation','site-holon'): check((DISPLAY/'RITUALS'/ritual/'RITUAL.md').is_file(),f'missing {ritual} ritual')

    sites=build.discover_sites(); by_id={s['id']:s for s in sites}
    for owner in (ROOT,DISPLAY,*(site['site_dir'] for site in sites)):check_current_intakes(owner)
    lifecycle=subprocess.run(['python3',str(ROOT/'y/test-lifecycle.py')],capture_output=True,text=True)
    check(lifecycle.returncode==0,lifecycle.stderr or 'intake completion refusal witness failed')
    expected_sites={'organism:philosophy','organism:papers','organism:crawlerbait','organism:schattenseiten','organism:datenschutz','organism:impressum'}
    check(set(by_id)==expected_sites,'unexpected Population site set')
    for site in sites:
        site_root=site['site_dir']
        check((site_root/'RITUALS'/'organism'/'RITUAL.md').is_file(),f"{site['title']} local organism receptor missing")
        for shell in ('_stomach','_feed','_root','_waste'):
            check((site_root/shell).is_dir(),f"{site['title']} lifecycle shell missing {shell}")
    check(all(s.get('version')==2 and s.get('ui_grid')=='ui-grid.json' for s in sites),'site-holon v2 UI-grid membrane missing')
    check(all((s.get('ui_grid_data') or {}).get('schema')=='sss.display.ui-grid.v2' for s in sites),'site-holon canonical UI-grid schema drifted')
    check(by_id['organism:philosophy']['address']=='','Philosophy must occupy site-space overview')
    check(by_id['organism:crawlerbait']['address']=='w','Crawlerbait must occupy site-space w / Form')
    check(by_id['organism:papers']['address']=='y','Papers must occupy site-space y')
    check(by_id['organism:datenschutz']['address']=='z','Datenschutz must occupy site-space z / Care')
    check(by_id['organism:impressum']['address']=='xz','Impressum must occupy site-space xz / Continuity × Care')
    check(by_id['organism:philosophy']['manifestation']['background_drag'] is True,'Philosophy did not inherit default background drag')
    check(by_id['organism:papers']['manifestation']['background_drag'] is True,'Papers did not inherit default background drag')
    check(by_id['organism:crawlerbait']['manifestation']['background_drag'] is True,'Crawlerbait explicit background-drag test toggle is not true')
    check(by_id['organism:philosophy']['site_dir']==DISPLAY/'y'/'philosophy','Philosophy physical body not at display/y/philosophy')
    crawler=DISPLAY/'y'/'yw'/'crawlerbait'
    check(by_id['organism:crawlerbait']['site_dir']==crawler,'Crawlerbait physical body not at display/y/yw/crawlerbait')
    check(by_id['organism:papers']['site_dir']==DISPLAY/'y'/'yy'/'papers','Papers physical body not at display/y/yy/papers')
    datenschutz=DISPLAY/'y'/'yz'/'datenschutz'
    impressum=DISPLAY/'y'/'yxz'/'impressum'
    check(by_id['organism:datenschutz']['site_dir']==datenschutz,'Datenschutz physical body not at display/y/yz/datenschutz')
    check(by_id['organism:impressum']['site_dir']==impressum,'Impressum physical body not at display/y/yxz/impressum')
    for legal in (datenschutz,impressum):
        check((legal/'INDEX.yaml').is_file(),f'{legal.name} phenotype missing')
        build.validate_index(build.load_yaml(legal/'INDEX.yaml'))
        build.validate_cambium(build.load_yaml(legal/'_cambium.yaml'),f'{legal.name}/_cambium.yaml')
        check((legal/'RITUALS'/'organism'/'RITUAL.md').is_file(),f'{legal.name} local receptor missing')
        check((legal/'_stomach').is_dir(),f'{legal.name} stomach missing')
        check((legal/'_feed').is_dir(),f'{legal.name} feed missing')
    check((DISPLAY/'y'/'philosophy'/'INDEX.yaml').is_file(),'Philosophy local recursive body was not transplanted')
    check((DISPLAY/'y'/'philosophy'/'_cambium.yaml').is_file(),'Philosophy local constitution was not transplanted')

    # Source anatomy, capture/privacy policy, cursor continuity and Bait shape are
    # owned by each site's declared build witness below. No schema dispatch here.

    registry=build.site_mounts()
    check(registry['version']==3 and registry['source']=='w/display/y tree','mount registry is not tree-derived')
    rel={(m['interlocutor'],m['scope'],m['address']) for m in registry['mounts']}
    check(rel=={
        ('organism:philosophy','main',''),
        ('organism:crawlerbait','main','w'),
        ('organism:papers','main','y'),
        ('organism:schattenseiten','main','x'),
        ('organism:datenschutz','main','z'),
        ('organism:impressum','main','xz'),
    },'tree-derived mount relation changed')
    for site in sites:
        if build.witness_site_build(site):
            check(True, f'{site["id"]}: owner build evidence passed')

    build_source=(ROOT/'y/build.py').read_text(encoding='utf-8')
    check("site-mounts.json" not in build_source,'flat site-mounts.json remains build authority')
    check("main-root.json" not in build_source and "papers.json" not in build_source,'flat page projection remains build authority')
    assets=build.asset_sources()
    check('interlocutor-philosophy.js' not in assets and 'interlocutor-papers.js' not in assets,'flat interlocutor adapters remain public authority')
    check(any(k.startswith('site-organism-philosophy') for k in assets),'Philosophy identity-owned assets missing')
    check(any(k.startswith('site-organism-papers') for k in assets),'Papers identity-owned assets missing')
    check(any(k.startswith('site-organism-crawlerbait') for k in assets),'Crawlerbait identity-owned assets missing')

    public_files=public.site_public_files()
    check('crawlerbait/index.html' in public_files and 'crawlerbait/state.json' in public_files,'Crawlerbait machine-facing static hub missing')
    check('impressum/index.html' in public_files,'Impressum public route missing')
    check('privacy/index.html' in public_files,'Privacy public route missing')
    impressum_public=public_files['impressum/index.html'].decode('utf-8')
    privacy_public=public_files['privacy/index.html'].decode('utf-8')
    check('contact@sss.saarland' in impressum_public,'Impressum public contact missing')
    check('privacy@sss.saarland' in privacy_public,'Privacy public contact missing')
    check('Katharinenstr. 6A, 1. OG' in impressum_public and 'Katharinenstr. 6A, 1. OG' in privacy_public,'public legal operator address drifted')
    check(all(not p.startswith('assets/') and p not in {'index.html','.nojekyll','CNAME'} for p in public_files),'site public surface escaped reserved artifact namespace')
    public.verify_artifact(artifact)
    actual=(artifact/'index.html').read_text(encoding='utf-8'); check(actual==build.render(),'artifact HTML stale')
    p=Page(); p.feed(actual); check(len(p.ids)==len(set(p.ids)),'duplicate element ids')
    check(len(p.label_hosts)==len(expected_sites) and not any(p.label_hosts),'floating body buttons inherit a hidden accessibility subtree')
    for eid in ('navTwin','axis-x','axis-y','mini','mini-trigger','mini-pocket','mini-core','site-registry','site-projections','site-feed-locations','site-ui-grids','display-dependencies','site-state','display-membrane-status','tetra-fold','interlocutor-stage'):
        check(eid in p.ids,f'missing invariant surface {eid}')
    check(set(p.interlocutors)==expected_sites,'generic site surfaces do not match discovered Population')
    check(not (artifact/'papers/index.html').exists(),'Papers regressed to a separate document/page')
    check((artifact/'crawlerbait/index.html').is_file() and (artifact/'crawlerbait/state.json').is_file(),'Crawlerbait static reef was not secreted into artifact')

    # Generic child-owned feed contract: small preview in entry, full public source only in immutable site asset.
    previews=build.site_projections(); feed_urls=build.site_feed_urls(build.asset_bundle_id())
    check(set(feed_urls)=={'organism:crawlerbait','organism:papers'},'expected first feed-aware site boundaries missing')
    check(all(previews[s]['schema']=='sss.display.feed-preview.v1'
              and previews[s]['identity']==s and set(previews[s]['root']['children'])==set('wxzy')
              for s in feed_urls),'child-owned feed preview identity/4V changed')
    check(all(by_id[s]['projection_data'] is not previews[s] for s in feed_urls),'detail state reentered global preview')
    check(len(actual.encode('utf-8')) < 600000,'global entry still carries detailed feed state')
    check(all((artifact / url).is_file()
              and (artifact / url).read_bytes()==build.json_transport(by_id[s]['projection_path'].read_bytes())
              for s,url in feed_urls.items()),'detailed site feed bytes drifted from child-owned source')
    check(all(url.startswith(f'assets/{build.asset_bundle_id()}/') for url in feed_urls.values()),'site feed escaped immutable publication membrane')

    bundle=build.asset_bundle_id(); prefix=f'assets/{bundle}/'
    srcs={s.get('src') for s in p.scripts if s.get('src')}; styles={d.get('href') for d in p.links if d.get('rel')=='stylesheet'}; icons={d.get('href') for d in p.links if d.get('rel')=='icon'}
    template_assets=build.template_asset_sources()
    expected_scripts={prefix+n for n in template_assets if n.endswith('.js')}; expected_styles={prefix+n for n in template_assets if n.endswith('.css')}; expected_icons={prefix+n for n in template_assets if n.endswith('.svg')}
    check(srcs==expected_scripts,'unexpected public script surface or mixed generation')
    check(styles==expected_styles,'unexpected public stylesheet surface or mixed generation')
    check(icons==expected_icons,'favicon escaped membrane bundle namespace')
    public_refs=srcs|styles|icons; check(public_refs and all(x.startswith(prefix) for x in public_refs),'public assets do not share one immutable bundle')
    check(f'<!-- membrane bundle {bundle};' in actual,'HTML does not declare membrane bundle generation')
    bundle_dir=artifact/'assets'/bundle; check(bundle_dir.is_dir(),'content-addressed membrane bundle missing')
    bundle_files={q.relative_to(bundle_dir).as_posix() for q in bundle_dir.rglob('*') if q.is_file()}
    check(bundle_files==set(assets),'bundle file set diverges from tree-derived asset contract')

    nav=(DISPLAY/'z'/'navigation-physiology.js').read_text(); world=(DISPLAY/'z'/'world-view.js').read_text(); runtime=(DISPLAY/'x'/'display-runtime-v2.js').read_text(); safe=(DISPLAY/'z'/'display-safe-area.js').read_text(); holon=(DISPLAY/'x'/'site-holon.js').read_text(); fold=(DISPLAY/'z'/'site-fold.js').read_text(); site_css=(DISPLAY/'z'/'site-runtime.css').read_text(); aperture=(DISPLAY/'z'/'navigation-aperture.js').read_text(); aperture_css=(DISPLAY/'z'/'navigation-aperture.css').read_text(); fields=(DISPLAY/'w'/'locus-shader.js').read_text(); philosophy_render=(DISPLAY/'y'/'philosophy'/'render.js').read_text()
    check('semanticPoint' in nav and 'locus:A.key(path)' in nav,'semantic place is not exact recursive locus')
    check('center:[...record.center]' in nav,'camera focus is not recursive split-tet centroid')
    check('GLOBAL_TARGETS' in world and 'hitTarget' in world and 'sss:global-navigate' in world,'global minimap is not direct mounted-site navigation')
    check('swingback' not in world.lower(),'automatic Philosophy swingback returned')
    check("document.getElementById('site-registry')" in runtime and "document.getElementById('site-projections')" in runtime and "document.getElementById('site-ui-grids')" in runtime,'runtime is not fed by tree-derived registry/projections/UI grids')
    check('function safeCarrier(host)' in runtime and 'function makeSiteUI(id,host,raw)' in runtime and 'ui:s.ui' in runtime and 'ui.refresh()' in runtime,'generic safe-carrier UI-grid projection missing from runtime')
    check(all(name not in runtime for name in expected_sites),'central runtime still names specimen identities')
    check(all(name not in safe for name in expected_sites),'safe-area contract still names specimen identities')
    check('SSSDisplaySafeArea' in runtime and 'safeArea:Safe.snapshot()' in runtime,'site modules do not receive the Display safe-area contract')
    check('data-display-occupancy="top"' in actual and 'display-membrane-status' in actual,'global membrane occupancy surface missing')
    check('SSSInterlocutorModules' in runtime and 'Modules.get(id)' in runtime,'generic interlocutor module registry missing')
    check("draggable:spec.manifestation?.background_drag!==false" in runtime,'shared field does not inherit the site-holon background-drag contract')
    check("backgroundDrag:spec.manifestation?.background_drag!==false" in runtime,'site-local renderers do not receive the background-drag contract')
    check("draggable=true" in fields and "inspectable=false" in fields,'shared field still conflates background drag with inspection')
    check('paletteSet' in fields,'generic field palette physiology is not reusable by identity-owned environment carriers')
    check('W.setGlobalTargets(globalTargets())' in runtime,'global navigator not synchronized from discovered mounts')
    check('raw address already occupied' in holon and 'getRawOccupant' in holon,'raw-address exclusion primitive missing')
    check('W.orientation' in fields,'interlocutor backgrounds do not share global orientation')
    check("N.addressRecord(structure,raw.path)" in fields,'field points cannot inhabit exact recursive address cells')
    check('AXIS_SETTLE_EPS' in world and "dataset.latched='true'" in world,'exact settle-to-lock behavior missing')
    check('knobShape' in world and "dataset.morph" in world and 'KNOB_SWELL' in world,'axis knob does not show the settle')
    glass=(DISPLAY/'z'/'display-glass.js').read_text(); template=(DISPLAY/'w'/'template.html').read_text()
    check('data-display-occupancy' in glass and 'data-display-glass' in glass and 'assets/display-glass.js' in template,'occupied HUD surfaces are not declared glass')
    lens=(DISPLAY/'z'/'display-lens.js').read_text()
    check('breakAt' in lens and 'assets/display-lens.js' in template and 'uHome' in fields and 'dots(' in fields,'goo lens or halftone missing')
    check('glassBegin' in fields and 'glassEnd' in fields and 'renderbufferStorageMultisample' in fields and 'cmul' in fields,'field does not refract occupied surfaces')
    check('context.origin' in fold and '--fold-x' in fold and '--fold-y' in fold,'transition is not anchored to chosen target')
    particles=(DISPLAY/'z'/'site-fold-particles.js').read_text()
    check('assets/site-fold-particles.js' in template and 'assets/goo-material.js' in template and 'SSSSiteFoldParticles' in fold and 'uTracks[4]' in particles and 'drawArraysInstanced' in particles,'target-origin tetrahedral particle closure missing')
    check("data-aperture=\"closed\"" in actual and "dataset.aperture='open'" in aperture,'global navigator is not aperture-owned')
    check('@keyframes aperture-shell-resolve' in aperture_css,'split aperture resolve animation missing')
    hud=aperture_css.split('Global navigator as HUD',1)[1].split('html[data-composition="split"] #mini,',1)[0] if 'Global navigator as HUD' in aperture_css else ''
    check('--hud-t' in hud and 'background:none' in hud and 'clip-path:none' in hud and 'pointer-events:none' in hud,'single-encounter navigator is not a HUD')
    check('location.assign' not in runtime and 'location.href' not in runtime,'document redirect architecture returned')
    papers_sierpinski=(DISPLAY/'y'/'yy'/'papers'/'sierpinski.js').read_text(encoding='utf-8')
    papers_sierpinski_css=(DISPLAY/'y'/'yy'/'papers'/'sierpinski.css').read_text(encoding='utf-8')
    check('S_QUANTUM_SCALE=.0012' in papers_sierpinski and 'bodyScaleFor' in papers_sierpinski and 'Math.pow(2,rankNumber' in papers_sierpinski,'Papers visual scale is not anchored to the tiny fixed S quantum + recursive 2^n law')
    check('ROOT_FIELD_DESKTOP=1.75' in papers_sierpinski and 'ROOT_FIELD_MOBILE=1.42' in papers_sierpinski and 'overviewBodyScaleFor' in papers_sierpinski and 'populationBodies' in papers_sierpinski and 'collectBody(rec.id' in papers_sierpinski and 'NODE_SCALE' not in papers_sierpinski,'Papers overview does not preserve shared encounter scale + S-anchored recursive rank LOD')
    check('function tutorialCandidates()' in papers_sierpinski and 'startTutorial' in papers_sierpinski and 'stopTutorial' in papers_sierpinski and 'physiologyStory' not in papers_sierpinski,'Papers explanation is not bound to current real specimens')
    check(all(token in papers_sierpinski for token in ('motionA=pointInTet(cell.tet','motionB=pointInTet(cell.tet','motionC=pointInTet(cell.tet','motionD=pointInTet(cell.tet','OVERVIEW_WANDER=.86','OVERVIEW_FLOW_PERIOD_MS=42000','overviewDriftPoint')),'Papers overview motion lost multi-anchor chamber-bounded living flow')
    check('function driftBodies(sim,items,dt,reach,spring=BODY_SPRING)' in papers_sierpinski and 'function driftOrganisms(now)' in papers_sierpinski and 'driftOrganisms(now);' in papers_sierpinski and 'holdInTet(b,items[i].tet)' in papers_sierpinski and 'tet:cell.tet' in papers_sierpinski and 'state?.orgSim?.bodies.get(entity.id)?.p' in papers_sierpinski and 'driftBodies(sim,lights.map(' in papers_sierpinski,'Papers organisms and metabolites no longer share one bounded flow law (spring + neighbour repulsion, chamber-held)')
    check('BACKGROUND_FIELD_ALPHA' in papers_sierpinski and 'BACKGROUND_STAR_ALPHA=.72' in papers_sierpinski and 'NESTED_BACKGROUND_ALPHA' in papers_sierpinski and 'backgroundWorldTranslation' not in papers_sierpinski and 'setBackgroundPassage(1,now)' in papers_sierpinski and 'setBackgroundPassage(0,now)' in papers_sierpinski and 'state.canvas.dataset.backgroundFieldAlpha' in papers_sierpinski and 'state.canvas.dataset.inquiryCameraZ' in papers_sierpinski and 'backgroundPassageZ' not in papers_sierpinski,'Papers scale passage is no longer centripetal through a fixed previous-scale world')
    check('function inquiryFrameFocus()' in papers_sierpinski and 'center:mix3(focus.center,[0,0,0],t)' in papers_sierpinski and 'scale:mix(focus.scale,1,t)' in papers_sierpinski and 'const focus=inquiryFrameFocus(),scale=rootFieldScale(width)*focus.scale' in papers_sierpinski and 'state.canvas.dataset.inquiryFrameCenter' in papers_sierpinski and 'state.canvas.dataset.inquiryFrameScale' in papers_sierpinski,'Papers inquiry does not relax arbitrary chamber focus toward the invariant root-centroid frame')
    check('function rootBodyScaleFor(entity,width)' in papers_sierpinski and 'const scale=rootBodyScaleFor(rec,overviewWidth)' in papers_sierpinski and 'state.canvas.dataset.rootSScale' in papers_sierpinski,'Papers selected organism scale still depends on preselection chamber zoom instead of root S/rank scale')
    check('drawOverviewPhysiology' in papers_sierpinski and 'paperLensLines' in papers_sierpinski and 'tour.readyAt' in papers_sierpinski,'Papers explanation lost timed Pretext commentary at the actual encounter')
    check('OVERVIEW_LIGHT_GAIN=.46' in papers_sierpinski and 'INQUIRY_LIGHT_GAIN=.72' in papers_sierpinski and 'drawLights(population.lights' in papers_sierpinski and 'populationBodies(rect.width,rect.height,fade,starFade,now,cam)' in papers_sierpinski and 'backgroundStarAlpha' in papers_sierpinski,'Papers previous-scale metabolights/quantum embers no longer survive inquiry passage as distant matter')
    check('state.renderer.draw(outerCells(rect.width),overviewQ,[0,0,0],proj,view,{faces:false})' in papers_sierpinski and 'state.renderer.draw(population.leaves,overviewQ,[0,0,0],proj,view,{faces:true})' in papers_sierpinski and 'state.renderer.drawLights(population.lights,overviewQ,[0,0,0],proj,view' in papers_sierpinski,'Papers previous-scale shell/population is being translated away instead of remaining the enclosing inquiry world')
    check('afterDraw:frame=>draw(frame.ms,frame)' in papers_sierpinski and 'createInquiryEnvironment' not in papers_sierpinski and 'environment:false' not in papers_sierpinski,'Papers does not borrow the shared host/frame')
    check('requestAnimationFrame' not in papers_sierpinski and 'FAR_Z/state.sharedFrame.scale' in papers_sierpinski,'Papers retains a parallel renderer clock or camera')
    check('PARENT_FIELD_ID' not in papers_sierpinski and 'createParentInquiryField' not in papers_sierpinski and 'parentInquiryViewTarget' not in papers_sierpinski,'superseded full Philosophy structural parent field remains in Papers')
    check('.papers-inquiry-environment-stage' not in papers_sierpinski_css and '.papers-parent-field-stage' not in papers_sierpinski_css,'Papers retains duplicate environment carriers')
    check('PAPERS_OVERVIEW_BASIS_Y=-.275' in papers_sierpinski and 'overviewOrientation' in papers_sierpinski and 'dataset.overviewBasisY' in papers_sierpinski,'Papers fourfold perceptual rest frame missing')
    check('papers-chamber-labels' in papers_sierpinski and 'updateChamberLabels' in papers_sierpinski and 'chamberLabelNodes' in papers_sierpinski and 'projectPoint(overviewWorldPoint(point,width),overviewOrientation(),cameraZ(),width,height)' in papers_sierpinski and '.papers-chamber-label' in papers_sierpinski_css,'Papers chamber identity/count witnesses are detached from the live inward inquiry camera')
    check('own=cell.tet[GENES.indexOf(gene)]' in papers_sierpinski and 'cell.tet[0].map(' not in papers_sierpinski,'Papers chamber label hangs from a vertex its chamber shares with another chamber instead of its own outer corner')
    check('function drawNames(' in papers_sierpinski and 'drawNames(rect,now)' in papers_sierpinski and 'dataset.nameClusters' in papers_sierpinski,'Papers organism names do not sleep as letter-clusters before selection')
    check('MACRO_FILL*cam/sc' in papers_sierpinski,'Papers woven face text is scale-bound by a small (S) body instead of one readable size at every rank')
    check("GENEALOGY_REPAIR_PATH='papers-shadow/genealogy-gap-repair.json'" in papers_sierpinski and 'mergeGenealogyRepair' in papers_sierpinski and 'genealogyRepairCount' in papers_sierpinski,'Papers bounded genealogy-gap hydration missing')
    genealogy_repair=DISPLAY/'y'/'yy'/'papers'/'public'/'papers-shadow'/'genealogy-gap-repair.json'
    check(genealogy_repair.is_file(),'Papers public genealogy repair carrier missing')
    genealogy_repair_data=json.loads(genealogy_repair.read_text(encoding='utf-8'))
    check(genealogy_repair_data.get('schema')=='papers-public-genealogy-gap-repair.v1' and genealogy_repair_data.get('site_id')=='organism:papers','Papers genealogy repair membrane mismatch')
    check(all(isinstance(v,list) and len(v)==4 for v in genealogy_repair_data.get('parents',{}).values()),'Papers genealogy repair contains non-four-parent Holon relation')
    check("field.descendTo(path,'papers:chamber')" in papers_sierpinski and "field.ascend('papers:chamber')" in papers_sierpinski,'Papers chambers are not using the shared walked path')
    check('CHAMBER_SHELL_ALPHA=.55' in papers_sierpinski and 'CHAMBER_FACE_ALPHA' in papers_sierpinski and 'outerCells(rect.width,CHAMBER_FACE_ALPHA)' in papers_sierpinski and '{faces:false}' in papers_sierpinski and 'rec.locus===here' in papers_sierpinski,'Papers visible rank-1 chamber body / container-first Descent witness regressed')
    check("state.canvas.dataset.chamberPath='overview'" in papers_sierpinski and 'state.canvas.dataset.chamberScale' in papers_sierpinski,'Papers chamber passage is not observable')
    check('tutorialButton' in papers_sierpinski and 'papers-physiology-canvas' not in papers_sierpinski,'a dummy explanatory canvas remains beside the real specimen')
    papers_grid=by_id['organism:papers']['ui_grid_data']
    check(set(papers_grid.get('fields',{}))=={'hud','physiology','label','sourceInquiry'} and "ui.bind(state.physiology,'physiology')" in papers_sierpinski and '.papers-physiology button' in papers_sierpinski_css,'Papers explanation control lost its source-owned peripheral UI field')
    check('projection?.source_meta?.[x.id]' in papers_sierpinski and 'EXTERNAL ORIGIN' in papers_sierpinski and 'COMPOSITION' in papers_sierpinski and 'papers-source-inquiry' in papers_sierpinski and 'PAPERS ORGANISM' not in papers_sierpinski and 'papers-source-metabolism' not in papers_sierpinski and 'papers-source-metabolism' not in papers_sierpinski_css,'Papers origin/genealogy surface regressed or redundant tetrahedral anatomy sidebar returned')
    check('function inquiryBody(id)' in papers_sierpinski and 'function inquiryMetabolites(entity)' in papers_sierpinski and 'function metaboliteWisdomText(metabolite)' in papers_sierpinski and 'function updateOrganismInquiry()' in papers_sierpinski and 'function updateSourceInquiry()' not in papers_sierpinski and 'function organismInquiryReceipt(id)' not in papers_sierpinski and 'TETRAHEDRAL BODY · PROJECTION GAP' not in papers_sierpinski,'Papers still forks Source/Holon display law or exposes generic tetrahedron-count filler as content')
    check("credit:'',metabolism:'',externals:[],parents" in papers_sierpinski and "const externals=Array.isArray(entity.externals)?entity.externals:[]" in papers_sierpinski and "externals.join('|')" in papers_sierpinski,'Papers unified inquiry renderer can still receive kind-shaped runtime identities with missing common fields')

    check('function organismEmber(' in papers_sierpinski and 'if(meta.entity)lights.push' in papers_sierpinski and "kind:meta.rank===0?'source-ember':'organism-ember'" in papers_sierpinski and 'function metaboliteField(entity,current,cam,height,now=performance.now())' in papers_sierpinski and "kind:'metabolite'" in papers_sierpinski and 'state.canvas.dataset.organismEmberCount' in papers_sierpinski,'Papers no longer distinguishes navigation embers from actual one-per-metabolite metabolights')
    check("PRETEXT_ID='@chenglou/pretext'" in papers_sierpinski and "state.dependency(PRETEXT_ID,'layout.js')" in papers_sierpinski and "PRETEXT_VERSION='0.0.9'" in papers_sierpinski and 'prepareWithSegments' in papers_sierpinski and 'layoutNextLineRange' in papers_sierpinski and 'materializeLineRange' in papers_sierpinski and 'preparedWisdom(light.id,text,font)' in papers_sierpinski,'Papers per-metabolite floating text is not resolving pinned Pretext by stable Display identity')
    check('metabolite.compression' in papers_sierpinski and "canvas.dataset.wisdomSource='metabolites'" in papers_sierpinski and 'canvas.dataset.wisdomMetabolites=String(lights.length)' in papers_sierpinski and 'return metabolites.map((metabolite,index)=>' in papers_sierpinski and 'pointInTet(tet,{id},.16)' in papers_sierpinski and 'flowPoint(record,now)' in papers_sierpinski and 'preparedWisdom(light.id,text,font)' in papers_sierpinski and 'function inquiryVolumeText(entity)' not in papers_sierpinski and 'function inquiryWisdomText(entity)' not in papers_sierpinski,'Papers metabolites are no longer one-per-light self-similar floating Pretext wisdom')
    check('papers-wisdom-stage' in papers_sierpinski and 'wisdomState' in papers_sierpinski,'Papers metabolight text ink plane missing')
    check('function populationInView(' in papers_sierpinski and 'rankNumber(state.identities.get(id)?.rank)-depth' in papers_sierpinski and 'MAX_DEPTH=8' not in papers_sierpinski and 'state.canvas.dataset.organismEmberCount' in papers_sierpinski, 'Papers background visibility/earned-rank collector law missing')
    check('state.tissueLive=T.length>0' in papers_sierpinski and 'const lens=state.tissueLens' in papers_sierpinski and 'state.tissueLetters=earned&&tissueOn()?[]:null' in papers_sierpinski,'Papers text tissue is no longer activation/visibility bounded')
    check('METABOLITE_FIELD_SCALE=.32' in papers_sierpinski and 'METABOLITE_LABEL_MAX_WIDTH=320' in papers_sierpinski and 'state.renderer.drawLights(metabolights' in papers_sierpinski and 'drawWisdom(rect,cam,translate,metabolights,now)' in papers_sierpinski,'Papers metabolite lights/text are detached from the selected organism world transform')
    check('papers-source-receipt' not in papers_sierpinski and 'papers-source-inquiry-state' not in papers_sierpinski and 'papers-source-receipt' not in papers_sierpinski_css and 'papers-source-inquiry-state' not in papers_sierpinski_css,'generic tetrahedron status/count filler returned to the visible inquiry margins')
    dependencies=build.display_dependencies(); pretext=dependencies.get('@chenglou/pretext')
    check(pretext is not None and pretext['version']=='0.0.9' and (pretext['body']/'layout.js').is_file() and (pretext['body']/'LICENSE').is_file(),'Display cannot reacquire Pretext by stable package identity')
    pretext_root=artifact/'assets'/build.asset_bundle_id()/'dependencies'/pretext['slug']
    check((pretext_root/'layout.js').is_file() and (pretext_root/'LICENSE').is_file() and (pretext_root/'VERSION.json').is_file(),'derived Display dependency bundle omitted pinned Pretext body')
    check(not (DISPLAY/'y'/'yy'/'papers'/'public'/'papers-pretext-0.0.9').exists(),'Papers still owns the superseded Pretext carrier')
    check("getElementById('commit')" not in runtime and 'pending=' not in runtime,'obsolete inspect→commit staging remains in Display runtime')
    check("getElementById('display-dependencies')" in runtime and 'function dependency(identity' in runtime and 's.module.render({' in runtime and ',dependency,' in runtime,'Display runtime does not expose identity-resolved dependencies to site-holons')
    check('id="commit"' not in actual,'obsolete global commit surface remains in generated artifact')
    check('hitFace' in fields and 'projectAddressCenter' in fields,'face-oriented address encounter geometry missing')
    check('philosophy-global-site' in philosophy_render and 'requestGlobalTarget' in philosophy_render,'Philosophy mounted-address direct encounter missing')

    js_sources=['w/ui-grid.js','z/world-view.js','z/navigation-physiology.js','x/site-holon.js','z/site-fold.js','z/site-fold-particles.js','w/goo-material.js','x/display-runtime-v2.js','x/representation-handoff.js','x/feed-acquisition.js','x/recursive-fold.js','w/locus-shader.js','w/display-label-ink.js','z/navigation-aperture.js','z/display-safe-area.js','z/display-glass.js','z/display-lens.js']+[s['renderer_path'].relative_to(DISPLAY).as_posix() for s in sites]
    for source in js_sources:
        result=subprocess.run(['node','--check',str(DISPLAY/source)],capture_output=True,text=True); check(result.returncode==0,result.stderr or f'JS syntax failure {source}')
    for test in ('y/philosophy/render.test.cjs','z/world-view.test.cjs','z/navigation-aperture.test.cjs','y/yxz/impressum/render.test.cjs','y/yz/datenschutz/render.test.cjs','z/navigation-physiology.test.cjs','x/site-holon.test.cjs','x/display-runtime-v2.test.cjs','x/representation-handoff.test.cjs','x/feed-acquisition.test.cjs','x/recursive-fold.test.cjs','z/site-fold.test.cjs','z/site-fold-particles.test.cjs','z/display-safe-area.test.cjs','z/display-glass.test.cjs','z/display-lens.test.cjs','w/display-type.test.cjs','w/ui-grid.test.cjs','w/ui-grid-sites.test.cjs','w/display-label-ink.test.cjs','w/locus-shader.test.cjs','y/yx/schattenseiten/render.test.cjs','y/yy/papers/sierpinski.test.cjs'):
        result=subprocess.run(['node',str(DISPLAY/test)],capture_output=True,text=True); check(result.returncode==0,result.stderr or f'test failed {test}')
    if ctypes.util.find_library('EGL'):
        result=subprocess.run(['python3',str(DISPLAY/'w/locus-shader.gles.test.py')],capture_output=True,text=True)
        check(result.returncode==0,result.stderr or 'software GLES field/glass contract failed')
        result=subprocess.run(['python3',str(DISPLAY/'y/yy/papers/host-body.gles.test.py')],capture_output=True,text=True)
        check(result.returncode==0,result.stderr or 'software GLES site-owned host body failed')
    else:
        print('Software GLES witness unavailable on this host; no real-shader execution claim.')
    result=subprocess.run(['node',str(ROOT/'y/test-address.cjs')],env={**os.environ,'SITE_DIR':str(artifact)},capture_output=True,text=True); check(result.returncode==0,result.stderr or 'address witness failed')
    result=subprocess.run(['python3',str(ROOT/'y/test-site-relocation.py')],capture_output=True,text=True); check(result.returncode==0,result.stderr or 'whole-site relocation witness failed')
    result=subprocess.run(['python3',str(ROOT/'y/test-site-build.py')],capture_output=True,text=True); check(result.returncode==0,result.stderr or 'owner build boundary failed')
    result=subprocess.run(['python3',str(ROOT/'y/test-population-discovery.py')],capture_output=True,text=True); check(result.returncode==0,result.stderr or 'Population discovery crossed a body/lifecycle membrane')
    # Legacy exact-offer migration consumes the enclosing artifact; renderer evidence
    # consumes Display's shared fold. These remain independent integration witnesses.
    result=subprocess.run(['python3',str(crawler/'y'/'path_privacy.py')],capture_output=True,text=True); check(result.returncode==0,result.stderr or 'crawlerbait path privacy self-test failed')
    result=subprocess.run(['python3',str(crawler/'y'/'migrate_path_privacy.py'),'--self-test'],capture_output=True,text=True); check(result.returncode==0,result.stderr or 'crawlerbait path migration self-test failed')
    result=subprocess.run(['node',str(crawler/'z'/'render.test.cjs'),str(DISPLAY/'x'/'recursive-fold.js')],capture_output=True,text=True); check(result.returncode==0,result.stderr or 'crawlerbait visualization witness failed')

    print(json.dumps({
        'status':'pass','checks':count,'display_4V':{g:index[g]['noun'] for g in 'wxzy'},
        'population':'w/display/y tree is canonical mount truth',
        'sites':{s['id']:s['address'] or 'ε' for s in sites},
        'runtime':'generic identity modules; no specimen names in central runtime',
        'relocation':'real Papers and Crawlerbait bodies move to 128-symbol addresses and new carrier names with zero internal edits',
        'owner_build':'declared source/refusal suites retain ownership; external integration evidence remains independent',
        'bundle':bundle,'artifact':'single Display index + identity-owned static site apertures'
    },indent=2))

if __name__=='__main__': main()
