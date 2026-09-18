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

assertClosedSplits(field.root.children.w,'w');
for(const route of projection.routes){
  assert(/^[wxzy]+$/.test(route.address),`invalid bait address ${route.address}`);
  const point=field.points.find(p=>p.address===route.address);
  assert(point,`missing point for bait:${route.address}`);
  assert.strictEqual(point.path,'w'+route.address,`point escaped real bait cell ${route.address}`);
  assert.strictEqual(point.label,route.path,`point label diverged from observed path ${route.path}`);
  const node=nodeAt(field.root,'w'+route.address);
  assert(node&&node.bait===true,`real bait anatomy missing at w${route.address}`);
  assert.strictEqual(node.address,route.address,`bait anatomy address mismatch ${route.address}`);
}
console.log(`PASS · ${projection.routes.length} baits render from their real recursive w-addresses`);
