(() => {
'use strict';

const id='organism:papers';
const modules=globalThis.SSSInterlocutorModules||(globalThis.SSSInterlocutorModules=new Map());
const N=globalThis.SSSDisplayNavigation||null;
const W=globalThis.SSSWorldView||null;
const Fields=globalThis.SSSInterlocutorFields||null;
const GENES=['w','x','z','y'];
const DNA={w:'CREATE',x:'COPY',z:'CONTROL',y:'CULTIVATE'};
const PALETTE={w:[.34,.78,.64],x:[.42,.82,.88],z:[.78,.78,.60],y:[.52,.93,.48]};

/*
 * Papers render law
 * -----------------
 * Every public organism is always one canonical tetrahedral body.
 * Distance may collapse the body perceptually to a particle; it never changes
 * the body's ontology. An nH Holon is the recursive 4-way composition of its
 * actual four parents. Selection does not spawn a detail representation: the
 * selected instance itself moves to the global centroid while the camera
 * dollies inward. Recursive detail is revealed only when screen scale earns it.
 */

const S_QUANTUM_SCALE=.0012; // smallest Papers organism body in canonical root units; ~1px at ordinary overview height
const ROOT_FIELD_DESKTOP=1.75;
const ROOT_FIELD_MOBILE=1.42;
const ROOT_FIELD_BREAKPOINT=560;
const MACRO_FILL=.285;
const MIN_MACRO_Z=.014;
const FAR_Z=3.2;
const FOV=Math.PI/3.3;
const LOD_PX=7;
const OPEN_MS=900;
const MAX_DEPTH=8;
const PRETEXT_ID='@chenglou/pretext';
const PRETEXT_VERSION='0.0.9';
const SHADOW_PATH='papers-shadow/current.json';
const GENEALOGY_REPAIR_PATH='papers-shadow/genealogy-gap-repair.json';
const METABOLITE_FIELD_SCALE=.32;
const METABOLITE_LABEL_MAX_WIDTH=320;
const METABOLITE_LABEL_ROWS=4;
const METABOLITE_LIGHT_GAIN=1.0;
const INQUIRY_EMBER_GAIN=.28;
const PHYSIOLOGY_PHASE_MS=6400;
const OVERVIEW_WANDER=.86;
const OVERVIEW_FLOW_PERIOD_MS=42000;
const OVERVIEW_LIGHT_GAIN=.46;
const INQUIRY_LIGHT_GAIN=.72;
const CHAMBER_OPEN_MS=760;
const CHAMBER_SHELL_ALPHA=.55,CHAMBER_FACE_ALPHA=.05;
const PAPERS_OVERVIEW_BASIS_Y=-.275;
const PHILOSOPHY_INQUIRY_REGION=3;
const PHYSIOLOGY_PHASES=Object.freeze([
  Object.freeze({id:'question',label:'QUESTION',copy:'Papers is a living body of research organisms of every rank. It notices what it cannot yet answer, and reaches out.'}),
  Object.freeze({id:'prepare',label:'PREPARE',copy:'One real outside work arrives. Its authors keep it; Papers reads it whole and cuts it into its own four parts.'}),
  Object.freeze({id:'metabolize',label:'METABOLIZE',copy:'Its four parts earn 6 relations, 4 faces and 1 whole. What survives the collapse is its wisdom; it lives on as one Source.'}),
  Object.freeze({id:'grow',label:'GROW',copy:'A random rank, four random living organisms of it. They become one only if every relation truly needs all four; otherwise no birth. Parents never die.'})
]);
const BACKGROUND_FIELD_ALPHA=.16;
const BACKGROUND_STAR_ALPHA=.72;
const NESTED_BACKGROUND_ALPHA=.07;
const FACE=[[0,2,1],[0,1,3],[0,3,2],[1,2,3]];
const EDGE=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];

/* Generic Display still instantiates one field surface for every interlocutor.
 * Papers owns its specimen body, so the shared surface is made transparent and
 * carries no point population. */
const shader=Object.freeze({
  id:'shader:organism:papers',
  /* Papers' body lives in its own canvases; handing them to the field lets Display's invariant glass refract them. */
  composite:()=>state?.mounted?[state.environmentCanvas,state.canvas,state.textCanvas]:null,
  environment:false, /* Papers' own inquiry environment already embodies its host */
  clear:[0,0,0,0],
  fallbackAlpha:0,
  state:Object.freeze({blend:true,depthTest:false,depthWrite:false}),
  /* the body seen from a host: ruled paper in Papers' green — its field draws nothing because its own environment does the work */
  body:Object.freeze({
    state:Object.freeze({blend:true,depthTest:true,depthWrite:true}),
    fragment:`#version 300 es
precision highp float;
in vec3 vN;in vec3 vW;in float vRegion;uniform float uFocus;uniform vec3 uPalette[4];
out vec4 outColor;
void main(){vec3 n=normalize(vN);float facing=.5+.5*dot(n,normalize(vec3(-.35,.6,.72)));
  int ri=int(clamp(floor(vRegion+.5),0.,3.));vec3 g=uPalette[ri];
  float rule=step(.86,fract(gl_FragCoord.y/5.));
  vec3 c=mix(vec3(.03,.045,.025),g,.2+.62*facing);c=mix(c,c*1.45+.05,rule*.55);
  float sel=(uFocus<-.5||abs(vRegion-uFocus)<.2)?1.:.55;
  outColor=vec4(c,.94*sel);}`
  }),
  fragment:`#version 300 es
precision highp float;
out vec4 outColor;
void main(){outColor=vec4(0.0);}`
});

let state=null;
let pretextModule=null;
let pretextPromise=null;
let shadowPromise=null;
let genealogyRepairPromise=null;

function pretextURL(){if(typeof state?.dependency!=='function')throw new Error('Display dependency resolver missing');return state.dependency(PRETEXT_ID,'layout.js')}
function shadowURL(){return new URL(SHADOW_PATH,document.baseURI).href}
function genealogyRepairURL(){return new URL(GENEALOGY_REPAIR_PATH,document.baseURI).href}
function ensureGenealogyRepair(){
  if(!genealogyRepairPromise){
    genealogyRepairPromise=fetch(genealogyRepairURL(),{cache:'no-store',credentials:'same-origin'})
      .then(r=>{if(!r.ok)throw new Error(`Papers genealogy repair HTTP ${r.status}`);return r.json()})
      .then(x=>x?.schema==='papers-public-genealogy-gap-repair.v1'&&x?.site_id==='organism:papers'&&x?.parents&&typeof x.parents==='object'?x:null)
      .catch(err=>{console.warn('Papers bounded genealogy repair unavailable',err);return null});
  }
  return genealogyRepairPromise;
}
function mergeGenealogyRepair(snap,repair){
  if(!snap?.projection||!repair?.parents)return snap;
  const p=snap.projection,publicIds=new Set(),holonIds=new Set();
  for(const gene of GENES){
    for(const x of p.groups?.[gene]||[])if(x?.id)publicIds.add(x.id);
    for(const x of p.holons?.[gene]||[]){if(x?.id){publicIds.add(x.id);holonIds.add(x.id)}}
  }
  const applied=[];
  for(const [id,parents] of Object.entries(repair.parents)){
    if(!holonIds.has(id)||!Array.isArray(parents)||parents.length!==4||!parents.every(x=>publicIds.has(x)))continue;
    const meta=p.holon_meta?.[id];if(!Array.isArray(meta))continue;
    const current=Array.isArray(meta[0])?meta[0]:[];
    if(current.length===4)continue;
    meta[0]=[...parents];applied.push(id);
  }
  snap.genealogy_repair={schema:repair.schema,source:repair.source,source_event:repair.source_event,applied};
  return snap;
}
function ensureShadow(){
  if(!shadowPromise){
    shadowPromise=fetch(shadowURL(),{cache:'no-store',credentials:'same-origin'})
      .then(r=>{if(!r.ok)throw new Error(`Papers shadow HTTP ${r.status}`);return r.json()})
      .then(packet=>{
        const snap=packet?.snapshot;
        if(packet?.site_id!=='organism:papers'||snap?.schema!=='papers-public-shadow.v2'||snap?.source!=='papers/_feed'||!snap?.projection?.groups||!snap?.projection?.phenotype)throw new Error('Papers shadow membrane mismatch');
        return ensureGenealogyRepair().then(repair=>mergeGenealogyRepair(snap,repair));
      })
      .catch(err=>{console.warn('Papers static shadow unavailable; retaining embedded projection',err);return null});
  }
  return shadowPromise;
}
function ensurePretext(){
  if(pretextModule)return Promise.resolve(pretextModule);
  if(!pretextPromise){
    pretextPromise=import(pretextURL()).then(m=>{
      for(const name of ['prepareWithSegments','layoutNextLineRange','materializeLineRange'])if(typeof m[name]!=='function')throw new Error(`Pretext ${PRETEXT_VERSION} missing ${name}`);
      pretextModule=m;
      if(state){state.pretextStatus='ready';state.textCanvas.dataset.pretextStatus='ready'}
      return m;
    }).catch(err=>{
      if(state){state.pretextStatus='error';state.textCanvas.dataset.pretextStatus='error'}
      console.error('Papers Pretext load failed',err);
      return null;
    });
  }
  return pretextPromise;
}

function clamp(x,a=0,b=1){return Math.max(a,Math.min(b,x))}
function mix(a,b,t){return a+(b-a)*t}
function mix3(a,b,t){return a.map((v,i)=>mix(v,b[i],t))}
function smooth(t){t=clamp(t);return t*t*(3-2*t)}
function add(a,b){return a.map((v,i)=>v+b[i])}
function sub(a,b){return a.map((v,i)=>v-b[i])}
function mul(a,s){return a.map(v=>v*s)}
function hash32(text){let h=2166136261>>>0;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)>>>0}h^=h>>>16;h=Math.imul(h,0x7feb352d)>>>0;h^=h>>>15;h=Math.imul(h,0x846ca68b)>>>0;h^=h>>>16;return h>>>0}
function random01(text,salt){return (hash32(text+'·'+salt)+1)/4294967297}
function qMul(a,b){const[w,x,y,z]=a,[v,i,j,k]=b;return [w*v-x*i-y*j-z*k,w*i+x*v+y*k-z*j,w*j-x*k+y*v+z*i,w*k+x*j-y*i+z*v]}
function qNorm(q){const m=Math.hypot(...q)||1;return q.map(v=>v/m)}
function qRot(q,p){const r=qMul(qMul(q,[0,...p]),[q[0],-q[1],-q[2],-q[3]]);return r.slice(1)}
function qAxis(axis,angle){const s=Math.sin(angle/2);return [Math.cos(angle/2),axis[0]*s,axis[1]*s,axis[2]*s]}
function overviewOrientation(){return qNorm(qMul(W.orientation,qAxis([0,1,0],PAPERS_OVERVIEW_BASIS_Y)))}
function rotateQ(q,dx,dy){return qNorm(qMul(qAxis([0,1,0],dx*.006),qMul(qAxis([1,0,0],dy*.006),q)))}

function locusName(projection,gene){return projection?.phenotype?.[gene]||gene}
function rankOf(value){const m=String(value||'').match(/^(\d+)H\./);return m?`${m[1]}H`:'S'}
function rankNumber(value){const m=String(value||'').match(/^(\d+)H(?:\.|$)/);return m?Number(m[1]):0}
function bodyScaleFor(entity){return S_QUANTUM_SCALE*Math.pow(2,rankNumber(entity?.rank))}
function rootFieldScale(width){return width<ROOT_FIELD_BREAKPOINT?ROOT_FIELD_MOBILE:ROOT_FIELD_DESKTOP}
/* per-frame DOM witnesses write only on change, so an idle frame never dirties style/layout */
function setData(el,key,value){value=String(value);if(el.dataset[key]!==value)el.dataset[key]=value}
function setHud(html){if(state.hudHtml!==html){state.hudHtml=html;state.hud.innerHTML=html}}
function flowPoint(entity,now=performance.now()){
  const points=[entity.motionA,entity.motionB,entity.motionC,entity.motionD].filter(Boolean);
  if(points.length<2)return entity.world;
  const phase=random01(entity.id,'flow-phase')*points.length,speed=mix(.72,1.28,random01(entity.id,'flow-speed'));
  const u=((now/OVERVIEW_FLOW_PERIOD_MS)*speed+phase)%points.length,index=Math.floor(u),t=smooth(u-index);
  const wander=mix3(points[index],points[(index+1)%points.length],t);
  return mix3(entity.world,wander,OVERVIEW_WANDER);
}
/* One bounded flow law at every scale — organisms in their chamber, metabolites in their organism: a body is a
 * small mass drawn toward its own flow point and pushed away by every neighbour inside their shared reach, so
 * bodies spread apart by themselves and keep moving. Motion only — nothing gains or loses meaning by where it drifts. */
const BODY_SPRING=6,BODY_PUSH=12.8,BODY_DRAG=4;
function driftBodies(sim,items,dt,reach,spring=BODY_SPRING){
  const bodies=items.map(it=>{let b=sim.bodies.get(it.id);if(!b){b={p:[...it.target],v:[0,0,0]};sim.bodies.set(it.id,b)}return b});
  const force=bodies.map((b,i)=>sub(items[i].target,b.p).map(x=>x*spring));
  for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
    const R=reach(items[i],items[j]);let dv=sub(bodies[i].p,bodies[j].p),dist=Math.hypot(...dv);if(dist>=R)continue;
    if(dist<1e-9){const a=random01(items[i].id,items[j].id)*Math.PI*2;dv=[Math.cos(a),Math.sin(a),.3];dist=Math.hypot(...dv)}
    const f=BODY_PUSH*(1-dist/R)*R/dist;
    for(let k=0;k<3;k++){force[i][k]+=dv[k]*f;force[j][k]-=dv[k]*f}
  }
  const drag=Math.exp(-BODY_DRAG*dt);
  bodies.forEach((b,i)=>{for(let k=0;k<3;k++){b.v[k]=(b.v[k]+force[i][k]*dt)*drag;b.p[k]+=b.v[k]*dt}});
  return bodies;
}
function det3(a,b,c){return a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0])}
/* a body drifts inside the container that bounds it and never crosses it: outside → nearest-by-barycentric point on the tet */
function holdInTet(body,tet){
  const [a,b,c,d]=tet,e1=sub(a,d),e2=sub(b,d),e3=sub(c,d),r=sub(body.p,d),det=det3(e1,e2,e3);if(Math.abs(det)<1e-12)return false;
  let l=[det3(r,e2,e3)/det,det3(e1,r,e3)/det,det3(e1,e2,r)/det];l.push(1-l[0]-l[1]-l[2]);
  if(l.every(x=>x>=0))return false;
  l=l.map(x=>Math.max(0,x));const s=l.reduce((u,v)=>u+v,0)||1;
  body.p=[0,1,2].map(k=>(l[0]*a[k]+l[1]*b[k]+l[2]*c[k]+l[3]*d[k])/s);return true;
}
/* Organisms obey the same law one scale up: each drifts toward its own chamber flow point and repels the organisms
 * sharing its chamber — reach grows with both bodies' 2^n size — and repulsion never crosses a chamber wall. A softer
 * spring than metabolites': chamber flow points crowd toward the centroid (Governance carries most of the population),
 * so bodies must be free to leave their target to find room. Stepped once per frame; every reader of an organism's
 * position (draw, names, hit-test) sees the same drifted body. */
