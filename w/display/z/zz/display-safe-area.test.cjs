'use strict';
const assert=require('assert');
const S=require('./display-safe-area.js');

let s=S.derive({width:1440,height:1000},[
  {id:'header',role:'top',rect:{left:0,top:0,width:1440,height:50}},
  {id:'rail',role:'top',rect:{left:28,top:56,width:800,height:14}},
  {id:'mini',role:'right bottom',rect:{left:1392,top:720,width:48,height:48}},
  {id:'commit',role:'left bottom',rect:{left:28,top:938,width:160,height:44}}
],8);
assert.deepStrictEqual(s.insets,{top:78,right:56,bottom:288,left:196});
assert.strictEqual(s.occupied.length,4);

s=S.derive({width:390,height:844},[
  {id:'header',role:'top',rect:{left:0,top:0,width:390,height:38}},
  {id:'rail',role:'top',rect:{left:18,top:47,width:354,height:12}}
],8);
assert.deepStrictEqual(s.insets,{top:67,right:0,bottom:0,left:0});

s=S.derive({width:800,height:600},[],8);
assert.deepStrictEqual(s.insets,{top:0,right:0,bottom:0,left:0});

// An empty mounted live region must not acquire occupancy from its optical
// perimeter/overfill. Real feedback still reserves that same measured surface.
let height=0;
const attrs={'data-display-occupancy':'top','data-display-glass-overfill':'42'};
const status={id:'encounter-feedback',getAttribute:key=>attrs[key],getBoundingClientRect:()=>({left:28,top:56,width:744,height})};
global.document={querySelectorAll:()=>[status],documentElement:{style:{setProperty(){}},dataset:{}}};
global.innerWidth=800;global.innerHeight=600;
global.SSSDisplayGlass=require('./display-glass.js');
assert.strictEqual(S.refresh().occupied.length,0,'empty status reserved invisible glass');
assert.strictEqual(S.snapshot().insets.top,0);
height=14;
assert.strictEqual(S.refresh().occupied.length,1,'actual feedback lost its occupied region');
assert.strictEqual(S.snapshot().insets.top,56+14+42+8+8);
for(const name of ['document','innerWidth','innerHeight','SSSDisplayGlass'])delete global[name];

// Observer bursts share one pending measurement. Delivery reads the latest
// geometry; a later transition/resize still earns a fresh measurement.
{
  const fs=require('node:fs'),vm=require('node:vm');
  const source=fs.readFileSync(require.resolve('./display-safe-area.js'),'utf8');
  function observed(withRaf=true){
    let height=50,reads=0,writes=0,events=0,serial=0;
    const frames=[],observers={},listeners={};
    const hud={id:'measured-hud',getAttribute:()=> 'top',
      getBoundingClientRect(){reads++;return {left:0,top:0,width:800,height}},
      addEventListener:(name,fn)=>listeners[name]=fn};
    const context={document:{querySelectorAll:()=>[hud],getElementById:()=>null,
      documentElement:{style:{setProperty(){writes++}},dataset:{}}},
      innerWidth:800,innerHeight:600,
      getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'}),
      dispatchEvent(){events++},CustomEvent:class{},
      addEventListener:(name,fn)=>listeners[name]=fn,
      ResizeObserver:class{constructor(fn){observers.resize=fn}observe(){}},
      MutationObserver:class{constructor(fn){observers.mutation=fn}observe(){}}};
    if(withRaf)context.requestAnimationFrame=fn=>{frames.push(fn);return ++serial};
    vm.runInNewContext(source,context);context.SSSDisplaySafeArea.start();
    const reset=()=>{reads=writes=events=0};reset();
    return {api:context.SSSDisplaySafeArea,frames,observers,listeners,reset,
      height:value=>{height=value},counts:()=>({reads,writes,events}),
      frame:()=>frames.shift()?.(16.667)};
  }
  const measured=observed();
  for(let i=0;i<10;i++){
    measured.height(50+i);
    (i%2?measured.observers.resize:measured.observers.mutation)();
  }
  assert.deepStrictEqual(measured.counts(),{reads:0,writes:0,events:0},'pending observer refresh must not measure synchronously');
  assert.strictEqual(measured.frames.length,1,'one measurement per observer burst');
  measured.frame();
  assert.deepStrictEqual(measured.counts(),{reads:1,writes:4,events:1});
  assert.strictEqual(measured.api.snapshot().insets.top,67,'delivery must read the latest geometry');
  for(const name of ['transitionend','transitioncancel','resize']){
    measured.reset();measured.height(91);measured.listeners[name]();measured.frame();
    assert.strictEqual(measured.api.snapshot().insets.top,99);
    assert.deepStrictEqual(measured.counts(),{reads:1,writes:4,events:1},name+' must reacquire after the previous frame');
  }
  measured.reset();measured.height(117);measured.api.refresh();
  assert.strictEqual(measured.api.snapshot().insets.top,125,'explicit refresh remains immediate');
  assert.strictEqual(measured.counts().events,1);
  const immediate=observed(false);immediate.height(63);immediate.observers.mutation();
  assert.strictEqual(immediate.api.snapshot().insets.top,71,'without animation frames the observer refresh remains immediate');
  assert.deepStrictEqual(immediate.counts(),{reads:1,writes:4,events:1});
}
console.log('display safe-area contract pass');
