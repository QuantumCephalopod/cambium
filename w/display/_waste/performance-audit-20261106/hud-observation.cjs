'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
// Witnessed against d84196fe4486ee1db5b84687ce3416409ee98984; re-run only with that base or unchanged Glass/Lens sources.
// Usage: node cambium-hud-perf-probe.cjs [repository-root]
const repo=process.argv[2]||'/tmp/cambium-perf-20261106';
const dir=path.resolve(repo,'w/display/z/zz');
function target(){return {style:{},dataset:{},events:{},attributes:{},classList:{contains:()=>false},setAttribute(k,v){this.attributes[k]=v},getAttribute(k){return this.attributes[k]??null},addEventListener(type,fn){(this.events[type]??=[]).push(fn)}};}
function run(fields,late){
 const win=target(),frames=[],nodes=[],counts={scans:0,styles:0,rects:0};let clock=100;
 const hud=[['header',0,0,1100,80],['description',0,175,275,525],['compass',825,350,275,350]].map(([id,left,top,width,height])=>({...target(),id,attributes:{'data-display-occupancy':id==='header'?'top':'right'},getBoundingClientRect(){counts.rects++;return {left,top,width,height}}}));
 Object.assign(win,{innerWidth:1100,innerHeight:700,performance:{now:()=>clock},matchMedia:()=>({matches:false}),getComputedStyle:()=>{counts.styles++;return {fontSize:'16px',display:'block',visibility:'visible',opacity:'1'}},requestAnimationFrame:f=>frames.push(f),document:{documentElement:{dataset:{}},body:{append:n=>nodes.push(n)},createElement:target,querySelectorAll(){counts.scans++;return hud}}});win.globalThis=win;
 vm.runInNewContext(fs.readFileSync(dir+'/display-glass.js','utf8'),win);
 vm.runInNewContext(fs.readFileSync(dir+'/display-lens.js','utf8'),win);
 for(let i=0;i<60;i++){clock+=16;const ms=clock;frames.shift()(ms);for(let field=0;field<fields;field++){if(late&&field>0)clock+=7;win.SSSDisplayGlass.rects({left:0,top:0,width:1100,height:700},{width:1100,height:700},undefined,null,win.SSSDisplayLens.snapshot()?.lens)}}
 return {frames:60,fields,lateWithinSameFrame:late,...counts};
}
console.log(JSON.stringify({scope:'Actual production Glass + Lens modules under instrumented DOM/RAF transport; no browser layout timing',cases:[run(1,false),run(2,false),run(2,true)]},null,2));
