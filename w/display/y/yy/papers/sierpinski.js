(() => {
'use strict';

const id='organism:papers';
const modules=globalThis.SSSInterlocutorModules||(globalThis.SSSInterlocutorModules=new Map());
const N=globalThis.SSSDisplayNavigation||null;
const W=globalThis.SSSWorldView||null;
const GENES=['w','x','z','y'];
const DNA={w:'CREATE',x:'COPY',z:'CONTROL',y:'CULTIVATE'};
const GENE_INDEX={w:0,x:1,z:2,y:3};
const PALETTE={
  w:[.34,.78,.64],
  x:[.42,.82,.88],
  z:[.78,.78,.60],
  y:[.52,.93,.48]
};

/*
 * Papers render law:
 * - every organism is always one canonical tetrahedral body;
 * - distance may collapse it perceptually to a particle, never ontologically;
 * - an nH Holon recursively contains exactly four parent bodies;
 * - selection moves that existing body to the global centroid while the camera
 *   dollies inward; no replacement/detail model is spawned;
 * - recursive detail is resolved only while it is large enough on screen.
 */

const NODE_SCALE=.032;
const FAR_Z=3.2;
const MACRO_Z=.105;
const FOV=Math.PI/3.3;
const LOD_PX=7;
const OPEN_MS=900;
const MAX_DEPTH=8;
const FACE=[[0,2,1],[0,1,3],[0,3,2],[1,2,3]];
const EDGE=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];

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

function clamp(x,a=0,b=1){return Math.max(a,Math.min(b,x))}
function mix(a,b,t){return a+(b-a)*t}
function mix3(a,b,t){return a.map((v,i)=>mix(v,b[i],t))}
function smooth(t){t=clamp(t);return t*t*(3.-2.*t)}
function add(a,b){return a.map((v,i)=>v+b[i])}
function mul(a,s){return a.map(v=>v*s)}
function centroid(tet){return tet.reduce((s,p)=>add(s,p),[0,0,0]).map(v=>v/4)}
function hash32(text){let h=2166136261>>>0;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)>>>0}h^=h>>>16;h=Math.imul(h,0x7feb352d)>>>0;h^=h>>>15;h=Math.imul(h,0x846ca68b)>>>0;h^=h>>>16;return h>>>0}
function random01(text,salt){return (hash32(text+'·'+salt)+1)/4294967297}
function qMul(a,b){const[w,x,y,z]=a,[v,i,j,k]=b;return [w*v-x*i-y*j-z*k,w*i+x*v+y*k-z*j,w*j-x*k+y*v+z*i,w*k+x*j-y*i+z*v]}
function qNorm(q){const m=Math.hypot(...q)||1;return q.map(v=>v/m)}
function qRot(q,p){const r=qMul(qMul(q,[0,...p]),[q[0],-q[1],-q[2],-q[3]]);return r.slice(1)}
function qAxis(axis,angle){const s=Math.sin(angle/2);return [Math.cos(angle/2),axis[0]*s,axis[1]*s,axis[2]*s]}
function rotateQ(q,dx,dy){return qNorm(qMul(qAxis([0,1,0],dx*.006),qMul(qAxis([1,0,0],dy*.006),q)))}

function locusName(projection,gene){return projection?.phenotype?.[gene]||gene}
function rankOf(value){const m=String(value||'').match(/^(\d+)H\./);return m?`${m[1]}H`:'S'}
function fieldProjection(d){
  const children={};
  for(const g of GENES){
    const sources=Array.isArray(d?.groups?.[g])?d.groups[g].length:0;
    const holons=Array.isArray(d?.holons?.[g])?d.holons[g].length:0;
    const noun=locusName(d,g);
    children[g]={noun,de:noun,en:noun,gene:DNA[g],one:{de:`${sources} Quellen · ${holons} Holons.`,en:`${sources} sources · ${holons} holons.`},children:{}};
  }
  /* Generic Display still receives the truthful four-locus body, but Papers owns
   * its specimen rendering. Empty points prevent the shared POINTS program from
   * creating a competing particle ontology. */
  return {source:{organism:'papers',home:d?.event_id||'papers'},root:{noun:'Papers',children},occupancy:{w:[],x:[],z:[],y:[]},points:[]};
}

