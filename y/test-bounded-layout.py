#!/usr/bin/env python3
"""Browser integration witness for the actual built bounded presentation fields.

This test uses an isolated Chromium test process against the supplied static
artifact, not the user's browser/session. Published source pictures and the
selected WebGL/Canvas2D renderer are used; device performance is not inferred.
"""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
import argparse,json,os,threading

p=argparse.ArgumentParser();p.add_argument('--artifact',type=Path,required=True);p.add_argument('--out',type=Path,required=True);p.add_argument('--canvas2d',action='store_true',help='Witness DOM layout using the supported Canvas2D field fallback');a=p.parse_args();a.out.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(a.artifact.resolve())));threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/index.html';results=[]
expected={'header':(0,0,1,.25),'description':(0,.25,.25,.75),'timeline':(.25,.875,.5,.125),'compass':(.75,.5,.25,.5),'viewport':(.25,.25,.625,.625)}
portrait_expected={
 ('organism:philosophy','viewport'):(0,.25,1,.5),
 **{(site,field):box for site in ('organism:crawlerbait','organism:schattenseiten') for field,box in {
   'header':(0,0,1,.125),'description':(0,.125,.5,.25),'timeline':(0,.375,.375,.375)
 }.items()}
}
def bounds(page,selector):return page.locator(selector).evaluate('(e)=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}')
def close(actual,field,w,h,variant='default',identity=None):
 x,y,fw,fh=expected[field]
 if h>w:
  x,y,fw,fh=portrait_expected.get((identity,field),(1-y-fh,x,fh,fw))
 for k,v in dict(x=x*w,y=y*h,width=fw*w,height=fh*h).items():assert abs(actual[k]-v)<1.1,(field,k,actual,v)
def wait_scene(page,identity):
 page.wait_for_selector(f'[data-interlocutor="{identity}"]:not([hidden]) [data-ui-bounded="true"]',timeout=180000)
 page.wait_for_function("document.getElementById('tetra-fold').dataset.fold==='open'",timeout=180000)
 page.evaluate('document.fonts.ready')
