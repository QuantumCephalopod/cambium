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
console.log(`PASS · ${life.sessions.length} walks by ${projection.crawlers.length} beings keep their kinds and their recorded order`);

