// Reads Crawlerbait's own public Traces-derived state + bait bodies; emits one compact data.js for the prototype.
const fs=require('fs'),path=require('path');
const CB='cambium/w/display/y/yw/crawlerbait', SITE='cambium/offered.txt';
const s=JSON.parse(fs.readFileSync(path.join(CB,'x/state.json'),'utf8'));
const GENES=['w','x','z','y'];
const V0=[[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]].map(v=>{const m=Math.hypot(...v);return v.map(n=>n/m)});
const mid=(a,b)=>a.map((x,i)=>(x+b[i])/2),split=t=>GENES.map((_,i)=>t.map((p,j)=>i===j?p:mid(t[i],p)));
const cell=a=>{let t=V0;for(const g of a)t=split(t)[GENES.indexOf(g)];return t};
const cen=t=>[0,1,2].map(k=>t.reduce((s,p)=>s+p[k],0)/4);
// baits: observed path -> address -> centroid of its cell in bait-space
const baits=[],baitIx=new Map();
for(const d of fs.readdirSync(path.join(CB,'w'))){const f=path.join(CB,'w',d,'bait.json');if(!fs.existsSync(f))continue;
  const b=JSON.parse(fs.readFileSync(f,'utf8'));baitIx.set(b.observed_path,baits.length);
  baits.push({p:b.observed_path,a:b.bait_address,c:cen(cell(b.bait_address)).map(x=>+x.toFixed(4)),n:b.raw_requests})}
// kind law (candidate, see nutrient): Feeder > Prober > Dweller > Harvester
const files=new Set(fs.readFileSync(SITE,'utf8').split(/\r?\n/).filter(Boolean));
const offered=p=>p==='/'||files.has(p)||/^\/(assets|papers-shadow|crawlerbait)\//.test(p)||/^\/(favicon\.ico|apple-touch-icon[^/]*|robots\.txt|sitemap\.xml)$/.test(p);
const own=p=>/^\/(__live\/|repos\/self-similar-systems\/)/.test(p);
const by={};for(const e of s.encounters)(by[e.crawler]=by[e.crawler]||[]).push(e);
const kindOf=es=>es.some(e=>own(e.path)&&!['GET','HEAD','OPTIONS'].includes(e.method)&&e.status<300)?'w'
 :es.some(e=>!offered(e.path)&&!own(e.path)&&!/^\/cdn-cgi\//.test(e.path))?'z'
 :new Set(es.map(e=>e.t.slice(0,10))).size>=2?'y':'x';
// the clock starts where whole-traffic beings start (provider retention boundary), not at legacy 404 evidence
const t0=Math.min(...s.encounters.map(e=>Date.parse(e.t))),t1=Date.parse(s.raw_capture_end);
const beings=[];let missing=0;
for(const b of Object.values(s.crawlers)){const es=(by[b.id]||[]).slice().sort((a,c)=>a.t<c.t?-1:1);
  const steps=[];for(const e of es){const i=baitIx.get(e.path);if(i==null){missing++;continue}steps.push([Math.round((Date.parse(e.t)-t0)/1000),i,e.status])}
  if(!steps.length)continue;
  beings.push({id:b.id,dna:b.network_identity.replace('ip:v1:',''),ua:b.user_agent||'',k:kindOf(es),vb:Object.keys(b.verified_bot_categories)[0]||'',
    days:new Set(es.map(e=>e.t.slice(0,10))).size,ev:b.events,s:steps})}
const out={span:[new Date(t0).toISOString(),s.raw_capture_end],seconds:Math.round((t1-t0)/1000),baits,beings};
fs.writeFileSync('crawlerbait-proto/data.js','window.CRAWLERBAIT='+JSON.stringify(out)+';\n');
const k=beings.reduce((m,b)=>(m[b.k]=(m[b.k]||0)+1,m),{});
console.log({baits:baits.length,beings:beings.length,kinds:k,encounterPathsWithoutBait:missing,bytes:fs.statSync('crawlerbait-proto/data.js').size});
