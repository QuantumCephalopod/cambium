#!/usr/bin/env python3
"""Execute the actual Papers host renderer/chamber and admitted sample geometry."""
import importlib.util,json,subprocess
from pathlib import Path
here=Path(__file__).resolve();spec=importlib.util.spec_from_file_location('field_gles',here.parents[3]/'w'/'locus-shader.gles.test.py');g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)
projection=json.loads(here.with_name('projection.json').read_text());admitted={x['id']for k in ('groups','holons')for rows in projection[k].values()for x in rows}
results=[]
for w,h in [(390,844),(1280,800)]:
 data=json.loads(subprocess.check_output(['node',str(here.with_name('host-body.gles-capture.cjs')),str(w),str(h)],text=True));assert set(data['source_ids'])<=admitted
 assert len(data['cells'])==4+len(data['source_ids']);images,programs=g.replay(data['commands'],w,h,min_depth_clears=2)
 a,b=[x[0]for x in images];changed=sum(a[i:i+4]!=b[i:i+4]for i in range(0,len(a),4));assert changed>0
 assert programs==2 and sum(x['name'].startswith('delete')for x in data['commands'])>=7
 results.append({'carrier':[w,h],'chambers':4,'actual_admitted_sample':len(data['source_ids']),'moving_pixels':changed,'programs_reused_then_released':True})
print(json.dumps({'status':'PASS','cases':results,'scope':'Actual Papers chamber/instance renderer and source-admitted coarse sample on software GLES; no title substitute, screenshot body, invented organism or detail-feed acquisition.'}))