const ORGANISM_REACH=.08,ORGANISM_SPRING=3;
function driftOrganisms(now){
  if(!state?.records?.length)return;
  const sim=state.orgSim||(state.orgSim={bodies:new Map(),t:now}),dt=Math.min(.05,Math.max(0,(now-sim.t)/1000));sim.t=now;
  const chambers=new Map();
  for(const rec of state.records){const list=chambers.get(rec.locus)||[];list.push({id:rec.id,target:flowPoint(rec,now),size:bodyScaleFor(rec),tet:rec.tet});chambers.set(rec.locus,list)}
  for(const items of chambers.values())driftBodies(sim,items,dt,(a,b)=>ORGANISM_REACH+a.size+b.size,ORGANISM_SPRING).forEach((b,i)=>{if(items[i].tet&&holdInTet(b,items[i].tet))b.v=b.v.map(v=>v*.5)});
}
function overviewDriftPoint(entity,now=performance.now()){return state?.orgSim?.bodies.get(entity.id)?.p||flowPoint(entity,now)}
function chamberFocus(){return state?.chamberFocus||{center:[0,0,0],scale:1}}
function backgroundPassage(){return state?.backgroundPassage||0}
function inquiryFrameFocus(){
  const focus=chamberFocus(),t=backgroundPassage();
  return {center:mix3(focus.center,[0,0,0],t),scale:mix(focus.scale,1,t)};
}
function overviewTransformScale(width){return rootFieldScale(width)*inquiryFrameFocus().scale}
function overviewWorldPoint(point,width){const focus=inquiryFrameFocus();return mul(sub(point,focus.center),rootFieldScale(width)*focus.scale)}
function overviewCenterFor(entity,width,now=performance.now()){return overviewWorldPoint(overviewDriftPoint(entity,now),width)}
function overviewBodyScaleFor(entity,width){return bodyScaleFor(entity)*overviewTransformScale(width)}
function rootBodyScaleFor(entity,width){return bodyScaleFor(entity)*rootFieldScale(width)}
function cameraForScale(scale){return Math.max(MIN_MACRO_Z,scale/MACRO_FILL)}
function setBackgroundPassage(target,now=performance.now()){
  if(!state)return;
  const current=backgroundPassage();
  state.backgroundPassage=current;state.backgroundPassageFrom=current;state.backgroundPassageTo=clamp(target);state.backgroundPassageStart=now;
}
function updateBackgroundPassage(now){
  if(!state||state.backgroundPassageFrom==null||state.backgroundPassageTo==null)return;
  const t=smooth(clamp((now-state.backgroundPassageStart)/OPEN_MS));
  state.backgroundPassage=mix(state.backgroundPassageFrom,state.backgroundPassageTo,t);
  if(t>=1){state.backgroundPassage=state.backgroundPassageTo;state.backgroundPassageFrom=null;state.backgroundPassageTo=null}
}
function fieldProjection(d){
  const children={};
  for(const g of GENES){
    const sources=Array.isArray(d?.groups?.[g])?d.groups[g].length:0;
    const holons=Array.isArray(d?.holons?.[g])?d.holons[g].length:0;
    const noun=locusName(d,g);
    children[g]={noun,de:noun,en:noun,gene:DNA[g],one:{de:`${sources} Quellen · ${holons} Holons.`,en:`${sources} sources · ${holons} holons.`},children:{}};
  }
  return {source:{organism:'papers',home:d?.event_id||'papers'},root:{noun:'Papers',children},occupancy:{w:[],x:[],z:[],y:[]},points:[]};
}

function identityIndex(projection){
  const out=new Map();
  for(const g of GENES){
    for(const x of projection?.groups?.[g]||[]){
      const meta=projection?.source_meta?.[x.id],credit=Array.isArray(meta)&&typeof meta[0]==='string'?meta[0].trim():'',metabolism=Array.isArray(meta)&&typeof meta[1]==='string'?meta[1].trim():'',externals=Array.isArray(meta)&&Array.isArray(meta[2])?meta[2].filter(u=>typeof u==='string'&&/^https?:\/\//.test(u)):[];
      out.set(x.id,{id:x.id,title:x.title,gene:g,kind:'source',rank:'S',publicWisdom:false,wisdom:'',credit,metabolism,externals,parents:[]});
    }
    for(const x of projection?.holons?.[g]||[]){
      const meta=projection?.holon_meta?.[x.id],wisdom=Array.isArray(meta)&&typeof meta[3]==='string'?meta[3].trim():'',parents=Array.isArray(meta)&&Array.isArray(meta[0])?[...meta[0]]:[];
      out.set(x.id,{id:x.id,title:x.title,gene:g,kind:'holon',rank:rankOf(x.id),publicWisdom:Boolean(wisdom),wisdom,credit:'',metabolism:'',externals:[],parents});
    }
  }
  return out;
}
function parentIndex(projection){
  const out=new Map();
  for(const [child,meta] of Object.entries(projection?.holon_meta||{})){
    const ps=Array.isArray(meta)&&Array.isArray(meta[0])?meta[0]:[];
    if(ps.length===4)out.set(child,[...ps]);
  }
  return out;
}
function pointInTet(tet,spec,inset=.28){
  let weights=[0,1,2,3].map(i=>-Math.log(Math.max(1e-7,random01(spec.id,i))));
  const s=weights.reduce((a,b)=>a+b,0);weights=weights.map(v=>v/s);
  weights=weights.map(v=>(1-inset)*v+inset*.25);
  return [0,1,2].map(k=>weights.reduce((sum,w,i)=>sum+w*tet[i][k],0));
}
function buildRecords(projection,fieldRoot){
  const structure=N.collectStructure(fieldRoot),byGene=new Map();
  for(const g of GENES){
    const cell=structure.leaves.find(c=>c.path===g)||structure.leaves.find(c=>c.path?.startsWith(g));
    if(cell)byGene.set(g,cell);
  }
  const identities=identityIndex(projection),records=[];
  for(const entity of identities.values()){
    const cell=byGene.get(entity.gene);if(cell){
      const world=pointInTet(cell.tet,entity),motionA=pointInTet(cell.tet,{id:entity.id+'·flow-a'},.20),motionB=pointInTet(cell.tet,{id:entity.id+'·flow-b'},.20),motionC=pointInTet(cell.tet,{id:entity.id+'·flow-c'},.20),motionD=pointInTet(cell.tet,{id:entity.id+'·flow-d'},.20);
      records.push({...entity,locus:cell.path,tet:cell.tet,world,motionA,motionB,motionC,motionD});
    }
  }
  return {records,structure};
}

function applyProjection(next,shadowHome=''){
  if(!state||!next?.groups||!next?.phenotype)return false;
  const fp=fieldProjection(next),built=buildRecords(next,fp.root);
  state.projection=next;
  state.identities=identityIndex(next);
  state.parents=parentIndex(next);
  state.structure=built.structure;
  state.records=built.records;
  state.recordById=new Map(built.records.map(x=>[x.id,x]));
  state.wisdomPrepared=new Map();
  if(shadowHome){
    state.shadowApplied=true;state.shadowHome=shadowHome;
    state.canvas.dataset.shadowState='ready';state.canvas.dataset.shadowHome=shadowHome;
    state.textCanvas.dataset.shadowState='ready';state.textCanvas.dataset.shadowHome=shadowHome;
  }
  if(state.current&&!state.identities.has(state.current.id)){
    state.current=null;state.stack=[];state.transition=0;state.closing=false;state.label.classList.remove('show');
  }else if(state.current)setLabel(state.current.id);
  return true;
}
function hydrateShadow(host){
  if(!state||state.host!==host)return;
  state.canvas.dataset.shadowState=state.shadowApplied?'ready':'loading';
  state.textCanvas.dataset.shadowState=state.shadowApplied?'ready':'loading';
  ensureShadow().then(snap=>{
    if(!snap||!state||state.host!==host||!state.mounted)return;
    const home=snap.inquiry_home_event||snap.projection?.event_id||'';
    state.inquiryBodies=snap?.inquiry?.bodies&&typeof snap.inquiry.bodies==='object'?snap.inquiry.bodies:{};
    state.canvas.dataset.genealogyRepairCount=String(snap?.genealogy_repair?.applied?.length||0);
    if(!state.shadowApplied||state.shadowHome!==home)applyProjection(snap.projection,home);
  });
}

function perspective(fovy,aspect,near,far){const f=1/Math.tan(fovy/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0])}
function lookAt(eye,center,up){
  const sub=(a,b)=>a.map((v,i)=>v-b[i]);
  const nrm=v=>{const m=Math.hypot(...v)||1;return v.map(x=>x/m)};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  const z=nrm(sub(eye,center)),x=nrm(cross(up,z)),y=cross(z,x);
  return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
}
function compile(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
function program(gl,vs,fs){const p=gl.createProgram();gl.attachShader(p,compile(gl,gl.VERTEX_SHADER,vs));gl.attachShader(p,compile(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p}

function createRenderer(canvas){
  const gl=canvas.getContext('webgl2',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:true});
  if(!gl)return null;
  const V0=N.V0.map(v=>[...v]);
  const VS=`#version 300 es
precision highp float;
in vec3 aPos;
in vec3 iCenter;
in float iScale;
in vec4 iColor;
uniform mat4 uProj,uView;
uniform vec4 uQuat;
uniform vec3 uTranslate;
out vec4 vColor;
vec3 qrot(vec4 q,vec3 v){return v+2.0*cross(q.yzw,cross(q.yzw,v)+q.x*v);}
void main(){vec3 local=iCenter+aPos*iScale;vec3 world=qrot(uQuat,local)+uTranslate;gl_Position=uProj*uView*vec4(world,1.0);vColor=iColor;}`;
  const FS=`#version 300 es
precision highp float;
in vec4 vColor;
out vec4 outColor;
void main(){outColor=vColor;}`;
  const LIGHT_VS=`#version 300 es
precision highp float;
in vec3 iCenter;
in float iSize;
in vec4 iColor;
in float iPhase;
uniform mat4 uProj,uView;
uniform vec4 uQuat;
uniform vec3 uTranslate;
uniform float uTime;
out vec4 vColor;
vec3 qrot(vec4 q,vec3 v){return v+2.0*cross(q.yzw,cross(q.yzw,v)+q.x*v);}
void main(){
  vec3 world=qrot(uQuat,iCenter)+uTranslate;
  gl_Position=uProj*uView*vec4(world,1.0);
  gl_PointSize=max(1.0,iSize*(.94+.06*sin(uTime*1.25+iPhase)));
  vColor=iColor;
}`;
  const LIGHT_FS=`#version 300 es
precision highp float;
in vec4 vColor;
out vec4 outColor;
void main(){
  vec2 p=gl_PointCoord*2.0-1.0;
  float r=length(p);
  if(r>1.0)discard;
  float halo=pow(max(0.0,1.0-r),2.15);
  float core=exp(-12.0*r*r);
  float body=1.0-smoothstep(.16,1.0,r);
  vec3 warm=vec3(1.0,.93,.72);
  vec3 c=mix(vColor.rgb,warm,core*.58);
  float a=vColor.a*(.18*halo+.78*core+.20*body);
  outColor=vec4(c,a);
}`;
  const p=program(gl,VS,FS);
  const loc={
    pos:gl.getAttribLocation(p,'aPos'),center:gl.getAttribLocation(p,'iCenter'),scale:gl.getAttribLocation(p,'iScale'),color:gl.getAttribLocation(p,'iColor'),
    proj:gl.getUniformLocation(p,'uProj'),view:gl.getUniformLocation(p,'uView'),quat:gl.getUniformLocation(p,'uQuat'),translate:gl.getUniformLocation(p,'uTranslate')
  };
  const triangles=[];for(const f of FACE)for(const i of f)triangles.push(...V0[i]);
  const lines=[];for(const e of EDGE)lines.push(...V0[e[0]],...V0[e[1]]);
  const instanceBuffer=gl.createBuffer();
  const lightProgram=program(gl,LIGHT_VS,LIGHT_FS),lightVao=gl.createVertexArray(),lightBuffer=gl.createBuffer();
  const lightLoc={
    center:gl.getAttribLocation(lightProgram,'iCenter'),size:gl.getAttribLocation(lightProgram,'iSize'),
    color:gl.getAttribLocation(lightProgram,'iColor'),phase:gl.getAttribLocation(lightProgram,'iPhase'),
    proj:gl.getUniformLocation(lightProgram,'uProj'),view:gl.getUniformLocation(lightProgram,'uView'),
    quat:gl.getUniformLocation(lightProgram,'uQuat'),translate:gl.getUniformLocation(lightProgram,'uTranslate'),
    time:gl.getUniformLocation(lightProgram,'uTime')
  };
  function geom(data){const vao=gl.createVertexArray();gl.bindVertexArray(vao);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);gl.enableVertexAttribArray(loc.pos);gl.vertexAttribPointer(loc.pos,3,gl.FLOAT,false,12,0);return {vao,count:data.length/3}}
  const tri=geom(triangles),line=geom(lines);
  function flatten(instances){const out=[];for(const x of instances)out.push(x.center[0],x.center[1],x.center[2],x.scale,x.color[0],x.color[1],x.color[2],x.color[3]);return out}
  function bindInstances(geometry,data){
    gl.bindVertexArray(geometry.vao);gl.bindBuffer(gl.ARRAY_BUFFER,instanceBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);
    const stride=32;
    gl.enableVertexAttribArray(loc.center);gl.vertexAttribPointer(loc.center,3,gl.FLOAT,false,stride,0);gl.vertexAttribDivisor(loc.center,1);
    gl.enableVertexAttribArray(loc.scale);gl.vertexAttribPointer(loc.scale,1,gl.FLOAT,false,stride,12);gl.vertexAttribDivisor(loc.scale,1);
    gl.enableVertexAttribArray(loc.color);gl.vertexAttribPointer(loc.color,4,gl.FLOAT,false,stride,16);gl.vertexAttribDivisor(loc.color,1);
  }
  function draw(instances,q,translate,proj,view,{faces=true}={}){
    if(!instances.length)return;const data=flatten(instances);
    gl.useProgram(p);gl.uniformMatrix4fv(loc.proj,false,proj);gl.uniformMatrix4fv(loc.view,false,view);gl.uniform4fv(loc.quat,new Float32Array(q));gl.uniform3fv(loc.translate,new Float32Array(translate));
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.DEPTH_TEST);
    if(faces){gl.depthMask(false);bindInstances(tri,data);gl.drawArraysInstanced(gl.TRIANGLES,0,tri.count,instances.length)}
    gl.depthMask(false);bindInstances(line,data);gl.drawArraysInstanced(gl.LINES,0,line.count,instances.length);gl.depthMask(true);
  }
  function drawLights(lights,q,translate,proj,view,time,dpr=1,gain=1){
    if(!lights.length)return;
    const data=[];for(const x of lights)data.push(x.center[0],x.center[1],x.center[2],x.size*dpr,x.color[0],x.color[1],x.color[2],x.color[3]*gain,x.phase);
    gl.bindVertexArray(lightVao);gl.bindBuffer(gl.ARRAY_BUFFER,lightBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);
    const stride=36;
    for(const [at,size,off] of [[lightLoc.center,3,0],[lightLoc.size,1,12],[lightLoc.color,4,16],[lightLoc.phase,1,32]]){gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,size,gl.FLOAT,false,stride,off)}
    gl.useProgram(lightProgram);gl.uniformMatrix4fv(lightLoc.proj,false,proj);gl.uniformMatrix4fv(lightLoc.view,false,view);gl.uniform4fv(lightLoc.quat,new Float32Array(q));gl.uniform3fv(lightLoc.translate,new Float32Array(translate));gl.uniform1f(lightLoc.time,time);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.drawArrays(gl.POINTS,0,lights.length);gl.depthMask(true);
  }
  return {gl,V0,draw,drawLights};
}

