'use strict';
const assert=require('assert');
const G=require('./ui-grid.js');

assert.equal(G.SCHEMA,'sss.display.ui-grid.v2');
assert.deepStrictEqual(G.ADDRESS_SYMBOLS,['w','x','y','z']);
assert.deepStrictEqual(G.bounds('w'),{x:0,y:0,w:.5,h:.5});
assert.deepStrictEqual(G.bounds('x'),{x:.5,y:0,w:.5,h:.5});
assert.deepStrictEqual(G.bounds('y'),{x:0,y:.5,w:.5,h:.5});
assert.deepStrictEqual(G.bounds('z'),{x:.5,y:.5,w:.5,h:.5});

let s=G.emptyState();
s=G.split(s,'');
assert.deepStrictEqual(G.leafSet(s),['w','x','y','z']);
s=G.defineField(s,'rail',['w'],'rail');
assert.throws(()=>G.split(s,'w'),/occupied/);
s=G.refineField(s,'rail');
assert.deepStrictEqual(s.fields.rail.cells,['ww','wx','wy','wz']);
assert.equal(G.fieldInfo(s,'rail').bounds.w,.5);

let v=G.normalizeState({
  schema:G.SCHEMA,
  splits:['','w','x','y','z'],
  fields:{rail:{cells:['ww','wy','yw'],variants:{portrait:['ww','wx','xw','xx']},label:'rail'}},
  elements:{}
});
assert.deepStrictEqual(v.fields.rail.variants.portrait,['ww','wx','xw','xx']);
assert.equal(G.fieldInfo(v,'rail').bounds.w,.25);
assert.equal(G.fieldInfo(v,'rail','portrait').bounds.w,1);
assert.equal(G.fieldInfo(v,'rail','portrait').bounds.h,.25);
assert.equal(G.fieldInfo(v,'rail','portrait').variant,'portrait');
assert.throws(()=>G.refineField(v,'rail'),/carrier variants/);

s=G.removeField(s,'rail');
s=G.place(s,'title',{kind:'text',cells:['ww','wx'],anchor:'north',rank:0,label:'TITLE'});
assert.ok(G.spanInfo(s,['ww','wx']).ok);
assert.throws(()=>G.coalesce(s,'w'),/occupied/);
s=G.move(s,'title',['wy','wz']);
assert.deepStrictEqual(s.elements.title.cells,['wy','wz']);
let c=G.command(s,'move title wy+wz -> ww+wx');
assert.deepStrictEqual(c.state.elements.title.cells,['ww','wx']);

const round=G.parseState(G.formatState(c.state));
assert.deepStrictEqual(round,c.state);
const legacy=G.normalizeState({
  schema:'sss.display.ui-grid.v1',
  splits:[''],
  elements:{x:{kind:'panel',cells:['w'],anchor:'fill',rank:0,label:'x'}}
});
assert.equal(legacy.schema,G.SCHEMA);
assert.deepStrictEqual(legacy.fields,{});

console.log('ui-grid v2: fields + legacy element replay PASS');
