#!/usr/bin/env python3
"""Browser witness: actual Papers bodies and one shared drop.

Runs only against an already-built artifact. Actual pointer/keyboard gestures
enter contacted Source/Holon bodies, read all authored primitive kinds and
return through the walked chambers. Guided interruption and complete actual
ancestry both restore the visitor's drop. Backend and viewport are witnessed
explicitly; this is not a physical-device or frame-rate claim.
"""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
import argparse, json, threading

p=argparse.ArgumentParser();p.add_argument('--artifact',type=Path,required=True);p.add_argument('--out',type=Path,required=True)
p.add_argument('--backend',choices=['canvas2d','webgl'],default='canvas2d')
p.add_argument('--cases',nargs='+',choices=['source','holon','guided','complete'],default=['source','holon','guided','complete'])
p.add_argument('--viewports',nargs='+',type=int,choices=[1280,390],default=[1280,390])
a=p.parse_args()
a.out.mkdir(parents=True,exist_ok=True)
source=json.loads((a.artifact/'papers-shadow/current.json').read_text())['snapshot']
bodies=source['inquiry']['bodies']
complete_ids=[k for k,b in bodies.items() if b.get('state')=='COMPLETE' and len(b.get('edges',[]))==6 and len(b.get('faces',[]))==4 and b.get('volume') and b.get('metabolites')]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(a.artifact.resolve())))
threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/index.html'
results=[]

def scene(page,identity):
 page.wait_for_function('(id)=>window.SSSDisplayRuntime?.state.activeIds.includes(id)&&document.getElementById("tetra-fold").dataset.fold==="open"',arg=identity,timeout=180000)
def enter_papers(page):
 # The public address is routing. All contact, tissue and return evidence below
 # still uses actual pointer/keyboard gestures in the unmodified owner body.
 page.goto(base+'#main:y',wait_until='domcontentloaded')
 scene(page,'organism:papers')
 page.wait_for_function('document.querySelector(".papers-sierpinski-stage")?.dataset.shadowState==="ready"',timeout=60000)
 print(json.dumps({'entry':'Papers ready','viewport':page.viewport_size}),flush=True)
def lens(page):return page.evaluate('()=>window.SSSDisplayLens?.snapshot()?.lens||null')
def offered(page,kind):
 return page.evaluate('''kind=>{
 const all=SSSDisplayLens.resolveTargets().filter(t=>t.kind==='body'&&t.id.startsWith('organism:papers|overview|'));
 const wanted=all.filter(t=>{let x=decodeURIComponent(t.id.split('|').at(-1));return kind==='source'?x.startsWith('S.'): /^\\d+H\\./.test(x)});
 return wanted.filter(t=>t.cx>50&&t.cx<innerWidth-50&&t.cy>80&&t.cy<innerHeight-50)
 .map(t=>({...t,separation:Math.min(...all.filter(o=>o.id!==t.id).map(o=>Math.hypot(o.cx-t.cx,o.cy-t.cy)),Infinity)})).sort((a,b)=>b.separation-a.separation);
 }''',kind)
def drag_to(page,t):
 g=lens(page);assert g and not g['held'];page.mouse.move(g['x'],g['y']);page.mouse.down();page.mouse.move(t['cx'],t['cy'],steps=20);page.wait_for_timeout(900);page.mouse.up()
def contacted_body(page,kind):
 # Multiple projected bodies can overlap. Retry real drags; no fabricated body
 # or synthetic state mutation is allowed to replace the selected identity.
 for attempt in range(12):
  candidates=[t for t in offered(page,kind) if decode(t['id'].split('|')[-1]) in complete_ids]
  assert candidates,f'no visible actual {kind} body offered'
  drag_to(page,candidates[attempt%min(len(candidates),6)]);page.wait_for_timeout(900)
  lock=(lens(page) or {}).get('lock') or {};target=lock.get('id','');body=target.split('|')[-1]
  if decode(body) in complete_ids and target.startswith('organism:papers|overview|') and ((kind=='source' and body.startswith('S.')) or (kind=='holon' and 'H.' in body)):
   return target
 raise AssertionError(f'no actual {kind} acquired by the visitor drop')
def ready_reading(page,target):
 return page.wait_for_function('''id=>{
  const l=SSSDisplayLens.snapshot()?.lens,t=SSSDisplayLens.resolveTargets().find(t=>t.id===id),w=document.querySelector('.papers-wisdom-stage');
  if(l?.lock?.id!==id)throw new Error('reading lost the contacted body');
  return t?.frame&&l.round===0&&Math.abs(l.hx-t.frame.hx)<1&&Math.abs(l.hy-t.frame.hy)<1&&w?.dataset.lensReadingPage&&{lens:l,reading:{...w.dataset},text:document.querySelector('.papers-lens-reader p')?.textContent};
 }''',arg=target,timeout=60000).json_value()