function sitePalette(siteId){
  try{
    const el=document.getElementById('site-registry'),r=JSON.parse(el?.textContent||'{}'),spec=(r.interlocutors||[]).find(x=>x.id===siteId),p=spec?.shader?.palette;
    if(Array.isArray(p)&&p.length===3)return p;
  }catch(_){}
  return [.28,.78,.92];
}
function createInquiryEnvironment(canvas){
  const parent=modules.get('organism:philosophy'),shader=parent?.shader;
  if(!shader?.fragment||!Fields?.paletteSet)return null;
  const gl=canvas.getContext('webgl2',{alpha:false,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:true});if(!gl)return null;
  const VS=`#version 300 es
precision highp float;
uniform vec4 uQuat;
out vec3 vN;
out vec3 vW;
out float vRegion;
vec3 qrot(vec4 q,vec3 v){return v+2.0*cross(q.yzw,cross(q.yzw,v)+q.x*v);}
void main(){
  vec2 p=gl_VertexID==0?vec2(-1.0,-1.0):(gl_VertexID==1?vec2(3.0,-1.0):vec2(-1.0,3.0));
  gl_Position=vec4(p,0.0,1.0);
  vW=qrot(uQuat,vec3(p*.72,-.35));
  vN=qrot(uQuat,normalize(vec3(-p.x*.18,-p.y*.18,1.0)));
  vRegion=3.0;
}`;
  const p=program(gl,VS,shader.fragment),vao=gl.createVertexArray(),palette=Fields.paletteSet(sitePalette('organism:philosophy'));
  const U={quat:gl.getUniformLocation(p,'uQuat'),time:gl.getUniformLocation(p,'uTime'),focus:gl.getUniformLocation(p,'uFocus'),resolution:gl.getUniformLocation(p,'uResolution'),palette:gl.getUniformLocation(p,'uPalette[0]')};
  function draw(ms){
    const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.5)*(state?.renderScale||1),w=Math.max(1,Math.floor(r.width*d)),h=Math.max(1,Math.floor(r.height*d));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
    const clear=Array.isArray(shader.clear)&&shader.clear.length===4?shader.clear:[.006,.009,.014,1];
    gl.viewport(0,0,w,h);gl.clearColor(...clear);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.useProgram(p);gl.bindVertexArray(vao);
    gl.uniform4fv(U.quat,new Float32Array(W.orientation));if(U.time)gl.uniform1f(U.time,ms*.001);if(U.focus)gl.uniform1f(U.focus,PHILOSOPHY_INQUIRY_REGION);if(U.resolution)gl.uniform2f(U.resolution,w,h);if(U.palette)gl.uniform3fv(U.palette,new Float32Array(palette.flat()));
    gl.drawArrays(gl.TRIANGLES,0,3);
    canvas.dataset.shaderId=shader.id;canvas.dataset.region='y';canvas.dataset.mode='inquiry-environment';
  }
  return Object.freeze({draw,shaderId:shader.id,region:'y'});
}
function makeStage(host){
  const environmentCanvas=document.createElement('canvas');environmentCanvas.className='papers-inquiry-environment-stage';environmentCanvas.setAttribute('aria-hidden','true');host.append(environmentCanvas);
  const canvas=document.createElement('canvas');canvas.className='papers-sierpinski-stage';canvas.setAttribute('aria-label','Papers recursive tetrahedral inquiry field');host.append(canvas);
  const textCanvas=document.createElement('canvas');textCanvas.className='papers-wisdom-stage';textCanvas.setAttribute('aria-label','Papers active metabolight wisdom');textCanvas.dataset.pretextVersion=PRETEXT_VERSION;host.append(textCanvas);
  const physiology=document.createElement('section');physiology.className='papers-physiology';physiology.setAttribute('aria-label','How Papers lives');
  physiology.innerHTML='<small>HOW PAPERS LIVES</small><i class="papers-physiology-thesis">not a library: nothing is filed. every whole here is something only four chance-met organisms could earn together</i><canvas class="papers-physiology-canvas" aria-hidden="true"></canvas><div class="papers-physiology-phases"></div><div class="papers-physiology-copy"><b></b><span></span></div>';
  const physiologyPhases=physiology.querySelector('.papers-physiology-phases');
  for(const phase of PHYSIOLOGY_PHASES){const n=document.createElement('span');n.dataset.phase=phase.id;n.textContent=phase.label;physiologyPhases.append(n)}
  host.append(physiology);
  const physiologyCanvas=physiology.querySelector('.papers-physiology-canvas'),physiologyTitle=physiology.querySelector('.papers-physiology-copy b'),physiologyCopy=physiology.querySelector('.papers-physiology-copy span');
  const sourceInfo=document.createElement('section');sourceInfo.className='papers-source-inquiry';sourceInfo.setAttribute('aria-label','Selected Papers organism origin');
  sourceInfo.innerHTML='<div class="papers-source-original"><small class="papers-origin-label">ORIGIN</small><span class="papers-source-code"></span><h2></h2><p class="papers-source-credit"></p><div class="papers-source-links"></div></div>';
  host.append(sourceInfo);
  const chamberLabels=document.createElement('div');chamberLabels.className='papers-chamber-labels';chamberLabels.setAttribute('aria-hidden','true');host.append(chamberLabels);
  const chamberLabelNodes=new Map();
  for(const gene of GENES){const n=document.createElement('button');n.type='button';n.className='papers-chamber-label';n.dataset.gene=gene;n.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(state&&!state.current)setChamber(gene)});chamberLabels.append(n);chamberLabelNodes.set(gene,n)}
  const hud=document.createElement('div');hud.className='papers-sierpinski-hud';host.append(hud);
  const label=document.createElement('div');label.className='papers-sierpinski-label';host.append(label);
  return {environmentCanvas,canvas,textCanvas,physiology,physiologyCanvas,physiologyPhases:[...physiologyPhases.children],physiologyTitle,physiologyCopy,sourceInfo,chamberLabels,chamberLabelNodes,hud,label};
}
/* frame governor: a weak (CPU-only) machine keeps its motion smooth by lowering the GL canvases' internal
 * resolution; frame time is watched continuously and resolution climbs back when there is headroom. */
function governFrame(now){
  const dt=now-(state.frameLast||now);state.frameLast=now;if(dt<=0||dt>250)return;
  state.frameEma=mix(state.frameEma||16.7,dt,.08);const s=state.renderScale||1;
  if(now<(state.renderScaleAt||0))return;
  if(state.frameEma>24&&s>.45){state.renderBad=s;state.renderScale=Math.max(.45,s*.85);state.renderScaleAt=now+900}
  else if(state.frameEma<18&&s<1){if(state.renderBad)state.renderBad=Math.min(1.2,state.renderBad*1.02);const ceil=state.renderBad?state.renderBad*.97:1;if(s*1.08<=ceil){state.renderScale=Math.min(1,s*1.08);state.renderScaleAt=now+2500}}
  state.canvas.dataset.renderScale=(state.renderScale||1).toFixed(2);
}
function resizeCanvas(canvas){
  const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.6)*(state?.renderScale||1),w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
  return {rect:r,d,w,h};
}
function resizeWisdomCanvas(canvas,rect){
  const d=Math.min(devicePixelRatio||1,1.6),w=Math.max(1,Math.round(rect.width*d)),h=Math.max(1,Math.round(rect.height*d));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
  const ctx=canvas.getContext('2d');ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,rect.width,rect.height);
  return {ctx,d};
}

function resizePhysiologyCanvas(canvas){
  const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.6),w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
  const ctx=canvas.getContext('2d');ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,r.width,r.height);
  return {ctx,r};
}
function simplex2D(ctx,x,y,size,rotation=0,alpha=.5,fill=.04){
  const raw=[[0,-.72],[-.66,.42],[.66,.42],[0,.10]],c=Math.cos(rotation),sn=Math.sin(rotation);
  const pts=raw.map(([px,py])=>[x+(px*c-py*sn)*size,y+(px*sn+py*c)*size]);
  ctx.save();ctx.lineWidth=1;ctx.strokeStyle=`rgba(221,246,229,${alpha})`;ctx.fillStyle=`rgba(182,238,205,${fill})`;
  for(const f of FACE){ctx.beginPath();ctx.moveTo(...pts[f[0]]);ctx.lineTo(...pts[f[1]]);ctx.lineTo(...pts[f[2]]);ctx.closePath();ctx.fill()}
  for(const e of EDGE){ctx.beginPath();ctx.moveTo(...pts[e[0]]);ctx.lineTo(...pts[e[1]]);ctx.stroke()}
  ctx.restore();
}
function drawOverviewPhysiology(now){
  const box=state.physiology,canvas=state.physiologyCanvas;if(!box||!canvas)return;
  const visible=!state.current;setData(box,'visible',visible?'true':'false');if(box.getAttribute('aria-hidden')!==(visible?'false':'true'))box.setAttribute('aria-hidden',visible?'false':'true');
  if(!visible)return;
  const total=PHYS_W.reduce((a,b)=>a+b,0);let cycle=(now/PHYSIOLOGY_PHASE_MS)%total,index=0;while(index<PHYS_W.length-1&&cycle>=PHYS_W[index]){cycle-=PHYS_W[index];index++}const phaseT=clamp(cycle/PHYS_W[index]),phase=PHYSIOLOGY_PHASES[index];
  if(box.dataset.phase!==phase.id){
    box.dataset.phase=phase.id;state.physiologyTitle.textContent=phase.label;state.physiologyCopy.textContent=phase.copy;
    state.physiologyPhases.forEach((n,i)=>n.dataset.active=i===index?'true':'false');
  }
  const {ctx,r}=resizePhysiologyCanvas(canvas),w=r.width,h=r.height;
  physiologyStory(ctx,w,h,index,phaseT,now);
}
/* HOW PAPERS LIVES — one continuous story told from Papers' own receptors (intake → metabolism
 * external-source → identity → anabolism). The body is a population of living organisms of every rank.
 * It reaches out; one real outside work arrives while its authors stay outside; its OWN four parts become
 * one tetrahedral Source S. Then the heart: a random eligible rank is drawn, four distinct living organisms
 * of it are drawn at random, and they become one next-rank Holon only if every edge, face and the whole
 * genuinely need them together — otherwise no birth, and the draw begins again. Parents are never
 * consumed. Canvas2D only; everything is derived from time, nothing is stored between frames. */
