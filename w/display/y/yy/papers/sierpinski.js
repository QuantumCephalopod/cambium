(() => {
'use strict';
const typeInk=(ctx,...args)=>{if(globalThis.SSSDisplayType?.fillText)return globalThis.SSSDisplayType.fillText(ctx,...args);ctx.fillText(...args)};

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
const PRETEXT_ID='@chenglou/pretext';
const PRETEXT_VERSION='0.0.9';
const SHADOW_PATH='papers-shadow/current.json';
const GENEALOGY_REPAIR_PATH='papers-shadow/genealogy-gap-repair.json';
const METABOLITE_FIELD_SCALE=.32;
const METABOLITE_LABEL_MAX_WIDTH=320;
const METABOLITE_LABEL_ROWS=4;
const METABOLITE_LIGHT_GAIN=1.0;
const INQUIRY_EMBER_GAIN=.28;
const OVERVIEW_WANDER=.86;
const OVERVIEW_FLOW_PERIOD_MS=42000;
const OVERVIEW_LIGHT_GAIN=.46;
const INQUIRY_LIGHT_GAIN=.72;
const CHAMBER_SHELL_ALPHA=.55,CHAMBER_FACE_ALPHA=.05;
const PAPERS_OVERVIEW_BASIS_Y=-.275;
const BACKGROUND_FIELD_ALPHA=.16;
const BACKGROUND_STAR_ALPHA=.72;
const NESTED_BACKGROUND_ALPHA=.07;
const FACE=[[0,2,1],[0,1,3],[0,3,2],[1,2,3]];
const EDGE=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];

/* Papers lends its actual bodies to Display's walked field. Text remains a
 * source-owned canvas; the host environment, camera, glass and clock are shared. */
const shader=Object.freeze({
  id:'shader:organism:papers',
  composite:()=>state?.mounted?[state.textCanvas,...(state.tissueLive?[state.tissueCanvas]:[])]:null,
  focus:()=>state?.mounted&&state.current&&!state.closing?{center:[0,0,0],scale:FAR_Z/state.current.cameraTo,stiffness:6}:null,
  afterDraw:frame=>draw(frame.ms,frame),
  clear:[0,0,0,0],
  fallbackAlpha:0,
  state:Object.freeze({blend:true,depthTest:false,depthWrite:false}),
  /* the body seen from a host: ruled paper in Papers' green — its field draws nothing because its own environment does the work */
  body:Object.freeze({
    cells:({projection})=>hostCells(projection).map(c=>({path:c.gene,tet:N.V0.map(v=>v.map((x,j)=>c.center[j]+x*c.scale))})),
    draw:drawHostBody,
    release:({gl})=>{hostRenderers.get(gl)?.dispose();hostRenderers.delete(gl)},
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

/* The parent sees the same chamber/organism grammar at a coarser resolution.
 * Only the site's admitted bounded outer sample is used; entering acquires detail.
 * This renderer has no selected-organism state and never loads the detailed feed. */
const hostRenderers=new Map(),hostRecordCache=new WeakMap();
function hostCells(preview,ms=0){
  let records=preview&&hostRecordCache.get(preview);
  if(!records){
    const roots=N.collectStructure(preview?.root||fieldProjection({}).root).leaves;records=[];
    for(const p of preview?.population||[]){
      if(!GENES.includes(p.gene)||typeof p.id!=='string')continue;
      const cell=roots.find(c=>c.path===p.gene);if(!cell)continue;
      records.push({id:p.id,gene:p.gene,world:pointInTet(cell.tet,p),motionA:pointInTet(cell.tet,{id:p.id+'·flow-a'},.20),motionB:pointInTet(cell.tet,{id:p.id+'·flow-b'},.20),motionC:pointInTet(cell.tet,{id:p.id+'·flow-c'},.20),motionD:pointInTet(cell.tet,{id:p.id+'·flow-d'},.20),rank:Number(p.id.match(/^(\d+)H\./)?.[1]||0)});
    }
    if(preview)hostRecordCache.set(preview,records);
  }
  return [...GENES.map((g,i)=>({gene:g,center:N.V0[i].map(v=>v*.5),scale:.5,color:[...PALETTE[g],CHAMBER_FACE_ALPHA],chamber:true})),...records.map(p=>({id:p.id,gene:p.gene,center:flowPoint(p,ms),scale:S_QUANTUM_SCALE*2**p.rank,color:[...PALETTE[p.gene],.65]}))];
}
function matrixProduct(a,b){const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out}
function drawHostBody({gl,proj,view,model,projection,ms,dpr=1,rect}){
  let renderer=hostRenderers.get(gl);if(!renderer){renderer=createRenderer({getContext:()=>gl});hostRenderers.set(gl,renderer)}
  const clip=matrixProduct(proj,matrixProduct(view,model)),identity=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),cells=hostCells(projection,ms);
  renderer.draw(cells,[1,0,0,0],[0,0,0],clip,identity);
  // Entered Papers uses separate face and shell opacities. Keep that same
  // distinction at coarse rank; a .05-alpha wire cage is not its actual skin.
  const shells=cells.filter(c=>c.chamber).map(c=>({...c,color:[...c.color.slice(0,3),CHAMBER_SHELL_ALPHA]}));
  renderer.draw(shells,[1,0,0,0],[0,0,0],clip,identity,{faces:false});
  const height=rect?.height||(gl.canvas?.height||1)/dpr,verticalScale=Math.hypot(clip[1],clip[5],clip[9]);
  const lights=cells.filter(c=>c.id).map(c=>{const p=c.center,z=clip[3]*p[0]+clip[7]*p[1]+clip[11]*p[2]+clip[15];return {center:p,size:Math.max(1,verticalScale*c.scale*height/Math.max(.001,Math.abs(z))),color:[...c.color.slice(0,3),OVERVIEW_LIGHT_GAIN],phase:(hash32(c.id)/4294967296)*Math.PI*2}});
  renderer.drawLights(lights,[1,0,0,0],[0,0,0],clip,identity,ms*.001,dpr);
}

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
function relayoutWhenFaceReady(){
  if(state?.faceRelayout||!document.fonts?.load)return;state.faceRelayout=true;
  document.fonts.load(typeFont(-1,500)).then(()=>{if(!state)return;try{pretextModule?.clearCache?.()}catch(_){}state.wisdomPrepared=new Map();state.lensReading=null;state.namesFor=null;state.names=new Map()}).catch(()=>{});
}
function ensurePretext(){
  relayoutWhenFaceReady();
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

function typePx(rank){const T=globalThis.SSSDisplayType;if(!T?.rankPx)throw new Error('Display type scale missing');return T.rankPx(rank,document)}
function typeFont(rank,weight=500,family='"SpriteSheet Mono", system-ui, sans-serif'){return weight+' '+typePx(rank)+'px '+family}
function monoFont(rank,weight=400){return weight+' '+typePx(rank)+'px ui-monospace, monospace'}
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
const flowInvariants=new WeakMap();
function flowPoint(entity,now=performance.now()){
  let flow=flowInvariants.get(entity);
  if(!flow||flow.a!==entity.motionA||flow.b!==entity.motionB||flow.c!==entity.motionC||flow.d!==entity.motionD){
    flow={a:entity.motionA,b:entity.motionB,c:entity.motionC,d:entity.motionD,points:[entity.motionA,entity.motionB,entity.motionC,entity.motionD].filter(Boolean),phase:random01(entity.id,'flow-phase'),speed:mix(.72,1.28,random01(entity.id,'flow-speed'))};flowInvariants.set(entity,flow);
  }
  const points=flow.points;
  if(points.length<2)return entity.world;
  const phase=flow.phase*points.length,speed=flow.speed;
  const u=((now/OVERVIEW_FLOW_PERIOD_MS)*speed+phase)%points.length,index=Math.floor(u),t=smooth(u-index);
  const a=points[index],b=points[(index+1)%points.length],w=entity.world;
  return [mix(w[0],mix(a[0],b[0],t),OVERVIEW_WANDER),mix(w[1],mix(a[1],b[1],t),OVERVIEW_WANDER),mix(w[2],mix(a[2],b[2],t),OVERVIEW_WANDER)];
}
/* One bounded flow law at every scale — organisms in their chamber, metabolites in their organism: a body is a
 * small mass drawn toward its own flow point and pushed away by every neighbour inside their shared reach, so
 * bodies spread apart by themselves and keep moving. Motion only — nothing gains or loses meaning by where it drifts. */
const BODY_SPRING=6,BODY_PUSH=12.8,BODY_DRAG=4;
function driftBodies(sim,items,dt,reach,spring=BODY_SPRING){
  const n=items.length,scratch=sim.scratch||(sim.scratch={bodies:[],force:new Float64Array(0)}),bodies=scratch.bodies;
  bodies.length=n;if(scratch.force.length<n*3)scratch.force=new Float64Array(Math.max(n*3,scratch.force.length*2));const force=scratch.force;
  for(let i=0;i<n;i++){const it=items[i];let b=sim.bodies.get(it.id);if(!b){b={p:[...it.target],v:[0,0,0]};sim.bodies.set(it.id,b)}bodies[i]=b;for(let k=0;k<3;k++)force[i*3+k]=(it.target[k]-b.p[k])*spring}
  for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
    const R=reach(items[i],items[j]),a=bodies[i].p,b=bodies[j].p;let dx=a[0]-b[0],dy=a[1]-b[1],dz=a[2]-b[2];
    /* An axis outside the same spherical reach cannot interact; no near pair is omitted. */
    if(Math.abs(dx)>=R||Math.abs(dy)>=R||Math.abs(dz)>=R)continue;
    let dist=Math.hypot(dx,dy,dz);if(dist>=R)continue;
    if(dist<1e-9){const angle=random01(items[i].id,items[j].id)*Math.PI*2;dx=Math.cos(angle);dy=Math.sin(angle);dz=.3;dist=Math.hypot(dx,dy,dz)}
    const f=BODY_PUSH*(1-dist/R)*R/dist;
    force[i*3]+=dx*f;force[j*3]-=dx*f;force[i*3+1]+=dy*f;force[j*3+1]-=dy*f;force[i*3+2]+=dz*f;force[j*3+2]-=dz*f;
  }
  const drag=Math.exp(-BODY_DRAG*dt);
  for(let i=0;i<n;i++){const b=bodies[i];for(let k=0;k<3;k++){b.v[k]=(b.v[k]+force[i*3+k]*dt)*drag;b.p[k]+=b.v[k]*dt}}
  return bodies;
}
function det3(a,b,c){return a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0])}
const tetFrames=new WeakMap();
/* a body drifts inside the container that bounds it and never crosses it: outside → nearest-by-barycentric point on the tet */
function holdInTet(body,tet){
  let frame=tetFrames.get(tet);if(!frame){const [a,b,c,d]=tet,e1=sub(a,d),e2=sub(b,d),e3=sub(c,d);frame={a,b,c,d,e1,e2,e3,det:det3(e1,e2,e3),r:[0,0,0]};tetFrames.set(tet,frame)}
  const {a,b,c,d,e1,e2,e3,det,r}=frame;if(Math.abs(det)<1e-12)return false;
  for(let k=0;k<3;k++)r[k]=body.p[k]-d[k];
  let l0=det3(r,e2,e3)/det,l1=det3(e1,r,e3)/det,l2=det3(e1,e2,r)/det,l3=1-l0-l1-l2;
  if(l0>=0&&l1>=0&&l2>=0&&l3>=0)return false;
  l0=Math.max(0,l0);l1=Math.max(0,l1);l2=Math.max(0,l2);l3=Math.max(0,l3);const s=l0+l1+l2+l3||1;
  for(let k=0;k<3;k++)body.p[k]=(l0*a[k]+l1*b[k]+l2*c[k]+l3*d[k])/s;return true;
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
  let grouping=state.orgGrouping;
  if(!grouping||grouping.records!==state.records){const chambers=new Map();for(const rec of state.records){const list=chambers.get(rec.locus)||[];list.push({id:rec.id,record:rec,target:rec.world,size:bodyScaleFor(rec),tet:rec.tet});chambers.set(rec.locus,list)}grouping=state.orgGrouping={records:state.records,chambers}}
  for(const items of grouping.chambers.values()){
    for(const item of items)item.target=flowPoint(item.record,now);
    const bodies=driftBodies(sim,items,dt,(a,b)=>ORGANISM_REACH+a.size+b.size,ORGANISM_SPRING);
    for(let i=0;i<bodies.length;i++){const b=bodies[i];if(items[i].tet&&holdInTet(b,items[i].tet))for(let k=0;k<3;k++)b.v[k]*=.5}
  }
}
function overviewDriftPoint(entity,now=performance.now()){return state?.orgSim?.bodies.get(entity.id)?.p||flowPoint(entity,now)}
function chamberFocus(){return state?.chamberFocus||{center:[0,0,0],scale:1}}
function backgroundPassage(){return state?.backgroundPassage||0}
function inquiryFrameFocus(){
  if(state?.sharedFrame)return {center:state.sharedFrame.center,scale:1};
  const focus=chamberFocus(),t=backgroundPassage();
  return {center:mix3(focus.center,[0,0,0],t),scale:mix(focus.scale,1,t)};
}
function overviewTransformScale(width){return rootFieldScale(width)*inquiryFrameFocus().scale}
function overviewWorldPoint(point,width){const focus=inquiryFrameFocus();return mul(sub(point,focus.center),rootFieldScale(width)*focus.scale)}
function overviewCenterFor(entity,width,now=performance.now()){return overviewWorldPoint(overviewDriftPoint(entity,now),width)}
function overviewBodyScaleFor(entity,width){return bodyScaleFor(entity)*overviewTransformScale(width)}
function rootBodyScaleFor(entity,width){return bodyScaleFor(entity)*rootFieldScale(width)}
/* Only the contacted body's projection approaches the lens. Its source scale,
 * drifting physical center, and the enclosing field camera remain unchanged. */
function updateOverviewApproach(now){
  if(!state||state.current)return;
  const L=globalThis.SSSDisplayLens?.snapshot?.()?.lens,part=L?.lock?.kind==='body'?state.overviewContacts?.get(L.lock.id):null,rec=part&&state.recordById?.get(part.key);
  let a=state.overviewApproach;if(rec&&(!a||a.id!==rec.id))a=state.overviewApproach={id:rec.id,amount:0,last:now};
  if(!a)return;
  const dt=Math.min(.05,Math.max(0,(now-a.last)/1000));a.last=now;
  a.amount=mix(a.amount,rec?.id===a.id?1:0,1-Math.exp(-5*dt));
  if(rec?.id===a.id)a.diameter=2*Math.max(L.hx||L.r||0,L.hy||L.r||0);
  if(!rec&&a.amount<.001)state.overviewApproach=null;
}
function overviewBodyProjection(rec,rect,now=performance.now()){
  const center=overviewCenterFor(rec,rect.width,now),base=overviewBodyScaleFor(rec,rect.width),a=state?.overviewApproach;
  if(!a||a.id!==rec.id||!(rect.height>0&&a.diameter>0))return {center,scale:base};
  const depth=cameraZ()-qRot(overviewOrientation(),center)[2];if(!(depth>0))return {center,scale:base};
  const wanted=a.diameter*depth*Math.tan(FOV/2)/rect.height;
  return {center,scale:mix(base,Math.max(base,wanted),a.amount)};
}
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

function createRenderer(canvas,borrowed=null){
  const gl=borrowed||canvas.getContext('webgl2',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:true});
  if(!gl)return createFlatRenderer(canvas);
  const resources=[];
  const own=(kind,object)=>{resources.push([kind,object]);return object};
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
  const p=own('Program',program(gl,VS,FS));
  const loc={
    pos:gl.getAttribLocation(p,'aPos'),center:gl.getAttribLocation(p,'iCenter'),scale:gl.getAttribLocation(p,'iScale'),color:gl.getAttribLocation(p,'iColor'),
    proj:gl.getUniformLocation(p,'uProj'),view:gl.getUniformLocation(p,'uView'),quat:gl.getUniformLocation(p,'uQuat'),translate:gl.getUniformLocation(p,'uTranslate')
  };
  const triangles=[];for(const f of FACE)for(const i of f)triangles.push(...V0[i]);
  const lines=[];for(const e of EDGE)lines.push(...V0[e[0]],...V0[e[1]]);
  const instanceBuffer=own('Buffer',gl.createBuffer());
  const lightProgram=own('Program',program(gl,LIGHT_VS,LIGHT_FS)),lightVao=own('VertexArray',gl.createVertexArray()),lightBuffer=own('Buffer',gl.createBuffer());
  const lightLoc={
    center:gl.getAttribLocation(lightProgram,'iCenter'),size:gl.getAttribLocation(lightProgram,'iSize'),
    color:gl.getAttribLocation(lightProgram,'iColor'),phase:gl.getAttribLocation(lightProgram,'iPhase'),
    proj:gl.getUniformLocation(lightProgram,'uProj'),view:gl.getUniformLocation(lightProgram,'uView'),
    quat:gl.getUniformLocation(lightProgram,'uQuat'),translate:gl.getUniformLocation(lightProgram,'uTranslate'),
    time:gl.getUniformLocation(lightProgram,'uTime')
  };
  function geom(data){const vao=own('VertexArray',gl.createVertexArray());gl.bindVertexArray(vao);const b=own('Buffer',gl.createBuffer());gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);gl.enableVertexAttribArray(loc.pos);gl.vertexAttribPointer(loc.pos,3,gl.FLOAT,false,12,0);return {vao,count:data.length/3}}
  const tri=geom(triangles),line=geom(lines);
  let instanceData=new Float32Array(0),lightData=new Float32Array(0);
  function uploadInstances(instances){
    const length=instances.length*8;gl.bindBuffer(gl.ARRAY_BUFFER,instanceBuffer);
    if(instanceData.length<length){instanceData=new Float32Array(Math.max(length,instanceData.length*2));gl.bufferData(gl.ARRAY_BUFFER,instanceData.byteLength,gl.DYNAMIC_DRAW)}
    let i=0;for(const x of instances){instanceData[i++]=x.center[0];instanceData[i++]=x.center[1];instanceData[i++]=x.center[2];instanceData[i++]=x.scale;for(let k=0;k<4;k++)instanceData[i++]=x.color[k]}
    gl.bufferSubData(gl.ARRAY_BUFFER,0,instanceData.subarray(0,length));
  }
  function bindInstances(geometry){
    gl.bindVertexArray(geometry.vao);gl.bindBuffer(gl.ARRAY_BUFFER,instanceBuffer);
    const stride=32;
    gl.enableVertexAttribArray(loc.center);gl.vertexAttribPointer(loc.center,3,gl.FLOAT,false,stride,0);gl.vertexAttribDivisor(loc.center,1);
    gl.enableVertexAttribArray(loc.scale);gl.vertexAttribPointer(loc.scale,1,gl.FLOAT,false,stride,12);gl.vertexAttribDivisor(loc.scale,1);
    gl.enableVertexAttribArray(loc.color);gl.vertexAttribPointer(loc.color,4,gl.FLOAT,false,stride,16);gl.vertexAttribDivisor(loc.color,1);
  }
  function draw(instances,q,translate,proj,view,{faces=true}={}){
    if(!instances.length)return;uploadInstances(instances);
    gl.useProgram(p);gl.uniformMatrix4fv(loc.proj,false,proj);gl.uniformMatrix4fv(loc.view,false,view);gl.uniform4fv(loc.quat,new Float32Array(q));gl.uniform3fv(loc.translate,new Float32Array(translate));
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.DEPTH_TEST);
    if(faces){gl.depthMask(false);bindInstances(tri);gl.drawArraysInstanced(gl.TRIANGLES,0,tri.count,instances.length)}
    gl.depthMask(false);bindInstances(line);gl.drawArraysInstanced(gl.LINES,0,line.count,instances.length);gl.depthMask(true);
  }
  function drawLights(lights,q,translate,proj,view,time,dpr=1,gain=1){
    if(!lights.length)return;
    const length=lights.length*9;gl.bindVertexArray(lightVao);gl.bindBuffer(gl.ARRAY_BUFFER,lightBuffer);
    if(lightData.length<length){lightData=new Float32Array(Math.max(length,lightData.length*2));gl.bufferData(gl.ARRAY_BUFFER,lightData.byteLength,gl.DYNAMIC_DRAW)}
    let i=0;for(const x of lights){lightData[i++]=x.center[0];lightData[i++]=x.center[1];lightData[i++]=x.center[2];lightData[i++]=x.size*dpr;lightData[i++]=x.color[0];lightData[i++]=x.color[1];lightData[i++]=x.color[2];lightData[i++]=x.color[3]*gain;lightData[i++]=x.phase}
    gl.bufferSubData(gl.ARRAY_BUFFER,0,lightData.subarray(0,length));
    const stride=36;
    for(const [at,size,off] of [[lightLoc.center,3,0],[lightLoc.size,1,12],[lightLoc.color,4,16],[lightLoc.phase,1,32]]){gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,size,gl.FLOAT,false,stride,off)}
    gl.useProgram(lightProgram);gl.uniformMatrix4fv(lightLoc.proj,false,proj);gl.uniformMatrix4fv(lightLoc.view,false,view);gl.uniform4fv(lightLoc.quat,new Float32Array(q));gl.uniform3fv(lightLoc.translate,new Float32Array(translate));gl.uniform1f(lightLoc.time,time);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.drawArrays(gl.POINTS,0,lights.length);gl.depthMask(true);
  }
  return {gl,V0,draw,drawLights,dispose(){for(const [kind,object] of resources)gl['delete'+kind](object);resources.length=0}};
}

