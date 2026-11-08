#!/usr/bin/env python3
"""Witness shared HUD observation and retained-field return in real Chromium.

The browser runs the built artifact with SwiftShader. The instrumentation counts
actual surface acquisitions and context-local attachments; this is not a device
GPU-memory measurement or an FPS claim.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import json
import threading

from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--artifact', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args()
args.out.mkdir(parents=True, exist_ok=True)

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

INIT = r'''() => {
  const witness=window.__opticalWitness={scans:0,contexts:new Map()};
  const query=Document.prototype.querySelectorAll;
  Document.prototype.querySelectorAll=function(selector){
    if(selector==='[data-display-occupancy],[data-display-glass="on"]')witness.scans++;
    return query.call(this,selector);
  };
  const acquire=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(kind,...args){
    const gl=acquire.call(this,kind,...args);
    if(kind!=='webgl2'||!gl||!this.classList.contains('interlocutor-background')||witness.contexts.has(this))return gl;
    const data={live:{Framebuffer:new Set(),Renderbuffer:new Set(),Texture:new Set()},created:{},deleted:{}};
    witness.contexts.set(this,data);
    for(const type of ['Framebuffer','Renderbuffer','Texture']){
      const create=gl['create'+type],remove=gl['delete'+type];
      gl['create'+type]=function(){const value=create.call(gl);if(value){data.live[type].add(value);data.created[type]=(data.created[type]||0)+1}return value};
      gl['delete'+type]=function(value){if(data.live[type].delete(value))data.deleted[type]=(data.deleted[type]||0)+1;return remove.call(gl,value)};
    }
    return gl;
  };
}'''

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(args.artifact.resolve())))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}/index.html'
results = []

def scene(page, identity):
    page.wait_for_function('id => window.SSSDisplayRuntime?.state.activeIds.includes(id) && '
        'document.getElementById("tetra-fold").dataset.fold === "open"', arg=identity, timeout=90000)
    page.wait_for_function('id => {const c=document.querySelector(`[data-interlocutor="${id}"] .interlocutor-background`);'
        'return c?.dataset.fieldRenderer === "webgl2" && Number(c.dataset.glass)>0}', arg=identity, timeout=90000)

def navigate(page, identity):
    page.evaluate('id => SSSDisplayRuntime.navigateGlobal(SSSDisplayRuntime.registry.getMount(id).rawAddress)', identity)
    scene(page, identity)

def live(page, identity):
    return page.evaluate('''id => {
      const c=document.querySelector(`[data-interlocutor="${id}"] .interlocutor-background`),r=__opticalWitness.contexts.get(c);
      if(!r)return null;
      return Object.fromEntries(Object.entries(r.live).map(([k,v])=>[k,v.size]));
    }''', identity)

try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        for width,height in [(1280,800),(390,844)]:
            context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1,reduced_motion='reduce')
            context.add_init_script('('+INIT+')()')
            page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            try:
                page.goto(base,wait_until='domcontentloaded');scene(page,'organism:philosophy')
                phase=page.evaluate('''() => new Promise(resolve=>requestAnimationFrame(t=>{
                  const G=SSSDisplayGlass,L=SSSDisplayLens,h=document.getElementById('display-header'),
                    c=document.querySelector('[data-interlocutor="organism:philosophy"] .interlocutor-background'),
                    r=c.getBoundingClientRect(),b={width:c.width,height:c.height},style=h.getAttribute('style');
                  G.invalidate();const before=__opticalWitness.scans;
                  const a=G.observe(t),original=a.find(e=>e.ids.includes('display-header')).readRect.left;
                  L.snapshot(t);G.rects(r,b,t);G.rects(r,b,t);
                  const same=__opticalWitness.scans-before;
                  h.style.transform='translateX(7px)';
                  const changed=G.observe(t).find(e=>e.ids.includes('display-header')).readRect.left;
                  const after=__opticalWitness.scans-before;
                  if(style===null)h.removeAttribute('style');else h.setAttribute('style',style);
                  G.invalidate();resolve({same,after,shift:changed-original});
                }))''')
                assert phase['same']==1 and phase['after']==2 and abs(phase['shift']-7)<.1,phase
                active=live(page,'organism:philosophy');assert active and active['Framebuffer']>=2,active
                hidden=[];returned=[]
                for _ in range(2):
                    navigate(page,'organism:datenschutz')
                    page.wait_for_function('''() => {
                      const c=document.querySelector('[data-interlocutor="organism:philosophy"] .interlocutor-background'),
                        h=c.closest('[data-interlocutor]'),r=__opticalWitness.contexts.get(c);
                      return h.hidden && r && r.deleted.Framebuffer>=2;
                    }''',timeout=30000)
                    hidden.append(live(page,'organism:philosophy'))
                    navigate(page,'organism:philosophy');returned.append(live(page,'organism:philosophy'))
                assert all(x['Framebuffer']<=active['Framebuffer']-2 for x in hidden),(active,hidden)
                assert all(x['Framebuffer']==active['Framebuffer'] for x in returned),(active,returned)
                # A lost cached context must refuse re-entry while the current
                # encounter stays alive. This does not claim context recovery.
                navigate(page,'organism:datenschutz')
                lost=page.evaluate('''() => {
                  const c=document.querySelector('[data-interlocutor="organism:philosophy"] .interlocutor-background'),
                    gl=c.getContext('webgl2'),ext=gl.getExtension('WEBGL_lose_context');
                  if(!ext)return false;ext.loseContext();return true;
                }''')
                assert lost,'WebGL loss extension unavailable in the declared browser witness'
                page.wait_for_function('''() => document.querySelector('[data-interlocutor="organism:philosophy"] .interlocutor-background').getContext('webgl2').isContextLost()''')
                prior=page.evaluate('''() => ({address:SSSDisplayRuntime.state.activeAddress,length:history.length})''')
                page.evaluate('''() => SSSDisplayRuntime.navigateGlobal('')''')
                page.wait_for_function('''() => document.getElementById('site-state').dataset.feedWound && document.getElementById('tetra-fold').dataset.fold==='open' ''',timeout=30000)
                after=page.evaluate('''() => ({address:SSSDisplayRuntime.state.activeAddress,length:history.length,
                  currentVisible:!document.querySelector('[data-interlocutor="organism:datenschutz"]').hidden})''')
                assert after=={**prior,'currentVisible':True},(prior,after)
                assert not errors,errors
                page.screenshot(path=str(args.out/f'optical-return-{width}.png'))
                results.append({'viewport':[width,height],'backend':'Chromium WebGL2 / SwiftShader',
                    'observation':phase,'active':active,'hidden':hidden,'returned':returned,
                    'lost_cached_context_refused_with_prior_preserved':True})
            finally:
                context.close()
        browser.close()
finally:
    server.shutdown();server.server_close()
    (args.out/'optical-return.json').write_text(json.dumps({'scope':__doc__,'cases':results},indent=2)+'\n')
print(json.dumps({'status':'PASS','cases':results}))
