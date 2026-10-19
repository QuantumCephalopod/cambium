#!/usr/bin/env python3
"""Actual detailed Papers bodies/tissue, borrowed frame and full admitted set.

Needs CODEX_PRIMARY_RUNTIME_NODE_MODULES with @napi-rs/canvas, as the existing
lens-source witness does. CPU timings include command serialization and are not
browser/device FPS. EGL replays the actual production shaders and source font.
"""
import importlib.util,json,subprocess
from pathlib import Path
here=Path(__file__).resolve();spec=importlib.util.spec_from_file_location('gles',here.parents[3]/'w'/'locus-shader.gles.test.py');g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)
results=[]
for w,h in [(390,844),(1280,800)]:
 data=json.loads(subprocess.check_output(['node',str(here.with_name('field-frame.gles-capture.cjs')),str(w),str(h)],text=True))
 images,programs=g.replay(data['commands'],w,h,min_depth_clears=0)
 ink,ink_programs=g.replay(data['tissue_commands'],w,h,min_depth_clears=0)
 assert programs==2 and ink_programs==2 and len(images)==len(ink)==3
 assert all(c['population']==209 for c in data['cases'])
 assert [c['whole']for c in data['cases']]==[0,1,1]
 assert all(c['tissue_letters']>0 for c in data['cases'][1:])
 colors=[len({tuple(p[i:i+3])for i in range(0,len(p),4)})for p,_ in images]
 assert min(colors)>100
 ink_pixels=[sum(p[i+3]>20 for i in range(0,len(p),4))for p,_ in ink]
 assert ink_pixels[0]==0 and min(ink_pixels[1:])>100
 results.append({'carrier':[w,h],'cases':data['cases'],'body_colors':colors,'actual_glyph_pixels':ink_pixels,'cpu_transport_ms':data['cpu_ms'],'body_programs':programs,'tissue_programs':ink_programs})
print(json.dumps({'status':'PASS','cases':results,'scope':'Actual detailed production layer and text tissue with real admitted population, SpriteSheet Mono, pinned Pretext and software GLES; no browser/physical-device FPS claim.'}))