/* Same admitted tetrahedra and lights when a browser cannot provide WebGL.
 * This is a projection of the same instances, never a screenshot or dummy body. */
function clipCameraPlane(points,cam,near,closed=true){
  if(!points.length)return [];
  const inside=p=>cam-p[2]>=near,cut=(a,b)=>{const da=cam-a[2]-near,db=cam-b[2]-near,t=da/(da-db);return a.map((v,i)=>v+(b[i]-v)*t)};
  if(!closed){const [a,b]=points,ia=inside(a),ib=inside(b);return ia&&ib?[a,b]:ia?[a,cut(a,b)]:ib?[cut(a,b),b]:[]}
  const out=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],ia=inside(a),ib=inside(b);if(ia)out.push(a);if(ia!==ib)out.push(cut(a,b))}return out;
}
function createFlatRenderer(canvas){
  const ctx=canvas.getContext('2d'),V0=N.V0.map(v=>[...v]);if(!ctx)return null;
  const world=(p,q,t)=>add(qRot(q,p),t),point=(p,cam)=>projectWorldPoint(p,cam,canvas.clientWidth||canvas.width,canvas.clientHeight||canvas.height);
  return {gl:null,V0,draw(instances,q,t,_p,_v,{faces=true}={}){ctx.save();const r=canvas.getBoundingClientRect();ctx.setTransform(canvas.width/r.width,0,0,canvas.height/r.height,0,0);
    const cam=cameraZ(),near=.1/(state.sharedFrame?.scale||1);
    for(const item of instances){const P=V0.map(v=>world(add(item.center,mul(v,item.scale)),q,t)),c=item.color;ctx.strokeStyle=`rgba(${c.slice(0,3).map(x=>Math.round(x*255))},${c[3]})`;ctx.fillStyle=`rgba(${c.slice(0,3).map(x=>Math.round(x*255))},${c[3]*.12})`;
      if(faces)for(const f of FACE){const poly=clipCameraPlane(f.map(i=>P[i]),cam,near).map(p=>point(p,cam));if(poly.length<3)continue;ctx.beginPath();ctx.moveTo(poly[0].x,poly[0].y);for(const p of poly.slice(1))ctx.lineTo(p.x,p.y);ctx.closePath();ctx.fill()}
      ctx.beginPath();for(const [a,b] of EDGE){const line=clipCameraPlane([P[a],P[b]],cam,near,false).map(p=>point(p,cam));if(line.length===2){ctx.moveTo(line[0].x,line[0].y);ctx.lineTo(line[1].x,line[1].y)}}ctx.stroke()}
    ctx.restore()},drawLights(lights,q,t,_p,_v,time,_d,gain=1){ctx.save();const r=canvas.getBoundingClientRect();ctx.setTransform(canvas.width/r.width,0,0,canvas.height/r.height,0,0);
    const cam=cameraZ(),near=.1/(state.sharedFrame?.scale||1);
    for(const l of lights){const w=world(l.center,q,t);if(cam-w[2]<near)continue;const p=point(w,cam),radius=Math.max(.5,l.size*.25*(.94+.06*Math.sin(time*1.25+l.phase)));ctx.fillStyle=`rgba(${l.color.slice(0,3).map(x=>Math.round(x*255))},${l.color[3]*gain})`;ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fill()}ctx.restore()},dispose(){}};
}
function makeStage(host){
  const canvas=host.querySelector('.interlocutor-background');
  if(!canvas)throw new Error('Papers requires its shared Display field');
  canvas.classList.add('papers-sierpinski-stage');canvas.setAttribute('aria-label','Papers recursive tetrahedral inquiry field');
  const textCanvas=document.createElement('canvas');textCanvas.className='papers-wisdom-stage';textCanvas.setAttribute('aria-label','Papers active metabolight wisdom');textCanvas.dataset.pretextVersion=PRETEXT_VERSION;host.append(textCanvas);
  const tissueCanvas=document.createElement('canvas');tissueCanvas.className='papers-tissue-stage';tissueCanvas.setAttribute('aria-hidden','true');host.append(tissueCanvas);
  const physiology=document.createElement('section');physiology.className='papers-physiology';physiology.setAttribute('aria-label','How Papers lives');
  const tutorialButton=document.createElement('button');tutorialButton.type='button';tutorialButton.textContent='HOW PAPERS LIVES';
  tutorialButton.addEventListener('click',()=>state.tutorial?stopTutorial():startTutorial());physiology.append(tutorialButton);host.append(physiology);
  const originButton=document.createElement('button');originButton.type='button';originButton.className='papers-origin-door';originButton.textContent='ORIGIN ↗';originButton.hidden=true;originButton.addEventListener('click',()=>{state.originOpen=!state.originOpen;});host.append(originButton);
  const sourceInfo=document.createElement('section');sourceInfo.className='papers-source-inquiry';sourceInfo.setAttribute('aria-label','Selected Papers organism origin');
  sourceInfo.innerHTML='<div class="papers-source-original"><small class="papers-origin-label">ORIGIN</small><span class="papers-source-code"></span><h2></h2><p class="papers-source-credit"></p><div class="papers-source-links"></div></div>';
  host.append(sourceInfo);
  const chamberLabels=document.createElement('div');chamberLabels.className='papers-chamber-labels';chamberLabels.setAttribute('aria-hidden','true');host.append(chamberLabels);
  const chamberLabelNodes=new Map();
  for(const gene of GENES){const n=document.createElement('button');n.type='button';n.className='papers-chamber-label';n.dataset.gene=gene;n.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(state&&!state.current)setChamber(gene)});chamberLabels.append(n);chamberLabelNodes.set(gene,n)}
  const hud=document.createElement('div');hud.className='papers-sierpinski-hud';host.append(hud);
  const label=document.createElement('div');label.className='papers-sierpinski-label';host.append(label);
  return {canvas,textCanvas,tissueCanvas,physiology,tutorialButton,originButton,sourceInfo,chamberLabels,chamberLabelNodes,hud,label};
}
function resizeWisdomCanvas(canvas,rect){
  const d=Math.min(devicePixelRatio||1,1.6),w=Math.max(1,Math.round(rect.width*d)),h=Math.max(1,Math.round(rect.height*d));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
  const ctx=canvas.getContext('2d');ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,rect.width,rect.height);
  return {ctx,d};
}

/* The explanation walks the same admitted bodies and invokes the same actions
 * as a visitor. It owns no population, duplicate geometry or simulation. */
