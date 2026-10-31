#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const A = require('../../../../z/address.js');
const N = require('./navigation-physiology.js');

// Child/cell geometry is the neutral capability lent to local presentations.
// Pin the former split arithmetic, including a non-root parent frame.
{
  const previousChild=(t,i)=>t.map((p,j)=>i===j?p:p.map((v,k)=>(t[i][k]+v)/2));
  const previousCell=(path,parent)=>{let t=parent;for(const g of path)t=previousChild(t,N.GENES.indexOf(g));return t};
  const parents=[N.V0,N.V0.map(p=>p.map((v,k)=>v*.375+[2,-3,.7][k]))];
  const paths=['','w','x','z','y','wxzy','yyxzwy','w'.repeat(12001)];
  for(const parent of parents){
    const saved=JSON.stringify(parent);
    for(const [i,g] of N.GENES.entries())assert.deepEqual(N.childTet(parent,g),previousChild(parent,i));
    assert.deepEqual(N.splitTet(parent),N.GENES.map(g=>N.childTet(parent,g)));
    for(const path of paths)assert.deepEqual(N.cellTet(path,parent),previousCell(path,parent));
    assert.equal(JSON.stringify(parent),saved,'cell geometry mutated its parent frame');
  }
  for(const path of paths.slice(0,-1))assert.deepEqual(N.cellTet(path),N.cellForPath(path).tet);
  const independent=N.cellTet('');independent[0][0]=3;assert.notEqual(N.V0[0][0],3,'borrowed root cell is mutable shared state');
  assert.throws(()=>N.cellTet('wx?'));assert.throws(()=>N.childTet(N.V0,'?'));
}

const atom = noun => ({noun,children:{}});
const root = {noun:'root',children:{w:atom('Form'),x:atom('Continuity'),z:atom('Care'),y:atom('Inquiry')}};
let s = N.collectStructure(root);
for(const path of ['w','x','z','y']){
  const record=N.addressRecord(s,path),derived=N.cellForPath(path);
  assert.ok(record,'rank-1 address must be realized');
  assert.deepStrictEqual(derived.center,record.center,'derived cell center must equal realized structure center');
}
assert.deepEqual(s.leaves.map(x=>x.path).sort(), ['w','x','y','z']);
assert.ok(s.leaves.every(x => x.center.length === 3 && x.center.every(Number.isFinite)));
for (const a of s.addresses) {
  assert.equal(a.locus,A.key(a.path),'address record must carry quotient locus identity');
  assert.deepEqual(a.point,N.semanticPoint(a.path),'semantic place must equal exact recursive address locus');
}
assert.notDeepEqual(N.addressRecord(s,'w').point,N.addressRecord(s,'w').center,'semantic place must not regress to cell centroid');
assert.deepEqual(N.focusTarget(s,'w').center,N.addressRecord(s,'w').center,'camera must frame the recursive split-tet centroid at w');
assert.notDeepEqual(N.focusTarget(s,'w').center,N.addressRecord(s,'w').point,'camera framing must not target the outer semantic vertex');

root.children.w = {noun:'Form',children:{w:atom('ww'),x:atom('wx'),z:atom('wz'),y:atom('wy')}};
s = N.collectStructure(root);
assert.deepEqual(s.leaves.map(x=>x.path).sort(), ['ww','wx','wy','wz','x','y','z']);
assert.ok(!s.leaves.some(x => ['xx','zz','yy'].includes(x.path)), 'coarse siblings must not be fabricated');
assert.deepEqual(N.semanticPoint('w'),N.semanticPoint('ww'),'self-continuation must preserve the same point');
assert.deepEqual(N.semanticPoint('xyw'),N.semanticPoint('xwy'),'reciprocal addresses must resolve to the same geometric locus');
assert.deepEqual(N.focusTarget(s,'wx').center,N.addressRecord(s,'wx').center,'deeper focus must move to the centroid of the smaller recursive split-tet');
assert.ok(N.focusTarget(s,'wx').scale>N.focusTarget(s,'w').scale,'deeper focus must compensate rank-local scale');

// Exact raw genealogy stays distinct even when quotient geometry coincides.
for(const record of s.addresses)assert.strictEqual(N.addressRecord(s,record.path),record);
assert.notStrictEqual(N.addressRecord(s,'w'),N.addressRecord(s,'ww'));
for(const absent of ['', 'www', 'xy', 'invalid', undefined, null, 0]){
  assert.strictEqual(N.addressRecord(s,absent),null,'lookup must not realize a potential descendant');
}
assert.deepEqual(Object.keys(s),['leaves','addresses'],'lookup acceleration must preserve the public structure carrier');
const beforeLookup=JSON.stringify(s);
for(const record of s.addresses)N.addressRecord(s,record.path);
assert.equal(JSON.stringify(s),beforeLookup,'lookup must not mutate public records');

