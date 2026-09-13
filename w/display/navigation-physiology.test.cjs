#!/usr/bin/env node
'use strict';
const assert = require('assert');
const N = require('./navigation-physiology.js');

const atom = noun => ({noun,children:{}});
const root = {noun:'root',children:{w:atom('Form'),x:atom('Continuity'),z:atom('Care'),y:atom('Inquiry')}};
let s = N.collectStructure(root);
assert.deepStrictEqual(s.leaves.map(x=>x.path).sort(), ['w','x','y','z']);
assert.ok(s.leaves.every(x => x.center.length === 3 && x.center.every(Number.isFinite)));

root.children.w = {noun:'Form',children:{w:atom('ww'),x:atom('wx'),z:atom('wz'),y:atom('wy')}};
s = N.collectStructure(root);
assert.deepStrictEqual(s.leaves.map(x=>x.path).sort(), ['ww','wx','wy','wz','x','y','z']);
assert.ok(!s.leaves.some(x => ['xx','zz','yy'].includes(x.path)), 'coarse siblings must not be fabricated');

root.children.w.children.w = {noun:'ww',children:{w:atom('www'),x:atom('wwx'),z:atom('wwz'),y:atom('wwy')}};
s = N.collectStructure(root);
const paths = s.leaves.map(x=>x.path);
assert.ok(paths.includes('www') && paths.includes('x') && paths.includes('z') && paths.includes('y'));
assert.ok(!paths.includes('xx') && !paths.includes('zz') && !paths.includes('yy'));

const bounds = {left:100,top:100,width:200,height:200};
const xA = N.axisValue('x', bounds, 160, 101);
const xB = N.axisValue('x', bounds, 160, 299);
assert.strictEqual(xA, xB, 'x control must ignore pointerY');
const yA = N.axisValue('y', bounds, 101, 160);
const yB = N.axisValue('y', bounds, 299, 160);
assert.strictEqual(yA, yB, 'y control must ignore pointerX');
assert.strictEqual(N.velocity(0), 0);
assert.strictEqual(N.velocity(.02), 0, 'deadzone must suppress tiny trackpad drift');
assert.ok(Math.abs(N.velocity(.9)) > Math.abs(N.velocity(.4)), 'velocity must increase with displacement');

const state = N.createState({noun:'root',children:{w:atom('Form'),x:atom('Continuity'),z:atom('Care'),y:atom('Inquiry')}});
assert.strictEqual(state.page, '');
assert.strictEqual(state.view, '');
assert.strictEqual(state.inspect('x'), true);
assert.strictEqual(state.view, 'x');
assert.strictEqual(state.page, '', 'inspection must not commit page navigation');
assert.strictEqual(state.commit(), true);
assert.strictEqual(state.page, 'x');
state.setAxis('x', .7); state.setAxis('y', -.4);
let av = state.angularVelocity();
assert.notStrictEqual(av.yaw, 0); assert.notStrictEqual(av.pitch, 0);
state.releaseAxis('x');
av = state.angularVelocity();
assert.strictEqual(av.yaw, 0, 'x release must zero yaw immediately');
assert.notStrictEqual(av.pitch, 0, 'x release must not alter y axis');
state.releaseAxis('y');
assert.deepStrictEqual(state.angularVelocity(), {yaw:0,pitch:0});
state.leave();
assert.strictEqual(state.page, ''); assert.strictEqual(state.view, '');

console.log(JSON.stringify({status:'pass',realized_only:true,independent_axes:true,inspect_commit:true}, null, 2));
