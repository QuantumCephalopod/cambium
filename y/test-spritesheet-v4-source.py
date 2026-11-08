#!/usr/bin/env python3
"""Compare supplied v4 glyph contours to their independent pixel source.

The source sheet is sampled at pixel centres using the supplied cell/centering
metadata. This checks source-to-Unicode mapping and outlines, not hinting or a
browser's rasterization; those have a separate actual-browser witness.
"""
from pathlib import Path
from io import BytesIO
from zipfile import ZipFile
import argparse,hashlib,json
from PIL import Image
from fontTools.ttLib import TTFont
from fontTools.pens.pointInsidePen import PointInsidePen

p=argparse.ArgumentParser()
p.add_argument('--sprite',type=Path,required=True)
p.add_argument('--package',type=Path,required=True)
p.add_argument('--font',type=Path,default=Path('w/display/w/wx/spritesheet/SpriteSheet-Mono.ttf'))
p.add_argument('--woff',type=Path,default=Path('w/display/w/wx/spritesheet/SpriteSheet-Mono.woff2'))
a=p.parse_args()
digest=lambda b:hashlib.sha256(b).hexdigest()
assert digest(a.sprite.read_bytes())=='2779609dc7a949e9c871f85b988a47cb31d5cf70a790a014addd762afc483be4','source sprite changed'
assert digest(a.package.read_bytes())=='3c28e42e0dbe91fa45809e6127d8af97162cc3a4fea70ec91afc8108b9831398','supplied package changed'
with ZipFile(a.package) as z:
 ttf=z.read('SpriteSheet-Mono-v4.ttf');woff=z.read('SpriteSheet-Mono-v4.woff2');qa=json.loads(z.read('SpriteSheet-Mono-v4-QA.json'))
assert a.font.read_bytes()==ttf and a.woff.read_bytes()==woff,'hosted font differs from supplied bytes'
font=TTFont(BytesIO(ttf));cmap=font.getBestCmap();glyphs=font.getGlyphSet();image=Image.open(a.sprite).convert('RGBA')
assert image.size==(108,96) and font['head'].unitsPerEm==1200
expected='ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜabcdefghijklmnopqrstuvwxyzäöü0123456789'
assert set(qa)-{'font'}==set(expected) and all(ord(ch) in cmap for ch in expected)
mismatches={}
for ch in expected:
 meta=qa[ch];row,col=meta['grid_cell'];shift=meta['centering_shift_units'];bad=[]
 assert font['hmtx'].metrics[cmap[ord(ch)]][0]==1200,(ch,'advance')
 for sy in range(12):
  for sx in range(12):
   R,G,B,A=image.getpixel((col*12+sx,row*12+sy));source=A>128 and R+G+B<384
   pen=PointInsidePen(glyphs,(sx*100+50+shift,(10-sy)*100+50));glyphs[cmap[ord(ch)]].draw(pen)
   if source!=pen.getResult():bad.append((sx,sy))
 if bad:mismatches[ch]=bad
assert not mismatches,mismatches
print(json.dumps({'status':'PASS','source_sheet':[108,96],'source_cells':len(expected),'pixel_centres_per_glyph':144,'mismatched_glyphs':[],'hosted_bytes':'source exact','scope':__doc__},ensure_ascii=False))
