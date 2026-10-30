"""Papers keeps independent evidence for its public projection boundary."""
from copy import deepcopy
import json
import re


def witness(body, common, operations):
    data = json.loads((body / 'projection.json').read_text(encoding='utf-8'))
    operations['validate'](data, body, common)
    for change in (
        lambda d: d.update(source='private research'),
        lambda d: d['phenotype'].pop('w'),
        lambda d: d['phenotype'].update(extra='Invented rank'),
        lambda d: d['phenotype'].update(x=''),
        lambda d: d['groups'].pop('z'),
        lambda d: d['groups'].update(y={}),
        lambda d: d['groups'].update(w=[{'id': 'test', 'title': 'Public', 'private': 'Refuse'}]),
        lambda d: d['groups'].update(x=[{'id': 'test'}]),
    ):
        wrong = deepcopy(data)
        change(wrong)
        try:
            operations['validate'](wrong, body, common)
        except ValueError:
            continue
        raise AssertionError('Papers accepted a changed public boundary')
    assert json.loads((body / 'projection.json').read_text(encoding='utf-8')) == data
    _source_presentation(body)


def _source_presentation(body):
    manifest = json.loads((body / 'site.json').read_text())
    assert manifest['manifestation'].get('background_drag', True) is True, 'Papers did not inherit background drag'
    def check(condition, message):
        if not condition:
            raise AssertionError(message)
    papers_sierpinski=(body / manifest['renderer']).read_text(encoding='utf-8')
    papers_sierpinski_css=(body / manifest['style']).read_text(encoding='utf-8')
    check(not re.search(r"[\"'`][^\"'\n`]*\d+(?:\.\d+)?px\b", papers_sierpinski), 'Papers contains a literal Canvas/Pretext pixel font')
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
    genealogy_repair=body/'public'/'papers-shadow'/'genealogy-gap-repair.json'
    check(genealogy_repair.is_file(),'Papers public genealogy repair carrier missing')
    genealogy_repair_data=json.loads(genealogy_repair.read_text(encoding='utf-8'))
    check(genealogy_repair_data.get('schema')=='papers-public-genealogy-gap-repair.v1' and genealogy_repair_data.get('site_id')=='organism:papers','Papers genealogy repair membrane mismatch')
    check(all(isinstance(v,list) and len(v)==4 for v in genealogy_repair_data.get('parents',{}).values()),'Papers genealogy repair contains non-four-parent Holon relation')
    check("field.descendTo(path,'papers:chamber')" in papers_sierpinski and "field.ascend('papers:chamber')" in papers_sierpinski,'Papers chambers are not using the shared walked path')
    check('CHAMBER_SHELL_ALPHA=.55' in papers_sierpinski and 'CHAMBER_FACE_ALPHA' in papers_sierpinski and 'outerCells(rect.width,CHAMBER_FACE_ALPHA)' in papers_sierpinski and '{faces:false}' in papers_sierpinski and 'rec.locus===here' in papers_sierpinski,'Papers visible rank-1 chamber body / container-first Descent witness regressed')
    check("state.canvas.dataset.chamberPath='overview'" in papers_sierpinski and 'state.canvas.dataset.chamberScale' in papers_sierpinski,'Papers chamber passage is not observable')
    check('tutorialButton' in papers_sierpinski and 'papers-physiology-canvas' not in papers_sierpinski,'a dummy explanatory canvas remains beside the real specimen')
    papers_grid=json.loads((body / manifest['ui_grid']).read_text())
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
    check(not (body/'public'/'papers-pretext-0.0.9').exists(), 'Papers still owns the superseded Pretext carrier')


def integration(body, capabilities):
    import subprocess
    import sys
    assert not (capabilities['artifact'] / 'papers/index.html').exists(), 'Papers regressed to a separate document/page'
    commands = [['node', str(body / 'sierpinski.test.cjs'), str(capabilities['navigation']), str(capabilities['lens'])]]
    if capabilities['gles_available']:
        commands.append([sys.executable, str(body / 'host-body.gles.test.py'),
                         str(capabilities['field_gles']), str(capabilities['navigation']), str(capabilities['gles_transport'])])
    for command in commands:
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode:
            raise AssertionError(result.stderr or result.stdout or 'Papers integration witness failed')
