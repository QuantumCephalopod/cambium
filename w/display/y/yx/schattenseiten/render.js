(() => {
'use strict';
const id='organism:schattenseiten';
const modules=globalThis.SSSInterlocutorModules||(globalThis.SSSInterlocutorModules=new Map());
const RH=globalThis.SSSRepresentationHandoff;
if(!RH)throw new Error('Display representation handoff physiology required');

/* ============ the sheet: an 8×8 grid, each slot a leaf of the tetrahedron ============
 * Depth three of the tetrahedron has sixty-four leaves, and along the shadow axis they are exactly an 8×8 grid of
 * squares. The sheet reads as the work does: an empty first display row, then source row 1 (the forest, the seven that started everything) and the
 * rows in order, each ONE line of eight slots left to right — seven shadows, and in the eighth the cluster the row was
 * cut from (free in row 1, which has none). The first display line stays free. All slots are the same size: the seeds are
 * conceptually the biggest, so the recursion's scale does not rank them. Nothing floats; each shadow rests in its leaf,
 * so that seen along the axis the whole is one flat picture and only turning it shows the tetrahedra. */
let P=null,selected=null,selectedRow=null,panel=null,byId=new Map(),SIDE_BASE=null,VIEW='still';

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
    const r=w.row-1,displayRow=r+1,cell=SHEET[displayRow]?.[seen[r]++];if(!cell||seen[r]>7)return;
    if(w.cluster_positive&&!clustered.has(r)){clustered.add(r);const c=SHEET[displayRow][7];noun.set(c.path,'Cluster '+(r));BODY.list.push({kind:'cluster',row:r,src:w.cluster_positive,world:c.world,size:c.size})}
    noun.set(cell.path,w.id);
    const p=Object.freeze({id:'work:'+w.id,gene:cell.path[0],path:cell.path,kind:'work',anchor:'cell',label:w.id,meta:w.id,work:w});
    points.push(p);
    BODY.list.push({p,work:w,row:r,src:w.still,world:cell.world,size:cell.size});
  });
  if(selected)selected=byId.get(selected.id)||null;
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
    cells:()=>BODY.list.map(b=>({path:'x',tet:V0.map(v=>v.map((x,j)=>b.world[j]+x*Math.sqrt(3)*b.size))})),
    draw:args=>{args.drawPlaceholder?.();ensureTier(64);drawSheet({...args,clearDepth:false},false)},
    release:({gl})=>{const record=GPU.get(gl);if(record)disposeGPU(gl,record)},
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
uniform sampler2DArray uImg;uniform int uHot;uniform vec2 uRow;uniform float uDim;uniform float uReady[64];uniform vec4 uClip;
in vec2 vUV;in vec3 vW;flat in int vI;out vec4 o;
void main(){if(uClip.w>.5&&distance(gl_FragCoord.xy,uClip.xy)>uClip.z)discard;float r=uReady[vI];if(r<.004)discard;
  vec3 c=texture(uImg,vec3(vUV,float(vI))).rgb;
  vec3 n=normalize(cross(dFdx(vW),dFdy(vW)));
  c*=mix(.62,1.,clamp(abs(n.z)*1.7320508,0.,1.));
  float a=r;
  if((uHot>=0&&vI!=uHot)||(uHot<0&&uRow.x>=0.&&(float(vI)<uRow.x||float(vI)>uRow.y)))a*=1.-.88*uDim;
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
function drawSheet({gl,proj,view,model,ms,lens=null,rect=null,dpr=1,clearDepth=true,viewRect=null},high=false){
  if(!gl||!BODY.list.length)return;
  const active=gl.getParameter(gl.ACTIVE_TEXTURE),program=gl.getParameter(gl.CURRENT_PROGRAM),vao=gl.getParameter(gl.VERTEX_ARRAY_BINDING),depth=gl.getParameter(gl.DEPTH_WRITEMASK),color=gl.getParameter(gl.COLOR_WRITEMASK),func=gl.getParameter(gl.DEPTH_FUNC),clear=gl.getParameter(gl.DEPTH_CLEAR_VALUE);
  const flags=[gl.DEPTH_TEST,gl.BLEND,gl.SCISSOR_TEST].map(k=>[k,gl.isEnabled(k)]),blend=[gl.BLEND_SRC_RGB,gl.BLEND_DST_RGB,gl.BLEND_SRC_ALPHA,gl.BLEND_DST_ALPHA].map(k=>gl.getParameter(k));
  gl.activeTexture(gl.TEXTURE0);const texture=gl.getParameter(gl.TEXTURE_BINDING_2D_ARRAY);
  try{
    const B=new Float32Array(64*4);BODY.list.forEach((b,i)=>B.set([...b.world,b.size],i*4));
    const dt=Math.min(.1,Math.max(0,(ms-BODY.last)*.001));if(high){BODY.last=ms;BODY.dim+=((selected||selectedRow?1:0)-BODY.dim)*(1-Math.exp(-dt*4))}
    gl.disable(gl.SCISSOR_TEST);gl.depthMask(true);if(clearDepth){gl.clearDepth(1);gl.clear(gl.DEPTH_BUFFER_BIT)}if(viewRect?.bounded&&rect){gl.enable(gl.SCISSOR_TEST);gl.scissor(Math.floor(viewRect.x*dpr),Math.floor((rect.height-viewRect.y-viewRect.height)*dpr),Math.ceil(viewRect.width*dpr),Math.ceil(viewRect.height*dpr))}gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    for(const size of (high?[64,512]:[64])){
      const {record,L}=tier(gl,size);gl.useProgram(record.p);gl.bindVertexArray(record.vao);
      gl.uniformMatrix4fv(gl.getUniformLocation(record.p,'uProj'),false,proj);gl.uniformMatrix4fv(gl.getUniformLocation(record.p,'uView'),false,view);gl.uniformMatrix4fv(gl.getUniformLocation(record.p,'uModel'),false,model);
      gl.uniform4fv(gl.getUniformLocation(record.p,'uB'),B);gl.uniform1fv(gl.getUniformLocation(record.p,'uReady'),L.ready);
      gl.uniform1i(gl.getUniformLocation(record.p,'uHot'),high&&selected?BODY.list.findIndex(b=>b.work===selected):-1);const rowIndices=high&&selectedRow?BODY.list.flatMap((b,i)=>b.row===selectedRow-1?[i]:[]):[];gl.uniform2f(gl.getUniformLocation(record.p,'uRow'),rowIndices.length?Math.min(...rowIndices):-1,rowIndices.length?Math.max(...rowIndices):-1);gl.uniform1f(gl.getUniformLocation(record.p,'uDim'),high?BODY.dim:0);
      gl.uniform4f(gl.getUniformLocation(record.p,'uClip'),lens?(lens.x-rect.left)*dpr:0,lens?(rect.height-(lens.y-rect.top))*dpr:0,lens?lens.r*dpr:0,lens?1:0);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY,L.tex);gl.uniform1i(gl.getUniformLocation(record.p,'uImg'),0);
      gl.colorMask(false,false,false,false);gl.depthFunc(size===64?gl.LESS:gl.LEQUAL);gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,6,BODY.list.length);
      gl.colorMask(true,true,true,true);gl.depthFunc(gl.LEQUAL);gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,6,BODY.list.length);
    }
  }finally{
    gl.bindTexture(gl.TEXTURE_2D_ARRAY,texture);gl.activeTexture(active);gl.useProgram(program);gl.bindVertexArray(vao);gl.depthMask(depth);gl.colorMask(...color);gl.depthFunc(func);gl.clearDepth(clear);gl.blendFuncSeparate(...blend);for(const [k,on] of flags)on?gl.enable(k):gl.disable(k);
  }
}
function afterDraw(args){if(!ENTERED)return;BODY.viewport=args.viewRect||args.rect;entryGL=args.gl;ensureTier(64);ensureTier(512);drawSheet(args,true)}
function preview(args){ensureTier(64);drawSheet(args,false)}
/* Descent into one shadow: Display's continuous focus carries the camera until the body fills the view */
function focus(){
 if(selected){const b=BODY.list.find(x=>x.work===selected);return b?{center:b.world,scale:1/(b.size*1.9)}:null}
 if(!selectedRow)return null;const row=BODY.list.filter(b=>b.row===selectedRow-1);if(!row.length)return null;
 const lo=[0,1,2].map(k=>Math.min(...row.map(b=>b.world[k]-b.size))),hi=[0,1,2].map(k=>Math.max(...row.map(b=>b.world[k]+b.size))),aspect=(BODY.viewport?.width||1)/(BODY.viewport?.height||1);
 return {center:lo.map((v,k)=>(v+hi[k])/2),scale:2/(1.9*Math.max(...hi.map((v,k)=>v-lo[k])))*Math.max(1,Math.min(1.8,aspect*.8))};
}
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
Object.assign(T.en,{intro:'49 shadow images. Selected shadows become pictures that cast the next shadows.',overview:'whole work',about:'About the work',rows:'Rows and perspectives',choose:'Choose a shadow in this row',documentation:'Work and documentation',work:'Shadow',clusterView:'Source cluster',motion:'Movement',positive:'Source cluster · positive',negative:'Source cluster · negative',path:'Path through the work',workWords:'Words of the work',unwritten:'The remaining work text is to be handwritten by the artist.',seven:'Seven selected shadows belong to this perspective.',rowOne:'The walk is the first rank: seven shadows from the forest.',rowTwo:'The first seven images return to an overhead projector. Three shuffles produce three perspectives, each with seven selected shadows.',rowThree:'The first four rows — 28 images — become the next set. Three further shuffles again yield three perspectives of seven shadows.',cluster:'This positive/negative pair documents the cluster from which this row’s seven shadows were selected.',motionCaption:'Recorded movement of this shadow',description:'gefallen, gefunden comprises 49 shadow images in three ranks. A set, one light and a chooser: seven shadows are selected, photographed and cropped. The images become the next set on an overhead projector. Three shuffles produce three new perspectives. The seven rows preserve that process: the forest walk, three perspectives of the first seven images, then three perspectives of the first 28. Choose a row, a shadow, its source cluster or its recorded movement.'});
Object.assign(T.de,{intro:'49 Schattenbilder. Ausgewählte Schatten werden zu Bildern, die die nächsten Schatten werfen.',overview:'Gesamtwerk',about:'Über die Arbeit',rows:'Reihen und Perspektiven',choose:'Schatten dieser Reihe auswählen',documentation:'Werk und Dokumentation',work:'Schatten',clusterView:'Ausgangscluster',motion:'Bewegung',positive:'Ausgangscluster · Positiv',negative:'Ausgangscluster · Negativ',path:'Weg durch die Arbeit',workWords:'Worte der Arbeit',unwritten:'Der weitere Werktext soll vom Künstler handgeschrieben werden.',seven:'Sieben ausgewählte Schatten gehören zu dieser Perspektive.',rowOne:'Der Spaziergang ist der erste Rang: sieben Schatten aus dem Wald.',rowTwo:'Die ersten sieben Bilder kommen auf einen Overheadprojektor. Drei Neuanordnungen ergeben drei Perspektiven mit jeweils sieben ausgewählten Schatten.',rowThree:'Die ersten vier Reihen — 28 Bilder — werden zum nächsten Set. Drei weitere Neuanordnungen ergeben erneut drei Perspektiven mit je sieben Schatten.',cluster:'Dieses Positiv/Negativ-Paar dokumentiert das Cluster, aus dem die sieben Schatten dieser Reihe ausgewählt wurden.',motionCaption:'Aufgezeichnete Bewegung dieses Schattens',description:'gefallen, gefunden umfasst 49 Schattenbilder in drei Rängen. Ein Set, ein Licht und eine wählende Person: Sieben Schatten werden ausgewählt, fotografiert und zugeschnitten. Die Bilder werden auf einem Overheadprojektor zum nächsten Set. Drei Neuanordnungen ergeben drei neue Perspektiven. Die sieben Reihen bewahren diesen Ablauf: der Waldspaziergang, drei Perspektiven der ersten sieben Bilder und drei Perspektiven der ersten 28. Wähle eine Reihe, einen Schatten, sein Ausgangscluster oder seine aufgezeichnete Bewegung.'});
const lang=()=>globalThis.SSSWorldView?.language==='de'?'de':'en';
const tx=v=>v&&typeof v==='object'?(v[lang()]??v.en??v.de??''):(v??'');
const stat=(v,l)=>{const m=el('span','ss-hud-stat');m.append(el('b','',String(v)),el('small','',l));return m};
function block(label,right){const b=el('section','ss-hud-block'),h=el('div','ss-hud-label');h.append(el('span','',label));if(right)h.append(el('span','',right));b.append(h);return b}
function button(label,act,active=false,cls='ss-action'){
 const b=el('button',cls,label);b.type='button';b.setAttribute?.('aria-pressed',String(active));b.addEventListener('click',act);return b;
}
function rowTitle(row){return row===1?T[lang()].forest:T[lang()].from(row-1)}
function selectRow(row){selected=null;selectedRow=row;VIEW='still';showWork(null);updateNavigation()}
function selectWork(work){selected=work;selectedRow=work?.row||null;VIEW='still';showWork(work);updateNavigation()}
function returnSheet(){selected=null;selectedRow=null;VIEW='still';showWork(null);updateNavigation()}
function updateNavigation(){
 if(!LAST)return;LAST.content.dataset??={};LAST.content.dataset.detail=String(!!selectedRow);for(const b of LAST.rowButtons||[])b.setAttribute?.('aria-pressed',String(Number(b.dataset?.row)===selectedRow));
 LAST.breadcrumb?.replaceChildren(button(T[lang()].overview,returnSheet,!selectedRow));
 if(selectedRow)LAST.breadcrumb?.append(button(rowTitle(selectedRow),()=>selectRow(selectedRow),!selected));
 if(selected)LAST.breadcrumb?.append(el('span','ss-current',selected.id));
 fitPanel();
}
function imageFigure(src,label,cls=''){
 const url=mediaUrl(src);if(!url)return null;const figure=el('figure','ss-document '+cls),image=el('img');image.src=url;image.alt=label;image.decoding='async';figure.append(image,el('figcaption','',label));return figure;
}
function showWork(w){
 if(!panel)return;panel.replaceChildren();panel.hidden=!w&&!selectedRow;if(panel.hidden)return;
 const t=T[lang()],row=selectedRow||w.row,works=(P.works||[]).filter(x=>x.row===row),rank=works[0]?.rank;
 const b=block(w?w.id:rowTitle(row),`${t.rank} ${w?.rank||rank} · ${t.row} ${row}`);
 b.append(el('p','ss-meta',w?(w.source==='forest'?t.forest:t.from(row-1)):t.seven));
 if(!w){
  const choices=el('nav','ss-work-choices');choices.setAttribute?.('aria-label',t.choose);
  for(const work of works)choices.append(button(work.id,()=>selectWork(work)));
  b.append(choices,el('p','ss-description',row===1?t.rowOne:rank===2?t.rowTwo:t.rowThree));
  const example=works.find(x=>x.cluster_positive);
  if(example){const img=imageFigure(example.cluster_positive,t.positive);if(img)b.append(img)}
 }else{
  const tabs=el('nav','ss-view-choices');tabs.setAttribute?.('aria-label',t.documentation);
  const views=[['still',t.work],...(w.cluster_positive?[['cluster',t.clusterView]]:[]),...(w.animation?[['animation',t.motion]]:[])];
  for(const [mode,label]of views)tabs.append(button(label,()=>{VIEW=mode;showWork(w)},VIEW===mode));b.append(tabs);
  if(VIEW==='cluster'){
   b.append(el('p','ss-description',t.cluster));const pair=el('div','ss-cluster');for(const [src,label]of [[w.cluster_positive,t.positive],[w.cluster_negative,t.negative]]){const figure=imageFigure(src,label);if(figure)pair.append(figure)}b.append(pair);
  }else{const figure=imageFigure(VIEW==='animation'?w.animation:w.still,VIEW==='animation'?t.motionCaption:t.work+' '+w.id);if(figure)b.append(figure)}
  const peers=el('nav','ss-work-choices');peers.setAttribute?.('aria-label',t.choose);for(const peer of works)peers.append(button(peer.id,()=>selectWork(peer),peer.id===w.id));b.append(peers);
 }
 panel.append(b);fitPanel();
}
/* The common grid fixes the containing rectangle; image size and reading
 * flow stay owner-local inside that rectangle. Selection never moves cells. */
