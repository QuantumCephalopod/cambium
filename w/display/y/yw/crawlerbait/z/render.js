(() => {
'use strict';
const id='organism:crawlerbait';
const GENES=Object.freeze(['w','x','z','y']);
const modules=globalThis.SSSInterlocutorModules||(globalThis.SSSInterlocutorModules=new Map());
let inspectorHost=null,selectedAddress='',crawlerById=new Map(),lastProjection=null;

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

/* ============ beings and their walks — recorded order is truth, pace is the body's own ============ */
const DAY=86400,GAP=8*3600,LEAD=1800,LINGER=12*3600,DISS=5*3600,V_BASE=2.4/DAY,V_REAL=.035;
const bytesOf=hex=>{const b=[];for(let i=0;i+1<hex.length;i+=2)b.push(parseInt(hex.slice(i,i+2),16));while(b.length<32)b.push(0);return b};
function buildLife(projection){
  const enc=Array.isArray(projection?.encounters)?projection.encounters:[];
  const crawlers=Array.isArray(projection?.crawlers)?projection.crawlers:[];
  if(!enc.length||!crawlers.length)return null;
  const by=new Map();let t0=Infinity;
  for(const e of enc){if(!e||typeof e.bait_address!=='string'||!/^[wxzy]+$/.test(e.bait_address))continue;const t=Date.parse(e.t);if(!isFinite(t))continue;if(t<t0)t0=t;let l=by.get(e.crawler);if(!l)by.set(e.crawler,l=[]);l.push({t,a:e.bait_address})}
  const end=Date.parse(projection.raw_capture_end||projection.updated_at)||t0;
  const sessions=[],totals={w:0,x:0,z:0,y:0};
  for(const c of crawlers){
    const k=KIND[c.kind]?c.kind:'x';totals[k]++;
    const es=(by.get(c.id)||[]).sort((a,b)=>a.t-b.t);if(!es.length)continue;
    const dna=String(c.genome||c.id),g=bytesOf(dna.padEnd(64,'0'));
    const days=new Set(es.map(e=>new Date(e.t).toISOString().slice(0,10))).size,baits=new Set(es.map(e=>e.a)).size;
    const b={id:c.id,k,events:c.events||es.length,days,baits};
    let cur=null;
    for(const e of es){const t=Math.round((e.t-t0)/1000);
      if(!cur||t-cur.tLast>GAP){cur={b,g,wps:[],tLast:t};sessions.push(cur)}
      const w=cur.wps[cur.wps.length-1];if(w&&w.a===e.a)w.n++;else cur.wps.push({a:e.a,t,n:1});cur.tLast=t}
  }
  for(const S of sessions){
    const pts=[pointOf(S.wps[0].a)],wd=[0];let L=0;
    for(let j=1;j<S.wps.length;j++){const r=route(S.wps[j-1].a,S.wps[j].a);
      for(let i=1;i<r.length;i++){const q=pts[pts.length-1],d=Math.hypot(r[i][0]-q[0],r[i][1]-q[1],r[i][2]-q[2]);if(d<1e-7)continue;L+=d;pts.push(r[i])}wd.push(L)}
    const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1],pts[i][2]-pts[i-1][2]));
    S.pts=pts;S.cum=cum;S.wd=wd;S.L=L;S.t0=S.wps[0].t;
    S.v=Math.max(V_BASE*KIND[S.b.k].speed*(.85+S.g[9]/255*.3),L/(1.5*DAY));
    S.tEnd=S.tLast+L/S.v+LINGER+DISS;S.size=.02*(1+Math.log10(Math.max(1,S.b.events))*.3);
  }
  sessions.sort((a,b)=>a.t0-b.t0);
  return {key:projection.updated_at||'',t0,seconds:Math.max(1,Math.round((end-t0)/1000)),sessions,totals};
}

/* ============ simulation ============ */
const TETL=[[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]].map(v=>v.map(n=>n/Math.sqrt(3)));
const EDGES=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
const FACEN=[[0,1,2],[0,1,3],[0,2,3],[1,2,3]].map(f=>{const c=[0,1,2].map(k=>(TETL[f[0]][k]+TETL[f[1]][k]+TETL[f[2]][k])/3);const m=Math.hypot(...c);return c.map(v=>v/m)});
function rot(axis,ang,v){const c=Math.cos(ang),s=Math.sin(ang),[x,y,z]=axis,d=x*v[0]+y*v[1]+z*v[2];
  return [v[0]*c+(y*v[2]-z*v[1])*s+x*d*(1-c),v[1]*c+(z*v[0]-x*v[2])*s+y*d*(1-c),v[2]*c+(x*v[1]-y*v[0])*s+z*d*(1-c)]}
const MAXS=90000;
const SIM={life:null,simT:0,paceLog:3.2,paceCur:3.2,playing:true,alive:new Set(),drops:[],cursor:0,lastMs:0,container:'',
  sPos:new Float32Array(MAXS*7),ns:0,counts:{w:0,x:0,z:0,y:0},sizeK:1,perf:{upd:0,splats:0},resolved:0,colonies:0};