function identityIndex(projection){
  const out=new Map();
  for(const g of GENES){
    for(const x of projection?.groups?.[g]||[])out.set(x.id,{id:x.id,title:x.title,gene:g,kind:'source',rank:'S'});
    for(const x of projection?.holons?.[g]||[])out.set(x.id,{id:x.id,title:x.title,gene:g,kind:'holon',rank:rankOf(x.id)});
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

function pointInTet(tet,spec){
  let weights=[0,1,2,3].map(i=>-Math.log(Math.max(1e-7,random01(spec.id,i))));
  const s=weights.reduce((a,b)=>a+b,0);weights=weights.map(v=>v/s);
  const inset=.28;weights=weights.map(v=>(1-inset)*v+inset*.25);
  return [0,1,2].map(k=>weights.reduce((sum,w,i)=>sum+w*tet[i][k],0));
}
function buildRecords(projection,fieldRoot){
  if(!N)return [];
  const structure=N.collectStructure(fieldRoot),byGene=new Map();
  for(const g of GENES){
    const cell=structure.leaves.find(c=>c.path===g)||structure.leaves.find(c=>c.path?.startsWith(g));
    if(cell)byGene.set(g,cell);
  }
  const ids=identityIndex(projection),records=[];
  for(const entity of ids.values()){
    const cell=byGene.get(entity.gene);if(!cell)continue;
    records.push({...entity,world:pointInTet(cell.tet,entity)});
  }
  return {records,structure};
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
  const p=program(gl,VS,FS);
  const loc={
    pos:gl.getAttribLocation(p,'aPos'),center:gl.getAttribLocation(p,'iCenter'),scale:gl.getAttribLocation(p,'iScale'),color:gl.getAttribLocation(p,'iColor'),
    proj:gl.getUniformLocation(p,'uProj'),view:gl.getUniformLocation(p,'uView'),quat:gl.getUniformLocation(p,'uQuat'),translate:gl.getUniformLocation(p,'uTranslate')
  };
  const triangles=[];for(const f of FACE)for(const i of f)triangles.push(...V0[i]);
  const lines=[];for(const e of EDGE)lines.push(...V0[e[0]],...V0[e[1]]);
  const instanceBuffer=gl.createBuffer();
  function geom(data){const vao=gl.createVertexArray();gl.bindVertexArray(vao);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);gl.enableVertexAttribArray(loc.pos);gl.vertexAttribPointer(loc.pos,3,gl.FLOAT,false,12,0);return {vao,count:data.length/3}}
  const tri=geom(triangles),line=geom(lines);
  function flatten(instances){const out=[];for(const x of instances)out.push(x.center[0],x.center[1],x.center[2],x.scale,x.color[0],x.color[1],x.color[2],x.color[3]);return out}
  function bindInstances(geometry,data){
    gl.bindVertexArray(geometry.vao);gl.bindBuffer(gl.ARRAY_BUFFER,instanceBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);
    const stride=32;gl.enableVertexAttribArray(loc.center);gl.vertexAttribPointer(loc.center,3,gl.FLOAT,false,stride,0);gl.vertexAttribDivisor(loc.center,1);
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
  return {gl,V0,draw};
}

function makeStage(host){
  const canvas=document.createElement('canvas');canvas.className='papers-sierpinski-stage';canvas.setAttribute('aria-label','Papers recursive tetrahedral inquiry field');host.append(canvas);
  const hud=document.createElement('div');hud.className='papers-sierpinski-hud';host.append(hud);
  const label=document.createElement('div');label.className='papers-sierpinski-label';host.append(label);
  return {canvas,hud,label};
}

function resizeCanvas(canvas){
  const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.6),w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
  return {rect:r,d,w,h};
}
function projectedPixels(scale,cameraZ,height){return (scale/cameraZ)*(height/2)/Math.tan(FOV/2)*2}

function childBodies(current){
  const ps=state.parents.get(current.id)||[];
  if(ps.length!==4)return [];
  return ps.map((pid,i)=>({id:pid,center:mul(state.renderer.V0[i],current.scale*.5),scale:current.scale*.5}));
}
function collectLeaves(id,center,scale,cameraZ,height,out,depth=0){
  const ps=state.parents.get(id)||[],px=projectedPixels(scale,cameraZ,height),entity=state.identities.get(id),gene=entity?.gene||'x',pal=PALETTE[gene]||PALETTE.x;
  if(ps.length!==4||px<LOD_PX||depth>=MAX_DEPTH){out.push({id,center,scale,color:[pal[0],pal[1],pal[2],.11+Math.min(.30,px/150)]});return}
  for(let i=0;i<4;i++)collectLeaves(ps[i],add(center,mul(state.renderer.V0[i],scale*.5)),scale*.5,cameraZ,height,out,depth+1);
}
function projectPoint(p,q,cameraZ,width,height){const r=qRot(q,p),z=cameraZ-r[2],f=(height/2)/Math.tan(FOV/2);return {x:width/2+r[0]*f/z,y:height/2-r[1]*f/z,z:r[2]}}

function outerCells(){
  return GENES.map((g,i)=>{const p=PALETTE[g];return {center:mul(state.renderer.V0[i],.5),scale:.5,color:[p[0]*.45,p[1]*.45,p[2]*.45,.045]}});
}
function populationInstances(fade=1){
  const out=[];for(const rec of state.records){if(rec.id===state.current?.id)continue;const p=PALETTE[rec.gene]||PALETTE.x;out.push({center:rec.world,scale:NODE_SCALE,color:[p[0],p[1],p[2],(.12+(rec.kind==='holon'?.055:0))*fade]})}return out;
}

function openGlobal(id,now=performance.now()){
  const rec=state.recordById.get(id);if(!rec)return false;
  state.stack=[];state.current={id,scale:NODE_SCALE,start:[...rec.world],cameraFrom:FAR_Z,cameraTo:MACRO_Z};state.localQ=[...W.orientation];state.transition=0;state.closing=false;state.transitionStart=now;state.label.textContent=`${id} · ${rec.title}`;state.label.classList.add('show');return true;
}
function descend(child,now=performance.now()){
  if(!state.current)return false;const kids=childBodies(state.current),hit=kids.find(x=>x.id===child);if(!hit)return false;
  state.stack.push({id:state.current.id,scale:state.current.scale,camera:state.current.cameraTo});
  state.current={id:child,scale:hit.scale,start:qRot(state.localQ,hit.center),cameraFrom:state.stack.at(-1).camera,cameraTo:state.stack.at(-1).camera*.5};
  state.transition=0;state.closing=false;state.transitionStart=now;const d=state.identities.get(child);state.label.textContent=`${child} · ${d?.title||child}`;return true;
}
function closeGlobal(now=performance.now()){
  if(!state.current)return;state.closing=true;state.transitionStart=now;
}
function updateTransition(now){
  if(!state.current)return;const t=smooth(clamp((now-state.transitionStart)/OPEN_MS));state.transition=state.closing?1-t:t;
  if(state.closing&&t>=1){state.current=null;state.stack=[];state.transition=0;state.closing=false;state.label.classList.remove('show')}
}
function cameraZ(){if(!state.current)return FAR_Z;return mix(state.current.cameraFrom,state.current.cameraTo,state.transition)}
function currentTranslation(){if(!state.current)return [0,0,0];return mix3(state.current.start,[0,0,0],state.transition)}

function draw(now){
  if(!state||!state.mounted){if(state)state.raf=requestAnimationFrame(draw);return}
  updateTransition(now);const {gl}=state.renderer,{rect,d,w,h}=resizeCanvas(state.canvas),cam=cameraZ(),proj=perspective(FOV,w/h,Math.max(.0008,cam*.015),12),view=lookAt([0,0,cam],[0,0,0],[0,1,0]);
  gl.viewport(0,0,w,h);gl.clearColor(.003,.006,.006,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  state.renderer.draw(outerCells(),W.orientation,[0,0,0],proj,view,{faces:true});
  const fade=state.current?Math.pow(1-state.transition,2):1;state.renderer.draw(populationInstances(fade),W.orientation,[0,0,0],proj,view,{faces:true});
  if(state.current){
    const tree=[];collectLeaves(state.current.id,[0,0,0],state.current.scale,cam,rect.height,tree);for(const x of tree)x.color[3]*=.3+.7*state.transition;
    const translate=currentTranslation();state.renderer.draw(tree,state.localQ,translate,proj,view,{faces:true});
    state.renderer.draw([{center:[0,0,0],scale:state.current.scale,color:[.88,1,.92,.82]}],state.localQ,translate,proj,view,{faces:false});
    if(state.transition>.72){const kids=childBodies(state.current).map(k=>({...k,color:[.72,1,.85,.62]}));state.renderer.draw(kids,state.localQ,translate,proj,view,{faces:false})}
  }
  state.hud.innerHTML=state.current?`<span>INQUIRY</span><b>${state.current.id}</b><small>drag body · touch parent · empty space returns</small>`:`<span>PAPERS</span><b>${state.records.length} tetrahedral organisms</b><small>drag field · touch an organism</small>`;
  state.raf=requestAnimationFrame(draw);
}

function hitGlobal(x,y,width,height){let best=null;for(const rec of state.records){const p=projectPoint(rec.world,W.orientation,FAR_Z,width,height),dist=Math.hypot(x-p.x,y-p.y);if(dist<15&&(!best||dist<best.dist))best={id:rec.id,dist}}return best?.id||''}
function hitChild(x,y,width,height){if(!state.current||state.transition<.82)return '';const cam=cameraZ(),translate=currentTranslation();let best=null;for(const child of childBodies(state.current)){const p=projectPoint(add(child.center,qRot([state.localQ[0],-state.localQ[1],-state.localQ[2],-state.localQ[3]],translate)),state.localQ,cam,width,height),dist=Math.hypot(x-p.x,y-p.y);if(dist<34&&(!best||dist<best.dist))best={id:child.id,dist}}return best?.id||''}

function attachInput(){
  const canvas=state.canvas;
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;state.pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};try{canvas.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault()});
  canvas.addEventListener('pointermove',e=>{const p=state.pointer;if(!p||p.id!==e.pointerId)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;if(Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>3)p.moved=true;if(p.moved){if(state.current)state.localQ=rotateQ(state.localQ,dx,dy);else W.rotateBy(dx,dy,'papers:sierpinski');p.x=e.clientX;p.y=e.clientY}e.preventDefault()});
  const end=e=>{const p=state.pointer;if(!p||p.id!==e.pointerId)return;state.pointer=null;try{canvas.releasePointerCapture(e.pointerId)}catch(_){}if(!p.moved){const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;if(state.current){const child=hitChild(x,y,r.width,r.height);if(child)descend(child);else closeGlobal()}else{const target=hitGlobal(x,y,r.width,r.height);if(target)openGlobal(target)}}e.preventDefault()};
  canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
  addEventListener('keydown',e=>{if(e.key==='Escape'&&state?.current){e.preventDefault();closeGlobal()}});
}