const PHYS_W=[.8,.9,1.1,2.8];
const PHYS_RAW=[[0,-.72],[-.66,.42],[.66,.42],[0,.10]];
const PHYS_POP=Object.freeze({
  S:[[.08,.30],[.19,.21],[.30,.33],[.11,.52],[.23,.46],[.35,.57],[.07,.75],[.20,.69],[.33,.82]],
  H1:[[.46,.26],[.50,.62],[.44,.86]],
  H2:[[.57,.42]]
});
const PHYS_NEW_S=8,PHYS_FAIL=[0,3,5,7],PHYS_WIN=[1,2,4,8];
function physTet(c,size,rot=0){const cs=Math.cos(rot),sn=Math.sin(rot);return PHYS_RAW.map(([x,y])=>[c[0]+(x*cs-y*sn)*size,c[1]+(x*sn+y*cs)*size])}
function physLerp(a,b,t){return [mix(a[0],b[0],t),mix(a[1],b[1],t)]}
function physDot(ctx,p,r,a,rgb='232,252,238'){if(a<=.004)return;ctx.fillStyle=`rgba(${rgb},${a.toFixed(3)})`;ctx.beginPath();ctx.arc(p[0],p[1],r,0,Math.PI*2);ctx.fill()}
function physGlow(ctx,p,r,a){if(a<=.004)return;const g=ctx.createRadialGradient(p[0],p[1],0,p[0],p[1],r);g.addColorStop(0,`rgba(250,255,222,${a.toFixed(3)})`);g.addColorStop(.35,`rgba(226,255,196,${(a*.45).toFixed(3)})`);g.addColorStop(1,'rgba(200,255,190,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p[0],p[1],r,0,Math.PI*2);ctx.fill()}
function physStroke(ctx,pts,a,dash=null){if(a<=.004)return;ctx.save();ctx.strokeStyle=`rgba(221,246,229,${a.toFixed(3)})`;ctx.lineWidth=1;if(dash)ctx.setLineDash(dash);for(const [i,j] of EDGE){ctx.beginPath();ctx.moveTo(...pts[i]);ctx.lineTo(...pts[j]);ctx.stroke()}ctx.restore()}
function physLabel(ctx,text,x,y,a,font='5.5px ui-monospace, monospace'){if(a<=.004)return;ctx.font=font;ctx.fillStyle=`rgba(236,250,240,${a.toFixed(3)})`;ctx.fillText(text,x,y)}
function physStatus(ctx,w,h,text,a){physLabel(ctx,text,w*.03,h*.97,.62*a)}
function physPop(ctx,w,h,now,{showNewS=true,glowS=null,glowH2=0,dim=1}={}){
  const P={S:PHYS_POP.S.map(([x,y])=>[x*w,y*h]),H1:PHYS_POP.H1.map(([x,y])=>[x*w,y*h]),H2:PHYS_POP.H2.map(([x,y])=>[x*w,y*h])};
  P.S.forEach((p,i)=>{if(i===PHYS_NEW_S&&!showNewS)return;const hot=glowS?.[i]||0,pulse=.5+.5*Math.sin(now*.0023+i*1.9);physDot(ctx,p,1.5+1.2*hot,(.42+.2*pulse+.38*hot)*dim);if(hot>.01)physGlow(ctx,p,6+4*hot,.45*hot)});
  P.H1.forEach((p,i)=>{const r=Math.sin(now*.0003+i)*.2;physStroke(ctx,physTet(p,h*.07,r),.34*dim);physGlow(ctx,[p[0],p[1]+h*.005],3,.35*dim)});
  P.H2.forEach((p,i)=>{const r=Math.sin(now*.00022+i+1)*.15;physStroke(ctx,physTet(p,h*.12,r),(.3+.45*glowH2)*dim);physGlow(ctx,[p[0],p[1]+h*.008],4+3*glowH2,(.35+.4*glowH2)*dim)});
  return P;
}
function physSelector(ctx,w,h,now,target,landed,a){
  const ranks=['S','1H','2H'],x0=w*.03,y=h*.12,spin=Math.floor(now/85)%3,on=landed?target:spin;
  physLabel(ctx,'draw a rank:',x0,y,.4*a);
  ranks.forEach((r,i)=>{const x=x0+w*.13+i*w*.07,hot=i===on;if(hot){ctx.strokeStyle=`rgba(236,250,240,${(.7*a).toFixed(3)})`;ctx.strokeRect(x-2,y-6.5,r.length*4.2+4,9)}physLabel(ctx,r,x,y,(hot?.9:.3)*a,'600 5.5px ui-monospace, monospace')});
}
function physMeet(ctx,pts,edgeT,faceT,badFace,badT,a){
  EDGE.forEach(([i,j],k)=>{const e=clamp(edgeT*6-k);if(e<=0)return;const end=physLerp(pts[i],pts[j],e);ctx.strokeStyle=`rgba(221,246,229,${(.6*a).toFixed(3)})`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(...pts[i]);ctx.lineTo(...end);ctx.stroke()});
  FACE.forEach((f,k)=>{const q=clamp(faceT*4-k);if(q<=0)return;const bad=k===badFace&&badT>0;ctx.save();ctx.beginPath();ctx.moveTo(...pts[f[0]]);ctx.lineTo(...pts[f[1]]);ctx.lineTo(...pts[f[2]]);ctx.closePath();
    if(bad){ctx.setLineDash([2,2]);ctx.strokeStyle=`rgba(255,196,170,${(.7*badT*a).toFixed(3)})`;ctx.stroke()}else{ctx.fillStyle=`rgba(190,242,210,${(.07*q*a).toFixed(3)})`;ctx.fill()}ctx.restore()});
}
function physiologyStory(ctx,w,h,phase,u,now){
  const memX=w*.68,P0=[w*.86,h*.44],tag=[memX+w*.04,h*.9],M=[w*.52,h*.5],sm=h*.28;
  ctx.lineCap='round';ctx.lineJoin='round';
  ctx.save();ctx.setLineDash([2,4]);ctx.strokeStyle='rgba(173,235,205,.18)';ctx.beginPath();ctx.moveTo(memX,h*.04);ctx.quadraticCurveTo(memX-w*.03,h*.5,memX,h*.96);ctx.stroke();ctx.restore();
  physLabel(ctx,'OUTSIDE',memX+w*.04,h*.12,.26);
  if(phase<3){
    const P=physPop(ctx,w,h,now,{showNewS:phase===2&&u>.9,dim:phase===2?.55:1});
    if(phase<2)physLabel(ctx,'PAPERS · every organism alive, every rank',w*.03,h*.12,.26);
    if(phase===0){
      const reach=smooth(u/.7),from=P.H2[0],tip=physLerp(from,[memX,h*.3],reach);
      ctx.strokeStyle=`rgba(221,246,229,${(.45*reach).toFixed(3)})`;ctx.beginPath();ctx.moveTo(...from);ctx.quadraticCurveTo((from[0]+tip[0])/2,h*.08,tip[0],tip[1]);ctx.stroke();physDot(ctx,tip,1.6,.8*reach);
      physStatus(ctx,w,h,'it notices what it cannot yet answer, and reaches out',smooth(u/.3));
    }
    /* the outside work, its authors staying outside on the provenance thread */
    let pagePos=P0,pageA=phase===0?smooth((u-.45)/.35):1,peel=0;
    if(phase===1){pagePos=physLerp(P0,M,smooth(u/.5));peel=smooth((u-.52)/.43)}
    physLabel(ctx,'AUTHORS',tag[0],tag[1]-7,.55*pageA);physLabel(ctx,'ORIGINAL WORK',tag[0],tag[1],.42*pageA);
    const page=[28,36];
    if(phase<2&&pageA>.01&&peel<1){const a=pageA*(1-peel),x=pagePos[0]-page[0]/2,y=pagePos[1]-page[1]/2;ctx.strokeStyle=`rgba(221,246,229,${(.55*a).toFixed(3)})`;ctx.lineWidth=1;ctx.strokeRect(x,y,page[0],page[1]);ctx.fillStyle=`rgba(221,246,229,${(.42*a).toFixed(3)})`;for(let l=0;l<5;l++)ctx.fillRect(x+4,y+6+l*6,page[0]-8-(l%2)*7,1.4)}
    const V=physTet(M,sm);
    const bodyAt=phase===1?pagePos:(phase===2?(u<.66?M:physLerp(M,P.S[PHYS_NEW_S],smooth((u-.66)/.24))):null);
    if(bodyAt&&pageA>.01){ctx.save();ctx.setLineDash([1,3]);ctx.strokeStyle=`rgba(236,250,240,${(.28*pageA).toFixed(3)})`;ctx.beginPath();ctx.moveTo(tag[0]+2,tag[1]-13);ctx.lineTo(...bodyAt);ctx.stroke();ctx.restore()}
    if(phase===1){
      if(peel>0){const top=[pagePos[0]-page[0]/2,pagePos[1]-page[1]/2];for(let k=0;k<40;k++){const from=[top[0]+4+(k*2.9)%(page[0]-8),top[1]+6+(k%5)*6],p=physLerp(from,V[Math.floor(k/10)],smooth(clamp(peel*1.25-(k/40)*.25)));physDot(ctx,p,.8,.75)}V.forEach(v=>physDot(ctx,v,1.2+1.4*peel,.5*peel))}
      physStatus(ctx,w,h,'a real work arrives; its authors keep it; it is read whole, then cut into its own four parts',smooth(u/.3));
    }
    if(phase===2){
      const grow=smooth(u/.32),collapse=smooth((u-.66)/.24),size=mix(sm,1.5,collapse),pts=physTet(bodyAt,size);
      physStroke(ctx,pts,(.2+.5*grow)*(1-collapse));
      EDGE.forEach(([i,j],e)=>{for(let k=0;k<7;k++){const f=((k/7)+now*.00022*(1+e*.13))%1;if(f>grow)continue;physDot(ctx,physLerp(pts[i],pts[j],f),.7,.7*(1-collapse))}});
      FACE.forEach((f,fi)=>{for(let k=0;k<12;k++){let a=random01('phys-face-'+fi,k),b=random01('phys-face-'+fi,'b'+k);if(a+b>1){a=1-a;b=1-b}
        physDot(ctx,[pts[f[0]][0]+a*(pts[f[1]][0]-pts[f[0]][0])+b*(pts[f[2]][0]-pts[f[0]][0]),pts[f[0]][1]+a*(pts[f[1]][1]-pts[f[0]][1])+b*(pts[f[2]][1]-pts[f[0]][1])],.6,.4*grow*(1-collapse))}});
      const lights=smooth((u-.36)/.2)*(1-collapse);[[-.18,.05],[.16,.12]].forEach(([dx,dy])=>physGlow(ctx,[bodyAt[0]+dx*size,bodyAt[1]+dy*size],3+3*lights,.7*lights));
      physLabel(ctx,'4 parts · 6 relations · 4 faces · 1 whole',bodyAt[0]-44,bodyAt[1]+sm*.85,.5*grow*(1-collapse));
      physStatus(ctx,w,h,u<.66?'what survives the collapse are its metabolites: its wisdom':'it lives on as one Source, S — alive, never filed',smooth(u/.3));
    }
    return;
  }
  /* GROW — the heart. Draw a rank; if fewer than four live there, draw again. Draw four of it at random.
   * They become one only if every relation needs them together; otherwise no birth. Parents stay. */
  const seg=(a,b)=>clamp((u-a)/(b-a));
  const failPick=seg(.26,.32),failMeet=seg(.32,.46),failGone=seg(.46,.52),winPick=seg(.58,.64),winMeet=seg(.64,.76),born=smooth(seg(.76,.86));
  const glowS=PHYS_POP.S.map((_,i)=>{let g=0;const fk=PHYS_FAIL.indexOf(i),wk=PHYS_WIN.indexOf(i);if(fk>=0)g=Math.max(g,clamp(failPick*4-fk)*(1-failGone));if(wk>=0)g=Math.max(g,clamp(winPick*4-wk)*(u<.76?1:.6));return g});
  const P=physPop(ctx,w,h,now,{glowS,glowH2:u>.1&&u<.18?1:0});
  if(u<.18)physSelector(ctx,w,h,now,2,u>.1,1);else if(u<.52)physSelector(ctx,w,h,now,0,u>.26,1);else physSelector(ctx,w,h,now,0,u>.58,1);
  if(u>.26&&u<.52){const pts=PHYS_FAIL.map(i=>P.S[i]);physMeet(ctx,pts,failMeet*1.3,clamp(failMeet*1.6-.5),2,seg(.4,.46),1-failGone)}
  if(u>.58){const pts=PHYS_WIN.map(i=>P.S[i]),a=1-.55*born;physMeet(ctx,pts,winMeet*1.3,clamp(winMeet*1.6-.5),-1,0,a);
    if(born>0){const c=[pts.reduce((s,p)=>s+p[0],0)/4,pts.reduce((s,p)=>s+p[1],0)/4];physGlow(ctx,c,4+10*born,.7*born);physStroke(ctx,physTet(c,h*.08*born,Math.sin(now*.0004)*.15),.8*born);physLabel(ctx,'1H',c[0]+h*.09,c[1]-h*.06,.8*born,'600 6.5px ui-monospace, monospace')}}
  const status=u<.1?'draw a rank at random…':u<.18?'2H: fewer than four alive → no meeting, draw again':u<.26?'draw again…':u<.32?'S: four distinct living organisms, drawn at random':u<.46?'every edge, face and the whole must need all four…':u<.52?'one face would need filler → UNDERDETERMINED · no birth':u<.58?'nothing is forced. draw again…':u<.64?'four more, at random':u<.76?'6 relations, 4 faces, 1 whole: each earned only together':u<.86?'closure → one 1H is born; the four parents stay alive':'chance meetings, earned wholes: rank n holds 4ⁿ sources';
  physStatus(ctx,w,h,status,1);
}

function projectedPixels(scale,cameraZ,height){return (scale/cameraZ)*(height/2)/Math.tan(FOV/2)*2}
function childBodies(current){
  const ps=state.parents.get(current.id)||[];if(ps.length!==4)return [];
  return ps.map((pid,i)=>({id:pid,center:mul(state.renderer.V0[i],current.scale*.5),scale:current.scale*.5}));
}
function inquiryBody(id){return state?.inquiryBodies?.[id]||null}
function inquiryMetabolites(entity){
  if(!entity)return [];
  const body=inquiryBody(entity.id),items=Array.isArray(body?.metabolites)?body.metabolites:[];
  return items.filter(m=>m&&typeof m==='object'&&(typeof m.title==='string'||typeof m.compression==='string'||typeof m.text==='string'));
}
function metaboliteWisdomText(metabolite){
  if(!metabolite||typeof metabolite!=='object')return '';
  const title=typeof metabolite.title==='string'?metabolite.title.trim():'',compression=typeof metabolite.compression==='string'?metabolite.compression.trim():'';
  return title&&compression?title+' — '+compression:(compression||title);
}
function metaboliteField(entity,current,cam,height,now=performance.now()){
  const metabolites=inquiryMetabolites(entity);if(!current||!metabolites.length)return [];
  const fieldScale=current.scale*METABOLITE_FIELD_SCALE,tet=state.renderer.V0.map(v=>mul(v,fieldScale)),pal=PALETTE[entity?.gene]||PALETTE.x,px=projectedPixels(fieldScale,cam,height);
  return metabolites.map((metabolite,index)=>{
    const metaboliteId=(typeof metabolite.id==='string'&&metabolite.id.trim())?metabolite.id.trim():'M'+(index+1),id=entity.id+'·'+metaboliteId;
    const record={
      id,
      world:pointInTet(tet,{id},.16),
      motionA:pointInTet(tet,{id:id+'·flow-a'},.12),
      motionB:pointInTet(tet,{id:id+'·flow-b'},.12),
      motionC:pointInTet(tet,{id:id+'·flow-c'},.12),
      motionD:pointInTet(tet,{id:id+'·flow-d'},.12)
    };
    const center=flowPoint(record,now),warm=[1.0,.93,.72],blend=mix(.58,.76,random01(id,'metabolite-warm')),color=mix3(pal,warm,blend);
    return {id,metaboliteId,metabolite,center,size:clamp(10+Math.sqrt(Math.max(px,0))*.28+random01(id,'metabolite-size')*3,10,24),color:[...color,.90],phase:random01(id,'metabolite-phase')*Math.PI*2,kind:'metabolite'};
  });
}
/* Metabolites are bodies, not pins: the same bounded flow law as organisms in their chamber (driftBodies), one
 * scale down — every neighbour closer than METABOLITE_REPEL·(organism scale) pushes a light away. */
const METABOLITE_REPEL=.5;
function metaboliteRepel(entityId,lights,fieldScale,now){
  let sim=state.metSim;
  if(!sim||sim.id!==entityId||Math.abs(sim.scale-fieldScale)>fieldScale*.01){sim=state.metSim={id:entityId,scale:fieldScale,bodies:new Map(),t:now}}
  const dt=Math.min(.05,Math.max(0,(now-sim.t)/1000)),R=METABOLITE_REPEL*fieldScale/METABOLITE_FIELD_SCALE;sim.t=now;
  driftBodies(sim,lights.map(L=>({id:L.id,target:L.center})),dt,()=>R).forEach((b,i)=>{lights[i].center=[...b.p]});
  return lights;
}
function organismEmber(id,center,px,entity,selected=false){
  const rank=rankNumber(entity?.rank),hasMetabolites=inquiryMetabolites(entity).length>0,pal=PALETTE[entity?.gene]||PALETTE.x;
  const target=[1.0,.90,.64],blend=clamp(.40+rank*.035+(hasMetabolites?.08:0),.40,.64),c=mix3(pal,target,blend);
  const size=clamp(6+rank*4+Math.sqrt(Math.max(px,0))*.72+(selected?2:0),6,42);
  const alpha=clamp(.18+rank*.055+(hasMetabolites?.06:0),.18,.68);
  return {id,center,size,color:[...c,alpha],phase:random01(id,'organism-ember')*Math.PI*2,kind:rank===0?'source-ember':'organism-ember',rank};
}
function collectBody(id,center,scale,cameraZ,height,leaves,lights,depth=0){
  const ps=state.parents.get(id)||[],px=projectedPixels(scale,cameraZ,height),entity=state.identities.get(id),gene=entity?.gene||'x',pal=PALETTE[gene]||PALETTE.x;
  if(entity)lights.push(organismEmber(id,center,px,entity,depth===0));
  if(ps.length!==4||px<LOD_PX||depth>=MAX_DEPTH){
    leaves.push({id,center,scale,color:[pal[0],pal[1],pal[2],.11+Math.min(.30,px/150)]});
    return;
  }
  for(let i=0;i<4;i++)collectBody(ps[i],add(center,mul(state.renderer.V0[i],scale*.5)),scale*.5,cameraZ,height,leaves,lights,depth+1);
}
function projectPoint(p,q,cameraZ,width,height){const r=qRot(q,p),z=cameraZ-r[2],f=(height/2)/Math.tan(FOV/2);return {x:width/2+r[0]*f/z,y:height/2-r[1]*f/z,z:r[2]}}
function projectWorldPoint(p,cameraZ,width,height){const z=cameraZ-p[2],f=(height/2)/Math.tan(FOV/2);return {x:width/2+p[0]*f/z,y:height/2-p[1]*f/z,z:p[2]}}
function wisdomFont(width){return width<700?'500 11px system-ui, -apple-system, "Segoe UI", sans-serif':'500 13px system-ui, -apple-system, "Segoe UI", sans-serif'}
function wisdomLineHeight(width){return width<700?17:20}
function preparedWisdom(key,text,font){
  if(!pretextModule||!key||!text)return null;
  if(!(state.wisdomPrepared instanceof Map))state.wisdomPrepared=new Map();
  const cacheKey=`${key}\u0000${font}\u0000${text}`;
  if(!state.wisdomPrepared.has(cacheKey))state.wisdomPrepared.set(cacheKey,pretextModule.prepareWithSegments(text,font));
  return state.wisdomPrepared.get(cacheKey);
}
function externalLabel(url,index){
  try{const u=new URL(url),host=u.hostname.replace(/^www\./,'');if(host==='doi.org')return 'DOI · ORIGINAL WORK';if(host==='arxiv.org')return 'ARXIV · ORIGINAL WORK';if(host==='github.com')return 'GITHUB · UPSTREAM';if(host.includes('pmlr.press'))return 'PMLR · ORIGINAL WORK';if(host.includes('w3.org'))return 'W3C · CANONICAL SOURCE';return host.toUpperCase()+' · ORIGINAL SOURCE'}catch(_){return 'ORIGINAL SOURCE '+(index+1)}
}

function updateOrganismInquiry(){
  const box=state.sourceInfo,entity=state.current?state.identities.get(state.current.id):null,visible=Boolean(entity),alpha=visible?smooth(clamp((state.transition-.38)/.38)):0;
  if(!box)return;
  setData(box,'visible',visible?'true':'false');const open=alpha.toFixed(3),dim=visible&&state.inner?(state.inkOverPanel?'0':'.12'):'';
  if(box.inkOpen!==open){box.inkOpen=open;box.style.setProperty('--source-open',open)}if(box.inkDim!==dim){box.inkDim=dim;box.style.opacity=dim}if(box.getAttribute('aria-hidden')!==(visible?'false':'true'))box.setAttribute('aria-hidden',visible?'false':'true');
  if(!visible)return;
  const source=entity.kind==='source',parents=state.parents.get(entity.id)||[],origin=source?'EXTERNAL ORIGIN':'COMPOSITION';
  const originText=source?(entity.credit||'External provenance unresolved in the current public projection.'):entity.rank+' · recursive composition';
  const externals=Array.isArray(entity.externals)?entity.externals:[],key=[entity.id,entity.title,origin,originText,externals.join('|'),parents.join('|')].join('\u0000');
  if(box.dataset.sourceKey===key)return;
  box.dataset.sourceKey=key;box.dataset.sourceId=entity.id;box.dataset.origin=source?'external':'composed';
  box.querySelector('.papers-origin-label').textContent=origin;
  box.querySelector('.papers-source-code').textContent=entity.id+' · '+entity.rank+' · '+entity.gene+' · '+locusName(state.projection,entity.gene);
  box.querySelector('h2').textContent=entity.title||entity.id;
  box.querySelector('.papers-source-credit').textContent=originText;
  const links=box.querySelector('.papers-source-links');links.replaceChildren();
  if(source){
    externals.forEach((url,i)=>{const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=externalLabel(url,i);links.append(a)});
    if(!externals.length){const span=document.createElement('span');span.textContent='Canonical external origin not projected.';links.append(span)}
  }else{
    parents.forEach(id=>{const span=document.createElement('span');span.textContent=id;links.append(span)});
  }
}
/* ---------- text-being: every simplex of the selected organism is made of its own words ----------
 * At rest nothing is written out: faint lines, face dust, four vertex letters, sleeping metabolite lights.
 * hover peeks · click descends and locks · a click that enters no piece ascends one step.
 * Edges: thread of letters (tapered) → fibres (the pointer bursts them) → woven sentence, edge turned level in front.
 * Faces: dust of their letters → woven disk, face turned frontal. Vertices: the letter they are; for a Holon the
 * vertex is its parent organism (a door). Metabolites: the light is the sentence asleep. */
const BEING_FONT='500 12px system-ui, -apple-system, "Segoe UI", sans-serif',BEING_LH=15;
const FACE_FONT='500 11px system-ui, -apple-system, "Segoe UI", sans-serif',FACE_LH=13.5;
const BEING_TW=300,BEING_TR=BEING_TW*Math.sqrt(3)/6,BEING_CAN=[[0,0],[BEING_TW,0],[BEING_TW/2,BEING_TW*Math.sqrt(3)/2]],BEING_CEN=[BEING_TW/2,BEING_TR];
const beingSegmenter=typeof Intl!=='undefined'&&Intl.Segmenter?new Intl.Segmenter():null;
function graphemes(text){return beingSegmenter?[...beingSegmenter.segment(text)].map(x=>x.segment):Array.from(text)}
function beingLines(key,text,font,rows){
  const prepared=preparedWisdom(key,text,font);if(!prepared)return [];
  let cursor={segmentIndex:0,graphemeIndex:0};const out=[];
  for(const r of rows){if(r.w<20)continue;const range=pretextModule.layoutNextLineRange(prepared,cursor,r.w);if(range===null){out.done=true;break}
    const line=pretextModule.materializeLineRange(prepared,range);out.push({text:line.text.trimEnd(),x:r.x+(r.w-line.width)/2,y:r.y});cursor=range.end}
  if(!out.done&&pretextModule.layoutNextLineRange(prepared,cursor,1e6)===null)out.done=true;
  return out;
}
function beingGlyphs(ctx,lines,font,boldUpTo=0){
  // advances are measured in the weight each glyph is drawn in (bold title 600, the rest 400 when a title exists)
  const fb=font.replace(/^\d+/,'600'),fr=boldUpTo>0?font.replace(/^\d+/,'400'):font,out=[];
  for(const L of lines){const gs=graphemes(L.text);let pb='',pr='';
    for(const ch of gs){const bold=out.length<boldUpTo;ctx.font=fb;const wb=pb?ctx.measureText(pb).width:0;ctx.font=fr;const wr=pr?ctx.measureText(pr).width:0;
      out.push({ch,tx:L.x+wb+wr,ty:L.y,bold,x:0,y:0,vx:0,vy:0});if(bold)pb+=ch;else pr+=ch}}
  ctx.font=font;return out;
}
function beingSpring(g,tx,ty,k=.18,damp=.7){g.vx=(g.vx+(tx-g.x)*k)*damp;g.vy=(g.vy+(ty-g.y)*k)*damp;g.x+=g.vx;g.y+=g.vy}
function beingSame(a,b){return Boolean(a&&b&&a.kind===b.kind&&a.key===b.key)}
function beingCross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function beingNorm(v){const l=Math.hypot(...v)||1;return v.map(x=>x/l)}
function beingSlerp(a,b,t){let d=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];if(d<0){b=b.map(x=>-x);d=-d}
  if(d>.9995)return qNorm(a.map((x,i)=>x+(b[i]-x)*t));const th=Math.acos(d),sn=Math.sin(th);return a.map((x,i)=>(x*Math.sin((1-t)*th)+b[i]*Math.sin(t*th))/sn)}
function beingQFromRows(m){const[a,b,c,d,e,f,g,h,i]=m,tr=a+e+i;let q;
  if(tr>0){const k=Math.sqrt(tr+1)*2;q=[k/4,(h-f)/k,(c-g)/k,(d-b)/k]}
  else if(a>e&&a>i){const k=Math.sqrt(1+a-e-i)*2;q=[(h-f)/k,k/4,(b+d)/k,(c+g)/k]}
  else if(e>i){const k=Math.sqrt(1+e-a-i)*2;q=[(c-g)/k,(b+d)/k,k/4,(f+h)/k]}
  else{const k=Math.sqrt(1+i-a-e)*2;q=[(d-b)/k,(c+g)/k,(f+h)/k,k/4]}return qNorm(q)}
function beingKeyIdx(key){return String(key||'').split('').map(ch=>GENES.indexOf(ch))}
function ensureBeing(entity,width){
  const body=inquiryBody(entity.id);
  if(state.being&&state.being.id===entity.id&&state.being.body===body)return state.being;
  const ctx=state.textCanvas.getContext('2d'),B={id:entity.id,body,verts:[],edges:[],faces:[],mets:new Map()};
  state.inner=null;state.beingTargetQ=null;
  const holon=entity.kind!=='source',parents=state.parents.get(entity.id)||[];
  GENES.forEach((g,i)=>{
    let text='',door='';
    if(holon&&parents.length===4){door=parents[i];const d=state.identities.get(door);text=g+' · '+door+' · '+(d?.title||door)}
    else{const v=(Array.isArray(body?.vertices)?body.vertices:[]).find(x=>x&&x.id===g);if(v)text=g+' · '+String(v.title||'').trim()+(v.text?' — '+String(v.text).trim():'')}
    if(!text)text=g;
    const lines=beingLines(entity.id+'·v·'+g,text,BEING_FONT,Array.from({length:12},(_,j)=>({x:0,y:j*BEING_LH,w:240})));
    const bold=text.indexOf(' — ');
    B.verts.push({i,gene:g,door,glyphs:beingGlyphs(ctx,lines,BEING_FONT,bold>0?bold:text.length),h:lines.length*BEING_LH,open:0});
  });
  for(const e of (Array.isArray(body?.edges)?body.edges:[])){
    const idx=beingKeyIdx(e?.id);if(idx.length!==2||idx.some(x=>x<0))continue;
    const text=String(e.text||e.title||'').trim();if(!text)continue;
    const w=Math.min(520,width*.72),lines=beingLines(entity.id+'·e·'+e.id,text,BEING_FONT,Array.from({length:16},(_,j)=>({x:-w/2,y:j*BEING_LH,w})));
    const g=beingGlyphs(ctx,lines,BEING_FONT),n=g.length,h=lines.length*BEING_LH;
    g.forEach((q,j)=>{q.u0=n>1?j/(n-1)-.5:0;q.ty-=h/2;q.seed=random01(entity.id+e.id,j)*6.283;q.amp=.4+random01(entity.id+e.id,'a'+j)});
    B.edges.push({key:e.id,a:idx[0],b:idx[1],glyphs:g,unravel:0,weave:0});
  }
  for(const f of (Array.isArray(body?.faces)?body.faces:[])){
    const idx=beingKeyIdx(f?.id);if(idx.length!==3||idx.some(x=>x<0))continue;
    const text=String(f.text||f.title||'').trim();if(!text)continue;
    let lines=[];
    for(let r=BEING_TR*.92;r<BEING_TR*3;r+=4){const rows=[];for(let y=-r+FACE_LH*.6;y<r-FACE_LH*.4;y+=FACE_LH){const w=2*Math.sqrt(Math.max(0,r*r-(y+FACE_LH/2)**2))*.92;rows.push({x:-w/2,y,w})}
      lines=beingLines(entity.id+'·f·'+f.id+'·'+Math.round(r),text,FACE_FONT,rows);if(lines.done)break}
    const g=beingGlyphs(ctx,lines,FACE_FONT);
    g.forEach((q,j)=>{let a=random01(entity.id+f.id,'a'+j),b=random01(entity.id+f.id,'b'+j);if(a+b>1){a=1-a;b=1-b}
      const [c0,c1,c2]=BEING_CAN;q.rc=[c0[0]+a*(c1[0]-c0[0])+b*(c2[0]-c0[0]),c0[1]+a*(c1[1]-c0[1])+b*(c2[1]-c0[1])];q.x=q.rc[0]-BEING_CEN[0];q.y=q.rc[1]-BEING_CEN[1];q.seed=random01(entity.id+f.id,'s'+j)*6.283});
    B.faces.push({key:f.id,idx,miss:[0,1,2,3].find(i=>!idx.includes(i)),glyphs:g,stir:0,weave:0});
  }
  state.being=B;return B;
}
function metaboliteGlyphs(B,light,font){
  if(B.mets.has(light.id))return B.mets.get(light.id);
  const text=metaboliteWisdomText(light.metabolite);if(!text)return null;
  const prepared=preparedWisdom(light.id,text,font);if(!prepared)return null;
  const title=typeof light.metabolite?.title==='string'?light.metabolite.title.trim():'';
  const lines=beingLines(light.id,text,font,Array.from({length:10},(_,j)=>({x:0,y:j*BEING_LH,w:METABOLITE_LABEL_MAX_WIDTH*.8})));
  const g=beingGlyphs(state.textCanvas.getContext('2d'),lines,font,title.length),n=g.length,ga=Math.PI*(3-Math.sqrt(5));
  g.forEach((q,j)=>{const r=Math.sqrt(j/Math.max(1,n))*9;q.ix=Math.cos(j*ga)*r;q.iy=Math.sin(j*ga)*r;q.x=q.ix;q.y=q.iy});
  const M={id:light.id,glyphs:g,h:lines.length*BEING_LH,open:0};B.mets.set(light.id,M);return M;
}
function lockInner(piece){
  state.inner=piece;state.beingTargetQ=null;if(!piece||!state.current)return;
  const V=state.renderer.V0,q=state.localQ;
  if(piece.kind==='edge'){const e=state.being?.edges.find(x=>x.key===piece.key);if(!e)return;
    let d=beingNorm(sub(V[e.b],V[e.a]));const m=beingNorm(mul(add(V[e.a],V[e.b]),.5));
    if(qRot(q,d)[0]<0)d=mul(d,-1);const bb=beingCross(m,d);
    state.beingTargetQ=beingQFromRows([d[0],d[1],d[2],bb[0],bb[1],bb[2],m[0],m[1],m[2]])}
  if(piece.kind==='face'){const f=state.being?.faces.find(x=>x.key===piece.key);if(!f)return;
    const vn=qRot(q,beingNorm(mul(V[f.miss],-1))),ax=beingCross(vn,[0,0,1]),sa=Math.hypot(...ax);
    if(sa>1e-6)state.beingTargetQ=qNorm(qMul(qAxis(ax.map(x=>x/sa),Math.atan2(sa,vn[2])),q))}
  if(piece.kind==='vert'){const vn=qRot(q,beingNorm(V[piece.key])),t=beingNorm([-.3,.15,1]),ax=beingCross(vn,t),sa=Math.hypot(...ax);
    if(sa>1e-6)state.beingTargetQ=qNorm(qMul(qAxis(ax.map(x=>x/sa),Math.atan2(sa,vn[0]*t[0]+vn[1]*t[1]+vn[2]*t[2])),q))}
}
function beingDescribe(p){
  if(!p)return '';
  if(p.kind==='edge')return 'edge '+p.key;if(p.kind==='face')return 'face '+p.key;if(p.kind==='vert')return 'vertex '+GENES[p.key];
  if(p.kind==='met')return 'metabolite '+(state.being?[...state.being.mets.keys()].indexOf(p.key)+1:1);return '';
}
function beingSegDist(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p[0]-a.x)*dx+(p[1]-a.y)*dy)/(dx*dx+dy*dy||1));return Math.hypot(p[0]-a.x-t*dx,p[1]-a.y-t*dy)}
function beingHit(x,y){
  const G=state.beingGeo;if(!G||!state.current||state.transition<.82)return null;const m=[x,y];
  for(const L of G.mets)if(Math.hypot(x-L.x,y-L.y)<18)return {kind:'met',key:L.id};
  for(let i=0;i<4;i++)if(Math.hypot(x-G.P[i].x,y-G.P[i].y)<14)return {kind:'vert',key:i,door:G.doors[i]||''};
  let best=9,hit=null;for(const e of state.being?.edges||[]){const d=beingSegDist(m,G.P[e.a],G.P[e.b]);if(d<best){best=d;hit={kind:'edge',key:e.key}}}if(hit)return hit;
  let hz=-1e9;for(const f of state.being?.faces||[]){if(!G.front[f.key])continue;const [a,b,c]=f.idx.map(i=>G.P[i]);const z=a.vz+b.vz+c.vz;if(pointInTriangle(x,y,a,b,c)&&z>hz){hz=z;hit={kind:'face',key:f.key}}}
  return hit;
}
/* ---------- ink membrane: an open sentence finds free space ----------
 * Open or folding sentences never overlap Papers/Display chrome or one another. Lights and vertices search a ring
 * of placements around their own anchor; woven edges and faces take the smallest nudge that frees them. A place is
 * kept while it stays free, and the glyph springs turn every re-placement into a glide. */
