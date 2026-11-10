#!/usr/bin/env python3
"""Actual browser witness for recursively addressed Display and site fields.

The selected Canvas2D field path witnesses DOM bounds and interactions. It does
not establish WebGL pixel parity or a physical device's frame rate.
"""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
import argparse,json,os,threading

p=argparse.ArgumentParser()
p.add_argument('--artifact',type=Path,required=True)
p.add_argument('--out',type=Path,required=True)
args=p.parse_args();args.out.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(args.artifact.resolve())))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/index.html'
sites=[('philosophy','overview'),('crawlerbait','y'),('schattenseiten','x'),('papers','w'),('datenschutz','z'),('impressum','xz')]
cases=[]
try:
 from playwright.sync_api import sync_playwright
 with sync_playwright() as pw:
  kw={'executable_path':os.environ['CHROMIUM_EXECUTABLE']} if os.environ.get('CHROMIUM_EXECUTABLE') else {}
  browser=pw.chromium.launch(headless=True,args=['--disable-webgl'],**kw)
  for width,height in [(1280,800),(667,375),(390,844)]:
   for site,address in sites:
    page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1,reduced_motion='reduce')
    errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    try:
     page.goto(base+'#main:'+address,wait_until='domcontentloaded')
     identity='organism:'+site
     page.wait_for_function('id=>window.SSSDisplayRuntime?.state.activeIds.includes(id)&&document.getElementById("tetra-fold").dataset.fold==="open"',arg=identity,timeout=180000)
     page.evaluate('document.fonts.ready')
     measured=page.evaluate('''id=>{
      const state=SSSDisplayMembraneGrid.snapshot(),ui=SSSDisplayRuntime.ui.get(id);
      const toBox=r=>({left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height});
      const fields=[...document.querySelectorAll('[data-interlocutor]:not([hidden]) [data-ui-field]')].map(el=>({
       name:el.dataset.uiField,bounded:el.dataset.uiBounded,actual:toBox(el.getBoundingClientRect()),expected:ui.rect(el.dataset.uiField,true)
      }));
      const controls=['mini-pocket','mini-trigger','mini-help-toggle','legal-links'].map(id=>{
       const el=document.getElementById(id);return {id,field:el.getAttribute('data-display-ui-field'),actual:toBox(el.getBoundingClientRect()),expected:state[el.getAttribute('data-display-ui-field')]};
      });
      const glass=SSSDisplayGlass.collect().map(s=>({id:s.id,ids:s.ids,rect:s.rect}));
      const mapCanvas=document.getElementById('navTwin'),map=toBox(mapCanvas.getBoundingClientRect()),mapDeclared=SSSDisplayMembraneGrid.nested('map'),mapBacking=[mapCanvas.width,mapCanvas.height];
      const instruments=Object.fromEntries(['navTwin','axis-x','axis-y','mini-help'].map(id=>[id,toBox(document.getElementById(id).getBoundingClientRect())]));
      const timeline=document.querySelector('[data-interlocutor]:not([hidden]) [data-ui-field="timeline"]');
      const siteTargets=timeline?[...timeline.querySelectorAll('button,input,a')].map(el=>{
       const r=el.getBoundingClientRect(),p=timeline.getBoundingClientRect();
       return {name:el.getAttribute('aria-label')||el.textContent.trim(),left:Math.max(r.left,p.left),top:Math.max(r.top,p.top),right:Math.min(r.right,p.right),bottom:Math.min(r.bottom,p.bottom)};
      }).filter(r=>r.right>r.left&&r.bottom>r.top):[];
      const navTargets=[...document.querySelectorAll('#mini-help-toggle,#mini-trigger,#legal-links a')].map(el=>{
       const r=el.getBoundingClientRect(),clip=el.closest('#legal-links')?.getBoundingClientRect()||{left:0,top:0,right:innerWidth,bottom:innerHeight};
       return {name:el.id||el.textContent.trim(),left:Math.max(r.left,clip.left),top:Math.max(r.top,clip.top),right:Math.min(r.right,clip.right),bottom:Math.min(r.bottom,clip.bottom)};
      }).filter(r=>r.right>r.left&&r.bottom>r.top);
      const returnSlot=toBox(document.getElementById('display-ascent-slot').getBoundingClientRect()),returnButton=toBox(document.getElementById('display-ascent').getBoundingClientRect());
      // A visually clipped source article still exposes its semantic text to
      // assistive technology; its off-screen descendants are not screen hit
      // targets. Intersect every actual overflow clip before testing contact.
      const visibleRect=el=>{
       const r=el.getBoundingClientRect(),b={left:Math.max(0,r.left),top:Math.max(0,r.top),right:Math.min(innerWidth,r.right),bottom:Math.min(innerHeight,r.bottom)};
       for(let p=el.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),q=p.getBoundingClientRect();
        if(/^(hidden|clip|auto|scroll)$/.test(s.overflowX)){b.left=Math.max(b.left,q.left);b.right=Math.min(b.right,q.right)}
        if(/^(hidden|clip|auto|scroll)$/.test(s.overflowY)){b.top=Math.max(b.top,q.top);b.bottom=Math.min(b.bottom,q.bottom)}
       }return b;
      };
      const otherTargets=[...document.querySelectorAll('[data-interlocutor]:not([hidden]) button,[data-interlocutor]:not([hidden]) input,[data-interlocutor]:not([hidden]) select,[data-interlocutor]:not([hidden]) a')]
       .filter(el=>el.getClientRects().length).map(el=>{
        const box={name:el.getAttribute('aria-label')||el.textContent.trim(),...visibleRect(el)};
        const at=document.elementFromPoint((box.left+box.right)/2,(box.top+box.bottom)/2);box.reachable=Boolean(at&&(at===el||el.contains(at)));return box;
       }).filter(r=>r.right>r.left&&r.bottom>r.top);
      const topAddress=SSSUIGrid.orientBounds(SSSUIGrid.fieldInfo(state.outer,'top').bounds,state.orientation);
      const oldBack=SSSUIGrid.orientBounds(SSSUIGrid.fieldInfo(state.outer,'ascent').bounds,state.orientation);
      const nested=Object.fromEntries(['pocket','help','trigger','legal'].map(name=>[name,SSSUIGrid.orientBounds(SSSUIGrid.carrierField(state.inner,name,state.orientation).bounds,state.orientation)]));
      return {state:{top:state.top,compass:state.compass,pocket:state.pocket,ascent:state.ascent,outer:state.outer,inner:state.inner},topAddress,oldBack,nested,fields,controls,glass,map,mapDeclared,mapBacking,instruments,siteTargets,navTargets,returnSlot,returnButton,otherTargets};
     }''',identity)
     assert measured['fields'] and all(f['bounded']=='true' for f in measured['fields']),(site,measured['fields'])
     for f in measured['fields']:
      for key in ['left','top','width','height']:assert abs(f['actual'][key]-f['expected'][key])<1.1,(site,f,key)
     for control in measured['controls']:
      q,r=control['actual'],control['expected']
      assert r and q['left']>=r['left']-1 and q['top']>=r['top']-1 and q['right']<=r['right']+1 and q['bottom']<=r['bottom']+1,(site,control)
     bottom=[c for c in measured['controls'] if c['field'] in ('help','trigger','legal')]
     for i,left in enumerate(bottom):
      for right in bottom[i+1:]:
       a,b=left['actual'],right['actual']
       assert min(a['right'],b['right'])-max(a['left'],b['left'])<=1 or min(a['bottom'],b['bottom'])-max(a['top'],b['top'])<=1,(site,left,right,'navigator controls overlap')
     trigger=next(c['actual'] for c in measured['controls'] if c['field']=='trigger')
     for name,control in measured['instruments'].items():
      assert min(trigger['right'],control['right'])-max(trigger['left'],control['left'])<=1 or min(trigger['bottom'],control['bottom'])-max(trigger['top'],control['top'])<=1,(site,name,trigger,control,'trigger covers compass instrument')
     for a in measured['siteTargets']:
      for b in measured['navTargets']:
       assert min(a['right'],b['right'])-max(a['left'],b['left'])<=1 or min(a['bottom'],b['bottom'])-max(a['top'],b['top'])<=1,(site,a,b,'navigator covers a site timeline control')
     a=measured['returnButton'];slot=measured['returnSlot'];field=measured['state']['ascent']
     assert all(abs(slot[k]-field[k])<1 for k in ['left','top','width','height']),(site,slot,field)
     assert a['left']>=slot['left']-1 and a['right']<=slot['right']+1 and a['top']>=slot['top']-1 and a['bottom']<=slot['bottom']+1,(site,a,slot)
     for b in measured['otherTargets']:
      overlaps=min(a['right'],b['right'])-max(a['left'],b['left'])>1 and min(a['bottom'],b['bottom'])-max(a['top'],b['top'])>1
      if overlaps:assert b['reachable'],(site,a,b,'return obscures another control')
     for b in measured['navTargets']:
      assert min(a['right'],b['right'])-max(a['left'],b['left'])<=1 or min(a['bottom'],b['bottom'])-max(a['top'],b['top'])<=1,(site,a,b,'return covers navigator control')
     top=next(x for x in measured['glass'] if 'display-header' in x['ids'])
     edge='left' if height>width else 'bottom'
     assert abs(top['rect'][edge]-measured['state']['top'][edge])<.5,(site,top,measured['state']['top'])
     if height>width:assert abs(measured['state']['top']['left']-measured['topAddress']['x']*width)<.5
     else:assert abs(measured['state']['top']['bottom']-(measured['topAddress']['y']+measured['topAddress']['h'])*height)<.5
     compass=measured['state']['compass']
     pocket=next(c['expected'] for c in measured['controls'] if c['field']=='pocket')
     for key in ['left','top','width','height']:
      assert abs(measured['map'][key]-measured['mapDeclared'][key])<1.1,(site,'map left its declared cell',measured['map'],measured['mapDeclared'])
     assert abs(measured['mapBacking'][0]/measured['mapBacking'][1]-measured['map']['width']/measured['map']['height'])<.02,(site,'map projection is stretched',measured['map'],measured['mapBacking'])
     previous=measured['oldBack']
     for key,value in [('left',previous['x']*width),('top',previous['y']*height),('width',previous['w']*width),('height',previous['h']*height)]:
      assert abs(pocket[key]-value)<.5,(site,'compass did not take the original Back field',pocket,previous)
     for name,b in measured['nested'].items():
      if name=='pocket':
       q=measured['state']['ascent'];parent=compass
      else:
       q=next(c['expected'] for c in measured['controls'] if c['field']==name)
       parent=pocket if name in ('help','trigger') else compass
      for key,value in [('left',parent['left']+b['x']*parent['width']),('top',parent['top']+b['y']*parent['height']),('width',b['w']*parent['width']),('height',b['h']*parent['height'])]:
       assert abs(q[key]-value)<.5,(site,name,key,q,value)
     for name in ['pocket','trigger']:
      g=next(x for x in measured['glass'] if 'mini-'+name in x['ids'])
      q=next(c['expected'] for c in measured['controls'] if c['field']==name)
      assert all(abs(g['rect'][k]-q[k])<.5 for k in ['left','top','width','height']),(site,name,g,q)
     feedback=page.evaluate('''()=>{
      document.getElementById('site-state').textContent='ENCOUNTER UNAVAILABLE · RETRY THE ENCOUNTER';
      SSSDisplaySafeArea.refresh();
      const status=document.getElementById('display-membrane-status').getBoundingClientRect(),state=SSSDisplayMembraneGrid.snapshot(),declared=SSSDisplayMembraneGrid.rect('status');
      const result={status:{left:status.left,top:status.top,width:status.width,height:status.height},declared,top:state.top};
      document.getElementById('site-state').textContent='';SSSDisplaySafeArea.refresh();
      result.restored=SSSDisplayMembraneGrid.snapshot().outer.fields.top.cells;
      return result;
     }''')
     assert all(abs(feedback['status'][k]-feedback['declared'][k])<.5 for k in ['left','top','width','height']),(site,'feedback left its authored cell',feedback)
     assert all(abs(feedback['top'][k]-measured['state']['top'][k])<.5 for k in ['left','top','width','height']),(site,'feedback changed the header field',feedback)
     assert feedback['restored']==measured['state']['outer']['fields']['top']['cells'],(site,feedback)
     measured['feedback']=feedback
     page.locator('#mini-trigger').click();page.locator('#mini-trigger').click()
     page.locator('#mini-help-toggle').click()
     assert page.locator('#mini-guide').is_visible()
     assert abs(page.locator('#navTwin').bounding_box()['width']-measured['map']['width'])<1,(site,'help shrank the map')
     page.locator('#mini-help-toggle').click()
     page.locator('#navTwin').focus();page.keyboard.press('=');page.keyboard.press('0')
     if site=='schattenseiten':
      read_shadow="""()=>({filter:getComputedStyle(document.documentElement).filter,shadow:getComputedStyle(document.querySelector('[data-interlocutor="organism:schattenseiten"] [data-ui-field="header"] h1')).textShadow,canvas:SSSDisplayType.shadowColor()})"""
      dark=page.evaluate(read_shadow)
      page.locator('.inverse-control span').click();assert page.locator('#inverse-mode').is_checked()
      light=page.evaluate(read_shadow)
      assert dark['filter']=='none' and light['filter']=='invert(1)' and dark['shadow']==light['shadow'] and dark['canvas']==light['canvas'],(site,dark,light)
      page.locator('.inverse-control span').click();assert not page.locator('#inverse-mode').is_checked()
     if site=='papers':
      page.locator('.papers-physiology button').click(trial=True)
      ink=page.locator('.papers-sierpinski-hud span').first.bounding_box()
      if height>width:assert ink['x']+ink['width']<=measured['state']['top']['left']+1,(site,ink,measured['state']['top'])
      else:assert ink['y']>=measured['state']['top']['bottom']-1,(site,ink,measured['state']['top'])
     if site=='philosophy':
      text=page.locator('[data-interlocutor="organism:philosophy"] [data-ui-field="description"]').evaluate('e=>({client:e.clientWidth,scroll:e.scrollWidth})')
      assert text['scroll']<=text['client']+1,(site,text,'description requires horizontal scrolling')
     if site in ('datenschutz','impressum'):
      for link in page.locator('[data-ui-field="description"] a').all():link.click(trial=True)
     if site in ('papers','datenschutz') and width in (1280,390):page.screenshot(path=str(args.out/f'{site}-{width}.png'))
     page.locator('#display-ascent').focus();page.keyboard.press('Enter')
     if site=='philosophy':
      assert page.evaluate('SSSDisplayRuntime.state.activeAddress')=='',(site,'outer root moved')
     else:
      page.wait_for_function('SSSDisplayRuntime.state.activeAddress===""&&document.getElementById("tetra-fold").dataset.fold==="open"',timeout=180000)
     assert not errors,(site,errors)
     cases.append({'site':site,'viewport':[width,height],**measured,'errors':errors})
    finally:page.close()
  browser.close()
finally:
 server.shutdown();server.server_close()
 (args.out/'membrane.json').write_text(json.dumps({'scope':__doc__,'cases':cases},indent=2)+'\n')
print(json.dumps({'status':'PASS','cases':len(cases),'sites':[s for s,_ in sites]}))