function initialize(host,projection){
  const stage=makeStage(host),fp=fieldProjection(projection),built=buildRecords(projection,fp.root),renderer=createRenderer(stage.canvas);if(!renderer)return null;
  const identities=identityIndex(projection),parents=parentIndex(projection),recordById=new Map(built.records.map(x=>[x.id,x]));
  state={host,projection,canvas:stage.canvas,hud:stage.hud,label:stage.label,renderer,identities,parents,records:built.records,recordById,current:null,stack:[],localQ:[1,0,0,0],transition:0,transitionStart:0,closing:false,pointer:null,mounted:true,raf:0};
  attachInput();state.raf=requestAnimationFrame(draw);return state;
}

function render({host,content,projection}={}){
  if(!host||!content||!projection?.groups||!projection?.phenotype||!N||!W)return false;
  host.hidden=false;content.replaceChildren();content.className='interlocutor-content papers-content';
  const shared=host.querySelector('.interlocutor-background');if(shared){shared.style.opacity='0';shared.style.pointerEvents='none'}
  const labels=host.querySelector('.interlocutor-field-labels');if(labels)labels.style.display='none';
  if(!state||state.host!==host)initialize(host,projection);else{state.projection=projection;state.mounted=true;state.canvas.hidden=false;state.hud.hidden=false;state.label.hidden=false}
  return true;
}
function unmount({host,content}={}){if(state){state.mounted=false;state.canvas.hidden=true;state.hud.hidden=true;state.label.hidden=true}if(host)host.hidden=true;if(content)content.replaceChildren()}
function activateFieldPoint(){}

modules.set(id,Object.freeze({id,shader,render,unmount,fieldProjection,activateFieldPoint}));
})();
