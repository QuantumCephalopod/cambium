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
