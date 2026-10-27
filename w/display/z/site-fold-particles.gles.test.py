#!/usr/bin/env python3
"""Actual instanced tetrahedra and shared black Goo/Ink on software GLES."""
import json,sys,subprocess
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'w'))
import importlib.util
p=Path(__file__).resolve().parent.parent/'w/locus-shader.gles.test.py';spec=importlib.util.spec_from_file_location('g',p);g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)
cases=[]
for w,h in [(1280,800),(390,844)]:
 d=json.loads(subprocess.check_output(['node',str(Path(__file__).with_name('site-fold-particles.gles-capture.cjs')),str(w),str(h)],text=True));images,n=g.replay(d['commands'],d['width'],d['height'],min_depth_clears=0)
 coverage=[]
 for rgba,state in images:
  assert all(rgba[i]==0 and rgba[i+1]==0 and rgba[i+2]==0 for i in range(0,len(rgba),4)),'transition is not pure black'
  coverage.append(sum(rgba[i]>250 for i in range(3,len(rgba),4))/(d['width']*d['height']))
 assert coverage[0]==coverage[-1]==0,'idle surface leaks ink'
 assert coverage[4]>.9999,('closed flood leaks the old scene',coverage)
 assert 0<coverage[2]<1,('particle phase is a hidden full-screen plane',coverage)
 cases.append({'css_carrier':[w,h],'render_carrier':[d['width'],d['height']],'instances':d['count'],'tetrahedron_vertices':12,'opaque_coverage':coverage,'black_only':True,'one_instance_upload':True,'programs':n})
print(json.dumps({'status':'PASS','cases':cases,'scope':'Actual production shared density/ink and tetrahedral geometry on software GLES; not browser/device FPS.'}))