def select_part(page,body,kind):
 prefix='organism:papers|'+encode(body)+'|'+kind+'|'
 attempts=[]
 for attempt in range(16):
  targets=page.evaluate('''({prefix,kind,body})=>{
   const all=SSSDisplayLens.resolveTargets();let parts=all.filter(t=>t.id.startsWith(prefix)&&!t.pending);
   if(kind==='face')parts=parts.flatMap(t=>{const key=decodeURIComponent(t.id.split('|').at(-1)),vs=[...key].map(g=>all.find(v=>v.id==='organism:papers|'+encodeURIComponent(body)+'|vert|'+'wxzy'.indexOf(g)));
    if(vs.some(v=>!v||v.pending))return [t];
    return [[.2,.3,.5],[.5,.2,.3],[.3,.5,.2],[1/3,1/3,1/3]].map(w=>({...t,cx:vs.reduce((s,v,i)=>s+w[i]*v.cx,0),cy:vs.reduce((s,v,i)=>s+w[i]*v.cy,0)}));});
   return parts.filter(t=>t.cx>12&&t.cy>80&&t.cx<innerWidth-12&&t.cy<innerHeight-12&&document.elementFromPoint(t.cx,t.cy)?.closest('.papers-sierpinski-stage'));
  }''',{'prefix':prefix,'kind':kind,'body':body})
  assert targets,(body,kind,'no actual visible authored part')
  target=targets[attempt%len(targets)];page.mouse.click(target['cx'],target['cy']);page.wait_for_timeout(150)
  actual=page.locator('.papers-wisdom-stage').get_attribute('data-inner-path') or ''
  attempts.append({'target':target['id'],'actual':actual})
  label={'vert':'vertex','met':'metabolite'}.get(kind,kind)
  if actual.startswith(label):return decode(target['id'].split('|')[-1])
 raise AssertionError((body,kind,'actual gestures did not select the offered tissue',attempts))

def read_all_parts(page,body,target,width):
 original=bodies[body];observed=[]
 for kind in ('vert','edge','face','whole','met'):
  key=select_part(page,body,kind);r=ready_reading(page,target)
  assert r['reading']['wisdomId']==body and r['reading']['lensReading']==target
  assert r['text'],(body,kind,'empty authored reading')
  occupied=page.evaluate('''()=>[...document.querySelectorAll('[data-display-occupancy],.papers-sierpinski-hud,.papers-sierpinski-label,.papers-physiology,.papers-origin-door')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&Number(getComputedStyle(e).opacity)>.3&&e.dataset.visible!=='false').map(e=>{const b=e.getBoundingClientRect();return {id:e.id||e.className,x:b.x,y:b.y,w:b.width,h:b.height}})''')
  L=r['lens'];box={'x':L['x']-L['hx'],'y':L['y']-L['hy'],'w':2*L['hx'],'h':2*L['hy']}
  for chrome in occupied:
   dx=min(box['x']+box['w'],chrome['x']+chrome['w'])-max(box['x'],chrome['x']);dy=min(box['y']+box['h'],chrome['y']+chrome['h'])-max(box['y'],chrome['y'])
   assert dx<=1 or dy<=1,(body,kind,'visible reading intersects chrome',box,chrome)
  if kind=='vert':
   if body.startswith('S.'):
    part=next(v for v in original['vertices'] if v['id']=='wxzy'[int(key)])
    assert part['text'].strip() in r['text'],'source partition was cut or replaced'
   else:assert original['parents'][int(key)] in r['text'],'vertex no longer names its actual parent'
  else:
   part=original['volume'] if kind=='whole' else next(v for v in original[{'edge':'edges','face':'faces','met':'metabolites'}[kind]] if v['id']==(key.split('·')[-1] if kind=='met' else key))
   expected=(part.get('compression') or part.get('title')) if kind=='met' else (part.get('text') or part.get('title'))
   assert expected.strip() in r['text'],(body,kind,'authored full text was cut or replaced')
  first,total=map(int,r['reading']['lensReadingPage'].split('/'))
  assert first==1 and total>=1
  page.screenshot(path=str(a.out/f'{body}-{width}-{kind}.png'))
  if total>1:
   page.keyboard.press('End');page.wait_for_function('''()=>{const p=document.querySelector('.papers-wisdom-stage').dataset.lensReadingPage?.split('/').map(Number);return p&&p[0]===p[1]}''')
   page.wait_for_timeout(300);last,total=page.wait_for_function('''()=>{const p=document.querySelector('.papers-wisdom-stage').dataset.lensReadingPage?.split('/').map(Number);return p&&p[0]===p[1]&&p}''').json_value()
   assert last==total,'occupied-space reflow lost the explicit End intent'
   assert page.locator('.papers-lens-reader p').text_content()==r['text'],'continuation changed source words'
   page.keyboard.press('Home');page.wait_for_function('document.querySelector(".papers-wisdom-stage").dataset.lensReadingPage?.startsWith("1/")')
  observed.append({'kind':kind,'key':key,'characters':len(r['text']),'pages':total,'extent':[2*r['lens']['hx'],2*r['lens']['hy']]})
  page.keyboard.press('Escape');page.wait_for_function('!document.querySelector(".papers-wisdom-stage").dataset.innerPath')
  assert page.locator('.papers-wisdom-stage').get_attribute('data-wisdom-id')==body
  assert (lens(page).get('lock') or {}).get('id')==target
 return observed