const INK_PAD=8;
function inkShown(el){let op=1;for(let n=el;n;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden'||n.dataset?.visible==='false')return false;op*=+s.opacity}return op>.3}
function inkChrome(rect){
  const now=performance.now(),c=state.inkChrome;if(c&&now-c.t<250&&c.w===rect.width&&c.h===rect.height)return c.list;
  const base=state.textCanvas.getBoundingClientRect(),list=[],panel=state.host.querySelector('.papers-source-original')?.getBoundingClientRect();
  state.inkPanel=panel&&panel.width>1?{x:panel.left-base.left,y:panel.top-base.top,w:panel.width,h:panel.height}:null;
  for(const el of [...state.host.querySelectorAll('.papers-source-original,.papers-sierpinski-hud,.papers-sierpinski-label,.papers-physiology'),...document.querySelectorAll('aside')]){
    if(el.tagName!=='ASIDE'&&!el.textContent.trim())continue;if(!inkShown(el))continue;const r=el.getBoundingClientRect();if(r.width<2||r.height<2)continue;
    list.push({x:r.left-base.left-INK_PAD,y:r.top-base.top-INK_PAD,w:r.width+2*INK_PAD,h:r.height+2*INK_PAD})}
  state.inkChrome={t:now,w:rect.width,h:rect.height,list};return list;
}
function inkOverlap(b,list){let a=0;for(const o of list){const w=Math.min(b.x+b.w,o.x+o.w)-Math.max(b.x,o.x),h=Math.min(b.y+b.h,o.y+o.h)-Math.max(b.y,o.y);if(w>0&&h>0)a+=w*h}return a}
function inkOutside(b,rect){const w=Math.max(0,Math.min(b.x+b.w,rect.width-14)-Math.max(b.x,14)),h=Math.max(0,Math.min(b.y+b.h,rect.height-24)-Math.max(b.y,80));return b.w*b.h-w*h}
function inkCost(b,rect,taken){return 1000*(inkOverlap(b,taken)+inkOverlap(b,inkChrome(rect))+inkOutside(b,rect))/(b.w*b.h||1)}
function inkBounds(glyphs,lh,baseline='top'){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;const up=baseline==='top'?0:lh*.8,down=baseline==='top'?lh:lh*.25;
  for(const g of glyphs){x0=Math.min(x0,g.tx);y0=Math.min(y0,g.ty-up);x1=Math.max(x1,g.tx+8);y1=Math.max(y1,g.ty+down)}
  return glyphs.length?{x0,y0,x1,y1}:{x0:0,y0:0,x1:0,y1:0};
}
function inkRing(obj,ax,ay,pref,R0,bounds,rect,taken){
  const w=bounds.x1-bounds.x0,h=bounds.y1-bounds.y0,pa=Math.atan2(pref[1],pref[0]);
  const at=(ang,R)=>{const dx=Math.cos(ang),dy=Math.sin(ang),he=Math.abs(dx)*w/2+Math.abs(dy)*h/2;return {x:ax+dx*(R+he)-w/2,y:ay+dy*(R+he)-h/2,w,h,ang,R}};
  let best=obj.inkAt?at(obj.inkAt.ang,obj.inkAt.R):null;
  if(!best||inkCost(best,rect,taken)>=.5){let bs=1e18;best=null;
    for(const R of [R0,R0+36,R0+84,R0+150])for(let k=0;k<16;k++){const b=at(pa+k*Math.PI/8,R);let da=Math.abs(b.ang-pa)%(2*Math.PI);if(da>Math.PI)da=2*Math.PI-da;
      const s=inkCost(b,rect,taken)+da*6+(R-R0)*.06;if(s<bs){bs=s;best=b}}}
  obj.inkAt={ang:best.ang,R:best.R};
  return {ox:best.x-bounds.x0-ax,oy:best.y-bounds.y0-ay};
}
function inkNudge(obj,box,rect,taken){
  const at=(sx,sy)=>({x:box.x+sx,y:box.y+sy,w:box.w,h:box.h,sx,sy});
  let best=obj.inkShift?at(...obj.inkShift):at(0,0);
  if(inkCost(best,rect,taken)>=.5){let bs=inkCost(best=at(0,0),rect,taken);
    if(bs>=.5)for(const R of [24,48,80,120,170,230])for(let k=0;k<16;k++){const a=k*Math.PI/8,b=at(Math.cos(a)*R,Math.sin(a)*R),s=inkCost(b,rect,taken)+R*.25;if(s<bs){bs=s;best=b}}}
  obj.inkShift=[best.sx,best.sy];return best;
}
/* batched glyph drawing: dust is one path per alpha, ink sets one colour and varies only globalAlpha */
function inkDust(ctx,glyphs,pick,size,color,alpha,ox=0,oy=0){
  if(alpha<=.004)return;let any=false;ctx.beginPath();
  for(const g of glyphs)if(pick(g)){const r=typeof size==='function'?size(g):size;ctx.rect(ox+g.x-r,oy+g.y-r,2*r,2*r);any=true}
  if(!any)return;ctx.globalAlpha=Math.min(1,alpha);ctx.fillStyle=color;ctx.fill();ctx.globalAlpha=1;
}
/* Glyph atlas: each (font, colour, baseline, character) is rasterized once into a tiny bitmap and then
 * blitted with drawImage. Opening an edge or face weaves hundreds of letters at once; per-glyph fillText
 * was the measured cost on CPU-only machines, a blit is not. Positions and metrics are unchanged. */
const glyphAtlas=new Map();let glyphMeasure=null;
function glyphSprite(font,color,baseline,ch,scale){
  const key=font+'|'+color+'|'+baseline+'|'+scale+'|'+ch;let g=glyphAtlas.get(key);if(g)return g;
  if(!glyphMeasure)glyphMeasure=document.createElement('canvas').getContext('2d');glyphMeasure.font=font;
  const size=Number((font.match(/([\d.]+)px/)||[0,12])[1]),w=Math.ceil(glyphMeasure.measureText(ch).width)+4,h=Math.ceil(size*1.7)+4,oy=baseline==='top'?2:Math.ceil(size*1.25)+2;
  const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w*scale));c.height=Math.max(1,Math.ceil(h*scale));
  const x=c.getContext('2d');x.scale(scale,scale);x.font=font;x.fillStyle=color;x.textBaseline=baseline;x.fillText(ch,2,oy);
  g={c,w,h,ox:2,oy};if(glyphAtlas.size>4000)glyphAtlas.clear();glyphAtlas.set(key,g);return g;
}
function inkText(ctx,glyphs,pick,color,alphaOf,fontOf,ox=0,oy=0){
  const baseline=ctx.textBaseline==='top'?'top':'alphabetic',scale=state?.inkScale||1;let f=fontOf?'':ctx.font;
  for(let j=0;j<glyphs.length;j++){const g=glyphs[j];if(!pick(g,j))continue;const a=alphaOf(g,j);if(a<=.004)continue;
    if(fontOf)f=fontOf(g,j);if(g.ch===' ')continue;const sp=glyphSprite(f,color,baseline,g.ch,scale);
    ctx.globalAlpha=Math.min(1,a);ctx.drawImage(sp.c,ox+g.x-sp.ox,oy+g.y-sp.oy,sp.w,sp.h)}
  ctx.globalAlpha=1;
}
function inkAabb(corners){const xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys);return {x,y,w:Math.max(...xs)-x,h:Math.max(...ys)-y}}
function drawWisdom(rect,cam,translate,metabolights,now){
  const {ctx,d}=resizeWisdomCanvas(state.textCanvas,rect);state.inkScale=Math.max(1,Math.round(d*2)/2);const canvas=state.textCanvas,entity=state.current?state.identities.get(state.current.id):null,lights=Array.isArray(metabolights)?metabolights:[];
  canvas.dataset.pretextStatus=state.pretextStatus;canvas.dataset.wisdomLines='0';canvas.dataset.wisdomId=entity?.id||'';canvas.dataset.wisdomMetabolites=String(lights.length);canvas.dataset.wisdomSource='metabolites';canvas.dataset.wisdomState='hidden';delete canvas.dataset.wisdomComplete;
  const dt=Math.min(.05,Math.max(0,(now-(state.beingLast||now))/1000));state.beingLast=now;
  if(!state.current||!entity){canvas.dataset.wisdomState='inactive';state.being=null;state.beingGeo=null;state.inner=null;state.beingTargetQ=null;return}
  if(state.pretextStatus!=='ready'||!pretextModule){canvas.dataset.wisdomState=state.pretextStatus;return}
  const alpha=smooth(clamp((state.transition-.50)/.32));if(alpha<=.01){canvas.dataset.wisdomState='lod-hidden';state.beingGeo=null;return}
  const B=ensureBeing(entity,rect.width),V=state.renderer.V0,sc=state.current.scale;
  const proj=local=>{const r=qRot(state.localQ,local),p=projectWorldPoint(add(r,translate),cam,rect.width,rect.height);p.vz=r[2];return p};
  const P=V.map(v=>proj(mul(v,sc))),front={};for(const f of B.faces)front[f.key]=qRot(state.localQ,V[f.miss])[2]<0;
  const font=wisdomFont(rect.width),metGeo=[];
  for(const light of lights){const p=proj(light.center);metGeo.push({id:light.id,x:p.x,y:p.y,light})}
  state.beingGeo={P,front,mets:metGeo,doors:B.verts.map(v=>v.door)};
  const hov=state.hover,peek=state.pointer?.moved?null:(hov?beingHit(hov.x,hov.y):null);state.beingPeek=peek;
  const open=state.inner||peek,m=hov?[hov.x,hov.y]:[-1e4,-1e4];
  state.canvas.style.cursor=peek?'pointer':'';
  state.beingRecede=mix(state.beingRecede||0,open?1:0,Math.min(1,dt*5));
  const tq=state.beingTargetQ,settle=tq?clamp((Math.abs(tq[0]*state.localQ[0]+tq[1]*state.localQ[1]+tq[2]*state.localQ[2]+tq[3]*state.localQ[3])-.985)/.014):1;
  ctx.textBaseline='top';ctx.shadowBlur=0;
  const taken=[];
  // faces: back to front, dust → woven disk
  const faces=[...B.faces].sort((a,b)=>a.idx.reduce((s,i)=>s+P[i].vz,0)-b.idx.reduce((s,i)=>s+P[i].vz,0));
  for(const F of faces){
    const isOpen=beingSame(open,{kind:'face',key:F.key}),isLock=beingSame(state.inner,{kind:'face',key:F.key});
    F.stir=mix(F.stir,isOpen?1:0,Math.min(1,dt*5));F.weave=mix(F.weave,isLock?settle:0,Math.min(1,dt*(isLock?3:5)));
    if(!front[F.key])continue;
    const [A,Bp,C]=F.idx.map(i=>P[i]),[c0,c1,c2]=BEING_CAN,ux=c1[0]-c0[0],uy=c1[1]-c0[1],vx=c2[0]-c0[0],vy=c2[1]-c0[1],det=ux*vy-vx*uy;
    const Px=Bp.x-A.x,Py=Bp.y-A.y,Qx=C.x-A.x,Qy=C.y-A.y;
    let la=(Px*vy-Qx*uy)/det,lc=(-Px*vx+Qx*ux)/det,lb=(Py*vy-Qy*uy)/det,ld=(-Py*vx+Qy*ux)/det;const ldet=la*ld-lc*lb;if(Math.abs(ldet)<1e-6)continue;
    let u=[ld/ldet,-lb/ldet];const ul=Math.hypot(...u)||1;u=[u[0]/ul,u[1]/ul];let v=[-u[1],u[0]];if(lb*v[0]+ld*v[1]<0)v=[-v[0],-v[1]];
    let ox=A.x+la*BEING_CEN[0]+lc*BEING_CEN[1],oy=A.y+lb*BEING_CEN[0]+ld*BEING_CEN[1];
    /* A woven face opens at one readable size at every rank: where the camera clamp frames a small body
     * below MACRO_FILL (S ground), the weave grows the text plane back to the size a fully framed body gives. */
    const kw=mix(1,Math.max(1,MACRO_FILL*cam/sc),clamp(F.weave*1.5)),L0=[la,lb,lc,ld];la*=kw;lb*=kw;lc*=kw;ld*=kw;
    {const ma=la*u[0]+lc*u[1],mb=lb*u[0]+ld*u[1],mc=la*v[0]+lc*v[1],md=lb*v[0]+ld*v[1],fb=F.bounds||(F.bounds=inkBounds(F.glyphs,FACE_LH));
      let want=[0,0];
      if(F.weave>.05){const box=inkAabb([[fb.x0,fb.y0],[fb.x1,fb.y0],[fb.x0,fb.y1],[fb.x1,fb.y1]].map(([x,y])=>[ma*x+mc*y+ox,mb*x+md*y+oy])),b=inkNudge(F,box,rect,taken);want=[b.sx,b.sy];if(F.weave>.2)taken.push(b)}else F.inkShift=null;
      F.sh=F.sh||[0,0];F.sh=F.sh.map((s,i)=>mix(s,want[i],Math.min(1,dt*6)));const k=clamp(F.weave*1.5);ox+=F.sh[0]*k;oy+=F.sh[1]*k}
    const mcx=((L0[3]*(m[0]-A.x)-L0[2]*(m[1]-A.y))/ldet-BEING_CEN[0])/kw,mcy=((-L0[1]*(m[0]-A.x)+L0[0]*(m[1]-A.y))/ldet-BEING_CEN[1])/kw;
    const mlx=mcx*u[0]+mcy*u[1],mly=mcx*v[0]+mcy*v[1],near=beingSame(peek,{kind:'face',key:F.key})&&!isLock,n=F.glyphs.length,active=F.stir>.01||F.weave>.01;
    const dim=1-.6*state.beingRecede*(isOpen?0:1);
    ctx.save();ctx.setTransform(d*(la*u[0]+lc*u[1]),d*(lb*u[0]+ld*u[1]),d*(la*v[0]+lc*v[1]),d*(lb*v[0]+ld*v[1]),d*ox,d*oy);ctx.font=FACE_FONT;
    F.glyphs.forEach((g,j)=>{
      const rx=g.rc[0]-BEING_CEN[0],ry=g.rc[1]-BEING_CEN[1];let lx=rx*u[0]+ry*u[1],ly=rx*v[0]+ry*v[1];
      if(!active){g.x=lx;g.y=ly;g.vx=0;g.vy=0;g.s=0}else{
        lx+=Math.sin(now/700+g.seed)*1.5*F.stir;ly+=Math.cos(now/800+g.seed)*1.5*F.stir;
        if(near){const dx=lx-mlx,dy=ly-mly,dd=Math.hypot(dx,dy)||1,push=26*Math.exp(-((dd/38)**2));lx+=dx/dd*push;ly+=dy/dd*push}
        const sw=clamp(F.weave*1.5-(j/n)*.5);beingSpring(g,lx*(1-sw)+g.tx*sw,ly*(1-sw)+g.ty*sw);g.s=sw}
    });
    inkDust(ctx,F.glyphs,g=>g.s<.4,.6,'rgb(191,245,220)',(.08+.32*F.stir)*alpha*dim);
    if(F.weave>.01)inkText(ctx,F.glyphs,g=>g.s>=.4,'rgb(223,243,234)',g=>clamp((g.s-.4)*2)*alpha);
    ctx.restore();
  }
  ctx.textBaseline='alphabetic';
  // edges: tapered thread of letters; the pointer bursts the fibres; lock weaves the sentence
  for(const E of B.edges){
    const a=P[E.a],b=P[E.b],isOpen=beingSame(open,{kind:'edge',key:E.key}),isLock=beingSame(state.inner,{kind:'edge',key:E.key});
    E.unravel=mix(E.unravel,isOpen?1:0,Math.min(1,dt*5));E.weave=mix(E.weave,isLock?settle:0,Math.min(1,dt*(isLock?3:5)));
    const dim=1-.7*state.beingRecede*(isOpen?0:1);
    if(E.unravel<.02){ctx.strokeStyle='rgba(191,245,220,'+(.42*alpha*dim).toFixed(3)+')';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();continue}
    const [p,q]=a.x<=b.x?[a,b]:[b,a],len=Math.hypot(q.x-p.x,q.y-p.y)||1,ax=[(q.x-p.x)/len,(q.y-p.y)/len],pe=[-ax[1],ax[0]],c=[(p.x+q.x)/2,(p.y+q.y)/2],n=E.glyphs.length;
    {const eb=E.bounds||(E.bounds=inkBounds(E.glyphs,BEING_LH,'alphabetic'));let want=[0,0];
      if(E.weave>.05){const box=inkAabb([[eb.x0,eb.y0],[eb.x1,eb.y0],[eb.x0,eb.y1],[eb.x1,eb.y1]].map(([x,y])=>[c[0]+ax[0]*x+pe[0]*y,c[1]+ax[1]*x+pe[1]*y])),s=inkNudge(E,box,rect,taken);want=[s.sx,s.sy];if(E.weave>.2)taken.push(s)}else E.inkShift=null;
      E.sh=E.sh||[0,0];E.sh=E.sh.map((s,i)=>mix(s,want[i],Math.min(1,dt*6)));const k=clamp(E.weave*1.5);c[0]+=E.sh[0]*k;c[1]+=E.sh[1]*k}
    const um=(m[0]-c[0])*ax[0]+(m[1]-c[1])*ax[1],near=beingSame(peek,{kind:'edge',key:E.key})&&!isLock;
    E.glyphs.forEach((g,j)=>{
      const fu=g.u0*len,taper=Math.sin(Math.PI*(g.u0+.5)),wob=Math.sin(now/500+g.seed)*g.amp,burst=near?.18+1.4*Math.exp(-(((fu-um)/55)**2)):1,loose=E.unravel*burst*taper;g.t=taper;
      const lu=fu+wob*4*loose,lv=Math.sin(g.seed*3+now/800)*14*g.amp*loose,sw=clamp(E.weave*1.5-(j/n)*.5);
      beingSpring(g,lu*(1-sw)+g.tx*sw,lv*(1-sw)+g.ty*sw,.2,.68);g.s=sw});
    ctx.save();ctx.translate(c[0],c[1]);ctx.transform(ax[0],ax[1],pe[0],pe[1],0,0);ctx.font=BEING_FONT;
    for(let band=0;band<5;band++)inkDust(ctx,E.glyphs,g=>g.s<.4&&Math.min(4,Math.floor(g.t*5))===band,g=>.35+.75*g.t,'rgb(191,245,220)',(.25+.6*E.unravel)*(.4+.6*(band+.5)/5)*alpha);
    if(E.weave>.01)inkText(ctx,E.glyphs,g=>g.s>=.4,'rgb(223,243,234)',g=>clamp((g.s-.4)*2)*alpha);
    ctx.restore();
  }
  // vertices: the letter they are; the sentence unfolds out of it, centered beneath
  ctx.textBaseline='top';
  for(const Vt of B.verts){
    const p=P[Vt.i],isOpen=beingSame(open,{kind:'vert',key:Vt.i});Vt.open=mix(Vt.open,isOpen?1:0,Math.min(1,dt*5));
    const n=Vt.glyphs.length,g0=Vt.glyphs[0];if(!g0)continue;
    let ox=-120,oy=18;
    if(Vt.open>.02){const vb=Vt.bounds||(Vt.bounds=inkBounds(Vt.glyphs,BEING_LH)),r=inkRing(Vt,p.x,p.y,[0,1],10,vb,rect,taken);
      ox=Math.max(16-p.x-vb.x0,Math.min(rect.width-16-p.x-vb.x1,r.ox));oy=Math.max(80-p.y-vb.y0,Math.min(rect.height-24-p.y-vb.y1,r.oy));
      if(Vt.open>.15)taken.push({x:p.x+ox+vb.x0,y:p.y+oy+vb.y0,w:vb.x1-vb.x0,h:vb.y1-vb.y0})}else Vt.inkAt=null;
    Vt.glyphs.forEach((g,j)=>{const sw=j===0?1:clamp(Vt.open*1.6-(j/Math.max(1,n))*.6);
      if(j===0)beingSpring(g,(g0.tx+ox)*Vt.open-4*(1-Vt.open),(g0.ty+oy)*Vt.open-8*(1-Vt.open),.2,.68);else beingSpring(g,sw*(ox+g.tx),sw*(oy+g.ty),.2,.68);g.s=sw});
    const dim=open&&!isOpen?.45:1;
    const vf=(g,j)=>(g.bold?'600 ':'400 ')+(j===0?'13px ':'12px ')+'system-ui, -apple-system, "Segoe UI", sans-serif';
    inkText(ctx,Vt.glyphs,(g,j)=>j===0,'rgb(191,245,220)',()=>.95*alpha*dim,vf,p.x,p.y);
    if(Vt.open>.01)inkText(ctx,Vt.glyphs,(g,j)=>j>0&&g.s>=.35,'rgb(223,243,234)',g=>clamp((g.s-.35)*2)*alpha,vf,p.x,p.y);
  }
  // metabolites: the light is the sentence asleep
  const cx=rect.width*.5,cy=rect.height*.5,metPx=(font.match(/\d+px/)||['12px'])[0];let labelCount=0,lineCount=0;
  for(const L of metGeo){
    const M=metaboliteGlyphs(B,L.light,font);if(!M)continue;labelCount++;lineCount+=Math.round(M.h/BEING_LH);
    const isOpen=beingSame(open,{kind:'met',key:L.id});M.open=mix(M.open,isOpen?1:0,Math.min(1,dt*6));
    let ux=L.x-cx,uy=L.y-cy;const ul=Math.hypot(ux,uy)||1;ux/=ul;uy/=ul;
    let ox=0,oy=0;const n=M.glyphs.length;
    if(M.open>.02){const mb=M.bounds||(M.bounds=inkBounds(M.glyphs,BEING_LH)),r=inkRing(M,L.x,L.y,[ux,uy],22,mb,rect,taken);
      ox=Math.max(14-L.x-mb.x0,Math.min(rect.width-14-L.x-mb.x1,r.ox));oy=Math.max(80-L.y-mb.y0,Math.min(rect.height-24-L.y-mb.y1,r.oy));
      if(M.open>.15)taken.push({x:L.x+ox+mb.x0,y:L.y+oy+mb.y0,w:mb.x1-mb.x0,h:mb.y1-mb.y0})}else M.inkAt=null;
    M.glyphs.forEach((g,j)=>{const sw=clamp(M.open*1.6-(j/Math.max(1,n))*.6);
      beingSpring(g,(1-sw)*(g.ix+Math.sin(now/600+j)*1.2)+sw*(ox+g.tx),(1-sw)*(g.iy+Math.cos(now/700+j)*1.2)+sw*(oy+g.ty));g.s=sw});
    const dim=open&&!isOpen?.25:1;
    inkDust(ctx,M.glyphs,g=>g.s<.35,.8,'rgb(255,244,214)',.85*alpha*dim,L.x,L.y);
    if(M.open>.01)inkText(ctx,M.glyphs,g=>g.s>=.35,'rgb(255,244,214)',g=>clamp((g.s-.35)*2)*alpha,g=>(g.bold?'600 ':'400 ')+metPx+' system-ui, -apple-system, "Segoe UI", sans-serif',L.x,L.y);
  }
  canvas.dataset.wisdomState=labelCount?'visible':(lights.length?'contract-gap':'being');canvas.dataset.wisdomLines=String(lineCount);canvas.dataset.textBeing='true';canvas.dataset.innerPath=beingDescribe(state.inner);
  canvas.dataset.beingEdges=String(B.edges.length);canvas.dataset.beingFaces=String(B.faces.length);
  state.inkOverPanel=Boolean(state.inkPanel&&taken.some(b=>inkOverlap(b,[state.inkPanel])>1));
  canvas.dataset.inkOpen=String(taken.length);canvas.dataset.inkCollisions=String(taken.filter((b,i)=>inkOverlap(b,inkChrome(rect))>1||inkOverlap(b,taken.slice(i+1))>1).length);
}
/* Organism names: the metabolite physiology one rank up. Before any selection every organism's own
 * identity (`id · title`) rests as a cluster of its letters on its body, so an organism too small to
 * see is still perceptible as its sleeping name; a peek unfolds the letters into the readable name and
 * leaving folds them back. The cluster is presence, not selection: entering still follows Descent. */