function tutorialCandidates(){
  if(!state?.shadowApplied)return [];
  return state.records.filter(r=>{
    if(rankNumber(r.rank)!==4||inquiryBody(r.id)?.state!=='COMPLETE')return false;
    let id=r.id;const seen=new Set();
    for(let rank=4;rank>0;rank--){if(seen.has(id))return false;seen.add(id);const parents=state.parents.get(id)||[];
      if(parents.length!==4||parents.some(p=>!state.identities.has(p)))return false;
      id=parents.find(p=>inquiryBody(p));if(!id)return false;
    }
    return state.identities.get(id)?.kind==='source';
  });
}
function startTutorial(now=performance.now()){
  if(state.current)return false;const eligible=tutorialCandidates().filter(x=>x.id!==state.lastSpecimen),pool=eligible.length?eligible:tutorialCandidates();
  if(!pool.length)return false;
  const L=globalThis.SSSDisplayLens,lease=L?.beginPlayback?.()||null;if(L&&!lease)return false;
  const specimen=pool[Math.floor(Math.random()*pool.length)];state.lastSpecimen=specimen.id;
  state.tutorial={specimen:specimen.id,returnPath:Fields?.get(id)?.container??state.chamberPath,step:-1,at:now,copy:'',readyAt:0,lease,pendingTarget:lease?id+'|overview|'+encodeURIComponent(specimen.id):null};
  setChamber(specimen.locus,now);state.tutorialButton.textContent='RETURN TO MY VIEW';return true;
}
function stopTutorial(){
  const tour=state?.tutorial;if(!tour)return;
  state.tutorial=null;state.current=null;state.stack=[];state.inner=null;state.being=null;state.beingTargetQ=null;state.transition=0;state.closing=false;state.backgroundPassage=0;state.backgroundPassageFrom=null;state.backgroundPassageTo=null;state.label.classList.remove('show');withdrawPaperLens();
  setChamber(tour.returnPath);state.tutorialButton.textContent='HOW PAPERS LIVES';
  // Reoffer real overview identities before returning the borrowed drop.
  if(tour.lease)syncOverviewLens(state.canvas.getBoundingClientRect(),performance.now());
  if(tour.lease)globalThis.SSSDisplayLens?.endPlayback?.(tour.lease);
}
function tutorialStep(now){
  const tour=state.tutorial;if(!tour)return;
  if(tour.lease){const L=globalThis.SSSDisplayLens;if(!L?.playbackActive?.(tour.lease)){stopTutorial();return}if(tour.pendingTarget){if(!L.contactPlayback(tour.lease,tour.pendingTarget))return;tour.pendingTarget=null;tour.at=now;}}
  if(tour.lease&&tour.step>=0&&state.current){
    const rect=state.textCanvas.getBoundingClientRect(),drop=lensLocal(rect),part=drop?.lock&&livePaperLensPart(drop.lock.id),reading=part&&paperLensReading(part);
    // A slow device must actually settle on the contacted tissue before the
    // visitor's reading interval starts. Do not advance by wall time alone.
    if(state.transition<.98||!drop||!part||!paperLensReady(drop,reading)){tour.at=now;return}
  }
  const hold=state.identities.get(state.current?.id)?.kind==='source'?11200:5600;
  if(now-tour.at<hold)return;tour.at=now;tour.readyAt=now+1800;tour.step++;
  const entity=state.identities.get(state.current?.id),body=entity?inquiryBody(entity.id):null;
  switch(tour.step){
    case 0:openGlobal(tour.specimen,state.canvas.getBoundingClientRect().width,now);tour.copy=tour.specimen+' · one actual rank-4 Holon. Its body is twice the scale of each rank-3 parent; its four vertices are those parents.';break;
    case 1:{const vert=state.being?.verts[0];if(vert){lockInner({kind:'vert',key:vert.i});tour.copy='4V · this vertex is one actual parent, carrying its own authored distinction.'}break;}
    case 2:{const edge=state.being?.edges[0];if(edge){lockInner({kind:'edge',key:edge.key});tour.copy='6E · this edge is an authored relation between two actual parents. '+(body?.edges?.find(e=>e.id===edge.key)?.title||'')}break;}
    case 3:{const face=state.being?.faces[0];if(face){lockInner({kind:'face',key:face.key});tour.copy='4F · this face relates three parents. '+(body?.faces?.find(f=>f.id===face.key)?.title||'')}break;}
    case 4:lockInner({kind:'whole',key:'wxyz'});tour.copy='1T · a rank and four peers are drawn. Birth requires six edges, four faces and this irreducible whole. Every parent stays alive.';break;
    case 5:{const met=inquiryMetabolites(entity)[0],metId=typeof met?.id==='string'&&met.id.trim()?met.id.trim():'M1';lockInner(met?{kind:'met',key:entity.id+'·'+metId}:null);tour.copy=met?'The lights inside are the surviving metabolites. '+(met.title||''):'This projection contains no surviving metabolite. The center stays empty.';break;}
    default:{if(entity?.kind==='source'){stopTutorial();return;}
      const child=childBodies(state.current).find(c=>inquiryBody(c.id));if(!child){stopTutorial();return;}descend(child.id,now);
      const next=state.identities.get(child.id);tour.copy=next?.kind==='source'?child.id+' · one Source, the same tetrahedral species. '+(inquiryBody(child.id)?.state==='COMPLETE'?'Its four vertices partition one outside work.':'Its partition text is PARTIAL here; the gaps remain explicit.')+' ORIGIN reaches its authors and original work.':child.id+' · '+next?.rank+'. The same body grammar recurs: its four vertices are its own actual parents. The larger Holon and every parent remain alive.';
    }
  }
}
function drawOverviewPhysiology(now){
  const box=state.physiology;if(!box)return;
  const eligible=tutorialCandidates(),tour=state.tutorial,visible=Boolean(tour)||!state.current;
  const lens=globalThis.SSSDisplayLens,drop=lens?.snapshot?.()?.lens,available=!lens||!!drop&&!drop.held;
  setData(box,'visible',visible?'true':'false');box.setAttribute('aria-hidden',visible?'false':'true');state.tutorialButton.disabled=!tour&&(!eligible.length||!available);
  state.tutorialButton.title=!eligible.length?'No complete current rank-4 specimen is projected':!available?'Release or enable the glass drop to begin':'Visit an actual current rank-4 Holon';
  if(!tour){delete state.textCanvas.dataset.tutorialCommentaryBounds;return;}
  box.dataset.specimen=tour.specimen;box.dataset.step=String(tour.step);
  if(!tour.copy||now<tour.readyAt||state.transition<.98)return;
  const target=state.beingTargetQ;if(target&&Math.abs(target.reduce((s,v,i)=>s+v*state.localQ[i],0))<.995)return;
  const rect=state.textCanvas.getBoundingClientRect(),ctx=state.textCanvas.getContext('2d'),font=typeFont(-1,500),width=Math.max(80,Math.min(rect.width*.84,520)),lines=paperLensLines('tutorial:'+tour.specimen+':'+tour.step,tour.copy,font,width);
  if(!lines)return;const lh=BEING_LH*1.3,x=(rect.width-width)/2,carrier=state.ui?.carrier,y=Math.max(80,(carrier?carrier.y+carrier.h:rect.height*.72)-lh*(lines.length+1));const captionBox=inkNudge(tour,{x,y,w:width,h:lines.length*lh},rect,[]);setData(state.textCanvas,'tutorialCommentaryBounds',[captionBox.x,captionBox.y,captionBox.w,captionBox.h].map(v=>v.toFixed(1)).join(','));ctx.save();ctx.font=font;ctx.textBaseline='top';ctx.fillStyle='rgba(229,246,237,.88)';lines.forEach((line,i)=>typeInk(ctx,line.text,captionBox.x,captionBox.y+i*lh));ctx.restore();
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
const BODY_TEMPLATE_NODES=200000;
function bodyTemplateCache(){
  let c=state.bodyTemplates;
  /* These owners replace their immutable projections on admission; a new inquiry body also invalidates ember metadata. */
  if(!c||c.identities!==state.identities||c.parents!==state.parents||c.inquiry!==state.inquiryBodies||c.vertices!==state.renderer.V0){
    c=state.bodyTemplates={identities:state.identities,parents:state.parents,inquiry:state.inquiryBodies,vertices:state.renderer.V0,templates:new Map(),metadata:new Map(),nodes:0};
  }
  return c;
}
function bodyTemplate(id,scale,cameraZ,height,depth){
  const c=bodyTemplateCache();let limit=0,s=scale;
  const available=Math.max(0,rankNumber(state.identities.get(id)?.rank)-depth);
  while(limit<available&&projectedPixels(s,cameraZ,height)>=LOD_PX){limit++;s*=.5}
  const key=id+'@'+depth+'/'+limit;let t=c.templates.get(key);
  if(t){c.templates.delete(key);c.templates.set(key,t);return t}
  t=[];
  function visit(id,offset,factor,level){
    let meta=c.metadata.get(id);
    if(!meta){const entity=state.identities.get(id),pal=PALETTE[entity?.gene||'x']||PALETTE.x,rank=rankNumber(entity?.rank),hasMetabolites=inquiryMetabolites(entity).length>0;
      meta={entity,pal,rank,color:mix3(pal,[1.0,.90,.64],clamp(.40+rank*.035+(hasMetabolites?.08:0),.40,.64)),alpha:clamp(.18+rank*.055+(hasMetabolites?.06:0),.18,.68),phase:random01(id,'organism-ember')*Math.PI*2};c.metadata.set(id,meta)}
    const ps=state.parents.get(id)||[],leaf=ps.length!==4||level>=limit;
    t.push({id,offset,factor,level,leaf,meta});
    if(!leaf)for(let i=0;i<4;i++)visit(ps[i],add(offset,mul(state.renderer.V0[i],factor*.5)),factor*.5,level+1);
  }
  visit(id,[0,0,0],1,0);
  /* LRU bounds retained support, never the drawn population or recursion. Oversized entries remain uncached. */
  while(c.nodes+t.length>BODY_TEMPLATE_NODES&&c.templates.size){const k=c.templates.keys().next().value;c.nodes-=c.templates.get(k).length;c.templates.delete(k)}
  if(t.length<=BODY_TEMPLATE_NODES){c.templates.set(key,t);c.nodes+=t.length}
  return t;
}
function collectBody(id,center,scale,cameraZ,height,leaves,lights,depth=0){
  const template=bodyTemplate(id,scale,cameraZ,height,depth);
  for(const node of template){
    const {meta,factor}=node,localScale=scale*factor,px=projectedPixels(localScale,cameraZ,height),at=[center[0]+node.offset[0]*scale,center[1]+node.offset[1]*scale,center[2]+node.offset[2]*scale];
    if(meta.entity)lights.push({id:node.id,center:at,size:clamp(6+meta.rank*4+Math.sqrt(Math.max(px,0))*.72+(depth+node.level===0?2:0),6,42),color:[meta.color[0],meta.color[1],meta.color[2],meta.alpha],phase:meta.phase,kind:meta.rank===0?'source-ember':'organism-ember',rank:meta.rank});
    if(node.leaf)leaves.push({id:node.id,center:at,scale:localScale,color:[meta.pal[0],meta.pal[1],meta.pal[2],.11+Math.min(.30,px/150)]});
  }
}
function projectPoint(p,q,cameraZ,width,height){const r=qRot(q,p),z=cameraZ-r[2],f=(height/2)/Math.tan(FOV/2);return {x:width/2+r[0]*f/z,y:height/2-r[1]*f/z,z:r[2]}}
function projectWorldPoint(p,cameraZ,width,height){const z=cameraZ-p[2],f=(height/2)/Math.tan(FOV/2);return {x:width/2+p[0]*f/z,y:height/2-p[1]*f/z,z:p[2]}}
function wisdomFont(width){void width;return typeFont(-1,500)}
function wisdomLineHeight(width){void width;return typePx(0)}
function preparedWisdom(key,text,font){
  if(!pretextModule||!key||!text)return null;
  text=globalThis.SSSDisplayType?.fold?.(text)??text; /* Display's face has A-Z: umlauts fold before layout */
  if(!(state.wisdomPrepared instanceof Map))state.wisdomPrepared=new Map();
  const cacheKey=`${key}\u0000${font}\u0000${text}`;
  if(!state.wisdomPrepared.has(cacheKey))state.wisdomPrepared.set(cacheKey,pretextModule.prepareWithSegments(text,font));
  return state.wisdomPrepared.get(cacheKey);
}
function externalLabel(url,index){
  try{const u=new URL(url),host=u.hostname.replace(/^www\./,'');if(host==='doi.org')return 'DOI · ORIGINAL WORK';if(host==='arxiv.org')return 'ARXIV · ORIGINAL WORK';if(host==='github.com')return 'GITHUB · UPSTREAM';if(host.includes('pmlr.press'))return 'PMLR · ORIGINAL WORK';if(host.includes('w3.org'))return 'W3C · CANONICAL SOURCE';return host.toUpperCase()+' · ORIGINAL SOURCE'}catch(_){return 'ORIGINAL SOURCE '+(index+1)}
}

function updateOrganismInquiry(){
  const box=state.sourceInfo,entity=state.current?state.identities.get(state.current.id):null,visible=Boolean(entity?.kind==='source'&&state.originOpen),alpha=visible?smooth(clamp((state.transition-.38)/.38)):0;
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
const BEING_FONT=typeFont(-1,500),BEING_LH=typePx(0);
const FACE_FONT=typeFont(-1,500),FACE_LH=typePx(-1)*1.2;
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
  const ctx=state.textCanvas.getContext('2d'),B={id:entity.id,body,volume:body?.volume?[body.volume.title,body.volume.text].filter(Boolean).join(' — '):'',verts:[],edges:[],faces:[],mets:new Map()};
  state.inner=null;state.beingTargetQ=null;state.originOpen=false;
  const holon=entity.kind!=='source',parents=state.parents.get(entity.id)||[];
  GENES.forEach((g,i)=>{
    let text='',door='';
    if(holon&&parents.length===4){door=parents[i];const d=state.identities.get(door);text=g+' · '+door+' · '+(d?.title||door)}
    else{const v=(Array.isArray(body?.vertices)?body.vertices:[]).find(x=>x&&x.id===g);if(v)text=g+' · '+String(v.title||'').trim()+(v.text?' — '+String(v.text).trim():'')}
    if(!text)text=g;
    const lines=beingLines(entity.id+'·v·'+g,text,BEING_FONT,Array.from({length:12},(_,j)=>({x:0,y:j*BEING_LH,w:240})));
    const bold=text.indexOf(' — ');
    B.verts.push({i,gene:g,door,text:text===g?'':text,glyphs:beingGlyphs(ctx,lines,BEING_FONT,bold>0?bold:text.length),h:lines.length*BEING_LH,open:0});
  });
  for(const e of (Array.isArray(body?.edges)?body.edges:[])){
    const idx=beingKeyIdx(e?.id);if(idx.length!==2||idx.some(x=>x<0))continue;
    const text=String(e.text||e.title||'').trim();if(!text)continue;
    const w=Math.min(520,width*.72),lines=beingLines(entity.id+'·e·'+e.id,text,BEING_FONT,Array.from({length:16},(_,j)=>({x:-w/2,y:j*BEING_LH,w})));
    const g=beingGlyphs(ctx,lines,BEING_FONT),n=g.length,h=lines.length*BEING_LH;
    g.forEach((q,j)=>{q.u0=n>1?j/(n-1)-.5:0;q.ty-=h/2;q.seed=random01(entity.id+e.id,j)*6.283;q.amp=.4+random01(entity.id+e.id,'a'+j)});
    B.edges.push({key:e.id,text,a:idx[0],b:idx[1],glyphs:g,unravel:0,weave:0});
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
    B.faces.push({key:f.id,text,idx,miss:[0,1,2,3].find(i=>!idx.includes(i)),glyphs:g,stir:0,weave:0});
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
  state.inner=piece;state.originOpen=false;state.beingTargetQ=null;if(!piece||!state.current)return;
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
  if(p.kind==='whole')return 'whole · 1T';
  if(p.kind==='edge')return 'edge '+p.key;if(p.kind==='face')return 'face '+p.key;if(p.kind==='vert')return 'vertex '+GENES[p.key];
  if(p.kind==='met')return 'metabolite '+(state.being?[...state.being.mets.keys()].indexOf(p.key)+1:1);return '';
}
/* An edge's authored material fits its live projected endpoints. Full words
 * are always retained by the lens; foreshortening never stretches the body. */
function bodyDoorPoint(points,rect,side=1,occupied=[]){
  const center={x:points.reduce((s,p)=>s+p.x,0)/4,y:points.reduce((s,p)=>s+p.y,0)/4},ordered=[...points].sort((a,b)=>Math.atan2(a.y-center.y,a.x-center.x)-Math.atan2(b.y-center.y,b.x-center.x)),candidates=[];
  for(let i=0;i<ordered.length;i++){const a=ordered[i],b=ordered[(i+1)%ordered.length];for(const t of [.3,.5,.7]){let x=mix(a.x,b.x,t),y=mix(a.y,b.y,t),dx=x-center.x,dy=y-center.y,len=Math.hypot(dx,dy)||1;x+=dx/len*BEING_LH*1.2;y+=dy/len*BEING_LH*1.2;if(x>BEING_LH&&x<rect.width-BEING_LH&&y>80&&y<rect.height-BEING_LH*2)candidates.push({x,y});}}
  // This is a door on the actual projected boundary, not a HUD overlay.
  // Keep its glyph/contact clear of the same measured chrome as body ink.
  return candidates.filter(p=>!occupied.some(b=>p.x+BEING_LH>b.x&&p.x-BEING_LH<b.x+b.w&&p.y+BEING_LH>b.y&&p.y-BEING_LH<b.y+b.h)).sort((a,b)=>side*(b.x-a.x))[0]||null;
}
function foldedEdgeGlyphs(edge,length,dpr=1){
  if(edge.unravel>=.02||edge.weave>=.02)return edge.glyphs;
  const stride=Math.max(1,Math.ceil(edge.glyphs.length/Math.max(1,length*dpr)));
  return stride===1?edge.glyphs:edge.glyphs.filter((_,i)=>i%stride===0);
}
function edgeMaterial(edge,length){
  const bounds=edge.bounds||(edge.bounds=inkBounds(edge.glyphs,BEING_LH,'alphabetic'));
  const width=Math.max(BEING_LH,bounds.x1-bounds.x0),span=Math.max(1e-6,length*.92),scale=Math.min(1,span/(width+BEING_LH));
  return {scale,half:span/2,glyph:BEING_LH*scale};
}
function faceReading(points){
  const [a,b,c]=points,area=Math.abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)),sides=[Math.hypot(b.x-a.x,b.y-a.y),Math.hypot(c.x-b.x,c.y-b.y),Math.hypot(a.x-c.x,a.y-c.y)],longest=Math.max(...sides);
  return area/(longest*longest||1)>.18&&area/(longest||1)>=FACE_LH*4;
}
function beingSegDist(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p[0]-a.x)*dx+(p[1]-a.y)*dy)/(dx*dx+dy*dy||1));return Math.hypot(p[0]-a.x-t*dx,p[1]-a.y-t*dy)}
function beingHit(x,y){
  const G=state.beingGeo;if(!G||!state.current||state.transition<.82)return null;const m=[x,y];
  if(G.whole&&Math.hypot(x-G.whole.x,y-G.whole.y)<BEING_LH)return {kind:'whole',key:'wxyz'};
  for(const L of G.mets)if(Math.hypot(x-L.x,y-L.y)<18)return {kind:'met',key:L.id};
  for(let i=0;i<4;i++)if(Math.hypot(x-G.P[i].x,y-G.P[i].y)<14)return {kind:'vert',key:i,door:G.doors[i]||''};
  let best=9,hit=null;for(const e of state.being?.edges||[]){const d=beingSegDist(m,G.P[e.a],G.P[e.b]);if(d<best){best=d;hit={kind:'edge',key:e.key}}}if(hit)return hit;
  let hz=-1e9;for(const f of state.being?.faces||[]){if(!G.front[f.key])continue;const [a,b,c]=f.idx.map(i=>G.P[i]);const z=a.vz+b.vz+c.vz;if(pointInTriangle(x,y,a,b,c)&&z>hz){hz=z;hit={kind:'face',key:f.key}}}
  return hit;
}
/* The body offers its present, authored parts; the shared drop owns the lock.
 * Contact reads a finer resolution of that part without opening a door or
 * changing the selected organism, its orientation, or its Descent stack. */