def manual_case(page,kind,width):
 field=page.locator('.papers-sierpinski-stage');before=float(field.get_attribute('data-chamber-scale'))
 target=contacted_body(page,kind);body=page.evaluate('(x)=>decodeURIComponent(x.split("|").at(-1))',target)
 page.wait_for_timeout(1000);after=float(field.get_attribute('data-chamber-scale'))
 assert abs(after-before)<.05,(kind,'contact zoomed the surrounding field',before,after)
 page.screenshot(path=str(a.out/f'{kind}-{width}-approach.png'))
 overlap_click=None
 # A chamber is entered first when the body's actual locus is below overview.
 # Every click targets the moving live drop/body; no navigation state is set.
 for turn in range(5):
  page.wait_for_timeout(1200);g=lens(page);assert g and (g.get('lock') or {}).get('id')==target,'body lock lost before entry'
  if page.locator('.papers-sierpinski-stage').get_attribute('data-current-rank') is not None:break
  contact=page.wait_for_function('''id=>{const lock=SSSDisplayLens.snapshot()?.lens?.lock;if(lock?.id!==id)throw new Error('body lock changed while its projection was pending');if(document.querySelector('.papers-sierpinski-stage')?.dataset.currentRank!==undefined)return {entered:true};return SSSDisplayLens.resolveTargets(id).find(t=>t.id===id&&!t.pending)||false}''',arg=target,timeout=30000).json_value()
  if contact.get('entered'):break
  # If another real body is under the same readable drop, deliberately click
  # its projected centre. The locked body, rather than that neighbour, must enter.
  point=page.evaluate('''({id,turn})=>{
   const l=SSSDisplayLens.snapshot().lens,all=SSSDisplayLens.resolveTargets(),visible=(x,y)=>document.elementFromPoint(x,y)?.closest('.papers-sierpinski-stage');
   if(turn===0){const other=all.find(t=>t.id!==id&&t.id.startsWith('organism:papers|overview|')&&!t.pending&&Math.abs(t.cx-l.x)<l.hx*.75&&Math.abs(t.cy-l.y)<l.hy*.75&&visible(t.cx,t.cy));if(other)return {x:other.cx,y:other.cy,overlap:other.id};}
   // The site's real button keeps its own click. Enter through a visible point
   // in the actual locked glass rather than clicking through that DOM control.
   for(const [a,b] of [[0,0],[-.4,0],[.4,0],[0,-.4],[0,.4],[-.4,-.4],[.4,.4]]){const x=l.x+a*l.hx,y=l.y+b*l.hy;if(visible(x,y))return {x,y};}
   return null;
  }''',{'id':target,'turn':turn})
  assert point,(body,'the locked glass has no visible entry point')
  if point.get('overlap'):overlap_click=point['overlap']
  page.mouse.click(point['x'],point['y']);page.wait_for_timeout(600)
 page.wait_for_function('document.querySelector(".papers-wisdom-stage")?.dataset.wisdomId',timeout=30000)
 entered=page.locator('.papers-wisdom-stage').get_attribute('data-wisdom-id');assert entered==body,(kind,body,entered)
 assert (lens(page).get('lock') or {}).get('id')==target
 page.screenshot(path=str(a.out/f'{kind}-{width}-entered.png'))
 parts=read_all_parts(page,body,target,width)
 assert page.locator('#mini').get_attribute('data-aperture')=='open','witness local Escape with the navigator actually open'
 assert not page.evaluate('()=>document.getElementById("mini").contains(document.activeElement)'),'navigator focus owns its own Escape'
 part=page.locator('.papers-wisdom-stage').get_attribute('data-inner-path') or ''
 if part:
  page.keyboard.press('Escape')
  page.wait_for_function('!document.querySelector(".papers-wisdom-stage")?.dataset.innerPath',timeout=30000)
  assert page.locator('.papers-sierpinski-stage').get_attribute('data-current-rank') is not None,'returning from tissue left its body'
  assert (lens(page).get('lock') or {}).get('id')==target,'returning from tissue lost its body lock'
 page.keyboard.press('Escape');page.wait_for_function('!document.querySelector(".papers-sierpinski-stage")?.dataset.currentRank',timeout=30000)
 assert (lens(page).get('lock') or {}).get('id')==target,'body lock lost on return'
 # The body returns to its real walked chamber, then the same local Escape
 # returns to overview without crossing into a different site.
 for _ in range(8):
  chamber=field.get_attribute('data-chamber-path')
  if chamber=='overview':break
  page.keyboard.press('Escape');page.wait_for_function('(old)=>document.querySelector(".papers-sierpinski-stage").dataset.chamberPath!==old',arg=chamber)
 assert field.get_attribute('data-chamber-path')=='overview'
 assert (lens(page).get('lock') or {}).get('id')==target
 return {'kind':kind,'viewport':width,'body':body,'same_lock_on_entry_and_return':True,'parts':parts,'walked_return':'overview','overlap_click':overlap_click}
