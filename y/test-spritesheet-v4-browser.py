#!/usr/bin/env python3
"""Witness the supplied v4 font in the actual built Display using Chromium.

The Canvas2D font raster and DOM loading are observed in an isolated browser;
this is not a physical-device, GPU, frame-rate or full-layout readability claim.
"""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from urllib.parse import urlparse, unquote
import argparse, hashlib, json, os, threading

p=argparse.ArgumentParser()
p.add_argument('--artifact',type=Path,required=True)
p.add_argument('--out',type=Path,required=True)
a=p.parse_args();a.out.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(a.artifact.resolve())))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/index.html'
results=[]
try:
 from playwright.sync_api import sync_playwright
 with sync_playwright() as pw:
  kw={'executable_path':os.environ['CHROMIUM_EXECUTABLE']} if os.environ.get('CHROMIUM_EXECUTABLE') else {}
  browser=pw.chromium.launch(headless=True,args=['--disable-webgl'],**kw)
  page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1,reduced_motion='reduce')
  errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto(base+'#main:z',wait_until='domcontentloaded')
  page.wait_for_function('window.SSSDisplayRuntime?.state.activeIds.includes("organism:datenschutz")&&document.getElementById("tetra-fold").dataset.fold==="open"',timeout=180000)
  page.evaluate('document.fonts.ready')
  result=page.evaluate('''async()=>{
   const dep=JSON.parse(document.getElementById('display-dependencies').textContent)['@sss/spritesheet'];
   const url=member=>new URL(dep.base+member,document.baseURI).href;
   const ttf=new FontFace('v4-ttf-witness',`url("${url('SpriteSheet-Mono.ttf')}")`);
   const woff=new FontFace('v4-woff-witness',`url("${url('SpriteSheet-Mono.woff2')}")`);
   await Promise.all([ttf.load(),woff.load(),document.fonts.load('32px "SpriteSheet Mono"')]);document.fonts.add(ttf);document.fonts.add(woff);
   const c=document.createElement('canvas');c.width=80;c.height=80;const ctx=c.getContext('2d',{willReadFrequently:true});
   function draw(f,ch){ctx.clearRect(0,0,80,80);ctx.fillStyle='#000';ctx.font='32px "'+f+'"';ctx.textBaseline='alphabetic';ctx.fillText(ch,4,55);return {width:ctx.measureText(ch).width,pixels:Array.from(ctx.getImageData(0,0,80,80).data)};}
   const same=(x,y)=>x.width===y.width&&x.pixels.every((v,i)=>v===y.pixels[i]);
   const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜabcdefghijklmnopqrstuvwxyzäöü0123456789 \\u00a0';
   const mismatch=[],familyMismatch=[],caseSame=[],widths=new Set();
   for(const ch of alphabet){const x=draw('v4-ttf-witness',ch),y=draw('v4-woff-witness',ch);widths.add(x.width);if(!same(x,y))mismatch.push(ch);if(!same(y,draw('SpriteSheet Mono',ch)))familyMismatch.push(ch)}
   for(const ch of 'abcdefghijklmnopqrstuvwxyzäöü')if(same(draw('v4-woff-witness',ch),draw('v4-woff-witness',ch.toUpperCase())))caseSame.push(ch);
   const title=document.querySelector('.datenschutz-heading h1'),style=getComputedStyle(title);
   return {urls:{ttf:url('SpriteSheet-Mono.ttf'),woff:url('SpriteSheet-Mono.woff2')},fontStatuses:[ttf.status,woff.status],primaryLoaded:[...document.fonts].filter(f=>f.family==='SpriteSheet Mono'&&f.status==='loaded').length,
    glyphCount:alphabet.length,ttfWoffMismatch:mismatch,primaryMismatch:familyMismatch,caseSame,widths:[...widths],
    title:{text:title.textContent,family:style.fontFamily,transform:style.textTransform},fold:SSSDisplayType.fold('Ää Grüße')};
  }''')
  assert result['fontStatuses']==['loaded','loaded'] and result['primaryLoaded']>0,result
  assert result['glyphCount']==70 and not result['ttfWoffMismatch'] and not result['primaryMismatch'] and not result['caseSame'],result
  assert result['widths']==[32],result
  assert result['title']['text']=='Privacy policy' and 'SpriteSheet Mono' in result['title']['family'] and result['title']['transform']=='none',result
  assert result['fold']=='Ää Grüsse',result
  for member,expected in [('ttf','53a6210ec17bb0faec17f0b7a6b5d8437feea500a8fee80455054745c0daddf3'),('woff','ad37e39de57589a53989d13607d234e3c6efe37a77deb53b1cca598c72ee4187')]:
   path=a.artifact/unquote(urlparse(result['urls'][member]).path).lstrip('/')
   assert hashlib.sha256(path.read_bytes()).hexdigest()==expected,(member,path)
  assert not errors,errors
  results.append(result);page.close();browser.close()
finally:
 server.shutdown();server.server_close()
 (a.out/'spritesheet-v4.json').write_text(json.dumps({'scope':__doc__,'cases':results},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':'PASS','glyphs':70,'distinct_lowercase':29,'ttf_woff_primary_pixels':'identical','scope':'actual artifact, isolated Chromium Canvas2D + DOM'}))
