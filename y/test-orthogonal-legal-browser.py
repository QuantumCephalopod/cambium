#!/usr/bin/env python3
"""Browser witness for both source-owned legal text surfaces.

Run only against an already-built artifact, with Playwright/Chromium installed.
Screenshots are evidence for human visual review, not an OCR or device claim.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import json
import threading

parser = argparse.ArgumentParser()
parser.add_argument('--artifact', required=True, type=Path)
parser.add_argument('--out', required=True, type=Path)
args = parser.parse_args()
args.out.mkdir(parents=True, exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(args.artifact.resolve())))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = 'http://127.0.0.1:%d/' % server.server_port
results = []
try:
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        for backend, flags in [('webgl2', ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']), ('canvas2d', ['--disable-webgl'])]:
            browser = pw.chromium.launch(headless=True, args=flags)
            for width, height in [(390, 844), (1280, 800)]:
                for name, address, route, mail in [('datenschutz', 'z', 'privacy', 'privacy@sss.saarland'), ('impressum', 'xz', 'impressum', 'contact@sss.saarland')]:
                    for language in ('de', 'en'):
                        page = browser.new_page(viewport={'width':width, 'height':height}, device_scale_factor=1)
                        errors = []
                        page.on('pageerror', lambda error: errors.append(str(error)))
                        stem = '%s-%s-%s-%s' % (name, language, width, backend)
                        host = '[data-interlocutor="organism:%s"]:not([hidden])' % name
                        try:
                            page.goto(base + '?lang=' + language + '#main:' + address, wait_until='domcontentloaded')
                            page.wait_for_selector(host + ' article h1', timeout=120000)
                            page.wait_for_function("document.getElementById('tetra-fold').dataset.fold==='open'", timeout=120000)
                            page.wait_for_function("selector => { const e=document.querySelector(selector+' input[type=number]'); return e && Number(e.max)>=1 && !e.disabled }", arg=host, timeout=120000)
                            page.evaluate('document.fonts.ready')
                            canvas = page.locator(host + ' canvas.interlocutor-background')
                            assert canvas.get_attribute('data-field-renderer') == backend, (stem, canvas.get_attribute('data-field-renderer'))
                            assert not canvas.get_attribute('data-layer-error'), (stem, canvas.get_attribute('data-layer-error'))
                            article = page.locator(host + ' article')
                            assert article.locator('h1').inner_text() == ({'de':'Datenschutz','en':'Privacy policy'}[language] if name=='datenschutz' else {'de':'Impressum','en':'Legal notice'}[language])
                            href = '/%s/%s' % (route, 'en/' if language=='en' else '')
                            assert article.locator('a[href="%s"]' % href).count() >= 1
                            assert article.locator('a[href="mailto:%s"]' % mail).count() >= 1
                            jump = article.locator('input[type=number]')
                            # Check actual interactive element bounds, including the
                            # owner's clipping rectangle; DOM reachability alone can
                            # pass when controls are below the visible viewport.
                            def within(locator):
                                box = locator.bounding_box()
                                container = article.bounding_box()
                                assert box and container, (stem, 'missing interactive bounds')
                                for key in ('x', 'y', 'width', 'height'): assert box[key] >= 0, (stem, key, box)
                                assert box['x'] >= container['x']-1 and box['y'] >= container['y']-1, (stem, box, container)
                                assert box['x']+box['width'] <= min(width,container['x']+container['width'])+1, (stem,box,container)
                                assert box['y']+box['height'] <= min(height,container['y']+container['height'])+1, (stem,box,container)
                            for selector in ('h1','a[href^="mailto:"]','a[href^="/'+route+'/"]','button','input[type=number]','select'):
                                within(article.locator(selector).first)
                            within(article.get_by_role('button',name='Weiter' if language=='de' else 'Next',exact=True))
                            # Calculate the shared V0 rest-view bounds from the
                            # actual owner viewport; screenshots witness paint.
                            geometry=page.evaluate("id => SSSInterlocutorFields.get(id).presentationRect()", 'organism:'+name)
                            import math
                            span=min(geometry['width'],geometry['height'])
                            base_scale=1.42 if geometry['width']<560 else 1.75
                            radius=span/2/math.tan(math.pi/6.6)/3.2*base_scale*1.4/math.sqrt(3)
                            cx=geometry['x']+geometry['width']/2;cy=geometry['y']+geometry['height']/2
                            assert cx-radius>=-1 and cx+radius<=width+1 and cy-radius>=-1 and cy+radius<=height+1, (stem,'text geometry clipped',geometry,radius)
                            font_px=max(28,min(100,math.ceil(16*1024/(span*.49*1.4))))*2*radius/1024
                            assert font_px>=14, (stem,'projected type too small',font_px)
                            total = int(jump.get_attribute('max'))
                            assert total >= 1
                            assert article.locator('.orthogonal-text-accessible').text_content().strip()
                            page.wait_for_timeout(150)  # allow the site frame to paint after data loads
                            page.screenshot(path=str(args.out / (stem+'-first.png')))
                            if total > 1:
                                sections=article.locator('select')
                                assert sections.locator('option').count()>=2, stem+' section navigation missing'
                                sections.select_option(index=1)
                                assert article.locator('.orthogonal-text-accessible').text_content().strip()
                                first_text = article.locator('.orthogonal-text-accessible').text_content()
                                forward = article.get_by_role('button', name='Weiter' if language=='de' else 'Next', exact=True)
                                forward.click()
                                page.wait_for_function("([s,t]) => document.querySelector(s+' .orthogonal-text-accessible')?.textContent !== t", arg=[host,first_text])
                                jump.fill(str(total))
                                jump.press('Tab')
                                page.wait_for_function("([s,n]) => document.querySelector(s+' input[type=number]')?.value === String(n)", arg=[host,total])
                                next_button = article.get_by_role('button', name='Weiter' if language=='de' else 'Next', exact=True)
                                assert next_button.is_disabled(), stem
                                assert article.locator('.orthogonal-text-accessible').text_content().strip()
                                assert article.locator('nav a').count() >= 1, stem + ' final source links missing'
                                last_link=article.locator('nav a').first
                                last_link.scroll_into_view_if_needed()
                                within(last_link)
                                page.wait_for_timeout(150)
                                page.screenshot(path=str(args.out / (stem+'-last.png')))
                            assert not canvas.get_attribute('data-layer-error'), stem
                            assert not errors, (stem, errors)
                            results.append({'owner':name,'language':language,'viewport':[width,height],'backend':backend,'pages':total,'first_image':stem+'-first.png','last_image':stem+'-last.png' if total>1 else None})
                        except Exception:
                            page.screenshot(path=str(args.out / (stem+'-FAILED.png')))
                            raise
                        finally:
                            page.close()
            browser.close()
finally:
    server.shutdown()
    server.server_close()
    (args.out / 'result.json').write_text(json.dumps({'scope':__doc__, 'cases':results}, indent=2)+'\n')
print(json.dumps({'status':'pass','cases':len(results),'viewports':[[390,844],[1280,800]],'backends':['webgl2','canvas2d']}))
