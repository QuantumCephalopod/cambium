#!/usr/bin/env python3
"""Optional rendered witness for Philosophy face-focus + direct mounted-site encounter."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import argparse,contextlib,os,socket,threading

ROOT=Path(__file__).resolve().parent.parent
def free_port():
    with contextlib.closing(socket.socket()) as s:
        s.bind(('127.0.0.1',0)); return s.getsockname()[1]

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--artifact',type=Path,default=ROOT/'_site');ap.add_argument('--out',type=Path,default=ROOT.parent/'cambium-review');args=ap.parse_args()
    artifact=args.artifact if args.artifact.is_absolute() else ROOT/args.artifact
    out=args.out if args.out.is_absolute() else ROOT/args.out;out.mkdir(parents=True,exist_ok=True)
    if not (artifact/'index.html').is_file(): raise SystemExit('build the artifact first')
    try: from playwright.sync_api import sync_playwright
    except Exception as e: raise SystemExit(f'Playwright unavailable: {e}')
    port=free_port();old=os.getcwd();os.chdir(artifact);server=ThreadingHTTPServer(('127.0.0.1',port),SimpleHTTPRequestHandler);threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
      with sync_playwright() as p:
        browser=p.chromium.launch(headless=True);page=browser.new_page(viewport={'width':1440,'height':1000});errors=[]
        page.on('pageerror',lambda e: errors.append(str(e)));page.on('console',lambda m: errors.append(m.text) if m.type=='error' else None)
        page.goto(f'http://127.0.0.1:{port}/index.html',wait_until='networkidle');page.wait_for_selector('.philosophy-global-site[data-address="y"]')
        assert page.locator('#commit').count()==0
        pos=page.evaluate("""()=>{const f=SSSInterlocutorFields.get('organism:philosophy');const c=f.projectAddressCenter('y');const r=f.canvas.getBoundingClientRect();return {x:r.left+c.x,y:r.top+c.y}}""")
        page.mouse.click(pos['x'],pos['y'])
        page.wait_for_function("SSSWorldView.view==='y'")
        page.locator('.philosophy-global-site[data-address="y"]').click()
        page.wait_for_function("SSSDisplayRuntime.state.activeAddress==='y'")
        assert 'organism:papers' in page.evaluate("SSSDisplayRuntime.state.activeIds")
        page.screenshot(path=str(out/'philosophy-direct-global-encounter.png'),full_page=True)
        browser.close()
        if errors: raise AssertionError('browser errors: '+repr(errors))
    finally:
      server.shutdown();server.server_close();os.chdir(old)
    print('browser witness pass:',out/'philosophy-direct-global-encounter.png')
if __name__=='__main__':main()
