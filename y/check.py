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
    expected_sites={'organism:philosophy','organism:papers','organism:crawlerbait'}
    check(set(by_id)==expected_sites,'unexpected Population site set')
    check(by_id['organism:philosophy']['address']=='','Philosophy must occupy site-space overview')
    check(by_id['organism:crawlerbait']['address']=='w','Crawlerbait must occupy site-space w / Form')
    check(by_id['organism:papers']['address']=='y','Papers must occupy site-space y')
    check(by_id['organism:philosophy']['manifestation']['background_drag'] is True,'Philosophy did not inherit default background drag')
    check(by_id['organism:papers']['manifestation']['background_drag'] is True,'Papers did not inherit default background drag')
    check(by_id['organism:crawlerbait']['manifestation']['background_drag'] is True,'Crawlerbait explicit background-drag test toggle is not true')
    check(by_id['organism:philosophy']['site_dir']==DISPLAY/'y'/'philosophy','Philosophy physical body not at display/y/philosophy')
    crawler=DISPLAY/'y'/'yw'/'crawlerbait'
    check(by_id['organism:crawlerbait']['site_dir']==crawler,'Crawlerbait physical body not at display/y/yw/crawlerbait')
    check(by_id['organism:papers']['site_dir']==DISPLAY/'y'/'yy'/'papers','Papers physical body not at display/y/yy/papers')
    check((DISPLAY/'y'/'philosophy'/'INDEX.yaml').is_file(),'Philosophy local recursive body was not transplanted')
    check((DISPLAY/'y'/'philosophy'/'_cambium.yaml').is_file(),'Philosophy local constitution was not transplanted')

    # Crawlerbait must be an actual independently re-enterable holon, not a loose site module.
    cindex=build.load_yaml(crawler/'INDEX.yaml'); build.validate_index(cindex)
    check({g:cindex[g]['noun'] for g in 'wxzy'}=={'w':'Baits','x':'Traces','z':'Membrane','y':'Tide'},'Crawlerbait local phenotype changed')
    build.validate_cambium(build.load_yaml(crawler/'_cambium.yaml'),'crawlerbait/_cambium.yaml')
    check((crawler/'RITUALS'/'organism'/'RITUAL.md').is_file(),'Crawlerbait local ritual receptor missing')
    for shell in ('_stomach','_feed','_root','_waste'):
        check((crawler/shell).is_dir(),f'Crawlerbait lifecycle shell missing {shell}')
    for gene in 'wxzy':
        check((crawler/gene).is_dir(),f'Crawlerbait realized child missing {gene}')
    forbidden_loose={'bait','projection.json','render.js','style.css','tide.py'}
    check(not ({p.name for p in crawler.iterdir()} & forbidden_loose),'Crawlerbait active tissue leaked into differentiated root')
    check(by_id['organism:crawlerbait']['projection']=='z/projection.json' and by_id['organism:crawlerbait']['renderer']=='z/render.js' and by_id['organism:crawlerbait']['style']=='z/style.css','Crawlerbait site membrane does not point into Membrane tissue')
    check((crawler/'x'/'state.json').is_file(),'Crawlerbait derived trace state missing')
    check((crawler/'x'/'checkpoint.json').is_file(),'Crawlerbait trace checkpoint missing')
    check((crawler/'x'/'cursor.json').is_file(),'Crawlerbait capture cursor missing')
    check((crawler/'x'/'captures'/'manifest.json').is_file(),'Crawlerbait capture manifest missing')
    check((crawler/'z'/'policy.json').is_file(),'Crawlerbait membrane policy missing')
    crawler_style=(crawler/'z'/'style.css').read_text(encoding='utf-8')
    check('var(--display-safe-top)' in crawler_style,'Crawlerbait local panel does not consume Display safe-area contract')
    policy=json.loads((crawler/'z'/'policy.json').read_text(encoding='utf-8'))
    ip_identity=policy.get('client_ip_identity') or {}
    check(
        ip_identity.get('scheme')=='hmac-sha256'
        and ip_identity.get('domain')=='crawlerbait:clientIP:v1'
        and ip_identity.get('key_epoch')=='v1'
        and ip_identity.get('published_field')=='clientIPIdentity'
        and ip_identity.get('literal_ip_persisted') is False,
        'Crawlerbait clientIP identity policy drifted'
    )
    check((crawler/'y'/'capture.py').is_file(),'Crawlerbait provider capture missing')
    check((crawler/'y'/'tide.py').is_file(),'Crawlerbait local tide missing')
    check((crawler/'y'/'replay.py').is_file(),'Crawlerbait local replay missing')
    check(not (crawler/'y'/'provider_raw_once.py').exists(),'obsolete one-time provider-raw freezer still exists')
    check(not (crawler/'z'/'provider-raw-public.pem').exists(),'obsolete provider-raw encryption key still exists')
    check(not (crawler/'y'/'backfill.py').exists(),'Crawlerbait historical backfill remains active physiology')
    check((crawler/'z'/'public'/'crawlerbait'/'index.html').is_file(),'Crawlerbait membrane public reef missing')

    checkpoint=json.loads((crawler/'x'/'checkpoint.json').read_text(encoding='utf-8'))
    cursor=json.loads((crawler/'x'/'cursor.json').read_text(encoding='utf-8'))
    trace_state=json.loads((crawler/'x'/'state.json').read_text(encoding='utf-8'))
    checkpoint_end=checkpoint.get('last_complete_end')
    check(isinstance(checkpoint_end,str),'Crawlerbait legacy checkpoint has no explicit end')
    check(cursor.get('version')==2 and cursor.get('source')=='cloudflare:httpRequestsAdaptive','Crawlerbait cursor is not canonical raw-traffic generation 2')

    legacy=sorted((crawler/'x'/'captures').glob('*.capture.json'))
    expected=checkpoint_end
    for capture in legacy:
        value=json.loads(capture.read_text(encoding='utf-8'))
        window=value.get('window') or {}
        provider=(value.get('provider_response') or {})
        zones=provider.get('data',{}).get('viewer',{}).get('zones',[])
        groups=value.get('groups') if value.get('version')==1 else (zones[0].get('groups') if len(zones)==1 else None)
        check(value.get('source')=='cloudflare:httpRequestsAdaptiveGroups' and isinstance(groups,list),f'invalid legacy 404 capture {capture.name}')
        check(window.get('start')==expected,f'Crawlerbait legacy 404 gap before {capture.name}')
        expected=window.get('end')
    check(cursor.get('legacy_404_last_capture_end')==expected,'legacy 404 cursor diverged from preserved captures')

    raw_captures=sorted((crawler/'x'/'captures').glob('*.traffic.json'))
    raw_expected=None
    identity_fingerprints=set()
    for capture in raw_captures:
        value=json.loads(capture.read_text(encoding='utf-8'))
        window=value.get('window') or {}
        zones=(value.get('published_response') or {}).get('data',{}).get('viewer',{}).get('zones',[])
        records=zones[0].get('records') if len(zones)==1 else None
        transform=(value.get('publication_transform') or {}).get('clientIP') or {}
        check(
            value.get('version')==4
            and value.get('source')=='cloudflare:httpRequestsAdaptive'
            and value.get('semantic_filters')==[]
            and isinstance(records,list),
            f'invalid whole-traffic capture {capture.name}'
        )
        check(
            transform.get('scheme')=='hmac-sha256'
            and transform.get('domain')=='crawlerbait:clientIP:v1'
            and transform.get('key_epoch')=='v1'
            and transform.get('published_field')=='clientIPIdentity'
            and transform.get('literal_persisted') is False
            and transform.get('equality_preserved_within_key_epoch') is True,
            f'invalid clientIP identity transform in {capture.name}'
        )
        fingerprint=transform.get('key_fingerprint')
        check(isinstance(fingerprint,str) and len(fingerprint)==16,f'missing identity-key fingerprint in {capture.name}')
        identity_fingerprints.add(fingerprint)
        if 'clientIP' in (value.get('advertised_fields') or []):
            for record_index,record in enumerate(records):
                check('clientIP' not in record,f'literal clientIP persisted in {capture.name} record {record_index}')
                check('clientIPIdentity' in record,f'clientIPIdentity missing in {capture.name} record {record_index}')
        if raw_expected is not None:
            check(window.get('start')==raw_expected,f'Crawlerbait raw traffic gap before {capture.name}')
        raw_expected=window.get('end')
    if raw_captures:
        check(len(identity_fingerprints)==1,'multiple HMAC key fingerprints split one raw identity epoch')
        cursor_identity=(cursor.get('identity') or {}).get('clientIP') or {}
        check(cursor_identity.get('key_fingerprint') in identity_fingerprints,'cursor identity key diverged from raw captures')
        check(cursor.get('raw_last_capture_end')==raw_expected,'raw traffic cursor is not exactly covered by immutable captures')
        check(trace_state.get('version')==5 and trace_state.get('raw_capture_end')==raw_expected,'derived whole-traffic state is stale')
        check((crawler/'z'/'public'/'crawlerbait'/'traffic.json').is_file(),'public raw traffic manifest missing')
    else:
        check(cursor.get('raw_last_capture_end') is None,'raw cursor advanced without any canonical raw capture')
        check(trace_state.get('version') in (4,5),'transitional trace state has unknown generation')

    retained=crawler/'x'/'retained-bootstrap'
    if (retained/'seal.json').is_file():
        seal=json.loads((retained/'seal.json').read_text(encoding='utf-8'))
        check(seal.get('sealed') is True,'Crawlerbait retained-history archive is not sealed')
        check((retained/'provider-settings.json').is_file(),'Crawlerbait retained-history provider settings missing')
        files=seal.get('files')
        check(isinstance(files,list) and files,'Crawlerbait retained-history seal has no raw files')
        for name in files:
            raw=retained/name
            check(raw.is_file(),f'Crawlerbait retained-history raw file missing {name}')
            value=json.loads(raw.read_text(encoding='utf-8'))
            zones=(value.get('provider_response') or {}).get('data',{}).get('viewer',{}).get('zones',[])
            check(value.get('source')=='cloudflare:httpRequestsAdaptiveGroups' and len(zones)==1 and isinstance(zones[0].get('groups'),list),f'invalid retained raw provider payload {name}')
    bait_dirs=[p for p in (crawler/'w').iterdir() if p.is_dir()]
    check(bool(bait_dirs),'Crawlerbait bait-space has no addressed bait body')
    for locus in bait_dirs:
        check(len(locus.name)>1 and locus.name[0]=='w' and set(locus.name[1:])<=set('wxzy'),f'Crawlerbait bait-space carrier is not a raw tetrahedral address: {locus.name}')
        check({p.name for p in locus.iterdir()}=={'bait.json'},f'Crawlerbait bait-space locus {locus.name} contains non-bait tissue')

    registry=build.site_mounts()
    check(registry['version']==3 and registry['source']=='w/display/y tree','mount registry is not tree-derived')
    rel={(m['interlocutor'],m['scope'],m['address']) for m in registry['mounts']}
    check(rel=={('organism:philosophy','main',''),('organism:crawlerbait','main','w'),('organism:papers','main','y')},'tree-derived mount relation changed')
    check(build.root_projection()['source']['organism']=='main-root','Philosophy projection identity changed')
    check(build.papers_projection()['source']=='papers/_feed','Papers projection boundary changed')

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
    if raw_captures:
        check('crawlerbait/traffic.json' in public_files,'Crawlerbait public raw-traffic manifest missing')
    check(all(not p.startswith('assets/') and p not in {'index.html','.nojekyll','CNAME'} for p in public_files),'site public surface escaped reserved artifact namespace')
    public.verify_artifact(artifact)
    actual=(artifact/'index.html').read_text(encoding='utf-8'); check(actual==build.render(),'artifact HTML stale')
    p=Page(); p.feed(actual); check(len(p.ids)==len(set(p.ids)),'duplicate element ids')
    for eid in ('navTwin','axis-x','axis-y','mini','mini-trigger','mini-pocket','mini-core','site-registry','site-projections','display-dependencies','site-state','display-membrane-status','tetra-fold','interlocutor-stage'):
        check(eid in p.ids,f'missing invariant surface {eid}')
    check(set(p.interlocutors)==expected_sites,'generic site surfaces do not match discovered Population')
    check(not (artifact/'papers/index.html').exists(),'Papers regressed to a separate document/page')
    check((artifact/'crawlerbait/index.html').is_file() and (artifact/'crawlerbait/state.json').is_file(),'Crawlerbait static reef was not secreted into artifact')

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
    check("document.getElementById('site-registry')" in runtime and "document.getElementById('site-projections')" in runtime,'runtime is not fed by tree-derived registry/projections')
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
    check('context.origin' in fold and '--fold-x' in fold and '--fold-y' in fold,'transition is not anchored to chosen target')
    check('clip-path:polygon(0 0,100% 0,var(--fold-x) var(--fold-y))' in site_css,'target-origin tetrahedral iris missing')
    check("data-aperture=\"closed\"" in actual and "dataset.aperture='open'" in aperture,'global navigator is not aperture-owned')
    check('@keyframes aperture-shell-resolve' in aperture_css,'split aperture resolve animation missing')
    check('location.assign' not in runtime and 'location.href' not in runtime,'document redirect architecture returned')
    papers_sierpinski=(DISPLAY/'y'/'yy'/'papers'/'sierpinski.js').read_text(encoding='utf-8')
    papers_sierpinski_css=(DISPLAY/'y'/'yy'/'papers'/'sierpinski.css').read_text(encoding='utf-8')
    check('S_QUANTUM_SCALE=.0012' in papers_sierpinski and 'bodyScaleFor' in papers_sierpinski and 'Math.pow(2,rankNumber' in papers_sierpinski,'Papers visual scale is not anchored to the tiny fixed S quantum + recursive 2^n law')
    check('ROOT_FIELD_DESKTOP=1.75' in papers_sierpinski and 'ROOT_FIELD_MOBILE=1.42' in papers_sierpinski and 'overviewBodyScaleFor' in papers_sierpinski and 'populationBodies' in papers_sierpinski and 'collectBody(rec.id' in papers_sierpinski and 'NODE_SCALE' not in papers_sierpinski,'Papers overview does not preserve shared encounter scale + S-anchored recursive rank LOD')
    check('PHYSIOLOGY_PHASES' in papers_sierpinski and all(token in papers_sierpinski for token in ("QUESTION","PREPARE","METABOLIZE","GROW")) and 'papers-physiology' in papers_sierpinski,'Papers overview physiology no longer exposes the four live pump phases')
    check(all(token in papers_sierpinski for token in ('motionA=pointInTet(cell.tet','motionB=pointInTet(cell.tet','motionC=pointInTet(cell.tet','motionD=pointInTet(cell.tet','OVERVIEW_WANDER=.86','OVERVIEW_FLOW_PERIOD_MS=42000','overviewDriftPoint')),'Papers overview motion lost multi-anchor chamber-bounded living flow')
    check('BACKGROUND_FIELD_ALPHA' in papers_sierpinski and 'BACKGROUND_STAR_ALPHA=.72' in papers_sierpinski and 'NESTED_BACKGROUND_ALPHA' in papers_sierpinski and 'backgroundWorldTranslation' in papers_sierpinski and 'setBackgroundPassage(1,now)' in papers_sierpinski and 'setBackgroundPassage(0,now)' in papers_sierpinski and 'state.canvas.dataset.backgroundFieldAlpha' in papers_sierpinski and 'state.canvas.dataset.backgroundPassageZ' in papers_sierpinski,'Papers scale passage no longer preserves/recedes the previous-scale world as one body')
    check('drawOverviewPhysiology' in papers_sierpinski and 'simplex2D' in papers_sierpinski,'Papers overview physiology no longer carries its living simplex demonstration')
    check('OVERVIEW_LIGHT_GAIN=.46' in papers_sierpinski and 'INQUIRY_LIGHT_GAIN=.72' in papers_sierpinski and 'drawLights(population.lights' in papers_sierpinski and 'populationBodies(rect.width,rect.height,fade,starFade,now)' in papers_sierpinski and 'backgroundStarAlpha' in papers_sierpinski,'Papers previous-scale metabolights/quantum embers no longer survive inquiry passage as distant matter')
    check("modules.get('organism:philosophy')" in papers_sierpinski and 'createInquiryEnvironment' in papers_sierpinski and 'shader?.fragment' in papers_sierpinski and "Fields?.paletteSet" in papers_sierpinski,'Papers Inquiry environment is not using the live Philosophy-owned shader contract')
    check('PHILOSOPHY_INQUIRY_REGION=3' in papers_sierpinski and "canvas.dataset.region='y'" in papers_sierpinski and "canvas.dataset.mode='inquiry-environment'" in papers_sierpinski,'Papers environment is not explicitly constrained to Philosophy Inquiry material')
    check('PARENT_FIELD_ID' not in papers_sierpinski and 'createParentInquiryField' not in papers_sierpinski and 'parentInquiryViewTarget' not in papers_sierpinski,'superseded full Philosophy structural parent field remains in Papers')
    check('.papers-inquiry-environment-stage' in papers_sierpinski_css and '.papers-parent-field-stage' not in papers_sierpinski_css,'Papers environment surface did not replace the full parent-field carrier')
    check('PAPERS_OVERVIEW_BASIS_Y=-.275' in papers_sierpinski and 'overviewOrientation' in papers_sierpinski and 'dataset.overviewBasisY' in papers_sierpinski,'Papers fourfold perceptual rest frame missing')
    check('papers-chamber-labels' in papers_sierpinski and 'updateChamberLabels' in papers_sierpinski and 'chamberLabelNodes' in papers_sierpinski and 'projectWorldPoint(world,cameraZ(),width,height)' in papers_sierpinski and 'backgroundWorldTranslation()' in papers_sierpinski and '.papers-chamber-label' in papers_sierpinski_css,'Papers chamber identity/count witnesses are detached from the live inquiry camera/background transform')
    check("GENEALOGY_REPAIR_PATH='papers-shadow/genealogy-gap-repair.json'" in papers_sierpinski and 'mergeGenealogyRepair' in papers_sierpinski and 'genealogyRepairCount' in papers_sierpinski,'Papers bounded genealogy-gap hydration missing')
    genealogy_repair=DISPLAY/'y'/'yy'/'papers'/'public'/'papers-shadow'/'genealogy-gap-repair.json'
    check(genealogy_repair.is_file(),'Papers public genealogy repair carrier missing')
    genealogy_repair_data=json.loads(genealogy_repair.read_text(encoding='utf-8'))
    check(genealogy_repair_data.get('schema')=='papers-public-genealogy-gap-repair.v1' and genealogy_repair_data.get('site_id')=='organism:papers','Papers genealogy repair membrane mismatch')
    check(all(isinstance(v,list) and len(v)==4 for v in genealogy_repair_data.get('parents',{}).values()),'Papers genealogy repair contains non-four-parent Holon relation')
    check('CHAMBER_OPEN_MS=760' in papers_sierpinski and 'N.focusTarget(state.structure,path)' in papers_sierpinski and 'hitChamber' in papers_sierpinski and 'setChamber' in papers_sierpinski and 'ascendChamber' in papers_sierpinski,'Papers realized chamber passage regressed')
    check('CHAMBER_SHELL_ALPHA=.085' in papers_sierpinski and 'outerCells' in papers_sierpinski and '{faces:false}' in papers_sierpinski,'Papers four-chamber structural witness regressed')
    check("state.canvas.dataset.chamberPath='overview'" in papers_sierpinski and 'state.canvas.dataset.chamberScale' in papers_sierpinski,'Papers chamber passage is not observable')
    check('physiology.innerHTML' in papers_sierpinski and 'papers-physiology-phases' in papers_sierpinski and 'papers-physiology-copy' in papers_sierpinski and 'papers-physiology-witness' not in papers_sierpinski,'Papers physiology animation/copy is not one peripheral unit')
    check('.papers-physiology{position:absolute;left:28px;top:148px' in papers_sierpinski_css and '.papers-physiology-canvas{width:100%;height:100%;display:block;opacity:.68}' in papers_sierpinski_css,'Papers physiology is not coherently peripheral')
    check('projection?.source_meta?.[x.id]' in papers_sierpinski and 'ORIGINAL WORK' in papers_sierpinski and 'PAPERS METABOLISM' in papers_sierpinski and 'papers-source-inquiry' in papers_sierpinski,'Selected Sources no longer embody public source_meta identity/provenance/metabolism')
    check('SOURCE INQUIRY · PROJECTION GAP' in papers_sierpinski and 'sourceInquiryReceipt' in papers_sierpinski and 'state.inquiryBodies' in papers_sierpinski,'Selected Source inquiry does not preserve public projection-gap truth/future source-body uptake')

    check('drawLights' in papers_sierpinski and 'metabolight' in papers_sierpinski and 'quantumEmberCount' in papers_sierpinski,'Papers metabolight/quantum-emission witness missing')
    check("PRETEXT_ID='@chenglou/pretext'" in papers_sierpinski and "state.dependency(PRETEXT_ID,'layout.js')" in papers_sierpinski and "PRETEXT_VERSION='0.0.9'" in papers_sierpinski and 'prepareWithSegments' in papers_sierpinski and 'layoutNextLineRange' in papers_sierpinski and 'materializeLineRange' in papers_sierpinski,'Papers active wisdom is not resolving pinned Pretext by stable Display identity')
    check('papers-wisdom-stage' in papers_sierpinski and 'wisdomState' in papers_sierpinski,'Papers metabolight text ink plane missing')
    dependencies=build.display_dependencies(); pretext=dependencies.get('@chenglou/pretext')
    check(pretext is not None and pretext['version']=='0.0.9' and (pretext['body']/'layout.js').is_file() and (pretext['body']/'LICENSE').is_file(),'Display cannot reacquire Pretext by stable package identity')
    pretext_root=artifact/'assets'/build.asset_bundle_id()/'dependencies'/pretext['slug']
    check((pretext_root/'layout.js').is_file() and (pretext_root/'LICENSE').is_file() and (pretext_root/'VERSION.json').is_file(),'derived Display dependency bundle omitted pinned Pretext body')
    check(not (DISPLAY/'y'/'yy'/'papers'/'public'/'papers-pretext-0.0.9').exists(),'Papers still owns the superseded Pretext carrier')
    check("getElementById('commit')" not in runtime and 'pending=' not in runtime,'obsolete inspect→commit staging remains in Display runtime')
    check("getElementById('display-dependencies')" in runtime and 'function dependency(identity' in runtime and 'dependency});' in runtime,'Display runtime does not expose identity-resolved dependencies to site-holons')
    check('id="commit"' not in actual,'obsolete global commit surface remains in generated artifact')
    check('hitFace' in fields and 'projectAddressCenter' in fields,'face-oriented address encounter geometry missing')
    check('philosophy-global-site' in philosophy_render and 'requestGlobalTarget' in philosophy_render,'Philosophy mounted-address direct encounter missing')

    js_sources=['z/world-view.js','z/navigation-physiology.js','x/site-holon.js','z/site-fold.js','x/display-runtime-v2.js','w/locus-shader.js','z/navigation-aperture.js','z/display-safe-area.js']+[s['renderer_path'].relative_to(DISPLAY).as_posix() for s in sites]
    for source in js_sources:
        result=subprocess.run(['node','--check',str(DISPLAY/source)],capture_output=True,text=True); check(result.returncode==0,result.stderr or f'JS syntax failure {source}')
    for test in ('z/navigation-physiology.test.cjs','x/site-holon.test.cjs','z/site-fold.test.cjs','z/display-safe-area.test.cjs'):
        result=subprocess.run(['node',str(DISPLAY/test)],capture_output=True,text=True); check(result.returncode==0,result.stderr or f'test failed {test}')
    result=subprocess.run(['node',str(ROOT/'y/test-address.cjs')],env={**os.environ,'SITE_DIR':str(artifact)},capture_output=True,text=True); check(result.returncode==0,result.stderr or 'address witness failed')
    result=subprocess.run(['python3',str(ROOT/'y/test-site-relocation.py')],capture_output=True,text=True); check(result.returncode==0,result.stderr or 'whole-site relocation witness failed')
    result=subprocess.run(['python3',str(crawler/'y'/'capture.py'),'--self-test'],capture_output=True,text=True); check(result.returncode==0,result.stderr or 'crawlerbait capture self-test failed')
    result=subprocess.run(['python3',str(crawler/'y'/'tide.py'),'--self-test'],capture_output=True,text=True); check(result.returncode==0,result.stderr or 'crawlerbait tide self-test failed')
    result=subprocess.run(['python3',str(crawler/'y'/'replay.py'),'--self-test'],capture_output=True,text=True); check(result.returncode==0,result.stderr or 'crawlerbait replay self-test failed')
    result=subprocess.run(['node',str(crawler/'z'/'render.test.cjs')],capture_output=True,text=True); check(result.returncode==0,result.stderr or 'crawlerbait visualization witness failed')

    print(json.dumps({
        'status':'pass','checks':count,'display_4V':{g:index[g]['noun'] for g in 'wxzy'},
        'population':'w/display/y tree is canonical mount truth',
        'sites':{s['id']:s['address'] or 'ε' for s in sites},
        'runtime':'generic identity modules; no specimen names in central runtime',
        'relocation':'whole Papers body moves by folder with zero internal edits',
        'crawlerbait':'independently rooted Baits/Traces/Membrane/Tide holon + same-type bait-space + static reef',
        'bundle':bundle,'artifact':'single Display index + identity-owned static site apertures'
    },indent=2))

if __name__=='__main__': main()
