'use strict';
const assert=require('node:assert/strict');
const UI=require('./ui-grid.js'),M=require('./membrane-grid.js');
const membrane=require('./membrane-grid.json'),navigator=require('./navigator-grid.json');
const owned=UI.normalizeState(require('../../y/philosophy/w/ui-grid.json'));
const grid=M.create(membrane,navigator);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,JSON.stringify({a,b}));
function verifyField(state,name,parent,actual,mode){
 const info=UI.fieldInfo(state,name),b=UI.orientBounds(info.bounds,mode);
 close(actual.left,parent.left+b.x*parent.width);close(actual.top,parent.top+b.y*parent.height);
 close(actual.width,b.w*parent.width);close(actual.height,b.h*parent.height);
 assert.ok(UI.spanInfo(state,info.cells).ok);
}
const original=owned.fields.compass.cells;
for(const [width,height] of [[1280,800],[667,375],[390,844],[320,568],[600,600],[599,600],[600,599]]){
 grid.useCompass(owned,UI.fieldInfo(owned,'compass'));
 const mode=UI.orientation(width,height),s=grid.reconcile({width,height,headerRect:{bottom:10},triggerRect:{width:4,height:4}});
 assert.equal(s.orientation,mode);assert.deepEqual(s.compassInfo.cells,original);
 for(const n of ['top','compass'])verifyField(s.outer,n,s.viewport,s[n],mode);
 verifyField(s.outer,'ascent',s.viewport,s.pocket,mode);
 verifyField(s.inner,'pocket',s.compass,s.ascent,mode);
 verifyField(s.inner,'legal',s.compass,s.legal,mode);
 for(const name of ['state','map','axis-y','axis-x','hint','help','trigger','guide'])verifyField(s.inner,name,s.pocket,grid.nested(name),mode);
 const changed=grid.reconcile({width,height,headerRect:{bottom:9999},statusRect:{bottom:8888,height:1000},triggerRect:{width:999,height:999},inset:999});
 assert.deepEqual(changed.outer.fields,s.outer.fields,'measured content cannot alter authored outer addresses');
 assert.deepEqual(changed.inner.fields,s.inner.fields,'measured content cannot alter authored internal addresses');
 assert.deepEqual(changed.pocket,s.pocket);assert.deepEqual(changed.trigger,s.trigger);
}
// Actual user-authored landscape placement: compass and Back exchange their
// existing containing fields, while the legal field remains where it was.
{
 const s=grid.reconcile({width:1280,height:800});
 assert.deepEqual([s.pocket.left,s.pocket.top,s.pocket.width,s.pocket.height],[960,50,320,350]);
 assert.deepEqual([s.ascent.left,s.ascent.top,s.ascent.width,s.ascent.height],[960,400,320,300]);
 assert.deepEqual([s.legal.left,s.legal.top,s.legal.width,s.legal.height],[1040,700,160,100]);
}
// Swapping viewport axes quarter-turns every field; the addresses themselves
// never select an upright or size-dependent replacement.
{
 const landscape=grid.reconcile({width:844,height:390});
 const portrait=grid.reconcile({width:390,height:844});
 const turn=a=>({left:390-a.bottom,top:a.left,width:a.height,height:a.width});
 for(const name of ['top','compass','ascent','pocket','help','trigger','legal']){
   const p=portrait[name],e=turn(landscape[name]);for(const k of Object.keys(e))close(p[k],e[k]);
 }
 for(const name of ['state','map','axis-y','axis-x','hint','guide']){
   grid.reconcile({width:844,height:390});const a=grid.nested(name);grid.reconcile({width:390,height:844});const p=grid.nested(name),e=turn(a);
   for(const k of Object.keys(e))close(p[k],e[k]);
 }
}
const partition=['state','map','axis-y','axis-x','hint','help','trigger'].flatMap(n=>navigator.fields[n].cells);
assert.equal(partition.length,64);assert.equal(new Set(partition).size,64,'all pocket cells are explicitly occupied or designated background');
assert.deepEqual(navigator.fields.guide.cells,navigator.fields.map.cells,'guide is an explicit overlay');
assert.equal(grid.typeUnitRatio,1/64,'type reference is the long edge of its authored rank-six cell');
assert.equal(M.address(0,0,40),'w'.repeat(40));
assert.throws(()=>grid.surfaceRect({getAttribute:()=>null,dataset:{}},{left:0,top:0,width:1,height:1}),/realized recursive UI field/);
const broken=structuredClone(navigator);broken.fields.hint.cells=broken.fields.help.cells;
assert.throws(()=>M.create(membrane,broken),/partition/);
console.log('PASS — authored screen fields, nested partition, fixed swap and quarter-turn retain the same addresses');