const NAME_FONT='500 11px system-ui, -apple-system, "Segoe UI", sans-serif',NAME_LH=14,NAME_W=220;
function nameGlyphs(rec){
  if(state.namesFor!==state.records){state.names=new Map();state.namesFor=state.records}
  const N0=state.names;let G=N0.get(rec.id);if(G)return G;
  const d=state.identities.get(rec.id),text=rec.id+' · '+String(d?.title||rec.title||'').trim();
  const lines=beingLines('name·'+rec.id,text,NAME_FONT,Array.from({length:4},(_,j)=>({x:0,y:j*NAME_LH,w:NAME_W})));if(!lines.length)return null;
  const g=beingGlyphs(state.textCanvas.getContext('2d'),lines,NAME_FONT,rec.id.length),n=g.length,ga=Math.PI*(3-Math.sqrt(5)),R=4+Math.sqrt(n)*.55;
  g.forEach((q,j)=>{const r=Math.sqrt(j/Math.max(1,n))*R;q.ix=Math.cos(j*ga)*r;q.iy=Math.sin(j*ga)*r;q.x=q.ix;q.y=q.iy});
  G={id:rec.id,glyphs:g,open:0};N0.set(rec.id,G);return G;
}
function drawNames(rect,now){
  const canvas=state.textCanvas,presence=1-backgroundPassage();
  if(presence<=.01||state.pretextStatus!=='ready'||!pretextModule){canvas.dataset.nameClusters='0';canvas.dataset.nameOpen='';return}
  const ctx=canvas.getContext('2d'),q=overviewOrientation(),here=state.chamberPath||'',dt=Math.min(.05,Math.max(0,(now-(state.nameLast||now))/1000));state.nameLast=now;
  const hov=state.hover&&!state.current&&!state.pointer?.moved?hitGlobal(state.hover.x,state.hover.y,rect.width,rect.height,now):'';
  if(!state.current)state.canvas.style.cursor=hov?'pointer':'';
  const sleep=[[],[]],taken=[];let count=0;
  const L=lensLocal(state.textCanvas.getBoundingClientRect());
  ctx.textBaseline='top';
  for(const rec of state.records){
    const G=nameGlyphs(rec);if(!G)continue;count++;
    const p=projectPoint(overviewCenterFor(rec,rect.width,now),q,FAR_Z,rect.width,rect.height);
    if(p.x<-40||p.x>rect.width+40||p.y<-40||p.y>rect.height+40)continue;
    if(L&&!inLens(L,p.x,p.y,28)){G.open=0;continue}
    const isOpen=rec.id===hov;G.open=mix(G.open,isOpen?1:0,Math.min(1,dt*6));
    let ox=0,oy=0;const n=G.glyphs.length;
    if(G.open>.02){const b=G.bounds||(G.bounds=inkBounds(G.glyphs,NAME_LH)),r=inkRing(G,p.x,p.y,[0,1],12,b,rect,taken);
      ox=Math.max(14-p.x-b.x0,Math.min(rect.width-14-p.x-b.x1,r.ox));oy=Math.max(80-p.y-b.y0,Math.min(rect.height-24-p.y-b.y1,r.oy));
      if(G.open>.15)taken.push({x:p.x+ox+b.x0,y:p.y+oy+b.y0,w:b.x1-b.x0,h:b.y1-b.y0})}else G.inkAt=null;
    G.glyphs.forEach((g,j)=>{const sw=clamp(G.open*1.6-(j/Math.max(1,n))*.6);
      beingSpring(g,(1-sw)*(g.ix+Math.sin(now/900+j)*.8)+sw*(ox+g.tx),(1-sw)*(g.iy+Math.cos(now/1000+j)*.8)+sw*(oy+g.ty));g.s=sw});
    sleep[rec.locus.startsWith(here)?0:1].push([G,p]);
    if(G.open>.01)inkText(ctx,G.glyphs,g=>g.s>=.35,'rgb(226,244,235)',g=>clamp((g.s-.35)*2)*presence,g=>(g.bold?'600 ':'400 ')+'11px system-ui, -apple-system, "Segoe UI", sans-serif',p.x,p.y);
  }
  /* sleeping names are batched: one path per presence class, not one fill per organism */
  /* only the sleeping letters are bounded by the drop; an opened name is read whole */
  if(L){ctx.save();ctx.beginPath();ctx.arc(L.x,L.y,Math.max(0,L.r-1),0,Math.PI*2);ctx.clip()}
  [[sleep[0],.42],[sleep[1],here?.12:.42]].forEach(([list,a])=>{if(!list.length||a*presence<=.004)return;ctx.beginPath();
    for(const [G,p] of list)for(const g of G.glyphs)if(g.s<.35)ctx.rect(p.x+g.x-.55,p.y+g.y-.55,1.1,1.1);
    ctx.globalAlpha=a*presence;ctx.fillStyle='rgb(206,240,224)';ctx.fill();ctx.globalAlpha=1});
  if(L)ctx.restore();
  canvas.dataset.lensGated=L?'1':'0';
  canvas.dataset.nameClusters=String(count);canvas.dataset.nameOpen=hov||'';
}
/* The realized chambers are the visible rank-1 Sierpiński body of Papers — the same container
 * grammar every Display site shows — not invisible packing bins: faint faces, clear edges, the
 * current container brighter, the rest receding; all of it steps back while an organism is open. */
