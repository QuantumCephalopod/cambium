#!/usr/bin/env python3
"""Optional rendered witness for the current main-root WebGL public membrane."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import argparse
import contextlib
import os
import socket
import threading

ROOT=Path(__file__).resolve().parent.parent


def free_port():
    with contextlib.closing(socket.socket()) as s:
        s.bind(('127.0.0.1',0)); return s.getsockname()[1]


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--artifact',type=Path,default=ROOT/'_site')
    ap.add_argument('--out',type=Path,default=ROOT.parent/'cambium-review')
    args=ap.parse_args()
    artifact=args.artifact if args.artifact.is_absolute() else ROOT/args.artifact
    out=args.out if args.out.is_absolute() else ROOT/args.out
    out.mkdir(parents=True,exist_ok=True)
    if not (artifact/'index.html').is_file():
        raise SystemExit('build the artifact first')

    try:
        from playwright.sync_api import sync_playwright
    except Exception as e:
        raise SystemExit(f'Playwright unavailable: {e}')

    port=free_port()
    old=os.getcwd(); os.chdir(artifact)
    server=ThreadingHTTPServer(('127.0.0.1',port),SimpleHTTPRequestHandler)
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True)
            page=browser.new_page(viewport={'width':1440,'height':1000})
            errors=[]
            page.on('pageerror',lambda e: errors.append(str(e)))
            page.on('console',lambda m: errors.append(m.text) if m.type=='error' else None)
            page.goto(f'http://127.0.0.1:{port}/index.html',wait_until='networkidle')
            page.wait_for_selector('#navTwin')
            assert page.locator('#axis-x').count()==1 and page.locator('#axis-y').count()==1
            assert 'PAGE main:root' in page.locator('#route-mark').inner_text()
            page.locator('[data-a11y-focus="x"]').click()
            assert 'VIEW main:x' in page.locator('#route-mark').inner_text()
            assert page.locator('#commit').get_attribute('class') and 'show' in page.locator('#commit').get_attribute('class')
            page.locator('#commit').click()
            assert 'PAGE main:x' in page.locator('#route-mark').inner_text()
            page.locator('#root-home').click()
            assert 'PAGE main:root' in page.locator('#route-mark').inner_text()
            page.screenshot(path=str(out/'main-root-webgl.png'),full_page=True)
            browser.close()
            if errors:
                raise AssertionError('browser errors: '+repr(errors))
    finally:
        server.shutdown();server.server_close();os.chdir(old)
    print('browser witness pass:',out/'main-root-webgl.png')


if __name__=='__main__':main()
