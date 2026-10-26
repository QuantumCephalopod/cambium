'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');

// The enclosing witness lends a capability, so whole-body relocation needs no host path edit.
if(!process.argv[2])throw new Error('pass the shared recursive-fold module as the witness argument');
globalThis.SSSRecursiveFold=require(path.resolve(process.argv[2]));
globalThis.SSSInterlocutorModules=new Map();
require('./render.js');

const moduleRef=globalThis.SSSInterlocutorModules.get('organism:crawlerbait');
assert(moduleRef,'crawlerbait module did not register');
const projection=JSON.parse(fs.readFileSync(path.join(__dirname,'projection.json'),'utf8'));
const field=moduleRef.fieldProjection(projection);

assert(field&&field.root&&Array.isArray(field.points),'crawlerbait field projection missing root/points');
assert(field.points.length<=16,'entry must resolve at most its two-rank frontier');
const folded=moduleRef._law.createBaitFold(moduleRef._law.buildGrowth(projection.routes));folded.seek(Infinity);
const endField=folded.view('');

function nodeAt(root,address){
  let node=root;
  for(const gene of address){
    node=node?.children?.[gene];
    if(!node)return null;
  }
  return node;
}
function assertClosedSplits(node,address=''){
  const children=node?.children||{};
  const keys=Object.keys(children);
  if(!keys.length)return;
  assert.deepStrictEqual(new Set(keys),new Set(['w','x','z','y']),`partial tetrahedral split at ${address||'ε'}`);
  for(const gene of ['w','x','z','y'])assertClosedSplits(children[gene],address+gene);
}

assertClosedSplits(field.root,'');
for(const route of projection.routes){
  assert(/^[wxzy]+$/.test(route.address),`invalid bait address ${route.address}`);
  assert.deepStrictEqual(folded.routeAt(route.address),route,'fold lost exact source tissue');
}
assert.strictEqual(folded.root.count,projection.routes.length,'fold lost an occupant');
const represented=endField.points.reduce((n,p)=>n+(p.fold?p.count:1),0);
assert.strictEqual(represented,projection.routes.length,'frontier folds must carry every contained Bait');
assertClosedSplits(endField.root);
assert.strictEqual(field.root.noun,'Crawlerbait','public name must remain Crawlerbait at root');
assert(!['Traces','Membrane','Tide'].includes(field.root.children?.w?.noun),'non-bait root anatomy leaked into bait-space field');
console.log(`PASS · ${projection.routes.length} baits remain exact behind the bounded two-rank Bait frontier`);
// beings: every being keeps its derived kind, walks only Sierpinski edges between its own recorded baits, and the goo stays inside its splat budget
const law=moduleRef._law;
assert(law&&typeof law.buildLife==='function','crawlerbait life law missing');
const life=law.buildLife(projection);
assert(life&&life.sessions.length>0,'no being walks: projection encounters did not become sessions');
const kinds={w:0,x:0,z:0,y:0};for(const c of projection.crawlers)kinds[c.kind]++;
assert.deepStrictEqual(life.totals,kinds,'life kind totals diverged from projected being kinds');
assert.strictEqual(Object.values(life.totals).reduce((a,b)=>a+b,0),projection.crawlers.length,'a being fell out of its kind');
const near=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])<1e-9;
assert(life.sessions.every(S=>!S.prepared),'initial acquisition prepared future walks');
for(const S of life.sessions.slice(0,400)){law.prepareWalk(S);
  assert(near(S.pts[0],law.pointOf(S.wps[0].a)),'a walk does not begin at its first recorded bait');
  assert(near(S.pts[S.pts.length-1],law.pointOf(S.wps[S.wps.length-1].a))||S.wps.length===1,'a walk does not end at its last recorded bait');
  for(let j=1;j<S.wps.length;j++)assert(S.wps[j].t>=S.wps[j-1].t,'a walk reorders its own record');
}
for(const at of [.3,.85]){
  const r=law.simulate({projection,at,frames:90});
  assert(r.alive>0,`no being alive at ${at} of the record`);
  assert(r.splats>0&&r.splats<=90000,`goo splat budget broken at ${at}: ${r.splats}`);
}
// A foreground sibling selection must never remove source population. With the
// same camera/pixel resolution, all local containers yield the same LOD tissue.
const neutral=law.simulate({projection,at:.3,frames:90,container:''});
for(const container of ['w','z','wxzy']){
  const r=law.simulate({projection,at:.3,frames:90,container});
  assert.deepStrictEqual(r.ids,neutral.ids,'selection removed an observed sibling Being');
  assert.deepStrictEqual(r.cells,neutral.cells,'selection, rather than pixels, changed LOD');
  assert.equal(r.hidden,0);assert(r.splats<90000);
  const byCell=new Map();for(const c of r.cells)if(c)byCell.set(c,(byCell.get(c)||0)+1);
  for(const n of byCell.values())assert(n>=2,'a lone Being cannot coalesce with itself');
}
assert.equal(law.resolutionCell('wxyz',(p,r)=>r*1e8),'');
assert(law.resolutionCell('wxzy',(p,r)=>r)>='w');
console.log(`PASS · ${life.sessions.length} walks by ${projection.crawlers.length} beings keep their kinds and their recorded order`);