def header_content(page,host,identity,w,h):
 outer=host+' [data-ui-field="header"]';close(bounds(page,outer),'header',w,h,identity=identity)
 inner=outer+(' .crawlerbait-hud-top' if identity=='organism:crawlerbait' else ' .ss-hud-top')
 reading=page.locator(inner)
 metrics=reading.evaluate('''e=>{const r=e.getBoundingClientRect(),o=e.parentElement.getBoundingClientRect(),h=document.getElementById('display-header').getBoundingClientRect(),g=SSSDisplayGlass.collect().find(s=>s.ids.includes('display-header')),f=SSSDisplayMembraneGrid.snapshot(),safe=SSSDisplaySafeArea.snapshot().insets;return {top:r.top,bottom:r.bottom,right:r.right,height:r.height,outerBottom:o.bottom,safeTop:safe.top,safeRight:safe.right,clientWidth:e.clientWidth,scrollWidth:e.scrollWidth,clientHeight:e.clientHeight,scrollHeight:e.scrollHeight,titleHeight:e.querySelector('h1').getBoundingClientRect().height,headerBottom:h.bottom,headerLeft:h.left,glassBottom:g.rect.bottom,glassLeft:g.rect.left,inset:g.inset,fieldBottom:f.top.bottom,fieldLeft:f.top.left,topCells:f.outer.fields.top.cells}}''')
 assert metrics['top']>=metrics['safeTop']-.5,metrics
 assert metrics['bottom']<=metrics['outerBottom']+.5,metrics
 assert metrics['clientHeight']>=metrics['titleHeight']-.5,('no complete title line',metrics)
 assert metrics['scrollWidth']<=metrics['clientWidth']+1,('horizontal header overflow',metrics)
 if h>w:
  assert abs(metrics['glassLeft']-metrics['fieldLeft'])<.5,('liquid edge departed from its realized field',metrics)
  assert metrics['headerLeft']>=metrics['glassLeft']+metrics['inset']-.5,('reading tissue touches liquid rim',metrics)
  assert metrics['right']<=w-metrics['safeRight']+.5,('site reading tissue touches liquid rim',metrics)
 else:
  assert abs(metrics['glassBottom']-metrics['fieldBottom'])<.5,('liquid edge departed from its realized field',metrics)
  assert metrics['glassBottom']>=metrics['headerBottom']+metrics['inset']-.5,('reading tissue touches liquid rim',metrics)
  assert metrics['top']>=metrics['glassBottom']+metrics['inset']-.5,('site reading tissue touches liquid rim',metrics)
 reading.evaluate('(e)=>{e.scrollTop=e.scrollHeight}')
 end=reading.evaluate('e=>({top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom,last:e.lastElementChild.getBoundingClientRect().bottom,scrollTop:e.scrollTop})')
 assert end['top']>=metrics['safeTop']-.5 and end['last']<=end['bottom']+1,('last header content unreachable',end)
 reading.evaluate('(e)=>{e.scrollTop=0}')
 # A real unavailable-encounter message must leave a complete reading line on
 # short carriers, and clearing it must restore the same continuation surface.
 page.evaluate("()=>{document.getElementById('site-state').textContent='ENCOUNTER UNAVAILABLE · RETRY THE ENCOUNTER';SSSDisplaySafeArea.refresh()}")
 failure=reading.evaluate('e=>({height:e.clientHeight,top:e.getBoundingClientRect().top,right:e.getBoundingClientRect().right,safeTop:SSSDisplaySafeArea.snapshot().insets.top,safeRight:SSSDisplaySafeArea.snapshot().insets.right})')
 assert failure['height']>=metrics['titleHeight']-.5 and (failure['right']<=w-failure['safeRight']+.5 if h>w else failure['top']>=failure['safeTop']-.5),('failure feedback obscures header',failure,metrics)
 page.evaluate("()=>{document.getElementById('site-state').textContent='';SSSDisplaySafeArea.refresh()}")
 assert abs(reading.evaluate('e=>e.getBoundingClientRect().height')-metrics['height'])<.5,'feedback did not release occupied space'
 metrics['failure_reading_height']=failure['height']
 rail=page.locator(host+' [data-ui-field="description"]')
 controls=rail.evaluate('''e=>{const r=e.getBoundingClientRect(),items=[...e.querySelectorAll('button')].filter(b=>b.getClientRects().length).map(b=>{const q=b.getBoundingClientRect();return {text:b.textContent,left:q.left,right:q.right,top:q.top,bottom:q.bottom}});return {left:r.left,right:r.right,clientWidth:e.clientWidth,scrollWidth:e.scrollWidth,items}}''')
 assert controls['scrollWidth']<=controls['clientWidth']+1,('rail needs horizontal scroll',controls)
 for button in controls['items']:
  assert button['left']>=controls['left']-.5 and button['right']<=controls['right']+.5,('control outside rail',button,controls)
 for i,a in enumerate(controls['items']):
  for b in controls['items'][i+1:]:
   assert min(a['right'],b['right'])-max(a['left'],b['left'])<=.5 or min(a['bottom'],b['bottom'])-max(a['top'],b['top'])<=.5,('overlapping controls',a,b)
 return metrics
