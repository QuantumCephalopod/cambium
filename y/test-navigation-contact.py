#!/usr/bin/env python3
"""Witness real Canvas2D pointer contact, body ink and return in Chromium."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import json
import threading

from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--artifact', required=True, type=Path)
parser.add_argument('--out', required=True, type=Path)
args = parser.parse_args()
args.out.mkdir(parents=True, exist_ok=True)

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(args.artifact.resolve())))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}/index.html'
cases = []

def ready(page, identity):
    page.wait_for_function('id=>window.SSSDisplayRuntime?.state.activeIds.includes(id)&&document.getElementById("tetra-fold").dataset.fold==="open"', arg=identity, timeout=180000)

def slot_geometry(page, portrait):
    values = page.evaluate('''()=>{const s=SSSDisplayMembraneGrid.snapshot(),b=document.getElementById('display-ascent').getBoundingClientRect();return {top:s.top,compass:s.compass,slot:s.ascent,button:{left:b.left,top:b.top,right:b.right,bottom:b.bottom,width:b.width,height:b.height}}}''')
    s, b, top, compass = values['slot'], values['button'], values['top'], values['compass']
    for k in ('left', 'top', 'right', 'bottom'):
        assert abs(s[k] - b[k]) < 1, (k, values)
    if portrait:
        for a, b in ((s['left'], compass['right']), (s['right'], top['left']), (s['top'], compass['top']), (s['bottom'], compass['bottom'])):
            assert abs(a-b) < 1, values
    else:
        for a, b in ((s['top'], top['bottom']), (s['bottom'], compass['top']), (s['left'], compass['left']), (s['right'], compass['right'])):
            assert abs(a-b) < 1, values
    return values

try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--disable-webgl'])
        page = browser.new_page(viewport={'width':1280,'height':800}, device_scale_factor=1)
        errors=[]
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(base+'#main:overview', wait_until='domcontentloaded')
        ready(page,'organism:philosophy')
        mounts=page.evaluate('''()=>Object.fromEntries(['papers','crawlerbait'].map(id=>[id,SSSDisplayRuntime.registry.getMount('organism:'+id).rawAddress]))''')
        assert mounts == {'papers':'w','crawlerbait':'y'}, mounts
        slot_geometry(page,False)

        # Actual blank contact: one click is inert; a double click returns one local rank.
        page.evaluate("SSSInterlocutorFields.get('organism:philosophy').descendTo('w','browser-witness')")
        page.wait_for_timeout(500)
        assert page.evaluate('SSSWorldView.view') == 'w'
        assert page.evaluate("document.elementFromPoint(400,700).classList.contains('interlocutor-background')")
        page.mouse.click(400,700)
        assert page.evaluate('SSSWorldView.view') == 'w'
        page.mouse.dblclick(400,700,delay=70)
        page.wait_for_function('SSSWorldView.view===""')

        # A visible body label and its underlying body name the same live target.
        label=page.locator('[data-interlocutor="organism:philosophy"] .field-body-label').filter(has_text='Papers').first
        box=label.bounding_box(); assert box
        page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
        page.wait_for_function('''()=>{const s=document.querySelector('[data-interlocutor="organism:philosophy"] .field-contact-trace');return s?.dataset.target==='organism:papers'&&s.dataset.kind==='tetra'&&getComputedStyle(s).display!=='none'}''')
        trace=page.locator('[data-interlocutor="organism:philosophy"] .field-contact-trace')
        assert 'contact-travel' in trace.locator('.field-contact-pulse').evaluate('(e)=>getComputedStyle(e).animationName')
        page.screenshot(path=str(args.out/'hover-philosophy.png'))
        page.evaluate('''()=>{window.actualBody='';window.addEventListener('sss:enter-body',e=>window.actualBody=e.detail.id)}''')
        box=label.bounding_box();assert box
        page.mouse.click(box['x']+box['width']/2,box['y']+box['height']/2)
        page.wait_for_function('window.actualBody==="organism:papers"')
        ready(page,'organism:papers')

        # Papers owns its own input and finer walk; its double-click returns that
        # chamber before crossing the site membrane.
        chamber=page.locator('.papers-chamber-label[data-gene=w]');box=chamber.bounding_box();assert box
        page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
        page.wait_for_function('''()=>[...document.querySelectorAll('[data-interlocutor="organism:papers"] .field-contact-trace')].some(s=>s.dataset.target==='w'&&s.dataset.kind==='tetra'&&getComputedStyle(s).display!=='none')''')
        page.evaluate("document.querySelector('.papers-chamber-label[data-gene=w]').click()")
        page.wait_for_function('document.querySelector(".papers-sierpinski-stage")?.dataset.chamberPath==="w"')
        page.wait_for_timeout(500)
        page.mouse.click(400,700)
        assert page.locator('.papers-sierpinski-stage').get_attribute('data-chamber-path') == 'w'
        page.mouse.dblclick(400,700,delay=70)
        page.wait_for_function('document.querySelector(".papers-sierpinski-stage")?.dataset.chamberPath==="overview"')
        s=slot_geometry(page,False)['slot'];x=s['left']+s['width']*.3;y=s['top']+s['height']*.7
        page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+20,y+20);page.mouse.up()
        assert page.evaluate('SSSDisplayRuntime.state.activeAddress')=='w','a drag across the return field must not ascend'
        page.mouse.click(x,y)
        page.wait_for_function('SSSDisplayRuntime.state.activeAddress===""&&document.getElementById("tetra-fold").dataset.fold==="open"',timeout=180000)
        assert not errors,errors
        cases.append({'carrier':[1280,800],'mounts':mounts,'fieldDoubleClick':True,'papersDoubleClick':True,'hoverTarget':'organism:papers','pointerReturn':True})
        page.close()

        page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1,reduced_motion='reduce')
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(base+'#main:overview',wait_until='domcontentloaded');ready(page,'organism:philosophy')
        values=slot_geometry(page,True)
        page.locator('#display-ascent').focus();page.keyboard.press('Enter')
        assert page.evaluate('SSSDisplayRuntime.state.activeAddress')==''
        assert not errors,errors
        page.screenshot(path=str(args.out/'portrait-return.png'))
        cases.append({'carrier':[390,844],'rotatedReturn':values['slot'],'keyboardReturn':True})
        page.close();browser.close()
finally:
    server.shutdown();server.server_close()
    (args.out/'navigation-contact.json').write_text(json.dumps({'scope':__doc__,'cases':cases},indent=2)+'\n')

print(json.dumps({'status':'PASS','cases':len(cases)}))
