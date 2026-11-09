from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright
import argparse,json
p=argparse.ArgumentParser();p.add_argument('--artifact',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args();a.out.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(a.artifact.resolve())));Thread(target=server.serve_forever,daemon=True).start();cases=[]
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  for w,h in [(390,844),(1280,800)]:
   page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1,reduced_motion='reduce',has_touch=True)
   try:
    page.goto(f'http://127.0.0.1:{server.server_port}/index.html#main:overview',wait_until='domcontentloaded')
    page.wait_for_function('''()=>window.SSSDisplayRuntime?.state.activeAddress===""&&document.getElementById("tetra-fold").dataset.fold==="open"&&document.querySelector('[data-interlocutor="organism:philosophy"] .interlocutor-background')?.dataset.fieldRenderer==='webgl2' ''',timeout=180000)
    page.evaluate('document.fonts.ready');page.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
    q=page.evaluate('''()=>{const s=SSSDisplayMembraneGrid.snapshot();return {trigger:s.trigger,pocket:s.pocket,oldCompass:s.compass,glass:SSSDisplayGlass.collect().map(x=>({id:x.id,ids:x.ids,rect:x.rect})),renderer:document.querySelector('[data-interlocutor="organism:philosophy"] .interlocutor-background').dataset.fieldRenderer}}''')
    entry=next(x for x in q['glass'] if 'mini-trigger' in x['ids'])
    for k in ('left','top','width','height'):assert abs(entry['rect'][k]-q['trigger'][k])<0.5,(w,h,k,q)
    pck=q['pocket'];b=q['trigger'];assert b['left']>=pck['left']-.5 and b['right']<=pck['right']+.5 and b['top']>=pck['top']-.5 and b['bottom']<=pck['bottom']+.5,(w,h,q)
    page.screenshot(path=str(a.out/f'glass-open-{w}x{h}.png'));page.locator('#mini-trigger').click();page.screenshot(path=str(a.out/f'glass-closed-{w}x{h}.png'))
    cases.append({'viewport':[w,h],**q});print('WEBGL PASS',w,h,json.dumps(q),flush=True)
   except Exception:
    page.screenshot(path=str(a.out/f'glass-FAILED-{w}x{h}.png'));raise
   finally:page.close()
  browser.close()
finally:server.shutdown();server.server_close();(a.out/'trigger-glass.json').write_text(json.dumps({'cases':cases},indent=2)+'\n')
