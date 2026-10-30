#!/usr/bin/env python3
"""Witness actual owner names and language switching in the built site.

The compass consumes world targets; the overview draws the same names as body
labels. The test enters real sites with their full published sources. It does
not claim device performance or source-side Papers projection completion.
"""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
import argparse, json, threading

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
names = {
 'de': {'philosophy': 'Philosophy', 'crawlerbait': 'Crawlerbait', 'schattenseiten': 'Schattenseiten', 'papers': 'Papers', 'datenschutz': 'Datenschutz', 'impressum': 'Impressum'},
 'en': {'philosophy': 'Philosophy', 'crawlerbait': 'Crawlerbait', 'schattenseiten': 'Schattenseiten', 'papers': 'Papers', 'datenschutz': 'Privacy policy', 'impressum': 'Legal notice'},
}

def scene(page, identity):
    page.wait_for_function('(id)=>window.SSSDisplayRuntime?.state.activeIds.includes(id)&&document.getElementById("tetra-fold").dataset.fold==="open"', arg=identity, timeout=180000)

def check(page, language, identity):
    page.locator(f'[data-lang="{language}"]').click()
    expected = {f'organism:{key}': value for key, value in names[language].items()}
    targets = page.evaluate('() => Object.assign({},...SSSWorldView.globalTargets.map(t=>t.titles))')
    assert targets == expected, (language, identity, targets)
    assert page.evaluate('document.documentElement.lang') == language
    assert page.locator(f'[data-lang="{language}"]').get_attribute('aria-pressed') == 'true'
    assert page.evaluate('() => new URL(location.href).searchParams.get("lang")') == language
    if identity == 'organism:philosophy':
        page.wait_for_function('() => document.querySelectorAll("[data-interlocutor=\\"organism:philosophy\\"] .field-body-label").length >= 5')
        labels = page.locator('[data-interlocutor="organism:philosophy"] .field-body-label b').all_text_contents()
        assert sorted(labels) == sorted(value for key, value in expected.items() if key != identity), (language, labels)
        assert page.locator('[data-interlocutor="organism:philosophy"] .mission').inner_text().startswith('Wir geben Fragen' if language == 'de' else 'We give questions')
    if identity in ('organism:datenschutz', 'organism:impressum'):
        assert page.locator(f'[data-interlocutor="{identity}"] article h1').inner_text() == expected[identity]
    if identity == 'organism:crawlerbait':
        heading = page.locator('[data-interlocutor="organism:crawlerbait"] h1')
        assert heading.text_content() == 'Crawlerbait'
        assert heading.inner_text() == 'CRAWLERBAIT', heading.inner_text()
    for selector, owner, route in [('#legal-link-privacy', 'organism:datenschutz', 'privacy'),
                                   ('#legal-link-impressum', 'organism:impressum', 'impressum')]:
        link = page.locator(selector)
        # Footer casing is a visual CSS treatment; preserve and verify both
        # the actual name and the uppercase visitor-facing rendering.
        assert link.text_content() == expected[owner], (language, owner, link.text_content())
        assert link.inner_text() == expected[owner].upper(), (language, owner, link.inner_text())
        assert link.get_attribute('hreflang') == language
        assert link.get_attribute('href') == f'/{route}/' + ('en/' if language == 'en' else '')
    return targets

results = []
try:
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--disable-webgl'])
        for width, height in [(1280, 800), (390, 844)]:
            page = browser.new_page(viewport={'width': width, 'height': height}, device_scale_factor=1, reduced_motion='reduce')
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            try:
                page.goto(base, wait_until='domcontentloaded')
                scene(page, 'organism:philosophy')
                page.evaluate('document.fonts.ready')
                faces = page.evaluate('() => [...document.fonts].filter(f=>f.family==="SpriteSheet Mono").map(f=>f.status)')
                assert 'loaded' in faces, faces
                # The loaded face must actually distinguish the authored umlaut
                # from its base letter in a real Canvas draw, not only retain a
                # Unicode string which a fallback/missing-glyph box could show.
                assert page.evaluate('''() => {
                  const c=document.createElement('canvas');c.width=96;c.height=72;
                  const x=c.getContext('2d');x.font='48px "SpriteSheet Mono"';
                  function pixels(s){x.clearRect(0,0,c.width,c.height);x.fillText(s,4,53);return Array.from(x.getImageData(0,0,c.width,c.height).data)}
                  return [['ä','a'],['ö','o'],['ü','u']].every(([u,b])=>{
                    const p=pixels(u),q=pixels(b);return p.some(v=>v!==0)&&p.some((v,i)=>v!==q[i]);
                  });
                }'''), 'Mono face did not render distinct umlaut glyphs'
                for short in ['philosophy', 'datenschutz', 'impressum', 'schattenseiten', 'papers', 'crawlerbait']:
                    identity = 'organism:' + short
                    if short != 'philosophy':
                        page.evaluate('(id)=>SSSDisplayRuntime.navigateGlobal(SSSDisplayRuntime.registry.getMount(id).rawAddress)', identity)
                        scene(page, identity)
                    for language in ['de', 'en']:
                        targets = check(page, language, identity)
                        results.append({'viewport': [width, height], 'site': identity, 'language': language, 'targets': targets})
                        if short == 'philosophy': page.screenshot(path=str(args.out/f'overview-{width}-{language}.png'))
                assert not errors, errors
            except Exception:
                page.screenshot(path=str(args.out/f'language-{width}-FAILED.png'))
                raise
            finally:
                page.close()
        browser.close()
finally:
    server.shutdown(); server.server_close()
    (args.out/'language.json').write_text(json.dumps({'scope': __doc__, 'cases': results}, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({'status': 'PASS', 'cases': len(results)}))
