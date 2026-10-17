#!/usr/bin/env python3
"""Actual Crawlerbait goo/ink, admitted public history, font and Pretext."""
import importlib.util,json,subprocess,math
from pathlib import Path
here=Path(__file__).resolve();spec=importlib.util.spec_from_file_location('g',here.parents[4]/'w/locus-shader.gles.test.py');g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)
results=[]
for w,h in [(390,844),(1280,800)]:
 d=json.loads(subprocess.check_output(['node',str(here.with_name('meal.gles-capture.cjs')),str(w),str(h)],text=True));images,n=g.replay(d['commands'],w,h,min_depth_clears=0)
 assert n==3 and len(images)==1
 pixels=images[0][0];diversity=len({pixels[i:i+4]for i in range(0,len(pixels),4)});assert diversity>100
 assert int(d['dataset']['inkPixels'])==math.floor(w*.75+.5)*math.floor(h*.75+.5)
 results.append({'carrier':[w,h],'linked_programs':n,'pixel_values':diversity,'pretext':d['audits'],'lens':d['lens'],'field':d['dataset']})
print(json.dumps({'status':'PASS','cases':results,'scope':'Actual public history, pinned Pretext and real SpriteSheet font with software GLES goo/ink pixels. Synthetic contact places one actual Being in the safe frame; browser interaction and physical GPU FPS are separate.'}))