function outerCells(width,alphaBase=CHAMBER_SHELL_ALPHA){
  const focus=inquiryFrameFocus(),scale=rootFieldScale(width)*focus.scale,active=state?.chamberPath||'',recede=1-.75*backgroundPassage();
  return GENES.map((g,i)=>{const p=PALETTE[g],k=active?(active.startsWith(g)?1.6:.45):1,alpha=alphaBase*k*recede;return {center:mul(sub(mul(state.renderer.V0[i],.5),focus.center),scale),scale:.5*scale,color:[...mix3(p,[.86,1,.93],.62),alpha]}});
}
function populationBodies(width,height,bodyFade=1,lightFade=bodyFade,now=performance.now()){
  const leaves=[],lights=[];
  for(const rec of state.records){
    if(rec.id===state.current?.id)continue;
    collectBody(rec.id,overviewCenterFor(rec,width,now),overviewBodyScaleFor(rec,width),FAR_Z,height,leaves,lights);
  }
  for(const x of leaves)x.color[3]*=bodyFade;
  for(const x of lights)x.color[3]*=lightFade;
  return {leaves,lights};
}

function chamberChildren(){
  const base=state?.chamberPath||'',depth=base.length+1;
  return (state?.structure?.addresses||[]).filter(a=>a.path.startsWith(base)&&a.path.length===depth);
}
function pointInTriangle(x,y,a,b,c){
  const area=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x),p={x,y},s1=area(a,b,p),s2=area(b,c,p),s3=area(c,a,p);
  return !((s1<-.35||s2<-.35||s3<-.35)&&(s1>.35||s2>.35||s3>.35));
}
function projectOverviewPoint(point,width,height){
  return projectPoint(overviewWorldPoint(point,width),overviewOrientation(),cameraZ(),width,height);
}
function hitChamber(x,y,width,height){
  let best=null;
  for(const a of chamberChildren()){
    const pts=a.tet.map(p=>projectOverviewPoint(p,width,height));
    for(const f of FACE){
      const tri=[pts[f[0]],pts[f[1]],pts[f[2]]];if(!pointInTriangle(x,y,...tri))continue;
      const z=(tri[0].z+tri[1].z+tri[2].z)/3;if(!best||z>best.z)best={path:a.path,z};
    }
  }
  return best?.path||'';
}
function chamberLabel(path){
  if(!path)return 'overview';
  const r=N.addressRecord(state.structure,path);return r?.node?.noun||locusName(state.projection,path[0])||path;
}
function updateChamberLabels(width,height){
  if(!state?.chamberLabelNodes)return;
  const active=state.chamberPath||'';
  for(const gene of GENES){
    const node=state.chamberLabelNodes.get(gene),cell=N.addressRecord(state.structure,gene);if(!node||!cell)continue;
    // A chamber label hangs from the one vertex only that chamber owns: its own outer corner (tet[i] of split child i).
    const own=cell.tet[GENES.indexOf(gene)],p=projectOverviewPoint(own.map((v,j)=>cell.center[j]+(v-cell.center[j])*.92),width,height);
    if(node.inkRecords!==state.records){const members=state.records.filter(r=>r.gene===gene),sources=members.filter(r=>r.kind==='source').length;node.inkRecords=state.records;node.innerHTML=`<b>${gene} · ${locusName(state.projection,gene)}</b><small>${sources}S · ${members.length-sources}H</small>`}
    const visible=p.x>-80&&p.x<width+80&&p.y>-50&&p.y<height+50;
    const baseOpacity=active?(active.startsWith(gene)?.92:.22):(p.z<-.15?.50:.78),passageOpacity=mix(1,.18,backgroundPassage());
    const left=p.x.toFixed(1)+'px',top=p.y.toFixed(1)+'px',op=(baseOpacity*passageOpacity).toFixed(3);
    if(node.hidden!==!visible)node.hidden=!visible;const sig=left+top+op;if(node.inkSig!==sig){node.inkSig=sig;node.style.left=left;node.style.top=top;node.style.opacity=op}setData(node,'active',Boolean(active&&active.startsWith(gene)));
  }
}
function setChamber(path='',now=performance.now()){
  if(path&&!N.addressRecord(state.structure,path))return false;
  const target=path?N.focusTarget(state.structure,path):{center:[0,0,0],scale:1};
  state.chamberFrom={center:[...state.chamberFocus.center],scale:state.chamberFocus.scale};
  state.chamberTo={center:[...target.center],scale:target.scale};
  state.chamberPath=path;state.chamberTransitionStart=now;state.canvas.dataset.chamberPath=path||'overview';return true;
}
function updateChamberTransition(now){
  if(!state?.chamberTo)return;
  const t=smooth(clamp((now-state.chamberTransitionStart)/CHAMBER_OPEN_MS));
  state.chamberFocus={center:mix3(state.chamberFrom.center,state.chamberTo.center,t),scale:mix(state.chamberFrom.scale,state.chamberTo.scale,t)};
  if(t>=1){state.chamberFocus={center:[...state.chamberTo.center],scale:state.chamberTo.scale};state.chamberFrom=null;state.chamberTo=null}
}
function ascendChamber(now=performance.now()){if(!state?.chamberPath)return false;return setChamber(state.chamberPath.slice(0,-1),now)}
function setLabel(id){const d=state.identities.get(id);state.label.textContent=`${id} · ${d?.title||id}`;state.label.classList.add('show')}
function openGlobal(id,width,now=performance.now()){
  const rec=state.recordById.get(id);if(!rec)return false;
  const overviewWidth=Number(width)||state?.canvas?.getBoundingClientRect().width||innerWidth;
  const scale=rootBodyScaleFor(rec,overviewWidth);
  state.stack=[];
  state.current={id,scale,sourceLocal:[...overviewCenterFor(rec,overviewWidth,now)],entryWorld:null,cameraFrom:FAR_Z,cameraTo:cameraForScale(scale),globalSource:true};
  state.localQ=[...overviewOrientation()];state.transition=0;state.closing=false;state.transitionStart=now;setBackgroundPassage(1,now);setLabel(id);return true;
}
function descend(child,now=performance.now()){
  if(!state.current)return false;const hit=childBodies(state.current).find(x=>x.id===child);if(!hit)return false;
  state.stack.push({id:state.current.id,scale:state.current.scale,camera:state.current.cameraTo});
  const entryWorld=add(currentTranslation(),qRot(state.localQ,hit.center));
  state.current={id:child,scale:hit.scale,sourceLocal:null,entryWorld,cameraFrom:cameraZ(),cameraTo:cameraForScale(hit.scale),globalSource:false};
  state.transition=0;state.closing=false;state.transitionStart=now;setLabel(child);return true;
}
function ascend(now=performance.now()){
  if(!state.current||!state.stack.length)return false;
  const parent=state.stack.pop(),fromCamera=cameraZ();
  state.current={id:parent.id,scale:parent.scale,sourceLocal:null,entryWorld:[0,0,0],cameraFrom:fromCamera,cameraTo:parent.camera,globalSource:false};
  state.transition=0;state.closing=false;state.transitionStart=now;setLabel(parent.id);return true;
}
function closeOrAscend(now=performance.now()){
  if(!state.current)return;if(state.stack.length){ascend(now);return}state.closing=true;state.transitionStart=now;setBackgroundPassage(0,now);
}
function updateTransition(now){
  if(!state.current)return;const t=smooth(clamp((now-state.transitionStart)/OPEN_MS));state.transition=state.closing?1-t:t;
  if(state.closing&&t>=1){state.current=null;state.stack=[];state.transition=0;state.closing=false;state.label.classList.remove('show')}
}
function cameraZ(){if(!state.current)return FAR_Z;return mix(state.current.cameraFrom,state.current.cameraTo,state.transition)}
function currentTranslation(){
  if(!state.current)return [0,0,0];
  const start=state.current.globalSource?qRot(overviewOrientation(),state.current.sourceLocal):state.current.entryWorld;
  return mix3(start,[0,0,0],state.transition);
}

