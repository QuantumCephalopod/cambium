'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');

globalThis.SSSInterlocutorModules=new Map();
require('./render.js');

const moduleRef=globalThis.SSSInterlocutorModules.get('organism:crawlerbait');
assert(moduleRef,'crawlerbait module did not register');
const projection=JSON.parse(fs.readFileSync(path.join(__dirname,'projection.json'),'utf8'));
const field=moduleRef.fieldProjection(projection);

assert(field&&field.root&&Array.isArray(field.points),'crawlerbait field projection missing root/points');
assert.strictEqual(field.points.length,projection.routes.length,'every projected bait must have one field point');

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
  const point=field.points.find(p=>p.address===route.address);
  assert(point,`missing point for bait:${route.address}`);
  assert.strictEqual(point.path,route.address,`point escaped real bait cell ${route.address}`);
  assert.strictEqual(point.label,route.path,`point label diverged from observed path ${route.path}`);
  const node=nodeAt(field.root,route.address);
  assert(node&&node.bait===true,`real bait anatomy missing at ${route.address}`);
  assert.strictEqual(node.address,route.address,`bait anatomy address mismatch ${route.address}`);
}
assert.strictEqual(field.root.noun,'Baits','field root must be bait-space ε, not Crawlerbait root anatomy');
assert(!['Traces','Membrane','Tide'].includes(field.root.children?.w?.noun),'non-bait root anatomy leaked into bait-space field');
console.log(`PASS · ${projection.routes.length} baits render as the complete background from bait-space ε`);
// beings: every being keeps its derived kind, walks only Sierpinski edges between its own recorded baits, and the goo stays inside its splat budget
const law=moduleRef._law;
assert(law&&typeof law.buildLife==='function','crawlerbait life law missing');
const life=law.buildLife(projection);
assert(life&&life.sessions.length>0,'no being walks: projection encounters did not become sessions');
const kinds={w:0,x:0,z:0,y:0};for(const c of projection.crawlers)kinds[c.kind]++;
assert.deepStrictEqual(life.totals,kinds,'life kind totals diverged from projected being kinds');
assert.strictEqual(Object.values(life.totals).reduce((a,b)=>a+b,0),projection.crawlers.length,'a being fell out of its kind');
const near=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])<1e-9;
for(const S of life.sessions.slice(0,400)){
  assert(near(S.pts[0],law.pointOf(S.wps[0].a)),'a walk does not begin at its first recorded bait');
  assert(near(S.pts[S.pts.length-1],law.pointOf(S.wps[S.wps.length-1].a))||S.wps.length===1,'a walk does not end at its last recorded bait');
  for(let j=1;j<S.wps.length;j++)assert(S.wps[j].t>=S.wps[j-1].t,'a walk reorders its own record');
}
for(const at of [.3,.85]){
  const r=law.simulate({projection,at,frames:90});
  assert(r.alive>0,`no being alive at ${at} of the record`);
  assert(r.splats>0&&r.splats<=90000,`goo splat budget broken at ${at}: ${r.splats}`);
}
// coarse resolution: beings coalesce by the pool law one bait-rank deeper (container + 4); a colony has at least two
for(const container of ['','z']){
  const r=law.simulate({projection,at:.3,frames:90,container});
  const byCell=new Map();for(const c of r.cells)if(c)byCell.set(c,(byCell.get(c)||0)+1);
  for(const [cell,n] of byCell){assert.strictEqual(cell.length,container.length+4,`colony at wrong rank: ${cell} under ${container||'ε'}`);assert(cell.startsWith(container),'colony outside its container');assert(n>=2,`a colony of one at ${cell}`)}
  assert(r.splats<4000,`coarse view still pays for every body: ${r.splats} splats`);
}
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

const blend=law.simulate({projection,at:.3,frames:91,container:'',changeAt:90,nextContainer:'w'});assert(blend.fineShares.every(x=>x>=0&&x<=1));assert(blend.fineShares.some(x=>x>0&&x<1),'resolution changed with a cut');

for(const S of life.sessions){assert.equal(law.prefixFacts(S.b.history,Infinity).k,S.b.k,'prefix replay kind fails to recover canonical kind')}
