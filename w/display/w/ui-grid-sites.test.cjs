'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const G=require('./ui-grid.js');

const ROOT=path.join(__dirname,'..','y');
const sites=[];

function walk(dir){
  for(const name of fs.readdirSync(dir)){
    const p=path.join(dir,name),st=fs.statSync(p);
    if(st.isDirectory())walk(p);
    else if(name==='site.json')sites.push(p);
  }
}
walk(ROOT);
assert.ok(sites.length,'no site-holons discovered');

for(const manifestPath of sites){
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  assert.equal(manifest.version,2,manifestPath+' site contract');
  assert.ok(manifest.ui_grid,manifestPath+' missing ui_grid');
  const root=path.dirname(manifestPath);
  const gridPath=path.resolve(root,manifest.ui_grid);
  assert.ok(gridPath.startsWith(root+path.sep),manifestPath+' ui_grid escaped site body');
  const state=G.normalizeState(JSON.parse(fs.readFileSync(gridPath,'utf8')));
  assert.equal(state.schema,G.SCHEMA,manifest.id);
  assert.ok(Object.keys(state.fields).length>0,manifest.id+' has no screen-space field witness');
  assert.ok(Object.values(state.fields).every(f=>Number.isInteger(f.z)&&f.z>=0),manifest.id+' lacks deterministic local depth');
  for(const id of Object.keys(state.fields))assert.ok(G.fieldInfo(state,id).ok,manifest.id+' @'+id);
}

console.log('site UI grids: '+sites.length+' canonical v2 carriers PASS');