// The same public tissue changes address without changing identity. A terminal
// repeat remains an inhabited self-child; the other occupant derives its sibling.
const births=[{path:'/a',address:'ww',first_seen:'2026-01-01T00:00:00Z'},{path:'/b',address:'wx',first_seen:'2026-01-02T00:00:00Z'},{path:'/c',address:'x',first_seen:'2026-01-03T00:00:00Z'}];
const G=law.buildGrowth(births),t=Date.parse('2026-01-01T12:00:00Z');
assert.equal(G.address('/a',t),'w');assert.equal(G.address('/b',t),null);
assert.equal(G.address('/a',t+86400000),'ww');assert.equal(G.address('/b',t+86400000),'wx');
assert(near(law.pointOf('w'),law.pointOf('ww')),'self-child moved off its original point');
const early=moduleRef.fieldProjection({routes:G.routesAt(t)}),late=moduleRef.fieldProjection({routes:G.routesAt(Infinity)});
assert.equal(early.points[0].id,late.points.find(p=>p.label==='/a').id,'split replaced public identity');
assert(nodeAt(late.root,'ww').bait,'living tissue excluded from self-child');
const whole=law.buildGrowth(projection.routes);for(const r of projection.routes)assert.equal(whole.address(r.path,Infinity),r.address,'replay does not recover canonical address');
const facts=law.publicFacts([{t:1,a:'w',method:'GET',status:200},{t:86400001,a:'x',method:'GET',status:200},{t:86400002,a:'z',method:'GET',status:404},{t:86400003,a:'y',method:'POST',status:201}]);
assert.deepEqual(law.prefixFacts(facts,0),{events:0,days:0,baits:0,k:'x'});
for(const [at,k,events,days]of [[1,'x',1,1],[86400001,'y',2,2],[86400002,'z',3,2],[86400003,'w',4,2]]){const f=law.prefixFacts(facts,at);assert.equal(f.k,k);assert.equal(f.events,events);assert.equal(f.days,days)}
const rows=law.triangleRows([{x:0,y:0},{x:240,y:0},{x:120,y:240}],16);
assert(rows.length>5);for(const r of rows){assert(r.w>0);assert(r.x>=0&&r.x+r.w<=240)}
console.log('PASS · stable tissue, eligible self-child, all canonical addresses, temporal births and earned morphology');

const blend=law.simulate({projection,at:.3,frames:91,container:'',changeAt:90,nextContainer:'w'});assert(blend.fineShares.every(x=>x>=0&&x<=1));assert.deepStrictEqual(blend.ids,law.simulate({projection,at:.3,frames:91}).ids,'container change removed a Being');

for(const S of life.sessions){assert.equal(law.prefixFacts(S.b.history,Infinity).k,S.b.k,'prefix replay kind fails to recover canonical kind')}

