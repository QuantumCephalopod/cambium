'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const G=require('./ui-grid.js');

const sites=[...require('./site-witness.cjs').discoverSites().values()];
assert.ok(sites.length,'no site-holons discovered');

for(const site of sites){
  const manifestPath=path.join(site.directory,'site.json'),manifest=site.manifest;
  assert.equal(manifest.version,2,manifestPath+' site contract');
  assert.ok(manifest.ui_grid,manifestPath+' missing ui_grid');
  const gridPath=site.file('ui_grid');
  const state=G.normalizeState(JSON.parse(fs.readFileSync(gridPath,'utf8')));
  assert.equal(state.schema,G.SCHEMA,manifest.id);
  assert.ok(Object.keys(state.fields).length>0,manifest.id+' has no screen-space field witness');
  assert.ok(Object.values(state.fields).every(f=>Number.isInteger(f.z)&&f.z>=0),manifest.id+' lacks deterministic local depth');
  for(const id of Object.keys(state.fields))assert.ok(G.fieldInfo(state,id).ok,manifest.id+' @'+id);
}

console.log('site UI grids: '+sites.length+' canonical v2 carriers PASS');
