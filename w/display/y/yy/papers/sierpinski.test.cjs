'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'sierpinski.js'),'utf8');
function load(text=source,field=null){
  const context={SSSInterlocutorFields:field?{get:()=>field}:null,console,performance,SSSDisplayType:{rankPx:()=>12},SSSDisplayNavigation:require('../../../z/navigation-physiology.js'),document:{},SSSWorldView:{orientation:[1,0,0,0]}};
  vm.runInNewContext(text.replace(/\}\)\(\);\s*$/,`globalThis.test={foldedEdgeGlyphs,bodyDoorPoint,setChamber,collectVisibleBody,edgeMaterial,faceReading,tutorialCandidates,startTutorial,tutorialStep,stopTutorial,cameraZ,draw,ensureBeing,driftBodies,driftOrganisms,flowPoint,holdInTet,random01,collectBody,organismEmber,populationBodies,populationInView,tissueGlyphs,flushTissue,shader,fieldProjection,identityIndex,parentIndex,buildRecords,mergeGenealogyRepair,createRenderer,drawNames,paperLensParts,syncPaperLens,withdrawPaperLens,paperLensReading,paperLensPage,paperLensReady,livePaperLensPart,lensLocal,inLens,drawPaperLens,setLensAPI:L=>globalThis.SSSDisplayLens=L,nameCalls:()=>globalThis.nameCalls||0,setState:s=>state=s,getState:()=>state,setPretext:p=>pretextModule=p,setLens:f=>lensAccess=f};})();`),context);
  return context.test;
}
const api=load(),clone=x=>JSON.parse(JSON.stringify(x));
function referenceDrift(sim,items,dt,reach,spring=6){
  const bodies=items.map(it=>{let b=sim.bodies.get(it.id);if(!b){b={p:[...it.target],v:[0,0,0]};sim.bodies.set(it.id,b)}return b});
  const force=bodies.map((b,i)=>items[i].target.map((v,k)=>(v-b.p[k])*spring));
  for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
    const R=reach(items[i],items[j]);let dv=bodies[i].p.map((v,k)=>v-bodies[j].p[k]),dist=Math.hypot(...dv);if(dist>=R)continue;
    if(dist<1e-9){const a=api.random01(items[i].id,items[j].id)*Math.PI*2;dv=[Math.cos(a),Math.sin(a),.3];dist=Math.hypot(...dv)}
    const f=12.8*(1-dist/R)*R/dist;for(let k=0;k<3;k++){force[i][k]+=dv[k]*f;force[j][k]-=dv[k]*f}
  }
  const drag=Math.exp(-4*dt);bodies.forEach((b,i)=>{for(let k=0;k<3;k++){b.v[k]=(b.v[k]+force[i][k]*dt)*drag;b.p[k]+=b.v[k]*dt}});return bodies;
}
function referenceFlow(e,now){const points=[e.motionA,e.motionB,e.motionC,e.motionD].filter(Boolean);if(points.length<2)return e.world;
  const phase=api.random01(e.id,'flow-phase')*points.length,speed=.72+(1.28-.72)*api.random01(e.id,'flow-speed'),u=now/42000*speed+phase,index=Math.floor(u%points.length),z=u%points.length-index,t=z*z*(3-2*z);
  const wander=points[index].map((v,k)=>v+(points[(index+1)%points.length][k]-v)*t);return e.world.map((v,k)=>v+(wander[k]-v)*.86);
}
const reach=(a,b)=>.08+a.size+b.size;
for(const n of [0,1,2,55,209]){
  const items=Array.from({length:n},(_,i)=>({id:'S.'+i,target:[Math.sin(i)*.2,Math.cos(i*3)*.2,(i%7)*.04],size:.0012*2**(i%7)})),a={bodies:new Map()},b={bodies:new Map()};
  if(n>1){a.bodies.set('S.0',{p:[0,0,0],v:[.1,-.2,.3]});a.bodies.set('S.1',{p:[0,0,0],v:[0,0,0]});b.bodies=new Map([...a.bodies].map(([k,v])=>[k,clone(v)]))}
  for(let frame=0;frame<120;frame++){const dt=[0,.001,1/60,.05][frame%4];referenceDrift(a,items,dt,reach,3);api.driftBodies(b,items,dt,reach,3);assert.deepEqual([...b.bodies].map(([k,v])=>[k,clone(v)]),[...a.bodies]);}
}
for(const d of [0,1e-10,.079999999,.08,.080000001,1]){
  const items=[{id:'a',target:[0,0,0],size:0},{id:'b',target:[d,0,0],size:0}],a={bodies:new Map()},b={bodies:new Map()};
  assert.deepEqual(clone(api.driftBodies(b,items,.02,reach)),clone(referenceDrift(a,items,.02,reach)));
}
const entity={id:'S.flow',world:[.1,.2,.3],motionA:[0,0,0],motionB:[1,0,0],motionC:[0,1,0],motionD:[0,0,1]};
for(const now of [0,1,6400,42000,1e7])assert.deepEqual(clone(api.flowPoint(entity,now)),referenceFlow(entity,now));
entity.motionB=[-.3,.5,.9];assert.deepEqual(clone(api.flowPoint(entity,5000)),referenceFlow(entity,5000));
function referenceHold(body,tet){const [a,b,c,d]=tet,sub=(a,b)=>a.map((v,i)=>v-b[i]),det3=(a,b,c)=>a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]),e1=sub(a,d),e2=sub(b,d),e3=sub(c,d),r=sub(body.p,d),det=det3(e1,e2,e3);if(Math.abs(det)<1e-12)return false;
  let l=[det3(r,e2,e3)/det,det3(e1,r,e3)/det,det3(e1,e2,r)/det];l.push(1-l[0]-l[1]-l[2]);if(l.every(x=>x>=0))return false;l=l.map(x=>Math.max(0,x));const s=l.reduce((u,v)=>u+v,0)||1;body.p=[0,1,2].map(k=>(l[0]*a[k]+l[1]*b[k]+l[2]*c[k]+l[3]*d[k])/s);return true;}
