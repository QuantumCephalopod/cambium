(() => {
'use strict';
const id='organism:crawlerbait';
const GENES=Object.freeze(['w','x','z','y']);
const modules=globalThis.SSSInterlocutorModules||(globalThis.SSSInterlocutorModules=new Map());
let inspectorHost=null,selectedAddress='',crawlerById=new Map(),lastProjection=null;
let growth=null,fieldCache=null,fieldRevision=-1,baitFold=null;
let VISITS=null;

/* ============ KINDS — one exhaustive CCCC split of what a being did (y/tide.py) ============
 * Each kind owns one quarter of the complex phase circle, and one riso ink. */
const KIND=Object.freeze({
  w:Object.freeze({name:'Feeder',   gene:'CREATE',   phase:0,           speed:1.3,ink:'#b48cff',does:'writes into our own apertures'}),
  x:Object.freeze({name:'Harvester',gene:'COPY',     phase:Math.PI*.5,  speed:1.0,ink:'#58d3c4',does:'takes what exists, in one visit'}),
  z:Object.freeze({name:'Prober',   gene:'CONTROL',  phase:Math.PI,     speed:1.6,ink:'#ff5b36',does:'reaches for what we never offered'}),
  y:Object.freeze({name:'Dweller',  gene:'CULTIVATE',phase:Math.PI*1.5, speed:.6, ink:'#e6c25c',does:'returns, day after day'})
});
const STORY=Object.freeze([
  'Every request to this site is an encounter.',
  'The first time anyone asks for a path, a place condenses. When two places would collide, one divides and both sink a rank deeper.',
  'Every visitor becomes a being. Private recognition condenses into an opaque body genome; the measurements themselves never enter the public skin.',
  'They walk the edges of that space — up onto long roads, down into fine ones — and give way to whoever has further to go.'
]);
const STORY_DE=Object.freeze(['Jede Anfrage an diese Seite ist eine Begegnung.','Wenn zum ersten Mal ein Pfad angefragt wird, entsteht ein Ort. Treffen zwei Orte aufeinander, teilt sich ihr Raum und beide sinken einen Rang tiefer.','Jeder Besucher wird zu einem Being. Private Erkennung verdichtet sich zu einem undurchsichtigen Körpergenom; die Messdaten selbst gelangen nie in die öffentliche Haut.','Sie gehen entlang der Kanten dieses Raums: hinauf auf lange Wege, hinunter in feine. Wer weiter muss, bekommt Vorfahrt.']);
const stories=()=>globalThis.SSSWorldView?.language==='de'?STORY_DE:STORY;
const KIND_DE={w:'schreibt erfolgreich in unsere offenen Schnittstellen',x:'liest in einem einzelnen Besuch',z:'trifft auf eine abgewiesene Anfrage',y:'kehrt an mehreren Tagen zurück'};

/* Public encounters compose a place. Four equal-rank constituents become one
 * parent; incomplete groups remain independently present. Blocks are source
 * prefix summaries, not another address registry or a catalog of time states. */
function buildVisits(projection){
  const genomes=new Map((projection.crawlers||[]).map(c=>[c.id,String(c.genome||c.id)])),places=new Map();
  for(const [order,e]of (projection.encounters||[]).entries()){
    const t=Date.parse(e.t);if(!Number.isFinite(t))continue;
    let p=places.get(e.path);if(!p)places.set(e.path,p={events:[],levels:[],visitors:[]});
    p.events.push({t,id:e.crawler,order});
  }
  function prepare(p){
    if(p.ready)return;p.events.sort((a,b)=>a.t-b.t||a.order-b.order);const ids=new Set();
    p.levels[0]=p.events.map(e=>{ids.add(e.id);p.visitors.push(ids.size);const g=genomes.get(e.id)||e.id,seed=parseInt(g.slice(0,8),16)>>>0,phase=seed/4294967296*Math.PI*2;return {count:1,rank:0,re:Math.cos(phase),im:Math.sin(phase),form:Array.from({length:4},(_,i)=>.6+.4*((seed>>>(i*8))&255)/255),children:null}});
    for(let rank=1;p.levels[rank-1].length>=4;rank++){
      const prev=p.levels[rank-1],next=[];
      for(let i=0;i+3<prev.length;i+=4){const children=prev.slice(i,i+4);next.push({count:children.reduce((n,c)=>n+c.count,0),rank,re:children.reduce((n,c)=>n+c.re,0),im:children.reduce((n,c)=>n+c.im,0),form:[0,1,2,3].map(i=>children.reduce((n,c)=>n+c.form[i],0)),children})}p.levels.push(next);
    }p.ready=true;
  }
  function at(path,t){const p=places.get(path);if(!p)return {count:0,beings:0,roots:[]};prepare(p);
    let lo=0,hi=p.events.length;while(lo<hi){const mid=(lo+hi)>>>1;if(p.events[mid].t<=t)lo=mid+1;else hi=mid}
    const count=lo,roots=[];let offset=0,remaining=count;
    for(let r=p.levels.length-1;r>=0;r--){const size=4**r;while(remaining>=size){roots.push({node:p.levels[r][offset/size],offset});offset+=size;remaining-=size}}
    return {count,beings:count?p.visitors[count-1]:0,roots};
  }
  return {at,places};
}
function placeVisits(path,t){return VISITS?.at(path,t)||{count:0,beings:0,roots:[]}}

/* ============ field shader — the bait-space as paper: dark ground, faint halftone ink ============ */
const shader={
  id:'shader:organism:crawlerbait',
  clear:[0.039,0.043,0.039,1],
  fallbackAlpha:.12,
  state:Object.freeze({blend:true,depthTest:true,depthWrite:false}),
  fragment:`#version 300 es
precision highp float;
in vec3 vN;
in vec3 vW;
in float vRegion;
uniform float uTime;
uniform float uFocus;
uniform vec2 uResolution;
uniform vec3 uPalette[4];
out vec4 outColor;
void main(){
  vec3 n=normalize(vN);
  vec3 eye=normalize(vec3(0.,0.,3.2)-vW);
  float fres=pow(1.-abs(dot(n,eye)),1.4);
  float light=clamp(.5+.5*dot(n,normalize(vec3(-.45,.55,.7))),0.,1.);
  float tone=.05+.22*fres+.07*light;
  float a=.46;vec2 q=mat2(cos(a),-sin(a),sin(a),cos(a))*gl_FragCoord.xy/3.6;
  float r=length(fract(q)-.5),rad=sqrt(tone)*.52,dotv=1.-smoothstep(rad-.08,rad+.08,r);
  float selected=(uFocus<-.5||abs(vRegion-uFocus)<.2)?1.:.55;
  vec3 ink=vec3(.925,.898,.827);
  outColor=vec4(ink,(.018+.13*dotv*tone*2.2)*selected);
}`
};

/* ============ Sierpinski address geometry: points are vertices, paths walk edges ============ */
const GI={w:0,x:1,z:2,y:3};
const V0=[[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]].map(v=>{const m=Math.hypot(...v);return v.map(n=>n/m)});
const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2];
const child=(t,i)=>t.map((p,j)=>i===j?p:mid(t[i],p));
const cellIn=(t,s)=>{for(const g of s)t=child(t,GI[g]);return t};
const pointCache=new Map();
function pointOf(s){let p=pointCache.get(s);if(!p){p=cellIn(V0,s)[GI[s[s.length-1]]];pointCache.set(s,p)}return p}
/* from the point addressed by s inside tet t, walk edges to corner k of t */
function toCorner(s,t,k){const a=GI[s[0]],rest=s.slice(1);
  if(!rest.length)return a===k?[t[a]]:[t[a],t[k]];
  const sub=toCorner(rest,child(t,a),k);if(a!==k)sub.push(t[k]);return sub}
function route(sa,sb){
  if(sa===sb)return [pointOf(sa)];
  let p=0;while(p<sa.length&&p<sb.length&&sa[p]===sb[p])p++;
  const u=sa.slice(0,p),C=cellIn(V0,u),ra=sa.slice(p),rb=sb.slice(p);
  if(!ra.length)return toCorner(rb,C,GI[u[u.length-1]]).reverse();
  if(!rb.length)return toCorner(ra,C,GI[u[u.length-1]]);
  const a=GI[ra[0]],b=GI[rb[0]],m=mid(C[a],C[b]);
  const pa=ra.length===1?[C[a],m]:toCorner(ra.slice(1),child(C,a),b);
  const pb=(rb.length===1?[C[b],m]:toCorner(rb.slice(1),child(C,b),a)).reverse();
  return pa.concat(pb.slice(1))}

/* The current prefix-free public addresses contain every digit needed to replay earlier
 * collisions. Identity is the public path, never its changing address. Legacy sightings
 * are a baseline, not invented exact births inside the whole-traffic clock. */
function buildGrowth(routes=[]){
  const histories=new Map(),leaves=new Map(),splits=new Set(),births=[];let changes;
  const ordered=routes.filter(r=>/^[wxzy]+$/.test(r.address)).map(r=>({r,t:r.legacy_404_observations>0?-Infinity:(Date.parse(r.first_seen)||Infinity)}))
    .sort((a,b)=>a.t-b.t||a.r.path.localeCompare(b.r.path));
  const put=(r,a,t,from=null)=>{leaves.set(a,r);let h=histories.get(r.path);if(!h)histories.set(r.path,h=[]);h.push({t,a});changes.push({r,from,to:a})};
  for(const {r,t} of ordered){changes=[];let a=r.address[0];
    for(;;){const old=leaves.get(a);
      if(old){leaves.delete(a);let n=a.length+1;while(old.address.slice(0,n)===r.address.slice(0,n))n++;
        for(let d=a.length;d<n;d++)splits.add(a+r.address.slice(a.length,d));
        put(old,old.address.slice(0,n),t,a);a=r.address.slice(0,n);break}
      if(splits.has(a)){a=r.address.slice(0,a.length+1);continue}break}
    put(r,a,t);births.push({r,t,changes});
  }
  const upper=(list,t)=>{let lo=0,hi=list.length;while(lo<hi){const m=(lo+hi)>>>1;if(list[m].t<=t)lo=m+1;else hi=m}return lo};
  return {births,histories,index:t=>upper(births,t),address(path,t){const h=histories.get(path);const i=h?upper(h,t):0;return i?h[i-1].a:null},
    routesAt(t){return births.slice(0,upper(births,t)).map(({r})=>({...r,address:this.address(r.path,t)}))}};
}

/* One fold is either a Bait or the sum of its four children. Replay edits only
 * the changed genealogy, sharing every untouched child. No catalog of historical
 * roots is retained: reverse deltas walk the same law when the clock rewinds.
 * The full public projection remains source; this is generation-local geometry. */
function createBaitFold(G,carrier=globalThis.SSSRecursiveFold){
  if(!carrier?.create)throw new Error('Display recursive fold carrier missing');
  const tissue=carrier.create();let root=tissue.empty,cursor=0,revision=0,edits=0,visited=0;
  function replace(path,value=tissue.empty){const change=tissue.replace(root,path,value);root=change.root;edits+=change.edits;if(change.edits||!path)revision++}
  function seek(t){
    const end=G.index(t);edits=0;
    while(cursor<end){for(const d of G.births[cursor++].changes){if(d.from)replace(d.from);replace(d.to,tissue.leaf(d.r))}}
    while(cursor>end){const ds=G.births[--cursor].changes;for(let i=ds.length-1;i>=0;i--){const d=ds[i];replace(d.to);if(d.from)replace(d.from,tissue.leaf(d.r))}}
    return revision;
  }
  function routeAt(path){const n=tissue.at(root,path);return n?.value?{...n.value,address:path}:null}
  function view(container='',{context=false}={}){
    const v=tissue.view(root,{container,context,project({path,count,value,open}){
      if(value)return {noun:value.path,de:value.path,en:value.path,bait:true,address:path};
      if(open)return {noun:path||'Crawlerbait',de:path||'Crawlerbait',en:path||'Crawlerbait',gene:'CREATE'};
      return {noun:count?`${count} within ${path}`:'open',fold:true,count};
    }});visited=v.visited;
    const points=v.terminals.map(({path,count,value,within})=>{
      if(value){const route={...value,address:path};return Object.freeze({id:`bait:${route.path}`,gene:path[0],path,kind:'bait',anchor:'cell',context:!within,label:placeName(route.path),
        meta:`${path} · ${route.raw_requests??route.observed_404??0} requests · ${route.crawlers?.length??route.signatures?.length??0} beings`,address:path,route})}
      return Object.freeze({id:'fold:'+path,gene:path[0],path,kind:'holon',context:!within,fold:true,label:`${count} ${word('Orte','places')}`,
        meta:`${count} Baits · click to enter`,count});
    });
    return {root:v.root,points,revision,container};
  }
  return Object.freeze({seek,view,routeAt,get root(){return root},get index(){return cursor},get work(){return {edits,visited}}});
}
function prefixFacts(events,t){
  let lo=0,hi=events.length;while(lo<hi){const m=(lo+hi)>>>1;if(events[m].t<=t)lo=m+1;else hi=m}
  return lo?events[lo-1].facts:{events:0,days:0,baits:0,k:'x'};
}
function publicFacts(events){
  const days=new Set(),baits=new Set();let feeder=false,prober=false;
  for(let i=0;i<events.length;i++){const e=events[i],status=Number(e.status)||0,read=['GET','HEAD','OPTIONS'].includes(String(e.method||'').toUpperCase());
    days.add(Math.floor(e.t/86400000));baits.add(e.path||e.a);feeder ||= !read&&status>0&&status<300;
    prober ||= status>=400&&status<500||!read&&!(status>0&&status<300);
    e.facts={events:i+1,days:days.size,baits:baits.size,k:feeder?'w':prober?'z':days.size>1?'y':'x'};
  }return events;
}
function walkGeometry(S){
  const pts=[pointOf(S.wps[0].a)],wd=[0];let L=0;
  for(let j=1;j<S.wps.length;j++){const r=route(S.wps[j-1].a,S.wps[j].a);
    for(let i=1;i<r.length;i++){const q=pts.at(-1),d=Math.hypot(...r[i].map((v,k)=>v-q[k]));if(d<1e-7)continue;L+=d;pts.push(r[i])}wd.push(L)}
  const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(...pts[i].map((v,k)=>v-pts[i-1][k])));
  Object.assign(S,{pts,cum,wd,L});
}
function syncWalk(o,T){
  const S=o.S,G=SIM.life.growth,revision=G.index(T);if(S.revision===revision)return;
  const i=Math.min(o.reached,S.wps.length-1),span=(S.wd[i+1]??S.wd[i])-S.wd[i],u=span>0?(o.dist-S.wd[i])/span:0;
  for(const w of S.wps)w.a=G.address(w.path,T)||G.histories.get(w.path)?.[0].a||w.a;
  walkGeometry(S);o.dist=S.wd[i]+u*((S.wd[i+1]??S.wd[i])-S.wd[i]);o.seg=0;S.revision=revision;
}

