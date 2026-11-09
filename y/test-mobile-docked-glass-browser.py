#!/usr/bin/env python3
"""Chromium SwiftShader WebGL2 witness for mobile ink beside docked glass.

Real browser layout and touch input are exercised; this does not establish
physical-device performance or offscreen GLES equivalence.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import json
import threading

from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--artifact',type=Path,required=True)
parser.add_argument('--out',type=Path,required=True)
args=parser.parse_args();args.out.mkdir(parents=True,exist_ok=True)

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(args.artifact.resolve())))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/index.html'
cases=[]
try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        for width,height in [(320,568),(390,844)]:
            for language in ('de','en'):
                page=browser.new_page(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,device_scale_factor=1,reduced_motion='reduce')
                errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
                stem=f'docked-{language}-{width}x{height}'
                try:
                    page.goto(base+f'?lang={language}#main:overview',wait_until='domcontentloaded')
                    page.wait_for_function('window.SSSDisplayRuntime?.state.activeIds.includes("organism:philosophy") && document.getElementById("tetra-fold").dataset.fold==="open"',timeout=180000)
                    page.evaluate('document.fonts.ready')
                    page.wait_for_function('''()=>{const d=SSSDisplayLens.snapshot()?.lens,c=document.querySelector('[data-interlocutor="organism:philosophy"] .interlocutor-background');return d?.docked&&d.attached&&!d.lock&&c?.dataset.fieldRenderer==='webgl2'&&Number(c.dataset.glass)>0&&document.querySelectorAll('[data-interlocutor="organism:philosophy"] .field-body-label:not([hidden])').length===5}''',timeout=180000)
                    # Allow resize-observed labels to be placed with the
                    # same actual lens geometry used by the optical pass.
                    page.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
                    snapshot=page.evaluate('''()=>{
                      const d=SSSDisplayLens.snapshot().lens;
                      const drop={left:d.x-d.boundX,right:d.x+d.boundX,top:d.y-d.boundY,bottom:d.y+d.boundY};
                      const labels=[...document.querySelectorAll('[data-interlocutor="organism:philosophy"] .field-body-label:not([hidden])')].map(e=>{
                        const r=e.getBoundingClientRect(),at=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
                        return {text:e.textContent,left:r.left,right:r.right,top:r.top,bottom:r.bottom,reachable:!!at&&(at===e||e.contains(at))};
                      });return {drop,labels};
                    }''')
                    def apart(a,b):
                        return min(a['right'],b['right'])-max(a['left'],b['left'])<=1 or min(a['bottom'],b['bottom'])-max(a['top'],b['top'])<=1
                    assert len(snapshot['labels'])==5,(stem,snapshot)
                    for i,a in enumerate(snapshot['labels']):
                        assert a['reachable'] and a['bottom']-a['top']>=43,(stem,a)
                        assert apart(a,snapshot['drop']),(stem,a,snapshot['drop'],'docked glass covers body ink')
                        for b in snapshot['labels'][i+1:]:assert apart(a,b),(stem,a,b,'body labels overlap')
                    page.screenshot(path=str(args.out/(stem+'.png')))
                    paper=next(a for a in snapshot['labels'] if a['text']=='Papers')
                    page.touchscreen.tap((paper['left']+paper['right'])/2,(paper['top']+paper['bottom'])/2)
                    page.wait_for_function('SSSDisplayRuntime.state.activeAddress==="w" && document.getElementById("tetra-fold").dataset.fold==="open"',timeout=180000)
                    slot=page.locator('#display-ascent').bounding_box();page.touchscreen.tap(slot['x']+slot['width']/2,slot['y']+slot['height']/2)
                    page.wait_for_function('SSSDisplayRuntime.state.activeAddress==="" && document.getElementById("tetra-fold").dataset.fold==="open"',timeout=180000)
                    assert not errors,(stem,errors)
                    cases.append({'viewport':[width,height],'language':language,'backend':'webgl2','drop':snapshot['drop']})
                    print('PASS',stem,flush=True)
                except Exception:
                    page.screenshot(path=str(args.out/(stem+'-FAILED.png')))
                    raise
                finally:page.close()
        browser.close()
finally:
    server.shutdown();server.server_close()
    (args.out/'docked-glass.json').write_text(json.dumps({'scope':__doc__,'cases':cases},indent=2)+'\n')
print(json.dumps({'status':'PASS','cases':len(cases)}))
