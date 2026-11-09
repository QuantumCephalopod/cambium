#!/usr/bin/env python3
"""Witness browser pointer contact, body ink and return on Canvas2D or WebGL."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import json
import threading
import time

from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--artifact', required=True, type=Path)
parser.add_argument('--out', required=True, type=Path)
parser.add_argument('--backend', choices=('canvas2d','webgl'), default='canvas2d')
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

def double_touch(page, x, y):
    # CDP timestamps model two adjacent real touch contacts even when a slow
    # software renderer delays the automation round trip between injections.
    c=page.context.new_cdp_session(page);t=time.time()
    for kind,points,offset in [('touchStart',[{'x':x,'y':y,'id':9}],0),('touchEnd',[],.05),('touchStart',[{'x':x,'y':y,'id':9}],.15),('touchEnd',[],.2)]:
        c.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points,'timestamp':t+offset})
    c.detach()

def empty_point(page, identity, canvas_class):
    """Find an actual uncovered, non-contact point in the current frame."""
    # Labels and world bodies move; a remembered pixel is not evidence that a
    # point is empty. The same production hover trace reports contact geometry.
    for x in (12, 24, 40, 60, 80):
        for y in (240, 300, 360, 420, 480, 540, 600):
            surface=page.evaluate('''([x,y,klass])=>{
              const el=document.elementFromPoint(x,y);
              return !!el?.classList.contains(klass)&&!SSSDisplayRuntime.isAscentPoint(x,y);
            }''',[x,y,canvas_class])
            if not surface:continue
            page.mouse.move(x,y)
            page.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
            empty=page.evaluate('''([id,x,y,klass])=>{const el=document.elementFromPoint(x,y),traces=[...document.querySelectorAll(`[data-interlocutor="${id}"] .field-contact-trace`)];return !!el?.classList.contains(klass)&&!SSSDisplayRuntime.isAscentPoint(x,y)&&traces.length>0&&traces.every(e=>getComputedStyle(e).display==='none')}''',[identity,x,y,canvas_class])
            if empty:return x,y
    raise AssertionError((identity,'no currently uncovered empty field point found'))

def slot_geometry(page, portrait):
    values = page.evaluate('''()=>{const s=SSSDisplayMembraneGrid.snapshot(),b=document.getElementById('display-ascent').getBoundingClientRect(),p=SSSUIGrid.orientBounds(SSSUIGrid.carrierField(s.inner,'pocket',s.orientation).bounds,s.orientation);return {top:s.top,compass:s.compass,slot:s.ascent,pocket:p,button:{left:b.left,top:b.top,right:b.right,bottom:b.bottom,width:b.width,height:b.height}}}''')
    s, b, top, compass = values['slot'], values['button'], values['top'], values['compass']
    for k in ('left', 'top', 'right', 'bottom'):
        assert abs(s[k] - b[k]) < 1, (k, values)
    p=values['pocket']
    expected={'left':compass['left']+p['x']*compass['width'],'top':compass['top']+p['y']*compass['height'],'width':p['w']*compass['width'],'height':p['h']*compass['height']}
    for k,v in expected.items():assert abs(s[k]-v)<1,values
    return values

try:
    with sync_playwright() as pw:
        flags=['--disable-webgl'] if args.backend=='canvas2d' else ['--use-angle=swiftshader','--enable-unsafe-swiftshader']
        browser = pw.chromium.launch(headless=True, args=flags)
        page = browser.new_page(viewport={'width':1280,'height':800}, device_scale_factor=1)
        errors=[]
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(base+'#main:overview', wait_until='domcontentloaded')
        ready(page,'organism:philosophy')
        renderer=page.locator('[data-interlocutor="organism:philosophy"] .interlocutor-background').get_attribute('data-field-renderer')
        assert renderer==('webgl2' if args.backend=='webgl' else 'canvas2d'),renderer
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
        assert page.locator('.papers-sierpinski-stage').get_attribute('data-field-renderer')==renderer

        # A stored pre-relocation visit names the old address but retains the
        # actual body identity; browser history reacquires the current mount.
        page.evaluate('''()=>{const now=SSSDisplayRuntime.state;history.pushState({...now,activeAddress:'y'},'','#main:y');history.pushState(now,'','#main:w')}''')
        page.go_back()
        page.wait_for_function('SSSDisplayRuntime.state.activeIds.includes("organism:papers")&&SSSDisplayRuntime.state.activeAddress==="w"&&location.hash==="#main:w"')

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
        cases.append({'carrier':[1280,800],'backend':renderer,'mounts':mounts,'historyRemount':True,'fieldDoubleClick':True,'papersDoubleClick':True,'hoverTarget':'organism:papers','pointerReturn':True})
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
        page.close()

        # Chromium touch does not synthesize dblclick here. Exercise actual
        # primary touch input on the shared field and Papers' own canvas.
        context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(base+'#main:overview',wait_until='domcontentloaded');ready(page,'organism:philosophy')
        mobile_renderer=page.locator('[data-interlocutor="organism:philosophy"] .interlocutor-background').get_attribute('data-field-renderer')
        assert mobile_renderer==renderer,(mobile_renderer,renderer)
        page.evaluate("SSSInterlocutorFields.get('organism:philosophy').descendTo('w','touch-witness')")
        page.wait_for_timeout(500)
        x,y=empty_point(page,'organism:philosophy','interlocutor-background')
        page.touchscreen.tap(x,y);assert page.evaluate('SSSWorldView.view')=='w'
        page.wait_for_timeout(500)
        x,y=empty_point(page,'organism:philosophy','interlocutor-background')
        double_touch(page,x,y)
        page.wait_for_function('SSSWorldView.view===""')
        page.wait_for_timeout(300);assert page.evaluate('SSSWorldView.view')==''
        page.goto(base+'#main:w',wait_until='domcontentloaded');ready(page,'organism:papers')
        assert page.locator('.papers-sierpinski-stage').get_attribute('data-field-renderer')==renderer
        page.wait_for_selector('.papers-chamber-label[data-gene=w]')
        page.evaluate("document.querySelector('.papers-chamber-label[data-gene=w]').click()")
        page.wait_for_function('document.querySelector(".papers-sierpinski-stage")?.dataset.chamberPath==="w"')
        page.wait_for_timeout(500)
        x,y=empty_point(page,'organism:papers','papers-sierpinski-stage')
        page.touchscreen.tap(x,y);assert page.locator('.papers-sierpinski-stage').get_attribute('data-chamber-path')=='w'
        page.wait_for_timeout(500)
        x,y=empty_point(page,'organism:papers','papers-sierpinski-stage')
        double_touch(page,x,y)
        page.wait_for_function('document.querySelector(".papers-sierpinski-stage")?.dataset.chamberPath==="overview"')
        page.wait_for_timeout(300);assert page.locator('.papers-sierpinski-stage').get_attribute('data-chamber-path')=='overview'
        assert not errors,errors
        cases.append({'carrier':[390,844],'backend':mobile_renderer,'touchFieldDoubleTap':True,'touchPapersDoubleTap':True,'singleTouchInert':True})
        context.close();browser.close()
finally:
    server.shutdown();server.server_close()
    (args.out/'navigation-contact.json').write_text(json.dumps({'scope':__doc__,'cases':cases},indent=2)+'\n')

print(json.dumps({'status':'PASS','cases':len(cases)}))