// Full source is an independent oracle for folds, including reverse replay.
// A fold must never ask growth for the flat population it is replacing.
const reference=law.buildGrowth(projection.routes),indexed=law.buildGrowth(projection.routes);
indexed.routesAt=()=>{throw new Error('fold requested the flat population')};
const F=law.createBaitFold(indexed),start=Date.parse(projection.raw_capture_start),end=Date.parse(projection.raw_capture_end);
for(const fraction of [0,.01,.1,.3,.85,1,.3,0,1]){
  const t=start+(end-start)*fraction;F.seek(t);
  const expected=reference.routesAt(t);
  assert.equal(F.root.count,expected.length);
  for(const r of expected)assert.deepStrictEqual(F.routeAt(r.address),r,'replay/rewind lost source truth');
  const v=F.view('');assertClosedSplits(v.root);
  assert(v.points.length<=16);assert(F.work.visited<=21);
  assert.equal(v.points.reduce((n,p)=>n+(p.fold?p.count:1),0),expected.length);
  const same=F.root;F.seek(t);assert.strictEqual(F.root,same);assert.equal(F.work.edits,0);
}
const small=law.createBaitFold(law.buildGrowth(births));small.seek(t);
const untouched=small.root.children.w;
small.seek(Date.parse('2026-01-03T12:00:00Z'));
assert.strictEqual(small.root.children.w.children.w.value,births[0],'leaf must retain actual source identity');
const w=small.root.children.w;small.seek(Date.parse('2026-01-02T12:00:00Z'));
assert.strictEqual(small.root.children.w,w,'an x birth/rewind rebuilt its w sibling');
small.seek(t);assert.strictEqual(small.routeAt('w').path,'/a');assert.equal(small.routeAt('ww'),null);
assert.equal(untouched.value.path,'/a','a prior generation was mutated');
assert.throws(()=>small.view('invalid'),/invalid/);

// Every birth and collision in a small independent source, including equal-time
// births, is compared with the old full-history projection in both directions.
function population(depth){
  const genes=['w','x','z','y'],out=[];
  for(let i=0;i<4**depth;i++){
    let n=i,address='';for(let j=0;j<depth;j++){address=genes[n%4]+address;n=Math.floor(n/4)}
    out.push({path:'/fixture/'+i,address,first_seen:new Date(1700000000000+Math.floor(i/2)).toISOString()});
  }return out;
}
const fixtureSource=population(3),fixtureG=law.buildGrowth(fixtureSource),fixtureFold=law.createBaitFold(fixtureG);
for(const order of [fixtureG.births,[...fixtureG.births].reverse()])for(const birth of order){
  fixtureFold.seek(birth.t);const expected=fixtureG.routesAt(birth.t);
  assert.equal(fixtureFold.root.count,expected.length);
  for(const r of expected)assert.deepStrictEqual(fixtureFold.routeAt(r.address),r);
}
const scaling=[];
for(const depth of [4,6,8]){
  const G=law.buildGrowth(population(depth)),fold=law.createBaitFold(G);fold.seek(Infinity);
  const v=fold.view('');assert.equal(v.points.length,16);assert.equal(fold.work.visited,21);
  assert.equal(v.points.reduce((n,p)=>n+p.count,0),4**depth);
  const path='w'.repeat(depth-2),deep=fold.view(path);
  assert(deep.points.length<=16);assert(fold.work.visited<=4*path.length+21);
  const last=G.births.at(-1).t;fold.seek(last-1);fold.seek(last);
  assert(fold.work.edits<=12*depth,'one equal-time birth group paid for unrelated population');
  scaling.push({baits:4**depth,overviewVisits:21,descentVisits:fold.work.visited,birthPathEdits:fold.work.edits});
}
// Genealogy is iterative; no configured end rank or JS recursion ceiling.
const prefix='w'.repeat(1536),deepRoutes=[{path:'/deep-a',address:prefix+'x',first_seen:'2026-01-01T00:00:00Z'},
  {path:'/deep-b',address:prefix+'z',first_seen:'2026-01-02T00:00:00Z'}];
