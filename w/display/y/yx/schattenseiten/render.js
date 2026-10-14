(() => {
'use strict';
const id='organism:schattenseiten';
const modules=globalThis.SSSInterlocutorModules||(globalThis.SSSInterlocutorModules=new Map());
const RH=globalThis.SSSRepresentationHandoff;
if(!RH)throw new Error('Display representation handoff physiology required');

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
  const revision=(projection.fat||'')+'|'+JSON.stringify(projection.media_revisions||projection.media_variants||{})+'|'+JSON.stringify(projection.works||[]);if(REV!==revision){resetMedia();GENERATION++}REV=revision;
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
const BODY={list:[],dim:0,last:0};
let ENTERED=false,REV='',GENERATION=0,entryGL=null;
const GPU=new Map(),MEDIA=new Map([[64,RH.create({limit:4})],[512,RH.create({limit:4,active:false})]]);
function mediaUrl(src,size=512){
  const member=P?.media_variants?.[String(size)]?.[src];
  if(typeof member!=='string'||!member||/^(?:[a-z]+:|\/)/i.test(member)||/[\\:%?#]/.test(member)||member.split('/').some(x=>!x||x.startsWith('.')||x.startsWith('_')))return null;
  if(!member.startsWith('sizes/'+size+'/'))return null;
  return (P?.fat||'')+member;
}
function cacheKey(src,size){return GENERATION+'|'+size+'|'+mediaUrl(src,size)}
function requestImage(src,size){
  const url=mediaUrl(src,size);if(!url)return null;
  const lane=MEDIA.get(size);
  if(!lane)throw new Error('unadmitted local image resolution: '+size);
  return lane.request(cacheKey(src,size),async()=>{
    const response=await fetch(url,{mode:'cors'});
    if(!response.ok)throw new Error('image HTTP '+response.status);
    const blob=await response.blob();
    if(typeof createImageBitmap==='function')return createImageBitmap(blob,{resizeWidth:size,resizeHeight:size,resizeQuality:'pixelated'});
    return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0,size,size);URL.revokeObjectURL(image.src);resolve(c)};image.onerror=reject;image.src=URL.createObjectURL(blob)});
  },{dispose:bitmap=>bitmap?.close?.()}); // Failed higher detail retains its low representation.
}
function ensureTier(size){
  const lane=MEDIA.get(size);lane.setActive(size===64||ENTERED);
  for(const b of BODY.list)requestImage(b.src,size);
}
function disposeGPU(gl,record,highOnly=false){
  for(const [size,L] of record.tiers)if(!highOnly||size===512){gl.deleteTexture(L.tex);record.tiers.delete(size)}
  if(!highOnly){gl.deleteProgram(record.p);gl.deleteVertexArray(record.vao);GPU.delete(gl)}
}
function resetMedia(){
  for(const [gl,record] of GPU)disposeGPU(gl,record);
  for(const lane of MEDIA.values())lane.clear();
  MEDIA.get(512).setActive(false);
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
uniform sampler2DArray uImg;uniform int uHot;uniform float uDim;uniform float uReady[64];uniform vec4 uClip;
in vec2 vUV;in vec3 vW;flat in int vI;out vec4 o;
void main(){if(uClip.w>.5&&distance(gl_FragCoord.xy,uClip.xy)>uClip.z)discard;float r=uReady[vI];if(r<.004)discard;
  vec3 c=texture(uImg,vec3(vUV,float(vI))).rgb;
  vec3 n=normalize(cross(dFdx(vW),dFdy(vW)));
  c*=mix(.62,1.,clamp(abs(n.z)*1.7320508,0.,1.));
  float a=r;
  if(vI!=uHot)a*=1.-.88*uDim;
  o=vec4(c,a);}`;
function prog(gl,vs,fs){const p=gl.createProgram();for(const[t,s]of[[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){const h=gl.createShader(t);gl.shaderSource(h,s);gl.compileShader(h);
  if(!gl.getShaderParameter(h,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(h));gl.attachShader(p,h)}gl.linkProgram(p);return p}

/* Source/decode records are shared; every texture/program/VAO belongs to its GL context. */
function tier(gl,size){
  let record=GPU.get(gl);if(!record){record={p:prog(gl,VS,FS),vao:gl.createVertexArray(),tiers:new Map()};GPU.set(gl,record)}
  let L=record.tiers.get(size);if(!L){L={tex:gl.createTexture(),ready:new Float32Array(64),uploaded:new Set(),size};record.tiers.set(size,L);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY,L.tex);gl.texStorage3D(gl.TEXTURE_2D_ARRAY,size===64?1:10,gl.RGBA8,size,size,BODY.list.length);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,size===64?gl.NEAREST:gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,size===64?gl.NEAREST:gl.LINEAR);}
  let changed=false;
  BODY.list.forEach((b,i)=>{const item=MEDIA.get(size).get(cacheKey(b.src,size));if(item?.status==='ready'&&!L.uploaded.has(i)){
    gl.bindTexture(gl.TEXTURE_2D_ARRAY,L.tex);gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,i,size,size,1,gl.RGBA,gl.UNSIGNED_BYTE,item.value);L.uploaded.add(i);L.ready[i]=1;changed=true;}});
  if(changed&&size===512){gl.bindTexture(gl.TEXTURE_2D_ARRAY,L.tex);gl.generateMipmap(gl.TEXTURE_2D_ARRAY)}
  return {record,L};
}
function drawSheet({gl,proj,view,model,ms,lens=null,rect=null,dpr=1},high=false){
  if(!gl||!BODY.list.length)return;
  const active=gl.getParameter(gl.ACTIVE_TEXTURE),program=gl.getParameter(gl.CURRENT_PROGRAM),vao=gl.getParameter(gl.VERTEX_ARRAY_BINDING),depth=gl.getParameter(gl.DEPTH_WRITEMASK),color=gl.getParameter(gl.COLOR_WRITEMASK),func=gl.getParameter(gl.DEPTH_FUNC),clear=gl.getParameter(gl.DEPTH_CLEAR_VALUE);
  const flags=[gl.DEPTH_TEST,gl.BLEND,gl.SCISSOR_TEST].map(k=>[k,gl.isEnabled(k)]),blend=[gl.BLEND_SRC_RGB,gl.BLEND_DST_RGB,gl.BLEND_SRC_ALPHA,gl.BLEND_DST_ALPHA].map(k=>gl.getParameter(k));
  gl.activeTexture(gl.TEXTURE0);const texture=gl.getParameter(gl.TEXTURE_BINDING_2D_ARRAY);
  try{
    const B=new Float32Array(64*4);BODY.list.forEach((b,i)=>B.set([...b.world,b.size],i*4));
    const dt=Math.min(.1,Math.max(0,(ms-BODY.last)*.001));if(high){BODY.last=ms;BODY.dim+=((selected?1:0)-BODY.dim)*(1-Math.exp(-dt*4))}
    gl.disable(gl.SCISSOR_TEST);gl.depthMask(true);gl.clearDepth(1);gl.clear(gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    for(const size of (high?[64,512]:[64])){
      const {record,L}=tier(gl,size);gl.useProgram(record.p);gl.bindVertexArray(record.vao);
      gl.uniformMatrix4fv(gl.getUniformLocation(record.p,'uProj'),false,proj);gl.uniformMatrix4fv(gl.getUniformLocation(record.p,'uView'),false,view);gl.uniformMatrix4fv(gl.getUniformLocation(record.p,'uModel'),false,model);
      gl.uniform4fv(gl.getUniformLocation(record.p,'uB'),B);gl.uniform1fv(gl.getUniformLocation(record.p,'uReady'),L.ready);
      gl.uniform1i(gl.getUniformLocation(record.p,'uHot'),high&&selected?BODY.list.findIndex(b=>b.work===selected):-1);gl.uniform1f(gl.getUniformLocation(record.p,'uDim'),high?BODY.dim:0);
      gl.uniform4f(gl.getUniformLocation(record.p,'uClip'),lens?(lens.x-rect.left)*dpr:0,lens?(rect.height-(lens.y-rect.top))*dpr:0,lens?lens.r*dpr:0,lens?1:0);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY,L.tex);gl.uniform1i(gl.getUniformLocation(record.p,'uImg'),0);
      gl.colorMask(false,false,false,false);gl.depthFunc(size===64?gl.LESS:gl.LEQUAL);gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,6,BODY.list.length);
      gl.colorMask(true,true,true,true);gl.depthFunc(gl.LEQUAL);gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,6,BODY.list.length);
    }
  }finally{
    gl.bindTexture(gl.TEXTURE_2D_ARRAY,texture);gl.activeTexture(active);gl.useProgram(program);gl.bindVertexArray(vao);gl.depthMask(depth);gl.colorMask(...color);gl.depthFunc(func);gl.clearDepth(clear);gl.blendFuncSeparate(...blend);for(const [k,on] of flags)on?gl.enable(k):gl.disable(k);
  }
}
function afterDraw(args){if(!ENTERED)return;entryGL=args.gl;ensureTier(64);ensureTier(512);drawSheet(args,true)}
function preview(args){ensureTier(64);drawSheet(args,false)}
/* Descent into one shadow: Display's continuous focus carries the camera until the body fills the view */
function focus(){if(!selected)return null;const b=BODY.list.find(x=>x.work===selected);return b?{center:b.world,scale:1/(b.size*1.9)}:null}
shader.afterDraw=afterDraw;shader.focus=focus;shader.preload=()=>ensureTier(64);shader.preview=preview;Object.freeze(shader);

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
  if(w.cluster_positive){const f=el('figure','ss-cluster');for(const k of ['cluster_positive','cluster_negative']){const i=el('img');const url=mediaUrl(w[k]);if(!url)continue;i.src=url;i.alt='';i.decoding='async';f.append(i)}
    f.append(el('figcaption','',t.cluster));b.append(f)}
  if(w.animation&&mediaUrl(w.animation)){const i=el('img','ss-anim');i.src=mediaUrl(w.animation);i.alt='';i.decoding='async';b.append(i)}
  panel.append(b);
}
let LAST=null;
function render({host,content,projection,ui=null}={}){
  if(!host||!content||!Array.isArray(projection?.works))return false;
  LAST={host,content,projection};
  P=projection;ENTERED=true;ensureTier(64);ensureTier(512);host.hidden=false;content.className='interlocutor-content schattenseiten-content';content.replaceChildren();
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
  content.append(rail,side,bottom);if(ui){ui.bind(rail,'rail');ui.bind(side,'side');ui.bind(bottom,'bottom')}showWork(selected);return true;
}
addEventListener('sss:language',()=>{if(LAST&&LAST.content.isConnected)render(LAST)});
function activateFieldPoint({point}={}){if(!ENTERED)return;selected=point?.work||null;showWork(selected)}
function unmount({host,content}={}){if(host)host.hidden=true;if(content)content.replaceChildren();selected=null;panel=null;LAST=null;ENTERED=false;MEDIA.get(512).setActive(false);if(entryGL&&GPU.has(entryGL))disposeGPU(entryGL,GPU.get(entryGL),true);entryGL=null}
addEventListener('pagehide',resetMedia);
modules.set(id,Object.freeze({id,shader,render,unmount,fieldProjection,activateFieldPoint}));
})();
