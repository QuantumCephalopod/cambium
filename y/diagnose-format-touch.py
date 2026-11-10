from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json, threading
from playwright.sync_api import sync_playwright

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*a): pass

server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(Path('_site').resolve())))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-webgl'])
    page=browser.new_page(viewport={'width':320,'height':568},is_mobile=True,has_touch=True,device_scale_factor=1,reduced_motion='reduce')
    page.goto(f'http://127.0.0.1:{server.server_port}/index.html?lang=de#main:overview',wait_until='domcontentloaded')
    page.wait_for_function('window.SSSDisplayRuntime?.state.activeIds.includes("organism:philosophy") && document.getElementById("tetra-fold").dataset.fold==="open"',timeout=180000)
    for link in page.locator('#legal-links a').all():
        link.scroll_into_view_if_needed();link.tap(trial=True)
    m=page.locator('#navTwin').bounding_box()
    before=page.evaluate('''m=>{const e=document.elementFromPoint(m.x+2,m.y+2),map=document.getElementById('navTwin');window.__events=[];for(const type of ['pointerdown','pointerup','click'])document.addEventListener(type,e=>window.__events.push({stage:'capture',type,id:e.target.id,pointer:e.pointerType,x:e.clientX,y:e.clientY}),true);map.addEventListener('pointerdown',e=>window.__events.push({stage:'map',id:e.target.id,pointer:e.pointerType}));return {point:[m.x+2,m.y+2],at:e&&{tag:e.tagName,id:e.id,cls:String(e.className)},map:map.getBoundingClientRect().toJSON(),mini:document.getElementById('mini').getBoundingClientRect().toJSON(),scroll:[...map.closest('#mini').querySelectorAll('*')].filter(e=>e.scrollLeft||e.scrollTop).map(e=>({id:e.id,x:e.scrollLeft,y:e.scrollTop})),htmlScroll:[scrollX,scrollY]}}''',m)
    page.touchscreen.tap(m['x']+2,m['y']+2)
    print(json.dumps({'before':before,'events':page.evaluate('window.__events')},ensure_ascii=False),flush=True)
    page.screenshot(path='_touch-diagnostic.png')
    browser.close()
server.shutdown()