try:
 from playwright.sync_api import sync_playwright
 with sync_playwright()as pw:
  executable={'executable_path':os.environ['CHROMIUM_EXECUTABLE']} if os.environ.get('CHROMIUM_EXECUTABLE') else {}
  browser=pw.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],**executable)
  fallback=pw.chromium.launch(headless=True,args=['--disable-webgl'],**executable)
  viewports=[(1280,800),(390,844),(1275,596),(667,375),(320,568)]
  for w,h in viewports:
   for identity,address in [('organism:philosophy','overview'),('organism:schattenseiten','x'),('organism:crawlerbait','y')]:
    if identity=='organism:philosophy' and (w,h) not in viewports[:2]:continue
    use_fallback=a.canvas2d or identity=='organism:crawlerbait'
    page=(fallback if use_fallback else browser).new_page(viewport={'width':w,'height':h},device_scale_factor=1);errors=[];console=[];page.on('console',lambda m:console.append(m.text) if m.type in ['warning','error'] else None);page.on('pageerror',lambda e:errors.append(str(e)));stem=identity.split(':')[1]+f'-{w}'
    try:
     page.goto(base+'#main:'+address,wait_until='domcontentloaded');wait_scene(page,identity)
     host=f'[data-interlocutor="{identity}"]:not([hidden])';description=host+' [data-ui-field="description"]'
     compass_variant=page.evaluate('(id)=>SSSDisplayRuntime.ui.get(id).field("compass").variant',identity)
     assert compass_variant=='default',(identity,w,h,compass_variant)
     close(bounds(page,description),'description',w,h,identity=identity);close(bounds(page,'#mini'),'compass',w,h,compass_variant)
     # The exact neutral camera rectangle is lent to the actual field. Its
     # GL source projection and pointer equivalence have separate native tests.
     world=page.evaluate('(id)=>SSSInterlocutorFields.get(id).presentationRect()',identity);close(world,'viewport',w,h,identity=identity)
     canvas=page.locator(host+' .interlocutor-background');assert not canvas.get_attribute('data-layer-error')
     records={'identity':identity,'carrier':[w,h],'render_dpr':1,'feed_transport':'normal Worker','renderer':'canvas2d' if use_fallback else 'software WebGL','description':bounds(page,description),'compass':bounds(page,'#mini'),'viewport':world}
     if identity!='organism:philosophy':
      records['header_content']=header_content(page,host,identity,w,h)
      timeline=host+' [data-ui-field="timeline"]';before=bounds(page,timeline);close(before,'timeline',w,h,identity=identity);records['timeline']=before
      if identity=='organism:schattenseiten':
       page.locator(host+' .ss-rows button').first.click();page.locator(host+' .ss-work-choices button').first.click();page.locator(host+' .ss-panel img').wait_for(state='visible')
       assert page.locator(host+' .ss-hud-rail .ss-panel').count()==1
      else:
       page.locator(host+' .crawlerbait-modes button').nth(1).click()
      assert bounds(page,timeline)==before,'selection/mode moved the declared footer';close(bounds(page,description),'description',w,h,identity=identity)
     page.wait_for_function("(()=>{const m=document.getElementById('navTwin').getBoundingClientRect(),c=document.getElementById('mini-core');return Math.abs(m.width-m.height)<1.1&&c.scrollHeight<=c.clientHeight+1})()",timeout=10000)
     map_box=bounds(page,'#navTwin');assert abs(map_box['width']-map_box['height'])<1.1,('distorted map',map_box)
     compass_box=bounds(page,'#mini');pocket_box=bounds(page,'#mini-pocket')
     chrome=page.locator('#mini').evaluate('e=>Number(e.dataset.mapChrome)||0')
     map_room=page.evaluate('''()=>{const core=document.getElementById('mini-core'),s=getComputedStyle(core),instrument=document.getElementById('mini-instrument');return Math.max(0,core.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)-document.getElementById('axis-y').getBoundingClientRect().width-parseFloat(getComputedStyle(instrument).columnGap))}''')
     expected_usable=min(compass_box['width']/2,max(0,pocket_box['height']-chrome),map_room)
     assert map_box['width']>=expected_usable-1,('the map fits but is too small to use',map_box,compass_box,pocket_box,chrome)
     records['square_map']=map_box
     records['compass_variant']=compass_variant
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
print(json.dumps({'status':'PASS','actual_browser_cases':len(results),'viewports':viewports,'header_content_and_controls':True,'immutable_footer':True,'bound_compass_including_help':True}))
