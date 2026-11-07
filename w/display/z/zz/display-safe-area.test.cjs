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
const fixtureGlass=require('./display-glass.js');
global.SSSDisplayGlass={surfaceRect:(_el,r)=>fixtureGlass.readingFrame({...r,height:r.height+42},8).rect};
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

// Header acquisition precedes feedback placement in this same refresh. This
// remains true before observers start, after font/viewport changes and without
// ResizeObserver. Every occupied element is measured only once.
{
  const fs=require('node:fs'),vm=require('node:vm'),Glass=require('./display-glass.js');
  const source=fs.readFileSync(require.resolve('./display-safe-area.js'),'utf8');
  let headerHeight=54,statusHeight=0,rem=16,width=800;
  const values={},writes={},reads={header:0,status:0};
  const rootStyle={getPropertyValue:key=>values[key]||'',setProperty(key,value){values[key]=value;writes[key]=(writes[key]||0)+1}};
  const root={style:rootStyle,dataset:{}};
  const header={id:'display-header',getAttribute:key=>key==='data-display-occupancy'?'top':null,
    getBoundingClientRect(){reads.header++;return {left:0,top:0,width,height:headerHeight}}};
  const status={id:'display-membrane-status',getAttribute:header.getAttribute,
    getBoundingClientRect(){reads.status++;return {left:18,top:parseFloat(values['--display-header-bottom']||0),width:width-36,height:statusHeight}}};
  const context={document:{documentElement:root,querySelectorAll:()=>[status,header]},
    innerWidth:width,innerHeight:600,
    getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'}),
    SSSDisplayGlass:{surfaceRect:(_el,r)=>Glass.readingFrame(r,rem/2).rect}};
  vm.runInNewContext(source,context);
  const acquire=()=>{
    reads.header=reads.status=0;
    const next=context.SSSDisplaySafeArea.refresh();
    assert.deepEqual(reads,{header:1,status:1});
    assert.equal(values['--display-header-bottom'],headerHeight+'px');
    return next;
  };
  assert.equal(acquire().insets.top,70);
  assert.equal(writes['--display-header-bottom'],1);
  statusHeight=14;
  assert.equal(acquire().insets.top,84,'new feedback must already use the current measured header bottom');
  assert.equal(writes['--display-header-bottom'],1,'unchanged header does not dirty styles again');
  headerHeight=78;rem=24;
  assert.equal(acquire().insets.top,112,'font growth updates feedback before its measurement');
  width=390;context.innerWidth=390;headerHeight=66;statusHeight=28;
  assert.equal(acquire().insets.top,114,'narrow wrapped feedback has actual occupied extent');
  statusHeight=0;
  const empty=acquire();assert.equal(empty.occupied.length,1);assert.equal(empty.insets.top,86);
}
console.log('same-refresh measured header/status placement and empty feedback pass');
