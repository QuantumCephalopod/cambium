#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const A = require('../../z/address.js');
const N = require('./navigation-physiology.js');

const atom = noun => ({noun,children:{}});
const root = {noun:'root',children:{w:atom('Form'),x:atom('Continuity'),z:atom('Care'),y:atom('Inquiry')}};
let s = N.collectStructure(root);
assert.deepEqual(s.leaves.map(x=>x.path).sort(), ['w','x','y','z']);
assert.ok(s.leaves.every(x => x.center.length === 3 && x.center.every(Number.isFinite)));
for (const a of s.addresses) {
  assert.equal(a.locus,A.key(a.path),'address record must carry quotient locus identity');
  assert.deepEqual(a.point,N.semanticPoint(a.path),'semantic place must equal exact recursive address locus');
}
assert.notDeepEqual(N.addressRecord(s,'w').point,N.addressRecord(s,'w').center,'semantic place must not regress to cell centroid');

root.children.w = {noun:'Form',children:{w:atom('ww'),x:atom('wx'),z:atom('wz'),y:atom('wy')}};
s = N.collectStructure(root);
assert.deepEqual(s.leaves.map(x=>x.path).sort(), ['ww','wx','wy','wz','x','y','z']);
assert.ok(!s.leaves.some(x => ['xx','zz','yy'].includes(x.path)), 'coarse siblings must not be fabricated');
assert.deepEqual(N.semanticPoint('w'),N.semanticPoint('ww'),'self-continuation must preserve the same point');
assert.deepEqual(N.semanticPoint('xyw'),N.semanticPoint('xwy'),'reciprocal addresses must resolve to the same geometric locus');

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

console.log(JSON.stringify({status:'pass',realized_only:true,semantic_place_is_locus:true,recursive_quotient_geometry:true,independent_axes:true,inspect_without_commit:true}, null, 2));