const deep=law.createBaitFold(law.buildGrowth(deepRoutes));deep.seek(Infinity);
assert.equal(deep.routeAt(prefix+'x').path,'/deep-a');
assert.equal(deep.view(prefix).points.length,2);assert(deep.work.visited<=4*prefix.length+21);
deep.seek(Date.parse('2026-01-01T12:00:00Z'));assert.equal(deep.routeAt('w').path,'/deep-a');

// Explicit generation acquisition also reacquires a reused source object.
const reused={routes:[...births]};moduleRef.fieldProjection(reused);reused.routes=[];
assert.equal(moduleRef.fieldProjection(reused).points.length,0);
const actual=moduleRef.fieldProjection(projection);assert(actual.points.length<=16);
const snapshot=moduleRef.shader.snapshot({container:''});assert(snapshot.root&&snapshot.points.length<=16);
assert.strictEqual(moduleRef.shader.snapshot({container:''}),snapshot,'unchanged clock/container rebuilt a carrier');
const entered=moduleRef.shader.snapshot({container:'w'});assert.notStrictEqual(entered,snapshot);
assert.strictEqual(moduleRef.shader.snapshot({container:'w'}),entered);
moduleRef.fieldProjection(projection);
const reacquired=moduleRef.shader.snapshot({container:'w'});
assert.notStrictEqual(reacquired.revision,entered.revision,'a new source acquisition reused an old revision token at the same clock/container');
console.log('PASS · changed-path replay, exact rewind, immutable siblings, 1537-rank genealogy, fresh generation, cached production snapshots');
console.log(JSON.stringify({foldWork:scaling}));

// The contact relation uses the existing Display cell/content dimensions, not a
// fixed follow rank or a camera-dependent body exponent. Public source facts
// and collision addresses are the independent input to each replay witness.
const N=require('../../../../z/navigation-physiology.js');
for(const at of [start,start+(end-start)*.3,end]){
 const current=reference.routesAt(at);
 for(const bait of current){
  const a=bait.address,place=N.bodyPlacement({addresses:[]},a),cell=N.cellForPath(a);
  const o={S:{wps:[{a}],wd:[0]},reached:0,dist:0,facts:{events:1}};
  const f=law.beingFrame(o);assert.equal(f.container,a.slice(0,-1));
  assert.equal(law.bodySize(o),place.k/4,'Being is not two content ranks inside the Bait body');
  assert(near(law.pointOf(a),cell.point),'Being contact is not Display exact address locus');
  const edge=Math.hypot(...cell.tet[0].map((v,i)=>v-cell.tet[1][i]));
  const rootEdge=Math.hypot(...N.V0[0].map((v,i)=>v-N.V0[1][i]));
  assert(Math.abs(f.scale*edge/rootEdge-.51)<1e-10,'camera does not frame the same local cell relation');
 }
}
const moving=(a,b,u)=>({S:{wps:[{a},{a:b}],wd:[0,1]},reached:0,dist:u,facts:{events:43}});
for(const u of [0,.01,.25,.5,.99,1])for(const prefix of ['w','xz','w'.repeat(24)]){
 const a=moving('wx','xzy',u),b=moving(prefix+'wx',prefix+'xzy',u),fa=law.beingFrame(a),fb=law.beingFrame(b);
 assert(Math.abs(fb.scale/fa.scale-Math.pow(2,prefix.length))<1e-7);
 assert(Math.abs(law.bodySize(b)/law.bodySize(a)-Math.pow(.5,prefix.length))<1e-12);
 assert(Math.abs(fa.scale*law.bodySize(a)-fb.scale*law.bodySize(b))<1e-12,'same encounter changes apparent size after rank substitution');
}
console.log('PASS · real replay contact and scale, camera/body covariance through unequal-rank travel and 24-rank substitution');

