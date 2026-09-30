(() => {
'use strict';
const id='organism:schattenseiten';
const modules=globalThis.SSSInterlocutorModules||(globalThis.SSSInterlocutorModules=new Map());

/* ============ genealogy as address ============
 * The first four rows are one tetrahedron (four perspectives): w, with the forest at its self-child ww and the
 * three clusterings of the seven at wx wz wy. The three clusterings of those 28 are x z y. Each row is one
 * container; its seven shadows float in it as bodies. Every body is its own world, reached by Descent. */
const ROWS=['ww','wx','wz','wy','x','z','y'];
const ROW_NOUN=['Wald','Cluster 1','Cluster 2','Cluster 3','Cluster 4','Cluster 5','Cluster 6'];
let P=null,selected=null,panel=null,byId=new Map();

function tree(){
  const n=(noun,children)=>children?{noun,de:noun,en:noun,children}:{noun,de:noun,en:noun,children:{}};
  const leaf=r=>n(ROW_NOUN[r]);
  return n('Schattenseiten',{
    w:n('Rang 1–2',{w:leaf(0),x:leaf(1),z:leaf(2),y:leaf(3)}),
    x:leaf(4),z:leaf(5),y:leaf(6)
  });
}
const freeze=node=>{for(const g of Object.keys(node.children||{}))freeze(node.children[g]);Object.freeze(node.children);return Object.freeze(node)};

/* same deterministic placement Display uses for points, so the body sits exactly where selection lands */
const V0=[[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]].map(v=>{const m=Math.hypot(...v);return v.map(x=>x/m)});
const GI={w:0,x:1,z:2,y:3};
const mid=(a,b)=>a.map((v,i)=>(v+b[i])/2);
const cellFor=p=>{let t=V0;for(const g of p)t=t.map((q,j)=>j===GI[g]?q:mid(t[GI[g]],q));return t};
function hash32(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}
  h^=h>>>16;h=Math.imul(h,0x7feb352d)>>>0;h^=h>>>15;h=Math.imul(h,0x846ca68b)>>>0;h^=h>>>16;return h>>>0}
const rnd=(s,k)=>(hash32(s+'·'+k)+1)/4294967297;
function pointInTet(t,sid){let w=[0,1,2,3].map(i=>-Math.log(Math.max(1e-7,rnd(sid,i))));const s=w.reduce((a,b)=>a+b,0);
  w=w.map(v=>.78*v/s+.22*.25);return [0,1,2].map(k=>w.reduce((a,x,i)=>a+x*t[i][k],0))}

function fieldProjection(projection={}){
  P=projection;byId=new Map((projection.works||[]).map(w=>[w.id,w]));
  const points=[];
  (projection.works||[]).forEach(w=>{
    const path=ROWS[w.row-1];
    points.push(Object.freeze({id:'work:'+w.id,gene:path[0],path,kind:'work',label:w.id,meta:`${w.id} · Rang ${w.rank} · ${w.source==='forest'?'Wald':w.source.replace('cluster','Cluster')}`,work:w}));
  });
  BODY.list=points.map(p=>({p,work:p.work,row:p.work.row-1,world:pointInTet(cellFor(p.path),p.id),size:Math.pow(2,-(ROWS[p.work.row-1].length+2))*.46}));
  return Object.freeze({root:freeze(tree()),points});
}

/* ============ field: pale paper, shadows fall on it ============ */
const shader={
  id:'shader:organism:schattenseiten',
  clear:[0.93,0.925,0.91,1],
  fallbackAlpha:.10,
  state:Object.freeze({blend:true,depthTest:true,depthWrite:false}),
  fragment:`#version 300 es
precision highp float;
in vec3 vN;in vec3 vW;in float vRegion;
uniform float uFocus;
out vec4 outColor;
void main(){
  vec3 n=normalize(vN);vec3 eye=normalize(vec3(0.,0.,3.2)-vW);
  float fres=pow(1.-abs(dot(n,eye)),1.6);
  float sel=(uFocus<-.5||abs(vRegion-uFocus)<.2)?1.:.5;
  outColor=vec4(vec3(.08),(.02+.10*fres)*sel);
}`
};

/* ============ bodies: one tetrahedron per shadow, the shadow on it ============
 * Seen along the body's own z (the shared orientation brought to rest), the tetrahedron is a square and the
 * shadow resolves; turned, it breaks into faces. Bodies drift gently inside their row. */
const BODY={list:[],gl:null};
const VS=`#version 300 es
precision highp float;
uniform mat4 uProj,uView,uModel;uniform vec4 uB[49];uniform float uT;
const vec3 V[4]=vec3[4](vec3(1,1,1),vec3(-1,-1,1),vec3(-1,1,-1),vec3(1,-1,-1));
const int S[6]=int[6](0,1,2,3,0,1);
out vec2 vUV;out vec3 vW;flat out int vI;
void main(){vec4 b=uB[gl_InstanceID];vec3 l=V[S[gl_VertexID]];
  float k=float(gl_InstanceID);vec3 d=vec3(sin(uT*.23+k),cos(uT*.19+k*1.7),sin(uT*.31+k*.7))*b.w*.28;
  vec4 w=uModel*vec4(b.xyz+d+l*b.w,1.);vW=w.xyz;vI=gl_InstanceID;vUV=vec2(l.x*.5+.5,.5-l.y*.5);
  gl_Position=uProj*uView*w;}`;
const FS=`#version 300 es
precision highp float;precision highp sampler2DArray;
uniform sampler2DArray uImg;uniform int uHot;uniform float uReady[49];
in vec2 vUV;in vec3 vW;flat in int vI;out vec4 o;
void main(){vec3 c=uReady[vI]>.5?texture(uImg,vec3(vUV,float(vI))).rgb:vec3(.55);
  vec3 n=normalize(cross(dFdx(vW),dFdy(vW)));c*=.78+.22*abs(n.z);
  if(vI==uHot)c=mix(c,vec3(.95,.55,.35),.18);o=vec4(c,1);}`;
function prog(gl,vs,fs){const p=gl.createProgram();for(const[t,s]of[[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){const h=gl.createShader(t);gl.shaderSource(h,s);gl.compileShader(h);
  if(!gl.getShaderParameter(h,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(h));gl.attachShader(p,h)}gl.linkProgram(p);return p}
function layer(gl){
  if(BODY.gl===gl)return BODY.L;
  const L={p:prog(gl,VS,FS),vao:gl.createVertexArray(),tex:gl.createTexture(),ready:new Float32Array(49)};
  const SZ=512;gl.bindTexture(gl.TEXTURE_2D_ARRAY,L.tex);gl.texStorage3D(gl.TEXTURE_2D_ARRAY,1,gl.RGBA8,SZ,SZ,49);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  const c=document.createElement('canvas');c.width=c.height=SZ;const x=c.getContext('2d');
  BODY.list.forEach((b,i)=>{const im=new Image();im.crossOrigin='anonymous';
    im.onload=()=>{x.drawImage(im,0,0,SZ,SZ);gl.bindTexture(gl.TEXTURE_2D_ARRAY,L.tex);gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,i,SZ,SZ,1,gl.RGBA,gl.UNSIGNED_BYTE,c);L.ready[i]=1};
    im.src=(P?.fat||'')+b.work.still});
  BODY.gl=gl;BODY.L=L;return L;
}
function afterDraw({gl,proj,view,model,ms}){
  if(!gl||!BODY.list.length)return;
  const L=layer(gl),B=new Float32Array(49*4);
  BODY.list.forEach((b,i)=>B.set([...b.world,b.size],i*4));
  gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.disable(gl.BLEND);gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.useProgram(L.p);gl.bindVertexArray(L.vao);
  gl.uniformMatrix4fv(gl.getUniformLocation(L.p,'uProj'),false,proj);gl.uniformMatrix4fv(gl.getUniformLocation(L.p,'uView'),false,view);
  gl.uniformMatrix4fv(gl.getUniformLocation(L.p,'uModel'),false,model);gl.uniform4fv(gl.getUniformLocation(L.p,'uB'),B);
  gl.uniform1f(gl.getUniformLocation(L.p,'uT'),selected?0:ms*.001);gl.uniform1fv(gl.getUniformLocation(L.p,'uReady'),L.ready);
  gl.uniform1i(gl.getUniformLocation(L.p,'uHot'),selected?BODY.list.findIndex(b=>b.work===selected):-1);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D_ARRAY,L.tex);gl.uniform1i(gl.getUniformLocation(L.p,'uImg'),0);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,6,BODY.list.length);
  gl.depthMask(false);gl.enable(gl.BLEND);gl.bindVertexArray(null);
}
/* Descent into one shadow: Display's continuous focus carries the camera until the body fills the view */
function focus(){if(!selected)return null;const b=BODY.list.find(x=>x.work===selected);return b?{center:b.world,scale:1/(b.size*1.9)}:null}
shader.afterDraw=afterDraw;shader.focus=focus;Object.freeze(shader);

/* ============ site-owned DOM ============ */
const el=(t,c,s)=>{const n=document.createElement(t);if(c)n.className=c;if(s!==undefined)n.textContent=s;return n};
function showWork(w){
  if(!panel)return;panel.replaceChildren();if(!w)return;
  panel.append(el('h2','',w.id),el('p','ss-meta',`Rang ${w.rank} · Reihe ${w.row} · ${w.source==='forest'?'aus dem Wald':'aus '+w.source.replace('cluster','Cluster')}`));
  if(w.cluster_positive){const f=el('figure','ss-cluster');for(const k of ['cluster_positive','cluster_negative']){const i=el('img');i.src=P.fat+w[k];i.alt='';f.append(i)}
    f.append(el('figcaption','','das Cluster, aus dem dieser Schatten geschnitten wurde'));panel.append(f)}
  if(w.animation){const i=el('img','ss-anim');i.src=P.fat+w.animation;i.alt='';panel.append(i)}
}
function render({host,content,projection}={}){
  if(!host||!content||!Array.isArray(projection?.works))return false;
  P=projection;host.hidden=false;content.className='interlocutor-content schattenseiten-content';content.replaceChildren();
  const rail=el('div','ss-rail');rail.append(el('h1','','Schattenseiten'));
  if(projection.words?.[0])rail.append(el('p','ss-word',projection.words[0]));
  if(projection.operation)rail.append(el('p','ss-op',projection.operation));
  for(const r of projection.ranks||[])rail.append(el('p','ss-rank',`Rang ${r.rank} · ${r.ids} · ${r.input}`));
  if(projection.words?.[2])rail.append(el('p','ss-word',projection.words[2]));
  if(projection.words?.[1])rail.append(el('p','ss-word ss-mirror',projection.words[1]));
  panel=el('section','ss-panel');content.append(rail,panel);showWork(selected);return true;
}
function activateFieldPoint({point}={}){selected=point?.work||null;showWork(selected)}
function unmount({host,content}={}){if(host)host.hidden=true;if(content)content.replaceChildren();selected=null;panel=null}
modules.set(id,Object.freeze({id,shader,render,unmount,fieldProjection,activateFieldPoint}));
})();