/* a splat adds w·(1−r²)³·coh·e^{iφ} to the complex field and w to its density; coh < 1 lets one splat carry a crowd whose phases partly cancel */
function splat(x,y,z,r,w,ph,coh=1){if(SIM.ns>=MAXS||w<=.001)return;const o=SIM.ns++*7,a=SIM.sPos;a[o]=x;a[o+1]=y;a[o+2]=z;a[o+3]=r*2.2;a[o+4]=w;a[o+5]=ph;a[o+6]=coh}
function posAt(S,dist,o){const c=S.cum;while(o.seg<c.length-2&&c[o.seg+1]<dist)o.seg++;while(o.seg>0&&c[o.seg]>dist)o.seg--;
  const i=o.seg,a=S.pts[i],b=S.pts[Math.min(i+1,S.pts.length-1)],L=(i+1<c.length?c[i+1]:c[i])-c[i],u=L>0?(dist-c[i])/L:0;
  return {p:[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u],seg:L,dir:L>0?[(b[0]-a[0])/L,(b[1]-a[1])/L,(b[2]-a[2])/L]:[0,0,0]}}
function allowed(S,t,o){let j=o?o.j||0:0;if(o&&o.jt>t)j=0;while(j+1<S.wps.length&&S.wps[j+1].t<=t)j++;if(o){o.j=j;o.jt=t}return j}
function spawn(S){const o={S,seg:0,hot:0,trail:[],off:[0,0,0],head:[0,0,0],done:null,fade:0,slow:1,spikes:3+Math.min(12,Math.round(Math.log2(1+new Set(S.wps.map(w=>w.a)).size)*2.2))};
  const j=allowed(S,SIM.simT,o);o.dist=S.wd[j];o.reached=j;const r=posAt(S,o.dist,o);o.base=r.p;o.p=r.p.slice();S.o=o;SIM.alive.add(o)}
function despawn(o){o.S.o=null;SIM.alive.delete(o)}
function resetTo(t){for(const o of [...SIM.alive])despawn(o);SIM.drops.length=0;SIM.simT=t;SIM.cursor=0}
function body(o,now,pxOf){
  const S=o.S,g=S.g,k=S.b.k,sz=S.size*SIM.sizeK,f=o.fade,t=now*.001,P=o.p;
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
    const n=o.spikes,reach=.45+.55*o.hot;
    for(let i=0;i<n;i++){const yy=1-2*(i+.5)/n,rr=Math.sqrt(1-yy*yy),th=i*2.39996;
      let d=rot(axis,spin*.5,[Math.cos(th)*rr,yy,Math.sin(th)*rr]);d=[d[0]+h[0]*.7,d[1]+h[1]*.7,d[2]+h[2]*.7];const dm=Math.hypot(...d)||1;d=d.map(x=>x/dm);
      const act=(.3+.7*(.5+.5*Math.sin(t*(1.3+g[(15+i)%32]/255*1.6)+i*1.9)))*reach,Ls=sz*(.9+g[5]/255*.9)*act;
      for(let j=0;j<6;j++){const dd=sz*.32+j*.3*Ls;splat(P[0]+d[0]*dd,P[1]+d[1]*dd,P[2]+d[2]*dd,sz*.26*(1-j*.15),.95*f,ph0+.05*j)}}
  }else if(k==='y'){ // Dweller: one segment per day it came back, following its own trail
    const segs=Math.min(6,S.b.days+1),tr=o.trail;
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
  const G=colonyGeom(o.cell),r=G.edge*.075,ph=KIND[o.S.b.k].phase+(o.S.g[4]/255-.5)*.5,f=o.fade,tr=o.ctrail||[];
  if(o.transit)splat(o.cp[0],o.cp[1],o.cp[2],r,f,ph);
  for(let i=0;i<tr.length;i++){const a=(i+1)/tr.length,q=tr[i];splat(q[0],q[1],q[2],r*(.45+.45*a),.8*a*a*f,ph)}
}
/* Display: content sits two ranks below its container. Baits are the field's content (container + 2);
 * beings are the content of baits, so they resolve two ranks further down. */
