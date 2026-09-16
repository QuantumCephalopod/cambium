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
const VERTEX=`#version 300 es\nprecision highp float;in vec3 aPos;in vec3 aNormal;in float aRegion;uniform mat4 uProj,uView,uModel;out vec3 vN;out vec3 vW;out float vRegion;void main(){vec4 w=uModel*vec4(aPos,1.);vW=w.xyz;vN=mat3(uModel)*aNormal;vRegion=aRegion;gl_Position=uProj*uView*w;}`;
function program(gl,fragment){const p=gl.createProgram();gl.attachShader(p,compile(gl,gl.VERTEX_SHADER,VERTEX));gl.attachShader(p,compile(gl,gl.FRAGMENT_SHADER,fragment));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p}
function geometry(structure){const data=[];function tri(a,b,c,region){const no=nrm(cross(sub(b,a),sub(c,a)));for(const v of [a,b,c])data.push(...v,...no,region)}for(const cell of structure.leaves){const r=geneIndex[cell.path[0]]??0;for(const f of faceIx)tri(cell.tet[f[0]],cell.tet[f[1]],cell.tet[f[2]],r)}return new Float32Array(data)}
function nodeAt(root,path){let n=root;for(const g of path){n=n?.children?.[g];if(!n)return null}return n}
function shaderContract(shader){
  if(!shader||typeof shader!=='object'||typeof shader.id!=='string'||!shader.id) throw new Error('identity-owned shader required');
  if(typeof shader.fragment!=='string'||!shader.fragment.includes('void main')) throw new Error('shader fragment body missing: '+shader.id);
  return shader;
}
function create({id,element,canvas,labelHost,projection,palette,shader,interactive=false,localScope}){
  if(!element||!canvas||!projection?.root)throw new Error('interlocutor field surface incomplete: '+id);
  shader=shaderContract(shader||(globalThis.SSSInterlocutorModules instanceof Map?globalThis.SSSInterlocutorModules.get(id)?.shader:null));
  const structure=N.collectStructure(projection.root),colors=paletteSet(palette);
  if(typeof shader.decorate==='function')shader.decorate({id,element,canvas,labelHost,projection,localScope});
  const gl=canvas.getContext('webgl2',{antialias:true,alpha:false,premultipliedAlpha:false});
  let GL=null;
  if(gl){
    const p=program(gl,shader.fragment),vao=gl.createVertexArray(),buf=gl.createBuffer();
    gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    const data=geometry(structure);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
    const stride=7*4;
    for(const [name,size,off] of [['aPos',3,0],['aNormal',3,12],['aRegion',1,24]]){const loc=gl.getAttribLocation(p,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,stride,off)}
    GL={p,vao,count:data.length/7,U:{proj:gl.getUniformLocation(p,'uProj'),view:gl.getUniformLocation(p,'uView'),model:gl.getUniformLocation(p,'uModel'),time:gl.getUniformLocation(p,'uTime'),focus:gl.getUniformLocation(p,'uFocus'),resolution:gl.getUniformLocation(p,'uResolution')},pal:gl.getUniformLocation(p,'uPalette[0]')};
  }
  const ctx=!gl?canvas.getContext('2d'):null;
  if(labelHost){labelHost.replaceChildren();for(const g of N.GENES){const n=document.createElement('div');n.className='field-label';n.dataset.gene=g;const node=nodeAt(projection.root,g);n.innerHTML=`<span>${g}</span><b>${node?.en||node?.noun||g}</b>`;labelHost.append(n)}}
  let down=null;
  function target(){const path=W.scopeId===localScope?W.view:'';return N.focusTarget(structure,path)}
  function project(point,rect){const t=target(),q=qRot(W.orientation,sub(point,t.center)),scale=(rect.width<560?1.42:1.75)*t.scale,camZ=3.2,z=camZ-q[2]*scale,f=(rect.height/2)/Math.tan(Math.PI/6.6);return {x:rect.width/2+q[0]*scale*f/z,y:rect.height/2-q[1]*scale*f/z,z:q[2]}}
  function hit(x,y,rect){let best=null;for(const a of structure.addresses){const p=project(a.point,rect),d=Math.hypot(x-p.x,y-p.y),limit=Math.max(26,34-a.path.length*2);if(d<limit&&(!best||d<best.d))best={a,d}}return best?.a?.path||''}
  function updateLabels(){if(!labelHost||element.hidden)return;const r=canvas.getBoundingClientRect();for(const n of labelHost.querySelectorAll('.field-label')){const a=N.addressRecord(structure,n.dataset.gene);if(!a){n.hidden=true;continue}const p=project(a.point,r);n.hidden=false;n.style.left=p.x+'px';n.style.top=p.y+'px';n.style.opacity=p.z<-.12?'.32':'.82'}}
  function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.5),w=Math.max(1,Math.floor(r.width*d)),h=Math.max(1,Math.floor(r.height*d));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}return {r,d,w,h}}
  function applyState(){
    const state=shader.state||{};
    if(state.blend){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA)}else gl.disable(gl.BLEND);
    if(state.depthTest===false)gl.disable(gl.DEPTH_TEST);else gl.enable(gl.DEPTH_TEST);
    gl.depthMask(state.depthWrite!==false);
  }
  function draw(ms){
    if(element.hidden){requestAnimationFrame(draw);return}
    const {r,d,w,h}=resize(),t=target(),focus=W.scopeId===localScope&&W.view?(geneIndex[W.view[0]]??-1):-1;
    if(gl&&GL){
      const clear=Array.isArray(shader.clear)&&shader.clear.length===4?shader.clear:[.014,.019,.027,1];
      gl.viewport(0,0,w,h);gl.clearColor(...clear);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);applyState();gl.useProgram(GL.p);
      gl.uniformMatrix4fv(GL.U.proj,false,perspective(Math.PI/3.3,w/h,.1,20));gl.uniformMatrix4fv(GL.U.view,false,lookAt([0,0,3.2],[0,0,0],[0,1,0]));gl.uniformMatrix4fv(GL.U.model,false,model(W.orientation,(r.width<560?1.42:1.75)*t.scale,t.center));
      gl.uniform1f(GL.U.time,ms*.001);gl.uniform1f(GL.U.focus,focus);if(GL.U.resolution)gl.uniform2f(GL.U.resolution,w,h);gl.uniform3fv(GL.pal,new Float32Array(colors.flat()));
      if(typeof shader.beforeDraw==='function')shader.beforeDraw({gl,program:GL.p,ms,focus,width:w,height:h,orientation:W.orientation});
      gl.bindVertexArray(GL.vao);gl.drawArrays(gl.TRIANGLES,0,GL.count);
    }else if(ctx){
      const clear=Array.isArray(shader.clear)&&shader.clear.length>=3?shader.clear:[.014,.019,.027,1],alpha=Number(shader.fallbackAlpha??.12);
      ctx.setTransform(d,0,0,d,0,0);ctx.fillStyle=`rgb(${clear.slice(0,3).map(v=>Math.round(clamp(v)*255)).join(',')})`;ctx.fillRect(0,0,r.width,r.height);
      for(const cell of structure.leaves){const pts=cell.tet.map(p=>project(p,r)),c=colors[geneIndex[cell.path[0]]??0];for(const f of faceIx){ctx.beginPath();ctx.moveTo(pts[f[0]].x,pts[f[0]].y);ctx.lineTo(pts[f[1]].x,pts[f[1]].y);ctx.lineTo(pts[f[2]].x,pts[f[2]].y);ctx.closePath();ctx.fillStyle=`rgba(${c.map(v=>Math.round(v*255)).join(',')},${alpha})`;ctx.fill();ctx.strokeStyle='rgba(241,239,233,.08)';ctx.stroke()}}
    }
    updateLabels();requestAnimationFrame(draw)
  }
  if(interactive){
    canvas.style.pointerEvents='auto';
    canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;down={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};try{canvas.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault()});
    canvas.addEventListener('pointermove',e=>{if(!down||down.id!==e.pointerId)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.hypot(dx,dy)>2)down.moved=true;W.rotateBy(dx,dy,'interlocutor:'+id);down.x=e.clientX;down.y=e.clientY;e.preventDefault()});
    const end=e=>{if(!down||down.id!==e.pointerId)return;const wasMoved=down.moved;down=null;try{if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId)}catch(_){}if(!wasMoved&&W.scopeId===localScope){const r=canvas.getBoundingClientRect(),path=hit(e.clientX-r.left,e.clientY-r.top,r);if(path)W.inspect(path,'background:'+id)}e.preventDefault()};
    canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
  }else canvas.style.pointerEvents='none';
  requestAnimationFrame(draw);
  const api=Object.freeze({id,shaderId:shader.id,element,canvas,projection,palette,interactive,localScope,pulse(){element.dataset.pulse='true';setTimeout(()=>delete element.dataset.pulse,500)}});
  shaders.set(id,api);return api;
}
function get(id){return shaders.get(id)||null}
globalThis.SSSInterlocutorFields=Object.freeze({create,get});
})();
