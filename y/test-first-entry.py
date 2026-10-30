#!/usr/bin/env python3
"""Actual Chromium cold-entry witness against one complete built public source.

Separates local-server acquisition, Worker ACK delivery, owner preparation,
field creation, renderer acceptance and the revealed browser frame. Timings are
this instrumented runner's observations, not public-network or device promises.
Delayed body delivery and deliberate renderer refusal exercise the prior-body
boundary. No source paging, shortened fixture, or synthetic progress is used.
"""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
import argparse, json, threading, hashlib

p = argparse.ArgumentParser()
p.add_argument('--artifact', type=Path, required=True)
p.add_argument('--out', type=Path, required=True)
a = p.parse_args(); a.out.mkdir(parents=True, exist_ok=True)
gates = {}
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self, *args): pass
 def do_GET(self):
  case = next((part.strip().split('=', 1)[1] for part in self.headers.get('Cookie', '').split(';') if part.strip().startswith('entry_case=')), '')
  if self.path.endswith('site-organism-crawlerbait-feed.json') and case in gates:
   data = Path(self.translate_path(self.path)).read_bytes()
   self.send_response(200); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.flush()
   gates[case].wait(40)
   try: self.wfile.write(data)
   except (BrokenPipeError, ConnectionResetError): pass
  else: super().do_GET()

# Hooks retain the real production implementations and task scheduling. Worker
# messages are counted without copying their payload a second time.
INIT = r'''({refuse=false}={}) => {
 const E=window.__entry={marks:[],batches:0,records:0,maxRecords:0,acks:0,frameGaps:[],refuse};
 const mark=(name,extra={})=>E.marks.push({name,at:performance.now(),...extra});
 let acquiring=false,lastFrame=0;
 const frame=t=>{if(acquiring&&lastFrame)E.frameGaps.push(t-lastFrame);lastFrame=t;requestAnimationFrame(frame)};requestAnimationFrame(frame);
 const Worker0=Worker;
 window.Worker=class extends Worker0 {
  constructor(url,...args){super(url,...args);this.feed=String(url).includes('feed-acquisition.js');if(this.feed)this.addEventListener('message',e=>{const d=e.data;if(d.nodes){E.batches++;E.records+=d.nodes.length;E.maxRecords=Math.max(E.maxRecords,d.nodes.length);if(E.batches===1)mark('first_batch')}if(d.complete)mark('last_ack')})}
  postMessage(data,...args){if(this.feed&&data.ack)E.acks++;return super.postMessage(data,...args)}
 };
 let acquisition;
 Object.defineProperty(window,'SSSFeedAcquisition',{configurable:true,get:()=>acquisition,set:api=>{acquisition={...api,acquire(url,options={}){
  if(!String(url).includes('crawlerbait-feed.json'))return api.acquire(url,options);
  acquiring=true;mark('request');
  return api.acquire(url,{...options,onProgress:p=>{mark(({'.1':'headers','.45':'body','.55':'parsed','.6':'delivered'})[String(p).replace(/^0/,'')]||'progress',{progress:p});options.onProgress?.(p)}}).then(value=>{mark('acquired');acquiring=false;return value},error=>{mark('acquisition_error');acquiring=false;throw error})
 }}}});
 const timed=(owner,name,key)=>function(...args){mark(key+'_start');try{const out=owner[name].apply(owner,args);if(out?.then)return out.then(value=>{mark(key+'_end');return value},error=>{mark(key+'_error');throw error});mark(key+'_end');return out}catch(error){mark(key+'_error');throw error}};
 const modules=new Map(),set=modules.set;
 modules.set=function(id,owner){if(id==='organism:crawlerbait'){
  const wrapper={...owner};
  for(const [name,key]of [['prepareFieldProjection','prepare'],['fieldProjection','field'],['render','render']])if(owner[name])wrapper[name]=timed(owner,name,key);
  const prepare=wrapper.prepareFieldProjection;wrapper.prepareFieldProjection=function(source,...args){E.source={routes:source.routes.length,encounters:source.encounters.length,crawlers:source.crawlers.length};return prepare.call(this,source,...args)};
  const render=wrapper.render;wrapper.render=function(...args){const value=render.apply(this,args);if(E.refuse){E.refuse=false;mark('deliberate_refusal');return false}return value};owner=wrapper;
 }return set.call(this,id,owner)};window.SSSInterlocutorModules=modules;
 let fields;
 Object.defineProperty(window,'SSSInterlocutorFields',{configurable:true,get:()=>fields,set:api=>{fields={...api,create(options){if(options.id!=='organism:crawlerbait')return api.create(options);mark('renderer_setup_start');const value=api.create(options);mark('renderer_setup_end');return value}}}});
 addEventListener('DOMContentLoaded',()=>{const fold=document.getElementById('tetra-fold');new MutationObserver(records=>{for(const r of records)if(r.attributeName==='data-fold')mark('fold_'+fold.dataset.fold)}).observe(fold,{attributes:true})});
}'''
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(a.artifact.resolve())))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}/index.html'
results = []
source = next(a.artifact.glob('assets/*/site-organism-crawlerbait-feed.json')).read_bytes()
identity = json.loads(source)
source_record = dict(bytes=len(source), sha256=hashlib.sha256(source).hexdigest(), routes=len(identity['routes']), encounters=len(identity['encounters']), crawlers=len(identity['crawlers']))
def scene(page, identity):
 page.wait_for_function('(id)=>window.SSSDisplayRuntime?.state.activeIds.includes(id)&&document.getElementById("tetra-fold").dataset.fold==="open"', arg=identity, timeout=180000)
