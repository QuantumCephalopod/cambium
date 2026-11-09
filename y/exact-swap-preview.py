#!/usr/bin/env python3
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
  browser=pw.chromium.launch(headless=True,args=['--disable-webgl'])
  for w,h in [(320,568),(390,844),(1280,800)]:
   page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1,reduced_motion='reduce',has_touch=True)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   try:
    page.goto(f'http://127.0.0.1:{server.server_port}/index.html#main:overview',wait_until='domcontentloaded')
    page.wait_for_function('window.SSSDisplayRuntime?.state.activeAddress===""&&document.getElementById("tetra-fold").dataset.fold==="open"',timeout=180000);page.evaluate('document.fonts.ready')
    q=page.evaluate('''()=>{const s=SSSDisplayMembraneGrid.snapshot(),v=s.viewport,c=s.compass,m=s.orientation,o=SSSUIGrid.orientBounds(SSSUIGrid.fieldInfo(s.outer,'ascent').bounds,m),n=Object.fromEntries(['pocket','legal','trigger'].map(x=>[x,SSSUIGrid.orientBounds(SSSUIGrid.carrierField(s.inner,x,m).bounds,m)]));const global=b=>({left:b.x*v.width,top:b.y*v.height,width:b.w*v.width,height:b.h*v.height});const local=b=>({left:c.left+b.x*c.width,top:c.top+b.y*c.height,width:b.w*c.width,height:b.h*c.height});const box=e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height}};return {oldBack:global(o),oldPocket:local(n.pocket),oldLegal:local(n.legal),oldTrigger:local(n.trigger),pocket:box(document.getElementById('mini-pocket')),back:box(document.getElementById('display-ascent')),legal:box(document.getElementById('legal-links')),trigger:box(document.getElementById('mini-trigger')),map:box(document.getElementById('navTwin'))}}''')
    for one,two in [('pocket','oldBack'),('back','oldPocket'),('legal','oldLegal')]:
     for k in ('left','top','width','height'):assert abs(q[one][k]-q[two][k])<1,(w,h,one,two,k,q)
    page.locator('#navTwin').click(trial=True);page.locator('#mini-help-toggle').click(trial=True)
    for el in page.locator('#legal-links a').all():el.scroll_into_view_if_needed();el.click(trial=True)
    page.screenshot(path=str(a.out/f'exact-{w}x{h}.png'))
    if h>w:
     paper=page.locator('[data-interlocutor="organism:philosophy"] .field-body-label').filter(has_text='Papers');paper.wait_for(state="visible",timeout=10000);r=paper.bounding_box();page.touchscreen.tap(r["x"]+r["width"]/2,r["y"]+r["height"]/2)
     page.wait_for_function('SSSDisplayRuntime.state.activeAddress==="w"&&document.getElementById("tetra-fold").dataset.fold==="open"',timeout=180000)
     b=page.locator('#display-ascent').bounding_box();page.touchscreen.tap(b['x']+b['width']/2,b['y']+b['height']/2)
     page.wait_for_function('SSSDisplayRuntime.state.activeAddress===""&&document.getElementById("tetra-fold").dataset.fold==="open"',timeout=180000)
    assert not errors,errors;cases.append({'viewport':[w,h],**q});print('PASS',w,h,json.dumps({'pocket':q['pocket'],'back':q['back'],'legal':q['legal'],'map':q['map']}),flush=True)
   except Exception:
    page.screenshot(path=str(a.out/f'exact-{w}x{h}-FAILED.png'));raise
   finally:page.close()
  browser.close()
finally:server.shutdown();server.server_close();(a.out/'exact.json').write_text(json.dumps({'cases':cases},indent=2)+'\n')