for(const tet of [require('../../../z/navigation-physiology.js').V0,[[0,0,0],[0,0,0],[0,0,0],[0,0,0]],[[1,0,0],[0,1,0],[0,0,1],[-1,-1,-1]]])for(const p of [[0,0,0],[1,1,1],[.2,-.3,4],[-4,0,0],tet[0]]){const a={p:[...p]},b=clone(a);assert.equal(api.holdInTet(a,tet),referenceHold(b,tet));assert.deepEqual(a,b);}
console.log('Papers scalar physics/flow exact-reference checks PASS');
function referenceCollect(a,s,id,center,scale,camera,height,leaves,lights,depth=0){
  const ps=s.parents.get(id)||[],px=(scale/camera)*(height/2)/Math.tan((Math.PI/3.3)/2)*2,entity=s.identities.get(id),pal={w:[.34,.78,.64],x:[.42,.82,.88],z:[.78,.78,.60],y:[.52,.93,.48]}[entity?.gene||'x'];
  if(entity)lights.push(a.organismEmber(id,center,px,entity,depth===0));
  if(ps.length!==4||px<7||depth>=8){leaves.push({id,center,scale,color:[...pal,.11+Math.min(.30,px/150)]});return}
  for(let i=0;i<4;i++)referenceCollect(a,s,ps[i],center.map((v,k)=>v+s.renderer.V0[i][k]*scale*.5),scale*.5,camera,height,leaves,lights,depth+1);
}
function near(a,b){
  if(typeof a==='number'){assert.ok(Math.abs(a-b)<=2e-13*Math.max(1,Math.abs(b)),`${a} != ${b}`);return}
  if(a&&typeof a==='object'){assert.deepEqual(Object.keys(a),Object.keys(b));for(const k of Object.keys(a))near(a[k],b[k]);return}assert.equal(a,b);
}
const V0=require('../../../z/navigation-physiology.js').V0,identities=new Map(),parents=new Map();
for(let rank=0;rank<=8;rank++)for(let i=0;i<4;i++){const id=rank?`${rank}H.${i}`:`S.${i}`;identities.set(id,{id,rank:rank?`${rank}H`:'S',gene:['w','x','z','y'][i]});if(rank)parents.set(id,Array.from({length:4},(_,j)=>rank===1?`S.${j}`:`${rank-1}H.${j}`))}
let s={identities,parents,inquiryBodies:{},renderer:{V0}};api.setState(s);
for(const rank of [0,1,4,6,8])for(const height of [390,720])for(const px of [6.999999,7,7.000001,13.999999,14,28,224]){
  const id=rank?`${rank}H.0`:'S.0',camera=3.2,scale=px*camera*Math.tan((Math.PI/3.3)/2)/height,L=[],E=[],R=[],RE=[];
  api.collectBody(id,[.1,-.2,.3],scale,camera,height,L,E);referenceCollect(api,s,id,[.1,-.2,.3],scale,camera,height,R,RE);near(clone(L),R);near(clone(E),RE);
  assert.equal(E.length,RE.length);assert.ok(s.bodyTemplates.nodes<=200000);
}
const collect=()=>{const L=[],E=[];api.collectBody('6H.0',[0,0,0],.08,.08,720,L,E);return {L:clone(L),E:clone(E)}};
const first=collect(),cache=s.bodyTemplates;assert.equal(first.E.length-1,5460);collect();assert.equal(s.bodyTemplates,cache);
s.inquiryBodies={'6H.0':{metabolites:[{title:'new source-owned yield'}]}};const changed=collect();assert.notEqual(s.bodyTemplates,cache);assert.notEqual(changed.E[0].color[3],first.E[0].color[3]);
s.parents=new Map(s.parents);s.parents.set('6H.0',['S.0','S.1','S.2','S.3']);assert.equal(collect().E.length,5);
s.identities=new Map(s.identities);s.identities.set('S.0',{id:'S.0',rank:'S',gene:'y'});assert.deepEqual(collect().L[0].color.slice(0,3),[.52,.93,.48]);
console.log('Papers finite-LOD/background+selected collector/reference/source-invalidation checks PASS');
const names=load(source.replace('const G=nameGlyphs(rec,L);','globalThis.nameCalls=(globalThis.nameCalls||0)+1;const G=null;'));
const record={id:'S.name',rank:'S',locus:'x',world:[0,0,0]},records=[record],cached={open:1},ctx={beginPath(){},arc(){},clip(){},save(){},restore(){}};
const ns={records,identities:new Map(),namesFor:records,names:new Map([['S.name@60',cached]]),textCanvas:{dataset:{},getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0})},pretextStatus:'ready',canvas:{style:{}},chamberFocus:{center:[0,0,0],scale:1}};
names.setState(ns);names.setPretext({});names.setLens(()=>({x:-100,y:-100,r:20}));names.drawNames({width:800,height:600},1);assert.equal(cached.open,0);
assert.equal(names.nameCalls(),0);assert.equal(ns.names.size,1);names.setLens(()=>({x:400,y:300,r:20}));names.drawNames({width:800,height:600},2);assert.equal(names.nameCalls(),1);
console.log('Papers cold off-lens admission/re-entry execution checks PASS');
const events=[],constants=new Map();let bound,serial=0;
const gl=new Proxy({},{get(_,k){if(/^[A-Z_]+$/.test(k)){if(!constants.has(k))constants.set(k,constants.size+1);return constants.get(k)}if(k.startsWith('create'))return()=>({serial:++serial});if(k==='getShaderParameter'||k==='getProgramParameter')return()=>true;if(k==='getAttribLocation')return()=>serial++;if(k==='getUniformLocation')return(_,name)=>name;if(k==='bindBuffer')return(_,buffer)=>{bound=buffer};if(k==='bufferData')return(_,data)=>events.push({kind:'allocate',buffer:bound,data:typeof data==='number'?data:[...data]});if(k==='bufferSubData')return(_,offset,data)=>events.push({kind:'upload',buffer:bound,offset,data:[...data]});return(...args)=>events.push({kind:k,args});}});
const renderer=api.createRenderer({getContext:()=>gl}),instances=[{center:[1,.2,-.3],scale:.08,color:[.1,.2,.3,.4]}],args=[[1,0,0,0],[0,0,0],new Float32Array(16),new Float32Array(16)];
renderer.draw(instances,...args);assert.equal(events.filter(x=>x.kind==='upload').length,1);assert.deepEqual(events.find(x=>x.kind==='upload').data,[...new Float32Array([1,.2,-.3,.08,.1,.2,.3,.4])]);assert.equal(events.filter(x=>x.kind==='drawArraysInstanced').length,2);
const allocated=events.filter(x=>x.kind==='allocate').length;renderer.draw(instances,...args,{faces:false});assert.equal(events.filter(x=>x.kind==='allocate').length,allocated);assert.equal(events.filter(x=>x.kind==='upload').length,2);
const lights=[{center:[1,2,3],size:12,color:[.1,.2,.3,.4],phase:.5}];renderer.drawLights(lights,...args,1,1.5,.7);const upload=events.filter(x=>x.kind==='upload').at(-1);assert.deepEqual(upload.data,[...new Float32Array([1,2,3,18,.1,.2,.3,.4*.7,.5])]);const la=events.filter(x=>x.kind==='allocate').length;renderer.drawLights(lights,...args,2,1.5,.7);assert.equal(events.filter(x=>x.kind==='allocate').length,la);assert.deepEqual(events.filter(x=>x.kind==='depthMask').at(-1).args,[true]);
console.log('Papers reused instance/light buffer values, single upload and draw-state checks PASS');
/* Encounter-relative LOD: same source organisms; no off-screen descendant rendering. */
const lod=load(),liveEntities=new Map(),liveRecords=[];
for(const [id,world] of [['S.visible',[0,0,0]],['S.offscreen',[500,0,0]]]){
  const entity={id,rank:'S',gene:'w',world};
  liveEntities.set(id,entity);liveRecords.push(entity);
}
const visibleState={records:liveRecords,identities:liveEntities,parents:new Map(),inquiryBodies:{},
  renderer:{V0},chamberFocus:{center:[0,0,0],scale:3},current:null};
