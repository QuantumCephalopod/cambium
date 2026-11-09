#!/usr/bin/env python3
"""Witness Display's long-axis layout on an isolated Chromium Canvas2D carrier.

DOM geometry, pointer controls and recursive addresses are checked against the
canonical state. This is not a physical-device or WebGL performance witness.
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

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(args.artifact.resolve())))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}/index.html'
sites = [('philosophy','overview'),('crawlerbait','y'),('schattenseiten','x'),('papers','w'),('datenschutz','z'),('impressum','xz')]
cases = []

def expect_box(actual, bounds, width, height, portrait, label):
    x,y,w,h=(bounds[k] for k in ('x','y','w','h'))
    if portrait:
        x,y,w,h=1-y-h,x,h,w
    expected={'left':x*width,'top':y*height,'width':w*width,'height':h*height}
    for key,value in expected.items():
        assert abs(actual[key]-value)<1.2,(label,key,actual,expected)

def examine(page, identity, width, height):
    page.wait_for_function('id => window.SSSDisplayRuntime?.state.activeIds.includes(id) && document.getElementById("tetra-fold").dataset.fold === "open"',arg=identity,timeout=180000)
    page.evaluate('document.fonts.ready')
    return page.evaluate('''id => {
      const ui=SSSDisplayRuntime.ui.get(id),state=SSSDisplayMembraneGrid.snapshot();
      const host=document.querySelector(`[data-interlocutor="${id}"]`);
      const mode=SSSUIGrid.orientation(innerWidth,innerHeight);
      const box=r=>({left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height});
      const fields=[...host.querySelectorAll('[data-ui-field][data-ui-bounded="true"]')].map(el=>({
        name:el.dataset.uiField,actual:box(el.getBoundingClientRect()),
        logical:SSSUIGrid.carrierField(ui.state,el.dataset.uiField,mode).bounds,
        cells:SSSUIGrid.carrierField(ui.state,el.dataset.uiField,mode).cells,
        applied:ui.field(el.dataset.uiField).cells
      }));
      const top=SSSDisplayGlass.collect().find(x=>x.ids.includes('display-header'));
      const controls=Object.fromEntries(['mini-pocket','mini-trigger','mini-help-toggle','legal-links'].map(id=>{
        const el=document.getElementById(id);return [id,{actual:box(el.getBoundingClientRect()),expected:state[el.getAttribute('data-display-ui-field')]}];
      }));
      return {mode:document.documentElement.dataset.displayOrientation,stateMode:state.orientation,
        address:SSSDisplayRuntime.state.activeAddress,fields,compass:state.compass,top:state.top,
        ascent:state.ascent,ascentSlot:box(document.getElementById('display-ascent-slot').getBoundingClientRect()),
        header:box(document.getElementById('display-header').getBoundingClientRect()),
        headerTransform:getComputedStyle(document.getElementById('display-header')).transform,
        topGlass:top&&{role:top.role,rect:top.rect},controls,
        lens:SSSDisplayLens.snapshot()?.home,fit:state.fit,
        safe:SSSDisplaySafeArea.snapshot().insets};
    }''',identity)

try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-webgl'])
        for width,height in [(1280,800),(390,844)]:
            portrait=height>width
            for site,address in sites:
                page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1,reduced_motion='reduce')
                errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
                stem=f'{site}-{width}x{height}'
                try:
                    page.goto(base+'#main:'+address,wait_until='domcontentloaded')
                    identity='organism:'+site
                    result=examine(page,identity,width,height)
                    assert result['mode']==result['stateMode']==('portrait' if portrait else 'landscape'),result
                    assert result['fields'],(site,'no actual bound fields')
                    for field in result['fields']:
                        expect_box(field['actual'],field['logical'],width,height,portrait,(site,field['name']))
                        assert field['cells']==field['applied'],(site,field)
                    compass=result['compass']
                    ascent=result['ascent']
                    if portrait:assert abs(ascent['right']-compass['left'])<1 and abs(ascent['bottom']-compass['bottom'])<1,(site,compass,ascent)
                    else:assert abs(ascent['top']-compass['bottom'])<1 and abs(ascent['right']-compass['right'])<1,(site,compass,ascent)
                    assert result['headerTransform']=='none',(site,result['headerTransform'])
                    for key in ('left','top','width','height'):
                        assert abs(result['ascentSlot'][key]-result['ascent'][key])<1,(site,result['ascentSlot'],result['ascent'])
                    assert result['topGlass'] and result['topGlass']['role']==('right' if portrait else 'top'),(site,result['topGlass'])
                    for key in ('left','top','width','height'):
                        assert abs(result['topGlass']['rect'][key]-result['top'][key])<1,(site,result['topGlass'],result['top'])
                    if portrait:
                        assert abs(result['top']['right']-width)<1 and result['safe']['right']>0,(site,result)
                    else:
                        assert abs(result['top']['top'])<1 and result['safe']['top']>0,(site,result)
                    for name,control in result['controls'].items():
                        a,b=control['actual'],control['expected']
                        assert a['left']>=b['left']-1 and a['top']>=b['top']-1 and a['right']<=b['right']+1 and a['bottom']<=b['bottom']+1,(site,name,control)
                    page.locator('#mini-trigger').click();page.locator('#mini-trigger').click()
                    page.locator('#mini-help-toggle').click();assert page.locator('#mini-guide').is_visible()
                    page.locator('#mini-help-toggle').click()
                    # Retain actual pointer access when the rotated control
                    # fields are narrow and their contents wrap or scroll.
                    for link in page.locator('#legal-links a').all():
                        link.scroll_into_view_if_needed();link.click(trial=True,timeout=10000)
                    page.locator('.inverse-control span').click(trial=True,timeout=10000)
                    if site in ('crawlerbait','schattenseiten'):
                        text=page.locator('[data-ui-field="header"] h1')
                        assert text.is_visible() and text.bounding_box()['width']>=16,(site,'header title lost reading room')
                    assert not errors,(site,errors)
                    if portrait or site=='philosophy':page.screenshot(path=str(args.out/(stem+'.png')))
                    cases.append({'site':site,'viewport':[width,height],'mode':result['mode'],'fields':len(result['fields']),'compass':compass,'fit':result['fit']})
                    print('PASS',stem,flush=True)
                except Exception:
                    page.screenshot(path=str(args.out/(stem+'-FAILED.png')))
                    raise
                finally:
                    page.close()
        # The same encounter and field addresses survive live format changes,
        # including the deterministic square tie and both sides of the boundary.
        page=browser.new_page(viewport={'width':800,'height':600},reduced_motion='reduce')
        page.goto(base+'#main:overview',wait_until='domcontentloaded')
        before=examine(page,'organism:philosophy',800,600)
        original_state=page.evaluate('JSON.stringify(SSSDisplayRuntime.ui.get("organism:philosophy").state)')
        for width,height in [(600,800),(600,600),(599,600),(600,599),(800,600)]:
            page.set_viewport_size({'width':width,'height':height})
            page.wait_for_function('([w,h]) => SSSDisplayMembraneGrid.snapshot().viewport.width===w && SSSDisplayMembraneGrid.snapshot().viewport.height===h',arg=[width,height])
            after=examine(page,'organism:philosophy',width,height)
            assert after['address']==before['address'] and after['mode']==('portrait' if height>width else 'landscape'),(before,after)
            assert page.evaluate('JSON.stringify(SSSDisplayRuntime.ui.get("organism:philosophy").state)')==original_state
            assert [(f['name'],f['cells']) for f in after['fields']]==[(f['name'],f['cells']) for f in before['fields']],(before,after)
            for field in after['fields']:expect_box(field['actual'],field['logical'],width,height,height>width,('resize',field['name']))
        page.close()
        # An owner that actually declares upright spans must also survive the
        # live turn without a reload, identity change, or mutation of its grid.
        page=browser.new_page(viewport={'width':800,'height':600},reduced_motion='reduce')
        page.goto(base+'#main:y',wait_until='domcontentloaded')
        before=examine(page,'organism:crawlerbait',800,600)
        original_state=page.evaluate('JSON.stringify(SSSDisplayRuntime.ui.get("organism:crawlerbait").state)')
        for width,height in [(390,844),(600,600),(844,390)]:
            page.set_viewport_size({'width':width,'height':height})
            page.wait_for_function('([w,h]) => SSSDisplayMembraneGrid.snapshot().viewport.width===w && SSSDisplayMembraneGrid.snapshot().viewport.height===h',arg=[width,height])
            after=examine(page,'organism:crawlerbait',width,height)
            assert after['address']==before['address'] and after['mode']==('portrait' if height>width else 'landscape')
            assert page.evaluate('JSON.stringify(SSSDisplayRuntime.ui.get("organism:crawlerbait").state)')==original_state
            assert {f['name'] for f in after['fields']}=={f['name'] for f in before['fields']}
            for field in after['fields']:expect_box(field['actual'],field['logical'],width,height,height>width,('owner resize',field['name']))
            old=next(f for f in before['fields'] if f['name']=='header')
            new=next(f for f in after['fields'] if f['name']=='header')
            assert (new['cells']!=old['cells'])==(height>width),('owner variant selection',old,new)
            for language in ('de','en'):page.locator(f'[data-lang="{language}"]').click(trial=True)
        page.close();browser.close()
finally:
    server.shutdown();server.server_close()
    (args.out/'long-axis.json').write_text(json.dumps({'cases':cases,'scope':__doc__},indent=2)+'\n')
print(json.dumps({'status':'PASS','cases':len(cases),'live_resize_and_square_tie':True,'owner_variant_resize':True}))
