#!/usr/bin/env python3
"""Check authored screen fields and one type origin on a real browser carrier."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import json
import threading
from playwright.sync_api import sync_playwright

p=argparse.ArgumentParser();p.add_argument('--artifact',type=Path,required=True);p.add_argument('--out',type=Path,required=True);p.add_argument('--webgl',action='store_true');args=p.parse_args();args.out.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(args.artifact.resolve())))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/index.html'
reports=[]
sites=[('philosophy','overview'),('crawlerbait','y'),('schattenseiten','x'),('papers','w'),('datenschutz','z'),('impressum','xz')]
try:
 with sync_playwright() as pw:
  flags=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] if args.webgl else ['--disable-webgl']
  browser=pw.chromium.launch(headless=True,args=['--no-sandbox']+flags)
  carriers=[(1280,800,'philosophy','overview'),(390,844,'philosophy','overview')] if args.webgl else [(w,h,site,address) for w,h in [(1280,800),(390,844)] for site,address in sites]+[(844,390,'philosophy','overview'),(1920,1080,'philosophy','overview')]
  for width,height,site,address in carriers:
   page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1,reduced_motion='reduce')
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)));name=f'{site}-{width}x{height}'
   try:
    page.goto(base+'#main:'+address,wait_until='domcontentloaded')
    page.wait_for_function('id => window.SSSDisplayRuntime?.state.activeIds.includes(id) && SSSDisplayMembraneGrid.snapshot().viewport.width===innerWidth && document.getElementById("tetra-fold").dataset.fold==="open"',arg='organism:'+site,timeout=180000)
    page.evaluate('document.fonts.ready');page.wait_for_timeout(700)
    snap=page.evaluate('''() => {
      const G=SSSDisplayMembraneGrid,box=e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height}}, names={state:'mini-state',map:'navTwin','axis-y':'axis-y','axis-x':'axis-x',hint:'mini-help',help:'mini-help-toggle',trigger:'mini-trigger',legal:'legal-links'};
      const fields=Object.fromEntries(Object.entries(names).map(([n,id])=>[n,{actual:box(document.getElementById(id)),expected:G.nested(n)}]));
      const outer=Object.fromEntries([['top','display-header'],['brand','root-home'],['brand-mark','display-brand-mark'],['brand-name','display-brand-name'],['language','display-language'],['language-invert','display-language-invert'],['language-dot','display-language-dot'],['language-de','display-language-de'],['language-slash','display-language-slash'],['language-en','display-language-en'],['status','display-membrane-status'],['ascent','display-ascent-slot']].map(([n,id])=>[n,{actual:box(document.getElementById(id)),expected:G.rect(n)}]));
      const text=document.querySelector('.philosophy-content>.root p'),map=document.getElementById('navTwin');
      const host=document.querySelector('[data-interlocutor]:not([hidden])');
      const flows=[...host.querySelectorAll('[data-ui-flow="long-axis"]')].map(e=>({field:e.dataset.uiField,flow:getComputedStyle(e.firstElementChild).writingMode}));
      return {fields,outer,flows,font:text?parseFloat(getComputedStyle(text).fontSize):null,unit:SSSDisplayType.typeUnitPx(),cssUnit:getComputedStyle(document.documentElement).getPropertyValue('--type-unit'),mapCanvas:[map.width,map.height],mode:G.snapshot().orientation,active:SSSDisplayRuntime.state.activeIds};
    }''')
    (args.out/(name+'.json')).write_text(json.dumps(snap,indent=2)+'\n')
    for group in ['fields','outer']:
     for key,entry in snap[group].items():
      for edge in ['left','top','width','height']:
       assert abs(entry['actual'][edge]-entry['expected'][edge])<1.1,(name,key,edge,entry)
    assert abs(snap['unit']-max(width,height)/64)<1e-8,(name,snap)
    if site=='philosophy': assert snap['font'] is not None and abs(snap['font']-snap['unit'])<.1,(name,snap['font'],snap['unit'])
    if height>width:
     for flow in snap['flows']: assert flow['flow']=='vertical-rl',(name,flow)
    a=snap['fields']['map']['actual'];cw,ch=snap['mapCanvas'];assert abs(cw/ch-a['width']/a['height'])<.02,(name,'map distorted',snap)
    page.screenshot(path=str(args.out/(name+'.png')))
    page.locator('#mini-help-toggle').click(timeout=10000);assert page.locator('#mini-guide').is_visible()
    page.locator('#mini-help-toggle').click(timeout=10000);assert page.locator('#mini-guide').is_hidden()
    page.locator('#display-language-de').click(timeout=10000);assert page.evaluate('document.documentElement.lang')=='de'
    page.locator('#display-language-en').click(timeout=10000);assert page.evaluate('document.documentElement.lang')=='en'
    for link in page.locator('#legal-links a').all():
     link.scroll_into_view_if_needed(timeout=10000);link.click(trial=True,timeout=10000)
    if site=='philosophy':
     complete=page.locator('.philosophy-content>.root').evaluate('''e=>{if(e.scrollHeight<=e.clientHeight)return true;e.scrollTop=e.scrollHeight;return e.scrollTop+e.clientHeight>=e.scrollHeight-1}''')
     assert complete,(name,'the complete introduction cannot be scrolled')
    assert not errors,(name,errors)
    reports.append({'site':site,'viewport':[width,height],'unit':snap['unit'],'mode':snap['mode']});print('PASS',name,flush=True)
   except Exception:
    page.screenshot(path=str(args.out/(name+'-FAILED.png')));print('FAIL',name,'page errors',errors,flush=True);raise
   finally:page.close()
  if not args.webgl:
   # Two real identities coalescing at one locus fill the same carrier in the
   # two orientations, with the logical addresses unchanged.
   page=browser.new_page(viewport={'width':1280,'height':800},device_scale_factor=1,reduced_motion='reduce')
   page.goto(base+'#main:overview',wait_until='domcontentloaded');page.wait_for_function('window.SSSDisplayRuntime',timeout=180000)
   page.evaluate('''()=>{SSSDisplayRuntime.remount('organism:crawlerbait','main','xyw');SSSDisplayRuntime.remount('organism:schattenseiten','main','xwy');SSSDisplayRuntime.navigateGlobal('xyw')}''')
   page.wait_for_function('SSSDisplayRuntime.state.activeIds.length===2 && document.getElementById("tetra-fold").dataset.fold==="open"',timeout=180000)
   before=page.evaluate('''()=>SSSDisplayRuntime.state.activeIds.map(id=>[id,document.querySelector(`[data-interlocutor="${id}"]`).dataset.compositionCells])''')
   for width,height in [(1280,800),(390,844)]:
    page.set_viewport_size({'width':width,'height':height});page.wait_for_function('([w,h])=>SSSDisplayMembraneGrid.snapshot().viewport.width===w && SSSDisplayMembraneGrid.snapshot().viewport.height===h',arg=[width,height]);page.wait_for_timeout(150)
    rows=page.evaluate('''()=>SSSDisplayRuntime.state.activeIds.map(id=>{const e=document.querySelector(`[data-interlocutor="${id}"]`),r=e.getBoundingClientRect();return {id,cells:e.dataset.compositionCells,x:r.x,y:r.y,w:r.width,h:r.height}})''')
    assert [[r['id'],r['cells']] for r in rows]==before,(width,height,rows,before)
    assert abs(sum(r['w']*r['h'] for r in rows)-width*height)<1,(width,height,rows)
    page.screenshot(path=str(args.out/(f'composition-{width}x{height}.png')))
   page.close()
  browser.close()
finally:server.shutdown()
(args.out/'report.json').write_text(json.dumps({'status':'PASS','carrier':'Chromium software WebGL, DPR 1' if args.webgl else 'Chromium Canvas2D, DPR 1','cases':reports},indent=2)+'\n')