lod.setState(visibleState);
const scoped=lod.populationBodies(1200,800,1,1,0,3.2);
assert.equal(scoped.considered,1,'only the visible rank-level background organism earns geometry');
assert.equal(scoped.leaves.length,1);
assert.equal(liveRecords.length,2,'unseen organism remains in local truth');
visibleState.chamberFocus.scale=1;
assert.equal(lod.populationBodies(1200,800).considered,2,'resting overview needs no extra viewport scan');
assert.equal(lod.populationInView([0,0,0],.02,1200,800,3.2,[1,0,0,0]),true);
assert.equal(lod.populationInView([100,0,0],.02,1200,800,3.2,[1,0,0,0]),false);
assert.equal(lod.populationInView([0,0,100],.02,1200,800,3.2,[1,0,0,0]),false);
const roots=new Map(),genealogy=new Map();
for(let i=0;i<4;i++)roots.set('S.'+i,{id:'S.'+i,rank:'S',gene:'w'});
for(let rank=1;rank<=10;rank++){
  const id=rank+'H.n',parent=rank===1?'S.0':(rank-1)+'H.n';
  roots.set(id,{id,rank:rank+'H',gene:'w'});genealogy.set(id,[parent,'S.1','S.2','S.3']);
}
visibleState.identities=roots;visibleState.parents=genealogy;visibleState.bodyTemplates=null;
lod.setState(visibleState);
const deepLeaves=[],deepLights=[];
lod.collectBody('10H.n',[0,0,0],10,3.2,720,deepLeaves,deepLights);
assert(deepLeaves.some(x=>x.id==='S.0'),'true rank-10 genealogy remains traversable beyond old fixed depth 8');
assert(deepLights.length>9);