/* ============ beings and their walks — recorded order is truth, pace is the body's own ============ */
const DAY=86400,GAP=8*3600,LEAD=1800,LINGER=12*3600,DISS=5*3600,V_BASE=2.4/DAY,V_REAL=.035;
const bytesOf=hex=>{const b=[];for(let i=0;i+1<hex.length;i+=2)b.push(parseInt(hex.slice(i,i+2),16));while(b.length<32)b.push(0);return b};
function buildLife(projection,G=null){
  const enc=Array.isArray(projection?.encounters)?projection.encounters:[];
  const crawlers=Array.isArray(projection?.crawlers)?projection.crawlers:[];
  if(!enc.length||!crawlers.length)return null;
  const by=new Map();let t0=Infinity;
  for(const e of enc){if(!e||typeof e.bait_address!=='string'||!/^[wxzy]+$/.test(e.bait_address))continue;const t=Date.parse(e.t);if(!isFinite(t))continue;if(t<t0)t0=t;let l=by.get(e.crawler);if(!l)by.set(e.crawler,l=[]);l.push({t,a:e.bait_address,path:e.path,method:e.method,status:e.status})}
  const end=Date.parse(projection.raw_capture_end||projection.updated_at)||t0;
  G ||= buildGrowth(projection.routes||[]);
  const sessions=[],totals={w:0,x:0,z:0,y:0};
  for(const c of crawlers){
    const k=KIND[c.kind]?c.kind:'x';totals[k]++;
    const es=publicFacts((by.get(c.id)||[]).sort((a,b)=>a.t-b.t));if(!es.length)continue;
    const dna=String(c.genome||c.id),g=bytesOf(dna.padEnd(64,'0'));
    const days=new Set(es.map(e=>new Date(e.t).toISOString().slice(0,10))).size,baits=new Set(es.map(e=>e.a)).size;
    const b={id:c.id,k,events:c.events||es.length,days,baits,history:es};
    let cur=null;
    for(const e of es){const t=Math.round((e.t-t0)/1000);
      if(!cur||t-cur.tLast>GAP){cur={b,g,wps:[],tLast:t};sessions.push(cur)}
      const w=cur.wps[cur.wps.length-1];if(w&&w.a===e.a)w.n++;else cur.wps.push({a:e.a,path:e.path,t,n:1});cur.tLast=t}
  }
  for(const S of sessions){S.t0=S.wps[0].t;S.size=.02*(1+Math.log10(Math.max(1,S.b.events))*.3)}
  sessions.sort((a,b)=>a.t0-b.t0);
  return {key:projection.updated_at||'',t0,seconds:Math.max(1,Math.round((end-t0)/1000)),sessions,totals,growth:G};
}

// Geometry is demanded by a session's first temporal admission, rather than
// preparing every future walk before the first encounter can be seen.
function prepareWalk(S){
  if(S.prepared)return S;walkGeometry(S);const L=S.L;
  S.v=Math.max(V_BASE*KIND[S.b.k].speed*(.85+S.g[9]/255*.3),L/(1.5*DAY));
  S.tEnd=S.tLast+L/S.v+LINGER+DISS;S.prepared=true;return S;
}

/* ============ simulation ============ */
const TETL=[[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]].map(v=>v.map(n=>n/Math.sqrt(3)));
const EDGES=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
const FACEN=[[0,1,2],[0,1,3],[0,2,3],[1,2,3]].map(f=>{const c=[0,1,2].map(k=>(TETL[f[0]][k]+TETL[f[1]][k]+TETL[f[2]][k])/3);const m=Math.hypot(...c);return c.map(v=>v/m)});
function rot(axis,ang,v){const c=Math.cos(ang),s=Math.sin(ang),[x,y,z]=axis,d=x*v[0]+y*v[1]+z*v[2];
  return [v[0]*c+(y*v[2]-z*v[1])*s+x*d*(1-c),v[1]*c+(z*v[0]-x*v[2])*s+y*d*(1-c),v[2]*c+(x*v[1]-y*v[0])*s+z*d*(1-c)]}
const MAXS=90000;
const SIM={life:null,simT:0,paceLog:3.2,paceCur:3.2,playing:true,alive:new Set(),drops:[],cursor:0,lastMs:0,container:'',
  sPos:new Float32Array(MAXS*7),ns:0,counts:{w:0,x:0,z:0,y:0},perf:{upd:0,splats:0},resolved:0,colonies:0};
/* a splat adds w·(1−r²)³·coh·e^{iφ} to the complex field and w to its density; coh < 1 lets one splat carry a crowd whose phases partly cancel */
function splat(x,y,z,r,w,ph,coh=1){if(SIM.ns>=MAXS||w<=.001)return;const o=SIM.ns++*7,a=SIM.sPos;a[o]=x;a[o+1]=y;a[o+2]=z;a[o+3]=r*2.2;a[o+4]=w;a[o+5]=ph;a[o+6]=coh}
function posAt(S,dist,o){const c=S.cum;while(o.seg<c.length-2&&c[o.seg+1]<dist)o.seg++;while(o.seg>0&&c[o.seg]>dist)o.seg--;
  const i=o.seg,a=S.pts[i],b=S.pts[Math.min(i+1,S.pts.length-1)],L=(i+1<c.length?c[i+1]:c[i])-c[i],u=L>0?(dist-c[i])/L:0;
  return {p:[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u],seg:L,dir:L>0?[(b[0]-a[0])/L,(b[1]-a[1])/L,(b[2]-a[2])/L]:[0,0,0]}}
function allowed(S,t,o){let j=o?o.j||0:0;if(o&&o.jt>t)j=0;while(j+1<S.wps.length&&S.wps[j+1].t<=t)j++;if(o){o.j=j;o.jt=t}return j}
function spawn(S){const o={S,seg:0,hot:0,trail:[],off:[0,0,0],head:[0,0,0],done:null,fade:0,slow:1,fine:0,coarseKey:null,facts:prefixFacts(S.b.history,SIM.life.t0+SIM.simT*1000)};
  const j=allowed(S,SIM.simT,o);o.dist=S.wd[j];o.reached=j;const r=posAt(S,o.dist,o);o.base=r.p;o.p=r.p.slice();S.o=o;SIM.alive.add(o)}
function despawn(o){o.S.o=null;SIM.alive.delete(o)}
function resetTo(t){for(const o of [...SIM.alive])despawn(o);SIM.drops.length=0;SIM.simT=t;SIM.cursor=0}
/* The existing Display content relation: each cell halves per digit, its content
 * lives two ranks inside it. A Being is content of the Bait it contacts. During
 * an earned walk, interpolate the two actual cell spans logarithmically, just as
 * Display interpolates its camera scale. Adding a shared prefix halves every
 * world length while doubling focus, without a second camera/body-size law. */
