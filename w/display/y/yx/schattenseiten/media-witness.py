#!/usr/bin/env python3
"""Acquire and decode the exact admitted occupied-slot media for a local witness.

Network integration witness, deliberately separate from offline CI. Originals and
unadmitted paths are never fetched; output is a disposable test cache.
"""
import argparse,concurrent.futures,hashlib,io,json
from pathlib import Path
import urllib.request
from PIL import Image

p=argparse.ArgumentParser();p.add_argument('--cache',type=Path,required=True);a=p.parse_args()
projection=json.loads(Path(__file__).with_name('projection.json').read_text());a.cache.mkdir(parents=True,exist_ok=True)
sources=[];rows=set()
for w in projection['works']:
 sources.append(w['still'])
 if w.get('cluster_positive') and w['row'] not in rows:sources.append(w['cluster_positive']);rows.add(w['row'])
assert len(sources)==55 and len(set(sources))==55

def acquire(item):
 size,source=item;member=projection['media_variants'][str(size)][source]
 assert member.startswith(f'sizes/{size}/') and not any(x in member for x in ('..','%','?',':','\\'))
 url=projection['fat']+member;key=hashlib.sha256(url.encode()).hexdigest();local=a.cache/(key+'.webp')
 if not local.exists():
  with urllib.request.urlopen(url,timeout=40) as response:
   assert response.status==200
   cors=response.headers.get('Access-Control-Allow-Origin');assert cors=='*',('media is not cross-origin readable',url,cors)
   data=response.read();local.write_bytes(data)
 else:data=local.read_bytes();cors='* (previous successful acquisition)'
 im=Image.open(io.BytesIO(data));im.load();assert max(im.size)==size and min(im.size)>0,(member,im.size)
 rgba=a.cache/(key+'.rgba');rgba.write_bytes(im.convert('RGBA').resize((size,size),Image.Resampling.NEAREST).tobytes())
 return {'source':source,'tier':size,'url':url,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'source_dimensions':list(im.size),'width':size,'height':size,'cors':cors,'rgba':str(rgba)}

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 records=list(pool.map(acquire,[(size,source)for size in (64,512)for source in sources]))
manifest={'projection_sha256':hashlib.sha256(Path(__file__).with_name('projection.json').read_bytes()).hexdigest(),'source':'declared occupied-slot media only','records':records}
(a.cache/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps({'status':'PASS','decoded':len(records),'tiers':[64,512],'occupied_slots':55,'bytes':sum(r['bytes']for r in records),'manifest':str(a.cache/'manifest.json'),'scope':'Real published bytes, HTTP/CORS and Pillow decode; consumer/GL execution is a separate witness.'}))
