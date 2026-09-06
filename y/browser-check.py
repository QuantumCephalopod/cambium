#!/usr/bin/env python3
"""Optional browser witness for cambium's linked static skin and recursive navigation.
Runs through a local file URL so generated HTML can load living w/x/z/y source tissue.
This is a bounded interaction/layout witness, not a full accessibility/security/legal audit.
"""
from pathlib import Path
import argparse, json, re, shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
GENES='wxzy'

def walk_index(node,path=''):
    yield path,node
    for g in GENES:
        if g in node: yield from walk_index(node[g],path+g)

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--out',type=Path,default=ROOT.parent/'review')
    ap.add_argument('--chromium')
    args=ap.parse_args();args.out.mkdir(parents=True,exist_ok=True)
    origin=(ROOT/'index.html').resolve().as_uri()
    fixture=ROOT/'.browser-fixture.html'
    report={'transport':'local file URL over repository-local static tissue','interactions':[],'layouts':[],
            'errors':[],'external_requests':[],'notes':['production phenotype is INDEX.yaml; browser registry is derived projection',
            'synthetic descendants exist only in a temporary fixture','bounded functional witness, not a complete audit']}
    def passed(s):report['interactions'].append({'test':s,'status':'pass'})
    try:
      with sync_playwright() as p:
        b=p.chromium.launch(headless=True,executable_path=args.chromium or shutil.which('chromium'),args=['--no-sandbox'])
        ctx=b.new_context(viewport={'width':1440,'height':1000},device_scale_factor=1)
        page=ctx.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
        page.on('request',lambda req:report['external_requests'].append(req.url) if not req.url.startswith(('file:','data:')) else None)
        page.goto(origin);page.wait_for_function('window.Cambium !== undefined')
        def go(h):page.evaluate('(h)=>location.hash=h',h);page.wait_for_timeout(55)
        def state():return page.evaluate('Cambium.getState()')
        def pose():return page.evaluate('Cambium.getView()')
        def changed(a,b):return any(abs(x-y)>1e-6 for x,y in zip(a,b))
        assert page.locator('nav').count()==1;passed('one public navigation landmark')
        assert page.locator('.next-place').all_text_contents()==['expression','continuity','orientation','renewal'];passed('root choices derive from phenotype nouns')
        assert page.locator('.node-label').all_text_contents()==['expression','continuity','orientation','renewal'];passed('geometry and text expose one phenotype')
        payload=page.evaluate('JSON.parse(document.querySelector("#cambium-data").textContent)')
        assert sorted(payload)==['copy','index'] and payload['index']['w']['name']=='expression';passed('runtime registry is present without publishing test fixture')
        page.locator('.next-place[data-path="w"]').click();page.wait_for_function('Cambium.getState().path==="w"')
        assert page.locator('.crumb').all_text_contents()==['expression'] and page.locator('#next-places').is_hidden();passed('unsplit leaf invents no descendants')
        page.locator('summary').click();hrefs=page.locator('#source-files a').evaluate_all('(a)=>a.map(n=>n.getAttribute("href"))')
        assert len(hrefs)==4 and all((ROOT/h).is_file() for h in hrefs);passed('derived source links resolve to living leaf tissue')
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
        page.emulate_media(reduced_motion='reduce');assert page.evaluate('getComputedStyle(document.documentElement).scrollBehavior')=='auto';passed('reduced-motion rule arrives from living stylesheet')
        for width in [320,375,390,768,1024,1440,1920]:
            page.set_viewport_size({'width':width,'height':1000})
            for h in ['#/','#/w','#/x','#/z','#/y']:
                go(h);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                assert page.locator('#page-title').is_visible()
            report['layouts'].append({'width':width,'real_routes':5,'overflow':False})
        passed('all real routes fit seven viewport widths')
        touch=b.new_context(viewport={'width':390,'height':900},has_touch=True,is_mobile=True);tp=touch.new_page();tp.goto(origin);tp.wait_for_function('window.Cambium !== undefined')
        tp.locator('#geometry').scroll_into_view_if_needed();box=tp.locator('#geometry').bounding_box();sx=box['x']+box['width']/2;sy=box['y']+box['height']/2;tq=tp.evaluate('Cambium.getView()');session=touch.new_cdp_session(tp)
        session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':sx,'y':sy}]})
        for d in [15,35,60,85]:session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':sx,'y':sy-d}]});tp.wait_for_timeout(20)
        session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});tp.wait_for_timeout(80)
        assert changed(tq,tp.evaluate('Cambium.getView()')) and tp.evaluate('Cambium.getState().path')=='';passed('touch drag changes view without route activation')
        tp.locator('#reset-view').tap();tp.locator('.map-node[data-path="w"] .node-label').tap();tp.wait_for_function('Cambium.getState().path==="w"');passed('touch tap still navigates');touch.close()
        # Temporary local fixture exercises recursive and reciprocal names without becoming phenotype.
        source=(ROOT/'index.html').read_text();pattern=r'(<script id="cambium-data" type="application/json">)(.*?)(</script>)'
        data=json.loads(re.search(pattern,source,re.S).group(2));data['index']=json.loads((ROOT/'y/specimen.json').read_text())['index']
        for path,node in walk_index(data['index']):
            if path:data['copy']['organs'][path]={'title':node['name'],'lead':'synthetic named-prefix test','detail':'not a production page'}
        source=re.sub(pattern,lambda m:m.group(1)+json.dumps(data).replace('<','\\u003c')+m.group(3),source,flags=re.S)
        fixture.write_text(source,encoding='utf-8');test=ctx.new_page();test.goto(fixture.resolve().as_uri());test.evaluate('location.hash="#/w.x"');test.wait_for_function('Cambium.getState().path==="wx"')
        assert test.locator('.trail a').all_text_contents()==['expression','representation','continuity','representation'];passed('fixture: reciprocal trails retain complete-prefix nouns')
        test.evaluate('location.hash="#/w.x.z"');test.wait_for_function('Cambium.getState().path==="wxz"');assert test.locator('.trail a').count()==6;passed('fixture: deeper local nouns remain local')
        test.close()
        nojs=b.new_context(java_script_enabled=False,viewport={'width':375,'height':900});fallback=nojs.new_page();fallback.goto(origin)
        assert 'we give questions' in fallback.locator('h1').inner_text() and fallback.locator('noscript').is_visible();passed('script-free landing preserves content and phenotype link');nojs.close()
        assert not report['errors'],report['errors'];assert not report['external_requests'],report['external_requests']
        report['status']='pass';report['browser']=b.version;b.close()
    finally:
        if fixture.exists():fixture.unlink()
    (args.out/'browser-results.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
if __name__=='__main__':main()
