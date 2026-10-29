#!/usr/bin/env python3
"""Replay actual consumer media draws with cached source bytes on software GLES."""
import argparse,importlib.util,json,subprocess
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--cache',type=Path,required=True)
for capability in ('gles','handoff','navigation','transport'):p.add_argument('--'+capability,type=Path,required=True)
a=p.parse_args()
root=Path(__file__).resolve();spec=importlib.util.spec_from_file_location('field_gles',a.gles);gles=importlib.util.module_from_spec(spec);spec.loader.exec_module(gles)
results=[]
for width,height in [(390,844),(1280,800)]:
 runs={}
 for mode in ['low','high','failed']:
  data=json.loads(subprocess.check_output(['node',str(root.with_name('media.gles-capture.cjs')),str(a.cache),mode,str(width),str(height),str(a.handoff),str(a.navigation),str(a.transport)],text=True));images,programs=gles.replay(data['commands'],width,height,min_depth_clears=1)
  assert len(data['requests'])==(55 if mode=='low' else 110) and data['peak']<=4
  uploads=[x for x in data['commands']if x['name']=='texSubImage3D'];assert len(uploads)=={'low':55,'high':110,'failed':109}[mode]
  assert all(x['args'][5:7]==[64,64]for x in uploads[:55]);assert programs==1
  assert sum(x['name']=='deleteTexture'for x in data['commands'])==(1 if mode=='low' else 2),'entered high and context-local low retire separately'
  runs[mode]=images[0][0]
 changed=sum(runs['low'][i:i+4]!=runs['high'][i:i+4]for i in range(0,len(runs['low']),4));failed=sum(runs['failed'][i:i+4]!=runs['high'][i:i+4]for i in range(0,len(runs['low']),4));assert changed>100 and failed>0
 results.append({'carrier':[width,height],'source_low_uploads':55,'entered_high_uploads':55,'failed_high_retains_low':True,'low_high_changed_pixels':changed,'one_failed_slot_changed_pixels':failed})
print(json.dumps({'status':'PASS','backend':gles.gl('GetString',gles.C.c_char_p,[gles.U],7937).decode(),'cases':results,'scope':'Actual consumer shaders and source-media pixel uploads on software GLES; Pillow supplies decoded/resized source bytes. Browser decoder/CSS, physical-driver behavior and device FPS are not certified.'}))
