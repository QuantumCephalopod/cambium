/* The existing four face tracks carry repeated instances of ONE tetrahedron.
 * Shared Crawlerbait density/ink material prints their union as plain black. */
(function(root,factory){const G=typeof module==='object'&&module.exports?require('../w/goo-material.js'):root.SSSGooMaterial;const api=factory(root,G);if(typeof module==='object'&&module.exports)module.exports=api;else root.SSSSiteFoldParticles=api;})(typeof globalThis==='object'?globalThis:this,function(root,G){
'use strict';
const LIMIT=2048,MAX_SIDE=1024;
const V=[[-1,-1,1],[1,-1,-1],[-1,1,-1],[1,1,1]],F=[[0,1,2],[0,3,1],[0,2,3],[1,3,2]];
const MESH=new Float32Array(F.flatMap(face=>face.flatMap(i=>V[i].map(x=>x/Math.sqrt(3)))));
const VERTEX=`#version 300 es
precision highp float;
layout(location=0) in vec3 aVertex;layout(location=1) in vec4 aBody;layout(location=2) in vec2 aFlow;
uniform vec2 uRes;uniform float uProgress,uTime;uniform vec2 uTracks[4];out vec2 vLocal;
void main(){float p=clamp((uProgress-aFlow.y*.3)/.7,0.,1.);int side=int(aFlow.x);float distance=side==0?aBody.y:(side==1?uRes.x-aBody.x:(side==2?uRes.y-aBody.y:aBody.x));vec2 shift=uTracks[side]*max(0.,distance+aBody.z*1.4)*(1.-p);
 float angle=aBody.w+uTime*.3,ca=cos(angle),sa=sin(angle);vec3 q=aVertex;float tilt=.55+aFlow.y; q.yz=mat2(cos(tilt),-sin(tilt),sin(tilt),cos(tilt))*q.yz;q.xy=mat2(ca,-sa,sa,ca)*q.xy;
 float radius=aBody.z*(.18+.82*p*p*p)*smoothstep(0.,.12,p);vec2 jitter=vec2(sin(uTime*1.7+aBody.w),cos(uTime*1.3+aBody.w))*(1.-p)*aBody.z*.6;
 vec2 centre=aBody.xy+shift+jitter,px=centre+q.xy*radius;vLocal=q.xy;vec2 n=px/uRes*2.-1.;gl_Position=vec4(n.x,-n.y,0.,1.);
}`;
const DENSITY=`#version 300 es
precision highp float;in vec2 vLocal;out vec4 o;
${G.densityGLSL}
void main(){float r2=dot(vLocal,vLocal);if(r2>1.)discard;float f=gooDensity(r2);o=vec4(f,0.,f,0.);}`;
function ease(t){if(t<=0)return 0;if(t>=1)return 1;t=Math.max(0,Math.min(1,t));let lo=0,hi=1,s=t;for(let i=0;i<14;i++){s=(lo+hi)/2;const x=3*(1-s)*(1-s)*s*.76+3*(1-s)*s*s*.24+s*s*s;if(x<t)lo=s;else hi=s;}return 3*(1-s)*s*s+s*s*s;}
function layout(width,height,origin={x:width/2,y:height/2}){
 let step=Math.max(24,Math.sqrt(width*height/1000)),nx,ny;do{nx=Math.ceil(width/step)+4;ny=Math.ceil(height/step)+4;if(nx*ny>LIMIT)step*=1.1;}while(nx*ny>LIMIT);
 const x=Math.max(0,Math.min(width,origin.x)),y=Math.max(0,Math.min(height,origin.y)),data=new Float32Array(nx*ny*6);let k=0;
 for(let j=-2;j<ny-2;j++)for(let i=-2;i<nx-2;i++){
  let hash=Math.imul(i+11,73856093)^Math.imul(j+17,19349663);hash=Math.imul(hash^(hash>>>16),0x7feb352d);hash=Math.imul(hash^(hash>>>15),0x846ca68b);const seed=((hash^(hash>>>16))>>>0)/4294967296;
  const px=(i+.5+(seed-.5)*.6)*step,py=(j+.5+((seed*29.37)%1-.5)*.6)*step,dx=px-x,dy=py-y,tx=dx>=0?(width-x)/Math.max(dx,1e-6):x/Math.max(-dx,1e-6),ty=dy>=0?(height-y)/Math.max(dy,1e-6):y/Math.max(-dy,1e-6);
  const facet=tx<ty?(dx>=0?1:3):(dy>=0?2:0);
  data[k++]=px;data[k++]=py;data[k++]=step*3;data[k++]=seed*Math.PI*2;data[k++]=facet;data[k++]=seed;
 }
 return {data,count:k/6,step,width,height,origin:{x,y},tracks:new Float32Array([0,-1,1,0,0,1,-1,0])};
}
function create(layer){
 const doc=layer?.ownerDocument||root.document;if(!doc?.createElement)return null;
 const canvas=doc.createElement('canvas');canvas.className='fold-particles';canvas.setAttribute('aria-hidden','true');layer.appendChild(canvas);
 let gl=null,resources=null,plan=null,epoch=0,current=0,raf=0,disposed=false,active=null;
 const request=root.requestAnimationFrame?.bind(root),cancel=root.cancelAnimationFrame?.bind(root),clock=()=>root.performance?.now?.()??Date.now();
 function cleanup(){if(!gl||!resources)return;const R=resources;for(const p of R.programs)gl.deleteProgram(p);gl.deleteVertexArray(R.vao);gl.deleteBuffer(R.mesh);gl.deleteBuffer(R.instances);gl.deleteTexture(R.tex);gl.deleteFramebuffer(R.fb);resources=null;}
 function init(){
  try{gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,powerPreference:'low-power'});if(!gl||!G)throw Error('WebGL material unavailable');
   const compile=(type,src)=>{const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;};
   const program=(vs,fs)=>{const p=gl.createProgram(),v=compile(gl.VERTEX_SHADER,vs),f=compile(gl.FRAGMENT_SHADER,fs);gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;};
   const body=program(VERTEX,DENSITY),ink=program(G.screenVertex,G.blackInkFragment),u=(p,n)=>gl.getUniformLocation(p,n);
   resources={programs:[body,ink],body,ink,vao:gl.createVertexArray(),mesh:gl.createBuffer(),instances:gl.createBuffer(),tex:gl.createTexture(),fb:gl.createFramebuffer(),w:0,h:0,U:{res:u(body,'uRes'),progress:u(body,'uProgress'),time:u(body,'uTime'),tracks:u(body,'uTracks[0]'),src:u(ink,'tGoo'),inkRes:u(ink,'uRes'),texel:u(ink,'uTexel')}};
   const R=resources;gl.bindVertexArray(R.vao);gl.bindBuffer(gl.ARRAY_BUFFER,R.mesh);gl.bufferData(gl.ARRAY_BUFFER,MESH,gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,12,0);
   gl.bindBuffer(gl.ARRAY_BUFFER,R.instances);gl.bufferData(gl.ARRAY_BUFFER,LIMIT*6*4,gl.DYNAMIC_DRAW);
   for(const [index,size,off] of [[1,4,0],[2,2,16]]){gl.enableVertexAttribArray(index);gl.vertexAttribPointer(index,size,gl.FLOAT,false,24,off);gl.vertexAttribDivisor(index,1);}
   gl.bindTexture(gl.TEXTURE_2D,R.tex);for(const n of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,n,gl.LINEAR);for(const n of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,n,gl.CLAMP_TO_EDGE);
   R.float=!!gl.getExtension('EXT_color_buffer_float');layer.dataset.particleBackend='webgl2';
  }catch(error){cleanup();gl=null;layer.dataset.particleBackend='opacity-fallback';layer.dataset.particleError=String(error?.message||error);}
 }
 init();
 canvas.addEventListener?.('webglcontextlost',e=>{e.preventDefault();cleanup();gl=null;layer.dataset.particleBackend='opacity-fallback';paint(current);});
 function prepare(width,height,origin){
  if(disposed)return;plan=layout(width,height,origin);epoch=clock();current=0;const scale=Math.min(.5,MAX_SIDE/Math.max(width,height));const w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;
  layer.dataset.particleCount=String(plan.count);layer.dataset.particleVertices=String(MESH.length/3);
  if(gl&&resources){const R=resources;gl.bindBuffer(gl.ARRAY_BUFFER,R.instances);gl.bufferSubData(gl.ARRAY_BUFFER,0,plan.data);gl.bindTexture(gl.TEXTURE_2D,R.tex);
   if(R.w!==canvas.width||R.h!==canvas.height){R.w=canvas.width;R.h=canvas.height;gl.texImage2D(gl.TEXTURE_2D,0,R.float?gl.RGBA16F:gl.RGBA8,R.w,R.h,0,gl.RGBA,R.float?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);gl.bindFramebuffer(gl.FRAMEBUFFER,R.fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,R.tex,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){cleanup();gl=null;layer.dataset.particleBackend='opacity-fallback';}}
  }
  paint(0);
 }
 function paint(progress){
  current=Math.max(0,Math.min(1,progress));if(disposed||!plan)return;
  if(!gl||!resources){layer.style.setProperty('--fold-fallback-alpha',String(current));return;}
  const R=resources,w=canvas.width,h=canvas.height,U=R.U;gl.viewport(0,0,w,h);gl.disable(gl.DEPTH_TEST);gl.disable(gl.SCISSOR_TEST);gl.bindFramebuffer(gl.FRAMEBUFFER,R.fb);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);
  gl.useProgram(R.body);gl.bindVertexArray(R.vao);gl.uniform2f(U.res,plan.width,plan.height);gl.uniform1f(U.progress,current);gl.uniform1f(U.time,(clock()-epoch)/1000);gl.uniform2fv(U.tracks,plan.tracks);gl.drawArraysInstanced(gl.TRIANGLES,0,12,plan.count);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.disable(gl.BLEND);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(R.ink);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,R.tex);gl.uniform1i(U.src,0);gl.uniform2f(U.inkRes,w,h);gl.uniform2f(U.texel,1/w,1/h);gl.drawArrays(gl.TRIANGLES,0,3);
 }
 function animate(to,duration){
  if(disposed)return Promise.resolve();const from=current,start=clock();
  if(!request||duration<=0){paint(to);return Promise.resolve();}
  return new Promise(resolve=>{active=resolve;const tick=now=>{raf=0;const t=Math.max(0,Math.min(1,(now-start)/duration));paint(from+(to-from)*ease(t));if(t<1&&!disposed)raf=request(tick);else{active=null;resolve();}};raf=request(tick);});
 }
 function stop(){if(raf&&cancel)cancel(raf);raf=0;const done=active;active=null;if(done)done();}
 function dispose(){stop();cleanup();disposed=true;canvas.remove?.();}
 return Object.freeze({prepare,paint,animate,stop,dispose,get progress(){return current;},get count(){return plan?.count||0;}});
}
return Object.freeze({create,layout,ease,MESH,VERTEX,DENSITY,LIMIT,MAX_SIDE});
});
