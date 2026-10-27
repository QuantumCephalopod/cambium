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