const paperLensOffers=new Set();
function paperLensParts(B,G){
  const parts=new Map(),put=(kind,key,text,point)=>{if(!text?.trim()||!point)return;const target=id+'|'+encodeURIComponent(B.id)+'|'+kind+'|'+encodeURIComponent(key);parts.set(target,{id:target,kind,key,text,point})};
  if(B.volume&&G.whole)put('whole','wxyz',B.volume,G.whole);
  for(const v of B.verts)put('vert',v.i,v.text,G.P[v.i]);
  for(const e of B.edges){const a=G.P[e.a],b=G.P[e.b];put('edge',e.key,e.text,{x:(a.x+b.x)/2,y:(a.y+b.y)/2})}
  for(const f of B.faces)if(G.front[f.key]){const ps=f.idx.map(i=>G.P[i]);put('face',f.key,f.text,{x:ps.reduce((s,p)=>s+p.x,0)/3,y:ps.reduce((s,p)=>s+p.y,0)/3})}
  for(const m of G.mets)put('met',m.id,metaboliteWisdomText(m.light.metabolite),m);
  return parts;
}
function liveOverviewLensPart(target){
  if(!state?.mounted||state.host?.hidden)return null;
  if(!state.current)return state.overviewContacts?.get(target)||null;
  // The contacted organism remains the lens identity across overview and inquiry.
  // Selected tissue supplies a finer reading without creating a new lock.
  if(target!==state.lensBodyId||state.current.id!==state.lensBodyOrganism)return null;
  const selected=state.inner&&[...(state.lensParts?.values()||[])].find(p=>p.kind===state.inner.kind&&String(p.key)===String(state.inner.key));
  if(selected)return {...selected,id:target,rect:state.textCanvas.getBoundingClientRect()};
  if(state.inner)return null; // A temporarily occluded or unprojected part stays pending, not invented.
  const rect=state.textCanvas.getBoundingClientRect(),point=projectWorldPoint(currentTranslation(),cameraZ(),rect.width,rect.height);
  if(!Number.isFinite(point.x)||!Number.isFinite(point.y))return null;
  const entity=state.identities.get(state.current.id),text=state.current.id+' · '+String(entity?.title||state.current.id).trim();
  return {id:target,key:state.current.id,kind:'body',text,point,rect};
}
function livePaperLensPart(target){return liveOverviewLensPart(target)||(state?.mounted&&!state.host?.hidden&&state.current&&state.transition>=.82?state.lensParts?.get(target)||null:null)}
const overviewLensOffers=new Set();
function ensureOverviewLensOffer(target){
 const L=globalThis.SSSDisplayLens;if(!L?.offer||overviewLensOffers.has(target))return;
 L.offer(target,{kind:'body',point:()=>{const part=liveOverviewLensPart(target);return part?.point?{x:part.rect.left+part.point.x,y:part.rect.top+part.point.y,r:part.point.r}:null},frame:()=>{const part=liveOverviewLensPart(target);if(!part?.point)return null;const reading=paperLensReading(part);return reading?.ready?reading.frame:null},foreground:frame=>paperForeground(target,frame)});overviewLensOffers.add(target);
}
function withdrawOverviewLens(){for(const target of overviewLensOffers)globalThis.SSSDisplayLens?.withdraw(target);overviewLensOffers.clear();if(state){state.overviewContacts=null;state.overviewRender=null}}
function syncOverviewLens(rect,now){
 const L=globalThis.SSSDisplayLens;if(!L?.offer)return;
 if(!state?.mounted||state.host?.hidden){withdrawOverviewLens();return}
 if(state.current){
  for(const target of overviewLensOffers)if(target!==state.lensBodyId){L.withdraw(target);overviewLensOffers.delete(target)}
  return;
 }
 const q=overviewOrientation(),contacts=new Map();
 for(const rec of state.records){
  const target=id+'|overview|'+encodeURIComponent(rec.id),{center,scale}=overviewBodyProjection(rec,rect,now),point=projectPoint(center,q,cameraZ(),rect.width,rect.height),rotated=qRot(q,center),r=clamp(projectedPixels(scale,cameraZ()-rotated[2],rect.height)*.55,10,48);
  const present=Number.isFinite(point.x)&&Number.isFinite(point.y)&&cameraZ()>rotated[2]&&point.x+r>=0&&point.x-r<=rect.width&&point.y+r>=0&&point.y-r<=rect.height;
  const entity=state.identities.get(rec.id),text=rec.id+' · '+String(entity?.title||rec.title||'').trim();
  contacts.set(target,{id:target,key:rec.id,kind:'overview',text,point:present?{x:point.x,y:point.y,r}:null,rect});
 }
 state.overviewContacts=contacts;
 for(const target of overviewLensOffers)if(!contacts.has(target)){L.withdraw(target);overviewLensOffers.delete(target)}
 for(const target of contacts.keys())ensureOverviewLensOffer(target);
}
function drawOverviewForeground(part,frame){
 const f=state.overviewRender,rec=state.recordById?.get(part.key);
 if(!f||!rec||!frame.gl||state.renderer?.gl!==frame.gl)return false;
 const {center,scale}=overviewBodyProjection(rec,f.rect,f.ms),leaves=[],lights=[];
 collectVisibleBody(rec.id,center,scale,f.rect.width,f.rect.height,f.cam,f.q,leaves,lights);
 state.renderer.draw(leaves,f.q,[0,0,0],f.proj,f.view,{faces:true});state.renderer.drawLights(lights,f.q,[0,0,0],f.proj,f.view,f.ms*.001,f.dpr,OVERVIEW_LIGHT_GAIN);return true;
}
function withdrawPaperLens(){const L=globalThis.SSSDisplayLens;for(const target of paperLensOffers)L?.withdraw(target);paperLensOffers.clear();if(state){state.lensParts=null;const readingId=state.lensReading?.id,lockedId=L?.snapshot?.()?.lens?.lock?.id;if(!readingId||lockedId!==readingId||!liveOverviewLensPart(readingId)){state.lensReading=null;if(state.lensReader)state.lensReader.hidden=true}}}
function syncPaperLens(B,G){
  const L=globalThis.SSSDisplayLens;if(!L?.offer)return;
  state.lensParts=paperLensParts(B,G);
  for(const target of paperLensOffers)if(!state.lensParts.has(target)){L.withdraw(target);paperLensOffers.delete(target)}
  for(const target of state.lensParts.keys())if(!paperLensOffers.has(target)){
    L.offer(target,{kind:'body',foreground:frame=>paperForeground(target,frame),point:()=>{const p=livePaperLensPart(target);if(!p)return null;const r=state.textCanvas.getBoundingClientRect();return {x:r.left+p.point.x,y:r.top+p.point.y,r:9}},frame:()=>{const p=livePaperLensPart(target),r=p?paperLensReading(p):null;return r?.ready?r.frame:null}});paperLensOffers.add(target);
  }
}
/* All line ranges are retained until Pretext reaches the end. The finite
 * screen bounds one readable page, never the amount of admitted wording. */
function paperLensLines(target,text,font,width){
  const prepared=preparedWisdom(target,text,font);if(!prepared)return null;
  const lines=[];let cursor={segmentIndex:0,graphemeIndex:0};
  for(;;){const range=pretextModule.layoutNextLineRange(prepared,cursor,width);if(range===null)return lines;
    if(range.end.segmentIndex===cursor.segmentIndex&&range.end.graphemeIndex===cursor.graphemeIndex)throw new Error('Papers lens layout made no progress');
    lines.push(pretextModule.materializeLineRange(prepared,range));cursor=range.end;
  }
}
/* The containing carrier is not a promise that every pixel is free. Enumerate
 * exact obstacle boundaries, then retain the largest unobstructed rectangle.
 * This changes only reading layout/continuation, never the owner's body. */
