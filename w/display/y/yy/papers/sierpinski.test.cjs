'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'sierpinski.js'),'utf8');
function load(text=source){
  const context={console,performance,SSSDisplayType:{rankPx:()=>12},SSSDisplayNavigation:require('../../../z/navigation-physiology.js'),document:{},SSSWorldView:{orientation:[1,0,0,0]}};
  vm.runInNewContext(text.replace(/\}\)\(\);\s*$/,`globalThis.test={driftBodies,driftOrganisms,flowPoint,holdInTet,random01,collectBody,organismEmber,populationBodies,fieldProjection,identityIndex,parentIndex,buildRecords,mergeGenealogyRepair,createRenderer,drawNames,nameCalls:()=>globalThis.nameCalls||0,setState:s=>state=s,getState:()=>state,setPretext:p=>pretextModule=p,setLens:f=>lensAccess=f};})();`),context);
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
module.exports={load,referenceDrift,referenceFlow,referenceCollect,near};
