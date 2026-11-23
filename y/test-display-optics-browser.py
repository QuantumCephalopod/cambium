#!/usr/bin/env python3
"""Witness shared HUD observation, retained-field return and actual WebGL restoration.

The browser runs the built artifact with SwiftShader. The instrumentation counts
actual surface acquisitions and context-local attachments; this is not a device
GPU-memory measurement or an FPS claim.
"""
from collections import defaultdict
from functools import lru_cache, partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import argparse
import json
import os
import threading

from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--artifact', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args()
args.out.mkdir(parents=True, exist_ok=True)

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
    def do_GET(self):
        # Keep the actual Worker and owner renderer for the GPU lifetime
        # witness. The full traffic history remains the normal artifact.
        if urlsplit(self.path).path.endswith('/site-organism-crawlerbait-feed.json'):
            body, _ = bounded_crawlerbait_feed()
            self.send_response(200)
            self.send_header('Content-Type','application/json')
            self.send_header('Content-Length',str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            super().do_GET()

@lru_cache(maxsize=1)
def bounded_crawlerbait_feed():
    path = next(args.artifact.glob('assets/*/site-organism-crawlerbait-feed.json'))
    source = json.loads(path.read_text())
    by_being = defaultdict(list)
    routes_by_path = {route['path']:route for route in source['routes']}
    for item in source['encounters']:
        by_being[item['crawler']].append(item)
    for being in source['crawlers']:
        encounters = by_being[being['id']]
        paths = {item['path'] for item in encounters}
        if len(paths)>=2 and len(encounters)<=24 and paths<=routes_by_path.keys():
            routes = [route for route in source['routes'] if route['path'] in paths]
            summary = {**source['summary'],'baits':len(routes),'web_requests':len(encounters)}
            bounded = {**source,'crawlers':[being],'routes':routes,'encounters':encounters,'summary':summary}
            return json.dumps(bounded).encode(),{'beings':1,'baits':len(routes),'encounters':len(encounters)}
    raise AssertionError('no bounded complete public Being available for the renderer witness')

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
    const data={live:{Framebuffer:new Set(),Renderbuffer:new Set(),Texture:new Set()},created:{},deleted:{},
      used:new Map(),arrayUploads:0,losses:0,restores:0};
    witness.contexts.set(this,data);
    this.addEventListener('webglcontextlost',()=>{
      data.losses++;data.oldPrograms=new Map(data.used);data.used.clear();
      data.oldArrayUploads=data.arrayUploads;data.arrayUploads=0;
      for(const objects of Object.values(data.live))objects.clear();
    });
    this.addEventListener('webglcontextrestored',()=>data.restores++);
    for(const type of ['Framebuffer','Renderbuffer','Texture']){
      const create=gl['create'+type],remove=gl['delete'+type];
      gl['create'+type]=function(){const value=create.call(gl);if(value){data.live[type].add(value);data.created[type]=(data.created[type]||0)+1}return value};
      gl['delete'+type]=function(value){if(data.live[type].delete(value))data.deleted[type]=(data.deleted[type]||0)+1;return remove.call(gl,value)};
    }
    const attach=gl.attachShader,source=gl.getShaderSource,use=gl.useProgram,families=new WeakMap();
    gl.attachShader=function(program,shader){
      const code=source.call(gl,shader)||'';
      const names=[['glass','texture(uScene'],['authored-text','sampler2D uText'],['sheet','sampler2DArray uImg'],
        ['papers','vec3 local=iCenter+aPos*iScale'],['traffic-ink','sampler2D tInk'],['host','uEnvRegion']];
      for(const [name,token] of names)if(code.includes(token))families.set(program,name);
      return attach.call(gl,program,shader);
    };
    let current=null;
    gl.useProgram=function(program){current=program;return use.call(gl,program)};
    const upload=gl.texSubImage3D;
    gl.texSubImage3D=function(...args){data.arrayUploads++;return upload.apply(gl,args)};
    for(const method of ['drawArrays','drawArraysInstanced']){
      const draw=gl[method];gl[method]=function(...args){
        const family=families.get(current);
        if(family&&args[2]>0&&(args.length===3||args[3]>0))data.used.set(family,current);
        return draw.apply(gl,args);
      };
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

def lose(page, identity):
    assert page.evaluate('''id => {
      const field=SSSInterlocutorFields.get(id),gl=field.canvas.getContext('webgl2');
      const ext=gl.getExtension('WEBGL_lose_context');
      if(!ext)return false;
      __opticalWitness.loss={field,gl,ext};ext.loseContext();return true;
    }''',identity), 'WebGL loss extension unavailable in the declared browser witness'
    page.wait_for_function('''() => {
      const {field,gl}=__opticalWitness.loss;
      return gl.isContextLost() && field.canvas.dataset.fieldRenderer==='context-lost';
    }''', timeout=30000)

def restore(page):
    page.evaluate('() => __opticalWitness.loss.ext.restoreContext()')
    page.wait_for_function('''() => {
      const {field,gl}=__opticalWitness.loss;
      return !gl.isContextLost() && __opticalWitness.contexts.get(field.canvas).restores===1;
    }''',timeout=30000)

def witnessed_frame(page, identity, family):
    result=page.evaluate('''({id,family}) => {
      const field=SSSInterlocutorFields.get(id),canvas=field.canvas,gl=canvas.getContext('webgl2');
      const data=__opticalWitness.contexts.get(canvas),prior=data.oldPrograms?.get(family);
      const prepared=field.prepareFrame(),program=data.used.get(family),glass=data.used.get('glass');
      const samples=[];
      for(const x of [.15,.35,.5,.65,.85])for(const y of [.15,.35,.5,.65,.85]){
        const bytes=new Uint8Array(4);
        gl.readPixels(Math.floor(canvas.width*x),Math.floor(canvas.height*y),1,1,gl.RGBA,gl.UNSIGNED_BYTE,bytes);
        samples.push(Array.from(bytes).join(','));
      }
      return {prepared,sameField:field===__opticalWitness.loss.field,sameContext:gl===__opticalWitness.loss.gl,
        distinctPixels:new Set(samples).size,oldProgram:!!prior,newProgram:!!program&&program!==prior&&gl.isProgram(program),
        glassValid:!!glass&&gl.isProgram(glass),losses:data.losses,restores:data.restores,error:gl.getError(),
        sourceTextureArrayUploads:[data.oldArrayUploads,data.arrayUploads],
        fieldError:canvas.dataset.frameError||null,layerError:canvas.dataset.layerError||null};
    }''',{'id':identity,'family':family})
    assert result['prepared'] and result['sameField'] and result['sameContext'],result
    assert result['oldProgram'] and result['newProgram'] and result['glassValid'],result
    assert result['distinctPixels']>1 and result['losses']==result['restores']==1,result
    assert not (result['error'] or result['fieldError'] or result['layerError']),result
    return result

def active_state(page, identity):
    return page.evaluate('''id => {
      const f=SSSInterlocutorFields.get(id),p=f.projectAddressCenter('w');
      return {address:SSSDisplayRuntime.state.activeAddress,ids:SSSDisplayRuntime.state.activeIds,
        hash:location.hash,length:history.length,history:JSON.stringify(history.state),container:f.container,
        orientation:SSSWorldView.orientation,center:[p.x,p.y,p.z],
        reading:f.element.querySelector('[data-offset]')?.dataset.offset||null};
    }''',identity)

def compare_active(prior, after):
    assert {k:v for k,v in after.items() if k!='center'}=={k:v for k,v in prior.items() if k!='center'},(prior,after)
    camera_delta=max(abs(a-b) for a,b in zip(prior['center'],after['center']))
    assert camera_delta<=.25,(prior,after,camera_delta)
    return camera_delta

def wait_stable_view(page, identity):
    page.wait_for_function('''id => {
      const f=SSSInterlocutorFields.get(id),p=f.projectAddressCenter('w'),w=__opticalWitness;
      const prior=w.camera,settled=prior?.id===id&&Math.hypot(prior.x-p.x,prior.y-p.y)<.02;
      w.camera={id,x:p.x,y:p.y,frames:settled?prior.frames+1:0};
      return w.camera.frames>=6;
    }''',arg=identity,timeout=30000)

try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE'),headless=True,
            args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
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
                # The old cached context refuses entry until actual restoration.
                navigate(page,'organism:datenschutz')
                lose(page,'organism:philosophy')
                prior=page.evaluate('''() => ({address:SSSDisplayRuntime.state.activeAddress,length:history.length,hash:location.hash})''')
                page.evaluate('''() => SSSDisplayRuntime.navigateGlobal('')''')
                page.wait_for_function('''() => document.getElementById('site-state').dataset.feedWound && document.getElementById('tetra-fold').dataset.fold==='open' ''',timeout=30000)
                after=page.evaluate('''() => ({address:SSSDisplayRuntime.state.activeAddress,length:history.length,hash:location.hash,
                  currentVisible:!document.querySelector('[data-interlocutor="organism:datenschutz"]').hidden})''')
                assert after=={**prior,'currentVisible':True},(prior,after)
                restore(page)
                assert page.evaluate("document.querySelector('[data-interlocutor=\"organism:philosophy\"]').hidden")
                assert live(page,'organism:philosophy')['Framebuffer']==0
                navigate(page,'organism:philosophy')
                recovered=witnessed_frame(page,'organism:philosophy','glass')
                assert not errors,errors
                page.screenshot(path=str(args.out/f'optical-return-{width}.png'))
                results.append({'viewport':[width,height],'backend':'Chromium WebGL2 / SwiftShader',
                    'observation':phase,'active':active,'hidden':hidden,'returned':returned,
                    'lost_cached_context_refused_with_prior_preserved':True,'cached_recovered':recovered})
            finally:
                context.close()
        for site,family in [('datenschutz','authored-text'),('impressum','authored-text'),('papers','papers'),
                ('schattenseiten','sheet'),('crawlerbait','traffic-ink')]:
            identity='organism:'+site
            context=browser.new_context(viewport={'width':800,'height':520},device_scale_factor=1,reduced_motion='reduce')
            context.add_init_script('('+INIT+')()')
            page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            try:
                page.goto(base,wait_until='domcontentloaded');scene(page,'organism:philosophy')
                navigate(page,identity)
                page.wait_for_function('''({id,family})=>{
                  const field=SSSInterlocutorFields.get(id);
                  return __opticalWitness.contexts.get(field.canvas).used.has(family);
                }''',arg={'id':identity,'family':family},timeout=90000)
                if family=='authored-text':
                    page.evaluate('''id => {
                      const input=SSSInterlocutorFields.get(id).element.querySelector('input[type=range]');
                      input.value=Math.min(120,Number(input.max));
                      input.dispatchEvent(new Event('input'));
                    }''',identity)
                wait_stable_view(page,identity)
                prior=active_state(page,identity)
                lose(page,identity)
                lost_delta=compare_active(prior,active_state(page,identity))
                if site=='papers':
                    # A captured pointer can finish outside the visible body
                    # while the site has no compiled renderer.
                    page.evaluate('''() => {
                      const canvas=document.querySelector('.papers-sierpinski-stage');
                      for(const type of ['pointerdown','pointerup'])canvas.dispatchEvent(new PointerEvent(type,
                        {pointerId:25,pointerType:'mouse',button:0,clientX:-50,clientY:-50,bubbles:true}));
                    }''')
                    compare_active(prior,active_state(page,identity))
                restore(page);scene(page,identity)
                frame=witnessed_frame(page,identity,family)
                after=active_state(page,identity)
                recovered_delta=compare_active(prior,after)
                assert not errors,errors
                results.append({'viewport':[800,520],'backend':'Chromium WebGL2 / SwiftShader',
                    'entered':site,'ownerProgram':family,'encounter_camera_history_preserved':True,
                    'cameraSampleDeltaDuringLoss':lost_delta,'cameraSampleDeltaAfterRestoration':recovered_delta,
                    'readingOffset':after['reading'],'active_recovered':frame,
                    'sourceScope':bounded_crawlerbait_feed()[1] if site=='crawlerbait' else 'artifact'})
                print('Restored entered '+site+' with a fresh '+family+' program',flush=True)
            finally:
                context.close()
        browser.close()
finally:
    server.shutdown();server.server_close()
    (args.out/'optical-return.json').write_text(json.dumps({'scope':__doc__,'cases':results},indent=2)+'\n')
print(json.dumps({'status':'PASS','cases':results}))
