'use strict';
const assert=require('node:assert/strict');
const UI=require('./ui-grid.js'),M=require('./membrane-grid.js');
const membrane=require('./membrane-grid.json'),navigator=require('./navigator-grid.json');
const grid=M.create(membrane,navigator);
function close(a,b){assert.ok(Math.abs(a-b)<1e-8,JSON.stringify({a,b}))}
function verifyField(state,name,parent,actual){
  const info=UI.fieldInfo(state,name),b=info.bounds;
  close(actual.left,parent.left+b.x*parent.width);close(actual.top,parent.top+b.y*parent.height);
  close(actual.width,b.w*parent.width);close(actual.height,b.h*parent.height);
  assert.ok(UI.spanInfo(state,info.cells).ok,'field must consist of realized address cells');
}
for(const [width,height] of [[1275,596],[1280,800],[667,375],[390,844],[320,568]]){
  const input={width,height,headerRect:{bottom:38},triggerRect:{width:40,height:40},inset:8};
  const idle=grid.reconcile(input);
  assert.deepEqual(idle.fit,{top:true,trigger:true});
  assert.strictEqual(grid.reconcile(input).outer,idle.outer,'an unchanged observation reuses the realized field');
  assert.strictEqual(grid.reconcile(input).inner,idle.inner,'an unchanged navigator reuses its realized field');
  verifyField(idle.outer,'top',idle.viewport,idle.top);
  for(const name of ['pocket','help','trigger','legal'])verifyField(idle.inner,name,idle.compass,idle[name]);
  assert.ok(idle.top.bottom>=46,'navigation and rim fit');
  assert.ok(idle.top.height/2<46,'a further top split could not fit the navigation');
  assert.ok(idle.trigger.width>=40&&idle.trigger.height>=40,'input target fits its addressed field');
  close(idle.pocket.bottom,idle.help.top);close(idle.pocket.bottom,idle.trigger.top);
  close(idle.help.bottom,idle.legal.top);
  const pending=grid.reconcile({...input,statusRect:{bottom:51,height:13}});
  verifyField(pending.outer,'top',pending.viewport,pending.top);
  assert.ok(pending.top.bottom>=59,'real feedback and rim fit');
  if(height===375){
    const constrained=grid.reconcile({...input,statusRect:{bottom:51,height:13},limit:65.75,quantum:1});
    verifyField(constrained.outer,'top',constrained.viewport,constrained.top);
    assert.ok(constrained.top.bottom>=59&&constrained.top.bottom<=65.75,'refinement leaves a real neighbouring line readable');
  }
  const restored=grid.reconcile(input);
  assert.deepEqual(restored.outer.fields.top.cells,idle.outer.fields.top.cells,'empty feedback restores the original addresses');
}
// A site's independently declared compass is the parent frame. The nested
// fields must follow that owner address, even after a viewport change.
const site=UI.normalizeState({schema:UI.SCHEMA,meta:{name:'another-owner'},splits:[''],fields:{compass:{cells:['w']}},elements:{}});
grid.useCompass(site,UI.fieldInfo(site,'compass'));
let s=grid.reconcile({width:1000,height:600,headerRect:{bottom:38},triggerRect:{width:40,height:40},inset:8});
assert.deepEqual(s.compass,{left:0,top:0,width:500,height:300,right:500,bottom:300});
verifyField(s.outer,'compass',s.viewport,s.compass);
verifyField(s.inner,'pocket',s.compass,s.pocket);
s=grid.reconcile({width:2000,height:1200,headerRect:{bottom:38},triggerRect:{width:40,height:40},inset:8});
assert.equal(s.compass.width,1000);assert.equal(s.compass.height,600);
verifyField(s.inner,'trigger',s.compass,s.trigger);
assert.throws(()=>grid.surfaceRect({getAttribute:()=>null,dataset:{}},{left:0,top:0,width:1,height:1}),/realized recursive UI field/);
assert.equal(M.address(0,0,40),'w'.repeat(40),'recursive addresses are not rank-capped by a UI breakpoint');
const tooShort=grid.reconcile({width:320,height:80,headerRect:{bottom:38},triggerRect:{width:40,height:40},inset:8});
assert.equal(tooShort.fit.top,false,'finite carriers report when the authored field cannot contain reading tissue');
// Refinement stays inside the field the owner actually declared, including a
// differently placed navigator trigger. A too-small authored top reports it.
const narrowTop=structuredClone(membrane);
narrowTop.splits.push('ww','wx','xw','xx');
narrowTop.fields.top.cells=['www','wwx','wxw','wxx','xww','xwx','xxw','xxx'];
const alternateNavigator=structuredClone(navigator);
alternateNavigator.fields.trigger.cells=['yw','yx'];
const alternate=M.create(narrowTop,alternateNavigator);
const alternateState=alternate.reconcile({width:1000,height:800,headerRect:{bottom:110},triggerRect:{width:20,height:20},inset:8});
assert.equal(alternateState.fit.top,false,'refinement cannot escape its authored containing field');
assert.ok(alternateState.top.bottom<=100);
const authoredTrigger=UI.fieldInfo(UI.normalizeState(alternateNavigator),'trigger').bounds;
const actualTrigger=UI.fieldInfo(alternateState.inner,'trigger').bounds;
assert.ok(actualTrigger.x>=authoredTrigger.x&&actualTrigger.y>=authoredTrigger.y);
assert.ok(actualTrigger.x+actualTrigger.w<=authoredTrigger.x+authoredTrigger.w&&actualTrigger.y+actualTrigger.h<=authoredTrigger.y+authoredTrigger.h);
verifyField(alternateState.inner,'trigger',alternateState.compass,alternateState.trigger);
console.log('canonical Display and nested navigator fields: PASS');
