#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const H=require('./site-holon.js');
const F=require('./site-fold.js');

const a=H.resolveAddress('xyw'), b=H.resolveAddress('xwy');
assert.equal(a.locus,b.locus,'reciprocal addresses must coalesce to one locus');
assert.notEqual(a.address,b.address,'raw/genealogical routes remain distinct');
assert.deepEqual(new Set(a.equivalentAddresses),new Set(['xyw','xwy']));
assert.equal(H.resolveAddress('xyww').locus,a.locus,'terminal self continuation preserves locus');

const registry=H.createRegistry();
const philosophy=H.defineInterlocutor({id:'organism:philosophy',localScope:'main',shader:{id:'shader:philosophy'},manifestation:{kind:'philosophy'},state:{visits:0}});
const papers=H.defineInterlocutor({id:'organism:papers',localScope:'papers',shader:{id:'shader:papers'},manifestation:{kind:'papers'},state:{visits:0}});
registry.register(philosophy); registry.register(papers);

registry.mount(philosophy.id,{scope:'main',address:''});
let r=registry.resolve('main','',{width:1200,height:700});
assert.equal(r.interlocutors.length,1); assert.equal(r.interlocutors[0].interlocutor,philosophy);
assert.equal(r.composition.mode,'single');

registry.mount(papers.id,{scope:'main',address:'y'});
r=registry.resolve('main','y',{width:1200,height:700});
assert.equal(r.interlocutors.length,1); assert.equal(r.interlocutors[0].interlocutor,papers);
papers.state.visits++;

assert.throws(
  ()=>registry.mount(philosophy.id,{scope:'main',address:'y'}),
  /differentiate before mounting another interlocutor/,
  'two page-organisms may not pile onto one raw global address; split first'
);
assert.equal(registry.getAtAddress('main','y'),papers,'failed pile-up must preserve the original mount');

registry.mount(papers.id,{scope:'main',address:'xyw'});
registry.mount(philosophy.id,{scope:'main',address:'xwy'});
const wide=registry.resolve('main','xyw',{width:1440,height:900});
const tall=registry.resolve('main','xwy',{width:390,height:844});
assert.equal(wide.locus,tall.locus);
assert.deepEqual(new Set(wide.interlocutors.map(x=>x.interlocutorId)),new Set(['organism:philosophy','organism:papers']));
assert.equal(wide.composition.mode,'split'); assert.equal(wide.composition.axis,'vertical');
assert.equal(tall.composition.mode,'split'); assert.equal(tall.composition.axis,'horizontal');
assert.equal(registry.getInterlocutor(papers.id).state.visits,1,'relocation preserves page-organism local state');

const third=H.defineInterlocutor({id:'organism:third',localScope:'third'}); registry.register(third);
assert.throws(()=>registry.mount(third.id,{scope:'main',address:'xyw'}),/differentiate/,'exact raw-address pile-up must be refused');
registry.mount(third.id,{scope:'main',address:'xyww'});
const many=registry.resolve('main','xyw',{width:1200,height:800});
assert.equal(many.interlocutors.length,3,'distinct recursive addresses may still quotient-coalesce at one locus');
assert.equal(many.composition.mode,'grid');

registry.mount(papers.id,{scope:'main',address:'z'});
assert.equal(registry.resolve('main','z').interlocutors[0].interlocutorId,papers.id,'relocation changes placement only');
assert.equal(registry.resolve('papers','z').interlocutors.length,0,'independently rooted scopes do not concatenate host addresses');

const bus=H.createActivityBus(registry); let seen=null; bus.subscribe(e=>{seen=e;});
const pulse=bus.receive({siteId:papers.id,kind:'HOME',state:'READY',projectionChanged:true,payload:{event:'demo'}});
assert.equal(pulse.interlocutorId,papers.id); assert.equal(seen.interlocutorId,papers.id); assert.equal(bus.current(papers.id).payload.event,'demo');
assert.equal(bus.receiveAt('main','z',{kind:'HOME'}).interlocutorId,papers.id,'activity may resolve through an unambiguous locus');
assert.throws(()=>bus.receiveAt('main','xyw',{kind:'HOME'}),/ambiguous/,'shared locus activity must target one page-organism identity');

assert.deepEqual(F.sequence(),['open','closing','closed','opening','open'],'closure exposes one invariant transition sequence');

console.log(JSON.stringify({
  status:'pass',
  viewer_is_witness:true,
  recursive_address_quotient:true,
  identity_locus_separate:true,
  relocation:true,
  preemptive_split_before_raw_address_pileup:true,
  quotient_coalescence_composes_distinct_addresses:true,
  responsive_composition:true,
  activity_follows_identity:true,
  tetrahedral_closure_sequence:true
},null,2));