def guided_case(page,width):
 # A previously contacted real Source must survive a borrowed tutorial too;
 # the complete case separately witnesses return to free/docked glass.
 prior_target=contacted_body(page,'source');prior=lens(page)
 prior_relation={'target':prior['lock']['id'],'home':prior.get('homeId'),'docked':bool(prior['docked'])}
 prior_path=page.locator('.papers-sierpinski-stage').get_attribute('data-chamber-path')
 def returned():
  page.get_by_role('button',name='RETURN TO MY VIEW',exact=True).click()
  page.wait_for_function('!document.querySelector(".papers-sierpinski-stage")?.dataset.currentRank',timeout=30000)
  try:page.wait_for_function('''old=>{const l=SSSDisplayLens.snapshot()?.lens;return l?.lock?.id===old.target&&(l.homeId??null)===(old.home??null)&&Boolean(l.docked)===old.docked}''',arg=prior_relation,timeout=15000)
  except Exception:
   print(json.dumps({'return_prior':prior_relation,'return_observed':lens(page),'comparison':page.evaluate('''old=>{const l=SSSDisplayLens.snapshot()?.lens;return {id:l?.lock?.id===old.target,home:(l.homeId??null)===(old.home??null),docked:Boolean(l.docked)===old.docked,expected:old}}''',prior_relation)}),flush=True);raise
  page.wait_for_function('(path)=>document.querySelector(".papers-sierpinski-stage").dataset.chamberPath===path',arg=prior_path)
  assert (lens(page).get('lock') or {}).get('id')==prior_target
  page.wait_for_function('''id=>{const r=document.querySelector('.papers-lens-reader');return r?.dataset.target===id&&r.querySelector('p')?.textContent.includes(decodeURIComponent(id.split('|').at(-1)))}''',arg=prior_target,timeout=15000)
 page.get_by_role('button',name='HOW PAPERS LIVES',exact=True).click()
 returned() # interruption during actual chamber/body approach
 page.get_by_role('button',name='HOW PAPERS LIVES',exact=True).click()
 page.wait_for_function('Number(document.querySelector(".papers-physiology")?.dataset.step)>=2',timeout=120000)
 page.wait_for_function('''()=>{const w=document.querySelector('.papers-wisdom-stage');return w?.dataset.innerPath?.startsWith('edge ')&&w.dataset.lensReading&&w.dataset.lensReadingPage}''',timeout=30000)
 evidence=page.evaluate('''()=>({tour:{...document.querySelector('.papers-physiology').dataset},
  wisdom:{...document.querySelector('.papers-wisdom-stage').dataset},lens:SSSDisplayLens.snapshot()?.lens})''')
 assert evidence['tour']['specimen'].startswith('4H.')
 assert evidence['wisdom']['lensReading'].endswith(encode(evidence['tour']['specimen']))
 assert evidence['lens']['lock']['kind']=='body'
 page.screenshot(path=str(a.out/f'guided-{width}.png'))
 assert page.locator('#mini').get_attribute('data-aperture')=='open'
 page.locator('#mini-trigger').focus();page.keyboard.press('Escape')
 assert page.locator('#mini').get_attribute('data-aperture')=='closed','focused navigator did not receive its own Escape'
 assert page.get_by_role('button',name='RETURN TO MY VIEW',exact=True).is_visible(),'navigator Escape interrupted the site-local guide'
 assert (lens(page).get('lock') or {}).get('kind')=='body','navigator Escape lost the active body lock'
 returned()
 # The next borrowed encounter is interrupted inside its real parent lineage.
 page.get_by_role('button',name='HOW PAPERS LIVES',exact=True).click()
 page.wait_for_function('''()=>{const t=document.querySelector('.papers-physiology'),w=document.querySelector('.papers-wisdom-stage');return Number(t?.dataset.step)>=6&&w?.dataset.wisdomId&&!w.dataset.wisdomId.startsWith('4H.')&&w.dataset.lensReadingPage}''',timeout=180000)
 descendant=page.locator('.papers-wisdom-stage').get_attribute('data-wisdom-id')
 page.screenshot(path=str(a.out/f'guided-ancestry-{width}.png'));returned()
 return {'kind':'guided-interruption','viewport':width,'specimen':evidence['tour']['specimen'],'descendant':descendant,'phases':['approach','reading','ancestry'],'prior_body_lock_restored':prior_target,'prior_chamber_restored':prior_path}
