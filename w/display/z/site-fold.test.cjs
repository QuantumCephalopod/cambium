#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const F=require('./site-fold.js');
(async()=>{
  assert.deepEqual(F.sequence(),['open','closing','closed','opening','open']);
  const layer={dataset:{fold:'open'},hidden:true};
  const fold=F.createFold(layer,{reduced:true});
  let swapped=false;
  const ok=await fold.swap(()=>{
    assert.equal(layer.dataset.fold,'closed','swap must occur only under closure');
    swapped=true;
  });
  assert.equal(ok,true);assert.equal(swapped,true);assert.equal(layer.dataset.fold,'open');assert.equal(layer.hidden,true);
  console.log(JSON.stringify({status:'pass',tetrahedral_closure_swap:true},null,2));
})().catch(err=>{console.error(err);process.exit(1);});

(async()=>{
 const events=[],layer={dataset:{},hidden:true,style:{setProperty(){}}};
 const old=global.SSSSiteFoldParticles;global.SSSSiteFoldParticles={create(){return {prepare(){events.push('prepare')},async animate(to,ms){events.push([to,ms])},stop(){events.push('stop')},paint(p){events.push(['paint',p])}}}};
 try{const f=F.createFold(layer,{reduced:false});let duration;await f.swap(()=>{assert.equal(layer.dataset.fold,'closed');events.push('swap')},{onClosing:ms=>duration=ms});assert.equal(duration,1650);assert.deepEqual(events,['prepare',[1,1650],'swap',[0,1650],'stop',['paint',0]]);assert.equal(f.busy,false);assert.equal(layer.hidden,true);
 const pending=f.swap(()=>{});assert.equal(await f.swap(()=>{}),false,'a second crossing entered during closure');await pending;
 await assert.rejects(f.swap(()=>{throw Error('source refuses')}),/source refuses/);assert.equal(f.busy,false);assert.equal(layer.hidden,true);
 }finally{global.SSSSiteFoldParticles=old;}
})().catch(err=>{console.error(err);process.exitCode=1});

/* The actual fold and actual particle driver share one deterministic frame
 * clock. This witnesses the complete visible-wait -> closure -> transaction. */
(async()=>{
 const fs=require('fs'),vm=require('vm'),G=require('../w/goo-material.js');let now=0,id=0;const frames=new Map();
 const canvas={setAttribute(){},getContext:()=>null,addEventListener(){},remove(){}},layer={dataset:{},hidden:true,style:{setProperty(){}},appendChild(){},ownerDocument:{createElement:()=>canvas}};
 const c={SSSGooMaterial:G,Float32Array,innerWidth:800,innerHeight:600,performance:{now:()=>now},requestAnimationFrame:f=>{frames.set(++id,f);return id},cancelAnimationFrame:i=>frames.delete(i)};
 vm.runInNewContext(fs.readFileSync(require.resolve('./site-fold-particles.js'),'utf8'),c);vm.runInNewContext(fs.readFileSync(require.resolve('./site-fold.js'),'utf8'),c);
 const fold=c.SSSSiteFold.createFold(layer,{reduced:false}),frame=async()=>{now+=16;const jobs=[...frames.values()];frames.clear();for(const f of jobs)f(now);for(let i=0;i<8;i++)await Promise.resolve()};
 let done,progress=.45,commits=0;const ready=new Promise(r=>done=r),start=now;
 const run=fold.swap(()=>{assert.equal(layer.dataset.fold,'closed');assert.equal(layer.hidden,false);commits++},{readiness:ready,progress:()=>progress});
 for(let i=0;i<180;i++)await frame();assert.equal(commits,0);assert.equal(layer.dataset.fold,'closing');assert.equal(layer.dataset.waiting,'true');assert(fold.busy);assert.equal(await fold.swap(()=>{}),false);
 progress=1;done({ok:true});for(let i=0;i<400&&fold.busy;i++)await frame();assert.equal(await run,true);assert.equal(commits,1);assert(now-start>=3300);assert.equal(frames.size,0);assert(layer.hidden);assert.equal(layer.dataset.waiting,undefined);
 let cancel;const pending=new Promise(r=>cancel=r);const cancelled=fold.swap(()=>{throw Error('cancelled mutation ran')},{readiness:pending,progress:()=>.2});await frame();cancel({cancelled:true});for(let i=0;i<220&&fold.busy;i++)await frame();assert.equal(await cancelled,false);assert(layer.hidden);assert.equal(frames.size,0);
 const failure=fold.swap(()=>{throw Error('refused mutation ran')},{readiness:Promise.resolve({ok:false,error:Error('owner refused')}),progress:()=>.6});const rejection=assert.rejects(failure,/owner refused/);for(let i=0;i<230&&fold.busy;i++)await frame();await rejection;assert(layer.hidden);assert.equal(frames.size,0);
 console.log('actual progress-driven fold: cold visible wait, busy gate, covered commit, animated cancellation/refusal and idle cleanup PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