const ink=load(),calls=[],tissueCanvas={dataset:{}},textCanvas={getBoundingClientRect:()=>({left:0,top:0})};
const tissueState={tissue:{draw(T){calls.push(T.length)}},tissueCanvas,textCanvas,tissueLive:false,mounted:true,
  environmentCanvas:{},canvas:{},tissueDpr:1,tissueLens:{x:30,y:30,r:10},tissueLetters:[]};
ink.setState(tissueState);
const glyphs=[{ch:'A',x:30,y:30},{ch:'B',x:300,y:300}],place=g=>({x:g.x,y:g.y,cx:g.x,cy:g.y});
ink.tissueGlyphs(glyphs,()=>true,place,5,1,()=>1);
assert.equal(tissueState.tissueLetters.length,1,'outside-lens glyphs are not instanced');
tissueState.tissueLens=null;tissueState.tissueLetters=[];
ink.tissueGlyphs(glyphs,()=>true,place,5,1,()=>1);
assert.equal(tissueState.tissueLetters.length,2,'without lens the same letters remain admissible');
tissueState.tissueLetters=[];ink.flushTissue({width:800,height:600});
assert.equal(calls.length,0,'idle overview avoids full-screen tissue pass');
assert.equal(ink.shader.composite().length,1,'unused tissue canvas is not uploaded to glass');
tissueState.tissueLetters=[{ch:'A'}];ink.flushTissue({width:800,height:600});
assert.equal(ink.shader.composite().length,2,'active tissue remains in the shared glass');
tissueState.tissueLetters=[];ink.flushTissue({width:800,height:600});
ink.flushTissue({width:800,height:600});
assert.deepEqual(calls,[1,0],'on exit the previous text clears exactly once');
assert.equal(ink.shader.composite().length,1,'the spent tissue texture is no longer composited');
console.log('Papers camera-relative LOD, rank-10 descent and bounded text-tissue compositing PASS');