// Independent earned-prefix oracle: no future encounter or incomplete group is lost.
const visitSource={crawlers:[{id:'a',genome:'01234567'},{id:'b',genome:'89abcdef'}],encounters:Array.from({length:69},(_,i)=>({path:'/p',crawler:i%2?'a':'b',t:new Date(1700000000000+i*1000).toISOString()}))};
const visits=law.buildVisits(visitSource);assert(!visits.places.get('/p').ready,'unseen place prepared its entire future sculpture');
for(let n=0;n<=69;n++){
 const at=visits.at('/p',1700000000000+(n-1)*1000);
 assert.equal(at.count,n);assert.equal(at.beings,Math.min(n,2));
 assert.equal(at.roots.reduce((sum,r)=>sum+r.node.count,0),n);
 const walk=node=>{if(node.children){assert.equal(node.children.length,4);assert.equal(node.count,node.children.reduce((sum,c)=>sum+c.count,0));for(const c of node.children)walk(c)}};
 for(const {node} of at.roots)walk(node);
}
for(const n of [1,4,16,64])assert.equal(visits.at('/p',1700000000000+(n-1)*1000).roots.length,1);
assert.deepStrictEqual(visits.at('/p',1699999999999),{count:0,beings:0,roots:[]});
const contextual=F.view('wx',{context:true});
assert.equal(contextual.points.reduce((sum,p)=>sum+(p.fold?p.count:1),0),F.root.count);
assert(contextual.points.some(p=>p.context));assert(contextual.points.length<=16+3*2);
console.log('PASS · selection-independent population, pixel LOD, bounded sibling context and earned 1/4/16/64 visit composition');

// Lazy admission yields the same actual geometry, speed and session end as the
// independently applied eager formula, and repeated demand retains the tissue.
for(const S of life.sessions){law.prepareWalk(S);const pts=[law.pointOf(S.wps[0].a)];let length=0;for(let j=1;j<S.wps.length;j++){const path=law.route(S.wps[j-1].a,S.wps[j].a);for(let i=1;i<path.length;i++){const d=Math.hypot(...path[i].map((v,k)=>v-pts.at(-1)[k]));if(d<1e-7)continue;length+=d;pts.push(path[i])}}assert(Math.abs(S.L-length)<1e-9);const keep=S.pts;law.prepareWalk(S);assert.strictEqual(S.pts,keep)}
console.log('PASS · all actual session geometries are deferred, source-exact and retained on repeated demand');

// Execute the actual native controls at frozen historical time. This verifies
// semantics and intrinsic grouping, not a browser CSS-layout or pointer witness.
const originalDocument=global.document,originalWorld=global.SSSWorldView,originalSetTimeout=global.setTimeout,originalClearTimeout=global.clearTimeout;
class Element {
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attributes={};this.style={setProperty(){}};this.classList={add(){},remove(){}};this.textContent='';this.listeners={};this.hidden=false}
 append(...nodes){for(const n of nodes){n.parentNode=this;this.children.push(n)}}
 replaceChildren(...nodes){this.children=[];this.append(...nodes)}
 setAttribute(k,v){this.attributes[k]=v} addEventListener(k,fn){this.listeners[k]=fn}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null}
 querySelectorAll(selector){const out=[];for(const c of this.children){if(selector.startsWith('.')?c.className?.split(' ').includes(selector.slice(1)):c.tag===selector)out.push(c);out.push(...c.querySelectorAll(selector))}return out}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(n=>n!==this)}
}
try {
 global.document={createElement:tag=>new Element(tag)};global.setTimeout=()=>0;global.clearTimeout=()=>{};
 for(const language of ['en','de']){
  global.SSSWorldView={language};moduleRef.fieldProjection(projection);
  const host=new Element('section'),content=new Element('div'),bound=[];
  assert(moduleRef.render({host,content,projection,ui:{bind:(el,name)=>bound.push(name)}}));
  assert.deepStrictEqual(bound,['rail','bottom'],'selected context created a competing overlay');
  assert.equal(content.querySelector('h1').textContent,'Crawlerbait');
  const scrub=content.querySelector('.crawlerbait-scrub');scrub.value='400';scrub.listeners.input();
  const before=moduleRef.shader.snapshot({container:''}),modes=content.querySelector('.crawlerbait-modes').children;
  modes[1].listeners.click();assert.equal(moduleRef.shader.snapshot({container:''}).revision,'being-types');
  assert(content.querySelector('.crawlerbait-inspector').hidden);modes[0].listeners.click();
  assert.strictEqual(moduleRef.shader.snapshot({container:''}),before,'view switch reset clock or geography');
  assert(!content.querySelector('.crawlerbait-inspector').hidden);
  const route=projection.routes.find(r=>r.path.includes('/~/'));moduleRef.activateFieldPoint({point:{route}});
  assert(content.querySelector('.crawlerbait-place-name').textContent.length<14,'opaque public path is still compulsory label');
  const details=content.querySelector('details');details.open=true;moduleRef.activateFieldPoint({point:{route}});assert.strictEqual(content.querySelector('details'),details);assert(details.open);
  assert.equal(content.querySelector('.crawlerbait-transport').children[0].textContent,language==='de'?'Pause':'pause');moduleRef.unmount({host,content});
 }
} finally {global.document=originalDocument;global.SSSWorldView=originalWorld;global.setTimeout=originalSetTimeout;global.clearTimeout=originalClearTimeout}
console.log('PASS · actual DE/EN controls preserve historical clock and geography, one current rail and disclosed provenance');

