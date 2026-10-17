#!/usr/bin/env python3
"""Real admitted wording, pinned layout, actual face/tissue and shared glass."""
import importlib.util,json,os,subprocess,tempfile
from pathlib import Path
here=Path(__file__).resolve();spec=importlib.util.spec_from_file_location('field_gles',here.parents[3]/'w'/'locus-shader.gles.test.py');g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)
results=[]
for w,h in [(390,844),(1280,800)]:
 data=json.loads(subprocess.check_output(['node',str(here.with_name('lens-source.gles-capture.cjs')),str(w),str(h)],text=True));images,programs=g.replay(data['commands'],w,h,min_depth_clears=0)
 assert len(data['audits'])==85 and len(data['source_bodies'])==5 and programs==2
 samples=[]
 for (pixels,_),frame in zip(images,data['frames']):
  f=frame['frame'];points=[(i//4%w,h-1-i//4//w)for i in range(0,len(pixels),4)if pixels[i+3]>20];assert len(points)>100
  assert all(f['left']-1<=x<=f['left']+f['width']+1 and f['top']-1<=y<=f['top']+f['height']+1 for x,y in points)
  samples.append({'kind':frame['kind'],'ink_pixels':len(points),'inside_readable_frame':True})
 # The same actual glyph pixels become a real canvas-composite input to the
 # production field/glass. No procedural blue stand-in is used for this check.
 with tempfile.TemporaryDirectory() as temporary:
  glyph=Path(temporary)/'glyph.rgba';empty=Path(temporary)/'empty.rgba';glyph.write_bytes(images[0][0]);empty.write_bytes(bytes(w*h*4));runs=[]
  for file in [empty,glyph]:
   env={**os.environ,'GLYPH_IMAGE':str(file),'GLYPH_FRAME':json.dumps(data['frames'][0]['frame'])};capture=json.loads(subprocess.check_output(['node',str(here.parents[3]/'w'/'locus-shader.gles-capture.cjs'),str(w),str(h),'0','0'],env=env,text=True));out,_=g.replay(capture,w,h);runs.append(out[-1][0])
  changed=sum(runs[0][i:i+4]!=runs[1][i:i+4]for i in range(0,len(runs[0]),4));assert changed>100
 results.append({'carrier':[w,h],'authored_parts':len(data['audits']),'source_characters':sum(x['characters']for x in data['audits']),'native_ink':samples,'actual_text_changed_glass_pixels':changed})
print(json.dumps({'status':'PASS','cases':results,'scope':'Actual admitted wording and complete pagination with Skia/real SpriteSheet font, pinned Pretext, production tissue GLSL and actual glyph input through shared glass on software GLES; not browser text rasterization or physical-device FPS.'}))