const CONTENT_RANKS=2;
function word(de,en){return globalThis.SSSWorldView?.language==='de'?de:en}
function placeName(path){const opaque=/\/~\/([0-9a-f]{24})/.exec(path);return opaque?word('Ort','Place')+' '+opaque[1].slice(0,4).toUpperCase():path}
function beingFrame(o){
  const S=o.S,i=o.reached,a=S.wps[i].a,b=S.wps[Math.min(i+1,S.wps.length-1)].a;
  const length=(S.wd[i+1]??S.wd[i])-S.wd[i];
  const u=length>0?Math.max(0,Math.min(1,(o.dist-S.wd[i])/length)):0;
  const span=Math.pow(2,-(a.length+(b.length-a.length)*u));
  return {container:a.slice(0,-1),unit:span/Math.pow(2,CONTENT_RANKS*2),scale:1.02/(2*span)};
}
function bodySize(o){return beingFrame(o).unit*(1+Math.log10(Math.max(1,o.facts.events))*.3)}
function body(o,now,pxOf){
  const S=o.S,g=S.g,k=o.facts.k,sz=o.radius,f=o.fade*o.fine,t=now*.001,P=o.p;
  if(pxOf(P,sz)<4){const ph=KIND[k].phase;splat(P[0],P[1],P[2],sz*.62,f,ph);const tr=o.trail;for(let i=tr.length-1;i>=0;i-=3){const a=i/tr.length;splat(tr[i][0],tr[i][1],tr[i][2],sz*(.2+.22*a),.9*a*a*f,ph)}return}
  const ph0=KIND[k].phase+(g[4]/255-.5)*.5;
  const axis=S.axis||(S.axis=(()=>{const v=[g[10]/255-.5,g[11]/255-.5,g[12]/255-.5];const m=Math.hypot(...v)||1;return v.map(x=>x/m)})());
  const spin=t*(.25+g[13]/255*.4)+(g[14]/255)*6.28,an=[.8+g[0]/255*.4,.8+g[1]/255*.4,.8+g[2]/255*.4],h=o.head;
  const put=(v,sc)=>{const r=rot(axis,spin,[v[0]*an[0],v[1]*an[1],v[2]*an[2]]);return [P[0]+r[0]*sc,P[1]+r[1]*sc,P[2]+r[2]*sc]};
  const core=TETL.map(v=>put(v,sz*.75));
  // the tetrahedral skeleton the goo clings to: corners + edge midpoints
  if(o===CAM.o)splat(P[0],P[1],P[2],sz*1.5,.34*f,0,0); // the followed one wears a halo of bone
  core.forEach((c,i)=>splat(c[0],c[1],c[2],sz*.3,f,ph0+i*.14));
  EDGES.forEach(([a,b],i)=>{const m=mid(core[a],core[b]);splat(m[0],m[1],m[2],sz*.22,.85*f,ph0+.08+i*.07)});
  if(k==='x'){ // Harvester: the Sierpinski copy of itself, beads jostling
    splat(P[0],P[1],P[2],sz*.42,f,ph0);
    core.forEach((c,i)=>{const w=1+.12*Math.sin(t*3.1+i*1.7);splat(P[0]+(c[0]-P[0])*1.55*w,P[1]+(c[1]-P[1])*1.55*w,P[2]+(c[2]-P[2])*1.55*w,sz*.3,f,ph0+.1+i*.05)});
  }else if(k==='z'){ // Prober: Rosensweig spikes, one per distinct bait sought, reaching where it goes
    splat(P[0],P[1],P[2],sz*.55,f,ph0);
    const n=3+Math.min(12,Math.round(Math.log2(1+o.facts.baits)*2.2)),reach=.45+.55*o.hot;
    for(let i=0;i<n;i++){const yy=1-2*(i+.5)/n,rr=Math.sqrt(1-yy*yy),th=i*2.39996;
      let d=rot(axis,spin*.5,[Math.cos(th)*rr,yy,Math.sin(th)*rr]);d=[d[0]+h[0]*.7,d[1]+h[1]*.7,d[2]+h[2]*.7];const dm=Math.hypot(...d)||1;d=d.map(x=>x/dm);
      const act=(.3+.7*(.5+.5*Math.sin(t*(1.3+g[(15+i)%32]/255*1.6)+i*1.9)))*reach,Ls=sz*(.9+g[5]/255*.9)*act;
      for(let j=0;j<6;j++){const dd=sz*.32+j*.3*Ls;splat(P[0]+d[0]*dd,P[1]+d[1]*dd,P[2]+d[2]*dd,sz*.26*(1-j*.15),.95*f,ph0+.05*j)}}
  }else if(k==='y'){ // Dweller: one segment per day it came back, following its own trail
    const segs=Math.min(6,o.facts.days+1),tr=o.trail;
    for(let i=0;i<segs;i++){const q=tr.length?tr[Math.max(0,tr.length-1-i*3)]:P,sc=Math.pow(.86,i);
      splat(q[0],q[1],q[2],sz*.46*sc,f,ph0+i*.5);
      TETL.forEach((v,vi)=>{const r=rot(axis,spin+i*.6,v);splat(q[0]+r[0]*sz*.5*sc,q[1]+r[1]*sz*.5*sc,q[2]+r[2]*sz*.5*sc,sz*.2*sc,.8*f,ph0+i*.5+vi*.3)})}
  }else{ // Feeder: droplets bud from its faces and pinch off
    splat(P[0],P[1],P[2],sz*.5,f,ph0);
    FACEN.forEach((nv,fi)=>{const u=(t*.35+fi*.25+g[6]/255)%1,r=rot(axis,spin,nv),dd=sz*(.45+1.2*u);
      splat(P[0]+r[0]*dd,P[1]+r[1]*dd,P[2]+r[2]*dd,sz*.28,f*Math.pow(1-u,.6),ph0+.8+fi*.4)});
  }
  // trail: the same goo, thinning; below threshold it breaks into droplets by itself
  const tr=o.trail,N=tr.length;
  for(let i=0;i<N;i++){const a=i/N,q=tr[i];splat(q[0],q[1],q[2],sz*(.14+.2*a),.8*a*a*f,ph0+a*.6)}
}
/* a colony clings to its own Sierpinski cell: the cell is its skeleton, its mass the sum of its members,
 * its phase their complex sum — kin print in their ink, strangers cancel into bone */
const colonyCache=new Map();
function colonyGeom(key){
  let g=colonyCache.get(key);
  if(!g){const t=cellIn(V0,key),cen=[0,1,2].map(k=>(t[0][k]+t[1][k]+t[2][k]+t[3][k])/4),edge=Math.hypot(t[0][0]-t[1][0],t[0][1]-t[1][1],t[0][2]-t[1][2]);
    const inset=v=>v.map((x,k)=>cen[k]+(x-cen[k])*.52),corners=t.map(inset);
    g={cen,edge,nodes:corners.concat(EDGES.map(([i,j])=>mid(corners[i],corners[j]))),seed:(key.length*7+[...key].reduce((s,ch)=>s*4+GI[ch],0))%997};
    if(colonyCache.size>4096)colonyCache.clear();colonyCache.set(key,g)}
  return g;
}
function colony(key,c,now){
  const g=colonyGeom(key);
  const f=c.f/c.n,amp=Math.hypot(c.re,c.im),coh=amp/Math.max(c.f,1e-6),ph=Math.atan2(c.im,c.re);
  const mass=Math.log10(1+c.n),w=f*Math.min(1.25,.62+.32*mass),t=now*.001;
  const r0=g.edge*(.1+.05*Math.min(2,mass))*(1+.06*Math.sin(t*.9+g.seed));
  splat(g.cen[0],g.cen[1],g.cen[2],r0*1.25,w,ph,coh);
  g.nodes.forEach((q,i)=>splat(q[0],q[1],q[2],r0*(i<4?.95:.72)*(1+.08*Math.sin(t*1.7+g.seed+i*1.3)),w*(i<4?1:.85),ph+(i<4?.04*i:0),coh));
}
/* a being between colonies: one droplet of its own ink, thinning behind it */
function droplet(o,now){
  const G=colonyGeom(o.cell),r=G.edge*.075,ph=KIND[o.facts.k].phase+(o.S.g[4]/255-.5)*.5,f=o.fade,tr=o.ctrail||[];
  if(o.transit)splat(o.cp[0],o.cp[1],o.cp[2],r,f,ph);
  for(let i=0;i<tr.length;i++){const a=(i+1)/tr.length,q=tr[i];splat(q[0],q[1],q[2],r*(.45+.45*a),.8*a*a*f,ph)}
}
/* Display: content sits two ranks below its container. Baits are the field's content (container + 2);
 * beings are the content of baits, so they resolve two ranks further down. */
