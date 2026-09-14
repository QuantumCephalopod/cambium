'use strict';
const assert=require('node:assert/strict');
const H=require('./site-holon.js');
const main=require('./site-mounts.json');
const papers=require('./papers-site-mounts.json');

function instantiate(spec){
  const registry=H.createRegistry();
  for(const s of spec.sites){
    const site=H.defineSite({id:s.id,shader:s.shader,manifestation:s.manifestation,state:{}});
    registry.register(site);
    registry.mount(site.id,s.witnesses.map((w,i)=>({witness:w,interlocutor:s.interlocutors[i]})));
  }
  return registry;
}

const mainRegistry=instantiate(main);
const papersRegistry=instantiate(papers);
assert.equal(mainRegistry.resolve('').siteId,'site:sss:root');
assert.equal(mainRegistry.resolve('y').siteId,'site:sss:04');
assert.equal(papersRegistry.resolve('').siteId,'organism:papers');
assert.equal(papersRegistry.resolve('').witness,'');
assert.equal(papersRegistry.resolve('').chamber.interlocutor.id,'papers:_feed');
assert.equal(papersRegistry.resolve('').site.manifestation.kind,'papers-feed');
assert.notEqual(mainRegistry.resolve('').siteId,papersRegistry.resolve('').siteId);

const bus=H.createActivityBus(papersRegistry);
const event=bus.receive({siteId:'organism:papers',kind:'HOME',state:'VISIBLE',projectionChanged:true});
assert.equal(event.siteId,'organism:papers');
assert.equal(bus.current('organism:papers').state,'VISIBLE');
console.log('PASS Papers is a second site-holon specimen with restarted local root and identity-bound activity');