const BEING_RANKS=4;
const grid=new Map(),cellKey=(x,y,z)=>((x*73856093)^(y*19349663)^(z*83492791))|0;
function step(dt,now,pxOf){
  const L=SIM.life;if(!L)return;
  SIM.paceCur+=(SIM.paceLog-SIM.paceCur)*Math.min(1,dt*2.5);
  const dts=SIM.playing?dt*Math.pow(10,SIM.paceCur):0;
  if(SIM.playing){SIM.simT+=dts;if(SIM.simT>L.seconds)resetTo(0)}
  const T=SIM.simT,ss=L.sessions;
  // spawn by time: sessions are sorted by start, so only a window needs scanning
  while(SIM.cursor<ss.length&&ss[SIM.cursor].t0-LEAD<=T){const S=ss[SIM.cursor++];if(T<=S.tEnd&&!S.o)spawn(S)}
  for(const o of SIM.alive)if(T>o.S.tEnd||T<o.S.t0-LEAD)despawn(o);
  const K=SIM.sizeK,C=SIM.container,H=C.length+BEING_RANKS,crowd=new Map();
  for(const o of SIM.alive){const S=o.S,lim=S.wd[allowed(S,T,o)];
    let r=posAt(S,o.dist,o);const hw=Math.min(3,.7+1.3*Math.sqrt(r.seg/.08));
    // never before a recorded time; at slow pace the body still crawls at its own real speed
    o.dist=Math.min(lim,o.dist+Math.max(S.v*dts,SIM.playing?V_REAL*dt:0)*hw*o.slow);
    r=posAt(S,o.dist,o);o.base=r.p;
    for(let k=0;k<3;k++)o.head[k]+=(r.dir[k]-o.head[k])*Math.min(1,dt*4);
    while(o.reached+1<S.wps.length&&o.dist>=S.wd[o.reached+1]-1e-9){o.reached++;const w=S.wps[o.reached];SIM.drops.push({a:w.a,p:pointOf(w.a),t:now,w:Math.min(1,.4+Math.log10(1+w.n)*.35),ph:KIND[S.b.k].phase});o.hot=1}
    o.hot*=Math.exp(-dt*1.2);
    if(o.done==null&&o.dist>=S.L-1e-9&&T>=S.tLast)o.done=T;
    const inF=Math.min(1,(T-(S.t0-LEAD))/LEAD),outF=o.done==null?1:1-Math.max(0,T-o.done-LINGER)/DISS;o.fade=Math.max(0,Math.min(inF,outF));
    o.pri=S.v*(S.L-o.dist+S.size);for(let k=0;k<3;k++)o.p[k]=o.base[k]+o.off[k];
    /* COARSE RESOLUTION — Display's pool law, applied to beings: a being is its own body only while the bait it
     * last touched lies within the viewed resolution (container + 2 ranks); deeper, it belongs to the colony of
     * that rank's cell; outside the container it is not drawn. Coalesced beings keep walking but pay no body. */
    const a=S.wps[o.reached].a;o.cell=a.startsWith(C)?(a.length<=H?'':a.slice(0,H)):null;
    if(o.cell)crowd.set(o.cell,(crowd.get(o.cell)||0)+1)}
  // coalescence is joining: a being alone in its cell has nothing to join and stays itself
  for(const o of SIM.alive){if(o.cell&&(crowd.get(o.cell)<2||o===CAM.o))o.cell='';if(o.cell!==''&&o.trail.length){o.trail.length=0;o.off[0]=o.off[1]=o.off[2]=0}}
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
  const cs=.08*K;grid.clear();
  for(const o of SIM.alive){if(o.cell!=='')continue;const key=cellKey(Math.floor(o.p[0]/cs),Math.floor(o.p[1]/cs),Math.floor(o.p[2]/cs));let l=grid.get(key);if(!l)grid.set(key,l=[]);l.push(o)}
  for(const o of SIM.alive){if(o.cell!==''){o.slow=1;continue}const push=[0,0,0];let slow=1;const b=o.p,R0=o.S.size*K*1.6;
    const gx=Math.floor(b[0]/cs),gy=Math.floor(b[1]/cs),gz=Math.floor(b[2]/cs);
    for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){const l=grid.get(cellKey(gx+x,gy+y,gz+z));if(!l)continue;
      for(const q of l){if(q===o)continue;const R=R0+q.S.size*K*1.6,d0=b[0]-q.p[0],d1=b[1]-q.p[1],d2=b[2]-q.p[2];let dl=Math.sqrt(d0*d0+d1*d1+d2*d2);if(dl>=R)continue;let d=[d0,d1,d2];
        if(dl<1e-6){const g=o.S.g;d=[g[20]/255-.5,g[21]/255-.5,g[22]/255-.5];dl=1e-6}
        const dm=Math.sqrt(d[0]*d[0]+d[1]*d[1]+d[2]*d[2])||1,s=(1-dl/R)*R,yields=(o.pri<q.pri||(o.pri===q.pri&&o.S.b.id<q.S.b.id)),share=yields?.85:.15;
        push[0]+=d[0]/dm*s*share;push[1]+=d[1]/dm*s*share;push[2]+=d[2]/dm*s*share;if(yields)slow=Math.min(slow,.3+.7*dl/R)}}
    o.slow=slow;const cap=o.S.size*K*3;
    for(let k=0;k<3;k++){o.off[k]+=push[k]*Math.min(1,dt*6);o.off[k]*=Math.exp(-dt*.6)}
    const om=Math.sqrt(o.off[0]*o.off[0]+o.off[1]*o.off[1]+o.off[2]*o.off[2]);if(om>cap)for(let k=0;k<3;k++)o.off[k]*=cap/om;
    for(let k=0;k<3;k++)o.p[k]=o.base[k]+o.off[k];
    const tl=o.trail[o.trail.length-1];if(!tl||Math.hypot(o.p[0]-tl[0],o.p[1]-tl[1],o.p[2]-tl[2])>o.S.size*K*.18){o.trail.push(o.p.slice());if(o.trail.length>34)o.trail.shift()}}
  // print every body into the field
  SIM.ns=0;const counts={w:0,x:0,z:0,y:0},cols=new Map();let resolved=0;
  for(const o of SIM.alive){counts[o.S.b.k]++;if(o.fade<=0||o.cell===null)continue;
    if(o.cell===''){resolved++;body(o,now,pxOf);continue}
    if(o.transit||(o.ctrail&&o.ctrail.length)){droplet(o,now);if(o.transit)continue}
    let c=cols.get(o.cell);if(!c)cols.set(o.cell,c={n:0,f:0,re:0,im:0});
    const ph=KIND[o.S.b.k].phase+(o.S.g[4]/255-.5)*.5;c.n++;c.f+=o.fade;c.re+=o.fade*Math.cos(ph);c.im+=o.fade*Math.sin(ph)}
  for(const [key,c] of cols)colony(key,c,now);
  SIM.resolved=resolved;SIM.colonies=cols.size;
  for(let i=SIM.drops.length-1;i>=0;i--){const d=SIM.drops[i],age=(now-d.t)/1400;if(age>1||!d.a.startsWith(C)){SIM.drops.splice(i,1);continue}
    splat(d.p[0],d.p[1],d.p[2],.013*K*(1.2-age*.5),d.w*Math.min(1,age*6)*(1-age*age),d.ph)}
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
  const sp=link(gl,SPLAT_V,SPLAT_F),ip=link(gl,INK_V,INK_F),vao=gl.createVertexArray(),buf=gl.createBuffer();
  gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,SIM.sPos.byteLength,gl.DYNAMIC_DRAW);
  for(const [name,size,off] of [['aPos',3,0],['aRad',1,12],['aW',1,16],['aPh',1,20],['aCoh',1,24]]){const loc=gl.getAttribLocation(sp,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,28,off)}
  const u=(p,n)=>gl.getUniformLocation(p,n);
  LAYER={gl,sp,ip,vao,ivao:gl.createVertexArray(),buf,tex:null,fbo:null,fw:0,fh:0,maxPt:gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1]||256,
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
  Lr.fw=fw;Lr.fh=fh;
}
function afterDraw({gl,proj,view,model,ms,width,height,dpr,frame,container}){
  if(!SIM.life&&lastProjection){SIM.life=buildLife(lastProjection);resetTo(0)}
  if(!SIM.life||!gl)return;
  const Lr=layerFor(gl);if(Lr.off){gl.canvas.dataset.gooLayer='off: '+Lr.off;return}
  const dt=SIM.lastMs?Math.min(.05,(ms-SIM.lastMs)/1000):0;SIM.lastMs=ms;
  // a body keeps its world size near the whole reef and shrinks gently as Descent zooms, so it never swallows a deep container
  SIM.sizeK=Math.pow(Math.max(1,frame?.scale||1),-.75);SIM.container=typeof container==='string'?container:'';
  if(CAM.on&&CAM.o&&SIM.alive.has(CAM.o)){const a=CAM.o.S.wps[CAM.o.reached].a;SIM.container=a.slice(0,Math.min(a.length,FOLLOW_RANK-1))}
  const ms3=Math.hypot(model[0],model[1],model[2]),f=proj[5],pxBase=ms3*f*height/2;
  const pxOf=(P,r)=>{const z=model[2]*P[0]+model[6]*P[1]+model[10]*P[2]+model[14];return r*pxBase/Math.max(.05,3.2-z)};
  const u0=performance.now();step(dt,ms,pxOf);SIM.perf.upd+=((performance.now()-u0)-SIM.perf.upd)*.05;SIM.perf.splats=SIM.ns;
  sizeTarget(Lr,width,height);
  // 1 · accumulate the complex field
  gl.bindFramebuffer(gl.FRAMEBUFFER,Lr.fbo);gl.viewport(0,0,Lr.fw,Lr.fh);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
  gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.enable(gl.BLEND);gl.blendEquation(gl.FUNC_ADD);gl.blendFunc(gl.ONE,gl.ONE);
  gl.useProgram(Lr.sp);gl.uniformMatrix4fv(Lr.SU.proj,false,proj);gl.uniformMatrix4fv(Lr.SU.view,false,view);gl.uniformMatrix4fv(Lr.SU.model,false,model);
  gl.uniform1f(Lr.SU.px,ms3*f*Lr.fh/2);gl.uniform1f(Lr.SU.maxPt,Math.min(900,Lr.maxPt));
  gl.bindVertexArray(Lr.vao);gl.bindBuffer(gl.ARRAY_BUFFER,Lr.buf);gl.bufferSubData(gl.ARRAY_BUFFER,0,SIM.sPos,0,SIM.ns*7);
  if(SIM.ns)gl.drawArrays(gl.POINTS,0,SIM.ns);
  // 2 · print it as ink over the field
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,width,height);
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(Lr.ip);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,Lr.tex);gl.uniform1i(Lr.IU.tex,0);
  gl.uniform2f(Lr.IU.res,width,height);gl.uniform2f(Lr.IU.texel,1/Lr.fw,1/Lr.fh);gl.uniform1f(Lr.IU.cell,3.4*(dpr||1));
  gl.uniform3f(Lr.IU.ink,.925,.898,.827);gl.uniform3fv(Lr.IU.bg,new Float32Array(shader.clear.slice(0,3)));gl.uniform3fv(Lr.IU.kinds,Lr.kinds);
  gl.bindVertexArray(Lr.ivao);gl.drawArrays(gl.TRIANGLES,0,3);
  gl.canvas.dataset.gooLayer=`${SIM.alive.size} alive · ${SIM.resolved} bodies · ${SIM.colonies} colonies · ${SIM.ns} splats · ${SIM.perf.upd.toFixed(1)} ms`;
  camFollow(ms);
  if(CAM.on&&CAM.o){const P=CAM.o.cell===''||!CAM.o.cp?CAM.o.p:CAM.o.cp,M=(m,v)=>[0,1,2,3].map(r=>m[r]*v[0]+m[4+r]*v[1]+m[8+r]*v[2]+m[12+r]*v[3]);
    const c=M(proj,M(view,M(model,[P[0],P[1],P[2],1])));gl.canvas.dataset.gooFollow=`${Math.round((c[0]/c[3]*.5+.5)*width/(dpr||1))},${Math.round((.5-c[1]/c[3]*.5)*height/(dpr||1))} · ${CAM.o.cell===''?'body':'colony'} · fade ${CAM.o.fade.toFixed(2)}`}
  else delete gl.canvas.dataset.gooFollow;
  tickHud();if(CAM.on&&performance.now()-(CAM.cardAt||0)>1000){CAM.cardAt=performance.now();camCard()}
}
shader.afterDraw=afterDraw;
shader.focus=camFocus;
Object.freeze(shader);