def enter(page, identity):
 page.evaluate('(id)=>SSSDisplayRuntime.navigateGlobal(SSSDisplayRuntime.registry.getMount(id).rawAddress)', identity)
def snapshot(page):
 return page.evaluate('()=>({state:SSSDisplayRuntime.state,hash:location.hash,history:history.length})')
def report(page):
 e=page.evaluate('()=>window.__entry'); marks={m['name']:m['at'] for m in e['marks']}
 spans={}
 for name,start,end in [('response','request','headers'),('body','headers','body'),('parse','body','parsed'),('ack_delivery','parsed','acquired'),('owner_preparation','prepare_start','prepare_end'),('field_projection','field_start','field_end'),('renderer_setup','renderer_setup_start','renderer_setup_end'),('renderer_acceptance','render_start','render_end'),('entry_to_reveal','request','fold_open')]:
  if start in marks and end in marks: spans[name]=round(marks[end]-marks[start],3)
 gaps=e.pop('frameGaps');e['max_acquisition_frame_gap_ms']=max(gaps,default=0);e['acquisition_frames']=len(gaps);e['phase_ms']=spans
 return e
try:
 from playwright.sync_api import sync_playwright
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,args=['--disable-webgl'])
  # The observed defect used Canvas2D. This witness names that actual backend;
  # the separate material/GLES witnesses retain their own scope.
  for width,height in [(1280,800),(390,844)]:
   context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1)
   context.add_init_script('('+INIT+')()');page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   try:
    page.goto(base,wait_until='domcontentloaded');scene(page,'organism:philosophy');enter(page,'organism:crawlerbait');scene(page,'organism:crawlerbait')
    page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()))')
    e=report(page);assert e['source']=={k:source_record[k] for k in ('routes','encounters','crawlers')}
    assert e['batches']>0 and e['acks']==e['batches'] and e['maxRecords']<=64,e
    assert all(key in e['phase_ms'] for key in ('body','parse','ack_delivery','owner_preparation','renderer_setup','renderer_acceptance','entry_to_reveal')),e
    assert not errors,errors
    e.update(case='complete-cold-entry',viewport=[width,height],backend=page.locator('#tetra-fold').get_attribute('data-particle-backend'),errors=errors);results.append(e)
    page.screenshot(path=str(a.out/f'entry-{width}.png'))
   finally: context.close()
  for width,height,gesture,reduced in [(1280,800,'home',False),(390,844,'escape',False),(390,844,'escape',True)]:
   case=f'wait-{width}-{gesture}-{reduced}';gates[case]=threading.Event()
   context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1,reduced_motion='reduce' if reduced else 'no-preference')
   context.add_init_script('('+INIT+')()');context.add_cookies([dict(name='entry_case',value=case,domain='127.0.0.1',path='/')]);page=context.new_page()
   try:
    page.goto(base,wait_until='domcontentloaded');scene(page,'organism:philosophy');enter(page,'organism:datenschutz');scene(page,'organism:datenschutz')
    prior=snapshot(page);enter(page,'organism:crawlerbait')
    page.wait_for_function('document.getElementById("tetra-fold").dataset.waiting==="true"&&__entry.marks.some(m=>m.name==="headers")')
    page.wait_for_timeout(600)
    samples=[]
    for _ in range(8):
     samples.append(page.evaluate('()=>{const f=document.getElementById("tetra-fold"),s=document.getElementById("site-state"),c=getComputedStyle(f,"::after");return {alpha:Number(c.opacity),animation:c.animationName,parameter:Number(f.style.getPropertyValue("--fold-fallback-alpha")),status:s.textContent,statusZ:Number(getComputedStyle(s.parentElement).zIndex),coverZ:Number(getComputedStyle(f).zIndex)}}'))
     page.wait_for_timeout(200)
    assert snapshot(page)==prior,'waiting changed prior encounter/history'
    assert all(s['parameter']<=.62 and s['alpha']<=.62 and 'ESC:' in s['status'] and s['statusZ']>s['coverZ'] for s in samples),samples
    if reduced: assert all(s['animation']=='none' for s in samples)
    else: assert all(s['animation']=='fold-wait' for s in samples) and max(s['alpha'] for s in samples)-min(s['alpha'] for s in samples)>.005,samples
    page.screenshot(path=str(a.out/(case+'.png')))
    if gesture=='home':page.locator('#root-home').click()
    else:
     assert page.locator('#mini').get_attribute('data-aperture')=='open','Escape priority must be witnessed with the navigator open'
     page.keyboard.press('Escape')
    # Cancellation has its own bound: it must not wait for the server's delayed
    # body or accidentally let an earlier compass handler consume Escape.
    page.wait_for_function('document.getElementById("tetra-fold").dataset.fold==="open"',timeout=10000)
    assert snapshot(page)==prior,'cancellation changed prior encounter/history'
    assert page.locator('#site-state').get_attribute('data-handoff-phase') is None
    assert not gates[case].is_set(),'cancellation waited for body'
    gates[case].set();page.wait_for_function('__entry.marks.some(m=>m.name==="prepare_end")',timeout=180000)
    page.wait_for_timeout(200);assert snapshot(page)==prior,'late readiness committed cancelled successor'
    results.append(dict(case=case,viewport=[width,height],reduced_motion=reduced,samples=samples,cancelled_before_body=True,late_source_retained_prior=True,transport=report(page)))
   except Exception:
    failure=page.evaluate('()=>({state:SSSDisplayRuntime.state,pending:SSSDisplayRuntime.pendingEncounter,fold:{...document.getElementById("tetra-fold").dataset},aperture:{...document.getElementById("mini").dataset},status:document.getElementById("site-state").textContent,entry:window.__entry})')
    (a.out/(case+'-FAILED.json')).write_text(json.dumps(failure,indent=2)+'\n')
    page.screenshot(path=str(a.out/(case+'-FAILED.png')));raise
   finally:gates[case].set();context.close()
  context=browser.new_context(viewport={'width':1280,'height':800},device_scale_factor=1,reduced_motion='reduce')
  context.add_init_script('('+INIT+')({refuse:true})');page=context.new_page()
  try:
   page.goto(base,wait_until='domcontentloaded');scene(page,'organism:philosophy');prior=snapshot(page);enter(page,'organism:crawlerbait')
   page.wait_for_function('document.getElementById("site-state").dataset.feedWound&&document.getElementById("tetra-fold").dataset.fold==="open"',timeout=180000)
   assert snapshot(page)==prior,'refusal changed prior encounter/history'
   assert page.locator('[data-interlocutor="organism:crawlerbait"]').get_attribute('hidden') is not None
   enter(page,'organism:crawlerbait');scene(page,'organism:crawlerbait');e=report(page)
   assert sum(m['name']=='request' for m in e['marks'])==1,'retry refetched already valid source'
   results.append(dict(case='renderer-refusal-and-retry',retained_prior=True,reused_source=True,evidence=e))
  finally:context.close()
  browser.close()
finally:
 for gate in gates.values():gate.set()
 server.shutdown();server.server_close()
 (a.out/'first-entry.json').write_text(json.dumps(dict(scope=__doc__,source=source_record,cases=results),indent=2)+'\n')
print(json.dumps(dict(status='PASS',browser_cases=len(results),source=source_record)))
