#!/usr/bin/env python3
"""Browser witness: actual Papers bodies and one shared drop.

Runs only against an already-built artifact. The contacted identities come from
real offered Source/Holon bodies; pointer gestures and Escape use the visitor
surface. The guided case reads an actual rank-4 specimen, then interrupts and
checks return to the saved drop. Canvas2D and viewport limits are explicit.
"""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
import argparse, json, threading

p=argparse.ArgumentParser();p.add_argument('--artifact',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args()
a.out.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(a.artifact.resolve())))
threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/index.html'
results=[]

def scene(page,identity):
 page.wait_for_function('(id)=>window.SSSDisplayRuntime?.state.activeIds.includes(id)&&document.getElementById("tetra-fold").dataset.fold==="open"',arg=identity,timeout=180000)
def enter_papers(page):
 page.goto(base,wait_until='domcontentloaded');scene(page,'organism:philosophy')
 page.get_by_role('button',name='Papers',exact=True).click();scene(page,'organism:papers')
 page.wait_for_function('document.querySelector(".papers-sierpinski-stage")?.dataset.shadowState==="ready"',timeout=60000)
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
  candidates=offered(page,kind)
  assert candidates,f'no visible actual {kind} body offered'
  drag_to(page,candidates[attempt%min(len(candidates),6)]);page.wait_for_timeout(900)
  lock=(lens(page) or {}).get('lock') or {};target=lock.get('id','');body=target.split('|')[-1]
  if target.startswith('organism:papers|overview|') and ((kind=='source' and body.startswith('S.')) or (kind=='holon' and 'H.' in body)):
   return target
 raise AssertionError(f'no actual {kind} acquired by the visitor drop')
def manual_case(page,kind,width):
 target=contacted_body(page,kind);body=page.evaluate('(x)=>decodeURIComponent(x.split("|").at(-1))',target)
 # A chamber is entered first when the body's actual locus is below overview.
 # Every click targets the moving live drop/body; no navigation state is set.
 for _ in range(5):
  page.wait_for_timeout(1200);g=lens(page);assert g and (g.get('lock') or {}).get('id')==target,'body lock lost before entry'
  if page.locator('.papers-sierpinski-stage').get_attribute('data-current-rank') is not None:break
  contact=page.evaluate('(id)=>SSSDisplayLens.resolveTargets(id).find(t=>t.id===id&&!t.pending)',target)
  assert contact,'actual body projection is not ready for entry'
  page.mouse.click(contact['cx'],contact['cy']);page.wait_for_timeout(600)
 page.wait_for_function('document.querySelector(".papers-wisdom-stage")?.dataset.wisdomId',timeout=30000)
 entered=page.locator('.papers-wisdom-stage').get_attribute('data-wisdom-id');assert entered==body,(kind,body,entered)
 assert (lens(page).get('lock') or {}).get('id')==target
 page.screenshot(path=str(a.out/f'{kind}-{width}-entered.png'))
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
 return {'kind':kind,'viewport':width,'body':body,'same_lock_on_entry_and_return':True}
def guided_case(page,width):
 prior=lens(page);page.get_by_role('button',name='HOW PAPERS LIVES',exact=True).click()
 page.wait_for_function('Number(document.querySelector(".papers-physiology")?.dataset.step)>=2',timeout=120000)
 page.wait_for_function('''()=>{const w=document.querySelector('.papers-wisdom-stage');return w?.dataset.innerPath?.startsWith('edge ')&&w.dataset.lensReading&&w.dataset.lensReadingPage}''',timeout=30000)
 evidence=page.evaluate('''()=>({tour:{...document.querySelector('.papers-physiology').dataset},
  wisdom:{...document.querySelector('.papers-wisdom-stage').dataset},lens:SSSDisplayLens.snapshot()?.lens})''')
 assert evidence['tour']['specimen'].startswith('4H.')
 assert evidence['wisdom']['lensReading'].endswith(encode(evidence['tour']['specimen']))
 assert evidence['lens']['lock']['kind']=='body'
 page.screenshot(path=str(a.out/f'guided-{width}.png'))
 page.get_by_role('button',name='RETURN TO MY VIEW',exact=True).click()
 page.wait_for_function('!document.querySelector(".papers-sierpinski-stage")?.dataset.currentRank',timeout=30000)
 page.wait_for_function('''old=>{const l=SSSDisplayLens.snapshot()?.lens;return l&&l.docked===old.docked&&l.homeId===old.homeId&&Math.hypot(l.x-old.x,l.y-old.y)<2}''',arg=prior,timeout=15000)
 assert page.locator('.papers-lens-reader').is_hidden(),'return retains stale accessible tissue'
 return {'kind':'guided-interruption','viewport':width,'specimen':evidence['tour']['specimen'],'step':evidence['tour']['step'],'prior_drop_restored':True}
def encode(s):
 from urllib.parse import quote
 return quote(s,safe="~()*!.'-")
try:
 from playwright.sync_api import sync_playwright
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,args=['--disable-webgl'])
  for width,height in [(1280,800),(390,844)]:
   for case in ('source','holon','guided'):
    context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    try:
     enter_papers(page);result=guided_case(page,width) if case=='guided' else manual_case(page,case,width)
     assert not errors,errors;result['backend']=page.locator('.papers-sierpinski-stage').get_attribute('data-field-renderer');results.append(result)
    except Exception:
     page.screenshot(path=str(a.out/f'{case}-{width}-FAILED.png'));raise
    finally:context.close()
  browser.close()
finally:
 server.shutdown();server.server_close();(a.out/'papers-encounter.json').write_text(json.dumps({'scope':__doc__,'cases':results},indent=2)+'\n')
print(json.dumps({'status':'PASS','browser_cases':len(results)}))