module.exports={load,referenceDrift,referenceFlow,referenceCollect,near};

/* Papers is the second consumer: actual authored parts, complete range paging,
 * host-relative placement and lock lifecycle without a Descent mutation. */
{
  const reading=load(),Lens=require('../../../z/display-lens.js'),box={left:120,top:40,width:480,height:600,right:600,bottom:640};
  const ctx={font:'',measureText:t=>({width:Array.from(t).length*7})};
  const state={mounted:true,host:{hidden:false,getBoundingClientRect:()=>box},current:{id:'S.authored'},transition:1,inner:null,stack:['parent'],localQ:[1,0,0,0],
    ui:{carrier:{x:0,y:60,w:480,h:540}},textCanvas:{dataset:{},getBoundingClientRect:()=>box,getContext:()=>ctx},wisdomPrepared:new Map()};
  const sourceText=Array.from({length:900},(_,i)=>'word'+i).join(' ');
  const B={id:'S.authored',verts:[{i:0,text:'w · Authored vertex'},{i:1,text:''}],edges:[{key:'wx',a:0,b:1,text:sourceText}],faces:[{key:'wxz',idx:[0,1,2],text:'A face actually earned by this source.'}]};
  const G={P:[{x:40,y:70},{x:260,y:80},{x:140,y:300},{x:180,y:160}],front:{wxz:true},mets:[]};
  reading.setState(state);reading.setLensAPI(Lens);
  reading.setPretext({prepareWithSegments:text=>({chars:Array.from(text)}),layoutNextLineRange:(p,c,w)=>c.segmentIndex>=p.chars.length?null:{start:c.segmentIndex,end:{segmentIndex:Math.min(p.chars.length,c.segmentIndex+Math.max(1,Math.floor(w/7))),graphemeIndex:0}},materializeLineRange:(p,r)=>({text:p.chars.slice(r.start,r.end.segmentIndex).join(''),width:(r.end.segmentIndex-r.start)*7})});
  const before=clone({inner:state.inner,stack:state.stack,localQ:state.localQ,current:state.current});
  reading.syncPaperLens(B,G);assert.equal(Lens.resolveTargets().length,3,'missing authored vertex is not replaced by invented content');
  assert.equal(state.lensReading,undefined,'offering parts does not acquire their readable layout');
  const target=[...state.lensParts.values()].find(p=>p.kind==='edge'),resolved=Lens.resolveTargets(target.id).find(t=>t.id===target.id);
  assert.equal(resolved.cx,box.left+150);assert.equal(resolved.cy,box.top+75);
  const page=state.lensReading;assert.ok(page.pages>1);assert.equal(page.lines.map(l=>l.text).join(''),sourceText,'no fixed row budget drops authored text');
  assert.ok(page.frame.left>=box.left&&page.frame.top>=box.top+60,'UI carrier is converted from host-local coordinates');
  assert.ok(page.frame.left+page.frame.width<=box.right&&page.frame.top+page.frame.height<=box.bottom);
  assert.ok(page.lines.every(l=>l.width<=page.width-2*page.pad));
  const delivered=[];for(let i=0;i<page.pages;i++){delivered.push(...page.lines.slice(page.page*page.rows,(page.page+1)*page.rows).map(l=>l.text));reading.paperLensPage(1)}
  assert.equal(delivered.join(''),sourceText);assert.equal(reading.paperLensPage(1),false);reading.paperLensPage(-Infinity);assert.equal(page.page,0);
  assert.deepEqual(clone({inner:state.inner,stack:state.stack,localQ:state.localQ,current:state.current}),before,'contact and pagination do not navigate, rotate or mutate inquiry');
  assert.equal(reading.paperLensReady({round:1,hx:40,hy:40},page),false,'prior representation stays valid while the drop is still growing');
  assert.equal(reading.paperLensReady({round:0,hx:page.width/2,hy:page.height/2},page),true);
  reading.setLens(()=>({x:300,y:200,r:40,hx:100,hy:40,round:0,corner:10,lock:{id:target.id,kind:'body'}}));
  const local=reading.lensLocal(box);assert.equal(local.x,180);assert.equal(local.y,160);assert.equal(local.hx,100);assert.equal(local.lock.id,target.id);
  assert.equal(reading.inLens(local,local.x+90,local.y),true);assert.equal(reading.inLens(local,local.x+100,local.y+40),false,'interaction follows rounded geometry rather than a lost circle radius');
  const nodes={p:{textContent:''},small:{textContent:''}};state.lensReader={hidden:true,dataset:{},querySelector:s=>nodes[s]};state.tissueLetters=[];
  Object.assign(ctx,{save(){},restore(){},setTransform(){},beginPath(){},roundRect(){},arc(){},clip(){},fillText(){}});
  const shape={x:page.frame.left+page.width/2-box.left,y:page.frame.top+page.height/2-box.top,hx:page.width/2,hy:page.height/2,round:0,corner:page.pad,r:Math.min(page.width,page.height)/2};
  reading.drawPaperLens(ctx,shape,target,{width:box.width,height:box.height},1);
  assert.equal(nodes.p.textContent,sourceText,'assistive reading retains the complete admitted original');
  assert.equal(state.lensReader.hidden,false);assert.ok(state.tissueLetters.length>0);
  assert.equal(state.tissueLetters.map(g=>g.ch).join(''),page.lines.slice(0,page.rows).map(l=>l.text).join('').replace(/ /g,''),'the current page becomes actual bare letter bodies in the existing tissue plane');
  assert.ok(state.tissueLetters.every(g=>g.fat===0),'the contacted fine representation is readable rather than inflated tissue');
  G.P[0].x+=20;G.P[1].x+=20;reading.syncPaperLens(B,G);assert.equal(Lens.resolveTargets(target.id).find(t=>t.id===target.id).cx,box.left+170,'offered identity follows the moving body');
  G.front.wxz=false;reading.syncPaperLens(B,G);assert.equal(Lens.resolveTargets().length,2,'a vanished face withdraws');
  state.current=null;assert.equal(Lens.resolveTargets().length,0);reading.withdrawPaperLens();assert.equal(Lens.resolveTargets().length,0);
  state.current={id:'S.authored'};state.ui.carrier.h=8;assert.equal(reading.paperLensReading(target).ready,false,'no unreadable tiny-screen substitute is fabricated');
  console.log('Papers authored lens offers, full-text continuation, relocation, geometry and semantic non-mutation PASS');
}
/* A foreshortened edge never becomes a viewport-sized sentence. The full
 * authored text remains separate from this geometric material budget. */
