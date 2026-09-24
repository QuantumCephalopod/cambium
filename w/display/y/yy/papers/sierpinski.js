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
const WISDOM_MAX_WIDTH=680;
const PHYSIOLOGY_PHASE_MS=5200;
const OVERVIEW_WANDER=.86;
const OVERVIEW_FLOW_PERIOD_MS=42000;
const OVERVIEW_LIGHT_GAIN=.46;
const INQUIRY_LIGHT_GAIN=.72;
const CHAMBER_OPEN_MS=760;
const CHAMBER_SHELL_ALPHA=.085;
const PAPERS_OVERVIEW_BASIS_Y=-.275;
const PHILOSOPHY_INQUIRY_REGION=3;
const PHYSIOLOGY_PHASES=Object.freeze([
  Object.freeze({id:'question',label:'QUESTION',copy:'The living body notices what it cannot yet answer.'}),
  Object.freeze({id:'prepare',label:'PREPARE',copy:'Arrived matter is checked and folded into a form Papers can digest.'}),
  Object.freeze({id:'metabolize',label:'METABOLIZE',copy:'One complete outside work closes into one living Source quantum.'}),
  Object.freeze({id:'grow',label:'GROW',copy:'Four living peers may close into one larger Holon. The parents remain alive.'})
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
  clear:[0,0,0,0],
  fallbackAlpha:0,
  state:Object.freeze({blend:true,depthTest:false,depthWrite:false}),
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
function overviewDriftPoint(entity,now=performance.now()){
  const points=[entity.motionA,entity.motionB,entity.motionC,entity.motionD].filter(Boolean);
  if(points.length<2)return entity.world;
  const phase=random01(entity.id,'flow-phase')*points.length,speed=mix(.72,1.28,random01(entity.id,'flow-speed'));
  const u=((now/OVERVIEW_FLOW_PERIOD_MS)*speed+phase)%points.length,index=Math.floor(u),t=smooth(u-index);
  const wander=mix3(points[index],points[(index+1)%points.length],t);
  return mix3(entity.world,wander,OVERVIEW_WANDER);
}
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
      records.push({...entity,world,motionA,motionB,motionC,motionD});
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
  state.wisdomPrepared=null;
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
  const gl=canvas.getContext('webgl2',{alpha:true,antialias:true,premultipliedAlpha:false});
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
  const gl=canvas.getContext('webgl2',{alpha:false,antialias:true,premultipliedAlpha:false});if(!gl)return null;
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
    const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.5),w=Math.max(1,Math.floor(r.width*d)),h=Math.max(1,Math.floor(r.height*d));
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
  physiology.innerHTML='<small>HOW PAPERS LIVES</small><canvas class="papers-physiology-canvas" aria-hidden="true"></canvas><div class="papers-physiology-phases"></div><div class="papers-physiology-copy"><b></b><span></span></div>';
  const physiologyPhases=physiology.querySelector('.papers-physiology-phases');
  for(const phase of PHYSIOLOGY_PHASES){const n=document.createElement('span');n.dataset.phase=phase.id;n.textContent=phase.label;physiologyPhases.append(n)}
  host.append(physiology);
  const physiologyCanvas=physiology.querySelector('.papers-physiology-canvas'),physiologyTitle=physiology.querySelector('.papers-physiology-copy b'),physiologyCopy=physiology.querySelector('.papers-physiology-copy span');
  const sourceInfo=document.createElement('section');sourceInfo.className='papers-source-inquiry';sourceInfo.setAttribute('aria-label','Selected Papers organism inquiry');
  sourceInfo.innerHTML='<div class="papers-source-original"><small class="papers-origin-label">ORIGIN</small><span class="papers-source-code"></span><h2></h2><p class="papers-source-credit"></p><div class="papers-source-links"></div></div><div class="papers-source-metabolism"><small>PAPERS ORGANISM</small><p class="papers-source-receipt"></p><small class="papers-source-inquiry-label">TETRAHEDRAL BODY</small><p class="papers-source-inquiry-state"></p></div>';
  host.append(sourceInfo);
  const chamberLabels=document.createElement('div');chamberLabels.className='papers-chamber-labels';chamberLabels.setAttribute('aria-hidden','true');host.append(chamberLabels);
  const chamberLabelNodes=new Map();
  for(const gene of GENES){const n=document.createElement('div');n.className='papers-chamber-label';n.dataset.gene=gene;chamberLabels.append(n);chamberLabelNodes.set(gene,n)}
  const hud=document.createElement('div');hud.className='papers-sierpinski-hud';host.append(hud);
  const label=document.createElement('div');label.className='papers-sierpinski-label';host.append(label);
  return {environmentCanvas,canvas,textCanvas,physiology,physiologyCanvas,physiologyPhases:[...physiologyPhases.children],physiologyTitle,physiologyCopy,sourceInfo,chamberLabels,chamberLabelNodes,hud,label};
}
function resizeCanvas(canvas){
  const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.6),w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));
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
  const visible=!state.current;box.dataset.visible=visible?'true':'false';box.setAttribute('aria-hidden',visible?'false':'true');
  if(!visible)return;
  const cycle=(now/PHYSIOLOGY_PHASE_MS)%PHYSIOLOGY_PHASES.length,index=Math.floor(cycle),phaseT=cycle-index,phase=PHYSIOLOGY_PHASES[index];
  if(box.dataset.phase!==phase.id){
    box.dataset.phase=phase.id;state.physiologyTitle.textContent=phase.label;state.physiologyCopy.textContent=phase.copy;
    state.physiologyPhases.forEach((n,i)=>n.dataset.active=i===index?'true':'false');
  }
  const {ctx,r}=resizePhysiologyCanvas(canvas),w=r.width,h=r.height,cx=w*.5,cy=h*.52,s=Math.min(w,h)*.22,t=smooth(phaseT);
  ctx.lineCap='round';ctx.lineJoin='round';
  if(phase.id==='question'){
    simplex2D(ctx,cx-s*.55,cy,s*.55,now*.00012,.32,.025);
    const travel=.5-.5*Math.cos(t*Math.PI*2),x=cx-s*.10+travel*s*1.22,y=cy-Math.sin(t*Math.PI)*s*.34;
    simplex2D(ctx,x,y,s*.16,-now*.0005,.72,.08);
    ctx.strokeStyle='rgba(173,235,205,.18)';ctx.beginPath();ctx.arc(cx-s*.55,cy,s*.80,-.48,.48);ctx.stroke();
  }else if(phase.id==='prepare'){
    const anchors=[[-.62,-.22],[.58,-.26],[-.45,.48],[.48,.46]];
    for(let i=0;i<8;i++){
      const a=i/8*Math.PI*2+now*.00035*(i%2?1:-1),orbit=s*(.64-.05*(i%3)),target=anchors[i%4];
      const ox=cx+Math.cos(a)*orbit,oy=cy+Math.sin(a)*orbit*.55,tx=cx+target[0]*s,ty=cy+target[1]*s;
      simplex2D(ctx,mix(ox,tx,t),mix(oy,ty,t),s*.10,a+t,.34+.42*t,.035+.04*t);
    }
  }else if(phase.id==='metabolize'){
    const anchors=[[0,-.68],[-.62,.42],[.62,.42],[0,.10]];
    for(let i=0;i<4;i++){const a=anchors[i];simplex2D(ctx,cx+a[0]*s,cy+a[1]*s,s*.12,now*.00025+i,.40,.035)}
    const edgeAlpha=.12+.55*t;simplex2D(ctx,cx,cy,s*.96,now*.00004,edgeAlpha,.025+.08*t);
    ctx.fillStyle=`rgba(224,255,211,${.08+.34*t})`;ctx.beginPath();ctx.arc(cx,cy,3+7*t,0,Math.PI*2);ctx.fill();
  }else{
    const anchors=[[0,-.58],[-.54,.34],[.54,.34],[0,.08]];
    for(let i=0;i<4;i++){const a=anchors[i],pulse=.96+.05*Math.sin(now*.0014+i);simplex2D(ctx,cx+a[0]*s,cy+a[1]*s,s*.20*pulse,now*.00010+i*.25,.42,.045)}
    simplex2D(ctx,cx,cy,s*1.18,now*.000035,.18+.54*t,.02+.055*t);
    ctx.fillStyle=`rgba(242,255,208,${.12+.55*t})`;ctx.shadowColor='rgba(220,255,185,.55)';ctx.shadowBlur=18;ctx.beginPath();ctx.arc(cx,cy,4+8*t,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  }
}