function paperReadingRegion(bounds,occupied){
  const intersects=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  const obstacles=occupied.filter(b=>b.w>0&&b.h>0&&intersects(bounds,b));
  const xs=[...new Set([bounds.x,bounds.x+bounds.w,...obstacles.flatMap(b=>[Math.max(bounds.x,b.x),Math.min(bounds.x+bounds.w,b.x+b.w)])])].sort((a,b)=>a-b);
  const ys=[...new Set([bounds.y,bounds.y+bounds.h,...obstacles.flatMap(b=>[Math.max(bounds.y,b.y),Math.min(bounds.y+bounds.h,b.y+b.h)])])].sort((a,b)=>a-b);
  let best={x:bounds.x,y:bounds.y,w:0,h:0};
  for(let i=0;i<xs.length;i++)for(let j=i+1;j<xs.length;j++)for(let k=0;k<ys.length;k++)for(let l=k+1;l<ys.length;l++){
    const r={x:xs[i],y:ys[k],w:xs[j]-xs[i],h:ys[l]-ys[k]};
    if(r.w*r.h<=best.w*best.h||obstacles.some(b=>intersects(r,b)))continue;best=r;
  }
  return best;
}
function paperReadingChrome(rect,base){
  // The origin door occupies reading space, but must not repel its own next
  // boundary placement. Keep this measured extent separate from inkChrome.
  const door=state.originButton,r=door&&!door.hidden?door.getBoundingClientRect?.():null;
  if(!r||r.width<2||r.height<2)return base;
  const box={x:r.left-rect.left-INK_PAD,y:r.top-rect.top-INK_PAD,w:r.width+2*INK_PAD,h:r.height+2*INK_PAD},key=[box.x,box.y,box.w,box.h].join(','),old=state.readingDoorChrome;
  if(old?.base===base&&old.key===key)return old.list;
  return (state.readingDoorChrome={base,key,list:[...base,box]}).list;
}
function paperLensReading(part){
  const rect=state.textCanvas.getBoundingClientRect(),hostRect=state.host?.getBoundingClientRect?.()||rect,local=state.ui?.carrier,carrier=local?{x:hostRect.left+local.x,y:hostRect.top+local.y,w:local.w,h:local.h}:{x:rect.left,y:rect.top,w:rect.width,h:rect.height},pad=typePx(0),lh=wisdomLineHeight(rect.width),font=wisdomFont(rect.width);
  const bounds={x:Math.max(rect.left,carrier.x)-rect.left,y:Math.max(rect.top,carrier.y)-rect.top,w:Math.max(0,Math.min(rect.right??rect.left+rect.width,carrier.x+carrier.w)-Math.max(rect.left,carrier.x)),h:Math.max(0,Math.min(rect.bottom??rect.top+rect.height,carrier.y+carrier.h)-Math.max(rect.top,carrier.y))},chrome=state.readingChrome||[];
  const regionKey=[bounds.x,bounds.y,bounds.w,bounds.h].join(',');
  if(state.readingRegion?.key!==regionKey||state.readingRegion.chrome!==chrome)state.readingRegion={key:regionKey,chrome,box:paperReadingRegion(bounds,chrome)};
  const region=state.readingRegion.box,availableW=Math.max(1,region.w-2*pad),availableH=Math.max(1,region.h-2*pad);
  const ctx=state.textCanvas.getContext('2d');ctx.font=font;const folded=globalThis.SSSDisplayType?.fold?.(part.text)??part.text,advance=ctx.measureText(folded).width;
  const width=Math.min(availableW,Math.max(Math.min(160,availableW),Math.sqrt(Math.max(1,advance)*lh*2)+2*pad)),innerW=Math.max(1,width-2*pad),rows=Math.floor((availableH-2*pad-lh)/lh);
  const contentKey=part.id+'\0'+part.text+'\0'+font,key=contentKey+'\0'+innerW+'\0'+rows;
  let reading=state.lensReading;
  if(reading?.key!==key){const same=reading?.contentKey===contentKey,lines=rows>0&&innerW>=ctx.measureText('W').width?paperLensLines(part.id,part.text,font,innerW):null;reading=state.lensReading={key,contentKey,id:part.id,page:same?reading.page:0,anchorEnd:same&&reading.anchorEnd,lines:lines||[],ready:!!lines?.length,rows:Math.max(1,rows),font,lh,pad,width,height:Math.min(availableH,(Math.min(lines?.length||1,Math.max(1,rows))+1)*lh+2*pad),glyphPages:new Map()}}
  reading.pages=Math.max(1,Math.ceil(reading.lines.length/reading.rows));reading.page=reading.anchorEnd?reading.pages-1:Math.min(reading.page,reading.pages-1);
  const leftMin=rect.left+region.x+pad,topMin=rect.top+region.y+pad;
  const left=Math.max(leftMin,Math.min(leftMin+availableW-reading.width,rect.left+part.point.x-reading.width/2)),top=Math.max(topMin,Math.min(topMin+availableH-reading.height,rect.top+part.point.y-reading.height/2));
  reading.frame={left,top,width:reading.width,height:reading.height,r:Math.min(pad,reading.width/2,reading.height/2)};return reading;
}
function paperLensPage(delta){const r=state?.lensReading;if(!r?.ready)return false;r.anchorEnd=delta===Infinity;const next=Math.max(0,Math.min(r.pages-1,r.page+delta));if(next===r.page)return false;r.page=next;return true}
function paperLensReady(L,r){return r?.ready&&L?.round===0&&Math.abs(2*L.hx-r.width)<2&&Math.abs(2*L.hy-r.height)<2}
function paperLensReader(part,r){const reader=state.lensReader;if(!reader)return;reader.hidden=false;if(reader.dataset.target!==part.id||reader.querySelector('p').textContent!==part.text){reader.dataset.target=part.id;reader.querySelector('p').textContent=part.text}reader.querySelector('small').textContent=(r.page+1)+' / '+r.pages}
function paperLensClip(ctx,L,rect,outside=false){ctx.beginPath();if(outside)ctx.rect(0,0,rect.width,rect.height);if(L.round===0)ctx.roundRect(L.x-L.hx,L.y-L.hy,2*L.hx,2*L.hy,Math.min(L.corner||0,L.hx,L.hy));else ctx.arc(L.x,L.y,L.r,0,Math.PI*2);ctx.clip(outside?'evenodd':'nonzero')}
function paperForeground(target,frame){
  if(frame.fieldId!==id||!state?.mounted)return false;const part=livePaperLensPart(target),L=lensLocal(state.textCanvas.getBoundingClientRect());if(!part?.point||!L)return false;const body=part.kind==='overview'&&drawOverviewForeground(part,frame);if(!paperLensReady(L,paperLensReading(part)))return body;
  const c=state.focusCanvas||(state.focusCanvas=document.createElement('canvas'));if(c.width!==frame.width)c.width=frame.width;if(c.height!==frame.height)c.height=frame.height;const ctx=c.getContext('2d'),old=state.tissueLetters;ctx.setTransform(frame.dpr||1,0,0,frame.dpr||1,0,0);ctx.clearRect(0,0,c.width/(frame.dpr||1),c.height/(frame.dpr||1));
  try{state.tissueLetters=null;drawPaperLens(ctx,L,part,state.textCanvas.getBoundingClientRect(),frame.dpr||1)}finally{state.tissueLetters=old}return [c];
}
function drawPaperLens(ctx,L,part,rect,d){
  const r=paperLensReading(part);paperLensReader(part,r);
  state.textCanvas.dataset.lensReading=part.id;state.textCanvas.dataset.lensReadingPage=(r.page+1)+'/'+r.pages;
  if(!paperLensReady(L,r))return;
  let glyphs=r.glyphPages.get(r.page);if(!glyphs){glyphs=beingGlyphs(ctx,r.lines.slice(r.page*r.rows,(r.page+1)*r.rows).map((line,i)=>({text:line.text,x:0,y:i*r.lh})),r.font);r.glyphPages.set(r.page,glyphs)}
  const x=L.x-L.hx+r.pad,y=L.y-L.hy+r.pad;
  ctx.save();ctx.setTransform(d,0,0,d,0,0);paperLensClip(ctx,L,rect);ctx.textBaseline='top';ctx.font=r.font;
  if(state.tissueLetters)for(const g of glyphs){if(g.ch!==' ')state.tissueLetters.push({ch:g.ch,x:x+g.tx,y:y+g.ty,size:typePx(-1),fat:0,weight:1})}
  else{ctx.fillStyle='rgb(223,243,234)';ctx.globalAlpha=1;for(const line of r.lines.slice(r.page*r.rows,(r.page+1)*r.rows).entries())typeInk(ctx,line[1].text,x,y+line[0]*r.lh)}
  if(r.pages>1){ctx.fillStyle='rgb(191,245,220)';ctx.globalAlpha=.8;ctx.font=typeFont(-2,400);typeInk(ctx,(r.page+1)+' / '+r.pages+' · SCROLL',x,L.y+L.hy-r.pad-r.lh)}ctx.restore();
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
const glyphAtlas=new Map();let glyphMeasure=null,glyphAtlasBytes=0;
function glyphSprite(font,color,baseline,ch,scale){
  const inverse=document.documentElement?.dataset?.inverse||'false',key=font+'|'+color+'|'+baseline+'|'+scale+'|'+ch+'|'+inverse+'|'+(globalThis.SSSDisplayType?.fontEpoch?.()||0);let g=glyphAtlas.get(key);if(g)return g;
  if(!glyphMeasure)glyphMeasure=document.createElement('canvas').getContext('2d');glyphMeasure.font=font;
  const size=Number((font.match(/([\d.]+)px/)||[0,typePx(-1)])[1]),pad=globalThis.SSSDisplayType?.shadowPadding?.()||26,w=Math.ceil(glyphMeasure.measureText(ch).width)+2*pad,h=Math.ceil(size*1.7)+2*pad,oy=baseline==='top'?pad:Math.ceil(size*1.25)+pad;
  const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w*scale));c.height=Math.max(1,Math.ceil(h*scale));
  const x=c.getContext('2d');x.scale(scale,scale);x.font=font;x.fillStyle=color;x.textBaseline=baseline;typeInk(x,ch,pad,oy);
  g={c,w,h,ox:pad,oy,bytes:c.width*c.height*4};while(glyphAtlas.size&&(glyphAtlas.size>=4000||glyphAtlasBytes+g.bytes>32*1024*1024)){const first=glyphAtlas.keys().next().value;glyphAtlasBytes-=glyphAtlas.get(first).bytes;glyphAtlas.delete(first);}if(g.bytes<=32*1024*1024){glyphAtlas.set(key,g);glyphAtlasBytes+=g.bytes;}return g;
}
function inkText(ctx,glyphs,pick,color,alphaOf,fontOf,ox=0,oy=0){
  const baseline=ctx.textBaseline==='top'?'top':'alphabetic',scale=state?.inkScale||1;let f=fontOf?'':ctx.font;
  for(let j=0;j<glyphs.length;j++){const g=glyphs[j];if(!pick(g,j))continue;const a=alphaOf(g,j);if(a<=.004)continue;
    if(fontOf)f=fontOf(g,j);if(g.ch===' ')continue;const sp=glyphSprite(f,color,baseline,g.ch,scale);
    ctx.globalAlpha=Math.min(1,a);ctx.drawImage(sp.c,ox+g.x-sp.ox,oy+g.y-sp.oy,sp.w,sp.h)}
  ctx.globalAlpha=1;
}
function inkAabb(corners){const xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys);return {x,y,w:Math.max(...xs)-x,h:Math.max(...ys)-y}}
/* Text is tissue (Display RITUAL "Type is body"): inside an open organism every letter, dust or woven, is a
 * body handed to Display's text-tissue engine with its own fat; neighbours fuse into one mass, faces into a
 * web over the face, and Display's drop deflates the letters under it to their bare glyphs where they stand.
 * Without a drop nothing is gated: letters are bare. Without the engine the old ink path draws them. */
function tissueOn(){if(state.tissue===undefined){try{state.tissue=globalThis.SSSDisplayTextTissue?.create(state.tissueCanvas)||null}catch(_){state.tissue=null}}return !!state.tissue}
function tissueGlyphs(glyphs,pick,place,size,fat,weight){
  const T=state.tissueLetters;if(!T)return;const lens=state.tissueLens;
  for(let j=0;j<glyphs.length;j++){const g=glyphs[j];if(!pick(g,j)||g.ch===' ')continue;const w=weight(g,j);if(w<=.01)continue;
    const sz=typeof size==='function'?size(g,j):size,q=place(g,sz);
    // Tissue is resolved only inside the lens, with allowance for the glyph's fat/soft fringe.
    if(lens&&!inLens(lens,q.cx??q.x,q.cy??q.y,sz*(q.scale||1)*4))continue;
    T.push({ch:g.ch,x:q.x,y:q.y,cx:q.cx,cy:q.cy,angle:q.angle||0,size:sz*(q.scale||1),fat:typeof fat==='function'?fat(g,j):fat,weight:w})}
}
function flushTissue(rect){
  if(!state.tissue)return;const T=state.tissueLetters||[];
  // The last valid tissue keeps its current frame until the next one; exit clears exactly once.
  if(!T.length&&!state.tissueLive)return;
  const L=T.length?lensLocal(state.textCanvas.getBoundingClientRect()):null;
  state.tissue.draw(T,{width:rect.width,height:rect.height,dpr:state.tissueDpr||1,presses:L?[{x:L.x,y:L.y,r:L.r}]:[],tissue:L?.3:0,ink:[.87,.95,.92],alpha:.62});
  state.tissueLive=T.length>0;
  state.tissueCanvas.dataset.tissueLetters=String(T.length);state.tissueCanvas.dataset.tissuePressed=L?'1':'0';
}
/* where the drop lies, an opened sentence blooms inside the space it contains (its anchor pulled in, the block kept within) */
function bindToDrop(Lz,ax,ay,b){const s=Lz.r*.72,w=b.x1-b.x0,h=b.y1-b.y0;
  const cx=w>2*s?Lz.x:Math.max(Lz.x-s+w/2,Math.min(Lz.x+s-w/2,ax+(b.x0+b.x1)/2)),cy=h>2*s?Lz.y:Math.max(Lz.y-s+h/2,Math.min(Lz.y+s-h/2,ay+(b.y0+b.y1)/2));
  return {ox:cx-ax-(b.x0+b.x1)/2,oy:cy-ay-(b.y0+b.y1)/2}}