for(const length of [.001,.1,2,30,300,1200])for(const width of [1,30,600,12000]){
 const edge={glyphs:[],bounds:{x0:-width/2,x1:width/2,y0:-10,y1:40}},m=api.edgeMaterial(edge,length);
 assert(m.scale>0&&m.scale<=1);assert((width+12)*m.scale<=length*.92+1e-8);assert.equal(m.half,length*.46);
}
assert(api.faceReading([{x:0,y:0},{x:300,y:0},{x:150,y:250}]));
assert(!api.faceReading([{x:0,y:0},{x:300,y:0},{x:150,y:2}]));
assert(!api.faceReading([{x:0,y:0},{x:30,y:0},{x:15,y:25}]));
{
const shadow=JSON.parse(fs.readFileSync(path.join(__dirname,'public/papers-shadow/current.json'))).snapshot,projection=shadow.projection;
const field={path:'x',get container(){return this.path},descendTo(path){if(!path.startsWith(this.path))return false;this.path=path;return true},ascend(){this.path=this.path.slice(0,-1);return true}};
const tour=load(source,field),built=tour.buildRecords(projection,tour.fieldProjection(projection).root),identities=tour.identityIndex(projection),parents=tour.parentIndex(projection),before=JSON.stringify(shadow);
const label={textContent:'',classList:{add(){},remove(){}}},canvas={dataset:{},getBoundingClientRect:()=>({width:390,height:844})};
const ts={structure:built.structure,records:built.records,recordById:new Map(built.records.map(r=>[r.id,r])),identities,parents,inquiryBodies:shadow.inquiry.bodies,projection,shadowApplied:true,canvas,label,renderer:{V0},chamberPath:'x',chamberFocus:{center:[0,0,0],scale:1},tutorialButton:{},textCanvas:{getContext:()=>({measureText:()=>({width:6})})},wisdomPrepared:new Map(),current:null,stack:[],transition:0};tour.setState(ts);
const eligible=tour.tutorialCandidates();assert(eligible.length>=2,'current public population must supply multiple actual rank-4 witnesses');
const visited=[];
for(let repeat=0;repeat<2;repeat++){
 assert(tour.startTutorial(0));visited.push(ts.tutorial.specimen);assert.equal(field.container,ts.recordById.get(ts.tutorial.specimen).locus);
 for(let time=5600;time<=72800&&ts.tutorial;time+=5600){tour.tutorialStep(time);if(ts.current){tour.ensureBeing(identities.get(ts.current.id),390);ts.transition=1;}}
 assert.equal(ts.tutorial,null);assert.equal(ts.current,null);assert.equal(ts.chamberPath,'x');assert.equal(field.container,'x');
}
assert.notEqual(...visited);assert.equal(JSON.stringify(shadow),before,'teaching must not mutate source-owned semantic truth');
const saved=ts.records;ts.records=[];assert.deepEqual(clone(tour.tutorialCandidates()),[]);assert.equal(tour.startTutorial(),false);ts.records=saved;
console.log('Papers live endpoint material, facing/size gates and two actual rank-4 recursive tutorial/return witnesses PASS',JSON.stringify({eligible:eligible.length,visited}));

}

{const glyphs=Array.from({length:4000},(_,i)=>({ch:String(i)})),edge={glyphs,unravel:0,weave:0};
assert(api.foldedEdgeGlyphs(edge,80,1).length<=80);assert.equal(edge.glyphs.length,4000);
edge.weave=.2;assert.equal(api.foldedEdgeGlyphs(edge,80,1),glyphs,'opening restores every authored glyph; the source words never change');}
