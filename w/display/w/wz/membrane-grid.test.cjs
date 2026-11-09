'use strict';
const assert=require('node:assert/strict');
const UI=require('./ui-grid.js'),M=require('./membrane-grid.js');
const membrane=require('./membrane-grid.json'),navigator=require('./navigator-grid.json');
const grid=M.create(membrane,navigator);
const owned=UI.normalizeState(require('../../y/philosophy/w/ui-grid.json'));
function close(a,b){assert.ok(Math.abs(a-b)<1e-8,JSON.stringify({a,b}))}
function verifyField(state,name,parent,actual,mode,carrier=false){
  const info=carrier?UI.carrierField(state,name,mode):UI.fieldInfo(state,name),b=UI.orientBounds(info.bounds,mode);
  close(actual.left,parent.left+b.x*parent.width);close(actual.top,parent.top+b.y*parent.height);
  close(actual.width,b.w*parent.width);close(actual.height,b.h*parent.height);
  assert.ok(UI.spanInfo(state,info.cells).ok,'field must consist of realized address cells');
}
function header(width,height){return height>width?{left:width-38,top:0,width:38,height,right:width,bottom:height}:{left:0,top:0,width,height:38,right:width,bottom:38}}
function status(width,height){return height>width?{left:width-51,top:0,width:13,height:40,right:width-38,bottom:40}:{left:0,top:38,width:40,height:13,right:40,bottom:51}}
const carriers=[[1275,596],[1280,800],[667,375],[390,844],[320,568],[600,600],[599,600],[600,599]];
for(const [width,height] of carriers){
  const mode=UI.orientation(width,height);grid.useCompass(owned,UI.fieldInfo(owned,'compass'));
  const input={width,height,headerRect:header(width,height),triggerRect:{width:24,height:24},inset:8};
  const idle=grid.reconcile(input);
  assert.equal(idle.orientation,mode);assert.deepEqual(idle.fit,{top:true,trigger:true});
  assert.strictEqual(grid.reconcile(input).outer,idle.outer,'an unchanged observation reuses the realized field');
  assert.strictEqual(grid.reconcile(input).inner,idle.inner,'an unchanged navigator reuses its realized field');
  for(const name of ['top','compass'])verifyField(idle.outer,name,idle.viewport,idle[name],mode);
  // The authored Back field now contains the pocket, and the authored
  // pocket field contains Back. Legal stays; navigator controls follow the pocket.
  verifyField(idle.outer,'ascent',idle.viewport,idle.pocket,mode);
  verifyField(idle.inner,'pocket',idle.compass,idle.ascent,mode,true);
  for(const name of ['help','trigger'])verifyField(idle.inner,name,idle.pocket,idle[name],mode,true);
  verifyField(idle.inner,'legal',idle.compass,idle.legal,mode,true);
  assert.deepEqual(idle.compassInfo.cells,UI.fieldInfo(owned,'compass').cells,'orientation cannot replace the owner address');
  if(mode==='portrait'){
    close(idle.ascent.left,0);close(idle.ascent.right,idle.pocket.left);
    close(idle.ascent.top,idle.pocket.top);close(idle.pocket.bottom,idle.compass.bottom);
    close(idle.ascent.bottom,idle.legal.top);close(idle.legal.left,idle.compass.left);
    close(idle.trigger.right,idle.pocket.right);
    close(idle.help.top,idle.pocket.top);
    close(idle.help.right,idle.pocket.right);
    assert.ok(width-idle.top.left>=46,'header and optical rim fit the right-edge field');
  }else{
    close(idle.compass.right,width);close(idle.pocket.bottom,idle.ascent.top);
    close(idle.pocket.top,idle.top.bottom);close(idle.ascent.left,idle.compass.left);close(idle.ascent.right,idle.compass.right);
    close(idle.ascent.bottom,idle.legal.top);close(idle.trigger.right,idle.pocket.right);
    assert.ok(idle.top.bottom>=46,'header and optical rim fit the upper field');
  }
  const pending=grid.reconcile({...input,statusRect:status(width,height)});
  verifyField(pending.outer,'top',pending.viewport,pending.top,mode);
  assert.ok(mode==='portrait'?width-pending.top.left>=59:pending.top.bottom>=59,'real feedback and its rim fit');
  const restored=grid.reconcile(input);
  assert.deepEqual(restored.outer.fields.top.cells,idle.outer.fields.top.cells,'empty feedback restores the original addresses');
}
assert.equal(UI.orientation(600,600),'landscape','a square has a deterministic tie');
assert.deepEqual(UI.orientBounds({x:.75,y:.5,w:.25,h:.5},'portrait'),{x:0,y:.75,w:.5,h:.25});
assert.equal(UI.orientEdges('right bottom','portrait'),'bottom left');
assert.deepEqual(grid.topCapacity(320,568),{left:240,top:0,width:80,height:568,right:320,bottom:568},'status capacity comes from the whole declared membrane band before measured refinement');

