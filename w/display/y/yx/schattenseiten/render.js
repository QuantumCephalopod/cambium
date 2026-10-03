(() => {
'use strict';
const id='organism:schattenseiten';
const modules=globalThis.SSSInterlocutorModules||(globalThis.SSSInterlocutorModules=new Map());

/* ============ the sheet: an 8×8 grid, each slot a leaf of the tetrahedron ============
 * Depth three of the tetrahedron has sixty-four leaves, and along the shadow axis they are exactly an 8×8 grid of
 * squares. The sheet reads as the work does: row 1 (the forest, the seven that started everything) on top, then the
 * rows in order, each ONE line of eight slots left to right — seven shadows, and in the eighth the cluster the row was
 * cut from (free in row 1, which has none). The eighth line stays free. All slots are the same size: the seeds are
 * conceptually the biggest, so the recursion's scale does not rank them. Nothing floats; each shadow rests in its leaf,
 * so that seen along the axis the whole is one flat picture and only turning it shows the tetrahedra. */
let P=null,selected=null,panel=null,byId=new Map();

/* Display's own cell geometry: the four corners of a cell, and the cell toward one corner */
const V0=[[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]].map(v=>{const m=Math.hypot(...v);return v.map(x=>x/m)});
const GI={w:0,x:1,z:2,y:3},GENES=['w','x','z','y'];
const mid=(a,b)=>a.map((v,i)=>(v+b[i])/2);
const childOf=(t,g)=>t.map((q,j)=>j===GI[g]?q:mid(t[GI[g]],q));
const cellFor=p=>{let t=V0;for(const g of p)t=childOf(t,g);return t};

/* the sheet as geometry: G[line][column], read top to bottom, left to right */
const SHEET=(()=>{
  const leaves=[];
  for(const a of GENES)for(const b of GENES)for(const c of GENES){
    const path=a+b+c,t=cellFor(path),world=[0,1,2].map(k=>t.reduce((s,v)=>s+v[k],0)/4);
    const edge=Math.hypot(...[0,1,2].map(k=>t[0][k]-t[1][k]));
    leaves.push({path,world,size:edge/(2*Math.SQRT2)*.94});
  }
  leaves.sort((p,q)=>q.world[1]-p.world[1]);           // top to bottom
  const G=[];for(let r=0;r<8;r++)G.push(leaves.slice(r*8,r*8+8).sort((p,q)=>p.world[0]-q.world[0]));
  return G;
})();

let PROJECTED=null,PROJECTED_FOR=null;
function fieldProjection(projection={}){
  /* the runtime asks every frame; the answer only changes with the projection */
  if(PROJECTED&&PROJECTED_FOR===projection)return PROJECTED;
  P=projection;byId=new Map((projection.works||[]).map(w=>[w.id,w]));
  const points=[],seen=[0,0,0,0,0,0,0,0],noun=new Map(),clustered=new Set();
  BODY.list=[];
  (projection.works||[]).forEach(w=>{
    const r=w.row-1,cell=SHEET[r]?.[seen[r]++];if(!cell||seen[r]>7)return;
    if(w.cluster_positive&&!clustered.has(r)){clustered.add(r);const c=SHEET[r][7];noun.set(c.path,'Cluster '+(r));BODY.list.push({kind:'cluster',row:r,src:w.cluster_positive,world:c.world,size:c.size})}
    noun.set(cell.path,w.id);
    const p=Object.freeze({id:'work:'+w.id,gene:cell.path[0],path:cell.path,kind:'work',label:w.id,meta:w.id,work:w});
    points.push(p);
    BODY.list.push({p,work:w,row:r,src:w.still,world:cell.world,size:cell.size});
  });
  // the tree is the sheet's own address space: a full depth-three split; only the named slots carry a noun
  const grow=(path,depth)=>{
    const n={noun:depth===3?(noun.get(path)||''):(depth===0?'Schattenseiten':''),children:{}};
    n.de=n.en=n.noun;
    if(depth<3)for(const g of GENES)n.children[g]=grow(path+g,depth+1);
    return n;
  };
  PROJECTED_FOR=projection;return (PROJECTED=Object.freeze({root:freeze(grow('',0)),points}));
}
const freeze=node=>{for(const g of Object.keys(node.children||{}))freeze(node.children[g]);Object.freeze(node.children);return Object.freeze(node)};

/* ============ field: the host's own environment; shadows rest on it ============ */
const shader={
  id:'shader:organism:schattenseiten',
  clear:[0.93,0.925,0.91,1],
  fallbackAlpha:.10,
  /* the rest view: along the shadow axis, parallel projection — a tetrahedron is then a square and everything is flat */
  view:Object.freeze({rest:Object.freeze([1,0,0,0]),projection:'orthographic'}),
  state:Object.freeze({blend:true,depthTest:true,depthWrite:false}),
  /* the body seen from a host: shadow ink — a face turned toward the light is paper, a face turned away is black, so turning it
   * cuts the body into shadows and light without any grey between */
  body:Object.freeze({
    state:Object.freeze({blend:true,depthTest:true,depthWrite:true}),
    fragment:`#version 300 es
precision highp float;
in vec3 vN;in vec3 vW;in float vRegion;uniform float uFocus;
out vec4 outColor;
void main(){vec3 n=normalize(vN);float lit=step(0.,dot(n,normalize(vec3(-.35,.6,.72))));
  float sel=(uFocus<-.5||abs(vRegion-uFocus)<.2)?1.:.55;
  outColor=vec4(mix(vec3(.035),vec3(.955,.95,.935),lit),.96*sel);}`
  }),
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
 * Seen along the body's own z (the rest view), the tetrahedron is a square and the shadow resolves;
 * turned, it breaks into faces. Nothing drifts. */
const BODY={list:[],gl:null,dim:0,last:0,L:null};
const SZ=512,LEVELS=10;
/* Fat declares the sized member; choose it before requesting the bytes. */
function mediaUrl(src){
  const candidate=P?.media_variants?.[String(SZ)]?.[src];
  const member=typeof candidate==='string'&&candidate&&!/^(?:[a-z]+:|\/)/i.test(candidate)&&!candidate.split('/').includes('..')?candidate:src;
  return (P?.fat||'')+member;
}
const VS=`#version 300 es
precision highp float;
uniform mat4 uProj,uView,uModel;uniform vec4 uB[64];
const vec3 V[4]=vec3[4](vec3(1,1,1),vec3(-1,-1,1),vec3(-1,1,-1),vec3(1,-1,-1));
const int S[6]=int[6](0,1,2,3,0,1);
out vec2 vUV;out vec3 vW;flat out int vI;
void main(){vec4 b=uB[gl_InstanceID];vec3 l=V[S[gl_VertexID]];
  vec4 w=uModel*vec4(b.xyz+l*b.w,1.);vW=w.xyz;vI=gl_InstanceID;vUV=vec2(l.x*.5+.5,.5-l.y*.5);
  gl_Position=uProj*uView*w;}`;
const FS=`#version 300 es
precision highp float;precision highp sampler2DArray;
uniform sampler2DArray uImg;uniform int uHot;uniform float uDim;uniform float uReady[64];
in vec2 vUV;in vec3 vW;flat in int vI;out vec4 o;
void main(){float r=uReady[vI];if(r<.004)discard;
  vec3 c=texture(uImg,vec3(vUV,float(vI))).rgb;
  vec3 n=normalize(cross(dFdx(vW),dFdy(vW)));
  c*=mix(.62,1.,clamp(abs(n.z)*1.7320508,0.,1.));
  float a=r;
  if(vI!=uHot)a*=1.-.88*uDim;
  o=vec4(c,a);}`;
function prog(gl,vs,fs){const p=gl.createProgram();for(const[t,s]of[[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){const h=gl.createShader(t);gl.shaderSource(h,s);gl.compileShader(h);
  if(!gl.getShaderParameter(h,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(h));gl.attachShader(p,h)}gl.linkProgram(p);return p}

/* Load-in: rows in genealogy order, a few at a time, decoded off the main thread straight to the texture size, each
 * fading in when it lands. Mipmaps are rebuilt once per burst, so the small bodies do not shimmer. */
function upload(gl,L,i,src){
  gl.bindTexture(gl.TEXTURE_2D_ARRAY,L.tex);
  gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,i,SZ,SZ,1,gl.RGBA,gl.UNSIGNED_BYTE,src);
  L.target[i]=1;clearTimeout(L.mipTimer);
  L.mipTimer=setTimeout(()=>{if(BODY.gl===gl){gl.bindTexture(gl.TEXTURE_2D_ARRAY,L.tex);gl.generateMipmap(gl.TEXTURE_2D_ARRAY)}},140);
}
function fetchBitmap(url){
  return fetch(url,{mode:'cors'}).then(r=>{if(!r.ok)throw new Error(r.status);return r.blob()})
    .then(b=>createImageBitmap(b,{resizeWidth:SZ,resizeHeight:SZ,resizeQuality:'medium'}));
}
function legacyImage(url){
  return new Promise((res,rej)=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{const c=document.createElement('canvas');c.width=c.height=SZ;c.getContext('2d').drawImage(im,0,0,SZ,SZ);res(c)};im.onerror=rej;im.src=url});
}
function startLoading(gl,L){
  const queue=BODY.list.map((b,i)=>i);let running=0;
  const pump=()=>{
    while(running<5&&queue.length&&BODY.gl===gl){
      const i=queue.shift(),url=mediaUrl(BODY.list[i].src);running++;
      (typeof createImageBitmap==='function'?fetchBitmap(url):legacyImage(url))
        .then(src=>{if(BODY.gl===gl)upload(gl,L,i,src);if(src.close)src.close()})
        .catch(()=>{}).finally(()=>{running--;pump()});
    }
  };
  pump();
}
function layer(gl){
  if(BODY.gl===gl)return BODY.L;
  const L={p:prog(gl,VS,FS),vao:gl.createVertexArray(),tex:gl.createTexture(),ready:new Float32Array(64),target:new Float32Array(64),mipTimer:0};
  gl.bindTexture(gl.TEXTURE_2D_ARRAY,L.tex);gl.texStorage3D(gl.TEXTURE_2D_ARRAY,LEVELS,gl.RGBA8,SZ,SZ,64);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  BODY.gl=gl;BODY.L=L;startLoading(gl,L);return L;
}
function afterDraw({gl,proj,view,model,ms}){
  if(!gl||!BODY.list.length)return;
  const L=layer(gl),B=new Float32Array(64*4);
  BODY.list.forEach((b,i)=>B.set([...b.world,b.size],i*4));
  const dt=Math.min(.1,Math.max(0,(ms-BODY.last)*.001));BODY.last=ms;
  for(let i=0;i<64;i++)L.ready[i]+=(L.target[i]-L.ready[i])*(1-Math.exp(-dt*7));
  /* the entered shadow is its own world: the others recede on a damped ease, and return on ascent */
  BODY.dim+=((selected?1:0)-BODY.dim)*(1-Math.exp(-dt*4));
  gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.useProgram(L.p);gl.bindVertexArray(L.vao);
  gl.uniformMatrix4fv(gl.getUniformLocation(L.p,'uProj'),false,proj);gl.uniformMatrix4fv(gl.getUniformLocation(L.p,'uView'),false,view);
  gl.uniformMatrix4fv(gl.getUniformLocation(L.p,'uModel'),false,model);gl.uniform4fv(gl.getUniformLocation(L.p,'uB'),B);
  gl.uniform1fv(gl.getUniformLocation(L.p,'uReady'),L.ready);
  gl.uniform1i(gl.getUniformLocation(L.p,'uHot'),selected?BODY.list.findIndex(b=>b.work===selected):-1);
  gl.uniform1f(gl.getUniformLocation(L.p,'uDim'),BODY.dim);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D_ARRAY,L.tex);gl.uniform1i(gl.getUniformLocation(L.p,'uImg'),0);
  /* depth first, colour second: one fragment per pixel, so a fading body never blends its own hidden faces */
  gl.colorMask(false,false,false,false);gl.depthFunc(gl.LESS);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,6,BODY.list.length);
  gl.colorMask(true,true,true,true);gl.depthFunc(gl.LEQUAL);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,6,BODY.list.length);
  gl.depthFunc(gl.LESS);gl.depthMask(false);gl.bindVertexArray(null);
}
/* Descent into one shadow: Display's continuous focus carries the camera until the body fills the view */
function focus(){if(!selected)return null;const b=BODY.list.find(x=>x.work===selected);return b?{center:b.world,scale:1/(b.size*1.9)}:null}
shader.afterDraw=afterDraw;shader.focus=focus;Object.freeze(shader);

/* ============ site-owned HUD: every kind of information has a fixed place at the edges ============ */
const el=(t,c,s)=>{const n=document.createElement(t);if(c)n.className=c;if(s!==undefined)n.textContent=s;return n};
/* the witness's language decides every word; the organ's own sentences arrive as {de,en} */
const T={
  en:{shadows:'shadows',ranks:'ranks',clusters:'clusters',moving:'moving',rank:'rank',row:'row',forest:'from the forest',from:n=>'from cluster '+n,
      cluster:'the cluster this shadow was cut from',flat:'orthogonal',flatTip:'back to the axis: everything flat'},
  de:{shadows:'Schatten',ranks:'Ränge',clusters:'Cluster',moving:'bewegt',rank:'Rang',row:'Reihe',forest:'aus dem Wald',from:n=>'aus Cluster '+n,
      cluster:'das Cluster, aus dem dieser Schatten geschnitten wurde',flat:'orthogonal',flatTip:'zurück in die Achse: alles flach'}
};
const lang=()=>globalThis.SSSWorldView?.language==='de'?'de':'en';
const tx=v=>v&&typeof v==='object'?(v[lang()]??v.en??v.de??''):(v??'');
const stat=(v,l)=>{const m=el('span','ss-hud-stat');m.append(el('b','',String(v)),el('small','',l));return m};
function block(label,right){const b=el('section','ss-hud-block'),h=el('div','ss-hud-label');h.append(el('span','',label));if(right)h.append(el('span','',right));b.append(h);return b}
function showWork(w){
  if(!panel)return;panel.replaceChildren();panel.hidden=!w;if(!w)return;
  const t=T[lang()],n=String(w.source||'').replace('cluster','');
  const b=block(w.id,`${t.rank} ${w.rank} · ${t.row} ${w.row}`);b.append(el('p','ss-meta',w.source==='forest'?t.forest:t.from(n)));
  if(w.cluster_positive){const f=el('figure','ss-cluster');for(const k of ['cluster_positive','cluster_negative']){const i=el('img');i.src=mediaUrl(w[k]);i.alt='';i.decoding='async';f.append(i)}
    f.append(el('figcaption','',t.cluster));b.append(f)}
  if(w.animation){const i=el('img','ss-anim');i.src=mediaUrl(w.animation);i.alt='';i.decoding='async';b.append(i)}
  panel.append(b);
}
let LAST=null;
function render({host,content,projection}={}){
  if(!host||!content||!Array.isArray(projection?.works))return false;
  LAST={host,content,projection};
  P=projection;host.hidden=false;content.className='interlocutor-content schattenseiten-content';content.replaceChildren();
  const t=T[lang()],works=projection.works,ranks=projection.ranks||[],clusters=new Set(works.map(w=>w.cluster_positive).filter(Boolean)).size;
  // left — who this is and how it grew
  const top=el('div','ss-hud-top');top.append(el('h1','',tx(projection.title)||'Schattenseiten'),el('span','ss-hud-series','Schattenseiten'));
  for(const [v,l] of [[works.length,t.shadows],[ranks.length,t.ranks],[clusters,t.clusters],[works.filter(w=>w.animation).length,t.moving]])top.append(stat(v,l));
  const rail=el('div','ss-hud-rail');rail.append(top);
  if(projection.words?.[0])rail.append(el('p','ss-word',tx(projection.words[0])));
  if(projection.operation)rail.append(el('p','ss-op',tx(projection.operation)));
  if(ranks.length){const rb=block(t.rank);for(const r of ranks)rb.append(el('p','ss-rank',`${r.rank} · ${r.ids} · ${tx(r.input)}`));rail.append(rb)}
  // right — the one shadow you are in
  const side=el('div','ss-hud-side');panel=el('div','ss-panel');side.append(panel);
  // bottom — the way back to the flat view, and the words
  const bottom=el('div','ss-hud-bottom');
  const flat=el('button','ss-hud-flat',t.flat);flat.type='button';flat.title=t.flatTip;
  flat.addEventListener('click',()=>globalThis.SSSWorldView?.easeTo?.(shader.view.rest,900));bottom.append(flat);
  if(projection.words?.[2])bottom.append(el('p','ss-word ss-way'+(projection.words[2].placeholder?' ss-placeholder':''),tx(projection.words[2])));
  if(projection.words?.[1])bottom.append(el('p','ss-word ss-mirror',tx(projection.words[1])));
  content.append(rail,side,bottom);showWork(selected);return true;
}
addEventListener('sss:language',()=>{if(LAST&&LAST.content.isConnected)render(LAST)});
function activateFieldPoint({point}={}){selected=point?.work||null;showWork(selected)}
function unmount({host,content}={}){if(host)host.hidden=true;if(content)content.replaceChildren();selected=null;panel=null;LAST=null}
modules.set(id,Object.freeze({id,shader,render,unmount,fieldProjection,activateFieldPoint}));
})();
