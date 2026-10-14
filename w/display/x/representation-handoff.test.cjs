'use strict';
const assert=require('node:assert/strict');
const H=require('./representation-handoff.js');
const wait=async()=>{for(let i=0;i<18;i++)await Promise.resolve()};
const later=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}};
async function witness(){
  const low=H.create(),high=H.create({limit:1,active:false});
  const base=low.request('body@revision/r0',()=>({kind:'coarse'}));
  await base.promise;
  const next=later();
  const hi=high.request('body@revision/r1',()=>next.promise);
  assert.equal(hi.status,'queued');assert.equal(high.best(['body@revision/r1']),null);
  assert.equal(low.best(['body@revision/r0']),base,'current witness remains while successor is queued');
  high.setActive(true);assert.equal(hi.status,'loading');
  next.resolve({kind:'detail'});await hi.promise;
  assert.equal(high.best(['body@revision/r1']),hi);
  assert.equal(low.best(['body@revision/r0']),base,'handoff never deletes valid lower resolution');
  high.setActive(false);

  let attempts=0;
  const failed=high.request('bad',()=>{attempts++;return Promise.reject(new Error('offline'))});
  assert.equal(failed.status,'queued');
  high.setActive(true);await assert.rejects(failed.promise,/offline/);
  assert.equal(low.best([base.key]),base,'failure cannot erase fallback');
  const retry=high.request('bad',()=>{attempts++;return 'ready'},{retryFailed:true});
  assert.notStrictEqual(retry,failed);assert.equal(await retry.promise,'ready');
  assert.equal(attempts,2,'failure may be retried without reminting identity');
  assert.equal(high.request('bad',()=>{throw Error('should not retry ready')}),retry);

  const limited=H.create({limit:1}),a=later(),b=later(),ran=[];
  const one=limited.request('x',()=>{ran.push('x');return a.promise});
  assert.strictEqual(limited.request('x',()=>{throw new Error('duplicate');}),one);
  const two=limited.request('y',()=>{ran.push('y');return b.promise});
  assert.deepEqual(ran,['x']);assert.equal(two.status,'queued');
  a.resolve('X');await one.promise;await wait();assert.deepEqual(ran,['x','y']);
  b.resolve('Y');await two.promise;assert.deepEqual(limited.pending(),[]);

  let disposed=0;
  const stale=later(),owners=H.create({limit:1});
  const abandoned=owners.request('revision1',()=>stale.promise,{dispose:x=>{assert.equal(x,'old');disposed++}});
  assert.equal(owners.retire('revision1'),true);
  await assert.rejects(abandoned.promise,/retired/);
  stale.resolve('old');await wait();assert.equal(disposed,1,'in-flight stale payload must be retired');
  assert.equal(owners.get('revision1'),null);
  const valid=owners.request('revision2',()=>42);assert.equal(await valid.promise,42);
  owners.clear();assert.equal(owners.get('revision2'),null);

  const inner=H.create(),outer=H.create();
  await Promise.all([inner.request('w',()=>1).promise,outer.request('w',()=>2).promise]);
  assert.equal(inner.best(['w']).value,1);assert.equal(outer.best(['w']).value,2);
  inner.retire('w');assert.equal(outer.best(['w']).value,2,'rank substitution has independent life and source');
  assert.throws(()=>H.create({limit:0}),/concurrency/);
  console.log('representation handoff: fallback, queue, retry, stale disposal, rank substitution PASS');
}
witness().catch(error=>{console.error(error);process.exitCode=1});