const BEING_RANKS=CONTENT_RANKS*2;
function resolutionCell(a,pxOf){
  for(let i=1;i<a.length;i++){
    const key=a.slice(0,i),g=colonyGeom(key);
    if(pxOf(g.cen,Math.pow(2,-(i+BEING_RANKS)))<4)return key;
  }
  return '';
}
const grid=new Map(),cellKey=(x,y,z)=>((x*73856093)^(y*19349663)^(z*83492791))|0;
function step(dt,now,pxOf){
  const L=SIM.life;if(!L)return;
  SIM.paceCur+=(SIM.paceLog-SIM.paceCur)*Math.min(1,dt*2.5);
  const dts=SIM.playing?dt*Math.pow(10,SIM.paceCur):0;
  if(SIM.playing){SIM.simT+=dts;if(SIM.simT>L.seconds)resetTo(0)}
  const T=SIM.simT,ss=L.sessions;
  // spawn by time: sessions are sorted by start, so only a window needs scanning
  while(SIM.cursor<ss.length&&ss[SIM.cursor].t0-LEAD<=T){const S=prepareWalk(ss[SIM.cursor++]);if(T<=S.tEnd&&!S.o)spawn(S)}
  for(const o of SIM.alive)if(T>o.S.tEnd||T<o.S.t0-LEAD)despawn(o);
  const C=SIM.container,crowd=new Map();
  for(const o of SIM.alive){const S=o.S;o.facts=prefixFacts(S.b.history,L.t0+T*1000);syncWalk(o,L.t0+T*1000);const lim=S.wd[allowed(S,T,o)];
    let r=posAt(S,o.dist,o);const hw=Math.min(3,.7+1.3*Math.sqrt(r.seg/.08));
    // never before a recorded time; at slow pace the body still crawls at its own real speed
    o.dist=Math.min(lim,o.dist+Math.max(S.v*dts,SIM.playing?V_REAL*dt:0)*hw*o.slow);
    r=posAt(S,o.dist,o);o.base=r.p;
    for(let k=0;k<3;k++)o.head[k]+=(r.dir[k]-o.head[k])*Math.min(1,dt*4);
    while(o.reached+1<S.wps.length&&o.dist>=S.wd[o.reached+1]-1e-9){o.reached++;const w=S.wps[o.reached];SIM.drops.push({a:w.a,p:pointOf(w.a),t:now,w:Math.min(1,.4+Math.log10(1+w.n)*.35),ph:KIND[o.facts.k].phase});o.hot=1}
    o.hot*=Math.exp(-dt*1.2);
    if(o.done==null&&o.dist>=S.L-1e-9&&T>=S.tLast)o.done=T;
    const inF=Math.min(1,(T-(S.t0-LEAD))/LEAD),outF=o.done==null?1:1-Math.max(0,T-o.done-LINGER)/DISS;o.fade=Math.max(0,Math.min(inF,outF));
    o.radius=bodySize(o);o.pri=S.v*(S.L-o.dist+S.size);for(let k=0;k<3;k++)o.p[k]=o.base[k]+o.off[k];
    /* COARSE RESOLUTION — Display's pool law, applied to beings: a being is its own body only while the bait it
     * last touched resolves on screen; deeper it belongs to the projected cell's colony. Selection
     * does not exclude visible siblings. Coalesced beings keep walking but pay no separate body. */
    const a=S.wps[o.reached].a;o.coarseKey=resolutionCell(a,pxOf)||a;o.cell=resolutionCell(a,pxOf);
    if(o.cell)crowd.set(o.cell,(crowd.get(o.cell)||0)+1)}
  // coalescence is joining: a being alone in its cell has nothing to join and stays itself
  for(const o of SIM.alive){if(o.cell&&(crowd.get(o.cell)<2||o===CAM.o||lockedBeing()===o.S.b.id))o.cell='';if(o.cell!==''&&o.trail.length){o.trail.length=0;o.off[0]=o.off[1]=o.off[2]=0}}
  /* COARSE WALK — a coalesced being still walks, at the viewed resolution: every change of its rank-H cell is one
   * coarse step, taken along the Sierpinski edges between the two cells. Six fine steps may become two coarse ones,
   * but they still happen: a droplet pinches off one colony and flows into the next. */
  for(const o of SIM.alive){
    if(!o.cell){o.ck=null;o.cp=null;o.transit=false;o.wasFine=o.cell==='';continue}
    const G=colonyGeom(o.cell);
    if(!o.cp)o.cp=o.wasFine?o.p.slice():G.cen.slice();
    if(o.ck!==o.cell){
      const pts=[o.cp.slice()];if(o.ck)for(const q of route(o.ck,o.cell))pts.push(q);pts.push(G.cen);
      const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1],pts[i][2]-pts[i-1][2]));
      o.cpath=pts;o.ccum=cum;o.cu=0;o.cseg=0;o.ck=o.cell;o.ctrail=o.ctrail||[];
    }
    const Lc=o.ccum[o.ccum.length-1];
    if(o.cu<Lc){
      o.cu=Math.min(Lc,o.cu+Math.max(Lc/.9,G.edge*1.4)*dt);
      while(o.cseg<o.ccum.length-2&&o.ccum[o.cseg+1]<o.cu)o.cseg++;
      const i=o.cseg,a0=o.cpath[i],b0=o.cpath[i+1]||a0,sl=(o.ccum[i+1]??o.ccum[i])-o.ccum[i],u=sl>0?(o.cu-o.ccum[i])/sl:1;
      o.cp=[a0[0]+(b0[0]-a0[0])*u,a0[1]+(b0[1]-a0[1])*u,a0[2]+(b0[2]-a0[2])*u];
      o.ctrail.push(o.cp);if(o.ctrail.length>10)o.ctrail.shift();
    }else if(o.ctrail&&o.ctrail.length)o.ctrail.shift();
    o.transit=o.cu<Lc-1e-9;o.wasFine=false;
  }
  // right of way, felt through actual bodies: further to go and faster passes; the other gives way sideways and slows
  let maxRadius=0;for(const o of SIM.alive)if(o.cell==='')maxRadius=Math.max(maxRadius,o.radius);
  const cs=maxRadius*3.2||1;grid.clear();
  for(const o of SIM.alive){if(o.cell!=='')continue;const key=cellKey(Math.floor(o.p[0]/cs),Math.floor(o.p[1]/cs),Math.floor(o.p[2]/cs));let l=grid.get(key);if(!l)grid.set(key,l=[]);l.push(o)}
  for(const o of SIM.alive){if(o.cell!==''){o.slow=1;continue}const push=[0,0,0];let slow=1;const b=o.p,R0=o.radius*1.6;
    const gx=Math.floor(b[0]/cs),gy=Math.floor(b[1]/cs),gz=Math.floor(b[2]/cs);
    for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){const l=grid.get(cellKey(gx+x,gy+y,gz+z));if(!l)continue;
      for(const q of l){if(q===o)continue;const R=R0+q.radius*1.6,d0=b[0]-q.p[0],d1=b[1]-q.p[1],d2=b[2]-q.p[2];let dl=Math.sqrt(d0*d0+d1*d1+d2*d2);if(dl>=R)continue;let d=[d0,d1,d2];
        if(dl<1e-6){const g=o.S.g;d=[g[20]/255-.5,g[21]/255-.5,g[22]/255-.5];dl=1e-6}
        const dm=Math.sqrt(d[0]*d[0]+d[1]*d[1]+d[2]*d[2])||1,s=(1-dl/R)*R,yields=(o.pri<q.pri||(o.pri===q.pri&&o.S.b.id<q.S.b.id)),share=yields?.85:.15;
        push[0]+=d[0]/dm*s*share;push[1]+=d[1]/dm*s*share;push[2]+=d[2]/dm*s*share;if(yields)slow=Math.min(slow,.3+.7*dl/R)}}
    o.slow=slow;const cap=o.radius*3;
    for(let k=0;k<3;k++){o.off[k]+=push[k]*Math.min(1,dt*6);o.off[k]*=Math.exp(-dt*.6)}
    const om=Math.sqrt(o.off[0]*o.off[0]+o.off[1]*o.off[1]+o.off[2]*o.off[2]);if(om>cap)for(let k=0;k<3;k++)o.off[k]*=cap/om;
    for(let k=0;k<3;k++)o.p[k]=o.base[k]+o.off[k];
    const tl=o.trail[o.trail.length-1];if(!tl||Math.hypot(o.p[0]-tl[0],o.p[1]-tl[1],o.p[2]-tl[2])>o.radius*.18){o.trail.push(o.p.slice());if(o.trail.length>34)o.trail.shift()}}
  // Resolution blends complementary shares; changing container does not cut a body away.
  for(const o of SIM.alive){const target=o.cell===''?1:0;o.fine+=(target-o.fine)*(1-Math.exp(-dt*7));if(Math.abs(target-o.fine)<.001)o.fine=target}
  // print every body into the field
  SIM.ns=0;const counts={w:0,x:0,z:0,y:0},cols=new Map();let resolved=0;
  for(const o of SIM.alive){counts[o.facts.k]++;if(o.fade<=0||o.cell===null)continue;
    if(o.fine>.001){resolved++;body(o,now,pxOf)}
    const share=1-o.fine;if(share<=.001)continue;
    if(o.cell&&o.transit){droplet(o,now);continue}
    const key=o.cell||o.coarseKey;let c=cols.get(key);if(!c)cols.set(key,c={n:0,f:0,re:0,im:0});
    const ph=KIND[o.facts.k].phase+(o.S.g[4]/255-.5)*.5,f=o.fade*share;c.n++;c.f+=f;c.re+=f*Math.cos(ph);c.im+=f*Math.sin(ph)}
  for(const [key,c] of cols)colony(key,c,now);
  SIM.resolved=resolved;SIM.colonies=cols.size;
  for(let i=SIM.drops.length-1;i>=0;i--){const d=SIM.drops[i],age=(now-d.t)/1400;if(age>1){SIM.drops.splice(i,1);continue}
    splat(d.p[0],d.p[1],d.p[2],Math.pow(2,-(d.a.length+BEING_RANKS))*(1.2-age*.5),d.w*Math.min(1,age*6)*(1-age*age),d.ph)}
  SIM.counts=counts;
}

