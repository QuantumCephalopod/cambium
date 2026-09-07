#!/usr/bin/env python3
"""Optional browser witness for the Pages artifact secreted by w/display/.

Builds _site, serves only that artifact over localhost, and exercises the current
production routes. Playwright/Chromium are test-only tools. This is a bounded
interaction/layout witness, not a complete accessibility/security/legal audit.
"""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
import argparse
import json
import shutil
import subprocess
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent.parent
SITE=ROOT/'_site'


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*_args):pass


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--out',type=Path,default=ROOT.parent/'review')
    ap.add_argument('--chromium')
    args=ap.parse_args();args.out.mkdir(parents=True,exist_ok=True)
    subprocess.run(['python3',str(ROOT/'y/build.py'),'--artifact',str(SITE)],check=True)
    subprocess.run(['python3',str(ROOT/'y/check.py'),'--artifact',str(SITE)],check=True)

    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(SITE)))
    Thread(target=server.serve_forever,daemon=True).start()
    origin=f'http://127.0.0.1:{server.server_port}'
    report={'transport':'localhost HTTP over generated display artifact','interactions':[],'layouts':[],
            'errors':[],'external_requests':[],'notes':['w/display/ is living organ tissue; _site is ephemeral membrane',
            'production phenotype is host INDEX.yaml; browser registry is derived projection',
            'bounded functional witness, not a complete audit']}
    def passed(s):report['interactions'].append({'test':s,'status':'pass'})
    try:
      with sync_playwright() as p:
        b=p.chromium.launch(headless=True,executable_path=args.chromium or shutil.which('chromium'),args=['--no-sandbox'])
        ctx=b.new_context(viewport={'width':1440,'height':1000},device_scale_factor=1)
        page=ctx.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
        page.on('request',lambda req:report['external_requests'].append(req.url) if not req.url.startswith((origin,'data:')) else None)
        page.goto(origin+'/index.html');page.wait_for_function('window.Cambium !== undefined')
        def go(h):page.evaluate('(h)=>location.hash=h',h);page.wait_for_timeout(55)
        def state():return page.evaluate('Cambium.getState()')
        def pose():return page.evaluate('Cambium.getView()')
        def changed(a,b):return any(abs(x-y)>1e-6 for x,y in zip(a,b))

        assert page.locator('nav').count()==1;passed('one public navigation landmark')
        assert page.locator('.next-place').all_text_contents()==['expression','continuity','orientation','renewal'];passed('root choices derive from host phenotype')
        assert page.locator('.node-label').all_text_contents()==['expression','continuity','orientation','renewal'];passed('display and orientation expose one named host phenotype')
        payload=page.evaluate('JSON.parse(document.querySelector("#cambium-data").textContent)')
        assert sorted(payload)==['copy','index'] and payload['index']['w']['name']=='expression';passed('runtime registry is membrane-local derived state')
        assert all(not payload['index'][g].get('tissue') for g in 'wxzy');passed('host carrier topology is not leaked into visitor routes')

        page.locator('.next-place[data-path="w"]').click();page.wait_for_function('Cambium.getState().path==="w"')
        assert page.locator('.crumb').all_text_contents()==['expression'] and page.locator('#next-places').is_hidden();passed('unsplit host leaf invents no descendants')
        assert page.locator('#source-block').is_hidden();passed('organ source custody is not exposed as host-route tissue')
        page.locator('.home-crumb').click();page.wait_for_function('Cambium.getState().path===""')

        host=page.locator('#geometry');host.focus();s0=state();q0=pose();page.keyboard.press('ArrowUp');q1=pose();page.keyboard.press('ArrowRight');q2=pose();page.keyboard.press('e');q3=pose()
        assert changed(q0,q1) and changed(q1,q2) and changed(q2,q3) and state()==s0;passed('keyboard camera changes presentation only')
        page.locator('#reset-view').click();assert not changed(q0,pose()) and state()==s0;passed('reset restores camera without moving address')
        def drag(dx,dy):
            box=host.bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
            page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+dx,y+dy,steps=12);page.mouse.up();page.wait_for_timeout(60)
        drag(0,90);assert changed(q0,pose()) and state()==s0;passed('mouse drag turns without route activation')

        for h in ['#/w.x','#/study/w.x','#/w..x','#/<script>']:
            old=state();go(h);assert state()==old and page.locator('#error-message').is_visible()
        passed('invalid and unearned paths do not mint destinations')
        page.locator('#error-message a').click();page.wait_for_function('Cambium.getState().path===""')
        page.emulate_media(reduced_motion='reduce');assert page.evaluate('getComputedStyle(document.documentElement).scrollBehavior')=='auto';passed('reduced-motion rule arrives from display stylesheet')

        for width in [320,375,390,768,1024,1440,1920]:
            page.set_viewport_size({'width':width,'height':1000})
            for h in ['#/','#/w','#/x','#/z','#/y']:
                go(h);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                assert page.locator('#page-title').is_visible()
            report['layouts'].append({'width':width,'real_routes':5,'overflow':False})
        passed('all real routes fit seven viewport widths')

        touch=b.new_context(viewport={'width':390,'height':900},has_touch=True,is_mobile=True)
        tp=touch.new_page();tp.goto(origin+'/index.html');tp.wait_for_function('window.Cambium !== undefined')
        tp.locator('#geometry').scroll_into_view_if_needed();box=tp.locator('#geometry').bounding_box();sx=box['x']+box['width']/2;sy=box['y']+box['height']/2;tq=tp.evaluate('Cambium.getView()');session=touch.new_cdp_session(tp)
        session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':sx,'y':sy}]})
        for d in [15,35,60,85]:session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':sx,'y':sy-d}]});tp.wait_for_timeout(20)
        session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});tp.wait_for_timeout(80)
        assert changed(tq,tp.evaluate('Cambium.getView()')) and tp.evaluate('Cambium.getState().path')=='';passed('touch drag changes view without route activation')
        tp.locator('#reset-view').tap();tp.locator('.map-node[data-path="w"] .node-label').tap();tp.wait_for_function('Cambium.getState().path==="w"');passed('touch tap still navigates');touch.close()

        nojs=b.new_context(java_script_enabled=False,viewport={'width':375,'height':900});fallback=nojs.new_page();fallback.goto(origin+'/index.html')
        assert 'we give questions' in fallback.locator('h1').inner_text() and fallback.locator('noscript').is_visible();passed('script-free landing preserves display content');nojs.close()
        assert not report['errors'],report['errors'];assert not report['external_requests'],report['external_requests']
        report['status']='pass';report['browser']=b.version;b.close()
    finally:
        server.shutdown();server.server_close()
    (args.out/'browser-results.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))

if __name__=='__main__':
    main()