def encode(s):
 from urllib.parse import quote
 return quote(s,safe="~()*!.'-")
def decode(s):
 from urllib.parse import unquote
 return unquote(s)

def complete_case(page,width):
 prior=lens(page);page.get_by_role('button',name='HOW PAPERS LIVES',exact=True).click()
 seen={};last=None
 for _ in range(600):
  evidence=page.evaluate('''()=>({tour:{...document.querySelector('.papers-physiology').dataset},wisdom:{...document.querySelector('.papers-wisdom-stage').dataset},lens:SSSDisplayLens.snapshot()?.lens,returning:document.querySelector('.papers-physiology button')?.textContent})''')
  if evidence['returning']=='HOW PAPERS LIVES':break
  w=evidence['wisdom'];body=w.get('wisdomId');step=evidence['tour'].get('step')
  if body and w.get('lensReadingPage'):
   assert evidence['lens']['lock']['id']=='organism:papers|overview|'+encode(body)
   seen.setdefault(body,set()).add(w.get('innerPath','body'))
   if (body,step)!=last:
    print(json.dumps({'tour_viewport':width,'body':body,'step':step}),flush=True);last=(body,step)
    page.screenshot(path=str(a.out/f'complete-{width}-{step}-{body}.png'))
  page.wait_for_timeout(1000)
 else:raise AssertionError('actual guided lineage did not complete and return')
 assert any(k.startswith('4H.') for k in seen) and any(k.startswith('S.') for k in seen),seen
 assert page.locator('.papers-sierpinski-stage').get_attribute('data-current-rank') is None
 page.wait_for_function('''old=>{const l=SSSDisplayLens.snapshot()?.lens;return l&&l.docked===old.docked&&l.homeId===old.homeId&&Math.hypot(l.x-old.x,l.y-old.y)<2}''',arg=prior,timeout=15000)
 return {'kind':'complete-guided-lineage','viewport':width,'bodies':{k:sorted(v) for k,v in seen.items()},'prior_drop_restored':True}
try:
 from playwright.sync_api import sync_playwright
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,args=['--disable-webgl'] if a.backend=='canvas2d' else ['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  for width,height in [(1280,800),(390,844)]:
   if width not in a.viewports:continue
   for case in a.cases:
    context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    try:
     print(json.dumps({'case':case,'viewport':width,'backend':a.backend,'state':'start'}),flush=True)
     enter_papers(page);result=complete_case(page,width) if case=='complete' else guided_case(page,width) if case=='guided' else manual_case(page,case,width)
     actual=page.locator('[data-interlocutor="organism:papers"] .interlocutor-background').get_attribute('data-field-renderer');assert actual==('webgl2' if a.backend=='webgl' else a.backend),(a.backend,actual,'requested backend was not exercised')
     assert not errors,errors;result['backend']=actual;results.append(result)
     print(json.dumps(result),flush=True)
    except Exception:
     page.screenshot(path=str(a.out/f'{case}-{width}-FAILED.png'));raise
    finally:context.close()
  browser.close()
finally:
 server.shutdown();server.server_close();(a.out/'papers-encounter.json').write_text(json.dumps({'scope':__doc__,'cases':results},indent=2)+'\n')
print(json.dumps({'status':'PASS','browser_cases':len(results)}))
