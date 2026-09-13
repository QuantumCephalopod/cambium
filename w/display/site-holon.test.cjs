#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const H=require('./site-holon.js');
const F=require('./site-fold.js');

const a=H.resolvePath('xyw'), b=H.resolvePath('xwy');
assert.equal(a.locus,b.locus,'reciprocal witnesses must coalesce');
assert.notEqual(a.witness,b.witness,'genealogical witnesses must remain distinct');
assert.deepEqual(new Set(a.equivalentWitnesses),new Set(['xyw','xwy']));
assert.equal(H.resolvePath('xyww').locus,a.locus,'terminal self continuation must preserve locus');

const localState={visits:0};
const site=H.defineSite({id:'site:alpha',shader:{id:'shader:alpha'},manifestation:{kind:'mixed'},state:localState});
const registry=H.createRegistry(); registry.register(site);
registry.mount(site.id,[{witness:'x',interlocutor:{id:'solo'}}]);
let r=registry.resolve('x',{width:1200,height:700});
assert.equal(r.site,site); assert.equal(r.siteId,'site:alpha'); assert.equal(r.locus,'vertex:x'); assert.equal(r.composition.mode,'single');
localState.visits++;

registry.mount(site.id,[{witness:'xy',interlocutor:{id:'moved'}}]);
r=registry.resolve('xy',{width:1200,height:700});
assert.equal(r.site,site,'relocation must preserve stable site object');
assert.equal(r.site.state.visits,1,'relocation must preserve site-local state');
assert.equal(r.locus,H.resolvePath('yx').locus,'xy/yx quotient must resolve to one midpoint locus');

registry.mount(site.id,[
  {witness:'xyw',interlocutor:{id:'text',kind:'dom'}},
  {witness:'xwy',interlocutor:{id:'shader',kind:'webgl'}}
]);
const wide=registry.resolve('xyw',{width:1440,height:900});
const tall=registry.resolve('xwy',{width:390,height:844});
assert.equal(wide.site,site); assert.equal(tall.site,site);
assert.equal(wide.locus,tall.locus); assert.notEqual(wide.witness,tall.witness);
assert.equal(wide.chamber.interlocutor.id,'text'); assert.equal(tall.chamber.interlocutor.id,'shader');
assert.equal(wide.composition.mode,'split'); assert.equal(wide.composition.axis,'vertical');
assert.equal(tall.composition.mode,'split'); assert.equal(tall.composition.axis,'horizontal');

const bus=H.createActivityBus(registry); let seen=null; bus.subscribe(e=>{seen=e;});
const pulse=bus.receiveAt('xwy',{kind:'HOME',state:'READY',projectionChanged:true,semanticChanged:false,payload:{event:'demo'}});
assert.equal(pulse.siteId,site.id,'activity must resolve through current mount to stable site identity');
assert.equal(seen.siteId,site.id); assert.equal(bus.current(site.id).payload.event,'demo');
registry.mount(site.id,[{witness:'z',interlocutor:{id:'moved-again'}}]);
assert.throws(()=>bus.receiveAt('xwy',{kind:'HOME'}),/no mounted site/,'activity must not remain glued to obsolete locus');
assert.equal(bus.receiveAt('z',{kind:'HOME'}).siteId,site.id,'activity must follow remounted identity');

assert.throws(()=>registry.mount(site.id,[{witness:'x',interlocutor:{}},{witness:'y',interlocutor:{}}]),/exactly one quotient locus/);
const siteB=H.defineSite({id:'site:beta',shader:{id:'shader:beta'}}); registry.register(siteB);
assert.notEqual(site.shader.id,siteB.shader.id,'different sites may carry different locus shader realizations through one primitive');
assert.throws(()=>registry.mount(siteB.id,[{witness:'z',interlocutor:{}}]),/already occupied/);
registry.mount(siteB.id,[{witness:'w',interlocutor:{id:'beta'}}]);
assert.equal(registry.resolve('w',{width:800,height:600}).site,siteB);

assert.deepEqual(F.sequence(),['open','closing','closed','opening','open'],'closure must expose one invariant transition sequence');

console.log(JSON.stringify({
  status:'pass',
  identity_locus_separate:true,
  reciprocal_coalescence:true,
  relocation:true,
  responsive_chambers:true,
  activity_follows_identity:true,
  tetrahedral_closure_sequence:true
},null,2));