/* ============ GL layer inside the shared field: a complex goo field, then halftone ink ============ */
const SPLAT_V=`#version 300 es
precision highp float;
in vec3 aPos;in float aRad;in float aW;in float aPh;in float aCoh;
uniform mat4 uProj,uView,uModel;uniform float uPx,uMaxPt;
out float vW;out float vPh;out float vCoh;
void main(){vec4 mv=uView*uModel*vec4(aPos,1.);gl_Position=uProj*mv;gl_PointSize=min(uMaxPt,2.*aRad*uPx/max(-mv.z,.01));vW=aW;vPh=aPh;vCoh=aCoh;}`;
const SPLAT_F=`#version 300 es
precision highp float;
in float vW;in float vPh;in float vCoh;out vec4 o;
void main(){vec2 p=gl_PointCoord*2.-1.;float r2=dot(p,p);if(r2>1.)discard;float f=1.-r2;f=f*f*f*vW;o=vec4(f*vCoh*cos(vPh),f*vCoh*sin(vPh),f,0.);}`;
const INK_V=`#version 300 es
precision highp float;
void main(){vec2 p=gl_VertexID==0?vec2(-1.,-1.):(gl_VertexID==1?vec2(3.,-1.):vec2(-1.,3.));gl_Position=vec4(p,0.,1.);}`;
const INK_F=`#version 300 es
precision highp float;
uniform sampler2D tGoo;uniform vec2 uRes;uniform vec2 uTexel;uniform float uCell;uniform vec3 uInk,uBg;uniform vec3 uKinds[4];
out vec4 o;
vec3 riso(float ph){vec3 c=vec3(0.);float s=0.;for(int k=0;k<4;k++){float w=max(0.,cos(ph-float(k)*1.5707963));w*=w*w;c+=w*uKinds[k];s+=w;}return c/max(s,1e-4);}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  vec4 f=texture(tGoo,uv);float d=f.b,T=.5;
  float dx=texture(tGoo,uv+vec2(uTexel.x,0.)).b-texture(tGoo,uv-vec2(uTexel.x,0.)).b;
  float dy=texture(tGoo,uv+vec2(0.,uTexel.y)).b-texture(tGoo,uv-vec2(0.,uTexel.y)).b;
  vec3 n=normalize(vec3(-dx,-dy,.28)),L=normalize(vec3(-.45,.55,.7));
  float diff=clamp(dot(n,L),0.,1.),spec=pow(clamp(dot(reflect(-L,n),vec3(0.,0.,1.)),0.,1.),22.);
  float ph=atan(f.g,f.r),coh=clamp(length(f.rg)/max(d,1e-4),0.,1.);
  float fw=max(fwidth(d),1e-4),m=smoothstep(T-fw,T+fw,d),outline=1.-smoothstep(0.,fw*1.3,abs(d-T));
  float tone=clamp(.04+.78*diff*mix(.25,1.,coh)+spec*.9,0.,1.);
  float a=.46;vec2 q=mat2(cos(a),-sin(a),sin(a),cos(a))*gl_FragCoord.xy/uCell+.22*vec2(cos(ph),sin(ph));
  float r=length(fract(q)-.5),rad=sqrt(tone)*.58,dotv=1.-smoothstep(rad-.07,rad+.07,r);
  float band=abs(fract(ph/6.2831853*3.)-.5)*2.,line=(1.-smoothstep(0.,.07,band))*smoothstep(.2,.5,coh);
  // hue is the argument of the field: each kind prints in its own ink; where strangers mix, phases cancel and the ink falls back to bone
  vec3 kink=mix(uInk,riso(ph),smoothstep(.3,.85,coh)*.92);
  // topographic lines of density carve each body out of a merged mass, so a colony shows what it contains
  float lv=log2(max(d,1e-3))*2.2,topo=(1.-smoothstep(0.,.1,abs(fract(lv)-.5)*2.))*smoothstep(T*1.3,T*2.,d);
  vec3 col=mix(uBg,kink,dotv*m);
  col=mix(col,uBg,topo*m*.7);col=mix(col,kink*1.1,line*m*.35);col=mix(col,uInk,outline*.85);
  o=vec4(col,max(m,outline));
}`;
function hexRgb(h){const n=parseInt(h.slice(1),16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]}
let LAYER=null;
function compile(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
function link(gl,v,f){const p=gl.createProgram();gl.attachShader(p,compile(gl,gl.VERTEX_SHADER,v));gl.attachShader(p,compile(gl,gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p}
function layerFor(gl){
  if(LAYER&&LAYER.gl===gl)return LAYER;
  if(!gl.getExtension('EXT_color_buffer_float')){LAYER={gl,off:'EXT_color_buffer_float unavailable'};return LAYER}
  const sp=link(gl,SPLAT_V,SPLAT_F),ip=link(gl,INK_V,INK_F),copy=link(gl,INK_V,`#version 300 es
precision highp float;uniform sampler2D tInk;uniform vec2 uSize;out vec4 o;void main(){o=texture(tInk,gl_FragCoord.xy/uSize);}`),vao=gl.createVertexArray(),buf=gl.createBuffer();
  gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,SIM.sPos.byteLength,gl.DYNAMIC_DRAW);
  for(const [name,size,off] of [['aPos',3,0],['aRad',1,12],['aW',1,16],['aPh',1,20],['aCoh',1,24]]){const loc=gl.getAttribLocation(sp,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,28,off)}
  const u=(p,n)=>gl.getUniformLocation(p,n);
  LAYER={gl,sp,ip,copy,copyTex:u(copy,'tInk'),copySize:u(copy,'uSize'),inkTex:null,inkFbo:null,vao,ivao:gl.createVertexArray(),buf,tex:null,fbo:null,fw:0,fh:0,maxPt:gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1]||256,
    SU:{proj:u(sp,'uProj'),view:u(sp,'uView'),model:u(sp,'uModel'),px:u(sp,'uPx'),maxPt:u(sp,'uMaxPt')},
    IU:{tex:u(ip,'tGoo'),res:u(ip,'uRes'),texel:u(ip,'uTexel'),cell:u(ip,'uCell'),ink:u(ip,'uInk'),bg:u(ip,'uBg'),kinds:u(ip,'uKinds[0]')},
    kinds:new Float32Array(['w','x','z','y'].flatMap(k=>hexRgb(KIND[k].ink)))};
  return LAYER;
}
function sizeTarget(Lr,w,h){
  const gl=Lr.gl,fw=Math.max(1,Math.round(w*.75)),fh=Math.max(1,Math.round(h*.75));
  if(Lr.fbo&&Lr.fw===fw&&Lr.fh===fh)return;
  if(Lr.tex)gl.deleteTexture(Lr.tex);if(Lr.fbo)gl.deleteFramebuffer(Lr.fbo);
  Lr.tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,Lr.tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA16F,fw,fh,0,gl.RGBA,gl.HALF_FLOAT,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  Lr.fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,Lr.fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,Lr.tex,0);
  if(Lr.inkTex)gl.deleteTexture(Lr.inkTex);if(Lr.inkFbo)gl.deleteFramebuffer(Lr.inkFbo);
  Lr.inkTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,Lr.inkTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,fw,fh,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR);
  for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);
  Lr.inkFbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,Lr.inkFbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,Lr.inkTex,0);
  Lr.fw=fw;Lr.fh=fh;
}
function placeForms(now){
  const t=SIM.life.t0+SIM.simT*1000;
  for(const point of fieldCache?.points||[]){
    const a=point.path,g=colonyGeom(a),span=Math.pow(2,-a.length);
    if(point.fold){splat(...g.cen,span*.045,.34,0,0);continue}
    const visits=placeVisits(point.route.path,t);if(!visits.count)continue;
    const rank=Math.ceil(Math.log(visits.count)/Math.log(4)),scale=span*.23*(1-Math.pow(.5,rank+1));
    for(const {node,offset}of visits.roots){
      let tet=TETL.map(v=>v.map((x,j)=>g.cen[j]+x*scale));
      const digits=rank-node.rank;let n=Math.floor(offset/(4**node.rank)),path='';
      for(let i=0;i<digits;i++){path=GENES[n%4]+path;n=Math.floor(n/4)}tet=cellIn(tet,path);
      const queue=[{node,tet,depth:0}];
      while(queue.length){const q=queue.pop(),p=[0,1,2].map(j=>q.tet.reduce((sum,v)=>sum+v[j],0)/4),r=Math.hypot(...q.tet[0].map((v,j)=>v-p[j])),ph=Math.atan2(q.node.im,q.node.re),coh=Math.hypot(q.node.re,q.node.im)/q.node.count;
        if(q.node.children&&q.depth<2){for(let i=0;i<4;i++)queue.push({node:q.node.children[i],tet:child(q.tet,i),depth:q.depth+1})}
        else{const corners=q.tet.map((v,i)=>{const shape=q.node.form[i]/q.node.count;return v.map((x,j)=>p[j]+(x-p[j])*(.65+.35*shape))});corners.forEach((v,i)=>splat(...v,r*(.22+.12*q.node.form[i]/q.node.count),1,ph,coh));for(const [i,j]of EDGES)splat(...mid(corners[i],corners[j]),r*.25,.85,ph,coh);splat(...p,r*.4,1,ph,coh)}
      }
    }
    // The path vertex is the entrance; its contained place is visibly connected.
    const door=pointOf(a);for(let i=0;i<=6;i++){const u=i/6,p=door.map((v,j)=>v+(g.cen[j]-v)*u);splat(...p,span*.006,.32,0,0)}
  }
}
function typeBodies(now,pxOf){
  const seen=new Set(),out=[],ids=new Set();SIM.ns=0;SIM.typeCounts={w:0,x:0,z:0,y:0};
  const t=SIM.life.t0+SIM.simT*1000;
  for(const S of SIM.life.sessions){const facts=prefixFacts(S.b.history,t);if(!facts.events||ids.has(S.b.id))continue;ids.add(S.b.id);SIM.typeCounts[facts.k]++;if(seen.has(facts.k))continue;seen.add(facts.k);
    const p=colonyGeom(facts.k).cen,o={S,facts,p,head:[0,0,0],trail:[],radius:.065,fade:1,fine:1,hot:0,cell:''};out.push(o);body(o,now,pxOf);
  }
  return out;
}
function afterDraw({gl,context2D,canvas=gl?.canvas,proj,view,model,ms,width,height,dpr,frame,container}){
  if(!SIM.life&&lastProjection){SIM.life=buildLife(lastProjection,growth);resetTo(0)}
  if(!SIM.life)return;
  SIM.container=typeof container==='string'?container:'';
  if(CAM.on&&CAM.o&&SIM.alive.has(CAM.o))SIM.container=beingFrame(CAM.o).container;
  const ms3=Math.hypot(model[0],model[1],model[2]),f=proj[5],pxBase=ms3*f*height/2;
  const pxOf=(P,r)=>{const z=model[2]*P[0]+model[6]*P[1]+model[10]*P[2]+model[14];return r*pxBase/Math.max(.05,3.2-z)};
  SIM.pxOf=pxOf;advance(ms);
  SIM.renderBodies=MODE==='beings'?typeBodies(ms,pxOf):null;
  SIM.placeStart=SIM.ns;if(MODE==='reef')placeForms(ms);
  const screen=screenFrame(proj,view,model,width/(dpr||1),height/(dpr||1));
  if(CAM.on&&CAM.o){const p=screen(CAM.o.p),r=canvas?.getBoundingClientRect?.();if(p.front)CAM.origin={x:(r?.left||0)+p.x,y:(r?.top||0)+p.y}}
  updateInk(screen,ms,width,height,dpr||1,canvas);
  if(canvas){canvas.dataset.replayTime=String(Math.round(SIM.simT));canvas.dataset.gooBackend=gl?'webgl2':'canvas2d'}
  if(!gl){drawFallback(context2D,screen);camFollow(ms);tickHud();return}
  const Lr=layerFor(gl);if(Lr.off){gl.canvas.dataset.gooLayer='off: '+Lr.off;camFollow(ms);tickHud();return}
  sizeTarget(Lr,width,height);
  // 1 · accumulate the complex field
  gl.bindFramebuffer(gl.FRAMEBUFFER,Lr.fbo);gl.viewport(0,0,Lr.fw,Lr.fh);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
  gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.enable(gl.BLEND);gl.blendEquation(gl.FUNC_ADD);gl.blendFunc(gl.ONE,gl.ONE);
  gl.useProgram(Lr.sp);gl.uniformMatrix4fv(Lr.SU.proj,false,proj);gl.uniformMatrix4fv(Lr.SU.view,false,view);gl.uniformMatrix4fv(Lr.SU.model,false,model);
  gl.uniform1f(Lr.SU.px,ms3*f*Lr.fh/2);gl.uniform1f(Lr.SU.maxPt,Math.min(900,Lr.maxPt));
  gl.bindVertexArray(Lr.vao);gl.bindBuffer(gl.ARRAY_BUFFER,Lr.buf);gl.bufferSubData(gl.ARRAY_BUFFER,0,SIM.sPos,0,SIM.ns*7);
  if(SIM.ns)gl.drawArrays(gl.POINTS,0,SIM.ns);
  // 2 · print it as ink over the field
  gl.bindFramebuffer(gl.FRAMEBUFFER,Lr.inkFbo);gl.viewport(0,0,Lr.fw,Lr.fh);gl.disable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(Lr.ip);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,Lr.tex);gl.uniform1i(Lr.IU.tex,0);
  gl.uniform2f(Lr.IU.res,Lr.fw,Lr.fh);gl.uniform2f(Lr.IU.texel,1/Lr.fw,1/Lr.fh);gl.uniform1f(Lr.IU.cell,3.4*(dpr||1)*Lr.fw/width);
  gl.uniform3f(Lr.IU.ink,.925,.898,.827);gl.uniform3fv(Lr.IU.bg,new Float32Array(shader.clear.slice(0,3)));gl.uniform3fv(Lr.IU.kinds,Lr.kinds);
  gl.bindVertexArray(Lr.ivao);gl.drawArrays(gl.TRIANGLES,0,3);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,width,height);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(Lr.copy);gl.bindTexture(gl.TEXTURE_2D,Lr.inkTex);gl.uniform1i(Lr.copyTex,0);gl.uniform2f(Lr.copySize,width,height);gl.drawArrays(gl.TRIANGLES,0,3);
  gl.canvas.dataset.inkPixels=String(Lr.fw*Lr.fh);
  gl.canvas.dataset.gooLayer=`${SIM.alive.size} alive · ${SIM.resolved} bodies · ${SIM.colonies} colonies · ${SIM.ns} splats · ${SIM.perf.upd.toFixed(1)} ms`;
  camFollow(ms);
  if(CAM.on&&CAM.o){const P=CAM.o.cell===''||!CAM.o.cp?CAM.o.p:CAM.o.cp,M=(m,v)=>[0,1,2,3].map(r=>m[r]*v[0]+m[4+r]*v[1]+m[8+r]*v[2]+m[12+r]*v[3]);
    const c=M(proj,M(view,M(model,[P[0],P[1],P[2],1])));gl.canvas.dataset.gooFollow=`${Math.round((c[0]/c[3]*.5+.5)*width/(dpr||1))},${Math.round((.5-c[1]/c[3]*.5)*height/(dpr||1))} · ${CAM.o.cell===''?'body':'colony'} · fade ${CAM.o.fade.toFixed(2)}`}
  else delete gl.canvas.dataset.gooFollow;
  tickHud();if(CAM.on&&performance.now()-(CAM.cardAt||0)>1000){CAM.cardAt=performance.now();camCard()}
}
shader.afterDraw=afterDraw;
shader.snapshot=temporalField;
shader.composite=()=>INK.canvas?[INK.canvas]:[];
shader.focus=camFocus;
Object.freeze(shader);

/* Source-owned words and lens targets. Display supplies one camera and one glass;
 * no private recognition material is consulted by this renderer. */