// Concrete pre-exchange measurements preserve the user's authored fields:
// only the bodies occupying the old Back and pocket rectangles are swapped.
for(const [width,height,oldPocket,oldBack,oldLegal] of [
 [320,568,[0,426,160,106.5],[160,426,80,142],[0,532.5,120,35.5]],
 [390,844,[0,633,195,158.25],[195,633,146.25,211],[0,791.25,146.25,52.75]],
 [1280,800,[960,400,320,300],[960,50,320,350],[1040,700,160,100]]
]){
 const example=M.create(membrane,navigator);example.useCompass(owned,UI.fieldInfo(owned,'compass'));
 const s=example.reconcile({width,height,headerRect:header(width,height),triggerRect:{width:24,height:24},inset:8});
 const parts=r=>[r.left,r.top,r.width,r.height];
 assert.deepEqual(parts(s.pocket),oldBack,'compass must take the old Back rectangle');
 assert.deepEqual(parts(s.ascent),oldPocket,'Back must take the old compass pocket rectangle');
 assert.deepEqual(parts(s.legal),oldLegal,'legal links must keep their original rectangle');
}
const originalCompass=['zxw','zxx','zxy','zxz','zzw','zzx','zzy','zzz'];
for(const site of [owned,UI.normalizeState(require('../../y/yx/schattenseiten/ui-grid.json')),UI.normalizeState(require('../../y/yy/crawlerbait/ui-grid.json'))])
 assert.deepEqual(site.fields.compass.cells,originalCompass,'an owner compass declaration changed');

// A different owner remains itself across a live format change; its compass
// cells and nested actual rectangles follow the same global turn.
const site=UI.normalizeState({schema:UI.SCHEMA,meta:{name:'another-owner'},splits:[''],fields:{compass:{cells:['w']}},elements:{}});
grid.useCompass(site,UI.fieldInfo(site,'compass'));
let s=grid.reconcile({width:1000,height:600,headerRect:header(1000,600),triggerRect:{width:24,height:24},inset:8});
assert.deepEqual(s.compass,{left:0,top:0,width:500,height:300,right:500,bottom:300});
s=grid.reconcile({width:600,height:1000,headerRect:header(600,1000),triggerRect:{width:24,height:24},inset:8});
assert.deepEqual(s.compass,{left:300,top:0,width:300,height:500,right:600,bottom:500});
assert.deepEqual(s.compassInfo.cells,['w']);
verifyField(s.inner,'trigger',s.pocket,s.trigger,'portrait',true);
assert.throws(()=>grid.surfaceRect({getAttribute:()=>null,dataset:{}},{left:0,top:0,width:1,height:1}),/realized recursive UI field/);
assert.equal(M.address(0,0,40),'w'.repeat(40),'recursive addresses are not rank-capped by a UI breakpoint');

// Measured fit remains bounded by the actual authored field, including an
// unrelated navigator declaration and an insufficient finite carrier.
const tooShort=grid.reconcile({width:320,height:80,headerRect:{bottom:38},triggerRect:{width:40,height:40},inset:8});
assert.equal(tooShort.fit.top,false);
const narrowTop=structuredClone(membrane);
narrowTop.splits.push('ww','wx','xw');
narrowTop.fields.top.cells=['www','wwx','wxw','wxx','xww','xwx','xxw','xxx'];
const alternateNavigator=structuredClone(navigator);alternateNavigator.fields.trigger.cells=['yw','yx'];
const alternate=M.create(narrowTop,alternateNavigator);
const a=alternate.reconcile({width:1000,height:800,headerRect:{bottom:110},triggerRect:{width:20,height:20},inset:8});
assert.equal(a.fit.top,false);assert.ok(a.top.bottom<=100);
const seed=UI.fieldInfo(UI.normalizeState(alternateNavigator),'trigger').bounds,actual=UI.fieldInfo(a.inner,'trigger').bounds;
assert.ok(actual.x>=seed.x&&actual.y>=seed.y&&actual.x+actual.w<=seed.x+seed.w&&actual.y+actual.h<=seed.y+seed.h);
verifyField(a.inner,'trigger',a.pocket,a.trigger,'landscape');
console.log('PASS — one long-axis orientation projects addressed Display, navigator and owner fields through resize');
