#!/usr/bin/env python3
"""Compare actual shared glass draw wall time on software GLES. Pass a baseline locus-shader.js path.
Not a browser or physical-device FPS benchmark. Run without concurrent graphics tests.
"""
import importlib.util,os,subprocess,json,tempfile,time,statistics,sys
from pathlib import Path
p=Path(__file__).with_name('locus-shader.gles.test.py');baseline=Path(sys.argv[1]).resolve()
spec=importlib.util.spec_from_file_location('gles',p);g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)
results=[]
for w,h in [(1280,800),(390,844)]:
 with tempfile.TemporaryDirectory(dir='/dev/shm') as td:
  target=Path(td)/'fg.rgba';target.write_bytes(bytes(w*h*4));frame={'left':24,'top':h//3,'width':min(420,w-48),'height':260,'r':14}
  for source in [str(baseline),str(p.with_name('locus-shader.js'))]:
   env={**os.environ,'LOCUS_SOURCE':source,'FOREGROUND_IMAGE':str(target),'GLYPH_FRAME':json.dumps(frame),'READ_LOCK':'body'}
   commands=json.loads(subprocess.check_output(['node',str(p.with_name('locus-shader.gles-capture.cjs')),str(w),str(h),'0','0'],env=env,text=True))
   original=g.gl;current=None;programs=set();draws=[];mips=[]
   def measured(name,ret,args,*values):
    global current
    if name=='UseProgram':current=values[0]
    if name=='GetUniformLocation' and values[-1]==b'uForegroundReady':programs.add(values[0])
    if (name=='DrawArrays' and current in programs) or name=='GenerateMipmap':
     # Warm up driver compilation, then time repeated real GPU work synchronously.
     original(name,ret,args,*values);original('Finish',None,[])
     samples=[]
     for i in range(5):
      start=time.perf_counter();original(name,ret,args,*values);original('Finish',None,[]);samples.append((time.perf_counter()-start)*1000)
     (mips if name=='GenerateMipmap' else draws).append(statistics.median(samples));return
    return original(name,ret,args,*values)
   g.gl=measured
   try:g.replay(commands,w,h)
   finally:g.gl=original
   results.append({'carrier':[w,h],'source':'before' if source==str(baseline) else 'after','glass_draw_ms':statistics.mean(draws),'mip_build_ms_per_frame':sum(mips)/len(draws),'total_focus_ms':statistics.mean(draws)+sum(mips)/len(draws),'frames':len(draws),'scope':'synchronized software GLES wall timing; actual production fragment shader, not browser or device FPS'})
print(json.dumps(results))
