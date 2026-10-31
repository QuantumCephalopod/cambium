"""Real production shaders, source face and text layout on software GLES."""
import importlib.util,json,subprocess,shutil
from pathlib import Path
from PIL import Image
here=Path(__file__).resolve();spec=importlib.util.spec_from_file_location('gles',here.with_name('locus-shader.gles.test.py'));g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)
results=[]
for w,h in [(390,844),(1280,800)]:
 data=json.loads(subprocess.check_output(['node',str(here.with_name('tetra-text.gles-capture.cjs')),str(w),str(h)],text=True))
 try:
  images,programs=g.replay(data['commands'],w,h,min_depth_clears=4)
  assert programs==1 and len(images)==4 and data['uploads']==2
  pixels=[p for p,_ in images]
  assert pixels[0]==pixels[1],'idle frame changed actual pixels'
  changed=lambda a,b:sum(a[i:i+4]!=b[i:i+4] for i in range(0,len(a),4))
  rotation=changed(pixels[0],pixels[2]);end=changed(pixels[0],pixels[3]);assert rotation>1000 and end>100
  # Both render paths actually contain the canonical body and source glyph ink.
  witnesses=[]
  for case,p in zip(data['cases'],pixels):
   c=Image.open(case['canvas2d']).convert('RGBA');raw=c.tobytes();assert c.size==(w,h)
   ink=lambda p:sum(p[i]>100 and p[i+1]>100 and p[i+2]>100 for i in range(0,len(p),4))
   a,b=ink(p),ink(raw);assert min(a,b)>100
   witnesses.append({'case':case['label'],'gles_ink_pixels':a,'canvas2d_ink_pixels':b})
  results.append({'carrier':[w,h],'programs':programs,'uploads':data['uploads'],'texture_size':data['texture_size'],'rotation_changed_pixels':rotation,'end_changed_pixels':end,'cases':witnesses})
 finally:shutil.rmtree(data['pixel_directory'])
print(json.dumps({'status':'PASS','backend':g.gl('GetString',g.C.c_char_p,[g.U],7937).decode(),'cases':results,'scope':'Actual neutral material, canonical geometry, SpriteSheet Mono TTF and pinned Pretext on Skia/Canvas2D plus software GLES; idle upload reuse and resource retirement. No browser, deployed visitor, physical driver or device FPS claim.'}))