function fitPanel(){
 const last=LAST,ui=last?.ui;if(!ui?.bounded||!last.side||!ui.rect)return;
 const h=ui.rect('description').height,value=h+'px';if(last.side.style.getPropertyValue?.('--ss-panel-height')!==value)last.side.style.setProperty?.('--ss-panel-height',value);
}
let LAST=null;
function render({host,content,projection,ui=null,safeArea=null}={}){
 if(!host||!content||!Array.isArray(projection?.works))return false;
 P=projection;ENTERED=true;ensureTier(64);ensureTier(512);host.hidden=false;content.className='interlocutor-content schattenseiten-content';content.replaceChildren();
 const t=T[lang()],works=projection.works,ranks=projection.ranks||[],clusters=new Set(works.map(w=>w.cluster_positive).filter(Boolean)).size;
 const rail=el('div','ss-hud-rail'),top=el('div','ss-hud-top');top.append(el('h1','',tx(projection.title)||'Schattenseiten'),el('span','ss-hud-series','Schattenseiten'));
 for(const [v,l]of [[works.length,t.shadows],[ranks.length,t.ranks],[clusters,t.clusters]])top.append(stat(v,l));const header=el('div','ss-hud-header');header.append(top);
 rail.append(el('p','ss-intro',t.intro));
 const about=el('details','ss-about');about.append(el('summary','',t.about),el('p','ss-description',t.description));rail.append(about);
 const navigation=el('nav','ss-rows');navigation.setAttribute?.('aria-label',t.rows);const rowButtons=[];
 for(const row of [...new Set(works.map(w=>w.row))]){const sample=works.find(w=>w.row===row),b=button(`${t.rank} ${sample.rank} · ${rowTitle(row)}`,()=>selectRow(row),selectedRow===row);b.dataset??={};b.dataset.row=String(row);navigation.append(b);rowButtons.push(b)}rail.append(navigation);
 const words=el('details','ss-author-words');words.append(el('summary','',t.workWords));for(const word of projection.words||[])words.append(el('p','ss-word'+(word?.placeholder?' ss-placeholder':''),word?.placeholder?t.unwritten:tx(word)));rail.append(words);
 const side=el('div','ss-hud-side');panel=el('div','ss-panel');side.append(panel);
 const bottom=el('div','ss-hud-bottom'),breadcrumb=el('nav','ss-breadcrumb');breadcrumb.setAttribute?.('aria-label',t.path);bottom.append(breadcrumb,button(t.flat,()=>globalThis.SSSWorldView?.easeTo?.(shader.view.rest,900),false,'ss-hud-flat'));
 rail.append(side);content.append(header,rail,bottom);LAST={host,content,projection,ui,safeArea,rail,side,bottom,breadcrumb,rowButtons};
 if(ui){ui.bind(header,'header');ui.bind(rail,'description');ui.bind(bottom,'timeline')}
 showWork(selected);updateNavigation();return true;
}
addEventListener('sss:language',()=>{if(LAST&&LAST.content.isConnected)render(LAST)});
addEventListener('sss:safe-area',fitPanel);addEventListener('resize',fitPanel);
function activateFieldPoint({point}={}){if(!ENTERED)return;selectWork(point?.work||null)}
function unmount({host,content}={}){if(host)host.hidden=true;if(content)content.replaceChildren();selected=null;selectedRow=null;panel=null;LAST=null;SIDE_BASE=null;ENTERED=false;MEDIA.get(512).setActive(false);if(entryGL&&GPU.has(entryGL))disposeGPU(entryGL,GPU.get(entryGL),true);entryGL=null}
addEventListener('pagehide',resetMedia);
modules.set(id,Object.freeze({id,shader,render,unmount,fieldProjection,activateFieldPoint}));
})();
