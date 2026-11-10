#!/usr/bin/env python3
"""Mobile reading and touch witness on an isolated Chromium Canvas2D carrier.

Exercises both languages on two portrait viewport sizes. This does not claim
physical-device behaviour or WebGL parity.
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
sites = [('philosophy', 'overview'), ('crawlerbait', 'y'), ('schattenseiten', 'x'),
         ('papers', 'w'), ('datenschutz', 'z'), ('impressum', 'xz')]
cases = []

try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--no-sandbox', '--disable-webgl'])
        for width, height in [(320, 568), (390, 844)]:
            for language in ('de', 'en'):
                for site, address in sites:
                    page = browser.new_page(viewport={'width':width, 'height':height},
                                            is_mobile=True, has_touch=True,
                                            device_scale_factor=1, reduced_motion='reduce')
                    errors = []
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    stem = f'{site}-{language}-{width}x{height}'
                    try:
                        page.goto(base+f'?lang={language}#main:{address}', wait_until='domcontentloaded')
                        page.wait_for_function('id => window.SSSDisplayRuntime?.state.activeIds.includes(id) && document.getElementById("tetra-fold").dataset.fold === "open"', arg='organism:'+site, timeout=180000)
                        page.evaluate('document.fonts.ready')
                        result = page.evaluate('''() => {
                          const host=document.querySelector('[data-interlocutor]:not([hidden])');
                          const headings=[...host.querySelectorAll('[data-ui-bounded="true"] h1')].map(h=>{
                            const field=h.closest('[data-ui-bounded="true"]'),a=h.getBoundingClientRect(),b=field.getBoundingClientRect();
                            const words=[];const walker=document.createTreeWalker(h,NodeFilter.SHOW_TEXT);
                            while(walker.nextNode()){
                              const node=walker.currentNode;
                              for(const match of node.data.matchAll(/\\S+/g)){
                                const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);
                                words.push({word:match[0],lines:[...range.getClientRects()].filter(r=>r.width>0&&r.height>0).map(r=>Math.round(r.top))});
                              }
                            }
                            return {text:h.textContent,top:a.top,bottom:a.bottom,fieldTop:b.top,fieldBottom:b.bottom,words};
                          });
                          return {width:innerWidth,coarse:matchMedia('(pointer:coarse)').matches,headings};
                        }''')
                        assert result['width']==width and result['coarse'], (stem, result)
                        for h in result['headings']:
                            assert h['top']>=h['fieldTop']-1 and h['bottom']<=h['fieldBottom']+1, (stem, h, 'title clipped')
                            for word in h['words']:
                                assert len(set(word['lines']))<=1, (stem, h, 'word split across lines')
                        # Both real language controls are visible and accept a touch.
                        other = 'en' if language=='de' else 'de'
                        page.locator(f'[data-lang="{other}"]').tap(timeout=10000)
                        assert page.evaluate('document.documentElement.lang')==other, stem
                        page.locator(f'[data-lang="{language}"]').tap(timeout=10000)
                        assert page.evaluate('document.documentElement.lang')==language, stem
                        legal=page.locator('#legal-links')
                        first=legal.evaluate('''e=>{e.scrollTop=0;const r=e.getBoundingClientRect(),f=e.querySelector('a').getBoundingClientRect();return {top:r.top,bottom:r.bottom,firstTop:f.top,firstBottom:f.bottom}}''')
                        assert first['firstTop']>=first['top']-1 and first['firstBottom']<=first['bottom']+1,(stem,first,'first legal link is clipped at scroll origin')
                        for link in page.locator('#legal-links a').all():
                            link.scroll_into_view_if_needed()
                            box=link.evaluate('''e=>{const r=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();return {top:r.top,bottom:r.bottom,parentTop:p.top,parentBottom:p.bottom}}''')
                            assert box['top']>=box['parentTop']-1 and box['bottom']<=box['parentBottom']+1,(stem,box,'legal continuation cannot scroll fully into view')
                            link.tap(trial=True, timeout=10000)
                        # Witness the actual map and touch without imposing a
                        # new minimum size on the author's exchanged fields.
                        map_box=page.locator('#navTwin').bounding_box()
                        # The authored map field may be rectangular. The canvas
                        # backing store must match it so its square projection
                        # is not stretched by CSS.
                        assert map_box and page.locator('#navTwin').evaluate('''e=>{const r=e.getBoundingClientRect();return Math.abs(e.width/e.height-r.width/r.height)<.02}'''), (stem,map_box)
                        assert map_box['width']>0, (stem,map_box,'map has no visible area')
                        page.locator('#navTwin').tap(trial=True,timeout=10000)
                        if site=='philosophy':
                            page.evaluate("document.getElementById('navTwin').addEventListener('pointerdown',e=>window.__mapTouch=e.pointerType,{once:true})")
                            page.touchscreen.tap(map_box['x']+2,map_box['y']+2)
                            assert page.evaluate('window.__mapTouch')=='touch', (stem,'map did not receive touch')
                        page.locator('#mini-help-toggle').tap()
                        assert page.locator('#mini-guide').is_visible(), stem
                        page.locator('#mini-help-toggle').tap()
                        if site=='crawlerbait':
                            for button in page.locator('.crawlerbait-modes button').all():
                                button.scroll_into_view_if_needed()
                                assert button.bounding_box()['height']>=43, (stem, 'mode touch target')
                                button.tap(trial=True, timeout=10000)
                        if site in ('datenschutz','impressum'):
                            select=page.locator('[data-ui-field="controls"] select')
                            assert select.bounding_box()['width']>=100, (stem, 'select too narrow')
                            select.tap(trial=True, timeout=10000)
                        if site=='papers':
                            page.locator('.papers-physiology button').tap(trial=True, timeout=10000)
                        if site=='philosophy':
                            labels=page.evaluate('''() => [...document.querySelectorAll('[data-interlocutor="organism:philosophy"] .field-body-label:not([hidden])')].map(e=>{
                              const r=e.getBoundingClientRect(),at=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
                              return {text:e.textContent,left:r.left,top:r.top,right:r.right,bottom:r.bottom,
                                reachable:!!at&&(at===e||e.contains(at)),line:parseFloat(e.style.getPropertyValue('--body-label-line-length'))||0};
                            })''')
                            assert len(labels)==5, (stem, labels)
                            for i,a in enumerate(labels):
                                assert a['reachable'] and a['bottom']-a['top']>=43, (stem, a, 'body label cannot be touched')
                                for b in labels[i+1:]:
                                    assert min(a['right'],b['right'])-max(a['left'],b['left'])<=1 or min(a['bottom'],b['bottom'])-max(a['top'],b['top'])<=1, (stem,a,b,'body labels overlap')
                            assert any(a['line']>0 for a in labels), (stem,'displaced label lost its body tether')
                            # Enter a real body by touch and return through the
                            # same global control; no synthetic navigation event.
                            paper=next(a for a in labels if a['text']=='Papers')
                            page.touchscreen.tap((paper['left']+paper['right'])/2,(paper['top']+paper['bottom'])/2)
                            page.wait_for_function('SSSDisplayRuntime.state.activeAddress==="w" && document.getElementById("tetra-fold").dataset.fold==="open"', timeout=180000)
                            slot=page.locator('#display-ascent').bounding_box()
                            page.touchscreen.tap(slot['x']+slot['width']/2,slot['y']+slot['height']/2)
                            page.wait_for_function('SSSDisplayRuntime.state.activeAddress==="" && document.getElementById("tetra-fold").dataset.fold==="open"', timeout=180000)
                        if site!='philosophy':
                            # The visual control intentionally lets pointer
                            # contacts pass to the field, whose capture handler
                            # owns the actual return. Touch its real centre.
                            slot=page.locator('#display-ascent').bounding_box()
                            page.touchscreen.tap(slot['x']+slot['width']/2,slot['y']+slot['height']/2)
                            page.wait_for_function('SSSDisplayRuntime.state.activeAddress==="" && document.getElementById("tetra-fold").dataset.fold==="open"', timeout=180000)
                        assert not errors, (stem, errors)
                        if language=='de' and width==320:
                            page.screenshot(path=str(args.out/(stem+'.png')))
                        cases.append({'site':site, 'language':language, 'viewport':[width,height]})
                        print('PASS', stem, flush=True)
                    except Exception:
                        page.screenshot(path=str(args.out/(stem+'-FAILED.png')))
                        raise
                    finally:
                        page.close()
        browser.close()
finally:
    server.shutdown()
    server.server_close()
    (args.out/'mobile-reading.json').write_text(json.dumps({'scope':__doc__, 'cases':cases}, indent=2)+'\n')
print(json.dumps({'status':'PASS','cases':len(cases)}))