// A new projection generation, including a reused source object, acquires a
// different index. Earlier collected generations retain their own records.
const generationRoot={noun:'generation',children:{w:atom('w'),x:atom('x'),z:atom('z'),y:atom('y')}};
const first=N.collectStructure(generationRoot),firstW=N.addressRecord(first,'w');
generationRoot.children.w={noun:'split',children:{w:atom('ww'),x:atom('wx'),z:atom('wz'),y:atom('wy')}};
const second=N.collectStructure(generationRoot),secondWX=N.addressRecord(second,'wx');
assert.equal(N.addressRecord(first,'wx'),null);
assert.ok(secondWX);
assert.notStrictEqual(N.addressRecord(second,'w'),firstW);
generationRoot.children.w=atom('collapsed');
const third=N.collectStructure(generationRoot);
assert.equal(N.addressRecord(third,'wx'),null);
assert.strictEqual(N.addressRecord(second,'wx'),secondWX);

// Legacy carriers keep their existing first-match and mutation behavior.
const legacyFirst={path:'w'},legacySecond={path:'w'},legacy={addresses:[legacyFirst,legacySecond]};
assert.strictEqual(N.addressRecord(legacy,'w'),legacyFirst);
legacy.addresses.unshift({path:'x'});
assert.strictEqual(N.addressRecord(legacy,'x'),legacy.addresses[0]);
assert.equal(N.addressRecord(legacy,'z'),null);

// Measure the actual obligation: collected lookups must not rescan the array.
// Array instrumentation preserves every address/record and is not source-text matching.
second.addresses.find=()=>{throw new Error('collected address lookup rescanned the flat array')};
assert.strictEqual(N.addressRecord(second,'wx'),secondWX);
assert.equal(N.addressRecord(second,'not-realized'),null);

// Isolate traversal stack behavior from the separately witnessed exact address
// algebra. This executes the production collector with only that dependency
// substituted; it does not claim deep floating-point carrier resolution.
{
  const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
  const context={CambiumAddress:{validate:p=>p,barycentric:()=>[1,0,0,0],key:p=>p}};
  vm.runInNewContext(fs.readFileSync(process.env.NAVIGATION_SOURCE||path.join(__dirname,'navigation-physiology.js'),'utf8'),context);
  let deep=atom('end');
  for(let i=0;i<2048;i++)deep={children:{w:deep,x:atom('x'),z:atom('z'),y:atom('y')}};
  const collected=context.SSSDisplayNavigation.collectStructure(deep);
  assert.equal(collected.addresses.length,2048*4);
  assert.equal(collected.leaves.length,2048*3+1);
  assert.equal(collected.addresses[2047].path,'w'.repeat(2048),'depth-first gene order changed');
}

const bounds = {left:100,top:100,width:200,height:200};
const xA = N.axisValue('x', bounds, 160, 101);
const xB = N.axisValue('x', bounds, 160, 299);
assert.equal(xA, xB, 'x control must ignore pointerY');
const yA = N.axisValue('y', bounds, 101, 160);
const yB = N.axisValue('y', bounds, 299, 160);
assert.equal(yA, yB, 'y control must ignore pointerX');
assert.equal(N.velocity(0), 0);
assert.equal(N.velocity(.02), 0, 'deadzone must suppress tiny trackpad drift');
assert.ok(Math.abs(N.velocity(.9)) > Math.abs(N.velocity(.4)), 'velocity must increase with displacement');

const state = N.createState({noun:'root',children:{w:atom('Form'),x:atom('Continuity'),z:atom('Care'),y:atom('Inquiry')}});
assert.equal(state.view, '');
assert.equal(state.inspect('x'), true);
assert.equal(state.view, 'x');
assert.deepEqual(state.target().center,N.focusTarget(state.structure,'x').center,'state target must use centroid camera framing');
state.clearInspection(); assert.equal(state.view,'');
state.setAxis('x', .7); state.setAxis('y', -.4);
let av = state.angularVelocity();
assert.notEqual(av.yaw, 0); assert.notEqual(av.pitch, 0);
state.releaseAxis('x');
av = state.angularVelocity();
assert.equal(av.yaw, 0, 'x release must zero yaw immediately');
assert.notEqual(av.pitch, 0, 'x release must not alter y axis');
state.releaseAxis('y');
assert.deepEqual(state.angularVelocity(), {yaw:0,pitch:0});

console.log(JSON.stringify({status:'pass',realized_only:true,semantic_place_is_locus:true,camera_focus_is_split_centroid:true,recursive_quotient_geometry:true,independent_axes:true,inspect_without_commit:true}, null, 2));
