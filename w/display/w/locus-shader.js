(() => {
'use strict';
const N=globalThis.SSSDisplayNavigation,W=globalThis.SSSWorldView;
if(!N||!W) throw new Error('interlocutor field dependencies missing');
const faceIx=[[0,2,1],[0,1,3],[0,3,2],[1,2,3]],geneIndex={w:0,x:1,z:2,y:3};
const clamp=x=>Math.max(0,Math.min(1,x));
const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const nrm=v=>{const m=Math.hypot(...v)||1;return v.map(x=>x/m)};
const qMul=(a,b)=>{const[w,x,y,z]=a,[v,i,j,k]=b;return [w*v-x*i-y*j-z*k,w*i+x*v+y*k-z*j,w*j-x*k+y*v+z*i,w*k+x*j-y*i+z*v]};
const qRot=(q,p)=>{const r=qMul(qMul(q,[0,...p]),[q[0],-q[1],-q[2],-q[3]]);return r.slice(1)};
const shaders=new Map();
function paletteSet(base){const b=Array.isArray(base)&&base.length===3?base:[.4,.7,.9],genes=[[1.0,.78,.72],[.72,.86,1.0],[1.0,.70,.86],[.78,1.0,.70]];return genes.map(g=>b.map((v,i)=>clamp(v*g[i]+.055*g[(i+1)%3])))}
function orthographic(half,aspect,near,far){const nf=1/(near-far);return new Float32Array([1/(half*aspect),0,0,0,0,1/half,0,0,0,0,2*nf,0,0,0,(far+near)*nf,1])}
function perspective(fovy,aspect,near,far){const f=1/Math.tan(fovy/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0])}
function lookAt(eye,center,up){const z=nrm(sub(eye,center)),x=nrm(cross(up,z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x.reduce((s,v,i)=>s+v*eye[i],0),-y.reduce((s,v,i)=>s+v*eye[i],0),-z.reduce((s,v,i)=>s+v*eye[i],0),1])}
function model(q,scale,center){const[w,x,y,z]=q,c=qRot(q,center),o=[-c[0]*scale,-c[1]*scale,-c[2]*scale];return new Float32Array([(1-2*y*y-2*z*z)*scale,(2*x*y+2*w*z)*scale,(2*x*z-2*w*y)*scale,0,(2*x*y-2*w*z)*scale,(1-2*x*x-2*z*z)*scale,(2*y*z+2*w*x)*scale,0,(2*x*z+2*w*y)*scale,(2*y*z-2*w*x)*scale,(1-2*x*x-2*y*y)*scale,0,o[0],o[1],o[2],1])}
function compile(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
const VERTEX=`#version 300 es
precision highp float;in vec3 aPos;in vec3 aNormal;in float aRegion;uniform mat4 uProj,uView,uModel;out vec3 vN;out vec3 vW;out float vRegion;void main(){vec4 w=uModel*vec4(aPos,1.);vW=w.xyz;vN=mat3(uModel)*aNormal;vRegion=aRegion;gl_Position=uProj*uView*w;}`;
const POINT_VERTEX=`#version 300 es
precision highp float;
in vec3 aPos;in float aRegion;in float aKind;in float aHot;
uniform mat4 uProj,uView,uModel;uniform float uPointScale;
out float vRegion;out float vKind;out float vHot;
void main(){
  vec4 w=uModel*vec4(aPos,1.);
  vec4 clip=uProj*uView*w;
  gl_Position=clip;
  float depthScale=clamp(1.04+w.z*.11,.76,1.28);
  float base=mix(5.8,9.4,step(.5,aKind));
  gl_PointSize=base*(1.+aHot*.72)*uPointScale*depthScale;
  vRegion=aRegion;vKind=aKind;vHot=aHot;
}`;
const POINT_FRAGMENT=`#version 300 es
precision highp float;
in float vRegion;in float vKind;in float vHot;
uniform vec3 uPalette[4];out vec4 outColor;
void main(){
  vec2 q=gl_PointCoord-.5;
  int ri=int(clamp(floor(vRegion+.5),0.,3.));
  vec3 c=uPalette[ri];
  float alpha=.78;
  if(vKind<.5){
    float d=length(q);
    if(d>.46)discard;
    alpha=smoothstep(.46,.30,d);
    c=mix(vec3(.82,.88,.90),c,.58);
  }else{
    float d=abs(q.x)+abs(q.y);
    if(d>.47)discard;
    if(vHot<.5&&d<.20)discard;
    alpha=vHot>.5?1.:.90;
    c=mix(vec3(.95,.98,.92),c,.78);
  }
  if(vHot>.5)c=mix(c,vec3(1.),.32);
  outColor=vec4(c,alpha);
}`;
const ENV_VERTEX=`#version 300 es
precision highp float;uniform vec4 uQuat;uniform vec3 uCenter;uniform float uSpan;uniform float uEnvRegion;out vec3 vN;out vec3 vW;out float vRegion;
vec3 qrot(vec4 q,vec3 v){return v+2.0*cross(q.yzw,cross(q.yzw,v)+q.x*v);}
void main(){vec2 p=gl_VertexID==0?vec2(-1.,-1.):(gl_VertexID==1?vec2(3.,-1.):vec2(-1.,3.));gl_Position=vec4(p,0.,1.);vW=qrot(uQuat,uCenter+vec3(p*.72,-.35)*uSpan);vN=qrot(uQuat,normalize(vec3(-p.x*.18,-p.y*.18,1.)));vRegion=uEnvRegion;}`;
function program(gl,fragment,vertex=VERTEX){const p=gl.createProgram();gl.attachShader(p,compile(gl,gl.VERTEX_SHADER,vertex));gl.attachShader(p,compile(gl,gl.FRAGMENT_SHADER,fragment));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p}
function pointProgram(gl){const p=gl.createProgram();gl.attachShader(p,compile(gl,gl.VERTEX_SHADER,POINT_VERTEX));gl.attachShader(p,compile(gl,gl.FRAGMENT_SHADER,POINT_FRAGMENT));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p}
function geometry(cells){const data=[];function tri(a,b,c,region){const no=nrm(cross(sub(b,a),sub(c,a)));for(const v of [a,b,c])data.push(...v,...no,region)}for(const cell of cells){const r=geneIndex[cell.path[0]]??0;for(const f of faceIx)tri(cell.tet[f[0]],cell.tet[f[1]],cell.tet[f[2]],r)}return new Float32Array(data)}
/* Geometry is always drawn at full realized resolution: a Sierpinski body is cheap.
 * LOD governs content only (pools), never the shape of a body. */
const CAMERA_MS=330;
const smooth01=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
const placement=N.bodyPlacement,driftPath=N.bodyDrift,driftAt=N.bodyPosition;
function bodyGeometry(structure,place){
  const raw=geometry(structure.leaves),k=place.k;
  for(let i=0;i<raw.length;i+=7){for(let j=0;j<3;j++)raw[i+j]*=k}
  return raw;
}
function nodeAt(root,path){let n=root;for(const g of path){n=n?.children?.[g];if(!n)return null}return n}
function shaderContract(shader){
  if(!shader||typeof shader!=='object'||typeof shader.id!=='string'||!shader.id) throw new Error('identity-owned shader required');
  if(typeof shader.fragment!=='string'||!shader.fragment.includes('void main')) throw new Error('shader fragment body missing: '+shader.id);
  return shader;
}
function pointInTet(tet,spec){return N.sampleTet(tet,spec.id,spec.kind==='holon'?.40:.22)}
function fieldPointRecords(structure,projection){
  const specs=Array.isArray(projection?.points)?projection.points:[];
  const byGene=new Map();
  for(const g of Object.keys(geneIndex)){
    const exact=structure.leaves.find(c=>c.path===g);
    const first=structure.leaves.find(c=>c.path?.startsWith(g));
    if(exact||first)byGene.set(g,exact||first);
  }
  const seen=new Set(),out=[];
  for(const raw of specs){
    if(!raw||typeof raw.id!=='string'||seen.has(raw.id))continue;
    const addressed=typeof raw.path==='string'&&raw.path?N.addressRecord(structure,raw.path):null;
    const gene=addressed?.path?.[0]||raw.gene;
    if(!geneIndex.hasOwnProperty(gene))continue;
    const cell=addressed||byGene.get(gene);if(!cell)continue;seen.add(raw.id);
    const spec=Object.freeze({...raw,gene});
    const pool=raw.fold===true&&!!addressed&&Number.isInteger(raw.count)&&raw.count>0;
    // An owner may contact the actual address locus rather than an interior sample.
    // Folded populations still represent their containing cell, never a leaf vertex.
    out.push({spec,path:(addressed||cell).path||'',world:pool||raw.anchor==='cell'&&addressed?[...cell.center]:raw.anchor==='locus'&&addressed?[...addressed.point]:pointInTet(cell.tet,spec),pool});
  }
  return out;
}
function create({id,element,canvas,labelHost,projection,palette,shader,inspectable=false,draggable=true,localScope,environment=null,bodies=null,presentation=null}){
  if(!element||!canvas||!projection?.root)throw new Error('interlocutor field surface incomplete: '+id);
  const module=globalThis.SSSInterlocutorModules instanceof Map?globalThis.SSSInterlocutorModules.get(id):null;
  shader=shaderContract(shader||module?.shader);
  if(typeof shader.preload==='function')shader.preload();
  /* optional identity-owned rest view: {rest:[w,x,y,z], projection:'orthographic'} */
  const VIEW=shader.view&&typeof shader.view==='object'?shader.view:null,ORTHO=VIEW?.projection==='orthographic';let restDone=false;
  let structure=N.collectStructure(projection.root),pointRecords=fieldPointRecords(structure,projection),pointById=new Map(pointRecords.map(p=>[p.spec.id,p]));
  const colors=paletteSet(palette);let fieldRevision=null,shapeDirty=false;
  function refreshProjection(ms){
    if(typeof shader.snapshot!=='function')return;const rect=canvas.getBoundingClientRect(),next=shader.snapshot({ms,container:container(),project:point=>project(point,rect),viewport:{width:rect.width,height:rect.height}});
    if(!next?.root||!Array.isArray(next.points)||next.revision===fieldRevision)return;
    fieldRevision=next.revision;projection=next;structure=N.collectStructure(next.root);pointRecords=fieldPointRecords(structure,next);pointById=new Map(pointRecords.map(p=>[p.spec.id,p]));shapeDirty=true;
    if(selectedPointId&&!pointById.has(selectedPointId))selectedPointId='';if(hoverPointId&&!pointById.has(hoverPointId))setHover('');
  }
  if(typeof shader.decorate==='function')shader.decorate({id,element,canvas,labelHost,projection,localScope});
  const gl=canvas.getContext('webgl2',{antialias:true,alpha:false,premultipliedAlpha:false});
  let GL=null,PG=null;
  const placeholder=shader.bodyPlaceholder;
  let PLAIN=null;
  if(gl&&placeholder){const p=program(gl,placeholder.fragment);PLAIN={p,U:Object.fromEntries(['proj','view','model','time','focus','resolution','pal'].map((k,i)=>[k,gl.getUniformLocation(p,['uProj','uView','uModel','uTime','uFocus','uResolution','uPalette[0]'][i])]))}}
  /* DESCENT — the walked path. The witness is inside exactly one container; ascent
   * pops back through the container it came through. A field bound to the global
   * scope mirrors its container into World View so the navigator reads the same walk. */
  const scopeBound=()=>W.scopeId===localScope;
  let walk=[];
  function container(){
    if(scopeBound()){const v=W.view||'';if((walk.at(-1)||'')!==v)walk=v?[...v].map((_,i)=>v.slice(0,i+1)):[];return v}
    return walk.at(-1)||'';
  }
  let shownFor=null,cells=[],visible=[],cam=null;
  if(gl){
    const p=program(gl,shader.fragment),vao=gl.createVertexArray(),buf=gl.createBuffer();
    gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(0),gl.DYNAMIC_DRAW);
    const stride=7*4;
    for(const [name,size,off] of [['aPos',3,0],['aNormal',3,12],['aRegion',1,24]]){const loc=gl.getAttribLocation(p,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,stride,off)}
    GL={p,vao,buf,count:0,U:{proj:gl.getUniformLocation(p,'uProj'),view:gl.getUniformLocation(p,'uView'),model:gl.getUniformLocation(p,'uModel'),time:gl.getUniformLocation(p,'uTime'),focus:gl.getUniformLocation(p,'uFocus'),resolution:gl.getUniformLocation(p,'uResolution')},pal:gl.getUniformLocation(p,'uPalette[0]')};
    if(pointRecords.length||typeof shader.snapshot==='function'){
      const pp=pointProgram(gl),pvao=gl.createVertexArray(),pbuf=gl.createBuffer();
      gl.bindVertexArray(pvao);gl.bindBuffer(gl.ARRAY_BUFFER,pbuf);
      const pstride=6*4;
      for(const [name,size,off] of [['aPos',3,0],['aRegion',1,12],['aKind',1,16],['aHot',1,20]]){const loc=gl.getAttribLocation(pp,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,pstride,off)}
      PG={p:pp,vao:pvao,buf:pbuf,count:0,U:{proj:gl.getUniformLocation(pp,'uProj'),view:gl.getUniformLocation(pp,'uView'),model:gl.getUniformLocation(pp,'uModel'),pointScale:gl.getUniformLocation(pp,'uPointScale')},pal:gl.getUniformLocation(pp,'uPalette[0]')};
    }
  }
  const ctx=!gl?canvas.getContext('2d'):null;
  canvas.dataset.fieldRenderer=gl?'webgl2':ctx?'canvas2d':'unavailable';
  /* HOST ENVIRONMENT AT THE LOCUS — inside a site the host's geometry is not seen.
   * The host's own shader, evaluated at the container the site occupies (its region,
   * its place and span in host space, the shared orientation), fills the entire space
   * in which the site is witnessed. One full-screen pass at any depth. Generalizes the
   * inquiry environment Papers grew locally. A site whose renderer already embodies
   * its host may refuse with `environment:false`. */
  const hostAllowed=shader.environment!==false&&typeof environment==='function';
  let HOST=null;
  function hostView(){
    if(!gl||!hostAllowed)return null;
    const e=environment();if(!e?.shader?.fragment){HOST=null;return null}
    if(!HOST||HOST.key!==e.hostId+'|'+e.shader.id){
      try{
        const hp=program(gl,e.shader.fragment,ENV_VERTEX);
        HOST={key:e.hostId+'|'+e.shader.id,p:hp,vao:gl.createVertexArray(),colors:paletteSet(e.palette),U:{quat:gl.getUniformLocation(hp,'uQuat'),center:gl.getUniformLocation(hp,'uCenter'),span:gl.getUniformLocation(hp,'uSpan'),region:gl.getUniformLocation(hp,'uEnvRegion'),time:gl.getUniformLocation(hp,'uTime'),focus:gl.getUniformLocation(hp,'uFocus'),resolution:gl.getUniformLocation(hp,'uResolution'),pal:gl.getUniformLocation(hp,'uPalette[0]')}};
      }catch(err){console.warn('host environment unavailable for '+id,err);HOST={key:e.hostId+'|'+e.shader.id,p:null}}
    }
    if(!HOST.p)return null;
    const k=e.place.k,f=currentFrame();
    return {e,H:HOST,center:e.place.center.map((v,i)=>v+f.center[i]*k),span:k/f.scale,region:geneIndex[e.path[0]]??0};
  }
  /* FLOATING BODIES — organisms whose host is this field float in their mount cell,
   * drawn with their own identity shader at full geometry, entered by selection. */
  const BODIES=new Map();
  function releaseBody(B){if(gl){B.release?.({gl});if(B.p)gl.deleteProgram(B.p);if(B.vao)gl.deleteVertexArray(B.vao);if(B.plainVAO)gl.deleteVertexArray(B.plainVAO);if(B.buf)gl.deleteBuffer(B.buf)}}
  function floatingBodies(){
    for(const B of BODIES.values())B.active=false;
    if((!gl&&!ctx)||typeof bodies!=='function')return [];
    const list=bodies()||[],out=[];
    for(const b of list){
      if(!(b?.shader?.body?.fragment||b?.shader?.fragment)||!b.root)continue;
      let B=BODIES.get(b.id);
      if(!B||B.key!==b.shader.id+'|'+b.path){
        if(B)releaseBody(B);
        try{
          try{b.shader.preload?.()}catch(err){canvas.dataset.previewError=String(err?.message||err)}
          const place=placement(structure,b.path),material=b.shader.body||b.shader;
          const ownCells=typeof material.cells==='function'?material.cells({projection:b.projection,root:b.root}):null;
          if(ownCells&&(!Array.isArray(ownCells)||ownCells.some(c=>!Array.isArray(c.tet)||c.tet.length!==4||c.tet.some(v=>!Array.isArray(v)||v.length!==3||v.some(x=>!Number.isFinite(x)||Math.abs(x)>2)))))throw new Error('invalid site-owned coarse cells');
          const g=bodyGeometry(ownCells?{leaves:ownCells}:N.collectStructure(b.root),place);
          const bounds=[[Infinity,-Infinity],[Infinity,-Infinity],[Infinity,-Infinity]];
          for(let i=0;i<g.length;i+=7)for(let j=0;j<3;j++){bounds[j][0]=Math.min(bounds[j][0],g[i+j]);bounds[j][1]=Math.max(bounds[j][1],g[i+j])}
          const corners=Array.from({length:8},(_,i)=>bounds.map((b,j)=>Number.isFinite(b[(i>>j)&1])?b[(i>>j)&1]:0));
          B={key:b.shader.id+'|'+b.path,id:b.id,place,title:b.title||b.id,drift:driftPath(place,b.id),pos:[...place.center],corners,reveal:typeof material.draw==='function'||typeof b.shader.preview==='function',count:g.length/7,preview:b.shader.preview,draw:material.draw,release:material.release,projection:b.projection,state:material.state||{},colors:paletteSet(b.palette),mesh:gl?null:g,fallbackAlpha:Number(material.fallbackAlpha??.28),ready:true};
          if(gl){
            const bp=program(gl,material.fragment),bvao=gl.createVertexArray(),bbuf=gl.createBuffer();
            gl.bindVertexArray(bvao);gl.bindBuffer(gl.ARRAY_BUFFER,bbuf);gl.bufferData(gl.ARRAY_BUFFER,g,gl.STATIC_DRAW);
            for(const [name,size,off] of [['aPos',3,0],['aNormal',3,12],['aRegion',1,24]]){const loc=gl.getAttribLocation(bp,name);if(loc<0)continue;gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,28,off)}
            Object.assign(B,{p:bp,vao:bvao,buf:bbuf,U:{proj:gl.getUniformLocation(bp,'uProj'),view:gl.getUniformLocation(bp,'uView'),model:gl.getUniformLocation(bp,'uModel'),time:gl.getUniformLocation(bp,'uTime'),focus:gl.getUniformLocation(bp,'uFocus'),resolution:gl.getUniformLocation(bp,'uResolution'),pal:gl.getUniformLocation(bp,'uPalette[0]')}});
            if(PLAIN){B.plainVAO=gl.createVertexArray();gl.bindVertexArray(B.plainVAO);for(const [name,size,off] of [['aPos',3,0],['aNormal',3,12],['aRegion',1,24]]){const loc=gl.getAttribLocation(PLAIN.p,name);if(loc<0)continue;gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,28,off)}}
          }
        }catch(err){console.warn('floating body unavailable: '+b.id,err);B={key:b.shader.id+'|'+b.path,id:b.id,p:null}}
        BODIES.set(b.id,B);
      }
      if(B.ready){B.active=true;B.title=b.title||b.id;out.push(B)}
    }
    return out;
  }
  addEventListener('pagehide',()=>{for(const B of BODIES.values())releaseBody(B);if(PLAIN)gl.deleteProgram(PLAIN.p)});
  const bodyLabels=new Map(),labelSizes=new WeakMap();
  const labelObserver=typeof ResizeObserver==='function'?new ResizeObserver(entries=>{for(const e of entries){const b=e.borderBoxSize?.[0];labelSizes.set(e.target,{w:b?.inlineSize??e.contentRect.width,h:b?.blockSize??e.contentRect.height})}}):null;
  addEventListener('pagehide',()=>labelObserver?.disconnect());
  function bodyLabel(B){
    let n=bodyLabels.get(B.id);
    if(!n){n=document.createElement('button');n.type='button';n.className='field-label field-body-label';n.innerHTML='<b></b>';n.querySelector('b').textContent=B.title;
      n.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const p=e.detail===0?projectBody(B.id):null,r=p&&canvas.getBoundingClientRect();enterBody(B.id,p?{x:r.left+p.x,y:r.top+p.y}:{x:e.clientX,y:e.clientY})});
      (labelHost||element).append(n);bodyLabels.set(B.id,n);labelObserver?.observe(n)}
    const ink=n.querySelector('b');if(ink.textContent!==B.title)ink.textContent=B.title;
    return n;
  }
  function enterBody(bodyId,origin){
    const B=BODIES.get(bodyId);if(!B?.active)return;
    dispatchEvent(new CustomEvent('sss:enter-body',{detail:{from:id,id:bodyId,origin}}));
  }
  function hitBody(x,y,rect){
    let best=null;
    for(const B of BODIES.values()){
      if(!B.active)continue;const pts=N.V0.map(v=>project(v.map((x,j)=>B.pos[j]+x*B.place.k),rect));
      for(const f of faceIx){const tri=[pts[f[0]],pts[f[1]],pts[f[2]]];if(!pointInTriangle(x,y,...tri))continue;const z=(tri[0].z+tri[1].z+tri[2].z)/3;if(!best||z>best.z)best={id:B.id,z}}
    }
    return best?.id||'';
  }
  /* LOD + POOLS — cells and content are resolved only around the container.
   * Content deeper than the hint level coalesces into one pool at its hint cell. */
  function refreshVisible(){
    const c=container(),moved=shownFor!==c;if(!moved&&!shapeDirty)return;shownFor=c;shapeDirty=false;
    cells=structure.leaves;
    if(moved)cam={from:currentFrame(),to:frameFor(c),start:performance.now()};
    if(gl&&GL){const data=geometry(cells);gl.bindBuffer(gl.ARRAY_BUFFER,GL.buf);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);GL.count=data.length/7}
    const hint=c.length+2,pools=new Map();visible=[];
    for(const rec of pointRecords){
      if(rec.spec.context===true){visible.push(rec);continue}
      if(!rec.path.startsWith(c))continue
      if(rec.path.length<=hint){visible.push(rec);continue}
      const key=rec.path.slice(0,hint);let pool=pools.get(key);
      if(!pool){const cellRec=N.addressRecord(structure,key)||N.cellForPath(key);pool={pool:true,path:key,members:[],world:[...cellRec.center],spec:null};pools.set(key,pool);visible.push(pool)}
      pool.members.push(rec);
    }
    for(const pool of pools.values()){
      const count=pool.members.reduce((n,rec)=>n+(rec.pool?rec.spec.count:1),0);
      pool.spec=Object.freeze({id:'pool:'+pool.path,gene:pool.path[0],kind:'holon',path:pool.path,label:count+' within '+pool.path,meta:'pool · '+count+' constituents · click to enter'});
    }
    if(PG){PG.count=visible.length;uploadPoints()}
  }
  function descendTo(path,source){
    const c=container();if(path===c)return false;
    let from=c.length;
    if(!path.startsWith(c)){
      if(!visible.some(rec=>rec.spec.context===true&&rec.path===path))return false;
      from=0;while(from<c.length&&from<path.length&&c[from]===path[from])from++;
      walk=walk.slice(0,from);
    }
    for(let i=from+1;i<=path.length;i++)walk.push(path.slice(0,i));
    if(scopeBound())W.inspect(path,source);
    return true;
  }
  function ascend(source){
    container(); // Reconcile a restored/inspected container before popping one rank.
    if(!walk.length){dispatchEvent(new CustomEvent('sss:membrane-ascend',{detail:{id,source}}));return false}
    walk.pop();const up=walk.at(-1)||'';
    if(scopeBound()){if(up)W.inspect(up,source);else W.clearInspection(source)}
    return true;
  }
  const geneLabels=[];
  if(labelHost){labelHost.replaceChildren();for(const g of N.GENES){const n=document.createElement('div');n.className='field-label';n.setAttribute('aria-hidden','true');n.dataset.gene=g;const node=nodeAt(projection.root,g);n.innerHTML=`<span>${g}</span><b>${node?.en||node?.noun||g}</b>`;labelHost.append(n);geneLabels.push(n)}}
  let selectedPointId='',hoverPointId='',down=null,api=null;
  let tooltip=null;
  if(pointRecords.length||typeof shader.snapshot==='function'){
    tooltip=document.createElement('div');tooltip.className='field-point-tooltip';tooltip.hidden=true;tooltip.setAttribute('role','status');tooltip.setAttribute('aria-live','polite');
    const tid=document.createElement('span');tid.className='field-point-tooltip-id';
    const ttl=document.createElement('strong');ttl.className='field-point-tooltip-title';
    const tmeta=document.createElement('span');tmeta.className='field-point-tooltip-meta';
    tooltip.append(tid,ttl,tmeta);element.append(tooltip);
  }
  function pointData(){
    const data=[];
    for(const p of visible){
      const hot=(p.spec.id===selectedPointId||p.spec.id===hoverPointId)?1:0;
      data.push(...p.world,geneIndex[p.spec.gene]??0,p.spec.kind==='holon'?1:0,hot);
    }
    return new Float32Array(data);
  }
  function uploadPoints(){if(gl&&PG){gl.bindBuffer(gl.ARRAY_BUFFER,PG.buf);gl.bufferData(gl.ARRAY_BUFFER,pointData(),gl.DYNAMIC_DRAW)}}
  if(PG)uploadPoints();
  function setHover(next){
    next=next||'';
    if(next===hoverPointId)return;
    hoverPointId=next;uploadPoints();
  }
  function frameFor(c){return c?{center:N.cellForPath(c).center,scale:1.02*Math.pow(2,c.length)}:{center:[0,0,0],scale:1}}
  function currentFrame(){
    if(!cam)return frameFor(container());
    const t=smooth01((performance.now()-cam.start)/CAMERA_MS),ls=Math.log(cam.from.scale)+(Math.log(cam.to.scale)-Math.log(cam.from.scale))*t;
    return {center:cam.from.center.map((v,i)=>v+(cam.to.center[i]-v)*t),scale:Math.exp(ls)};
  }
  /* FOCUS — an identity-owned shader may offer a continuous focus {center, scale}; the camera follows it with a
   * critically damped spring instead of Descent steps, and glides back to the walked container when released.
   * The walk, pools and selection are untouched; Display never learns what is being followed. */
  let follow=null;
  function followStep(ms){
    const want=typeof shader.focus==='function'?shader.focus({ms}):null;
    if(want&&Array.isArray(want.center)&&want.scale>0){
      if(!follow){const f=currentFrame();follow={c:[...f.center],v:[0,0,0],l:Math.log(f.scale),vl:0,ms}}
      const attached=want.attached===true&&typeof want.id==='string';
      if(attached&&follow.id!==want.id){follow.offset=follow.c.map((v,i)=>v-want.center[i]);follow.v=[0,0,0];follow.id=want.id}
      if(!attached){follow.id=null;follow.offset=null}
      // real elapsed time in fixed substeps: the spring feels the same at 12 fps and at 144
      let rest=Math.min(.5,Math.max(0,(ms-follow.ms)/1000));follow.ms=ms;
      const w=Number(want.stiffness)>0?Number(want.stiffness):2.4,k=w*w,b=2*w,tl=Math.log(want.scale);
      while(rest>1e-6){const dt=Math.min(1/120,rest);rest-=dt;
        for(let i=0;i<3;i++){
          if(attached){follow.v[i]+=(-k*follow.offset[i]-b*follow.v[i])*dt;follow.offset[i]+=follow.v[i]*dt}
          else{follow.v[i]+=(k*(want.center[i]-follow.c[i])-b*follow.v[i])*dt;follow.c[i]+=follow.v[i]*dt}
        }
        follow.vl+=(k*(tl-follow.l)-b*follow.vl)*dt;follow.l+=follow.vl*dt}
      if(attached)follow.c=want.center.map((v,i)=>v+follow.offset[i]);
    }else if(follow){cam={from:{center:[...follow.c],scale:Math.exp(follow.l)},to:frameFor(container()),start:performance.now()};follow=null}
  }
  function target(){return follow?{center:follow.c,scale:Math.exp(follow.l)}:currentFrame()}
  function viewBox(rect){
    const p=typeof presentation==='function'?presentation():null;
    if(!p||![p.x??p.left,p.y??p.top,p.width,p.height].every(Number.isFinite)||p.width<=0||p.height<=0)return {x:0,y:0,width:rect.width,height:rect.height,bounded:false};
    const x=Math.max(0,Math.min(rect.width,p.x??p.left)),y=Math.max(0,Math.min(rect.height,p.y??p.top));return {x,y,width:Math.max(1,Math.min(p.width,rect.width-x)),height:Math.max(1,Math.min(p.height,rect.height-y)),bounded:true};
  }
  function worldClip(rect,d=1){if(!gl)return;const b=viewBox(rect);if(!b.bounded){gl.disable(gl.SCISSOR_TEST);return}gl.enable(gl.SCISSOR_TEST);gl.scissor(Math.floor(b.x*d),Math.floor((rect.height-b.y-b.height)*d),Math.ceil(b.width*d),Math.ceil(b.height*d));}
  function fieldProjectionMatrix(rect){
    const b=viewBox(rect),span=b.bounded?Math.min(b.width,b.height):b.height,stretch=b.height/Math.max(1,span),half=3.2*Math.tan(Math.PI/6.6)*stretch;
    const P=ORTHO?orthographic(half,b.width/b.height,.1,20):perspective(2*Math.atan(Math.tan(Math.PI/6.6)*stretch),b.width/b.height,.1,20);
    if(!b.bounded)return P;const sx=b.width/rect.width,sy=b.height/rect.height,tx=(2*b.x+b.width)/rect.width-1,ty=1-(2*b.y+b.height)/rect.height;
    for(let c=0;c<4;c++){P[c*4]=sx*P[c*4]+tx*P[c*4+3];P[c*4+1]=sy*P[c*4+1]+ty*P[c*4+3]}return P;
  }
  function project(point,rect){const b=viewBox(rect),t=target(),q=qRot(W.orientation,sub(point,t.center)),scale=(b.width<560?1.42:1.75)*t.scale,camZ=3.2,z=ORTHO?camZ:camZ-q[2]*scale,f=((b.bounded?Math.min(b.width,b.height):b.height)/2)/Math.tan(Math.PI/6.6);return {x:b.x+b.width/2+q[0]*scale*f/z,y:b.y+b.height/2-q[1]*scale*f/z,z:q[2],front:z>0};}
  function pointInTriangle(x,y,a,b,c){
    const area=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
    const p={x,y},s1=area(a,b,p),s2=area(b,c,p),s3=area(c,a,p);
    const hasNeg=s1<-.35||s2<-.35||s3<-.35,hasPos=s1>.35||s2>.35||s3>.35;
    return !(hasNeg&&hasPos);
  }
  function hitFace(x,y,rect){
    let best=null;
    for(const a of structure.addresses){
      const pts=a.tet.map(p=>project(p,rect));
      for(const f of faceIx){
        const tri=[pts[f[0]],pts[f[1]],pts[f[2]]];
        if(!pointInTriangle(x,y,...tri))continue;
        const z=(tri[0].z+tri[1].z+tri[2].z)/3,depth=a.path.length;
        if(!best||depth>best.depth||(depth===best.depth&&z>best.z))best={a,depth,z};
      }
    }
    return best?.a?.path||'';
  }
  /* Selection is local: only the current container's children can be entered. */
  function hitChild(x,y,rect){
    const c=container();let best=null;
    for(const a of structure.addresses){
      if(a.path.length!==c.length+1||!a.path.startsWith(c))continue;
      const pts=a.tet.map(p=>project(p,rect));
      for(const f of faceIx){const tri=[pts[f[0]],pts[f[1]],pts[f[2]]];if(!pointInTriangle(x,y,...tri))continue;const z=(tri[0].z+tri[1].z+tri[2].z)/3;if(!best||z>best.z)best={path:a.path,z}}
    }
    return best?.path||'';
  }
  function projectAddressCenter(path){
    const r=canvas.getBoundingClientRect(),cell=N.cellForPath(path||''),p=project(cell.center,r);
    return {path:path||'',x:p.x,y:p.y,z:p.z,width:r.width,height:r.height};
  }
  /* neutral geometry: a mounted body's current projected centre and extent, or null when absent */
  function projectBody(bodyId){
    const B=BODIES.get(bodyId);if(!B?.active)return null;
    const r=canvas.getBoundingClientRect(),c=project(B.pos,r);let ext=0;
    for(const v of N.V0){const q=project(v.map((x,j)=>B.pos[j]+x*B.place.k),r);ext=Math.max(ext,Math.hypot(q.x-c.x,q.y-c.y))}
    return {id:bodyId,x:c.x,y:c.y,z:c.z,r:ext,width:r.width,height:r.height};
  }
  function hitPoint(x,y,rect){
    let best=null;
    for(const rec of visible){
      const p=project(rec.world,rect),radius=rec.spec.kind==='holon'?14:10,d=Math.hypot(x-p.x,y-p.y);
      if(d<radius&&(!best||d<best.d||(d===best.d&&p.z>best.p.z)))best={rec,d,p};
    }
    return best;
  }
  function updateTooltip(hitResult,rect){
    if(!tooltip)return;
    if(!hitResult){tooltip.hidden=true;return}
    const {rec,p}=hitResult,s=rec.spec;
    tooltip.querySelector('.field-point-tooltip-id').textContent=s.id;
    tooltip.querySelector('.field-point-tooltip-title').textContent=s.label||s.id;
    tooltip.querySelector('.field-point-tooltip-meta').textContent=s.meta||'';
    tooltip.style.left=Math.min(rect.width-260,p.x+14)+'px';tooltip.style.top=Math.max(42,p.y-8)+'px';tooltip.hidden=false;
  }
  function selectPoint(pointId,notify=false){
    const rec=pointById.get(pointId)||null,next=rec?.spec.id||'';
    if(next!==selectedPointId){selectedPointId=next;uploadPoints()}
    if(notify&&typeof module?.activateFieldPoint==='function')module.activateFieldPoint({point:rec?.spec||null,field:api});
    return rec?.spec||null;
  }
  function updateLabels(bounds){if(!labelHost||element.hidden)return;const r=bounds||canvas.getBoundingClientRect();for(const n of geneLabels){const a=N.addressRecord(structure,n.dataset.gene);if(!a){n.hidden=true;continue}const p=project(a.point,r);n.hidden=false;n.style.left=p.x+'px';n.style.top=p.y+'px';n.style.opacity=p.z<-.12?'.32':'.82'}}
  function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.5),w=Math.max(1,Math.floor(r.width*d)),h=Math.max(1,Math.floor(r.height*d));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}return {r,d,w,h}}
  /* GLASS — every occupied HUD surface (see z/display-glass.js) refracts this field.
   * While at least one surface touches this canvas the field is drawn into a multisampled
   * target (the screen's own antialiasing is kept), resolved to a texture, and one more pass
   * draws that texture to the screen, displacing the lookup inside each surface's rounded
   * rectangle. With no surface nothing changes and nothing is paid. For the duration of the
   * draw "the default framebuffer" means the scene target, so site code that restores the
   * screen (afterDraw hooks, a site's own composite) lands in the scene without knowing it.
   * The bend is complex arithmetic: the rim's outward normal is one complex number, turned off
   * the normal by multiplying with e^{i·theta}; the lens is a complex scaling about the centre. */
  const GLASS_VERTEX=`#version 300 es
void main(){vec2 p=gl_VertexID==0?vec2(-1.,-1.):(gl_VertexID==1?vec2(3.,-1.):vec2(-1.,3.));gl_Position=vec4(p,0.,1.);}`;
  const GLASS_FRAGMENT=`#version 300 es
precision highp float;
uniform sampler2D uScene;uniform sampler2D uPreview;uniform sampler2D uForeground;uniform int uForegroundReady;uniform int uPreviewReady;uniform vec2 uRes;uniform vec4 uRect[8];uniform vec4 uReadRect[8];uniform float uMerge[8];uniform int uCount;
uniform vec4 uA;uniform vec4 uB;uniform vec4 uC;uniform vec4 uT;uniform vec4 uH;
uniform vec4 uHome;uniform vec4 uHomeRead;uniform vec4 uL0;uniform vec4 uL1;uniform vec4 uL2;uniform vec4 uN;
out vec4 outColor;
vec2 gShift=vec2(0.);float gInside=0.,gLit=0.,gShade=0.,gRim=0.,gDistance=1e9;
vec2 cmul(vec2 a,vec2 b){return vec2(a.x*b.x-a.y*b.y,a.x*b.y+a.y*b.x);}
float sdBox(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float smin(float a,float b,float k){float h=max(k-abs(a-b),0.)/max(k,1e-3);return min(a,b)-h*h*k*.25;}
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
/* uN: x lens+home on, y reading protection, w capillary blend width.
 * uL0 centre/half axes; uL1.w magnification; uL2.x corner+1 (0 ellipse),
 * uL2.y orientation in buffer coordinates, uL2.w field focus. */
float sdReadingLens(vec2 p){vec2 q=rot(uL2.y)*(p-uL0.xy);if(uL2.x>.5)return sdBox(q,uL0.zw,uL2.x-1.);vec2 b=max(uL0.zw,vec2(1.));float k0=length(q/b),k1=length(q/(b*b));return k0<1e-5?-min(b.x,b.y):k0*(k0-1.)/max(k1,1e-12);}
float sdLens(vec2 p){return sdReadingLens(p)-uH.w*uN.y;}
float sdPanel(vec2 p,vec4 R){
  vec2 q=p-R.xy;
  if(R.y+R.w>uRes.y&&R.z*2.>uRes.x*.75)q.y+=sin(clamp(p.x/uRes.x,0.,1.)*3.14159)*uH.z;
  return sdBox(q,R.zw,min(uA.x,min(R.z,R.w)));
}
vec3 panelSample(vec2 p){
  float d=uN.x>.5?sdPanel(p,uHome):1e9;vec2 centre=uN.x>.5?uHome.xy:uL0.xy;
  for(int i=0;i<8;i++){if(i>=uCount)break;if(uMerge[i]>.5){float q=sdPanel(p,uRect[i]),h=clamp(.5+.5*(q-d)/max(uN.w,1e-3),0.,1.);centre=mix(uRect[i].xy,centre,h);d=smin(d,q,uN.w);}}return vec3(d,centre);
}
/* One phase, one exterior. No capsule creates a long parallel-sided tether,
 * and no other compatible reservoir is painted through the drop's interior. */
float gooD(vec2 p){return smin(sdLens(p),panelSample(p).x,uN.w);}
/* halftone: a 45 degree dot screen; the dot grows with the ink it has to print, and is antialiased by its own derivative */
float dots(vec2 fc,float ink){
  vec2 f=fract(rot(.7854)*fc/uH.x)-.5;float aa=fwidth(length(f))+1e-3;
  if(ink<=0.)return 0.;
  float r=sqrt(clamp(ink,0.,1.))*.74;
  return 1.-smoothstep(r-aa,r+aa,length(f));
}
void surface(float d,vec2 n,float bevW,vec2 pc,vec2 p,float mag){
  gDistance=min(gDistance,d);
  if(d>=0.){gShade=max(gShade,smoothstep(uC.x,0.,d)*uC.y);return;}
  float bev=clamp(uA.y*2.*bevW,2.,uA.z),t=clamp(-d/bev,0.,1.),edge=1.-t,slope=edge*edge;
  gShift+=cmul(n,vec2(cos(uC.z),sin(uC.z)))*min(uA.w,.9*bev)*slope;
  gShift-=(p-pc)*mag;
  vec3 N=normalize(vec3(n*edge*1.4,1.));
  vec3 L1=normalize(vec3(-.45,.6,.66)),L2=normalize(vec3(.5,-.55,.65));
  gLit+=uB.z*(pow(max(dot(N,L1),0.),26.)+.45*pow(max(dot(N,L2),0.),26.))+uB.w*pow(1.-N.z,2.);
  gRim=max(gRim,slope*edge);
  gInside=1.;
}
void main(){
  vec2 frag=gl_FragCoord.xy,h=vec2(.75,0.);float readD=1e9;
  for(int i=0;i<8;i++){
    if(i>=uCount)break;
    vec4 R=uRect[i];float d=sdPanel(frag,R);
    vec4 A=uReadRect[i];if(min(A.z,A.w)>0.)readD=min(readD,sdBox(frag-A.xy,A.zw,0.));
    if(uN.x>-.5&&uMerge[i]>.5)continue;
    vec2 n=vec2(0.);if(d<0.&&d>-uA.z){n=vec2(sdPanel(frag+h.xy,R)-sdPanel(frag-h.xy,R),sdPanel(frag+h.yx,R)-sdPanel(frag-h.yx,R));n/=max(length(n),1e-4);}
    surface(d,n,min(R.z,R.w),R.xy,frag,uB.y);
  }
  if(uN.x>-.5){
    if(uN.x>.5&&min(uHomeRead.z,uHomeRead.w)>0.)readD=min(readD,sdBox(frag-uHomeRead.xy,uHomeRead.zw,0.));
    float d=gooD(frag);
    vec2 n=vec2(0.);if(d<0.&&d>-uA.z){n=vec2(gooD(frag+h.xy)-gooD(frag-h.xy),gooD(frag+h.yx)-gooD(frag-h.yx));n/=max(length(n),1e-4);}
    surface(d,n,min(uL0.z,uL0.w),uL0.xy,frag,0.);
    if(d<0.){
      vec3 panel=panelSample(frag);float blend=clamp(.5+.5*(panel.x-sdLens(frag))/max(uN.w,1e-3),0.,1.);
      gShift-=mix((frag-panel.yz)*uB.y,(frag-uL0.xy)*uL1.w,blend);
    }
  }
  // Reading protects actual foreground coverage, never a dry scene rectangle.
  float optical=1.;
  vec3 c;
  c.r=texture(uScene,(frag+gShift*(1.-uB.x))/uRes).r;
  c.g=texture(uScene,(frag+gShift)/uRes).g;
  c.b=texture(uScene,(frag+gShift*(1.+uB.x))/uRes).b;
  /* Every liquid surface reveals the same admitted interior through its exact
   * shared exterior and optical map, including a merged capillary neck. */
  if(uPreviewReady>0){
    float mask=1.-smoothstep(-1.,1.,gDistance);
    vec4 pr=texture(uPreview,(frag+gShift*(1.-uB.x))/uRes);
    vec4 pg=texture(uPreview,(frag+gShift)/uRes);
    vec4 pb=texture(uPreview,(frag+gShift*(1.+uB.x))/uRes);
    c.r=mix(c.r,pr.r,pr.a*mask);c.g=mix(c.g,pg.g,pg.a*mask);c.b=mix(c.b,pb.b,pb.a*mask);
  }
  c=mix(c,uT.rgb,uT.a*gInside*optical);
  // Both field and body contacts focus only inside the physical drop.
  if(uN.x>-.5&&uN.y>0.&&uForegroundReady>0){
    float focus=(1.-smoothstep(-2.,0.,sdReadingLens(frag)))*uN.y;
    if(focus>0.){vec3 blurred=vec3(0.);float weight=0.;
      for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
        vec2 off=vec2(float(x),float(y))*uH.x*2.2;float w=exp(-float(x*x+y*y)*.45);
        vec2 uv=(frag+gShift+off)/uRes;vec3 sampleColor=texture(uScene,uv).rgb;
        if(uPreviewReady>0){vec4 preview=texture(uPreview,uv);sampleColor=mix(sampleColor,preview.rgb,preview.a);}
        blurred+=sampleColor*w;weight+=w;
      }
      c=mix(c,blurred/weight,focus);
    }
  }
  /* the soft shadow and the rim are printed as ink, not blended: dots forgive pixels, and cost less than a gradient */
  vec3 ink=vec3(.014,.019,.027);
  float shadowInk=gShade*(1.-gInside),rimInk=gRim*.9;
  float k=uH.y;
  c=mix(c*(1.-shadowInk*(1.-k)),ink,dots(frag,shadowInk)*k*.78);
  vec3 paper=vec3(.93,.91,.85);
  c=mix(c,paper,dots(frag+vec2(1.7,.9),rimInk)*k*.5);
  c+=gLit;
  if(uForegroundReady>0&&uN.x>-.5){
    float focus=(1.-smoothstep(-1.,1.,sdReadingLens(frag)))*uN.y;
    vec4 target=texture(uForeground,frag/uRes);c=target.rgb*focus+c*(1.-target.a*focus);
  }
  outColor=vec4(c,1.);
}`;
  const EMPTY_READ_RECTS=new Float32Array(32),EMPTY_MERGE=new Float32Array(8);
  let SCENE=null,GLASS_PG=null,GLASS_OFF=false,labelInk=null,PREVIEW=null,FOREGROUND=null;
  /* SITE COMPOSITE — a site whose body lives in its own canvases may offer shader.composite()
   * returning them in paint order. While glass is active the field draws them into its scene, so the
   * same invariant glass (drop, HUD surfaces, rim) refracts the site's own pixels; the field marks
   * itself data-composite="1" for that frame and the site decides how its originals step back. */
  let COMP=null;const compTex=new Map();
  function compositeSources(){if(typeof shader.composite!=='function')return null;try{const list=shader.composite();return Array.isArray(list)?list.filter(c=>c&&c.width>0&&c.height>0):null}catch(_){return null}}
  function drawComposite(sources,w,h){
    if(!COMP){const vs=`#version 300 es
void main(){vec2 p=gl_VertexID==0?vec2(-1.,-1.):(gl_VertexID==1?vec2(3.,-1.):vec2(-1.,3.));gl_Position=vec4(p,0.,1.);}`,fs=`#version 300 es
precision highp float;uniform sampler2D uSrc;uniform vec2 uRes;out vec4 o;void main(){o=texture(uSrc,gl_FragCoord.xy/uRes);}`;
      const p=gl.createProgram();for(const [t,src] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){const sh=gl.createShader(t);gl.shaderSource(sh,src);gl.compileShader(sh);gl.attachShader(p,sh)}gl.linkProgram(p);
      COMP={p,vao:gl.createVertexArray(),src:gl.getUniformLocation(p,'uSrc'),res:gl.getUniformLocation(p,'uRes')}}
    const unit0=gl.getParameter(gl.ACTIVE_TEXTURE);gl.activeTexture(gl.TEXTURE0);const tex0=gl.getParameter(gl.TEXTURE_BINDING_2D);
    gl.viewport(0,0,w,h);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(COMP.p);gl.bindVertexArray(COMP.vao);gl.uniform1i(COMP.src,0);gl.uniform2f(COMP.res,w,h);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
    for(const c of sources){let t=compTex.get(c);if(!t){t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);compTex.set(c,t)}
      gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);gl.drawArrays(gl.TRIANGLES,0,3)}
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
    gl.disable(gl.BLEND);gl.bindTexture(gl.TEXTURE_2D,tex0);gl.activeTexture(unit0);
  }
  function resetLabelInk(){labelInk?.reset();canvas.dataset.refractedLabels='0'}
  function drawLabelInk(r,w,h,additionalTarget=null,foreground=null){
    const Ink=globalThis.SSSDisplayLabelInk;if(!Ink||!labelHost)return;
    if(!labelInk)labelInk=Ink.create(gl,labelHost);
    canvas.dataset.refractedLabels=labelInk.draw(r,w,h,additionalTarget,foreground)?'1':'0';
  }
  addEventListener('pagehide',()=>{labelInk?.dispose();labelInk=null;disposePreview();disposeForeground()});
  function disposePreview(){if(!PREVIEW)return;gl.deleteFramebuffer(PREVIEW.fb);gl.deleteRenderbuffer(PREVIEW.depth);gl.deleteTexture(PREVIEW.tex);PREVIEW=null}
  function drawPreview(g,fb,r,d,w,h,proj,view,t,base,ms){
    if(!g)return false;
    const k=g.pack.scale,ln=g.snap?.lens,q=g.Gm.PARAMS,footprints=[];
    for(let i=0;i<g.pack.count;i++){const a=g.pack.data.subarray(i*4,i*4+4);footprints.push([a[0]/k,r.height-a[1]/k,a[2]/k,a[3]/k])}
    const home=g.snap?.home;
    if(home){const hp=g.Gm.derive([{rect:home.rect,readRect:home.readRect,inset:home.inset}],r,{width:w,height:h});if(hp.count){const a=hp.data;footprints.push([a[0]/k,r.height-a[1]/k,a[2]/k,a[3]/k])}}
    if(ln)footprints.push([ln.x-r.left,ln.y-r.top,Math.max(ln.hx,ln.hy),Math.max(ln.hx,ln.hy)]);
    /* Bound the existing optical displacement, including independent overlapping
     * surfaces, channel spread, top wave and capillary edge. No source scan. */
    const pad=((q.refract||0)*(1+Math.abs(q.aberr||0))+(q.mag||0)*Math.max(r.width,r.height))*(g.pack.count+1)+(ln?.mag||0)*Math.max(r.width,r.height)+(ln?.smooth||0)+(q.overfillWave||0)+2;
    const candidates=fb.filter(B=>{
      if(placeholder?!B.reveal:typeof B.preview!=='function')return false;
      const center=project(B.pos,r),corners=B.corners.map(v=>project(v.map((x,j)=>B.pos[j]+x),r));
      const radius=Math.max(...corners.map(p=>Math.hypot(p.x-center.x,p.y-center.y)));
      return footprints.some(([x,y,hx,hy])=>Math.abs(center.x-x)<=hx+radius+pad&&Math.abs(center.y-y)<=hy+radius+pad);
    });
    if(!candidates.length)return false;
    const target=gl.getParameter(gl.FRAMEBUFFER_BINDING),texture=gl.getParameter(gl.TEXTURE_BINDING_2D),rb=gl.getParameter(gl.RENDERBUFFER_BINDING);
    try{
      if(!PREVIEW||PREVIEW.w!==w||PREVIEW.h!==h){
        disposePreview();PREVIEW={w,h,fb:gl.createFramebuffer(),depth:gl.createRenderbuffer(),tex:gl.createTexture()};
        gl.bindTexture(gl.TEXTURE_2D,PREVIEW.tex);gl.texStorage2D(gl.TEXTURE_2D,1,gl.RGBA8,w,h);
        for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);
        for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);
        gl.bindFramebuffer(gl.FRAMEBUFFER,PREVIEW.fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,PREVIEW.tex,0);
        gl.bindRenderbuffer(gl.RENDERBUFFER,PREVIEW.depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,w,h);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,PREVIEW.depth);
        if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('preview target incomplete');
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER,PREVIEW.fb);gl.viewport(0,0,w,h);prepareClear();gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      /* The alternate input starts with this frame's complete scene. Empty or
       * failed content retains it; the same foreground ink is applied after
       * the owner draws, keeping labels above both representations. */
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER,SCENE.ms);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,PREVIEW.fb);
      gl.blitFramebuffer(0,0,w,h,0,0,w,h,gl.COLOR_BUFFER_BIT,gl.NEAREST);gl.bindFramebuffer(gl.FRAMEBUFFER,PREVIEW.fb);
      for(const B of candidates){
        try{
          gl.bindFramebuffer(gl.FRAMEBUFFER,PREVIEW.fb);gl.viewport(0,0,w,h);gl.colorMask(true,true,true,true);gl.disable(gl.SCISSOR_TEST);
          if(placeholder&&(typeof B.draw==='function'||typeof B.preview!=='function'))drawBodyGL(B,proj,view,t,base,ms,r,d,w,h,false,true);
          else{
            const previewModel=model(W.orientation,base*t.scale*B.place.k,t.center.map((v,j)=>(v-B.pos[j])/B.place.k));
            if(B.preview({gl,proj,view,model:previewModel,ms,rect:r,viewRect:viewBox(r),dpr:d,lens:null})===false&&PLAIN)drawBodyGL(B,proj,view,t,base,ms,r,d,w,h,true);
          }
        }catch(err){canvas.dataset.previewError=String(err?.message||err);if(PLAIN)drawBodyGL(B,proj,view,t,base,ms,r,d,w,h,true)}
      }
      return true;
    }catch(err){canvas.dataset.previewError=String(err?.message||err);return false}
    finally{gl.bindFramebuffer(gl.FRAMEBUFFER,target);gl.bindRenderbuffer(gl.RENDERBUFFER,rb);gl.bindTexture(gl.TEXTURE_2D,texture);gl.viewport(0,0,w,h)}
  }
  function disposeForeground(){if(!FOREGROUND)return;gl.deleteFramebuffer(FOREGROUND.fb);gl.deleteRenderbuffer(FOREGROUND.depth);gl.deleteTexture(FOREGROUND.tex);FOREGROUND=null}
  function drawForeground(g,fb,r,d,w,h,proj,view,t,base,ms){
    if(!g.snap?.lens?.lock)return false;
    const target=gl.getParameter(gl.FRAMEBUFFER_BINDING),active=gl.getParameter(gl.ACTIVE_TEXTURE),texture=gl.getParameter(gl.TEXTURE_BINDING_2D),rb=gl.getParameter(gl.RENDERBUFFER_BINDING),bind=gl.bindFramebuffer,blend=gl.blendFunc;
    let ready=false;g.targetBody=null;
    try{
      if(!FOREGROUND||FOREGROUND.w!==w||FOREGROUND.h!==h){
        disposeForeground();FOREGROUND={w,h,fb:gl.createFramebuffer(),depth:gl.createRenderbuffer(),tex:gl.createTexture()};
        gl.bindTexture(gl.TEXTURE_2D,FOREGROUND.tex);gl.texStorage2D(gl.TEXTURE_2D,1,gl.RGBA8,w,h);
        for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);
        for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);
        gl.bindFramebuffer(gl.FRAMEBUFFER,FOREGROUND.fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,FOREGROUND.tex,0);
        gl.bindRenderbuffer(gl.RENDERBUFFER,FOREGROUND.depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,w,h);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,FOREGROUND.depth);
        if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('foreground target incomplete');
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER,FOREGROUND.fb);gl.viewport(0,0,w,h);prepareClear();gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      // Owner draws that bind null remain in this isolated target, never the scene.
      gl.bindFramebuffer=function(kind,value){return bind.call(gl,kind,value===null?FOREGROUND.fb:value)};
      // Straight-alpha owner draws need coverage alpha in a transparent target.
      gl.blendFunc=function(src,dst){if(src===gl.SRC_ALPHA&&dst===gl.ONE_MINUS_SRC_ALPHA)gl.blendFuncSeparate(src,dst,gl.ONE,dst);else blend.call(gl,src,dst)};
      worldClip(r,d);const result=globalThis.SSSDisplayLens?.foreground?.(g.snap.lens.lock.id,{fieldId:id,gl,proj,view,model:model(W.orientation,base*t.scale,t.center),ms,width:w,height:h,dpr:d,rect:r,drawBody:bodyId=>{
        const B=fb.find(b=>b.id===bodyId);if(!B)return false;g.targetBody=bodyId;drawBodyGL(B,proj,view,t,base,ms,r,d,w,h);return true;
      }});
      if(Array.isArray(result)){gl.disable(gl.SCISSOR_TEST);drawComposite(result.filter(c=>c?.width>0&&c?.height>0),w,h);ready=true}else ready=result===true;
    }catch(error){canvas.dataset.foregroundError=String(error?.message||error)}
    finally{gl.blendFunc=blend;gl.bindFramebuffer=bind;gl.bindFramebuffer(gl.FRAMEBUFFER,target);gl.bindRenderbuffer(gl.RENDERBUFFER,rb);gl.activeTexture(active);gl.bindTexture(gl.TEXTURE_2D,texture);gl.viewport(0,0,w,h);gl.colorMask(true,true,true,true);gl.depthMask(false);gl.disable(gl.SCISSOR_TEST)}
    return ready;
  }
  function disposeScene(){if(!SCENE)return;gl.deleteFramebuffer(SCENE.ms);gl.deleteFramebuffer(SCENE.res);gl.deleteRenderbuffer(SCENE.rc);gl.deleteRenderbuffer(SCENE.rd);gl.deleteTexture(SCENE.tex);SCENE=null}
  function buildScene(w,h){
    disposeScene();
    const tex0=gl.getParameter(gl.TEXTURE_BINDING_2D),samples=Math.max(0,Math.min(4,gl.getParameter(gl.MAX_SAMPLES)||0));
    const S={w,h,ms:gl.createFramebuffer(),res:gl.createFramebuffer(),rc:gl.createRenderbuffer(),rd:gl.createRenderbuffer(),tex:gl.createTexture()};
    SCENE=S;
    gl.bindRenderbuffer(gl.RENDERBUFFER,S.rc);gl.renderbufferStorageMultisample(gl.RENDERBUFFER,samples,gl.RGBA8,w,h);
    gl.bindRenderbuffer(gl.RENDERBUFFER,S.rd);gl.renderbufferStorageMultisample(gl.RENDERBUFFER,samples,gl.DEPTH_COMPONENT24,w,h);
    gl.bindFramebuffer(gl.FRAMEBUFFER,S.ms);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.RENDERBUFFER,S.rc);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,S.rd);
    const a=gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindTexture(gl.TEXTURE_2D,S.tex);gl.texStorage2D(gl.TEXTURE_2D,1,gl.RGBA8,w,h);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER,S.res);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,S.tex,0);
    const b=gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.bindRenderbuffer(gl.RENDERBUFFER,null);gl.bindTexture(gl.TEXTURE_2D,tex0);
    if(a!==gl.FRAMEBUFFER_COMPLETE||b!==gl.FRAMEBUFFER_COMPLETE)throw new Error('glass scene target incomplete');
    if(!GLASS_PG){
      const p=program(gl,GLASS_FRAGMENT,GLASS_VERTEX);
      GLASS_PG={p,vao:gl.createVertexArray(),U:{scene:gl.getUniformLocation(p,'uScene'),preview:gl.getUniformLocation(p,'uPreview'),previewReady:gl.getUniformLocation(p,'uPreviewReady'),foreground:gl.getUniformLocation(p,'uForeground'),foregroundReady:gl.getUniformLocation(p,'uForegroundReady'),res:gl.getUniformLocation(p,'uRes'),rect:gl.getUniformLocation(p,'uRect[0]'),readRect:gl.getUniformLocation(p,'uReadRect[0]'),merge:gl.getUniformLocation(p,'uMerge[0]'),count:gl.getUniformLocation(p,'uCount'),a:gl.getUniformLocation(p,'uA'),b:gl.getUniformLocation(p,'uB'),c:gl.getUniformLocation(p,'uC'),t:gl.getUniformLocation(p,'uT'),h:gl.getUniformLocation(p,'uH'),home:gl.getUniformLocation(p,'uHome'),homeRead:gl.getUniformLocation(p,'uHomeRead'),l0:gl.getUniformLocation(p,'uL0'),l1:gl.getUniformLocation(p,'uL1'),l2:gl.getUniformLocation(p,'uL2'),n:gl.getUniformLocation(p,'uN')}};
    }
    return S;
  }
  function glassBegin(r,w,h){
    canvas.dataset.glass='0';
    const Gm=globalThis.SSSDisplayGlass;
    if(GLASS_OFF||!Gm||!Gm.enabled())return null;
    const Ln=globalThis.SSSDisplayLens,snap=Ln?Ln.snapshot():null;
    const pack=Gm.rects(r,{width:w,height:h},undefined,snap?.home?.ids||null,snap?.lens);
    if(!pack.count&&!snap)return null;
    try{if(!SCENE||SCENE.w!==w||SCENE.h!==h)buildScene(w,h)}
    catch(err){console.warn('display glass unavailable for '+id,err);GLASS_OFF=true;disposeScene();gl.bindFramebuffer(gl.FRAMEBUFFER,null);return null}
    const native=gl.bindFramebuffer;
    gl.bindFramebuffer=function(target,fb){return native.call(gl,target,fb===null?SCENE.ms:fb)};
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    canvas.dataset.glass=String(pack.count+(snap?1:0));
    return {pack,Gm,snap,r};
  }
  function glassEnd(g,w,h,previewReady=false,foregroundReady=false){
    delete gl.bindFramebuffer;
    const S=SCENE,P=GLASS_PG,q=g.Gm.PARAMS,k=g.pack.scale,tex0=gl.getParameter(gl.TEXTURE_BINDING_2D),unit0=gl.getParameter(gl.ACTIVE_TEXTURE);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER,S.ms);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,S.res);
    gl.blitFramebuffer(0,0,w,h,0,0,w,h,gl.COLOR_BUFFER_BIT,gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,w,h);
    gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,S.tex);
    gl.useProgram(P.p);gl.uniform1i(P.U.scene,0);gl.uniform2f(P.U.res,w,h);gl.uniform4fv(P.U.rect,g.pack.data);gl.uniform4fv(P.U.readRect,g.pack.readData||EMPTY_READ_RECTS);gl.uniform1fv(P.U.merge,g.pack.mergeData||EMPTY_MERGE);gl.uniform1i(P.U.count,g.pack.count);
    gl.activeTexture(gl.TEXTURE1);const tex1=gl.getParameter(gl.TEXTURE_BINDING_2D);gl.bindTexture(gl.TEXTURE_2D,previewReady?PREVIEW.tex:S.tex);gl.uniform1i(P.U.preview,1);gl.uniform1i(P.U.previewReady,previewReady?1:0);gl.activeTexture(gl.TEXTURE0);
    gl.activeTexture(gl.TEXTURE0+2);const tex2=gl.getParameter(gl.TEXTURE_BINDING_2D);gl.bindTexture(gl.TEXTURE_2D,foregroundReady?FOREGROUND.tex:S.tex);gl.uniform1i(P.U.foreground,2);gl.uniform1i(P.U.foregroundReady,foregroundReady?1:0);gl.activeTexture(gl.TEXTURE0);
    const rim=g.pack.inset??q.bevelMax;gl.uniform4f(P.U.a,q.radius*(rim/8)*k,q.bevel,rim*k,q.refract*k);gl.uniform4f(P.U.b,q.aberr,q.mag,q.spec,q.fres);gl.uniform4f(P.U.c,q.shadow*k,q.shadowK,q.theta,0);gl.uniform4f(P.U.t,...q.tint);gl.uniform4f(P.U.h,q.dot*k,q.halftone,(q.overfillWave||0)*k,rim*k);
    {const sn=g.snap,R=g.r;
      if(sn){const Ls=sn.lens,Hm=sn.home,X=x=>(x-R.left)*k,Y=y=>h-(y-R.top)*k;
        gl.uniform4f(P.U.l0,X(Ls.x),Y(Ls.y),Ls.hx*k,Ls.hy*k);gl.uniform4f(P.U.l1,(Ls.rx||0)*k,-(Ls.ry||0)*k,(Ls.reachR||0)*k,Ls.mag||0);gl.uniform4f(P.U.l2,Ls.round===0?(Ls.corner||0)*k+1:0,-(Ls.angle||0),0,Ls.focus||0);
        if(Hm){const hp=g.Gm.derive([{rect:Hm.rect,readRect:Hm.readRect,inset:Hm.inset}],R,{width:w,height:h});gl.uniform4fv(P.U.home,hp.data.subarray(0,4));gl.uniform4fv(P.U.homeRead,hp.readData.subarray(0,4));gl.uniform4f(P.U.n,hp.count?1:0,Ls.protect??(Ls.lock?1:0),Ls.neck*k,Ls.smooth*k)}
        else{gl.uniform4f(P.U.homeRead,0,0,0,0);gl.uniform4f(P.U.home,0,0,1,1);gl.uniform4f(P.U.n,0,Ls.protect??(Ls.lock?1:0),0,Ls.smooth*k)}}
      else gl.uniform4f(P.U.n,-1,0,0,0);}
    gl.bindVertexArray(P.vao);gl.drawArrays(gl.TRIANGLES,0,3);
    gl.bindTexture(gl.TEXTURE_2D,tex0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,tex1);gl.activeTexture(gl.TEXTURE0+2);gl.bindTexture(gl.TEXTURE_2D,tex2);gl.activeTexture(unit0);
  }
  function applyState(){
    const state=shader.state||{};
    if(state.blend){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA)}else gl.disable(gl.BLEND);
    if(state.depthTest===false)gl.disable(gl.DEPTH_TEST);else gl.enable(gl.DEPTH_TEST);
    gl.depthMask(state.depthWrite!==false);
  }
  /* A clear obeys write masks and scissor too. A site's last transparent body,
   * composite or ink pass may leave depth writes off; clear the complete target
   * before applying the next draw's own state, never yesterday's depth. */
  function prepareClear(){
    gl.disable(gl.SCISSOR_TEST);gl.colorMask(true,true,true,true);gl.depthMask(true);gl.clearDepth(1);
  }
  function drawPointsGL(proj,view,mdl,d){
    if(!PG)return;
    prepareClear();gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);
    gl.useProgram(PG.p);gl.uniformMatrix4fv(PG.U.proj,false,proj);gl.uniformMatrix4fv(PG.U.view,false,view);gl.uniformMatrix4fv(PG.U.model,false,mdl);gl.uniform1f(PG.U.pointScale,d);gl.uniform3fv(PG.pal,new Float32Array(colors.flat()));gl.bindVertexArray(PG.vao);gl.drawArrays(gl.POINTS,0,PG.count);
  }
  function drawPoints2D(r){
    if(!ctx||!visible.length)return;
    const ordered=visible.map(rec=>({rec,p:project(rec.world,r)})).sort((a,b)=>a.p.z-b.p.z);
    for(const {rec,p} of ordered){
      const hot=rec.spec.id===selectedPointId||rec.spec.id===hoverPointId,c=colors[geneIndex[rec.spec.gene]??0],rgb=c.map(v=>Math.round(v*255)).join(',');
      ctx.save();ctx.translate(p.x,p.y);ctx.strokeStyle=`rgba(${rgb},${hot?1:.84})`;ctx.fillStyle=`rgba(${rgb},${hot?.42:.24})`;ctx.lineWidth=hot?2:1;
      if(rec.spec.kind==='holon'){const s=hot?7:5;ctx.rotate(Math.PI/4);ctx.strokeRect(-s,-s,s*2,s*2);if(hot)ctx.fillRect(-s+2,-s+2,s*2-4,s*2-4)}
      else{ctx.beginPath();ctx.arc(0,0,hot?5:3.2,0,Math.PI*2);ctx.fill();ctx.stroke()}
      ctx.restore();
    }
  }
  /* Canvas2D carries the same realized body mesh and placement. Its palette paint
   * is a reduced representation; it does not execute identity-owned GLSL/optics. */
  function drawBodies2D(fb,r){
    const faces=[];
    for(const B of fb)for(let i=0;i<B.mesh.length;i+=21){
      const pts=[0,7,14].map(k=>project([0,1,2].map(j=>B.pos[j]+B.mesh[i+k+j]),r));
      faces.push({pts,z:pts.reduce((sum,p)=>sum+p.z,0)/3,color:B.colors[B.mesh[i+6]],alpha:B.fallbackAlpha});
    }
    faces.sort((a,b)=>a.z-b.z);
    for(const {pts,color,alpha} of faces){
      ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);ctx.lineTo(pts[1].x,pts[1].y);ctx.lineTo(pts[2].x,pts[2].y);ctx.closePath();
      ctx.fillStyle=`rgba(${color.map(v=>Math.round(v*255)).join(',')},${alpha})`;ctx.fill();ctx.strokeStyle='rgba(241,239,233,.22)';ctx.stroke();
    }
  }
  function drawBodyGL(B,proj,view,t,base,ms,r,d,w,h,plain=false,inputOnly=false){
    const bs=plain?placeholder.state||{}:B.state;if(bs.blend){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA)}else gl.disable(gl.BLEND);
    if(bs.depthTest===false)gl.disable(gl.DEPTH_TEST);else gl.enable(gl.DEPTH_TEST);gl.depthMask(bs.depthWrite!==false);
    const bm=model(W.orientation,base*t.scale,t.center.map((v,j)=>v-B.pos[j]));
    if(!plain&&typeof B.draw==='function'){
      const target=gl.getParameter(gl.FRAMEBUFFER_BINDING);let drawn=false;
      try{drawn=B.draw({gl,proj,view,drawPlaceholder:PLAIN?()=>drawBodyGL(B,proj,view,t,base,ms,r,d,w,h,true):null,model:model(W.orientation,base*t.scale*B.place.k,t.center.map((v,j)=>(v-B.pos[j])/B.place.k)),projection:B.projection,ms,rect:r,viewRect:viewBox(r),dpr:d,orientation:W.orientation})!==false}
      catch(err){canvas.dataset.bodyError=String(err?.message||err)}
      finally{gl.bindFramebuffer(gl.FRAMEBUFFER,target);gl.viewport(0,0,w,h);gl.colorMask(true,true,true,true);worldClip(r,d)}
      if(drawn)return true;
      if(inputOnly){drawBodyGL(B,proj,view,t,base,ms,r,d,w,h,true);return false;}
      if(bs.blend){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA)}else gl.disable(gl.BLEND);
      if(bs.depthTest===false)gl.disable(gl.DEPTH_TEST);else gl.enable(gl.DEPTH_TEST);gl.depthMask(bs.depthWrite!==false);
    }
    const P=plain?PLAIN:B;gl.useProgram(P.p);gl.uniformMatrix4fv(P.U.proj,false,proj);gl.uniformMatrix4fv(P.U.view,false,view);gl.uniformMatrix4fv(P.U.model,false,bm);
    if(P.U.time)gl.uniform1f(P.U.time,ms*.001);if(P.U.focus)gl.uniform1f(P.U.focus,-1);if(P.U.resolution)gl.uniform2f(P.U.resolution,w,h);if(P.U.pal)gl.uniform3fv(P.U.pal,new Float32Array(B.colors.flat()));
    gl.bindVertexArray(plain?B.plainVAO:B.vao);gl.drawArrays(gl.TRIANGLES,0,B.count);
  }
  function draw(ms){
    if(element.hidden){restDone=false;resetLabelInk();requestAnimationFrame(draw);return}
    if(!restDone){restDone=true;if(Array.isArray(VIEW?.rest)&&VIEW.rest.length===4)W.easeTo?.(VIEW.rest);else W.restoreHome?.()}
    followStep(ms);refreshProjection(ms);refreshVisible();const {r,d,w,h}=resize(),t=target(),cur=container(),focus=cur?(geneIndex[cur[0]]??-1):-1,base=(viewBox(r).width<560?1.42:1.75);
    const proj=fieldProjectionMatrix(r),view=lookAt([0,0,3.2],[0,0,0],[0,1,0]),mdl=model(W.orientation,base*t.scale,t.center);
    const box=viewBox(r);if(labelHost?.style)labelHost.style.clipPath=box.bounded?`inset(${box.y}px ${r.width-box.x-box.width}px ${r.height-box.y-box.height}px ${box.x}px)`:'none';
    updateLabels(r);
    const fb=floatingBodies();
    for(const B of fb)B.pos=driftAt(B.drift,ms);
    canvas.dataset.container=cur||'ε';canvas.dataset.visibleCells=String(cells.length);canvas.dataset.visibleContent=String(visible.length);canvas.dataset.floatingBodies=fb.map(B=>B.id).join(' ');
    for(const [bodyId,n] of bodyLabels)if(!BODIES.get(bodyId)?.active)n.hidden=true;
    for(const B of fb){
      const n=bodyLabel(B),lp=project(B.pos.map((v,j)=>v+N.V0[0][j]*B.place.k*.9),r),size=labelSizes.get(n)||{w:0,h:0};
      const halfW=Math.min(size.w/2+8,r.width/2),halfH=Math.min(size.h/2+8,r.height/2);
      n.hidden=false;n.style.maxWidth=Math.max(1,r.width-16)+'px';n.style.left=Math.max(halfW,Math.min(r.width-halfW,lp.x))+'px';n.style.top=Math.max(halfH,Math.min(r.height-halfH,lp.y))+'px';n.style.zIndex=String(10+Math.round((lp.z+2)*10));
    }
    if(gl&&GL){
      const hv=hostView(),hostClear=hv?.e.shader.clear;
      const clear=Array.isArray(hostClear)&&hostClear.length===4?hostClear:(Array.isArray(shader.clear)&&shader.clear.length===4?shader.clear:[.014,.019,.027,1]);
      const glass=glassBegin(r,w,h);
      gl.viewport(0,0,w,h);prepareClear();gl.clearColor(...clear);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      if(hv){
        const {H}=hv;gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.disable(gl.BLEND);gl.useProgram(H.p);gl.bindVertexArray(H.vao);
        gl.uniform4fv(H.U.quat,new Float32Array(W.orientation));gl.uniform3fv(H.U.center,new Float32Array(hv.center));gl.uniform1f(H.U.span,hv.span);gl.uniform1f(H.U.region,hv.region);
        if(H.U.time)gl.uniform1f(H.U.time,ms*.001);if(H.U.focus)gl.uniform1f(H.U.focus,hv.region);if(H.U.resolution)gl.uniform2f(H.U.resolution,w,h);if(H.U.pal)gl.uniform3fv(H.U.pal,new Float32Array(H.colors.flat()));
        gl.drawArrays(gl.TRIANGLES,0,3);prepareClear();gl.clear(gl.DEPTH_BUFFER_BIT);
        canvas.dataset.hostView=hv.e.hostId;canvas.dataset.hostPath=hv.e.path;
      }else{delete canvas.dataset.hostView;delete canvas.dataset.hostPath}
      worldClip(r,d);applyState();gl.useProgram(GL.p);
      gl.uniformMatrix4fv(GL.U.proj,false,proj);gl.uniformMatrix4fv(GL.U.view,false,view);gl.uniformMatrix4fv(GL.U.model,false,mdl);
      gl.uniform1f(GL.U.time,ms*.001);gl.uniform1f(GL.U.focus,focus);if(GL.U.resolution)gl.uniform2f(GL.U.resolution,w,h);gl.uniform3fv(GL.pal,new Float32Array(colors.flat()));
      if(typeof shader.beforeDraw==='function')shader.beforeDraw({gl,program:GL.p,ms,focus,width:w,height:h,orientation:W.orientation});
      gl.bindVertexArray(GL.vao);gl.drawArrays(gl.TRIANGLES,0,GL.count);
      // Natural bodies remain themselves unless their owner offers a finer draw.
      for(const B of fb)if(!placeholder||!B.reveal)drawBodyGL(B,proj,view,t,base,ms,r,d,w,h);
      // Snapshot the world before plain rich-body covers. Transparent interiors
      // replace those covers rather than accumulating over their opaque paint.
      let previewReady=placeholder?drawPreview(glass,fb,r,d,w,h,proj,view,t,base,ms):false;
      if(placeholder)for(const B of fb)if(B.reveal)drawBodyGL(B,proj,view,t,base,ms,r,d,w,h,true);
      /* SITE LAYER — an identity-owned shader may draw its own layer inside this
       * field's Descent frame (same camera, orientation and container), beneath the
       * point layer. Meaning stays in the site; Display only lends the frame. */
      if(typeof shader.afterDraw==='function'){
        try{shader.afterDraw({gl,proj,view,model:mdl,ms,width:w,height:h,dpr:d,frame:{center:[...t.center],scale:t.scale},following:Boolean(follow),container:cur,orientation:W.orientation,rect:r,viewRect:viewBox(r)})}
        catch(err){if(!canvas.dataset.layerError)console.warn('site layer failed for '+id,err);canvas.dataset.layerError=String(err?.message||err)}
        gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,w,h);
      }
      worldClip(r,d);drawPointsGL(proj,view,mdl,d);gl.disable(gl.SCISSOR_TEST);
      {const comp=glass?compositeSources():null;if(comp?.length)drawComposite(comp,w,h);const on=comp?.length?'1':'0';if(canvas.dataset.composite!==on)canvas.dataset.composite=on}
      if(glass){if(!placeholder)previewReady=drawPreview(glass,fb,r,d,w,h,proj,view,t,base,ms);const sharp=drawForeground(glass,fb,r,d,w,h,proj,view,t,base,ms);drawLabelInk(r,w,h,previewReady?PREVIEW.fb:null,sharp&&glass.targetBody?{framebuffer:FOREGROUND.fb,element:bodyLabels.get(glass.targetBody)}:null);glassEnd(glass,w,h,previewReady,sharp)}else resetLabelInk();
    }else if(ctx){
      resetLabelInk();
      const clear=Array.isArray(shader.clear)&&shader.clear.length>=3?shader.clear:[.014,.019,.027,1],alpha=Number(shader.fallbackAlpha??.12);
      ctx.setTransform(d,0,0,d,0,0);ctx.fillStyle=`rgb(${clear.slice(0,3).map(v=>Math.round(clamp(v)*255)).join(',')})`;ctx.fillRect(0,0,r.width,r.height);
      ctx.save();if(box.bounded){ctx.beginPath();ctx.rect(box.x,box.y,box.width,box.height);ctx.clip()}
      if(alpha>0)for(const cell of cells){const pts=cell.tet.map(p=>project(p,r)),c=colors[geneIndex[cell.path[0]]??0];for(const f of faceIx){ctx.beginPath();ctx.moveTo(pts[f[0]].x,pts[f[0]].y);ctx.lineTo(pts[f[1]].x,pts[f[1]].y);ctx.lineTo(pts[f[2]].x,pts[f[2]].y);ctx.closePath();ctx.fillStyle=`rgba(${c.map(v=>Math.round(v*255)).join(',')},${alpha})`;ctx.fill();ctx.strokeStyle='rgba(241,239,233,.08)';ctx.stroke()}}
      drawBodies2D(fb,r);
      if(typeof shader.afterDraw==='function'){try{shader.afterDraw({gl:null,context2D:ctx,canvas,proj,view,model:mdl,ms,width:w,height:h,dpr:d,frame:{center:[...t.center],scale:t.scale},following:Boolean(follow),container:cur,orientation:W.orientation,rect:r,viewRect:viewBox(r)})}catch(err){canvas.dataset.layerError=String(err?.message||err)}}
      drawPoints2D(r);ctx.restore();
    }
    requestAnimationFrame(draw)
  }
  const hasPoints=pointRecords.length>0||typeof shader.snapshot==='function';
  canvas.dataset.backgroundDrag=draggable?'true':'false';
  {
    canvas.style.pointerEvents='auto';
    canvas.style.cursor=draggable?'grab':'default';
    canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;down={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};try{canvas.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault()});
    canvas.addEventListener('pointermove',e=>{
      const r=canvas.getBoundingClientRect();
      if(down&&down.id===e.pointerId){
        const dx=e.clientX-down.x,dy=e.clientY-down.y;
        if(Math.hypot(dx,dy)>2)down.moved=true;
        if(down.moved){setHover('');updateTooltip(null,r)}
        if(draggable){W.rotateBy(dx,dy,'interlocutor:'+id);down.x=e.clientX;down.y=e.clientY;e.preventDefault();return}
        if(down.moved){e.preventDefault();return}
      }
      if(!down&&hasPoints){const hp=hitPoint(e.clientX-r.left,e.clientY-r.top,r);setHover(hp?.rec.spec.id||'');updateTooltip(hp,r);canvas.style.cursor=hp?'pointer':(draggable?'grab':'default')}
    });
    canvas.addEventListener('pointerleave',()=>{if(!down){setHover('');if(tooltip)tooltip.hidden=true;canvas.style.cursor=draggable?'grab':'default'}});
    const end=e=>{
      if(!down||down.id!==e.pointerId)return;const wasMoved=down.moved;down=null;try{if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId)}catch(_){}
      if(!wasMoved){
        const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,hp=hasPoints?hitPoint(x,y,r):null;
        const body=hp?'':hitBody(x,y,r);if(body)enterBody(body,{x:e.clientX,y:e.clientY});else if(hp?.rec.pool)descendTo(hp.rec.path,'pool:'+id);else if(hp)selectPoint(hp.rec.spec.id,true);else{const path=hitChild(x,y,r);if(path)descendTo(path,'descent:'+id);else ascend('ascent:'+id)}
      }
      canvas.style.cursor=draggable?'grab':'default';e.preventDefault()
    };
    canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
  }
  requestAnimationFrame(draw);
  api=Object.freeze({presentationRect:()=>viewBox(canvas.getBoundingClientRect()),
    id,shaderId:shader.id,element,canvas,get projection(){return projection},palette,inspectable,draggable,interactive:inspectable,localScope,
    selectPoint,projectAddressCenter,projectBody,get container(){return container()},approachBody(bodyId){const B=BODIES.get(bodyId);if(!B?.active)return false;cam={from:currentFrame(),to:{center:[...B.pos],scale:1/B.place.k},start:performance.now()};return true},arriveFrom(place,bodyId){const B=place&&bodyId&&BODIES.get(bodyId),c=B?.pos||place?.center;cam={from:place?{center:[...c],scale:1/place.k}:currentFrame(),to:frameFor(container()),start:performance.now()}},get walk(){return [...walk]},descendTo,ascend,
    hitAddressFace(clientX,clientY){const r=canvas.getBoundingClientRect();return hitFace(clientX-r.left,clientY-r.top,r)},
    get selectedPointId(){return selectedPointId},
    get points(){return pointRecords.map(p=>p.spec)},
    pulse(){element.dataset.pulse='true';setTimeout(()=>delete element.dataset.pulse,500)}
  });
  shaders.set(id,api);return api;
}
function get(id){return shaders.get(id)||null}
globalThis.SSSInterlocutorFields=Object.freeze({create,get,paletteSet,placement});
})();