function drawWisdom(rect,cam,translate,metabolights,now){
  const LZ=lensLocal(state.textCanvas.getBoundingClientRect());state.tissueLens=LZ;
  const {ctx,d}=resizeWisdomCanvas(state.textCanvas,rect);state.inkScale=Math.max(1,Math.round(d*2)/2);state.tissueDpr=d;const earned=Boolean(state.current&&state.pretextStatus==='ready'&&smooth(clamp((state.transition-.50)/.32))>.01);state.tissueLetters=earned&&tissueOn()?[]:null;let TS=!!state.tissueLetters;const canvas=state.textCanvas,entity=state.current?state.identities.get(state.current.id):null,lights=Array.isArray(metabolights)?metabolights:[];
  canvas.dataset.pretextStatus=state.pretextStatus;canvas.dataset.wisdomLines='0';canvas.dataset.wisdomId=entity?.id||'';canvas.dataset.wisdomMetabolites=String(lights.length);canvas.dataset.wisdomSource='metabolites';canvas.dataset.wisdomState='hidden';delete canvas.dataset.wisdomComplete;
  const dt=Math.min(.05,Math.max(0,(now-(state.beingLast||now))/1000));state.beingLast=now;
  delete canvas.dataset.lensReading;delete canvas.dataset.lensReadingPage;
  if(!state.current||!entity){if(state.originButton)state.originButton.hidden=true;withdrawPaperLens();canvas.dataset.wisdomState='inactive';state.being=null;state.beingGeo=null;state.inner=null;state.beingTargetQ=null;return}
  if(state.pretextStatus!=='ready'||!pretextModule){withdrawPaperLens();canvas.dataset.wisdomState=state.pretextStatus;return}
  const alpha=smooth(clamp((state.transition-.50)/.32));if(alpha<=.01){withdrawPaperLens();canvas.dataset.wisdomState='lod-hidden';state.beingGeo=null;return}
  const B=ensureBeing(entity,rect.width),V=state.renderer.V0,sc=state.current.scale;
  const proj=local=>{const r=qRot(state.localQ,local),p=projectWorldPoint(add(r,translate),cam,rect.width,rect.height);p.vz=r[2];return p};
  const P=V.map(v=>proj(mul(v,sc))),front={};for(const f of B.faces)front[f.key]=qRot(state.localQ,V[f.miss])[2]<0;
  const font=wisdomFont(rect.width),metGeo=[];
  for(const light of lights){const p=proj(light.center);metGeo.push({id:light.id,x:p.x,y:p.y,light})}
  const chrome=inkChrome(rect),whole=B.volume?bodyDoorPoint(P,rect,1,chrome):null;
  state.beingGeo={P,front,mets:metGeo,whole,doors:B.verts.map(v=>v.door)};
  if(whole){ctx.font=BEING_FONT;ctx.fillStyle=`rgba(223,243,234,${alpha*.6})`;typeInk(ctx,'1T',whole.x-BEING_LH*.5,whole.y);}
  if(state.originButton){state.originButton.hidden=entity.kind!=='source';const origin=bodyDoorPoint(P,rect,-1,chrome);if(origin){state.originButton.style.left=origin.x+'px';state.originButton.style.top=origin.y+'px';}else state.originButton.hidden=true;}
  state.readingChrome=paperReadingChrome(rect,chrome);
  syncPaperLens(B,state.beingGeo);
  const contact=LZ?.lock?.kind==='body'?livePaperLensPart(LZ.lock.id):null,layout=contact?paperLensReading(contact):null,reading=paperLensReady(LZ,layout)?contact:null;
  if(contact)paperLensReader(contact,layout);else{state.lensReading=null;if(state.lensReader)state.lensReader.hidden=true}
  /* The same canvas carries the finer ink inside the actual drop. Ordinary
   * body ink remains outside; no detached panel or duplicate text is added. */
  if(reading){TS=false;ctx.save();paperLensClip(ctx,LZ,rect,true)}
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
    F.stir=mix(F.stir,isOpen?1:0,Math.min(1,dt*5));F.weave=mix(F.weave,isLock&&faceReading(F.idx.map(i=>P[i]))?settle:0,Math.min(1,dt*(isLock?3:5)));
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
    if(TS){const a=la*u[0]+lc*u[1],b=lb*u[0]+ld*u[1],c=la*v[0]+lc*v[1],e=lb*v[0]+ld*v[1],ang=Math.atan2(b,a),k=Math.hypot(a,b);
      const place=(g,sz)=>({x:a*g.x+c*g.y+ox,y:b*g.x+e*g.y+oy,cx:a*(g.x+sz*.3)+c*(g.y+sz*.5)+ox,cy:b*(g.x+sz*.3)+e*(g.y+sz*.5)+oy,angle:ang,scale:k});
      tissueGlyphs(F.glyphs,()=>true,place,g=>g.s<.4?6:11,g=>g.s<.4?3.2:.9,g=>(g.s<.4?.75+.25*F.stir:clamp((g.s-.4)*2))*alpha*dim)}
    else{inkDust(ctx,F.glyphs,g=>g.s<.4,.6,'rgb(191,245,220)',(.08+.32*F.stir)*alpha*dim);
    if(F.weave>.01)inkText(ctx,F.glyphs,g=>g.s>=.4,'rgb(223,243,234)',g=>clamp((g.s-.4)*2)*alpha)}
    ctx.restore();
  }
  ctx.textBaseline='alphabetic';
  // edges: tapered thread of letters; the pointer bursts the fibres; lock weaves the sentence
  for(const E of B.edges){
    const a=P[E.a],b=P[E.b],isOpen=beingSame(open,{kind:'edge',key:E.key}),isLock=beingSame(state.inner,{kind:'edge',key:E.key});
    E.unravel=mix(E.unravel,isOpen?1:0,Math.min(1,dt*5));E.weave=mix(E.weave,isLock?settle:0,Math.min(1,dt*(isLock?3:5)));
    const dim=1-.7*state.beingRecede*(isOpen?0:1);
    const [p,q]=a.x<=b.x?[a,b]:[b,a],len=Math.hypot(q.x-p.x,q.y-p.y)||1,ax=[(q.x-p.x)/len,(q.y-p.y)/len],pe=[-ax[1],ax[0]],c=[(p.x+q.x)/2,(p.y+q.y)/2],n=E.glyphs.length;
    const material=edgeMaterial(E,len);
    const um=(m[0]-c[0])*ax[0]+(m[1]-c[1])*ax[1],near=beingSame(peek,{kind:'edge',key:E.key})&&!isLock;
    E.glyphs.forEach((g,j)=>{
      const fu=g.u0*material.half*2,taper=Math.sin(Math.PI*(g.u0+.5)),wob=Math.sin(now/500+g.seed)*g.amp,burst=near?.18+1.4*Math.exp(-(((fu-um)/55)**2)):1,loose=E.unravel*burst*taper;g.t=taper;
      if(E.unravel<.01&&E.weave<.01){g.x=Math.max(-material.half,Math.min(material.half-material.glyph,fu));g.y=0;g.vx=g.vy=0;g.s=0;return;}
      const lu=fu+wob*4*loose,lv=Math.sin(g.seed*3+now/800)*14*g.amp*loose,sw=clamp(E.weave*1.5-(j/n)*.5);
      const tx=lu*(1-sw)+g.tx*material.scale*sw,ty=lv*(1-sw)+g.ty*material.scale*sw;
      beingSpring(g,tx,ty,.2,.68);g.x=Math.max(-material.half,Math.min(material.half-material.glyph,g.x));g.s=sw});
    const visibleGlyphs=foldedEdgeGlyphs(E,len,d);
    ctx.save();ctx.translate(c[0],c[1]);ctx.transform(ax[0],ax[1],pe[0],pe[1],0,0);ctx.font=BEING_FONT;
    if(TS){const ang=Math.atan2(ax[1],ax[0]),place=(g,size)=>{const sz=size*material.scale,y=g.y-sz*.8;return {x:c[0]+ax[0]*g.x+pe[0]*y,y:c[1]+ax[1]*g.x+pe[1]*y,cx:c[0]+ax[0]*(g.x+sz*.3)+pe[0]*(y+sz*.5),cy:c[1]+ax[1]*(g.x+sz*.3)+pe[1]*(y+sz*.5),angle:ang,scale:material.scale}};
      tissueGlyphs(visibleGlyphs,()=>true,place,g=>g.s<.4?5+4*g.t:12,g=>g.s<.4?2.4:.9,g=>(g.s<.4?(.4+.6*E.unravel)*(.5+.5*g.t):clamp((g.s-.4)*2))*alpha*dim)}
    else{for(let band=0;band<5;band++)inkDust(ctx,visibleGlyphs,g=>g.s<.4&&Math.min(4,Math.floor(g.t*5))===band,g=>material.scale*(.35+.75*g.t),'rgb(191,245,220)',(.25+.6*E.unravel)*(.4+.6*(band+.5)/5)*alpha);
    if(E.weave>.01){ctx.save();ctx.scale(material.scale,material.scale);inkText(ctx,E.glyphs.map(g=>({...g,x:g.x/material.scale,y:g.y/material.scale})),g=>g.s>=.4,'rgb(223,243,234)',g=>clamp((g.s-.4)*2)*alpha);ctx.restore()}}
    ctx.restore();
  }
  // vertices: the letter they are; the sentence unfolds out of it, centered beneath
  ctx.textBaseline='top';
  for(const Vt of B.verts){
    const p=P[Vt.i],isOpen=beingSame(open,{kind:'vert',key:Vt.i});Vt.open=mix(Vt.open,isOpen?1:0,Math.min(1,dt*5));
    const n=Vt.glyphs.length,g0=Vt.glyphs[0];if(!g0)continue;
    let ox=-120,oy=18;
    if(LZ&&Vt.open>.02){const vb=Vt.bounds||(Vt.bounds=inkBounds(Vt.glyphs,BEING_LH)),q=bindToDrop(LZ,p.x,p.y,vb);ox=q.ox;oy=q.oy}
    else if(Vt.open>.02){const vb=Vt.bounds||(Vt.bounds=inkBounds(Vt.glyphs,BEING_LH)),r=inkRing(Vt,p.x,p.y,[0,1],10,vb,rect,taken);
      ox=Math.max(16-p.x-vb.x0,Math.min(rect.width-16-p.x-vb.x1,r.ox));oy=Math.max(80-p.y-vb.y0,Math.min(rect.height-24-p.y-vb.y1,r.oy));
      if(Vt.open>.15)taken.push({x:p.x+ox+vb.x0,y:p.y+oy+vb.y0,w:vb.x1-vb.x0,h:vb.y1-vb.y0})}else Vt.inkAt=null;
    Vt.glyphs.forEach((g,j)=>{const sw=j===0?1:clamp(Vt.open*1.6-(j/Math.max(1,n))*.6);
      if(j===0)beingSpring(g,(g0.tx+ox)*Vt.open-4*(1-Vt.open),(g0.ty+oy)*Vt.open-8*(1-Vt.open),.2,.68);else beingSpring(g,sw*(ox+g.tx),sw*(oy+g.ty),.2,.68);g.s=sw});
    const dim=open&&!isOpen?.45:1;
    const vf=(g,j)=>{void j;return typeFont(-1,g.bold?600:400)};
    if(TS)tissueGlyphs(Vt.glyphs,(g,j)=>j===0||(Vt.open>.01&&g.s>=.35),(g,sz)=>({x:p.x+g.x,y:p.y+g.y,cx:p.x+g.x+sz*.3,cy:p.y+g.y+sz*.5}),(g,j)=>{void g;void j;return typePx(-1)},(g,j)=>j===0?.5:.9,(g,j)=>j===0?.95*alpha*dim:clamp((g.s-.35)*2)*alpha);
    else{inkText(ctx,Vt.glyphs,(g,j)=>j===0,'rgb(191,245,220)',()=>.95*alpha*dim,vf,p.x,p.y);
    if(Vt.open>.01)inkText(ctx,Vt.glyphs,(g,j)=>j>0&&g.s>=.35,'rgb(223,243,234)',g=>clamp((g.s-.35)*2)*alpha,vf,p.x,p.y)}
  }
  // metabolites: the light is the sentence asleep
  const cx=rect.width*.5,cy=rect.height*.5,metPx=(font.match(/[\d.]+px/)||[typePx(-1)+'px'])[0];let labelCount=0,lineCount=0;
  for(const L of metGeo){
    const M=metaboliteGlyphs(B,L.light,font);if(!M)continue;labelCount++;lineCount+=Math.round(M.h/BEING_LH);
    const isOpen=beingSame(open,{kind:'met',key:L.id});M.open=mix(M.open,isOpen?1:0,Math.min(1,dt*6));
    let ux=L.x-cx,uy=L.y-cy;const ul=Math.hypot(ux,uy)||1;ux/=ul;uy/=ul;
    let ox=0,oy=0;const n=M.glyphs.length;
    if(LZ&&M.open>.02){const mb=M.bounds||(M.bounds=inkBounds(M.glyphs,BEING_LH)),q=bindToDrop(LZ,L.x,L.y,mb);ox=q.ox;oy=q.oy}
    else if(M.open>.02){const mb=M.bounds||(M.bounds=inkBounds(M.glyphs,BEING_LH)),r=inkRing(M,L.x,L.y,[ux,uy],22,mb,rect,taken);
      ox=Math.max(14-L.x-mb.x0,Math.min(rect.width-14-L.x-mb.x1,r.ox));oy=Math.max(80-L.y-mb.y0,Math.min(rect.height-24-L.y-mb.y1,r.oy));
      if(M.open>.15)taken.push({x:L.x+ox+mb.x0,y:L.y+oy+mb.y0,w:mb.x1-mb.x0,h:mb.y1-mb.y0})}else M.inkAt=null;
    M.glyphs.forEach((g,j)=>{const sw=clamp(M.open*1.6-(j/Math.max(1,n))*.6);
      beingSpring(g,(1-sw)*(g.ix+Math.sin(now/600+j)*1.2)+sw*(ox+g.tx),(1-sw)*(g.iy+Math.cos(now/700+j)*1.2)+sw*(oy+g.ty));g.s=sw});
    const dim=open&&!isOpen?.25:1;
    if(TS){const mpx=parseFloat(metPx)||12;tissueGlyphs(M.glyphs,()=>true,(g,sz)=>({x:L.x+g.x,y:L.y+g.y,cx:L.x+g.x+sz*.3,cy:L.y+g.y+sz*.5}),g=>g.s<.35?6:mpx,g=>g.s<.35?2.6:.9,g=>(g.s<.35?.9:clamp((g.s-.35)*2))*alpha*dim)}
    else{inkDust(ctx,M.glyphs,g=>g.s<.35,.8,'rgb(255,244,214)',.85*alpha*dim,L.x,L.y);
    if(M.open>.01)inkText(ctx,M.glyphs,g=>g.s>=.35,'rgb(255,244,214)',g=>clamp((g.s-.35)*2)*alpha,g=>(g.bold?'600 ':'400 ')+metPx+' "SpriteSheet Mono", system-ui, sans-serif',L.x,L.y)}
  }
  canvas.dataset.wisdomState=labelCount?'visible':(lights.length?'contract-gap':'being');canvas.dataset.wisdomLines=String(lineCount);canvas.dataset.textBeing='true';canvas.dataset.innerPath=beingDescribe(state.inner);
  canvas.dataset.beingEdges=String(B.edges.length);canvas.dataset.beingFaces=String(B.faces.length);
  state.inkOverPanel=Boolean(state.inkPanel&&taken.some(b=>inkOverlap(b,[state.inkPanel])>1));
  canvas.dataset.inkOpen=String(taken.length);canvas.dataset.inkCollisions=String(taken.filter((b,i)=>inkOverlap(b,inkChrome(rect))>1||inkOverlap(b,taken.slice(i+1))>1).length);
  if(reading){ctx.restore();drawPaperLens(ctx,LZ,reading,rect,d)}
}
/* Organism names: the metabolite physiology one rank up. Before any selection every organism's own
 * identity (`id · title`) rests as a cluster of its letters on its body, so an organism too small to
 * see is still perceptible as its sleeping name; a peek unfolds the letters into the readable name and
 * leaving folds them back. The cluster is presence, not selection: entering still follows Descent. */