const UI=require('../../../../w/ui-grid.js'),layout=JSON.parse(fs.readFileSync(path.join(__dirname,'../ui-grid.json')));
for(const [w,h] of [[390,844],[1280,800]])for(const open of [false,true]){
 const carrier={x:0,y:50,w,h:h-50},occupied=open?[{rect:{left:w-344,right:w,top:h-474,bottom:h}}]:[{rect:{left:w-40,right:w,top:h-44,bottom:h}}];
 const state=UI.normalizeState(layout),plan=law.hudPlacement(UI,state,carrier,occupied,44,136);assert(plan);
 assert(UI.spanInfo(state,plan.cells).ok);assert(plan.top>=carrier.y&&plan.left+plan.width<=w);
 for(const {rect:r} of occupied)assert(plan.top+44<=r.top||plan.top>=r.bottom||plan.left+plan.width<=r.left||plan.left>=r.right,'time controls intersect actual compass occupancy');
 if(w===390&&open)assert(plan.top<carrier.y+carrier.h/2,'open portrait compass did not earn an earlier canonical row');
}
console.log('PASS · canonical time rows and intrinsic widths avoid open/closed compass rectangles on both carriers');

const clipped=law.triangleRows([{x:0,y:-1e9},{x:1e9,y:1e9},{x:-1e9,y:1e9}],16,5,{top:0,bottom:844});assert(clipped.length<=53,'near-camera narrative enumerated offscreen rows');
// A large visible place in a sibling must retain its actual form, rather than
// becoming a blank summary simply because a foreground cell was selected.
moduleRef.fieldProjection(projection);
const visibleSource=reference.routesAt(law.buildLife(projection).t0),neighbour=visibleSource.find(r=>!r.address.startsWith('w')&&r.address.length>3);assert(neighbour);
const neighbourCell=N.cellForPath(neighbour.address),zoom=Math.pow(2,neighbour.address.length)*320;
const witnessProject=p=>({x:640+(p[0]-neighbourCell.center[0])*zoom,y:400-(p[1]-neighbourCell.center[1])*zoom,front:true});
const request={container:'w',project:witnessProject,viewport:{width:1280,height:800}},nearby=moduleRef.shader.snapshot(request);
const visibleBait=nearby.points.find(p=>p.id==='bait:'+neighbour.path);assert(visibleBait&&!visibleBait.fold&&visibleBait.context,'visible sibling lost its actual place');
assert.strictEqual(moduleRef.shader.snapshot(request),nearby,'unchanged projected frontier rebuilt GPU tissue');
const away=moduleRef.shader.snapshot({...request,project:p=>({x:1e8+p[0],y:1e8+p[1],front:true})});
assert(away.points.length<nearby.points.length);assert.equal(nearby.points.reduce((n,p)=>n+(p.fold?p.count:1),0),visibleSource.length);
console.log('PASS · a visible fine sibling survives foreground selection; offscreen context remains folded and unchanged geometry is reused');