/* ============ site-owned DOM: panel, legend, pace, clock, story ============ */
function el(tag,cls,text){
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(text!==undefined)n.textContent=text;
  return n;
}
function freezeNode(node){
  if(node.children){
    for(const g of Object.keys(node.children))node.children[g]=freezeNode(node.children[g]);
    Object.freeze(node.children);
  }
  return Object.freeze(node);
}
function baitTree(routes){
  const byAddress=new Map();
  const prefixes=new Set(['']);
  for(const route of routes){
    if(!route||typeof route.address!=='string'||!route.address||!new RegExp('^[wxzy]+$').test(route.address))continue;
    byAddress.set(route.address,route);
    for(let i=0;i<route.address.length;i++)prefixes.add(route.address.slice(0,i));
  }
  function branch(prefix){
    const route=byAddress.get(prefix);
    if(route){
      return {
        noun:route.path,
        de:route.path,
        en:route.path,
        bait:true,
        address:route.address,
        children:{}
      };
    }
    if(!prefixes.has(prefix))return {noun:'open',de:'offen',en:'open',children:{}};
    const children={};
    for(const g of GENES)children[g]=branch(prefix+g);
    return {
      noun:prefix||'Baits',
      de:prefix||'Köder',
      en:prefix||'Baits',
      gene:'CREATE',
      children
    };
  }
  return branch('');
}
function fieldProjection(projection={}){
  if(projection&&Array.isArray(projection.encounters))lastProjection=projection;
  const routes=Array.isArray(projection.routes)?projection.routes:[];
  const root=freezeNode(baitTree(routes));
  const points=routes
    .filter(route=>route&&typeof route.address==='string'&&/^[wxzy]+$/.test(route.address))
    .map(route=>Object.freeze({
      id:`bait:${route.address}`,
      gene:route.address[0],
      path:route.address,
      kind:'bait',
      label:route.path,
      meta:`${route.address} · ${route.raw_requests ?? route.observed_404 ?? 0} requests · ${(route.crawlers?.length ?? route.signatures?.length ?? 0)} beings`,
      address:route.address,
      route
    }));
  return Object.freeze({root,points});
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
const HUD={legend:null,clock:null,pace:null,paceLabel:null,alive:null,story:null,storyTimer:0,cam:null,camBtn:null};
/* CRAWLERCAM — follows one being with Display's continuous focus: the camera eases after the body (a spring, never
 * Descent steps), a little ahead along its heading; the walk, pools and selection remain Display's. */
const CAM={on:false,o:null,target:null,moved:0};
const FOLLOW_RANK=4,FOLLOW_SCALE=1.02*Math.pow(2,FOLLOW_RANK);
function camFocus(){
  const o=CAM.on?CAM.o:null;if(!o||!SIM.alive.has(o))return null;
  const P=o.cell===''||!o.cp?o.p:o.cp,lead=.004;
  return {center:[P[0]+o.head[0]*lead,P[1]+o.head[1]*lead,P[2]+o.head[2]*lead],scale:FOLLOW_SCALE,stiffness:3.4};
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
function camSet(on){if(on)camEngage();else CAM.on=false;CAM.target=null;if(on&&(!CAM.o||!SIM.alive.has(CAM.o)))CAM.o=camPick(1);if(!on)CAM.o=null;camCard()}
function camFollow(ms){
  if(!CAM.on)return;
  if(!CAM.o||!SIM.alive.has(CAM.o)||CAM.o.done!=null||(nextIn(CAM.o)>CAM_QUIET&&ms-CAM.moved>3000)){
    const q=camCandidates().find(o=>o!==CAM.o&&nextIn(o)<=CAM_QUIET);
    if(q||!CAM.o||!SIM.alive.has(CAM.o)){CAM.o=q||camPick(1);CAM.target=null;CAM.moved=ms;camCard()}}
  const o=CAM.o;if(!o)return;
  const a=o.S.wps[Math.min(o.reached+1,o.S.wps.length-1)].a;
  if(a!==CAM.target){CAM.target=a;camCard()}
}
function camCard(){
  if(!HUD.cam)return;HUD.cam.replaceChildren();
  if(HUD.camBtn)HUD.camBtn.textContent=CAM.on?'stop following':'crawlercam';
  const o=CAM.o;if(!CAM.on||!o){HUD.cam.hidden=true;return}
  HUD.cam.hidden=false;const K=KIND[o.S.b.k],c=crawlerById.get(o.S.b.id)||{},w=o.S.wps[Math.min(o.reached+1,o.S.wps.length-1)];
  const bait=(lastProjection?.routes||[]).find(r=>r.address===w.a);
  const h=el('b','crawlerbait-cam-kind',`${K.name} · ${K.gene}`);h.style.setProperty('--kind',K.ink);
  const nx=nextIn(o);
  HUD.cam.append(h,el('span','crawlerbait-cam-row',`heading for ${bait?.path||w.a}`),
    el('span','crawlerbait-cam-row crawlerbait-cam-next',nx===0?'walking now':nx===Infinity?'nothing left in its record':`next encounter in ${nx<90?Math.round(nx)+' s':Math.round(nx/60)+' min'} at this pace`),
    el('span','crawlerbait-cam-row',`${o.S.b.events} encounters · ${o.S.b.baits} baits · ${o.S.b.days} day${o.S.b.days>1?'s':''}`),
    el('code','crawlerbait-cam-dna',`being ${o.S.b.id}`),
    el('code','crawlerbait-cam-dna',`body ${String(c.genome||o.S.b.id).slice(0,24)}…`));
}
function paceText(x){const s=Math.pow(10,x);return s<1.5?'real time':s<60?'×'+s.toFixed(0):s<3600?(s/60).toFixed(s<600?1:0)+' min/s':s<DAY?(s/3600).toFixed(s<36000?1:0)+' h/s':(s/DAY).toFixed(1)+' d/s'}
let hudTick=0;
function tickHud(){
  const now=performance.now();if(now-hudTick<200)return;hudTick=now;
  const L=SIM.life;if(!L||!HUD.legend)return;
  for(const row of HUD.legend.children){const k=row.dataset.kind;row.querySelector('span').textContent=`${SIM.counts[k]||0} / ${L.totals[k]||0}`}
  if(HUD.clock)HUD.clock.textContent=new Date(L.t0+SIM.simT*1000).toISOString().slice(0,16).replace('T',' ')+' UTC';
  if(HUD.paceLabel)HUD.paceLabel.textContent=paceText(SIM.paceCur);
  if(HUD.alive)HUD.alive.textContent=`${SIM.alive.size} alive`;
  if(HUD.scrub&&document.activeElement!==HUD.scrub)HUD.scrub.value=String(Math.round(SIM.simT/L.seconds*1000));
}
/* the HUD gives each kind of information its own fixed place at the edges of the reef — no floating boxes */
function lifeParts(projection){
  HUD.legend=el('div','crawlerbait-legend');
  for(const k of ['w','x','z','y']){const row=el('div','crawlerbait-kind');row.dataset.kind=k;row.style.setProperty('--kind',KIND[k].ink);
    row.title=`${KIND[k].gene} · ${KIND[k].does}`;row.append(el('b','',KIND[k].name),el('span','',''),el('em','',KIND[k].does));HUD.legend.append(row)}
  const legendBox=el('section','crawlerbait-hud-block');
  const head=el('div','crawlerbait-hud-label');head.append(el('span','','beings, walking their record'));HUD.alive=el('span','','');head.append(HUD.alive);
  legendBox.append(head,HUD.legend);
  const camBox=el('section','crawlerbait-hud-block');
  const cam=el('div','crawlerbait-cam-bar');
  HUD.camBtn=el('button','crawlerbait-play','crawlercam');HUD.camBtn.type='button';HUD.camBtn.addEventListener('click',()=>camSet(!CAM.on));
  const prev=el('button','crawlerbait-play','‹');prev.type='button';prev.setAttribute('aria-label','previous being');prev.addEventListener('click',()=>{camEngage();CAM.o=camPick(-1);CAM.target=null;CAM.moved=performance.now();camCard()});
  const next=el('button','crawlerbait-play','›');next.type='button';next.setAttribute('aria-label','next being');next.addEventListener('click',()=>{camEngage();CAM.o=camPick(1);CAM.target=null;CAM.moved=performance.now();camCard()});
  cam.append(HUD.camBtn,prev,next);HUD.cam=el('div','crawlerbait-cam');HUD.cam.hidden=true;camBox.append(cam,HUD.cam);
  const bar=el('div','crawlerbait-transport');
  const play=el('button','crawlerbait-play',SIM.playing?'pause':'play');play.type='button';
  play.addEventListener('click',()=>{SIM.playing=!SIM.playing;play.textContent=SIM.playing?'pause':'play'});
  HUD.pace=el('input','crawlerbait-pace');Object.assign(HUD.pace,{type:'range',min:'0',max:'5.54',step:'0.005',value:String(SIM.paceLog)});HUD.pace.setAttribute('aria-label','pace');
  HUD.pace.addEventListener('input',()=>{SIM.paceLog=+HUD.pace.value});
  HUD.paceLabel=el('span','crawlerbait-pace-label','');
  HUD.scrub=el('input','crawlerbait-scrub');Object.assign(HUD.scrub,{type:'range',min:'0',max:'1000',value:'0'});HUD.scrub.setAttribute('aria-label','time');
  HUD.scrub.addEventListener('input',()=>{if(SIM.life)resetTo(+HUD.scrub.value/1000*SIM.life.seconds)});
  HUD.clock=el('span','crawlerbait-clock','');
  bar.append(play,el('span','crawlerbait-dim','pace'),HUD.pace,HUD.paceLabel,HUD.scrub,HUD.clock);
  camCard();
  return {legendBox,camBox,bar};
}
function storyLine(host){
  clearTimeout(HUD.storyTimer);
  const p=el('p','crawlerbait-note crawlerbait-story','');host.append(p);HUD.story=p;
  let i=0;const next=()=>{if(HUD.story!==p)return;p.classList.remove('on');HUD.storyTimer=setTimeout(()=>{if(HUD.story!==p)return;p.textContent=STORY[i%STORY.length];p.classList.add('on');i++;HUD.storyTimer=setTimeout(next,6200)},700)};
  next();
}
function renderInspector(route){
  if(!inspectorHost)return;
  inspectorHost.replaceChildren();
  if(!route){
    const empty=el('div','crawlerbait-inspector-empty');
    empty.append(el('span','', 'the bait-space is the map · click a luminous bait'));
    inspectorHost.append(empty);
    return;
  }
  const head=el('div','crawlerbait-inspector-head');
  head.append(el('span','crawlerbait-address',`bait:${route.address}`));
  const receipt=el('a','crawlerbait-receipt','open static receipt ↗');
  receipt.href=route.href;receipt.target='_blank';receipt.rel='noopener';
  head.append(receipt);
  inspectorHost.append(head);

  const title=el('code','crawlerbait-path',route.path);
  inspectorHost.append(title);

  const raw=route.raw_requests ?? route.observed_404 ?? 0;
  const beings=route.crawlers||[];
  const legacy=route.legacy_404_observations||0;
  const facts=el('div','crawlerbait-facts');
  facts.append(
    metric('raw requests',raw),
    metric('beings',beings.length || route.signatures?.length || 0),
    metric('legacy 404',legacy)
  );
  inspectorHost.append(facts);

  const time=el('div','crawlerbait-time');
  time.append(
    el('span','',`first seen · ${prettyTime(route.first_seen || route.materialized_at)}`),
    el('span','',`last seen · ${prettyTime(route.last_seen || route.last_observed_window?.end)}`)
  );
  inspectorHost.append(time);

  const signatures=el('div','crawlerbait-signatures');
  signatures.append(el('h3','', 'traffic beings'));
  const list=el('div','crawlerbait-signature-list');
  if(beings.length){
    for(const item of beings){
      const being=crawlerById.get(item.id)||{};
      const row=el('div','crawlerbait-signature');
      const K=KIND[being.kind];
      const who=el('code','',item.id||'∅');
      if(K){const tag=el('b','crawlerbait-kind-tag',K.name);tag.style.setProperty('--kind',K.ink);who.prepend(tag,' ')}
      row.append(who);
      row.append(el('code','',String(being.genome||item.id||'').slice(0,16)+'…'));
      row.append(el('span','',String(item.events||0)));
      list.append(row);
    }
  }else{
    for(const sig of route.signatures||[]){
      const row=el('div','crawlerbait-signature');
      row.append(el('code','',sig.claimed_user_agent||'∅'));
      row.append(el('span','',String(sig.observed_404)));
      list.append(row);
    }
  }
  if(!beings.length && !(route.signatures||[]).length)list.append(el('span','crawlerbait-none','no observed traffic being'));
  signatures.append(list);
  inspectorHost.append(signatures);
}
function render({host,content,projection}={}){
  if(!host||!content||!projection?.summary)return false;
  if(Array.isArray(projection.encounters)&&projection!==lastProjection){lastProjection=projection;if(SIM.life&&SIM.life.key!==(projection.updated_at||''))SIM.life=null}
  host.hidden=false;
  content.className='interlocutor-content crawlerbait-content';
  content.replaceChildren();

  const routes=projection.routes||[];
  crawlerById=new Map((projection.crawlers||[]).map(c=>[c.id,c]));
  const depths=routes.map(r=>String(r.address||'').length).filter(Boolean);
  const fmt=n=>Number(n||0).toLocaleString('en').replace(/,/g,' ');

  // top line: identity and the whole reef in one breath
  const top=el('div','crawlerbait-hud-top');
  top.append(el('h1','','Crawlerbait'));
  for(const [v,l] of [[projection.summary.baits ?? routes.length,'baits'],[projection.summary.web_requests ?? 0,'requests'],[projection.summary.crawlers ?? 0,'beings'],[depths.length?Math.max(...depths):0,'deep']]){
    const m=el('span','crawlerbait-hud-stat');m.append(el('b','',fmt(v)),el('small','',l));top.append(m)}
  const through=el('span','crawlerbait-hud-through',projection.updated_at?`through ${prettyTime(projection.updated_at)}`:'waiting for first tide');top.append(through);
  const machine=el('a','crawlerbait-hud-link','reef ↗');machine.href='/crawlerbait/';machine.target='_blank';machine.rel='noopener';top.append(machine);

  // the HUD is locked to the screen's borders so the centre stays free:
  // left — who the reef is and who lives in it; right — the one being you ride with and the bait you chose; bottom-left — time
  const rail=el('div','crawlerbait-hud-rail');
  rail.append(top);
  storyLine(rail);
  const life=Array.isArray(projection.encounters)&&projection.encounters.length?lifeParts(projection):null;
  if(life)rail.append(life.legendBox);
  const side=el('div','crawlerbait-hud-side');
  if(life)side.append(life.camBox);
  inspectorHost=el('section','crawlerbait-inspector');
  side.append(inspectorHost);

  content.append(rail,side);
  if(life){const bottom=el('div','crawlerbait-hud-bottom');bottom.append(life.bar);content.append(bottom)}
  const selected=selectedAddress?routes.find(r=>r.address===selectedAddress):null;
  renderInspector(selected||null);
  return true;
}
function activateFieldPoint({point}={}){
  const route=point?.route||null;
  selectedAddress=route?.address||'';
  renderInspector(route);
}
function unmount({host,content}={}){
  if(host)host.hidden=true;
  if(content)content.replaceChildren();
  clearTimeout(HUD.storyTimer);CAM.on=false;CAM.o=null;
  inspectorHost=null;crawlerById=new Map();
  for(const k of Object.keys(HUD))if(k!=='storyTimer')HUD[k]=null;
}
modules.set(id,Object.freeze({id,shader,render,unmount,fieldProjection,activateFieldPoint,
  // pure witnesses for tests: the walk law, the life built from a projection, and the frame cost of living it
  _law:Object.freeze({pointOf,route,buildLife,KIND,
    simulate({projection,at=0,frames=120,dt=1/60,pace=3.2,container=''}){
      SIM.life=buildLife(projection);resetTo(at*SIM.life.seconds);SIM.paceLog=SIM.paceCur=pace;SIM.playing=true;SIM.container=container;SIM.sizeK=Math.pow(1.02*Math.pow(2,container.length),-.75);
      const pxOf=(P,r)=>r*900;let worst=0,sum=0;
      for(let i=0;i<frames;i++){const a=performance.now();step(dt,i*dt*1000,pxOf);const d=performance.now()-a;if(i>=frames/4){sum+=d;worst=Math.max(worst,d)}}
      const cells=[...SIM.alive].map(o=>o.cell);
      return {alive:SIM.alive.size,resolved:SIM.resolved,colonies:SIM.colonies,hidden:cells.filter(c=>c===null).length,cells,splats:SIM.ns,counts:{...SIM.counts},meanMs:sum/(frames-Math.floor(frames/4)),worstMs:worst};
    }})}));
})();