const INK={canvas:null,pretext:null,dependency:null,ui:null,offers:new Map(),prepared:new Map(),epoch:0,ms:0,reserved:[],reservedAt:0,reader:null,layout:null};
const fold=s=>globalThis.SSSDisplayType?.fold?.(s)??s;
const typePx=rank=>globalThis.SSSDisplayType?.rankPx?.(rank)??16*Math.pow(2,rank/2);
const typeFont=rank=>`400 ${typePx(rank)}px "SpriteSheet Mono", monospace`;
function lockedBeing(){const id=globalThis.SSSDisplayLens?.snapshot?.()?.lens?.lock?.id||'';return id.startsWith('crawlerbait:being:')?id.slice(18):null}
function mountInk(content,dependency,ui){
  disposeInk();INK.dependency=dependency;INK.ui=ui;const epoch=INK.epoch;
  const c=INK.retained||(INK.retained=el('canvas','crawlerbait-ink'));c.setAttribute('aria-hidden','true');content.append(c);INK.canvas=c;INK.reader=el('p','crawlerbait-reader');INK.reader.setAttribute('aria-live','polite');content.append(INK.reader);
  if(typeof dependency==='function')import(dependency('@chenglou/pretext','layout.js')).then(m=>{if(epoch===INK.epoch){INK.pretext=m;c.dataset.pretext='ready';INK.prepared.clear()}}).catch(()=>{if(epoch===INK.epoch)c.dataset.pretext='unavailable'});
  document.fonts?.load?.(typeFont(-1)).then(()=>{if(epoch===INK.epoch){INK.pretext?.clearCache?.();INK.prepared.clear()}}).catch(()=>{});
}
function disposeInk(){if(INK.layout&&INK.ui?.state){INK.ui.state.fields.bottom=INK.layout.base;INK.ui.refresh()}INK.layout=null;for(const id of INK.offers.keys())globalThis.SSSDisplayLens?.withdraw?.(id);INK.offers.clear();INK.prepared.clear();INK.canvas?.remove();INK.canvas=null;INK.reader?.remove();INK.reader=null;INK.reserved=[];INK.reservedAt=0;INK.epoch++}
function screenFrame(proj,view,model,w,h){
  const mul=(m,v)=>[0,1,2,3].map(r=>m[r]*v[0]+m[4+r]*v[1]+m[8+r]*v[2]+m[12+r]*v[3]);
  return P=>{const q=mul(proj,mul(view,mul(model,[...P,1])));return {x:(q[0]/q[3]*.5+.5)*w,y:(.5-q[1]/q[3]*.5)*h,front:q[3]>0}};
}
function triangleRows(tri,lh,pad=5,clip=null){
  const rows=[],top=Math.max(clip?.top??-Infinity,Math.min(...tri.map(p=>p.y))),bottom=Math.min(clip?.bottom??Infinity,Math.max(...tri.map(p=>p.y)));
  const span=y=>{const xs=[];for(let i=0;i<3;i++){const a=tri[i],b=tri[(i+1)%3];if(y>=Math.min(a.y,b.y)&&y<Math.max(a.y,b.y))xs.push(a.x+(b.x-a.x)*(y-a.y)/(b.y-a.y))}return xs.sort((a,b)=>a-b)};
  for(let y=top+pad;y+lh<bottom-pad;y+=lh){const a=span(y),b=span(y+lh);if(a.length<2||b.length<2)continue;const x=Math.max(a[0],b[0])+pad,right=Math.min(a.at(-1),b.at(-1))-pad;if(right-x>Math.max(96,typePx(-1)*10))rows.push({x,y,w:right-x})}return rows;
}
function textPages(text,font,rows){
  const P=INK.pretext;if(!P||!rows.length)return [];
  const key=font+'\0'+text;let prepared=INK.prepared.get(key);if(!prepared){prepared=P.prepareWithSegments(fold(text),font);if(INK.prepared.size>200)INK.prepared.clear();INK.prepared.set(key,prepared)}
  let cursor={segmentIndex:0,graphemeIndex:0},out=[],pages=[];
  // Reflow all words through successive triangle pages. No line consumes a future word.
  for(let n=0;n<10000;n++){const r=rows[out.length],range=P.layoutNextLineRange(prepared,cursor,r.w);if(!range){if(out.length)pages.push(out);break}
    const line=P.materializeLineRange(prepared,range);out.push({...r,text:line.text});
    if(range.end.segmentIndex===cursor.segmentIndex&&range.end.graphemeIndex===cursor.graphemeIndex)break;cursor=range.end;
    if(out.length===rows.length){pages.push(out);out=[]}}
  return pages;
}
function textLines(text,font,rows,page=0){const pages=textPages(text,font,rows);return pages.length?pages[page%pages.length]:[]}
function freeRows(rows){return rows.flatMap(r=>{let spans=[[r.x,r.x+r.w]];for(const b of INK.reserved){if(r.y+typePx(-1)*1.4<=b.top||r.y>=b.bottom)continue;spans=spans.flatMap(([l,h])=>h<=b.left||l>=b.right?[[l,h]]:[[l,Math.min(h,b.left-6)],[Math.max(l,b.right+6),h]].filter(([a,z])=>z-a>=Math.max(96,typePx(-1)*10)))}spans.sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]));return spans.length?[{...r,x:spans[0][0],w:spans[0][1]-spans[0][0]}]:[]})}
function paintWords(ctx,text,rows,color,ms=INK.ms,world=true){if(world)rows=freeRows(rows);ctx.font=typeFont(-1);ctx.fillStyle=color;ctx.textBaseline='top';const lines=textLines(text,ctx.font,rows,Math.floor(ms/8000));for(const r of lines)ctx.fillText(r.text,r.x,r.y);return lines}
function lensFrame(point,narrative=false){
  if(!point)return null;const c=INK.canvas;if(!c)return null;const r=c.getBoundingClientRect(),pad=16,carrier=INK.ui?.carrier;
  const leftMin=r.left+(carrier?.x||0)+pad,topMin=r.top+(carrier?.y||0)+pad;
  const width=Math.min(narrative?420:320,(carrier?.w||r.width)-2*pad),height=Math.min(narrative?420:260,(carrier?.h||r.height)-2*pad-44);
  if(width<96||height<96)return null;
  return {left:Math.max(leftMin,Math.min(leftMin+(carrier?.w||r.width)-2*pad-width,r.left+point.x-width/2)),top:Math.max(topMin,Math.min(topMin+(carrier?.h||r.height)-2*pad-44-height,r.top+point.y-height/2)),width,height,r:12};
}
function beingText(o){const f=o.facts;return `${KIND[f.k].name}. ${word(KIND_DE[f.k],KIND[f.k].does)}. ${f.events} ${word('Begegnungen','encounters')}, ${f.baits} ${word('Orte','places')}, ${f.days} ${word('Tage im bisherigen Verlauf','days in this record so far')}.`}
// Choose among the existing canonical rows; occupied shared surfaces constrain
// intrinsic width. The presentation address remains a recursive UI-grid address.
function hudPlacement(UI,state,carrier,occupied,height,minWidth){
  const variant=carrier.h>carrier.w?'portrait':'',base=UI.fieldInfo(state,'bottom',variant),left=carrier.x+base.bounds.x*carrier.w,gap=8;
  const addresses=[...new Set(UI.leafSet(state).map(a=>a.slice(0,base.depth)))];
  for(let row=base.minY;row>=0;row--){const top=carrier.y+row/Math.pow(2,base.depth)*carrier.h;let width=carrier.x+carrier.w-left-gap;
    for(const item of occupied){const r=item.rect||item;if(r.bottom<=top||r.top>=top+height||r.right<=left||r.left>=left+width)continue;width=Math.min(width,Math.max(0,r.left-left-gap))}
    if(width<minWidth)continue;
    const cells=addresses.filter(a=>{const c=UI.coord(a);return c.y===row&&c.x>=base.minX&&c.x<=base.maxX});
    if(cells.length===base.cells.length)return {cells,top,left,width,variant};
  }
  return null;
}
function fitHud(){
  const ui=INK.ui,UI=globalThis.SSSUIGrid,parent=INK.canvas?.parentNode;if(!ui?.state||!UI||!parent)return;
  const bottom=parent.querySelector('.crawlerbait-hud-bottom'),rail=parent.querySelector('.crawlerbait-hud-rail');if(!bottom||!rail)return;
  if(!INK.layout)INK.layout={base:JSON.parse(JSON.stringify(ui.state.fields.bottom))};
  const state={...ui.state,fields:{...ui.state.fields,bottom:INK.layout.base}},height=Math.max(bottom.getBoundingClientRect().height,typePx(0)*2.5);
  const plan=hudPlacement(UI,state,ui.carrier,globalThis.SSSDisplaySafeArea?.snapshot?.()?.occupied||[],height,typePx(-1)*12);if(!plan)return;
  const field={...INK.layout.base};if(plan.variant)field.variants={...field.variants,[plan.variant]:plan.cells};else field.cells=plan.cells;
  ui.state.fields.bottom=field;ui.refresh();bottom.style.maxInlineSize=plan.width+'px';rail.style.maxBlockSize=Math.max(0,plan.top-rail.getBoundingClientRect().top-8)+'px';
}
function updateInk(screen,ms,w,h,d,fieldCanvas){
  const c=INK.canvas;if(!c)return;INK.ms=ms;if(c.width!==w||c.height!==h){c.width=w;c.height=h}
  c.style.visibility=fieldCanvas?.dataset.composite==='1'?'hidden':'visible';
  const ctx=c.getContext('2d');ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,w/d,h/d);
  const seen=new Set(),L=globalThis.SSSDisplayLens,rect=c.getBoundingClientRect();
  if(ms-INK.reservedAt>120||!INK.reservedAt){fitHud();INK.reservedAt=ms;INK.reserved=[...(c.parentNode?.querySelectorAll('.crawlerbait-hud-top,.crawlerbait-modes,.crawlerbait-cam-bar,.crawlerbait-cam,.crawlerbait-inspector,.crawlerbait-transport')||[])].map(n=>n.getBoundingClientRect()).filter(r=>r.width>1&&r.height>1).map(r=>({left:r.left-rect.left,right:r.right-rect.left,top:r.top-rect.top,bottom:r.bottom-rect.top}))}
  for(const o of SIM.alive){
    const id='crawlerbait:being:'+o.S.b.id,old=INK.offers.get(id);let point=screen(o.p);
    if(MODE!=='reef'||o.fade<.15||o.fine<.2||!point.front||point.x<0||point.y<0||point.x>rect.width||point.y>rect.height)point=null;
    if(!old&&!point)continue;
    seen.add(id);if(old){Object.assign(old,{o,point});continue}
    const target={o,point};INK.offers.set(id,target);L?.offer?.(id,{kind:'body',point:()=>{const p=INK.offers.get(id)?.point,r=c.getBoundingClientRect();return p?{x:r.left+p.x,y:r.top+p.y,r:Math.max(7,typePx(-1))}:null},frame:()=>{const t=INK.offers.get(id);return INK.pretext&&t?.point?lensFrame(t.point):null}});
  }
  function offerWords(id,point,text,color,narrative=false){
    const old=INK.offers.get(id);if(!old&&!point)return;seen.add(id);
    if(old){Object.assign(old,{point,text,color,narrative});return}
    INK.offers.set(id,{point,text,color,narrative});L?.offer?.(id,{kind:'body',point:()=>{const p=INK.offers.get(id)?.point;return p?{x:rect.left+p.x,y:rect.top+p.y,r:Math.max(9,typePx(-1))}:null},frame:()=>{const t=INK.offers.get(id);return INK.pretext&&t?.point?lensFrame(t.point,t.narrative):null}});
  }
  if(MODE==='beings')for(const k of GENES){const p=screen(colonyGeom(k).cen);offerWords('crawlerbait:type:'+k,p.front?p:null,`${KIND[k].name}. ${word(KIND_DE[k],KIND[k].does)}. ${SIM.typeCounts?.[k]||0} ${word('Besucher an dieser Stelle des Verlaufs','visitors at this point in the record')}.`,KIND[k].ink)}
  // Narrative identity survives a grazing angle: only its world projection can disappear.
  const tet=cellIn(V0,SIM.container),faces=[[0,1,2],[0,1,3],[0,2,3],[1,2,3]],holes=faces.map(f=>f.map((i,j)=>screen(mid(tet[i],tet[f[(j+1)%3]]))));
  const safe=INK.ui?.carrier||{x:0,y:0,w:rect.width,h:rect.height};
  const rowSets=holes.filter(tri=>tri.every(p=>p.front)).map(tri=>freeRows(triangleRows(tri,typePx(-1)*1.4,5,{top:safe.y,bottom:safe.y+safe.h}).map(r=>{const x=Math.max(r.x,safe.x+10),right=Math.min(r.x+r.w,safe.x+safe.w-10);return {...r,x,w:right-x}}).filter(r=>r.y>=safe.y+10&&r.y+typePx(-1)*1.4<safe.y+safe.h-54&&r.w>Math.max(96,typePx(-1)*10))));
  rowSets.sort((a,b)=>b.reduce((n,r)=>n+r.w,0)-a.reduce((n,r)=>n+r.w,0));
  const rows=rowSets[0]||[];
  const storyPoint=rows.length?{x:rows[0].x+rows[0].w/2,y:rows[0].y+typePx(-1)*.7,front:true}:null;
  const pinned=L?.snapshot?.()?.lens?.lock?.id==='crawlerbait:narrative',storyAnchor=MODE==='reef'&&storyPoint?storyPoint:pinned?INK.offers.get('crawlerbait:narrative')?.point:null;
  offerWords('crawlerbait:narrative',storyAnchor,stories().join(' '),'#ece5d3',true);
  for(const id of INK.offers.keys())if(!seen.has(id)){L?.withdraw?.(id);INK.offers.delete(id)}
  if(!INK.pretext)return;
  if(MODE==='reef'&&rows.length)paintWords(ctx,stories()[Math.floor(ms/16000)%stories().length],rows,'#ece5d3',ms);
  if(MODE==='beings')for(const k of GENES){const p=screen(colonyGeom(k).cen);if(p.front)paintWords(ctx,`${KIND[k].name} · ${SIM.typeCounts?.[k]||0}. ${word(KIND_DE[k],KIND[k].does)}.`,[{x:p.x-90,y:p.y+35,w:180},{x:p.x-90,y:p.y+55,w:180},{x:p.x-90,y:p.y+75,w:180}],KIND[k].ink,ms)}
  // Kind is behavior, not a reef corner. Its explanatory view owns these labels.
  // Selected place facts live in its single readable context, never as a wall of opaque IDs.
  const snap=L?.snapshot?.()?.lens,target=snap?.lock?INK.offers.get(snap.lock.id):null;
  if(INK.reader){const text=target?(target.o?beingText(target.o):target.text):'';if(INK.reader.textContent!==text)INK.reader.textContent=text}
  if(target){const f=lensFrame(target.point,target.narrative);if(f&&snap.round===0&&Math.abs(snap.hx*2-f.width)<2&&Math.abs(snap.hy*2-f.height)<2){ctx.save();ctx.beginPath();ctx.roundRect(snap.x-snap.hx-rect.left,snap.y-snap.hy-rect.top,2*snap.hx,2*snap.hy,12);ctx.clip();const lh=typePx(-1)*1.4,rows=Array.from({length:Math.floor((f.height-24)/lh)},(_,i)=>({x:f.left-rect.left+12,y:f.top-rect.top+12+i*lh,w:f.width-24}));paintWords(ctx,target.o?beingText(target.o):target.text,rows,target.o?KIND[target.o.facts.k].ink:target.color,ms,false);ctx.restore();c.dataset.lensBeing=target.o?.S.b.id||snap.lock.id}else delete c.dataset.lensBeing}
  c.dataset.replayBaits=String(baitFold?.root.count||0);
}
function drawFallback(ctx,screen){
  if(!ctx)return;ctx.save();const colonies=new Map();
  for(const o of SIM.renderBodies||SIM.alive){if(o.cell===null||o.fade<=0)continue;const p=screen(o.cell&&o.cp?o.cp:o.p);if(!p.front)continue;ctx.fillStyle=KIND[o.facts.k].ink;ctx.globalAlpha=o.fade*.7;
    if(o.cell){if(colonies.has(o.cell))continue;colonies.set(o.cell,true);ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fill()}else{const r=Math.max(...[0,1,2].map(i=>{const q=screen(o.p.map((v,j)=>v+(j===i?o.radius:0)));return Math.hypot(q.x-p.x,q.y-p.y)}));if(!Number.isFinite(r))continue;ctx.beginPath();for(let i=0;i<4;i++){const a=i*Math.PI/2+INK.ms*.0003;const x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();ctx.fill()}}
  for(let i=SIM.placeStart||0;i<SIM.ns;i++){const at=i*7,a=SIM.sPos,p=screen([a[at],a[at+1],a[at+2]]),q=screen([a[at]+a[at+3]/2.2,a[at+1],a[at+2]]);if(!p.front)continue;const r=Math.hypot(q.x-p.x,q.y-p.y);ctx.fillStyle='#ece5d3';ctx.globalAlpha=.6;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill()}
  ctx.restore();
}

/* ============ site-owned DOM: panel, legend, pace, clock, story ============ */
function el(tag,cls,text){
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(text!==undefined)n.textContent=text;
  return n;
}
function fieldProjection(projection={}){
  lastProjection=projection;SIM.life=null;SIM.advancedAt=null;SIM.lastMs=0;fieldRevision=-1;fieldCache=null;
  VISITS=buildVisits(projection);
  growth=buildGrowth(projection.routes||[]);baitFold=createBaitFold(growth);
  const start=Date.parse(projection.raw_capture_start)||Date.parse(projection.updated_at)||Infinity;
  baitFold.seek(start);
  return baitFold.view('');
}
function temporalField({container=''}={}){
  if(!lastProjection)return null;
  if(!SIM.life){SIM.life=buildLife(lastProjection,growth);if(!SIM.life)return null;resetTo(0);fieldRevision=-1}
  const t=SIM.life.t0+SIM.simT*1000,i=growth.index(t);
  if(MODE==='beings')return {root:{noun:'Beings',children:Object.fromEntries(GENES.map(k=>[k,{noun:KIND[k].name,children:{}}]))},points:[],revision:'being-types'};
  if(CAM.on&&CAM.o&&SIM.alive.has(CAM.o)){
    const a=growth.address(CAM.o.S.wps[CAM.o.reached].path,t);
    if(a)container=a.slice(0,-1);
  }
  if(fieldRevision!==i||fieldCache?.container!==container){fieldRevision=i;baitFold.seek(t);
    fieldCache={...baitFold.view(container,{context:true}),revision:Object.freeze({index:i,container})};
    if(selectedAddress){const a=growth.address(selectedAddress,t),selected=a?baitFold.routeAt(a):null;if(!selected)selectedAddress='';renderInspector(selected)}
  }
  return fieldCache;
}
function metric(label,value){
  const n=el('span','crawlerbait-metric');
  n.append(el('b','',String(value)),el('small','',label));
  return n;
}
function prettyTime(value){
  if(!value)return '—';
  return String(value).replace('T',' ').replace('Z',' UTC');
}
let MODE='reef';
const HUD={legend:null,clock:null,pace:null,paceLabel:null,alive:null,story:null,storyTimer:0,cam:null,camBtn:null};
/* CRAWLERCAM — follows one being with Display's continuous focus: the camera eases after the body (a spring, never
 * Descent steps), attached to its actual position; the walk, pools and selection remain Display's. */
const CAM={on:false,o:null,target:null,moved:0,origin:null};
function camRide(next){const old=CAM.o;if(old&&next?.S.b.id!==old.S.b.id&&lockedBeing()===old.S.b.id)globalThis.SSSDisplayLens?.departFrom?.(CAM.origin||null);CAM.o=next;CAM.target=null}
function advance(ms){
  if(!SIM.life&&lastProjection){SIM.life=buildLife(lastProjection,growth);if(SIM.life)resetTo(0)}
  if(!SIM.life||SIM.advancedAt===ms)return;
  const dt=SIM.lastMs?Math.min(.05,(ms-SIM.lastMs)/1000):0;SIM.lastMs=ms;SIM.advancedAt=ms;
  const begin=performance.now();step(dt,ms,SIM.pxOf||((P,r)=>r*900));SIM.perf.upd+=((performance.now()-begin)-SIM.perf.upd)*.05;SIM.perf.splats=SIM.ns;camFollow(ms);
}
function camFocus({ms}={}){
  if(Number.isFinite(ms))advance(ms);
  if(MODE==='beings')return {center:[0,0,0],scale:1};
  const o=CAM.on?CAM.o:null;if(!o||!SIM.alive.has(o))return null;
  const P=o.p,frame=beingFrame(o);
  return {id:'crawlerbait:being:'+o.S.b.id,attached:true,center:[...P],scale:frame.scale,stiffness:3.4};
}
/* who is worth riding with: beings whose next recorded encounter comes soonest; a being that has nothing left, or
 * nothing within a dozen real seconds at the current pace, has gone quiet and hands the cam to the next */
const CAM_QUIET=12;
function nextIn(o){const w=o.S.wps[o.reached+1];if(!w||o.done!=null)return Infinity;const moving=o.dist<o.S.wd[o.reached+1]-1e-9&&o.S.wd[o.reached+1]<=o.S.wd[allowed(o.S,SIM.simT,o)]+1e-9;return moving?0:Math.max(0,w.t-SIM.simT)/Math.pow(10,SIM.paceCur)}
function camCandidates(){return [...SIM.alive].filter(o=>o.fade>.3&&nextIn(o)<Infinity).sort((a,b)=>nextIn(a)-nextIn(b)||(a.S.b.id<b.S.b.id?-1:1))}
function camPick(dir=1){const l=camCandidates();if(!l.length)return CAM.o&&SIM.alive.has(CAM.o)?CAM.o:null;
  const active=l.filter(o=>nextIn(o)<=CAM_QUIET),pool=active.length>1?active:l;
  const i=CAM.o?pool.indexOf(CAM.o):-1;return i<0?pool[dir>0?0:pool.length-1]:pool[(i+dir+pool.length)%pool.length]}
// riding with a being means travelling at its pace: engaging the cam slows time to about ×60 (the slider still rules)
const CAM_PACE=1.8;
function camEngage(){if(!CAM.on){CAM.on=true;if(SIM.paceLog>CAM_PACE){SIM.paceLog=CAM_PACE;if(HUD.pace)HUD.pace.value=String(CAM_PACE)}}}
function camSet(on){if(on)camEngage();else CAM.on=false;CAM.target=null;if(on&&(!CAM.o||!SIM.alive.has(CAM.o)))camRide(camPick(1));if(!on)CAM.o=null;camCard()}
function camFollow(ms){
  if(!CAM.on)return;
  if(!SIM.playing&&CAM.o&&SIM.alive.has(CAM.o))return;
  if(!CAM.o||!SIM.alive.has(CAM.o)||CAM.o.done!=null||(nextIn(CAM.o)>CAM_QUIET&&ms-CAM.moved>3000)){
    const q=camCandidates().find(o=>o!==CAM.o&&nextIn(o)<=CAM_QUIET);
    if(q||!CAM.o||!SIM.alive.has(CAM.o)){camRide(q||camPick(1));CAM.moved=ms;camCard()}}
  const o=CAM.o;if(!o)return;
  const a=o.S.wps[Math.min(o.reached+1,o.S.wps.length-1)].a;
  if(a!==CAM.target){CAM.target=a;camCard()}
}
function camCard(){
  if(!HUD.cam)return;HUD.cam.replaceChildren();
  if(HUD.camBtn)HUD.camBtn.textContent=CAM.on?word('Verfolgen beenden','Stop following'):'Crawlercam';
  const o=CAM.o;if(!CAM.on||!o){HUD.cam.hidden=true;return}
  HUD.cam.hidden=false;const K=KIND[o.facts.k],c=crawlerById.get(o.S.b.id)||{},w=o.S.wps[Math.min(o.reached+1,o.S.wps.length-1)];
  const bait=baitFold?.routeAt(w.a);
  const h=el('b','crawlerbait-cam-kind',`${K.name} · ${K.gene}`);h.style.setProperty('--kind',K.ink);
  const nx=nextIn(o);
  HUD.cam.append(h,el('span','crawlerbait-cam-row',`${word('Unterwegs zu','Heading for')} ${bait?placeName(bait.path):word('einem Ort','a place')}`),
    el('span','crawlerbait-cam-row crawlerbait-cam-next',!SIM.playing?word('Pause','paused'):nx===0?word('bewegt sich','walking now'):nx===Infinity?word('Verlauf endet hier','record ends here'):`${word('Nächste Begegnung in','Next encounter in')} ${nx<90?Math.round(nx)+' s':Math.round(nx/60)+' min'}`),
    el('span','crawlerbait-cam-row',`${o.facts.events} ${word('Begegnungen','encounters')} · ${o.facts.baits} ${word('Orte','places')} · ${o.facts.days} ${word('Tage','days')}`),
    el('span','crawlerbait-cam-dna',`${word('Besucher','Visitor')} ${o.S.b.id.slice(0,4).toUpperCase()}`));
}
function paceText(x){const s=Math.pow(10,x);return s<1.5?word('Echtzeit','real time'):s<60?'×'+s.toFixed(0):s<3600?(s/60).toFixed(s<600?1:0)+' min/s':s<DAY?(s/3600).toFixed(s<36000?1:0)+' h/s':(s/DAY).toFixed(1)+' d/s'}
let hudTick=0;
function tickHud(){
  const now=performance.now();if(now-hudTick<200)return;hudTick=now;
  const L=SIM.life;if(!L||!HUD.legend)return;if(selectedAddress)updatePlaceSummary(selectedAddress);
  for(const row of HUD.legend.children){const k=row.dataset.kind;row.querySelector('span').textContent=`${SIM.counts[k]||0} / ${L.totals[k]||0}`}
  if(HUD.clock)HUD.clock.textContent=new Date(L.t0+SIM.simT*1000).toISOString().slice(0,16).replace('T',' ')+' UTC';
  if(HUD.paceLabel)HUD.paceLabel.textContent=paceText(SIM.paceCur);
  if(HUD.alive)HUD.alive.textContent=`${SIM.alive.size} ${word('unterwegs','alive')}`;
  if(HUD.scrub&&document.activeElement!==HUD.scrub)HUD.scrub.value=String(Math.round(SIM.simT/L.seconds*1000));
  if(CAM.on&&now-(CAM.cardAt||0)>1000){CAM.cardAt=now;camCard()}
}
/* the HUD gives each kind of information its own fixed place at the edges of the reef — no floating boxes */
function lifeParts(projection){
  HUD.legend=el('div','crawlerbait-legend');
  for(const k of ['w','x','z','y']){const row=el('div','crawlerbait-kind');row.dataset.kind=k;row.style.setProperty('--kind',KIND[k].ink);
    row.title=`${KIND[k].gene} · ${KIND[k].does}`;row.append(el('b','',KIND[k].name),el('span','',''),el('em','',KIND[k].does));HUD.legend.append(row)}
  const legendBox=el('section','crawlerbait-hud-block');
  const head=el('div','crawlerbait-hud-label');head.append(el('span','',word('Besucher im Riff','Visitors in the reef')));HUD.alive=el('span','','');head.append(HUD.alive);
  legendBox.append(head,HUD.legend);
  const camBox=el('section','crawlerbait-hud-block');
  const cam=el('div','crawlerbait-cam-bar');
  HUD.camBtn=el('button','crawlerbait-play','crawlercam');HUD.camBtn.type='button';HUD.camBtn.addEventListener('click',()=>camSet(!CAM.on));
  const prev=el('button','crawlerbait-play','‹');prev.type='button';prev.setAttribute('aria-label',word('Vorheriges Being','previous being'));prev.addEventListener('click',()=>{camEngage();camRide(camPick(-1));CAM.moved=performance.now();camCard()});
  const next=el('button','crawlerbait-play','›');next.type='button';next.setAttribute('aria-label',word('Nächstes Being','next being'));next.addEventListener('click',()=>{camEngage();camRide(camPick(1));CAM.moved=performance.now();camCard()});
  cam.append(HUD.camBtn,prev,next);HUD.cam=el('div','crawlerbait-cam');HUD.cam.hidden=true;camBox.append(cam,HUD.cam);
  const bar=el('div','crawlerbait-transport');
  const play=el('button','crawlerbait-play',SIM.playing?word('Pause','pause'):word('Weiter','play'));play.type='button';
  play.addEventListener('click',()=>{SIM.playing=!SIM.playing;play.textContent=SIM.playing?word('Pause','pause'):word('Weiter','play')});
  HUD.pace=el('input','crawlerbait-pace');Object.assign(HUD.pace,{type:'range',min:'0',max:'5.54',step:'0.005',value:String(SIM.paceLog)});HUD.pace.setAttribute('aria-label',word('Tempo','pace'));
  HUD.pace.addEventListener('input',()=>{SIM.paceLog=+HUD.pace.value});
  HUD.paceLabel=el('span','crawlerbait-pace-label','');
  HUD.scrub=el('input','crawlerbait-scrub');Object.assign(HUD.scrub,{type:'range',min:'0',max:'1000',value:'0'});HUD.scrub.setAttribute('aria-label',word('Zeit','time'));
  HUD.scrub.addEventListener('input',()=>{if(SIM.life)resetTo(+HUD.scrub.value/1000*SIM.life.seconds)});
  HUD.clock=el('span','crawlerbait-clock','');
  bar.append(play,el('span','crawlerbait-dim',word('Tempo','pace')),HUD.pace,HUD.paceLabel,HUD.scrub,HUD.clock);
  camCard();
  return {legendBox,camBox,bar};
}
function storyLine(host){
  clearTimeout(HUD.storyTimer);
  const p=el('p','crawlerbait-note crawlerbait-story','');host.append(p);HUD.story=p;
  let i=0;const next=()=>{if(HUD.story!==p)return;p.classList.remove('on');HUD.storyTimer=setTimeout(()=>{if(HUD.story!==p)return;p.textContent=stories()[i%stories().length];p.classList.add('on');i++;HUD.storyTimer=setTimeout(next,6200)},700)};
  next();
}
function updatePlaceSummary(path){const n=inspectorHost?.querySelector('.crawlerbait-place-summary');if(!n)return;const t=SIM.life?SIM.life.t0+SIM.simT*1000:Date.parse(lastProjection?.raw_capture_start),v=placeVisits(path,t);n.textContent=`${v.count} ${word('Begegnungen','encounters')} · ${v.beings} ${word('Besucher','visitors')} · ${v.roots.length} ${word('gewachsene Formen','grown forms')}`}
function renderInspector(route){
  if(!inspectorHost)return;if(route&&inspectorHost.dataset.place===route.path){updatePlaceSummary(route.path);return}inspectorHost.replaceChildren();
  if(!route){inspectorHost.dataset.place='';inspectorHost.append(el('span','crawlerbait-inspector-empty',word('Einen Ort im Riff berühren','Touch a place in the reef')));return}
  inspectorHost.dataset.place=route.path;inspectorHost.append(el('h2','crawlerbait-place-name',placeName(route.path)));
  const now=SIM.life?SIM.life.t0+SIM.simT*1000:Date.parse(lastProjection?.raw_capture_start),visits=placeVisits(route.path,now);
  inspectorHost.append(el('p','crawlerbait-place-summary',`${visits.count} ${word('Begegnungen','encounters')} · ${visits.beings} ${word('Besucher','visitors')} · ${visits.roots.length} ${word('gewachsene Formen','grown forms')}`));
  const facts=el('details','crawlerbait-details'),summary=el('summary','',word('Herkunft und Beleg','Provenance and receipt'));facts.append(summary,el('code','crawlerbait-path',route.path));
  const receipt=el('a','crawlerbait-receipt',word('Beleg öffnen ↗','Open receipt ↗'));receipt.href=route.href;receipt.target='_blank';receipt.rel='noopener';facts.append(receipt);inspectorHost.append(facts);
}

function render({host,content,projection,ui=null,dependency=null}={}){
  if(!host||!content||!projection?.summary)return false;
  if(projection!==lastProjection)fieldProjection(projection);
  host.hidden=false;
  content.className='interlocutor-content crawlerbait-content';
  content.replaceChildren();
  mountInk(content,dependency,ui);

  const routes=projection.routes||[];
  crawlerById=new Map((projection.crawlers||[]).map(c=>[c.id,c]));
  const maxDepth=routes.reduce((max,r)=>Math.max(max,String(r.address||'').length),0);
  const fmt=n=>Number(n||0).toLocaleString('en').replace(/,/g,' ');

  // top line: identity and the whole reef in one breath
  const top=el('div','crawlerbait-hud-top');
  top.append(el('h1','','Crawlerbait'));
  for(const [v,l] of [[projection.summary.baits ?? routes.length,word('Orte','places')],[projection.summary.web_requests ?? 0,word('Begegnungen','encounters')]]){
    const m=el('span','crawlerbait-hud-stat');m.append(el('b','',fmt(v)),el('small','',l));top.append(m)}
  const through=el('span','crawlerbait-hud-through',projection.updated_at?`through ${prettyTime(projection.updated_at)}`:'waiting for first tide');top.append(through);
  const machine=el('a','crawlerbait-hud-link','reef ↗');machine.href='/crawlerbait/';machine.target='_blank';machine.rel='noopener';top.append(machine);

  // the HUD is locked to the screen's borders so the centre stays free:
  // left — who the reef is and who lives in it; right — the one being you ride with and the bait you chose; bottom-left — time
  const rail=el('div','crawlerbait-hud-rail');
  rail.append(top);
  const modes=el('div','crawlerbait-modes');for(const [mode,label]of [['reef',word('Riff','Reef')],['beings',word('Beings','Beings')]]){const button=el('button','crawlerbait-play',label);button.type='button';button.setAttribute('aria-pressed',String(MODE===mode));button.addEventListener('click',()=>{MODE=mode;camSet(false);if(life)life.camBox.hidden=mode!=='reef';if(inspectorHost)inspectorHost.hidden=mode!=='reef';for(const b of modes.children)b.setAttribute('aria-pressed',String(b===button));});modes.append(button)}rail.append(modes);
  storyLine(rail);
  const life=Array.isArray(projection.encounters)&&projection.encounters.length?lifeParts(projection):null;
  if(life)rail.append(life.legendBox);
  const side=el('div','crawlerbait-hud-side');
  if(life){life.camBox.hidden=MODE!=='reef';side.append(life.camBox)}
  inspectorHost=el('section','crawlerbait-inspector');inspectorHost.hidden=MODE!=='reef';
  side.append(inspectorHost);

  rail.append(side);content.append(rail);if(ui)ui.bind(rail,'rail')
  if(life){const bottom=el('div','crawlerbait-hud-bottom');bottom.append(life.bar);content.append(bottom);if(ui)ui.bind(bottom,'bottom')}
  const selected=selectedAddress?routes.find(r=>r.path===selectedAddress):null;
  renderInspector(selected||null);
  return true;
}
function activateFieldPoint({point}={}){
  const route=point?.route||null;
  selectedAddress=route?.path||'';
  renderInspector(route);
}
function unmount({host,content}={}){
  if(host)host.hidden=true;
  if(content)content.replaceChildren();
  disposeInk();SIM.lastMs=0;clearTimeout(HUD.storyTimer);CAM.on=false;CAM.o=null;
  inspectorHost=null;crawlerById=new Map();
  for(const k of Object.keys(HUD))if(k!=='storyTimer')HUD[k]=null;
}
modules.set(id,Object.freeze({id,shader,render,unmount,fieldProjection,activateFieldPoint,
  // pure witnesses for tests: the walk law, the life built from a projection, and the frame cost of living it
  _law:Object.freeze({pointOf,route,buildLife,prepareWalk,buildGrowth,createBaitFold,prefixFacts,publicFacts,triangleRows,textLines,screenFrame,beingFrame,bodySize,buildVisits,resolutionCell,hudPlacement,KIND,
    simulate({projection,at=0,frames=120,dt=1/60,pace=3.2,container='',changeAt=null,nextContainer=''}){
      SIM.life=buildLife(projection);resetTo(at*SIM.life.seconds);SIM.paceLog=SIM.paceCur=pace;SIM.playing=true;SIM.container=container;
      const pxOf=(P,r)=>r*900;let worst=0,sum=0;
      for(let i=0;i<frames;i++){if(i===changeAt)SIM.container=nextContainer;const a=performance.now();step(dt,i*dt*1000,pxOf);const d=performance.now()-a;if(i>=frames/4){sum+=d;worst=Math.max(worst,d)}}
      const cells=[...SIM.alive].map(o=>o.cell);
      return {alive:SIM.alive.size,resolved:SIM.resolved,colonies:SIM.colonies,hidden:cells.filter(c=>c===null).length,cells,fineShares:[...SIM.alive].map(o=>o.fine),ids:[...SIM.alive].map(o=>o.S.b.id),splats:SIM.ns,counts:{...SIM.counts},meanMs:sum/(frames-Math.floor(frames/4)),worstMs:worst};
    }})}));
})();
