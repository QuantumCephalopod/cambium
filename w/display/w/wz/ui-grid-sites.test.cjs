'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const G=require('./ui-grid.js');

const sites=[...require('../wy/site-witness.cjs').discoverSites().values()];
assert.ok(sites.length,'no site-holons discovered');
const states=new Map();

for(const site of sites){
  const manifestPath=path.join(site.directory,'site.json'),manifest=site.manifest;
  assert.equal(manifest.version,2,manifestPath+' site contract');
  assert.ok(manifest.ui_grid,manifestPath+' missing ui_grid');
  const gridPath=site.file('ui_grid');
  const state=G.normalizeState(JSON.parse(fs.readFileSync(gridPath,'utf8')));
  states.set(manifest.id,state);
  assert.equal(state.schema,G.SCHEMA,manifest.id);
  assert.ok(Object.keys(state.fields).length>0,manifest.id+' has no screen-space field witness');
  assert.ok(Object.values(state.fields).every(f=>Number.isInteger(f.z)&&f.z>=0),manifest.id+' lacks deterministic local depth');
  for(const id of Object.keys(state.fields))for(const mode of ['landscape','portrait'])assert.ok(G.carrierField(state,id,mode).ok,manifest.id+' @'+id+' '+mode);
}

for(const mode of ['landscape','portrait']){
  const crawler=G.carrierField(states.get('organism:crawlerbait'),'timeline',mode);
  const shadows=G.carrierField(states.get('organism:schattenseiten'),'timeline',mode);
  assert.deepEqual(crawler.cells,shadows.cells,'the shared timeline must use the same declared address in '+mode);
  assert.deepEqual(crawler.bounds,shadows.bounds);
}

console.log('site UI grids: '+sites.length+' canonical v2 carriers PASS');