function draw(now){
  if(!state||!state.mounted){if(state)state.raf=requestAnimationFrame(draw);return}
  governFrame(now);updateChamberTransition(now);updateTransition(now);updateBackgroundPassage(now);driftOrganisms(now);if(state.current&&state.beingTargetQ&&!state.pointer?.moved)state.localQ=beingSlerp(state.localQ,state.beingTargetQ,.075);state.environment?.draw(now);
  const {gl}=state.renderer,{rect,d,w,h}=resizeCanvas(state.canvas),cam=cameraZ(),overviewQ=overviewOrientation(),passage=backgroundPassage();
  const far=Math.max(12,cam+overviewTransformScale(rect.width)*2+2),proj=perspective(FOV,w/h,Math.max(.00008,cam*.015),far),view=lookAt([0,0,cam],[0,0,0],[0,1,0]);
  gl.viewport(0,0,w,h);gl.clearColor(.003,.006,.006,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  /* Papers is an independent body floating inside Philosophy Inquiry-space.
   * A fixed local rest basis keeps the four truthful root chambers legible while
   * every later Display orientation change remains inherited as a shared rotation.
   * Inquiry passage is centripetal: the root/chamber world remains in its own frame
   * while the selected organism moves to center and the camera dives into its scale. */
  state.renderer.draw(outerCells(rect.width,CHAMBER_FACE_ALPHA),overviewQ,[0,0,0],proj,view,{faces:true});state.renderer.draw(outerCells(rect.width),overviewQ,[0,0,0],proj,view,{faces:false});
  const fade=!state.current?1:(state.stack.length?NESTED_BACKGROUND_ALPHA:mix(1,BACKGROUND_FIELD_ALPHA,passage)),starFade=!state.current?1:mix(1,BACKGROUND_STAR_ALPHA,passage),population=populationBodies(rect.width,rect.height,fade,starFade,now);
  state.renderer.draw(population.leaves,overviewQ,[0,0,0],proj,view,{faces:true});
  state.renderer.drawLights(population.lights,overviewQ,[0,0,0],proj,view,now*.001,d,OVERVIEW_LIGHT_GAIN);
  let metaboliteCount=0,organismEmberCount=0,metabolights=[],translate=[0,0,0];
  if(state.current){
    const tree=[],embers=[];collectBody(state.current.id,[0,0,0],state.current.scale,cam,rect.height,tree,embers);for(const x of tree)x.color[3]*=.3+.7*state.transition;
    const structuralEmbers=embers.filter(x=>x.id!==state.current.id);for(const x of structuralEmbers)x.color[3]*=.18+.42*state.transition;
    translate=currentTranslation();state.renderer.draw(tree,state.localQ,translate,proj,view,{faces:true});
    state.renderer.draw([{center:[0,0,0],scale:state.current.scale,color:[.88,1,.92,state.being?.14:.82]}],state.localQ,translate,proj,view,{faces:false});
    state.renderer.drawLights(structuralEmbers,state.localQ,translate,proj,view,now*.001,d,INQUIRY_EMBER_GAIN);
    const entity=state.identities.get(state.current.id);metabolights=metaboliteRepel(entity.id,metaboliteField(entity,state.current,cam,rect.height,now),state.current.scale*METABOLITE_FIELD_SCALE,now);const recede=state.beingRecede||0,metOpen=state.inner?.kind==='met'||state.beingPeek?.kind==='met';for(const x of metabolights)x.color[3]*=state.transition*(metOpen?1:1-.85*recede);
    state.renderer.drawLights(metabolights,state.localQ,translate,proj,view,now*.001,d,METABOLITE_LIGHT_GAIN);
    metaboliteCount=metabolights.length;organismEmberCount=structuralEmbers.length;
    if(state.transition>.72){const kids=childBodies(state.current).map(k=>({...k,color:[.72,1,.85,.62]}));state.renderer.draw(kids,state.localQ,translate,proj,view,{faces:false})}
  }
  drawWisdom(rect,cam,translate,metabolights,now);drawNames(rect,now);updateOrganismInquiry();drawOverviewPhysiology(now);updateChamberLabels(rect.width,rect.height);
  const inquiryFocus=inquiryFrameFocus();
  state.canvas.dataset.sQuantumScale=String(S_QUANTUM_SCALE);state.canvas.dataset.backgroundFieldAlpha=String(fade);state.canvas.dataset.backgroundStarAlpha=String(starFade);state.canvas.dataset.backgroundPassage=String(passage);state.canvas.dataset.inquiryCameraZ=String(cam);state.canvas.dataset.rootFieldScale=String(rootFieldScale(rect.width));state.canvas.dataset.overviewSScale=String(overviewBodyScaleFor({rank:'S'},rect.width));state.canvas.dataset.rootSScale=String(rootBodyScaleFor({rank:'S'},rect.width));state.canvas.dataset.overviewWander=String(OVERVIEW_WANDER);state.canvas.dataset.overviewFlowPeriod=String(OVERVIEW_FLOW_PERIOD_MS);state.canvas.dataset.overviewBasisY=String(PAPERS_OVERVIEW_BASIS_Y);state.canvas.dataset.chamberPath=state.chamberPath||'overview';state.canvas.dataset.chamberScale=String(chamberFocus().scale);state.canvas.dataset.inquiryFrameScale=String(inquiryFocus.scale);state.canvas.dataset.inquiryFrameCenter=inquiryFocus.center.map(v=>v.toFixed(6)).join(',');state.canvas.dataset.metabolightCount=String(metaboliteCount);state.canvas.dataset.organismEmberCount=String(organismEmberCount);
  if(state.current){const entity=state.identities.get(state.current.id),rank=rankNumber(entity?.rank);state.canvas.dataset.currentRank=String(rank);state.canvas.dataset.currentBodyScale=String(state.current.scale);setHud(`<span>INQUIRY${state.inner?' · '+beingDescribe(state.inner):''}</span><b>${state.current.id}</b><small>hover peeks · touch opens · a vertex of a holon is its parent · empty space ascends</small>`)}
  else{delete state.canvas.dataset.currentRank;delete state.canvas.dataset.currentBodyScale;const locus=state.chamberPath?state.chamberPath+' · '+chamberLabel(state.chamberPath):'overview';setHud(`<span>PAPERS · ${locus}</span><b>${state.records.length} tetrahedral organisms</b><small>${state.backgroundDrag?'drag field · ':''}${state.chamberPath?'touch organism · empty space ascends':'touch a chamber to enter it'}</small>`)};
  state.raf=requestAnimationFrame(draw);
}

/* The lens is the instrument and the LOD: organisms' particle letters exist, and organisms can be peeked
 * or entered, only where Display's glass lens lies. Without a lens nothing is gated. */
let lensAccess=null;
function lensLocal(rect){const L=lensAccess?.();if(!L||!rect)return null;return {x:L.x-(rect.left||0),y:L.y-(rect.top||0),r:L.r}}
function inLens(L,x,y,pad=0){return !L||Math.hypot(x-L.x,y-L.y)<=L.r+pad}
function hitGlobal(x,y,width,height,now=performance.now()){if(!inLens(lensLocal(state.canvas.getBoundingClientRect()),x,y))return '';let best=null;const q=overviewOrientation();for(const rec of state.records){const p=projectPoint(overviewCenterFor(rec,width,now),q,FAR_Z,width,height),px=projectedPixels(overviewBodyScaleFor(rec,width),FAR_Z,height),radius=clamp(px*.55,10,48),dist=Math.hypot(x-p.x,y-p.y);if(dist<radius&&(!best||dist<best.dist))best={id:rec.id,dist}}return best?.id||''}
function hitChild(x,y,width,height){
  if(!state.current||state.transition<.82)return '';const cam=cameraZ(),translate=currentTranslation(),inv=[state.localQ[0],-state.localQ[1],-state.localQ[2],-state.localQ[3]];let best=null;
  /* projectPoint rotates its input before perspective. Pull the world translation
   * back into the local frame so child + inverse(q)*translation maps to the exact
   * q(child)+translation transform used by the renderer. */
  for(const child of childBodies(state.current)){
    const local=add(child.center,qRot(inv,translate)),p=projectPoint(local,state.localQ,cam,width,height),dist=Math.hypot(x-p.x,y-p.y);
    if(dist<34&&(!best||dist<best.dist))best={id:child.id,dist};
  }
  return best?.id||'';
}

function attachInput(){
  const canvas=state.canvas;
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;state.pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};try{canvas.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault()});
  canvas.addEventListener('pointermove',e=>{{const r=canvas.getBoundingClientRect();state.hover={x:e.clientX-r.left,y:e.clientY-r.top}}const p=state.pointer;if(!p||p.id!==e.pointerId)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;if(Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>3)p.moved=true;if(p.moved){if(state.current){state.beingTargetQ=null;state.localQ=rotateQ(state.localQ,dx,dy)}else if(state.backgroundDrag)W.rotateBy(dx,dy,'papers:sierpinski');p.x=e.clientX;p.y=e.clientY}e.preventDefault()});
  const end=e=>{
    const p=state.pointer;if(!p||p.id!==e.pointerId)return;state.pointer=null;try{canvas.releasePointerCapture(e.pointerId)}catch(_){}
    if(!p.moved){
      const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
      if(state.current){const piece=beingHit(x,y);if(piece){if(piece.kind==='vert'&&piece.door&&childBodies(state.current).some(c=>c.id===piece.door))descend(piece.door);else if(!beingSame(piece,state.inner))lockInner(piece)}else if(state.inner)lockInner(null);else{const child=hitChild(x,y,r.width,r.height);if(child)descend(child);else closeOrAscend()}}
      else{const now=performance.now(),target=hitGlobal(x,y,r.width,r.height,now),rec=target?state.recordById.get(target):null,here=state.chamberPath||'';
        /* Descent: only the current container's content can be entered; touching content that
         * lives deeper descends into the next container on its way first. */
        if(rec&&rec.locus===here)openGlobal(target,r.width,now);
        else if(rec&&rec.locus.startsWith(here))setChamber(rec.locus.slice(0,here.length+1),now);
        else{const chamber=hitChamber(x,y,r.width,r.height);if(chamber)setChamber(chamber,now);else if(here)ascendChamber(now);else dispatchEvent(new CustomEvent('sss:membrane-ascend',{detail:{id,source:'ascent:papers'}}))}}
    }
    e.preventDefault();
  };
  canvas.addEventListener('pointerup',end);canvas.addEventListener('pointerleave',()=>{state.hover=null});canvas.addEventListener('pointercancel',end);
  addEventListener('keydown',e=>{if(e.key!=='Escape'||!state)return;if(state.current){e.preventDefault();if(state.inner)lockInner(null);else closeOrAscend()}else if(state.chamberPath){e.preventDefault();ascendChamber()}});
}

function initialize(host,projection,backgroundDrag=true,dependency=null){
  const stage=makeStage(host),fp=fieldProjection(projection),built=buildRecords(projection,fp.root),renderer=createRenderer(stage.canvas);if(!renderer)return null;
  const identities=identityIndex(projection),parents=parentIndex(projection),recordById=new Map(built.records.map(x=>[x.id,x])),environment=createInquiryEnvironment(stage.environmentCanvas);
  state={host,projection,dependency,structure:built.structure,environmentCanvas:stage.environmentCanvas,environment,canvas:stage.canvas,textCanvas:stage.textCanvas,physiology:stage.physiology,physiologyCanvas:stage.physiologyCanvas,physiologyPhases:stage.physiologyPhases,physiologyTitle:stage.physiologyTitle,physiologyCopy:stage.physiologyCopy,sourceInfo:stage.sourceInfo,chamberLabels:stage.chamberLabels,chamberLabelNodes:stage.chamberLabelNodes,hud:stage.hud,label:stage.label,renderer,identities,parents,records:built.records,recordById,current:null,stack:[],localQ:[1,0,0,0],transition:0,transitionStart:0,closing:false,backgroundPassage:0,backgroundPassageFrom:null,backgroundPassageTo:null,backgroundPassageStart:0,chamberPath:'',chamberFocus:{center:[0,0,0],scale:1},chamberFrom:null,chamberTo:null,chamberTransitionStart:0,pointer:null,mounted:true,raf:0,backgroundDrag:backgroundDrag!==false,pretextStatus:pretextModule?'ready':'loading',wisdomPrepared:new Map(),inquiryBodies:{},shadowApplied:false,shadowHome:''};
  state.canvas.dataset.backgroundDrag=state.backgroundDrag?'true':'false';state.canvas.dataset.sQuantumScale=String(S_QUANTUM_SCALE);state.canvas.dataset.overviewWander=String(OVERVIEW_WANDER);state.canvas.dataset.overviewFlowPeriod=String(OVERVIEW_FLOW_PERIOD_MS);state.canvas.dataset.chamberPath='overview';state.canvas.dataset.shadowState='loading';state.textCanvas.dataset.pretextIdentity=PRETEXT_ID;state.textCanvas.dataset.pretextVersion=PRETEXT_VERSION;state.textCanvas.dataset.pretextStatus=state.pretextStatus;state.textCanvas.dataset.shadowState='loading';
  ensurePretext();hydrateShadow(host);attachInput();state.raf=requestAnimationFrame(draw);return state;
}

function render({host,content,projection,backgroundDrag=true,dependency=null,lens=null}={}){
  lensAccess=typeof lens==='function'?lens:null;
  if(!host||!content||!projection?.groups||!projection?.phenotype||!N||!W)return false;
  host.hidden=false;content.replaceChildren();content.className='interlocutor-content papers-content';
  const shared=host.querySelector('.interlocutor-background');if(shared)shared.style.pointerEvents='none';
  const labels=host.querySelector('.interlocutor-field-labels');if(labels)labels.style.display='none';
  if(!state||state.host!==host)initialize(host,projection,backgroundDrag,dependency);else{state.dependency=dependency;if(!state.shadowApplied)applyProjection(projection);state.backgroundDrag=backgroundDrag!==false;state.canvas.dataset.backgroundDrag=state.backgroundDrag?'true':'false';state.mounted=true;state.environmentCanvas.hidden=false;state.canvas.hidden=false;state.textCanvas.hidden=false;state.physiology.hidden=false;state.sourceInfo.hidden=false;state.chamberLabels.hidden=false;state.hud.hidden=false;state.label.hidden=false;hydrateShadow(host)}
  return true;
}
function unmount({host,content}={}){if(state){state.mounted=false;state.environmentCanvas.hidden=true;state.canvas.hidden=true;state.textCanvas.hidden=true;state.physiology.hidden=true;state.sourceInfo.hidden=true;state.chamberLabels.hidden=true;state.hud.hidden=true;state.label.hidden=true}if(host)host.hidden=true;if(content)content.replaceChildren()}
function activateFieldPoint(){}

modules.set(id,Object.freeze({id,shader,render,unmount,fieldProjection,activateFieldPoint}));
})();
