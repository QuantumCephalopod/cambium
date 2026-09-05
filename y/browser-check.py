#!/usr/bin/env python3
"""Optional local usability witness; Playwright/Chromium are test-only tools.
Tests the self-contained skin by browser injection, then a named test fixture.
An optional --http switch also checks localhost serving where permitted.
Does not publish the fixture or test a public host, DNS, or legal compliance.
"""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
import argparse, json, re, shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
GENES='wxzy'

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args): pass

def walk_index(node,path=''):
    yield path,node
    for g in GENES:
        if g in node:yield from walk_index(node[g],path+g)

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--out',type=Path,default=ROOT.parent/'review')
    ap.add_argument('--chromium')
    ap.add_argument('--http',action='store_true',help='test localhost HTTP instead of content injection')
    args=ap.parse_args();args.out.mkdir(parents=True,exist_ok=True)
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT))) if args.http else None
    if server:Thread(target=server.serve_forever,daemon=True).start()
    origin=f'http://127.0.0.1:{server.server_port}' if server else 'about:blank'
    def mount(pg):
        if args.http:pg.goto(origin+'/index.html')
        else:pg.set_content((ROOT/'index.html').read_text(),wait_until='load')
    report={'transport':'localhost HTTP' if args.http else 'self-contained HTML injected into Chromium; no HTTP or public host tested',
            'interactions':[],'layouts':[],'errors':[],'external_requests':[],'notes':[
                'one root split and four unsplit limbs; no production semantic descendants added',
                'canonical navigation is derived from the recursive semantic INDEX, not a flat node table',
                'synthetic named descendants are injected only into an isolated test document',
                'bounded functional checks, not a complete accessibility/security/legal audit']}
    def passed(s):report['interactions'].append({'test':s,'status':'pass'})
    try:
        with sync_playwright() as p:
            b=p.chromium.launch(headless=True,executable_path=args.chromium or shutil.which('chromium'),args=['--no-sandbox'])
            ctx=b.new_context(viewport={'width':1440,'height':1000},device_scale_factor=1)
            page=ctx.new_page()
            page.on('pageerror',lambda e:report['errors'].append(str(e)))
            page.on('request',lambda req:report['external_requests'].append(req.url) if not req.url.startswith((origin,'data:','file:')) else None)
            mount(page);page.wait_for_function('window.Cambium !== undefined')
            def go(h):
                page.evaluate('(h)=>location.hash=h',h);page.wait_for_timeout(55)
            def state():return page.evaluate('Cambium.getState()')
            def pose():return page.evaluate('Cambium.getView()')
            def changed(a,b):return any(abs(x-y)>1e-6 for x,y in zip(a,b))
            assert page.locator('nav').count()==1;passed('one public navigation landmark')
            assert page.locator('#mode-study,#mode-site,#study-controls,#directions').count()==0;passed('separate demo and lower duplicate menu removed')
            assert page.locator('.next-place').all_text_contents()==['expression','continuity','orientation','renewal'];passed('root choices use the four derived nouns')
            assert page.locator('.node-label').all_text_contents()==['expression','continuity','orientation','renewal'];passed('map and text expose the same names')
            assert page.evaluate('Object.keys(JSON.parse(document.querySelector("#cambium-data").textContent)).sort()')==['copy','index'];passed('no test fixture in production payload')
            assert page.evaluate('JSON.parse(document.querySelector("#cambium-data").textContent).index.w.name')=='expression';passed('production payload preserves recursive semantic indexing')
            page.locator('.next-place[data-path="w"]').click();page.wait_for_function('Cambium.getState().path==="w"')
            assert page.locator('.crumb').all_text_contents()==['expression'];assert page.locator('#next-places').is_hidden();passed('leaf has a named prefix and no invented next choices')
            page.locator('summary').click();assert page.locator('#source-files li').count()==4
            for href in page.locator('#source-files a').evaluate_all('(a)=>a.map(n=>n.getAttribute("href"))'):
                if args.http:assert ctx.request.get(origin+'/'+href).ok
                else:assert (ROOT/href).is_file()
            passed('actual source links target existing files'+(' and respond over localhost' if args.http else ' (filesystem check)'))
            page.locator('.map-node[data-path="x"] .node-label').click();page.wait_for_function('Cambium.getState().path==="x"');passed('clicking a map noun enters its actual place')
            page.go_back();page.wait_for_function('Cambium.getState().path==="w"');page.go_forward();page.wait_for_function('Cambium.getState().path==="x"');passed('browser history preserves the actual journey')
            page.locator('.home-crumb').click();page.wait_for_function('Cambium.getState().path===""')
            map_host=page.locator('#geometry');map_host.focus();s0=state();q0=pose()
            page.keyboard.press('ArrowUp');q1=pose();assert changed(q0,q1) and state()==s0;passed('keyboard vertical rotation changes pose only')
            page.keyboard.press('ArrowRight');q2=pose();assert changed(q1,q2) and state()==s0;passed('keyboard horizontal rotation changes pose only')
            page.keyboard.press('e');q3=pose();assert changed(q2,q3) and state()==s0;passed('keyboard roll is available independently')
            page.locator('#reset-view').click();assert not changed(q0,pose()) and state()==s0;passed('reset restores camera without moving the visitor')
            def drag(dx,dy):
                box=map_host.bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
                page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+dx,y+dy,steps=12);page.mouse.up();page.wait_for_timeout(65)
            drag(0,95);assert changed(q0,pose()) and state()==s0;passed('vertical mouse drag turns without accidental navigation')
            q4=pose();drag(95,0);assert changed(q4,pose()) and state()==s0;passed('horizontal mouse drag turns without accidental navigation')
            page.locator('#reset-view').click();page.locator('.map-node[data-path="z"]').focus();page.keyboard.press('Enter');page.wait_for_function('Cambium.getState().path==="z"');passed('map noun supports keyboard activation')
            go('#/site/x');assert state()['path']=='x';passed('previous real-site URL remains compatible')
            for h in ['#/w.x','#/study/w.x','#/w..x','#/<script>']:
                old=state();go(h);assert state()==old and page.locator('#error-message').is_visible()
            passed('invalid, unearned and retired demo links cannot mint destinations')
            page.locator('#error-message a').click();page.wait_for_function('Cambium.getState().path===""');passed('unknown link offers a working return to the whole')
            page.locator('.skip-link').focus();page.keyboard.press('Enter');assert page.evaluate('document.activeElement.id')=='main';passed('skip link reaches main')
            page.emulate_media(reduced_motion='reduce');assert page.evaluate('getComputedStyle(document.documentElement).scrollBehavior')=='auto';passed('reduced-motion mode is respected')
            for width in [320,375,390,768,1024,1440,1920]:
                page.set_viewport_size({'width':width,'height':1000})
                for h in ['#/','#/w','#/x','#/z','#/y']:
                    go(h);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,h)
                    assert page.locator('#page-title').is_visible()
                    labels=page.locator('.node-label').evaluate_all('(els)=>els.map(el=>{const b=el.getBBox();return {x:b.x,y:b.y,w:b.width,h:b.height}})')
                    assert all(v['x']>=0 and v['x']+v['w']<=560 and v['y']>=0 and v['y']+v['h']<=500 for v in labels),(width,h,labels)
                report['layouts'].append({'width':width,'real_routes':5,'overflow':False,'labels_in_view':True})
            passed('all real pages fit seven viewport widths')
            go('#/');page.set_viewport_size({'width':390,'height':900});map_host.focus()
            for key in ['ArrowUp']*36+['ArrowRight']*36+['e']*36:
                page.keyboard.press(key)
                labels=page.locator('.node-label').evaluate_all('(els)=>els.map(el=>{const b=el.getBBox();return [b.x,b.y,b.width,b.height]})')
                assert all(v[0]>=0 and v[0]+v[2]<=560 and v[1]>=0 and v[1]+v[3]<=500 for v in labels)
                assert state()['path']==''
                targets=page.locator('.node-target').evaluate_all('(els)=>els.map(el=>{const b=el.getBBox();return [b.x,b.y,b.width,b.height]})')
                for i,u in enumerate(targets):
                    for v in targets[i+1:]:
                        assert min(u[0]+u[2],v[0]+v[2])<=max(u[0],v[0]) or min(u[1]+u[3],v[1]+v[3])<=max(u[1],v[1])
            passed('108 mixed-axis turns preserve addresses and keep labels/touch targets distinct and in view')
            page.locator('#reset-view').click();page.mouse.move(1,1);page.locator('#reset-view').blur()
            page.screenshot(path=str(args.out/'mobile.png'),full_page=True)
            page.set_viewport_size({'width':1440,'height':1000});page.wait_for_timeout(70);go('#/')
            page.locator('#page-title').blur();page.mouse.move(1,1);page.screenshot(path=str(args.out/'landing.png'),full_page=True)
            go('#/z');page.locator('.crumb').blur();page.mouse.move(1,1);page.screenshot(path=str(args.out/'orientation.png'),full_page=True)
            map_host.focus();page.keyboard.press('ArrowUp');page.keyboard.press('ArrowUp');page.keyboard.press('ArrowRight');map_host.blur();page.mouse.move(1,1)
            page.screenshot(path=str(args.out/'tilted.png'),full_page=True)
            touch=b.new_context(viewport={'width':390,'height':900},has_touch=True,is_mobile=True)
            tp=touch.new_page();mount(tp);tp.locator('#geometry').scroll_into_view_if_needed()
            box=tp.locator('#geometry').bounding_box();sx=box['x']+box['width']/2;sy=box['y']+box['height']/2
            tq=tp.evaluate('Cambium.getView()');session=touch.new_cdp_session(tp)
            session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':sx,'y':sy}]})
            for d in [15,35,60,85]:session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':sx,'y':sy-d}]});tp.wait_for_timeout(20)
            session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});tp.wait_for_timeout(80)
            assert changed(tq,tp.evaluate('Cambium.getView()'));assert tp.evaluate('Cambium.getState().path')=='';passed('touchscreen vertical drag changes view without route activation')
            tp.locator('#reset-view').tap();tp.locator('.map-node[data-path="w"] .node-label').tap();tp.wait_for_function('Cambium.getState().path==="w"');passed('ordinary touchscreen noun tap still navigates after drag')
            touch.close()
            # A separate injected test document exercises recursively nested reciprocal named descendants.
            test=ctx.new_page();test.on('pageerror',lambda e:report['errors'].append(str(e)))
            source=(ROOT/'index.html').read_text();pattern=r'(<script id="cambium-data" type="application/json">)(.*?)(</script>)'
            payload=json.loads(re.search(pattern,source,re.S).group(2));payload['index']=json.loads((ROOT/'y/specimen.json').read_text())['index']
            for path,node in walk_index(payload['index']):
                if path:payload['copy']['organs'][path]={'title':node['name'],'lead':'synthetic named-prefix test','detail':'not a production page'}
            source=re.sub(pattern,lambda m:m.group(1)+json.dumps(payload).replace('<','\\u003c')+m.group(3),source,flags=re.S)
            test.set_content(source);test.evaluate('location.hash="#/w.x"');test.wait_for_function('Cambium.getState().path==="wx"')
            assert test.locator('.trail a').all_text_contents()==['expression','representation','continuity','representation'];passed('fixture: reciprocal trails use each complete-prefix noun')
            assert test.locator('.trail a').evaluate_all('(els)=>els.map(a=>a.getAttribute("href"))')==['#/w','#/w.x','#/x','#/x.w'];passed('fixture: each named step keeps its full symbolic-prefix link')
            locus=test.evaluate('Cambium.getState().locus');focus=test.locator('[data-focus-locus]').get_attribute('cx'),test.locator('[data-focus-locus]').get_attribute('cy')
            test.locator('.trail[data-witness="xw"] a').last.click();test.wait_for_function('Cambium.getState().path==="xw"')
            assert test.evaluate('Cambium.getState().locus')==locus and (test.locator('[data-focus-locus]').get_attribute('cx'),test.locator('[data-focus-locus]').get_attribute('cy'))==focus
            assert test.locator('.trail [aria-current="page"]').count()==1;passed('fixture: chamber switches at the same geometric focus, with one current crumb')
            test.evaluate('location.hash="#/w.x.z"');test.wait_for_function('Cambium.getState().path==="wxz"')
            assert test.locator('.trail a').all_text_contents()==['expression','representation','comparison','expression','legibility','comparison'];passed('fixture: deeper local nouns are not global gene-name substitutions')
            test.locator('.trail[data-witness="wzx"] a').nth(1).click();test.wait_for_function('Cambium.getState().path==="wz"');passed('fixture: earlier noun exits through the other enclosing context')
            test.evaluate('location.hash="#/w.w"');test.wait_for_function('Cambium.getState().path==="ww"')
            assert test.evaluate('Cambium.getState().locus')==test.evaluate('CambiumAddress.key("w")');passed('fixture: living self-refinement keeps the raw witness at the same geometric place')
            for width in [320,390,768,1440]:
                test.set_viewport_size({'width':width,'height':1000});test.evaluate('location.hash="#/w.x.z"');test.wait_for_timeout(60)
                assert test.evaluate('document.documentElement.scrollWidth<=innerWidth+1');assert test.locator('.trail a').count()==6
            passed('fixture: paired named trails wrap without hiding prefix steps')
            test.close()
            report['notes'].append('direct file-open and HTTP deployment not verified in the injection run')
            nojs=b.new_context(java_script_enabled=False,viewport={'width':375,'height':900});fallback=nojs.new_page();mount(fallback)
            assert 'we give questions' in fallback.locator('h1').inner_text();assert fallback.locator('#place-navigation').is_hidden();assert fallback.locator('noscript').is_visible();passed('script-free landing keeps its content without nonfunctional navigation');nojs.close()
            assert not report['errors'],report['errors'];assert not report['external_requests'],report['external_requests']
            report['status']='pass';report['browser']=b.version;b.close()
    finally:
        if server:server.shutdown();server.server_close()
    (args.out/'browser-results.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
if __name__=='__main__':main()
