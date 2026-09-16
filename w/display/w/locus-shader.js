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
function program(gl,fragment){const p=gl.createProgram();gl.attachShader(p,compile(gl,gl.VERTEX_SHADER,VERTEX));gl.attachShader(p,compile(gl,gl.FRAGMENT_SHADER,fragment));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p}
function pointProgram(gl){const p=gl.createProgram();gl.attachShader(p,compile(gl,gl.VERTEX_SHADER,POINT_VERTEX));gl.attachShader(p,compile(gl,gl.FRAGMENT_SHADER,POINT_FRAGMENT));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p}
function geometry(structure){const data=[];function tri(a,b,c,region){const no=nrm(cross(sub(b,a),sub(c,a)));for(const v of [a,b,c])data.push(...v,...no,region)}for(const cell of structure.leaves){const r=geneIndex[cell.path[0]]??0;for(const f of faceIx)tri(cell.tet[f[0]],cell.tet[f[1]],cell.tet[f[2]],r)}return new Float32Array(data)}
function nodeAt(root,path){let n=root;for(const g of path){n=n?.children?.[g];if(!n)return null}return n}
function shaderContract(shader){
  if(!shader||typeof shader!=='object'||typeof shader.id!=='string'||!shader.id) throw new Error('identity-owned shader required');
  if(typeof shader.fragment!=='string'||!shader.fragment.includes('void main')) throw new Error('shader fragment body missing: '+shader.id);
  return shader;
}
function hash32(text){
  let h=2166136261>>>0;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)>>>0}
  h^=h>>>16;h=Math.imul(h,0x7feb352d)>>>0;h^=h>>>15;h=Math.imul(h,0x846ca68b)>>>0;h^=h>>>16;
  return h>>>0;
}
function random01(text,salt){return (hash32(text+'·'+salt)+1)/4294967297}
function pointInTet(tet,spec){
  let weights=[0,1,2,3].map(i=>-Math.log(Math.max(1e-7,random01(spec.id,i))));
  const s=weights.reduce((a,b)=>a+b,0);weights=weights.map(v=>v/s);
  const inset=spec.kind==='holon'?.40:.22;
  weights=weights.map(v=>(1-inset)*v+inset*.25);
  return [0,1,2].map(k=>weights.reduce((sum,w,i)=>sum+w*tet[i][k],0));
}
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
    if(!raw||typeof raw.id!=='string'||seen.has(raw.id)||!geneIndex.hasOwnProperty(raw.gene))continue;
    const cell=byGene.get(raw.gene);if(!cell)continue;seen.add(raw.id);
    const spec=Object.freeze({...raw});
    out.push({spec,world:pointInTet(cell.tet,spec)});
  }
  return out;
}
function create({id,element,canvas,labelHost,projection,palette,shader,interactive=false,localScope}){
  if(!element||!canvas||!projection?.root)throw new Error('interlocutor field surface incomplete: '+id);
  const module=globalThis.SSSInterlocutorModules instanceof Map?globalThis.SSSInterlocutorModules.get(id):null;
  shader=shaderContract(shader||module?.shader);
  const structure=N.collectStructure(projection.root),colors=paletteSet(palette),pointRecords=fieldPointRecords(structure,projection),pointById=new Map(pointRecords.map(p=>[p.spec.id,p]));
  if(typeof shader.decorate==='function')shader.decorate({id,element,canvas,labelHost,projection,localScope});
  const gl=canvas.getContext('webgl2',{antialias:true,alpha:false,premultipliedAlpha:false});
  let GL=null,PG=null;
  if(gl){
    const p=program(gl,shader.fragment),vao=gl.createVertexArray(),buf=gl.createBuffer();
    gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    const data=geometry(structure);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
    const stride=7*4;
    for(const [name,size,off] of [['aPos',3,0],['aNormal',3,12],['aRegion',1,24]]){const loc=gl.getAttribLocation(p,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,stride,off)}
    GL={p,vao,count:data.length/7,U:{proj:gl.getUniformLocation(p,'uProj'),view:gl.getUniformLocation(p,'uView'),model:gl.getUniformLocation(p,'uModel'),time:gl.getUniformLocation(p,'uTime'),focus:gl.getUniformLocation(p,'uFocus'),resolution:gl.getUniformLocation(p,'uResolution')},pal:gl.getUniformLocation(p,'uPalette[0]')};
    if(pointRecords.length){
      const pp=pointProgram(gl),pvao=gl.createVertexArray(),pbuf=gl.createBuffer();
      gl.bindVertexArray(pvao);gl.bindBuffer(gl.ARRAY_BUFFER,pbuf);
      const pstride=6*4;
      for(const [name,size,off] of [['aPos',3,0],['aRegion',1,12],['aKind',1,16],['aHot',1,20]]){const loc=gl.getAttribLocation(pp,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,pstride,off)}
      PG={p:pp,vao:pvao,buf:pbuf,count:pointRecords.length,U:{proj:gl.getUniformLocation(pp,'uProj'),view:gl.getUniformLocation(pp,'uView'),model:gl.getUniformLocation(pp,'uModel'),pointScale:gl.getUniformLocation(pp,'uPointScale')},pal:gl.getUniformLocation(pp,'uPalette[0]')};
    }
  }
  const ctx=!gl?canvas.getContext('2d'):null;
  if(labelHost){labelHost.replaceChildren();for(const g of N.GENES){const n=document.createElement('div');n.className='field-label';n.dataset.gene=g;const node=nodeAt(projection.root,g);n.innerHTML=`<span>${g}</span><b>${node?.en||node?.noun||g}</b>`;labelHost.append(n)}}
  let selectedPointId='',hoverPointId='',down=null,api=null;
  let tooltip=null;
  if(pointRecords.length){
    tooltip=document.createElement('div');tooltip.className='field-point-tooltip';tooltip.hidden=true;tooltip.setAttribute('role','status');tooltip.setAttribute('aria-live','polite');
    const tid=document.createElement('span');tid.className='field-point-tooltip-id';
    const ttl=document.createElement('strong');ttl.className='field-point-tooltip-title';
    const tmeta=document.createElement('span');tmeta.className='field-point-tooltip-meta';
    tooltip.append(tid,ttl,tmeta);element.append(tooltip);
  }
  function pointData(){
    const data=[];
    for(const p of pointRecords){
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
  function target(){const path=W.scopeId===localScope?W.view:'';return N.focusTarget(structure,path)}
  function project(point,rect){const t=target(),q=qRot(W.orientation,sub(point,t.center)),scale=(rect.width<560?1.42:1.75)*t.scale,camZ=3.2,z=camZ-q[2]*scale,f=(rect.height/2)/Math.tan(Math.PI/6.6);return {x:rect.width/2+q[0]*scale*f/z,y:rect.height/2-q[1]*scale*f/z,z:q[2]}}
  function hit(x,y,rect){let best=null;for(const a of structure.addresses){const p=project(a.point,rect),d=Math.hypot(x-p.x,y-p.y),limit=Math.max(26,34-a.path.length*2);if(d<limit&&(!best||d<best.d))best={a,d}}return best?.a?.path||''}
  function hitPoint(x,y,rect){
    let best=null;
    for(const rec of pointRecords){
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
  function updateLabels(){if(!labelHost||element.hidden)return;const r=canvas.getBoundingClientRect();for(const n of labelHost.querySelectorAll('.field-label')){const a=N.addressRecord(structure,n.dataset.gene);if(!a){n.hidden=true;continue}const p=project(a.point,r);n.hidden=false;n.style.left=p.x+'px';n.style.top=p.y+'px';n.style.opacity=p.z<-.12?'.32':'.82'}}
  function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.5),w=Math.max(1,Math.floor(r.width*d)),h=Math.max(1,Math.floor(r.height*d));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}return {r,d,w,h}}
  function applyState(){
    const state=shader.state||{};
    if(state.blend){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA)}else gl.disable(gl.BLEND);
    if(state.depthTest===false)gl.disable(gl.DEPTH_TEST);else gl.enable(gl.DEPTH_TEST);
    gl.depthMask(state.depthWrite!==false);
  }
  function drawPointsGL(proj,view,mdl,d){
    if(!PG)return;
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);
    gl.useProgram(PG.p);gl.uniformMatrix4fv(PG.U.proj,false,proj);gl.uniformMatrix4fv(PG.U.view,false,view);gl.uniformMatrix4fv(PG.U.model,false,mdl);gl.uniform1f(PG.U.pointScale,d);gl.uniform3fv(PG.pal,new Float32Array(colors.flat()));gl.bindVertexArray(PG.vao);gl.drawArrays(gl.POINTS,0,PG.count);
  }
  function drawPoints2D(r){
    if(!ctx||!pointRecords.length)return;
    const ordered=pointRecords.map(rec=>({rec,p:project(rec.world,r)})).sort((a,b)=>a.p.z-b.p.z);
    for(const {rec,p} of ordered){
      const hot=rec.spec.id===selectedPointId||rec.spec.id===hoverPointId,c=colors[geneIndex[rec.spec.gene]??0],rgb=c.map(v=>Math.round(v*255)).join(',');
      ctx.save();ctx.translate(p.x,p.y);ctx.strokeStyle=`rgba(${rgb},${hot?1:.84})`;ctx.fillStyle=`rgba(${rgb},${hot?.42:.24})`;ctx.lineWidth=hot?2:1;
      if(rec.spec.kind==='holon'){const s=hot?7:5;ctx.rotate(Math.PI/4);ctx.strokeRect(-s,-s,s*2,s*2);if(hot)ctx.fillRect(-s+2,-s+2,s*2-4,s*2-4)}
      else{ctx.beginPath();ctx.arc(0,0,hot?5:3.2,0,Math.PI*2);ctx.fill();ctx.stroke()}
      ctx.restore();
    }
  }
  function draw(ms){
    if(element.hidden){requestAnimationFrame(draw);return}
    const {r,d,w,h}=resize(),t=target(),focus=W.scopeId===localScope&&W.view?(geneIndex[W.view[0]]??-1):-1;
    const proj=perspective(Math.PI/3.3,w/h,.1,20),view=lookAt([0,0,3.2],[0,0,0],[0,1,0]),mdl=model(W.orientation,(r.width<560?1.42:1.75)*t.scale,t.center);
    if(gl&&GL){
      const clear=Array.isArray(shader.clear)&&shader.clear.length===4?shader.clear:[.014,.019,.027,1];
      gl.viewport(0,0,w,h);gl.clearColor(...clear);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);applyState();gl.useProgram(GL.p);
      gl.uniformMatrix4fv(GL.U.proj,false,proj);gl.uniformMatrix4fv(GL.U.view,false,view);gl.uniformMatrix4fv(GL.U.model,false,mdl);
      gl.uniform1f(GL.U.time,ms*.001);gl.uniform1f(GL.U.focus,focus);if(GL.U.resolution)gl.uniform2f(GL.U.resolution,w,h);gl.uniform3fv(GL.pal,new Float32Array(colors.flat()));
      if(typeof shader.beforeDraw==='function')shader.beforeDraw({gl,program:GL.p,ms,focus,width:w,height:h,orientation:W.orientation});
      gl.bindVertexArray(GL.vao);gl.drawArrays(gl.TRIANGLES,0,GL.count);
      drawPointsGL(proj,view,mdl,d);
    }else if(ctx){
      const clear=Array.isArray(shader.clear)&&shader.clear.length>=3?shader.clear:[.014,.019,.027,1],alpha=Number(shader.fallbackAlpha??.12);
      ctx.setTransform(d,0,0,d,0,0);ctx.fillStyle=`rgb(${clear.slice(0,3).map(v=>Math.round(clamp(v)*255)).join(',')})`;ctx.fillRect(0,0,r.width,r.height);
      for(const cell of structure.leaves){const pts=cell.tet.map(p=>project(p,r)),c=colors[geneIndex[cell.path[0]]??0];for(const f of faceIx){ctx.beginPath();ctx.moveTo(pts[f[0]].x,pts[f[0]].y);ctx.lineTo(pts[f[1]].x,pts[f[1]].y);ctx.lineTo(pts[f[2]].x,pts[f[2]].y);ctx.closePath();ctx.fillStyle=`rgba(${c.map(v=>Math.round(v*255)).join(',')},${alpha})`;ctx.fill();ctx.strokeStyle='rgba(241,239,233,.08)';ctx.stroke()}}
      drawPoints2D(r);
    }
    updateLabels();requestAnimationFrame(draw)
  }
  const hasPoints=pointRecords.length>0;
  if(interactive||hasPoints){
    canvas.style.pointerEvents='auto';
    canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;down={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};try{canvas.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault()});
    canvas.addEventListener('pointermove',e=>{
      const r=canvas.getBoundingClientRect();
      if(down&&down.id===e.pointerId&&interactive){
        const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.hypot(dx,dy)>2)down.moved=true;if(down.moved){setHover('');updateTooltip(null,r)}
        W.rotateBy(dx,dy,'interlocutor:'+id);down.x=e.clientX;down.y=e.clientY;e.preventDefault();return;
      }
      if(!down&&hasPoints){const hp=hitPoint(e.clientX-r.left,e.clientY-r.top,r);setHover(hp?.rec.spec.id||'');updateTooltip(hp,r);canvas.style.cursor=hp?'pointer':(interactive?'grab':'default')}
    });
    canvas.addEventListener('pointerleave',()=>{if(!down){setHover('');if(tooltip)tooltip.hidden=true}});
    const end=e=>{
      if(!down||down.id!==e.pointerId)return;const wasMoved=down.moved;down=null;try{if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId)}catch(_){}
      if(!wasMoved){
        const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,hp=hasPoints?hitPoint(x,y,r):null;
        if(hp)selectPoint(hp.rec.spec.id,true);else if(interactive){const path=hit(x,y,r);if(path)W.inspect(path,'background:'+id)}
      }
      e.preventDefault()
    };
    canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
  }else canvas.style.pointerEvents='none';
  requestAnimationFrame(draw);
  api=Object.freeze({
    id,shaderId:shader.id,element,canvas,projection,palette,interactive,localScope,
    selectPoint,get selectedPointId(){return selectedPointId},
    get points(){return pointRecords.map(p=>p.spec)},
    pulse(){element.dataset.pulse='true';setTimeout(()=>delete element.dataset.pulse,500)}
  });
  shaders.set(id,api);return api;
}
function get(id){return shaders.get(id)||null}
globalThis.SSSInterlocutorFields=Object.freeze({create,get});
})();
