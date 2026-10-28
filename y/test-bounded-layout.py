#!/usr/bin/env python3
"""Browser integration witness for the actual built bounded presentation fields.

This test uses an isolated Chromium test process against the supplied static
artifact, not the user's browser/session. Source pictures and actual GL run as
published; screen/device performance is not inferred from this witness.
"""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
import argparse,json,threading

p=argparse.ArgumentParser();p.add_argument('--artifact',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args();a.out.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(a.artifact.resolve())));threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/index.html';results=[]
expected={'header':(0,0,1,.25),'description':(0,.25,.25,.75),'timeline':(.25,.875,.5,.125),'compass':(.75,.5,.25,.5),'viewport':(.25,.25,.625,.625)}
def bounds(page,selector):return page.locator(selector).evaluate('(e)=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}')
def close(actual,field,w,h):
 x,y,fw,fh=expected[field]
 for k,v in dict(x=x*w,y=y*h,width=fw*w,height=fh*h).items():assert abs(actual[k]-v)<1.1,(field,k,actual,v)
def wait_scene(page,identity):
 page.wait_for_selector(f'[data-interlocutor="{identity}"]:not([hidden]) [data-ui-bounded="true"]',timeout=180000)
 page.wait_for_function("document.getElementById('tetra-fold').dataset.fold==='open'",timeout=180000)
 page.evaluate('document.fonts.ready')
try:
 from playwright.sync_api import sync_playwright
 with sync_playwright()as pw:
  browser=pw.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  fallback=pw.chromium.launch(headless=True,args=['--disable-webgl'])
  for w,h in [(1280,800),(390,844)]:
   for identity,address in [('organism:philosophy','overview'),('organism:schattenseiten','x'),('organism:crawlerbait','w')]:
    page=(fallback if identity=='organism:crawlerbait' else browser).new_page(viewport={'width':w,'height':h},device_scale_factor=1);errors=[];console=[];page.on('console',lambda m:console.append(m.text) if m.type in ['warning','error'] else None);page.on('pageerror',lambda e:errors.append(str(e)));stem=identity.split(':')[1]+f'-{w}'
    try:
     page.goto(base+'#main:'+address,wait_until='domcontentloaded');wait_scene(page,identity)
     host=f'[data-interlocutor="{identity}"]:not([hidden])';description=host+' [data-ui-field="description"]'
     close(bounds(page,description),'description',w,h);close(bounds(page,'#mini'),'compass',w,h)
     # The exact neutral camera rectangle is lent to the actual field. Its
     # GL source projection and pointer equivalence have separate native tests.
     world=page.evaluate('(id)=>SSSInterlocutorFields.get(id).presentationRect()',identity);close(world,'viewport',w,h)
     canvas=page.locator(host+' .interlocutor-background');assert not canvas.get_attribute('data-layer-error')
     records={'identity':identity,'viewport':[w,h],'render_dpr':1,'feed_transport':'normal Worker','renderer':'canvas2d' if identity=='organism:crawlerbait' else 'software WebGL','description':bounds(page,description),'compass':bounds(page,'#mini'),'viewport':world}
     if identity!='organism:philosophy':
      timeline=host+' [data-ui-field="timeline"]';before=bounds(page,timeline);close(before,'timeline',w,h);records['timeline']=before
      if identity=='organism:schattenseiten':
       page.locator(host+' .ss-rows button').first.click();page.locator(host+' .ss-work-choices button').first.click();page.locator(host+' .ss-panel img').wait_for(state='visible')
       assert page.locator(host+' .ss-hud-rail .ss-panel').count()==1
      else:
       page.locator(host+' .crawlerbait-modes button').nth(1).click()
      assert bounds(page,timeline)==before,'selection/mode moved the declared footer';close(bounds(page,description),'description',w,h)
     page.wait_for_function("(()=>{const m=document.getElementById('navTwin').getBoundingClientRect(),c=document.getElementById('mini-core');return Math.abs(m.width-m.height)<1.1&&c.scrollHeight<=c.clientHeight+1})()",timeout=10000)
     map_box=bounds(page,'#navTwin');assert abs(map_box['width']-map_box['height'])<1.1,('distorted map',map_box)
     records['square_map']=map_box
     mini=bounds(page,'#mini')
     if page.locator('#mini-pocket').get_attribute('aria-hidden')=='true':page.locator('#mini-trigger').click()
     assert bounds(page,'#mini')==mini
     # Persistent help is a real pointer target; opening and closing it cannot
     # enlarge the HUD or leave the map permanently shrunken.
     page.locator('#mini-help-toggle').click();assert bounds(page,'#mini')==mini
     page.wait_for_function("document.getElementById('mini-guide').hidden===false")
     page.locator('#mini-help-toggle').click()
     page.wait_for_function("(size)=>Math.abs(document.getElementById('navTwin').getBoundingClientRect().width-size)<1.1",arg=map_box['width'])
     assert bounds(page,'#mini')==mini
     assert not canvas.get_attribute('data-layer-error');assert not errors,errors
     page.screenshot(path=str(a.out/(stem+'.png')));records['errors']=errors;results.append(records)
    except Exception:
     (a.out/(stem+'-error.json')).write_text(json.dumps({'url':page.url,'errors':errors,'console':console[-12:],'visible':page.locator('body').inner_text()[:12000]},indent=2)+'\n')
     page.screenshot(path=str(a.out/(stem+'-FAILED.png')));raise
    finally:page.close()
  browser.close();fallback.close()
finally:
 server.shutdown();server.server_close();(a.out/'layout.json').write_text(json.dumps({'cases':results,'scope':__doc__},indent=2)+'\n')
print(json.dumps({'status':'PASS','actual_browser_cases':len(results),'viewports':[[1280,800],[390,844]],'immutable_footer':True,'bound_compass_including_help':True}))