function projectedPixels(scale,cameraZ,height){return (scale/cameraZ)*(height/2)/Math.tan(FOV/2)*2}
function childBodies(current){
  const ps=state.parents.get(current.id)||[];if(ps.length!==4)return [];
  return ps.map((pid,i)=>({id:pid,center:mul(state.renderer.V0[i],current.scale*.5),scale:current.scale*.5}));
}
function inquiryBody(id){return state?.inquiryBodies?.[id]||null}
function inquiryVolumeText(entity){
  if(!entity)return '';
  const body=inquiryBody(entity.id),volume=body?.volume;
  return (volume&&typeof volume.text==='string'&&volume.text.trim())?volume.text.trim():(typeof entity.wisdom==='string'?entity.wisdom.trim():'');
}
function metabolight(id,center,px,entity,selected=false){
  const rank=rankNumber(entity?.rank),wisdom=Boolean(inquiryVolumeText(entity)),pal=PALETTE[entity?.gene]||PALETTE.x;
  const target=[1.0,.90,.64],blend=clamp(.40+rank*.035+(wisdom?.12:0),.40,.68),c=mix3(pal,target,blend);
  const size=clamp(7+rank*6+Math.sqrt(Math.max(px,0))*1.1+(wisdom?4:0)+(selected?5:0),7,62);
  const alpha=clamp(.24+rank*.075+(wisdom?.12:0)+(selected?.12:0),.24,.94);
  return {id,center,size,color:[...c,alpha],phase:random01(id,'metabolight')*Math.PI*2,kind:rank===0?'quantum':'metabolight',rank};
}
function collectBody(id,center,scale,cameraZ,height,leaves,lights,depth=0){
  const ps=state.parents.get(id)||[],px=projectedPixels(scale,cameraZ,height),entity=state.identities.get(id),gene=entity?.gene||'x',pal=PALETTE[gene]||PALETTE.x;
  if(entity)lights.push(metabolight(id,center,px,entity,depth===0));
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
function preparedWisdom(entity,text,font){
  if(!pretextModule||!entity||!text)return null;
  const key=`${entity.id}\u0000${font}\u0000${text}`;
  if(state.wisdomPrepared?.key!==key)state.wisdomPrepared={key,prepared:pretextModule.prepareWithSegments(text,font)};
  return state.wisdomPrepared.prepared;
}
function externalLabel(url,index){
  try{const u=new URL(url),host=u.hostname.replace(/^www\./,'');if(host==='doi.org')return 'DOI · ORIGINAL WORK';if(host==='arxiv.org')return 'ARXIV · ORIGINAL WORK';if(host==='github.com')return 'GITHUB · UPSTREAM';if(host.includes('pmlr.press'))return 'PMLR · ORIGINAL WORK';if(host.includes('w3.org'))return 'W3C · CANONICAL SOURCE';return host.toUpperCase()+' · ORIGINAL SOURCE'}catch(_){return 'ORIGINAL SOURCE '+(index+1)}
}
function organismInquiryReceipt(id){
  const body=inquiryBody(id);
  if(!body)return {projected:false,text:'Canonical tetrahedral body is not yet projected through the public membrane.'};
  const vertices=Array.isArray(body.vertices)?body.vertices.length:(body.vertices&&typeof body.vertices==='object'?Object.keys(body.vertices).length:0);
  const edges=Array.isArray(body.edges)?body.edges.length:0,faces=Array.isArray(body.faces)?body.faces.length:0,metabolites=Array.isArray(body.metabolites)?body.metabolites.length:0,volume=body.volume?1:0;
  return {projected:true,text:`${vertices}/4 vertices · ${edges}/6 edges · ${faces}/4 faces · ${volume}/1 volume · ${metabolites} metabolites`};
}
function updateOrganismInquiry(){
  const box=state.sourceInfo,entity=state.current?state.identities.get(state.current.id):null,visible=Boolean(entity),alpha=visible?smooth(clamp((state.transition-.38)/.38)):0;
  if(!box)return;
  box.dataset.visible=visible?'true':'false';box.style.setProperty('--source-open',alpha.toFixed(3));box.setAttribute('aria-hidden',visible?'false':'true');
  if(!visible)return;
  const source=entity.kind==='source',parents=state.parents.get(entity.id)||[],inquiry=organismInquiryReceipt(entity.id);
  const origin=source?'EXTERNAL ORIGIN':'COMPOSITION',originText=source?(entity.credit||'External provenance unresolved in the current public projection.'):`${entity.rank} · ${parents.length}/4 canonical parents${parents.length?': '+parents.join(' · '):''}`;
  const receipt=source?(entity.metabolism||'Canonical Papers metabolism receipt is not projected.'):`recursive tetrahedral composition · ${entity.rank} · ${parents.length}/4 parents`;
  const externals=Array.isArray(entity.externals)?entity.externals:[],key=[entity.id,entity.title,origin,originText,receipt,externals.join('|'),parents.join('|'),inquiry.projected,inquiry.text].join('\u0000');
  if(box.dataset.sourceKey===key)return;
  box.dataset.sourceKey=key;box.dataset.sourceId=entity.id;box.dataset.sourceInquiry=inquiry.projected?'projected':'gap';box.dataset.origin=source?'external':'composed';
  box.querySelector('.papers-origin-label').textContent=origin;
  box.querySelector('.papers-source-code').textContent=`${entity.id} · ${entity.rank} · ${entity.gene} · ${locusName(state.projection,entity.gene)}`;
  box.querySelector('h2').textContent=entity.title||entity.id;
  box.querySelector('.papers-source-credit').textContent=originText;
  box.querySelector('.papers-source-receipt').textContent=receipt;
  const links=box.querySelector('.papers-source-links');links.replaceChildren();
  if(source){
    externals.forEach((url,i)=>{const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=externalLabel(url,i);links.append(a)});
    if(!externals.length){const span=document.createElement('span');span.textContent='Canonical external origin not projected.';links.append(span)}
  }else{
    parents.forEach(id=>{const span=document.createElement('span');span.textContent=id;links.append(span)});
  }
  box.querySelector('.papers-source-inquiry-label').textContent=inquiry.projected?'TETRAHEDRAL BODY · PROJECTED':'TETRAHEDRAL BODY · PROJECTION GAP';
  box.querySelector('.papers-source-inquiry-state').textContent=inquiry.text;
}

function drawWisdom(rect,cam,translate,activeLight){
  const {ctx}=resizeWisdomCanvas(state.textCanvas,rect),canvas=state.textCanvas,entity=state.current?state.identities.get(state.current.id):null;
  canvas.dataset.pretextStatus=state.pretextStatus;canvas.dataset.wisdomLines='0';canvas.dataset.wisdomId=entity?.id||'';canvas.dataset.wisdomState='hidden';delete canvas.dataset.wisdomComplete;delete canvas.dataset.wisdomAnchorX;delete canvas.dataset.wisdomAnchorY;delete canvas.dataset.wisdomRadius;
  const volumeText=inquiryVolumeText(entity);
  if(!state.current||!volumeText){canvas.dataset.wisdomState=state.current?'projection-gap':'inactive';return}
  if(state.pretextStatus!=='ready'||!pretextModule){canvas.dataset.wisdomState=state.pretextStatus;return}
  const alpha=smooth(clamp((state.transition-.56)/.34));if(alpha<=.01){canvas.dataset.wisdomState='lod-hidden';return}
  const anchor=projectWorldPoint(translate,cam,rect.width,rect.height),font=wisdomFont(rect.width),lineHeight=wisdomLineHeight(rect.width),prepared=preparedWisdom(entity,volumeText,font);if(!prepared)return;
  const width=Math.min(WISDOM_MAX_WIDTH,Math.max(250,rect.width*(rect.width<700 ? .88 : .66))),half=width/2;
  const centerX=clamp(anchor.x,half+16,rect.width-half-16),x0=centerX-half,x1=centerX+half,radius=clamp((activeLight?.size||32)*.78+24,44,86),gap=14;
  const rows=rect.width<700?12:14,top=clamp(anchor.y-(rows*.5)*lineHeight,58,Math.max(58,rect.height-rows*lineHeight-28));
  let cursor={segmentIndex:0,graphemeIndex:0},lineCount=0,finished=false;
  ctx.font=font;ctx.textBaseline='middle';ctx.fillStyle=`rgba(239,246,235,${(.80*alpha).toFixed(3)})`;ctx.shadowColor=`rgba(223,255,208,${(.20*alpha).toFixed(3)})`;ctx.shadowBlur=10;
  outer: for(let row=0;row<rows;row++){
    const y=top+(row+.5)*lineHeight,dy=y-anchor.y,slots=[];
    if(Math.abs(dy)<radius){
      const dx=Math.sqrt(Math.max(0,radius*radius-dy*dy)),leftEnd=anchor.x-dx-gap,rightStart=anchor.x+dx+gap;
      if(leftEnd-x0>72)slots.push({x:x0,width:leftEnd-x0,align:'right'});
      if(x1-rightStart>72)slots.push({x:rightStart,width:x1-rightStart,align:'left'});
      if(!slots.length)continue;
    }else slots.push({x:x0,width:x1-x0,align:'center'});
    for(const slot of slots){
      const range=pretextModule.layoutNextLineRange(prepared,cursor,slot.width);if(range===null){finished=true;break outer}
      const line=pretextModule.materializeLineRange(prepared,range);let x=slot.x;if(slot.align==='right')x=slot.x+slot.width-line.width;else if(slot.align==='center')x=slot.x+(slot.width-line.width)/2;
      ctx.fillText(line.text,x,y);cursor=range.end;lineCount++;
    }
  }
  if(!finished&&pretextModule.layoutNextLineRange(prepared,cursor,width)===null)finished=true;
  canvas.dataset.wisdomState='visible';canvas.dataset.wisdomLines=String(lineCount);canvas.dataset.wisdomComplete=finished?'true':'false';
  canvas.dataset.wisdomAnchorX=anchor.x.toFixed(2);canvas.dataset.wisdomAnchorY=anchor.y.toFixed(2);canvas.dataset.wisdomRadius=radius.toFixed(2);
}
function outerCells(width){
  const focus=inquiryFrameFocus(),scale=rootFieldScale(width)*focus.scale,active=state?.chamberPath||'';
  return GENES.map((g,i)=>{const p=PALETTE[g],alpha=active&&active.startsWith(g)?CHAMBER_SHELL_ALPHA*1.8:CHAMBER_SHELL_ALPHA;return {center:mul(sub(mul(state.renderer.V0[i],.5),focus.center),scale),scale:.5*scale,color:[p[0]*.50,p[1]*.50,p[2]*.50,alpha]}});
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
    const p=projectOverviewPoint(cell.center,width,height),members=state.records.filter(r=>r.gene===gene),sources=members.filter(r=>r.kind==='source').length,holons=members.length-sources;
    node.innerHTML=`<b>${gene} · ${locusName(state.projection,gene)}</b><small>${sources}S · ${holons}H</small>`;
    const visible=p.x>-80&&p.x<width+80&&p.y>-50&&p.y<height+50;
    const baseOpacity=active?(active.startsWith(gene)?.92:.22):(p.z<-.15?.50:.78),passageOpacity=mix(1,.18,backgroundPassage());
    node.hidden=!visible;node.style.left=p.x+'px';node.style.top=p.y+'px';node.style.opacity=String(baseOpacity*passageOpacity);node.dataset.active=String(Boolean(active&&active.startsWith(gene)));
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
  updateChamberTransition(now);updateTransition(now);updateBackgroundPassage(now);state.environment?.draw(now);
  const {gl}=state.renderer,{rect,d,w,h}=resizeCanvas(state.canvas),cam=cameraZ(),overviewQ=overviewOrientation(),passage=backgroundPassage();
  const far=Math.max(12,cam+overviewTransformScale(rect.width)*2+2),proj=perspective(FOV,w/h,Math.max(.00008,cam*.015),far),view=lookAt([0,0,cam],[0,0,0],[0,1,0]);
  gl.viewport(0,0,w,h);gl.clearColor(.003,.006,.006,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  /* Papers is an independent body floating inside Philosophy Inquiry-space.
   * A fixed local rest basis keeps the four truthful root chambers legible while
   * every later Display orientation change remains inherited as a shared rotation.
   * Inquiry passage is centripetal: the root/chamber world remains in its own frame
   * while the selected organism moves to center and the camera dives into its scale. */
  state.renderer.draw(outerCells(rect.width),overviewQ,[0,0,0],proj,view,{faces:false});
  const fade=!state.current?1:(state.stack.length?NESTED_BACKGROUND_ALPHA:mix(1,BACKGROUND_FIELD_ALPHA,passage)),starFade=!state.current?1:mix(1,BACKGROUND_STAR_ALPHA,passage),population=populationBodies(rect.width,rect.height,fade,starFade,now);
  state.renderer.draw(population.leaves,overviewQ,[0,0,0],proj,view,{faces:true});
  state.renderer.drawLights(population.lights,overviewQ,[0,0,0],proj,view,now*.001,d,OVERVIEW_LIGHT_GAIN);
  let lightCount=0,quantumCount=0,activeLight=null,translate=[0,0,0];
  if(state.current){
    const tree=[],lights=[];collectBody(state.current.id,[0,0,0],state.current.scale,cam,rect.height,tree,lights);for(const x of tree)x.color[3]*=.3+.7*state.transition;for(const x of lights)x.color[3]*=.25+.75*state.transition;
    translate=currentTranslation();state.renderer.draw(tree,state.localQ,translate,proj,view,{faces:true});
    state.renderer.draw([{center:[0,0,0],scale:state.current.scale,color:[.88,1,.92,.82]}],state.localQ,translate,proj,view,{faces:false});
    state.renderer.drawLights(lights,state.localQ,translate,proj,view,now*.001,d,INQUIRY_LIGHT_GAIN);
    lightCount=lights.filter(x=>x.kind==='metabolight').length;quantumCount=lights.filter(x=>x.kind==='quantum').length;activeLight=lights.find(x=>x.id===state.current.id)||null;
    if(state.transition>.72){const kids=childBodies(state.current).map(k=>({...k,color:[.72,1,.85,.62]}));state.renderer.draw(kids,state.localQ,translate,proj,view,{faces:false})}
  }
  drawWisdom(rect,cam,translate,activeLight);updateOrganismInquiry();drawOverviewPhysiology(now);updateChamberLabels(rect.width,rect.height);
  const inquiryFocus=inquiryFrameFocus();
  state.canvas.dataset.sQuantumScale=String(S_QUANTUM_SCALE);state.canvas.dataset.backgroundFieldAlpha=String(fade);state.canvas.dataset.backgroundStarAlpha=String(starFade);state.canvas.dataset.backgroundPassage=String(passage);state.canvas.dataset.inquiryCameraZ=String(cam);state.canvas.dataset.rootFieldScale=String(rootFieldScale(rect.width));state.canvas.dataset.overviewSScale=String(overviewBodyScaleFor({rank:'S'},rect.width));state.canvas.dataset.rootSScale=String(rootBodyScaleFor({rank:'S'},rect.width));state.canvas.dataset.overviewWander=String(OVERVIEW_WANDER);state.canvas.dataset.overviewFlowPeriod=String(OVERVIEW_FLOW_PERIOD_MS);state.canvas.dataset.overviewBasisY=String(PAPERS_OVERVIEW_BASIS_Y);state.canvas.dataset.chamberPath=state.chamberPath||'overview';state.canvas.dataset.chamberScale=String(chamberFocus().scale);state.canvas.dataset.inquiryFrameScale=String(inquiryFocus.scale);state.canvas.dataset.inquiryFrameCenter=inquiryFocus.center.map(v=>v.toFixed(6)).join(',');state.canvas.dataset.metabolightCount=String(lightCount);state.canvas.dataset.quantumEmberCount=String(quantumCount);
  if(state.current){const entity=state.identities.get(state.current.id),rank=rankNumber(entity?.rank),quanta=Math.pow(4,rank);state.canvas.dataset.currentRank=String(rank);state.canvas.dataset.currentBodyScale=String(state.current.scale);state.hud.innerHTML=`<span>INQUIRY</span><b>${state.current.id}</b><small>${quanta} S quantum${quanta===1?'':'a'} · metabolight · drag body · touch parent · empty space ascends</small>`}
  else{delete state.canvas.dataset.currentRank;delete state.canvas.dataset.currentBodyScale;const locus=state.chamberPath?state.chamberPath+' · '+chamberLabel(state.chamberPath):'overview';state.hud.innerHTML=`<span>PAPERS · ${locus}</span><b>${state.records.length} tetrahedral organisms</b><small>${state.backgroundDrag?'drag field · ':''}touch organism · touch chamber${state.chamberPath?' · empty space ascends':''}</small>`};
  state.raf=requestAnimationFrame(draw);
}

function hitGlobal(x,y,width,height,now=performance.now()){let best=null;const q=overviewOrientation();for(const rec of state.records){const p=projectPoint(overviewCenterFor(rec,width,now),q,FAR_Z,width,height),px=projectedPixels(overviewBodyScaleFor(rec,width),FAR_Z,height),radius=clamp(px*.55,10,48),dist=Math.hypot(x-p.x,y-p.y);if(dist<radius&&(!best||dist<best.dist))best={id:rec.id,dist}}return best?.id||''}
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
  canvas.addEventListener('pointermove',e=>{const p=state.pointer;if(!p||p.id!==e.pointerId)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;if(Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>3)p.moved=true;if(p.moved){if(state.current)state.localQ=rotateQ(state.localQ,dx,dy);else if(state.backgroundDrag)W.rotateBy(dx,dy,'papers:sierpinski');p.x=e.clientX;p.y=e.clientY}e.preventDefault()});
  const end=e=>{
    const p=state.pointer;if(!p||p.id!==e.pointerId)return;state.pointer=null;try{canvas.releasePointerCapture(e.pointerId)}catch(_){}
    if(!p.moved){
      const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
      if(state.current){const child=hitChild(x,y,r.width,r.height);if(child)descend(child);else closeOrAscend()}
      else{const now=performance.now(),target=hitGlobal(x,y,r.width,r.height,now);if(target)openGlobal(target,r.width,now);else{const chamber=hitChamber(x,y,r.width,r.height);if(chamber)setChamber(chamber,now);else if(state.chamberPath)ascendChamber(now)}}
    }
    e.preventDefault();
  };
  canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
  addEventListener('keydown',e=>{if(e.key!=='Escape'||!state)return;if(state.current){e.preventDefault();closeOrAscend()}else if(state.chamberPath){e.preventDefault();ascendChamber()}});
}

function initialize(host,projection,backgroundDrag=true,dependency=null){
  const stage=makeStage(host),fp=fieldProjection(projection),built=buildRecords(projection,fp.root),renderer=createRenderer(stage.canvas);if(!renderer)return null;
  const identities=identityIndex(projection),parents=parentIndex(projection),recordById=new Map(built.records.map(x=>[x.id,x])),environment=createInquiryEnvironment(stage.environmentCanvas);
  state={host,projection,dependency,structure:built.structure,environmentCanvas:stage.environmentCanvas,environment,canvas:stage.canvas,textCanvas:stage.textCanvas,physiology:stage.physiology,physiologyCanvas:stage.physiologyCanvas,physiologyPhases:stage.physiologyPhases,physiologyTitle:stage.physiologyTitle,physiologyCopy:stage.physiologyCopy,sourceInfo:stage.sourceInfo,chamberLabels:stage.chamberLabels,chamberLabelNodes:stage.chamberLabelNodes,hud:stage.hud,label:stage.label,renderer,identities,parents,records:built.records,recordById,current:null,stack:[],localQ:[1,0,0,0],transition:0,transitionStart:0,closing:false,backgroundPassage:0,backgroundPassageFrom:null,backgroundPassageTo:null,backgroundPassageStart:0,chamberPath:'',chamberFocus:{center:[0,0,0],scale:1},chamberFrom:null,chamberTo:null,chamberTransitionStart:0,pointer:null,mounted:true,raf:0,backgroundDrag:backgroundDrag!==false,pretextStatus:pretextModule?'ready':'loading',wisdomPrepared:null,inquiryBodies:{},shadowApplied:false,shadowHome:''};
  state.canvas.dataset.backgroundDrag=state.backgroundDrag?'true':'false';state.canvas.dataset.sQuantumScale=String(S_QUANTUM_SCALE);state.canvas.dataset.overviewWander=String(OVERVIEW_WANDER);state.canvas.dataset.overviewFlowPeriod=String(OVERVIEW_FLOW_PERIOD_MS);state.canvas.dataset.chamberPath='overview';state.canvas.dataset.shadowState='loading';state.textCanvas.dataset.pretextIdentity=PRETEXT_ID;state.textCanvas.dataset.pretextVersion=PRETEXT_VERSION;state.textCanvas.dataset.pretextStatus=state.pretextStatus;state.textCanvas.dataset.shadowState='loading';
  ensurePretext();hydrateShadow(host);attachInput();state.raf=requestAnimationFrame(draw);return state;
}

function render({host,content,projection,backgroundDrag=true,dependency=null}={}){
  if(!host||!content||!projection?.groups||!projection?.phenotype||!N||!W)return false;
  host.hidden=false;content.replaceChildren();content.className='interlocutor-content papers-content';
  const shared=host.querySelector('.interlocutor-background');if(shared){shared.style.opacity='0';shared.style.pointerEvents='none'}
  const labels=host.querySelector('.interlocutor-field-labels');if(labels)labels.style.display='none';
  if(!state||state.host!==host)initialize(host,projection,backgroundDrag,dependency);else{state.dependency=dependency;if(!state.shadowApplied)applyProjection(projection);state.backgroundDrag=backgroundDrag!==false;state.canvas.dataset.backgroundDrag=state.backgroundDrag?'true':'false';state.mounted=true;state.environmentCanvas.hidden=false;state.canvas.hidden=false;state.textCanvas.hidden=false;state.physiology.hidden=false;state.sourceInfo.hidden=false;state.chamberLabels.hidden=false;state.hud.hidden=false;state.label.hidden=false;hydrateShadow(host)}
  return true;
}
function unmount({host,content}={}){if(state){state.mounted=false;state.environmentCanvas.hidden=true;state.canvas.hidden=true;state.textCanvas.hidden=true;state.physiology.hidden=true;state.sourceInfo.hidden=true;state.chamberLabels.hidden=true;state.hud.hidden=true;state.label.hidden=true}if(host)host.hidden=true;if(content)content.replaceChildren()}
function activateFieldPoint(){}

modules.set(id,Object.freeze({id,shader,render,unmount,fieldProjection,activateFieldPoint}));
})();