const NAME_FONT=typeFont(-1,500),NAME_LH=typePx(-1)*1.25,NAME_W=220;
function nameGlyphs(rec,L=null){
  if(state.namesFor!==state.records){state.names=new Map();state.namesFor=state.records}
  const fit=L?Math.max(60,Math.min(NAME_W,Math.round(L.r*1.3/10)*10)):0,N0=state.names,cacheKey=rec.id+'@'+fit;let G=N0.get(cacheKey);if(G)return G;
  const d=state.identities.get(rec.id),text=rec.id+' · '+String(d?.title||rec.title||'').trim();
  const lines=beingLines('name·'+rec.id,text,NAME_FONT,Array.from({length:4},(_,j)=>({x:0,y:j*NAME_LH,w:fit||NAME_W})));
  if(!lines.length)return null;
  const g=beingGlyphs(state.textCanvas.getContext('2d'),lines,NAME_FONT,rec.id.length),n=g.length,ga=Math.PI*(3-Math.sqrt(5)),R=4+Math.sqrt(n)*.55;
  g.forEach((q,j)=>{const r=Math.sqrt(j/Math.max(1,n))*R;q.ix=Math.cos(j*ga)*r;q.iy=Math.sin(j*ga)*r;q.x=q.ix;q.y=q.iy});
  G={id:rec.id,glyphs:g,open:0};N0.set(cacheKey,G);return G;
}
function drawNames(rect,now){
  const canvas=state.textCanvas,presence=1-backgroundPassage();
  if(presence<=.01||state.pretextStatus!=='ready'||!pretextModule){canvas.dataset.nameClusters='0';canvas.dataset.nameOpen='';return}
  const ctx=canvas.getContext('2d'),q=overviewOrientation(),here=state.chamberPath||'',dt=Math.min(.05,Math.max(0,(now-(state.nameLast||now))/1000));state.nameLast=now;
  const hov=state.hover&&!state.current&&!state.pointer?.moved?hitGlobal(state.hover.x,state.hover.y,rect.width,rect.height,now):'';
  if(!state.current)state.canvas.style.cursor=hov?'pointer':'';
  const sleep=[[],[]],taken=[];let count=0;
  const L=lensLocal(state.textCanvas.getBoundingClientRect()),contact=L?.lock?liveOverviewLensPart(L.lock.id):null,reading=contact?.point?paperLensReading(contact):null;
  if(contact?.point)paperLensReader(contact,reading);
  ctx.textBaseline='top';
  for(const rec of state.records){
    const p=projectPoint(overviewCenterFor(rec,rect.width,now),q,cameraZ(),rect.width,rect.height);
    if(p.x<-40||p.x>rect.width+40||p.y<-40||p.y>rect.height+40)continue;
    if(L&&!inLens(L,p.x,p.y,28)){
      const fit=Math.max(60,Math.min(NAME_W,Math.round(L.r*1.3/10)*10)),G=state.namesFor===state.records?state.names?.get(rec.id+'@'+fit):null;if(G)G.open=0;continue;
    }
    const G=nameGlyphs(rec,L);if(!G)continue;count++;
    const isOpen=rec.id===hov||contact?.key===rec.id;G.open=mix(G.open,isOpen?1:0,Math.min(1,dt*6));
    let ox=0,oy=0;const n=G.glyphs.length;
    if(L&&G.open>.02){const b=G.bounds||(G.bounds=inkBounds(G.glyphs,NAME_LH)),s=L.r*.72,w=b.x1-b.x0,h=b.y1-b.y0;
      const cx=Math.max(L.x-s+w/2,Math.min(L.x+s-w/2,p.x)),cy=Math.max(L.y-s+h/2,Math.min(L.y+s-h/2,p.y+12+h/2));
      ox=(w>2*s?L.x:cx)-p.x-(b.x0+b.x1)/2;oy=(h>2*s?L.y:cy)-p.y-(b.y0+b.y1)/2}
    else if(G.open>.02){const b=G.bounds||(G.bounds=inkBounds(G.glyphs,NAME_LH)),r=inkRing(G,p.x,p.y,[0,1],12,b,rect,taken);
      ox=Math.max(14-p.x-b.x0,Math.min(rect.width-14-p.x-b.x1,r.ox));oy=Math.max(80-p.y-b.y0,Math.min(rect.height-24-p.y-b.y1,r.oy));
      if(G.open>.15)taken.push({x:p.x+ox+b.x0,y:p.y+oy+b.y0,w:b.x1-b.x0,h:b.y1-b.y0})}else G.inkAt=null;
    G.glyphs.forEach((g,j)=>{const sw=clamp(G.open*1.6-(j/Math.max(1,n))*.6);
      beingSpring(g,(1-sw)*(g.ix+Math.sin(now/900+j)*.8)+sw*(ox+g.tx),(1-sw)*(g.iy+Math.cos(now/1000+j)*.8)+sw*(oy+g.ty));g.s=sw});
    sleep[rec.locus.startsWith(here)?0:1].push([G,p]);
    if(G.open>.01&&!(contact?.key===rec.id&&paperLensReady(L,reading))){if(L){ctx.save();ctx.beginPath();ctx.arc(L.x,L.y,Math.max(0,L.r-1),0,Math.PI*2);ctx.clip()}inkText(ctx,G.glyphs,g=>g.s>=.35,'rgb(226,244,235)',g=>clamp((g.s-.35)*2)*presence,g=>typeFont(-1,g.bold?600:400),p.x,p.y);if(L)ctx.restore()}
  }
  /* sleeping names are batched: one path per presence class, not one fill per organism */
  /* the drop bounds everything: sleeping letters and the opened bloom live only in the space it contains */
  if(L){ctx.save();ctx.beginPath();ctx.arc(L.x,L.y,Math.max(0,L.r-1),0,Math.PI*2);ctx.clip()}
  [[sleep[0],.42],[sleep[1],here?.12:.42]].forEach(([list,a])=>{if(!list.length||a*presence<=.004)return;ctx.beginPath();
    for(const [G,p] of list)for(const g of G.glyphs)if(g.s<.35)ctx.rect(p.x+g.x-.55,p.y+g.y-.55,1.1,1.1);
    ctx.globalAlpha=a*presence;ctx.fillStyle='rgb(206,240,224)';ctx.fill();ctx.globalAlpha=1});
  if(L)ctx.restore();
  canvas.dataset.lensGated=L?'1':'0';
  if(contact?.point&&paperLensReady(L,reading))drawPaperLens(ctx,L,contact,rect,canvas.width/rect.width);
  canvas.dataset.nameClusters=String(count);canvas.dataset.nameOpen=contact?.key||hov||'';
}
/* The realized chambers are the visible rank-1 Sierpiński body of Papers — the same container
 * grammar every Display site shows — not invisible packing bins: faint faces, clear edges, the
 * current container brighter, the rest receding; all of it steps back while an organism is open. */
function outerCells(width,alphaBase=CHAMBER_SHELL_ALPHA){
  const focus=inquiryFrameFocus(),scale=rootFieldScale(width)*focus.scale,active=state?.chamberPath||'',recede=1-.75*backgroundPassage();
  return GENES.map((g,i)=>{const p=PALETTE[g],k=active?(active.startsWith(g)?1.6:.45):1,alpha=alphaBase*k*recede;return {center:mul(sub(mul(state.renderer.V0[i],.5),focus.center),scale),scale:.5*scale,color:[...mix3(p,[.86,1,.93],.62),alpha]}});
}
/* A projected enclosing bound is a conservative witness for every descendant of the body.
 * A body behind/outside the camera is retained in source and simulation, but not expanded
 * into draw geometry until the witness can actually see it. */
function populationInView(center,scale,width,height,cameraZ,q){
  const p=qRot(q,center),z=cameraZ-p[2],span=scale*2;
  if(z+span<=0)return false; // Even the outer shell lies behind the witness.
  const near=z-span;if(near<=0)return true; // Touches the camera; refuse to over-cull.
  const focal=(height/2)/Math.tan(FOV/2),x=width/2+p[0]*focal/z,y=height/2-p[1]*focal/z;
  const radius=span*focal/near*(1+Math.max(Math.abs(p[0]),Math.abs(p[1]))/z)+128; // Ember/optical fringe.
  return x>=-radius&&x<=width+radius&&y>=-radius&&y<=height+radius;
}
/* Resolve background genealogy against its actual camera depth and the shared
 * near/far planes. Descendants outside that frustum stay in source truth and
 * simulation; they earn geometry again as soon as the witness reaches them. */
