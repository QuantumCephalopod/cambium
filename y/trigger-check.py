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
  for w,h in [(320,568),(390,844),(667,375),(1280,800),(1920,900)]:
   page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1,reduced_motion='reduce',has_touch=True)
   try:
    page.goto(f'http://127.0.0.1:{server.server_port}/index.html#main:overview',wait_until='domcontentloaded')
    page.wait_for_function('window.SSSDisplayRuntime?.state.activeAddress===""&&document.getElementById("tetra-fold").dataset.fold==="open"',timeout=180000);page.evaluate('document.fonts.ready')
    q=page.evaluate('''()=>{const box=id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};return {pocket:box('mini-pocket'),trigger:box('mini-trigger'),map:box('navTwin'),axisX:box('axis-x'),axisY:box('axis-y'),help:box('mini-help-toggle'),hint:box('mini-help'),back:box('display-ascent'),legal:box('legal-links'),state:SSSDisplayMembraneGrid.snapshot().fit}}''')
    page.screenshot(path=str(a.out/f'open-{w}x{h}.png'))
    def overlap(a,b):return min(a['right'],b['right'])-max(a['x'],b['x'])>1 and min(a['bottom'],b['bottom'])-max(a['y'],b['y'])>1
    for name in ('map','axisX','axisY','help','hint','back','legal'):
     assert not overlap(q['trigger'],q[name]),(w,h,name,q)
    assert q['trigger']['width']>=39 and q['trigger']['height']>=39,(w,h,'trigger size',q)
    for target in ('#navTwin','#axis-x','#axis-y','#mini-help-toggle'):page.locator(target).click(trial=True,timeout=10000)
    page.locator('#mini-trigger').click();assert page.locator('#mini-trigger').get_attribute('aria-expanded')=='false';page.screenshot(path=str(a.out/f'closed-{w}x{h}.png'));page.locator('#mini-trigger').click();assert page.locator('#mini-trigger').get_attribute('aria-expanded')=='true'
    debug="""()=>{let c=document.querySelector('#mini-core'),m=document.querySelector('#mini'),n=document.querySelector('#navTwin');return {map:n.getBoundingClientRect().toJSON(),core:c.getBoundingClientRect().toJSON(),scroll:c.scrollTop,scrollHeight:c.scrollHeight,cap:m.style.getPropertyValue('--compass-map-cap'),axisCut:m.style.getPropertyValue('--compass-axis-x-cut'),hintCut:m.style.getPropertyValue('--compass-hint-cut'),chrome:m.dataset.mapChrome}}"""
    before=page.evaluate(debug);page.locator('#mini-help-toggle').click();page.wait_for_timeout(250);after=page.evaluate(debug);print('HELP',w,h,json.dumps({'before':before,'after':after}),flush=True)
    assert abs(after['map']['width']-before['map']['width'])<1,(w,h,'help shrank map',before,after)
    page.locator('#mini-help-toggle').click()
    cases.append({'viewport':[w,h],**q});print('GEOMETRY',w,h,json.dumps(q),flush=True)
   finally:page.close()
  browser.close()
finally:server.shutdown();server.server_close();(a.out/'trigger.json').write_text(json.dumps({'cases':cases},indent=2)+'\n')
