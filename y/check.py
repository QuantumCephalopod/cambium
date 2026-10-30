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
    expected_sites=set(by_id)
    check(len(by_id)==len(sites), 'discovered Population identity collision')
    for site in sites:
        site_root=site['site_dir']
        check((site_root/'RITUALS'/'organism'/'RITUAL.md').is_file(),f"{site['title']} local organism receptor missing")
        for shell in ('_stomach','_feed','_root','_waste'):
            check((site_root/shell).is_dir(),f"{site['title']} lifecycle shell missing {shell}")
    check(all(s.get('version')==2 and bool(s.get('ui_grid')) for s in sites),'site-holon v2 UI-grid membrane missing')
    check(all((s.get('ui_grid_data') or {}).get('schema')=='sss.display.ui-grid.v2' for s in sites),'site-holon canonical UI-grid schema drifted')
    for site in sites:
        body=site['site_dir']
        if (body/'INDEX.yaml').is_file(): build.validate_index(build.load_yaml(body/'INDEX.yaml'))
        if (body/'_cambium.yaml').is_file(): build.validate_cambium(build.load_yaml(body/'_cambium.yaml'), str(body/'_cambium.yaml'))

    # Source anatomy, capture/privacy policy, cursor continuity and Bait shape are
    # owned by each site's declared build witness below. No schema dispatch here.

    registry=build.site_mounts()
    check(registry['version']==3 and registry['source']=='w/display/y tree','mount registry is not tree-derived')
    rel={(m['interlocutor'],m['scope'],m['address']) for m in registry['mounts']}
    check(rel=={(site['id'],'main',site['address']) for site in sites}, 'mount relation diverged from discovered bodies')
    for site in sites:
        if build.witness_site_build(site):
            check(True, f'{site["id"]}: owner build evidence passed')

    build_source=(ROOT/'y/build.py').read_text(encoding='utf-8')
    check("site-mounts.json" not in build_source,'flat site-mounts.json remains build authority')
    check("main-root.json" not in build_source and "papers.json" not in build_source,'flat page projection remains build authority')
    assets=build.asset_sources()
    for site in sites:
        check(site['renderer_path'] in assets.values() and site['style_path'] in assets.values(),
              f"{site['id']}: declared renderer/style missing from public assets")
    check('interlocutor-philosophy.js' not in assets and 'interlocutor-papers.js' not in assets,'flat interlocutor adapters remain public authority')

    public_files=public.site_public_files()
    check(all(not p.startswith('assets/') and p not in {'index.html','.nojekyll','CNAME'} for p in public_files),'site public surface escaped reserved artifact namespace')
    public.verify_artifact(artifact)
    actual=(artifact/'index.html').read_text(encoding='utf-8'); check(actual==build.render(),'artifact HTML stale')
    p=Page(); p.feed(actual); check(len(p.ids)==len(set(p.ids)),'duplicate element ids')
    check(len(p.label_hosts)==len(expected_sites) and not any(p.label_hosts),'floating body buttons inherit a hidden accessibility subtree')
    for eid in ('navTwin','axis-x','axis-y','mini','mini-trigger','mini-pocket','mini-core','site-registry','site-projections','site-feed-locations','site-ui-grids','display-dependencies','site-state','display-membrane-status','tetra-fold','interlocutor-stage'):
        check(eid in p.ids,f'missing invariant surface {eid}')
    check(set(p.interlocutors)==expected_sites,'generic site surfaces do not match discovered Population')

    # Generic child-owned feed contract: small preview in entry, full public source only in immutable site asset.
    previews=build.site_projections(); feed_urls=build.site_feed_urls(build.asset_bundle_id())
    check(set(feed_urls)=={site['id'] for site in sites if site.get('feed_preview')},'declared feed-aware site boundaries missing')
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

    nav=(DISPLAY/'z'/'navigation-physiology.js').read_text(); world=(DISPLAY/'z'/'world-view.js').read_text(); runtime=(DISPLAY/'x'/'display-runtime-v2.js').read_text(); safe=(DISPLAY/'z'/'display-safe-area.js').read_text(); holon=(DISPLAY/'x'/'site-holon.js').read_text(); fold=(DISPLAY/'z'/'site-fold.js').read_text(); site_css=(DISPLAY/'z'/'site-runtime.css').read_text(); aperture=(DISPLAY/'z'/'navigation-aperture.js').read_text(); aperture_css=(DISPLAY/'z'/'navigation-aperture.css').read_text(); fields=(DISPLAY/'w'/'locus-shader.js').read_text()
    check('semanticPoint' in nav and 'locus:A.key(path)' in nav,'semantic place is not exact recursive locus')
    check('center:[...record.center]' in nav,'camera focus is not recursive split-tet centroid')
    check('GLOBAL_TARGETS' in world and 'hitTarget' in world and 'sss:global-navigate' in world,'global minimap is not direct mounted-site navigation')
    check('swingback' not in world.lower(),'automatic Philosophy swingback returned')
    check("document.getElementById('site-registry')" in runtime and "document.getElementById('site-projections')" in runtime and "document.getElementById('site-ui-grids')" in runtime,'runtime is not fed by tree-derived registry/projections/UI grids')
    check('function safeCarrier(host,bounded=false)' in runtime and 'function makeSiteUI(id,host,raw)' in runtime and 'ui:s.ui' in runtime and 'ui.refresh()' in runtime,'generic safe-carrier UI-grid projection missing from runtime')
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
    dependencies=build.display_dependencies(); pretext=dependencies.get('@chenglou/pretext')
    check(pretext is not None and pretext['version']=='0.0.9' and (pretext['body']/'layout.js').is_file() and (pretext['body']/'LICENSE').is_file(),'Display cannot reacquire Pretext by stable package identity')
    pretext_root=artifact/'assets'/build.asset_bundle_id()/'dependencies'/pretext['slug']
    check((pretext_root/'layout.js').is_file() and (pretext_root/'LICENSE').is_file() and (pretext_root/'VERSION.json').is_file(),'derived Display dependency bundle omitted pinned Pretext body')
    check("getElementById('commit')" not in runtime and 'pending=' not in runtime,'obsolete inspect→commit staging remains in Display runtime')
    check("getElementById('display-dependencies')" in runtime and 'function dependency(identity' in runtime and 's.module.render({' in runtime and ',dependency,' in runtime,'Display runtime does not expose identity-resolved dependencies to site-holons')
    check('id="commit"' not in actual,'obsolete global commit surface remains in generated artifact')
    check('hitFace' in fields and 'projectAddressCenter' in fields,'face-oriented address encounter geometry missing')

    js_sources=['w/ui-grid.js','z/world-view.js','z/navigation-physiology.js','x/site-holon.js','z/site-fold.js','z/site-fold-particles.js','w/goo-material.js','x/display-runtime-v2.js','x/representation-handoff.js','x/feed-acquisition.js','x/recursive-fold.js','w/locus-shader.js','w/display-label-ink.js','z/navigation-aperture.js','z/display-safe-area.js','z/display-glass.js','z/display-lens.js']+[s['renderer_path'].relative_to(DISPLAY).as_posix() for s in sites]
    for source in js_sources:
        result=subprocess.run(['node','--check',str(DISPLAY/source)],capture_output=True,text=True); check(result.returncode==0,result.stderr or f'JS syntax failure {source}')
    for test in ('z/world-view.test.cjs','z/navigation-aperture.test.cjs','z/navigation-physiology.test.cjs','x/site-holon.test.cjs','x/display-runtime-v2.test.cjs','x/representation-handoff.test.cjs','x/feed-acquisition.test.cjs','x/recursive-fold.test.cjs','z/site-fold.test.cjs','z/site-fold-particles.test.cjs','z/display-safe-area.test.cjs','z/display-glass.test.cjs','z/display-lens.test.cjs','w/display-type.test.cjs','w/ui-grid.test.cjs','w/ui-grid-sites.test.cjs','w/display-label-ink.test.cjs','w/locus-shader.test.cjs'):
        result=subprocess.run(['node',str(DISPLAY/test)],capture_output=True,text=True); check(result.returncode==0,result.stderr or f'test failed {test}')
    if ctypes.util.find_library('EGL'):
        result=subprocess.run(['python3',str(DISPLAY/'w/locus-shader.gles.test.py')],capture_output=True,text=True)
        check(result.returncode==0,result.stderr or 'software GLES field/glass contract failed')
    else:
        print('Software GLES witness unavailable on this host; no real-shader execution claim.')
    result=subprocess.run(['node',str(ROOT/'y/test-address.cjs')],env={**os.environ,'SITE_DIR':str(artifact)},capture_output=True,text=True); check(result.returncode==0,result.stderr or 'address witness failed')
    result=subprocess.run(['python3',str(ROOT/'y/test-site-relocation.py')],capture_output=True,text=True); check(result.returncode==0,result.stderr or 'whole-site relocation witness failed')
    result=subprocess.run(['python3',str(ROOT/'y/test-site-build.py')],capture_output=True,text=True); check(result.returncode==0,result.stderr or 'owner build boundary failed')
    result=subprocess.run(['python3',str(ROOT/'y/test-population-discovery.py')],capture_output=True,text=True); check(result.returncode==0,result.stderr or 'Population discovery crossed a body/lifecycle membrane')
    # Source evidence stays in declared owner witnesses. External resource evidence
    # is invoked separately with the enclosing artifact and neutral capabilities.
    capabilities={
        'artifact': artifact, 'public_files': public_files,
        'navigation': DISPLAY/'z/navigation-physiology.js',
        'recursive_fold': DISPLAY/'x/recursive-fold.js',
        'representation_handoff': DISPLAY/'x/representation-handoff.js',
        'ui_grid': DISPLAY/'w/ui-grid.js', 'lens': DISPLAY/'z/display-lens.js',
        'field_gles': DISPLAY/'w/locus-shader.gles.test.py',
        'gles_transport': DISPLAY/'w/gles-transport.cjs',
        'site_public': ROOT/'y/site-public.py',
        'gles_available': bool(ctypes.util.find_library('EGL')),
    }
    for site in sites:
        if build.witness_site_integration(site, capabilities):
            check(True, f'{site["id"]}: declared integration evidence passed')
    for test in ('test-phenotype-depth.py', 'test-artifact.py'):
        result=subprocess.run(['python3',str(ROOT/'y'/test)],capture_output=True,text=True)
        check(result.returncode==0,result.stderr or f'root witness failed: {test}')

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