function collectVisibleBody(id,center,scale,width,height,cam,q,leaves,lights,depth=0){
  const p=qRot(q,center),z=cam-p[2],radius=scale*2,zoom=state.sharedFrame?.scale||1,fringe=Math.max(0,z)*42/((height/2)/Math.tan(FOV/2));
  if(z+radius+fringe<=.1/zoom||z-radius-fringe>=20/zoom||!populationInView(center,scale,width,height,cam,q))return;
  const distance=Math.max(.1/zoom,z),px=projectedPixels(scale,distance,height),entity=state.identities.get(id),parents=state.parents.get(id)||[];
  if(entity)lights.push(organismEmber(id,center,px,entity,depth===0));
  if(parents.length===4&&px>=LOD_PX){for(let i=0;i<4;i++)collectVisibleBody(parents[i],add(center,mul(state.renderer.V0[i],scale*.5)),scale*.5,width,height,cam,q,leaves,lights,depth+1);}
  else{const pal=PALETTE[entity?.gene||'x']||PALETTE.x;leaves.push({id,center,scale,color:[...pal,.11+Math.min(.30,px/150)]});}
}
function populationBodies(width,height,bodyFade=1,lightFade=bodyFade,now=performance.now(),cameraZ=FAR_Z){
  const leaves=[],lights=[],cull=Boolean(state.current)||inquiryFrameFocus().scale!==1||Boolean(state.sharedFrame?.scale!==undefined&&state.sharedFrame.scale!==1),q=overviewOrientation();let considered=0;
  for(const rec of state.records){
    if(rec.id===state.current?.id)continue;
    const {center,scale}=overviewBodyProjection(rec,{width,height},now);
    if(cull&&!populationInView(center,scale,width,height,cameraZ,q))continue;
    considered++;
    if(state.sharedFrame)collectVisibleBody(rec.id,center,scale,width,height,cameraZ,q,leaves,lights);
    else collectBody(rec.id,center,scale,cameraZ,height,leaves,lights);
  }
  for(const x of leaves)x.color[3]*=bodyFade;
  for(const x of lights)x.color[3]*=lightFade;
  return {leaves,lights,considered};
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
  setData(state.canvas,'chamberRequest',path||'overview');
  if(path&&!N.addressRecord(state.structure,path))return false;
  const field=Fields?.get(id);if(field){while(field.container&&!path.startsWith(field.container))field.ascend('papers:chamber');if(field.container!==path)field.descendTo(path,'papers:chamber');state.chamberPath=field.container;return true;}
  return false;
}
function ascendChamber(now=performance.now()){if(!state?.chamberPath)return false;return setChamber(state.chamberPath.slice(0,-1),now)}
function setLabel(id){const d=state.identities.get(id);state.label.textContent=`${id} · ${d?.title||id}`;state.label.classList.add('show')}
function openGlobal(id,width,now=performance.now()){
  const rec=state.recordById.get(id);if(!rec)return false;
  const locked=globalThis.SSSDisplayLens?.snapshot?.()?.lens?.lock?.id,bodyTarget='organism:papers|overview|'+encodeURIComponent(id);
  state.lensBodyId=locked===bodyTarget?bodyTarget:null;state.lensBodyOrganism=state.lensBodyId?id:null;
  const overviewWidth=Number(width)||state?.canvas?.getBoundingClientRect().width||innerWidth;
  const entryScale=overviewBodyProjection(rec,{width:overviewWidth,height:state.canvas.getBoundingClientRect().height},now).scale;
  const scale=rootBodyScaleFor(rec,overviewWidth);
  const sourceLocal=[...overviewCenterFor(rec,overviewWidth,now)],entryDepth=Math.max(1e-6,cameraZ()-qRot(overviewOrientation(),sourceLocal)[2]);
  state.stack=[];
  state.current={id,scale,entryScale,entryDepth,sourceLocal,entryWorld:null,cameraFrom:FAR_Z,cameraTo:cameraForScale(scale),globalSource:true};
  state.localQ=[...overviewOrientation()];state.transition=0;state.closing=false;state.transitionStart=now;setBackgroundPassage(1,now);setLabel(id);return true;
}
function descend(child,now=performance.now()){
  if(!state.current)return false;const hit=childBodies(state.current).find(x=>x.id===child);if(!hit)return false;
  const tour=state.tutorial;state.lensBodyId=null;state.lensBodyOrganism=null; // A parent body is not its child.
  state.stack.push({id:state.current.id,scale:state.current.scale,camera:state.current.cameraTo});
  const entryWorld=add(currentTranslation(),qRot(state.localQ,hit.center));
  state.current={id:child,scale:hit.scale,sourceLocal:null,entryWorld,cameraFrom:cameraZ(),cameraTo:cameraForScale(hit.scale),globalSource:false};
  state.transition=0;state.closing=false;state.transitionStart=now;state.inner=null;
  if(tour?.lease){const target=id+'|overview|'+encodeURIComponent(child);state.lensBodyId=target;state.lensBodyOrganism=child;ensureOverviewLensOffer(target);tour.pendingTarget=target;}
  setLabel(child);return true;
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
function cameraZ(){if(state?.sharedFrame)return FAR_Z/state.sharedFrame.scale;if(!state.current)return FAR_Z;return mix(state.current.cameraFrom,state.current.cameraTo,state.transition)}
function currentTranslation(){
  if(!state.current)return [0,0,0];
  const start=state.current.globalSource?qRot(overviewOrientation(),state.current.sourceLocal):state.current.entryWorld;
  return mix3(start,[0,0,0],state.transition);
}
function currentDisplayScale(cam){
  const c=state.current;if(!c)return 0;if(!c.globalSource||!c.entryDepth)return c.scale;
  // Keep the entered projection matched to its current camera depth, then
  // converge to the owner's real scale. Two independent clocks must not make
  // the very same body balloon over the whole viewport mid-transition.
  const depth=Math.max(1e-6,cam-currentTranslation()[2]),matched=c.entryScale*depth/c.entryDepth;
  return mix(matched,c.scale,state.transition);
}

function draw(now,frame){
  if(!state?.mounted||!frame)return;
  state.sharedFrame=frame.frame;state.chamberPath=frame.container;state.chamberFocus=frame.frame;
  if(!state.renderer||state.renderer.gl!==frame.gl){state.renderer?.dispose();state.renderer=frame.gl?createRenderer(state.canvas,frame.gl):createFlatRenderer(state.canvas);}
  if(!state.renderer)return;
  tutorialStep(now);updateTransition(now);updateBackgroundPassage(now);driftOrganisms(now);updateOverviewApproach(now);if(state.current&&state.beingTargetQ&&!state.pointer?.moved)state.localQ=beingSlerp(state.localQ,state.beingTargetQ,.075);
  const rect=state.canvas.getBoundingClientRect(),d=frame.dpr,cam=cameraZ(),overviewQ=overviewOrientation(),passage=backgroundPassage();
  state.readingChrome=inkChrome(rect);
  const proj=frame.proj,view=new Float32Array(frame.view);for(let col=0;col<3;col++)for(let row=0;row<4;row++)view[col*4+row]*=frame.frame.scale;
  /* Papers is an independent body floating inside Philosophy Inquiry-space.
   * A fixed local rest basis keeps the four truthful root chambers legible while
   * every later Display orientation change remains inherited as a shared rotation.
   * Inquiry passage is centripetal: the root/chamber world remains in its own frame
   * while the selected organism moves to center and the camera dives into its scale. */
  state.renderer.draw(outerCells(rect.width,CHAMBER_FACE_ALPHA),overviewQ,[0,0,0],proj,view,{faces:true});state.renderer.draw(outerCells(rect.width),overviewQ,[0,0,0],proj,view,{faces:false});
  const fade=!state.current?1:(state.stack.length?NESTED_BACKGROUND_ALPHA:mix(1,BACKGROUND_FIELD_ALPHA,passage)),starFade=!state.current?1:mix(1,BACKGROUND_STAR_ALPHA,passage),population=populationBodies(rect.width,rect.height,fade,starFade,now,cam);
  state.renderer.draw(population.leaves,overviewQ,[0,0,0],proj,view,{faces:true});
  state.renderer.drawLights(population.lights,overviewQ,[0,0,0],proj,view,now*.001,d,OVERVIEW_LIGHT_GAIN);
  let metaboliteCount=0,organismEmberCount=0,metabolights=[],translate=[0,0,0];
  if(state.current){
    const displayScale=currentDisplayScale(cam);
    const tree=[],embers=[];collectBody(state.current.id,[0,0,0],displayScale,cam,rect.height,tree,embers);for(const x of tree)x.color[3]*=.3+.7*state.transition;
    const structuralEmbers=embers.filter(x=>x.id!==state.current.id);for(const x of structuralEmbers)x.color[3]*=.18+.42*state.transition;
    translate=currentTranslation();state.renderer.draw(tree,state.localQ,translate,proj,view,{faces:true});
    state.renderer.draw([{center:[0,0,0],scale:displayScale,color:[.88,1,.92,state.being?.14:.82]}],state.localQ,translate,proj,view,{faces:false});
    state.renderer.drawLights(structuralEmbers,state.localQ,translate,proj,view,now*.001,d,INQUIRY_EMBER_GAIN);
    const entity=state.identities.get(state.current.id);metabolights=metaboliteRepel(entity.id,metaboliteField(entity,state.current,cam,rect.height,now),state.current.scale*METABOLITE_FIELD_SCALE,now);const recede=state.beingRecede||0,metOpen=state.inner?.kind==='met'||state.beingPeek?.kind==='met';for(const x of metabolights)x.color[3]*=state.transition*(metOpen?1:1-.85*recede);
    state.renderer.drawLights(metabolights,state.localQ,translate,proj,view,now*.001,d,METABOLITE_LIGHT_GAIN);
    metaboliteCount=metabolights.length;organismEmberCount=structuralEmbers.length;
    if(state.transition>.72){const kids=childBodies(state.current).map(k=>({...k,color:[.72,1,.85,.62]}));state.renderer.draw(kids,state.localQ,translate,proj,view,{faces:false})}
  }
  syncOverviewLens(rect,now);if(!state.current)state.overviewRender={rect,proj,view,q:overviewQ,cam,ms:now,dpr:d};
  drawWisdom(rect,cam,translate,metabolights,now);flushTissue(rect);drawNames(rect,now);updateOrganismInquiry();drawOverviewPhysiology(now);updateChamberLabels(rect.width,rect.height);
  const inquiryFocus=inquiryFrameFocus();
  state.canvas.dataset.sQuantumScale=String(S_QUANTUM_SCALE);state.canvas.dataset.backgroundFieldAlpha=String(fade);state.canvas.dataset.backgroundStarAlpha=String(starFade);state.canvas.dataset.backgroundPassage=String(passage);state.canvas.dataset.inquiryCameraZ=String(cam);state.canvas.dataset.rootFieldScale=String(rootFieldScale(rect.width));state.canvas.dataset.overviewSScale=String(overviewBodyScaleFor({rank:'S'},rect.width));state.canvas.dataset.rootSScale=String(rootBodyScaleFor({rank:'S'},rect.width));state.canvas.dataset.overviewWander=String(OVERVIEW_WANDER);state.canvas.dataset.overviewFlowPeriod=String(OVERVIEW_FLOW_PERIOD_MS);state.canvas.dataset.overviewBasisY=String(PAPERS_OVERVIEW_BASIS_Y);state.canvas.dataset.chamberPath=state.chamberPath||'overview';state.canvas.dataset.chamberScale=String(chamberFocus().scale);state.canvas.dataset.inquiryFrameScale=String(inquiryFocus.scale);state.canvas.dataset.inquiryFrameCenter=inquiryFocus.center.map(v=>v.toFixed(6)).join(',');state.canvas.dataset.metabolightCount=String(metaboliteCount);state.canvas.dataset.organismEmberCount=String(organismEmberCount);setData(state.canvas,'populationResolved',population.considered);
  if(state.current){const entity=state.identities.get(state.current.id),rank=rankNumber(entity?.rank);state.canvas.dataset.currentRank=String(rank);state.canvas.dataset.currentBodyScale=String(state.current.scale);setHud(`<span>INQUIRY${inquiryBody(entity?.id)?.state==='PARTIAL'?' · PUBLIC TISSUE PARTIAL':''}${state.inner?' · '+beingDescribe(state.inner):''}</span><b>${state.current.id}</b><small>hover peeks · touch opens · a vertex of a holon is its parent · empty space ascends</small>`)}
  else{delete state.canvas.dataset.currentRank;delete state.canvas.dataset.currentBodyScale;const locus=state.chamberPath?state.chamberPath+' · '+chamberLabel(state.chamberPath):'overview';setHud(`<span>PAPERS · ${locus}</span><b>${state.records.length} tetrahedral organisms</b><small>${state.backgroundDrag?'drag field · ':''}${state.chamberPath?'touch organism · empty space ascends':'touch a chamber to enter it'}</small>`)};
}

/* The lens is the instrument and the LOD: organisms' particle letters exist, and organisms can be peeked
 * or entered, only where Display's glass lens lies. Without a lens nothing is gated. */
let lensAccess=null;
function lensLocal(rect){const L=lensAccess?.();if(!L||!rect)return null;return {...L,x:L.x-(rect.left||0),y:L.y-(rect.top||0)}}
function inLens(L,x,y,pad=0){if(!L)return true;if(L.round===0&&Number.isFinite(L.hx)&&Number.isFinite(L.hy)){const r=Math.min(L.corner||0,L.hx,L.hy),dx=Math.max(0,Math.abs(x-L.x)-L.hx+r),dy=Math.max(0,Math.abs(y-L.y)-L.hy+r);return Math.hypot(dx,dy)<=r+pad}return Math.hypot(x-L.x,y-L.y)<=L.r+pad}
function hitGlobal(x,y,width,height,now=performance.now()){
  const L=lensLocal(state.canvas.getBoundingClientRect());if(!inLens(L,x,y))return '';
  // The drop's contact owns the meaning of a click inside it. An overlapping
  // neighbour may not steal that contact, and pending geometry is never hit.
  const contact=L?.lock?.kind==='body'?liveOverviewLensPart(L.lock.id):null;
  if(contact?.kind==='overview'&&contact.point&&state.recordById?.has(contact.key))return contact.key;
  if(L?.lock?.id?.startsWith(id+'|overview|'))return '';
  let best=null;const q=overviewOrientation();for(const rec of state.records){const {center,scale}=overviewBodyProjection(rec,{width,height},now),p=projectPoint(center,q,cameraZ(),width,height),px=projectedPixels(scale,cameraZ(),height),radius=clamp(px*.55,10,48),dist=Math.hypot(x-p.x,y-p.y);if(dist<radius&&(!best||dist<best.dist))best={id:rec.id,dist}}return best?.id||'';
}
function enterOverviewTarget(target,width,now=performance.now()){
  const rec=target?state.recordById.get(target):null,here=state.chamberPath||'';
  if(rec&&rec.locus===here)return openGlobal(target,width,now);
  if(rec&&rec.locus.startsWith(here))return setChamber(rec.locus.slice(0,here.length+1),now);
  return false;
}
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
  const canvas=state.canvas,on=(name,handler,options={})=>canvas.addEventListener(name,e=>{if(!state?.mounted)return;e.stopImmediatePropagation();handler(e)},{...options,capture:true});
  const reader=document.createElement('section');reader.className='papers-lens-reader';reader.setAttribute('aria-label','Papers lens reading');reader.hidden=true;
  reader.append(document.createElement('p'),document.createElement('small'));state.host.append(reader);state.lensReader=reader;
  on('wheel',e=>{const r=canvas.getBoundingClientRect(),L=lensLocal(r);if(!L?.lock||!livePaperLensPart(L.lock.id)||!inLens(L,e.clientX-r.left,e.clientY-r.top))return;if(e.deltaY){paperLensPage(e.deltaY>0?1:-1);e.preventDefault()}},{passive:false});
  addEventListener('keydown',e=>{if(!state?.mounted||e.altKey||e.ctrlKey||e.metaKey||e.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;const L=lensLocal(state.canvas.getBoundingClientRect());if(!L?.lock||!livePaperLensPart(L.lock.id))return;const delta={PageDown:1,PageUp:-1,Home:-Infinity,End:Infinity}[e.key];if(delta!==undefined){paperLensPage(delta);e.preventDefault()}});
  on('pointerdown',e=>{if(e.button!==0)return;if(state.tutorial)stopTutorial();state.pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};try{canvas.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault()});
  on('pointermove',e=>{{const r=canvas.getBoundingClientRect();state.hover={x:e.clientX-r.left,y:e.clientY-r.top}}const p=state.pointer;if(!p||p.id!==e.pointerId)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;if(Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>3)p.moved=true;if(p.moved){if(state.current){state.beingTargetQ=null;state.localQ=rotateQ(state.localQ,dx,dy)}else if(state.backgroundDrag)W.rotateBy(dx,dy,'papers:sierpinski');p.x=e.clientX;p.y=e.clientY}e.preventDefault()});
  const end=e=>{
    const p=state.pointer;if(!p||p.id!==e.pointerId)return;state.pointer=null;try{canvas.releasePointerCapture(e.pointerId)}catch(_){}
    if(!p.moved){
      const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
      if(state.current){const piece=beingHit(x,y),bodyLocked=state.lensBodyId&&globalThis.SSSDisplayLens?.snapshot?.()?.lens?.lock?.id===state.lensBodyId;if(piece){if(piece.kind==='vert'&&piece.door&&childBodies(state.current).some(c=>c.id===piece.door)&&(!bodyLocked||beingSame(piece,state.inner)))descend(piece.door);else if(!beingSame(piece,state.inner))lockInner(piece)}else if(state.inner)lockInner(null);else{const child=hitChild(x,y,r.width,r.height);if(child)descend(child);else closeOrAscend()}}
      else{const now=performance.now(),target=hitGlobal(x,y,r.width,r.height,now),here=state.chamberPath||'';
        /* Descent: only the current container's content can be entered; touching content that
         * lives deeper descends into the next container on its way first. */
        if(!enterOverviewTarget(target,r.width,now)){const chamber=hitChamber(x,y,r.width,r.height);if(chamber)setChamber(chamber,now);else if(here)ascendChamber(now);else dispatchEvent(new CustomEvent('sss:membrane-ascend',{detail:{id,source:'ascent:papers'}}))}}
    }
    e.preventDefault();
  };
  on('pointerup',end);on('pointerleave',()=>{state.hover=null});on('pointercancel',end);
}

function canEscape(){return !!state?.mounted&&!state.host?.hidden&&!!(state.tutorial||state.current||state.chamberPath)}
function escape(){
  if(!canEscape())return false;
  if(state.tutorial)stopTutorial();
  else if(state.current){if(!state.closing){if(state.inner)lockInner(null);else closeOrAscend()}}
  else ascendChamber();
  return true;
}

function initialize(host,projection,backgroundDrag=true,dependency=null){
  const stage=makeStage(host),fp=fieldProjection(projection),built=buildRecords(projection,fp.root),renderer=null;
  const identities=identityIndex(projection),parents=parentIndex(projection),recordById=new Map(built.records.map(x=>[x.id,x]));
  state={host,projection,dependency,structure:built.structure,canvas:stage.canvas,textCanvas:stage.textCanvas,tissueCanvas:stage.tissueCanvas,physiology:stage.physiology,tutorialButton:stage.tutorialButton,originButton:stage.originButton,sourceInfo:stage.sourceInfo,chamberLabels:stage.chamberLabels,chamberLabelNodes:stage.chamberLabelNodes,hud:stage.hud,label:stage.label,renderer,identities,parents,records:built.records,recordById,current:null,stack:[],localQ:[1,0,0,0],transition:0,transitionStart:0,closing:false,backgroundPassage:0,backgroundPassageFrom:null,backgroundPassageTo:null,backgroundPassageStart:0,chamberPath:'',chamberFocus:{center:[0,0,0],scale:1},pointer:null,mounted:true,backgroundDrag:backgroundDrag!==false,pretextStatus:pretextModule?'ready':'loading',wisdomPrepared:new Map(),inquiryBodies:{},shadowApplied:false,shadowHome:''};
  state.canvas.dataset.backgroundDrag=state.backgroundDrag?'true':'false';state.canvas.dataset.sQuantumScale=String(S_QUANTUM_SCALE);state.canvas.dataset.overviewWander=String(OVERVIEW_WANDER);state.canvas.dataset.overviewFlowPeriod=String(OVERVIEW_FLOW_PERIOD_MS);state.canvas.dataset.chamberPath='overview';state.canvas.dataset.shadowState='loading';state.textCanvas.dataset.pretextIdentity=PRETEXT_ID;state.textCanvas.dataset.pretextVersion=PRETEXT_VERSION;state.textCanvas.dataset.pretextStatus=state.pretextStatus;state.textCanvas.dataset.shadowState='loading';
  ensurePretext();hydrateShadow(host);attachInput();return state;
}

function render({host,content,projection,backgroundDrag=true,dependency=null,lens=null,ui=null}={}){
  lensAccess=typeof lens==='function'?lens:null;
  if(!host||!content||!projection?.groups||!projection?.phenotype||!N||!W)return false;
  host.hidden=false;content.replaceChildren();content.className='interlocutor-content papers-content';
  const shared=host.querySelector('.interlocutor-background');if(shared)shared.style.pointerEvents='auto';
  const labels=host.querySelector('.interlocutor-field-labels');if(labels)labels.style.display='none';
  if(!state||state.host!==host){if(!initialize(host,projection,backgroundDrag,dependency)){host.hidden=true;return false}}else{state.dependency=dependency;if(!state.shadowApplied)applyProjection(projection);state.backgroundDrag=backgroundDrag!==false;state.canvas.dataset.backgroundDrag=state.backgroundDrag?'true':'false';state.mounted=true;state.canvas.hidden=false;state.textCanvas.hidden=false;state.physiology.hidden=false;state.sourceInfo.hidden=false;state.chamberLabels.hidden=false;state.hud.hidden=false;state.label.hidden=false;hydrateShadow(host)}
  if(ui){state.ui=ui;ui.bind(state.hud,'hud');ui.bind(state.physiology,'physiology');ui.bind(state.label,'label');ui.bind(state.sourceInfo,'sourceInquiry')}
  return true;
}
function unmount({host,content}={}){if(state?.tutorial)stopTutorial();withdrawOverviewLens();withdrawPaperLens();if(state){state.mounted=false;state.canvas.hidden=true;state.textCanvas.hidden=true;state.physiology.hidden=true;state.originButton.hidden=true;state.sourceInfo.hidden=true;state.chamberLabels.hidden=true;state.hud.hidden=true;state.label.hidden=true}if(host)host.hidden=true;if(content)content.replaceChildren()}
function activateFieldPoint(){}

modules.set(id,Object.freeze({id,shader,render,unmount,fieldProjection,activateFieldPoint,canEscape,escape}));
})();
