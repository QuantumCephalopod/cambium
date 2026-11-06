'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=process.env.CAMBIUM_AUDIT_ROOT||process.argv[2]||process.cwd();
const sourcePath='w/display/z/zz/display-safe-area.js';
const original=cp.execFileSync('git',['show','d84196fe4486ee1db5b84687ce3416409ee98984:'+sourcePath],{cwd:root,encoding:'utf8'});
const candidate=fs.readFileSync(root+'/'+sourcePath,'utf8');
function boot(source,withRaf=true){
  let height=50,reads=0,styles=0,writes=0,events=0,rafId=0;const queued=[],callbacks={},listeners={};
  const occupancy=[0,1,2,3].map((n)=>({id:'hud-'+n,getAttribute:()=>n?'bottom':'top',getBoundingClientRect(){reads++;return {left:n*100,top:n?500:0,width:100,height}},addEventListener(k,fn){listeners[k]=fn}}));
  const s={document:{querySelectorAll:()=>occupancy,getElementById:()=>null,documentElement:{style:{setProperty(){writes++}},dataset:{}}},innerWidth:800,innerHeight:600,
    getComputedStyle:()=>{styles++;return {display:'block',visibility:'visible',opacity:'1'}},
    dispatchEvent(){events++},CustomEvent:class{},addEventListener:(k,fn)=>listeners[k]=fn,
    ResizeObserver:class{constructor(fn){callbacks.resize=fn}observe(){}},MutationObserver:class{constructor(fn){callbacks.mutation=fn}observe(){}}};
  if(withRaf)s.requestAnimationFrame=fn=>{queued.push(fn);return ++rafId};
  vm.createContext(s);vm.runInContext(source,s);s.SSSDisplaySafeArea.start();
  const reset=()=>{reads=styles=writes=events=0};reset();
  return {api:s.SSSDisplaySafeArea,callbacks,listeners,queued,reset,measure:()=>({reads,styles,writes,events,queued:queued.length}),height:h=>{height=h},frame:()=>queued.shift()?.(16.667)};
}
function burst(source,count){const b=boot(source);for(let i=0;i<count;i++){b.height(50+i);b.callbacks.mutation()}const before=b.measure();b.frame();return {before,after:b.measure(),top:b.api.snapshot().insets.top}}
const evidence={source_revision:'d84196fe4486ee1db5b84687ce3416409ee98984',scope:'Native production-module observer scheduling; four synthetic occupied surfaces. Counts are exact; no browser timing or observed production event frequency is claimed.',bursts:{}};
for(const count of [1,2,10,100]){const old=burst(original,count),next=burst(candidate,count);assert.equal(old.top,next.top);assert.equal(next.after.events,1);assert.equal(old.after.events,count);evidence.bursts[count]={before:old,after:next};}
const b=boot(candidate);b.callbacks.mutation();b.callbacks.resize();b.height(91);b.frame();assert.equal(b.api.snapshot().insets.top,99);assert.equal(b.measure().events,1);
b.reset();b.height(102);b.listeners.transitionend();b.frame();assert.equal(b.api.snapshot().insets.top,110);assert.equal(b.measure().events,1);
b.reset();b.height(117);b.api.refresh();assert.equal(b.api.snapshot().insets.top,125);assert.equal(b.measure().events,1);
const plain=boot(candidate,false);plain.height(63);plain.callbacks.mutation();assert.equal(plain.api.snapshot().insets.top,71);assert.equal(plain.measure().events,1);
evidence.obligations=['latest geometry at delivery','separate later-frame reacquisition','transition completion reacquisition','public explicit refresh remains immediate','absence of requestAnimationFrame remains immediate'].map(x=>({claim:x,status:'PASS'}));
console.log(JSON.stringify(evidence,null,2));
