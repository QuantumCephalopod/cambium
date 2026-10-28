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

const bounded=sites.filter(p=>['organism:philosophy','organism:crawlerbait','organism:schattenseiten'].includes(JSON.parse(fs.readFileSync(p,'utf8')).id)).map(p=>JSON.parse(fs.readFileSync(path.join(path.dirname(p),'ui-grid.json'),'utf8')));
assert.equal(bounded.length,3);
for(const raw of bounded){const s=G.normalizeState(raw),box=id=>G.fieldInfo(s,id).bounds;assert.deepEqual(box('timeline'),{x:.25,y:.875,w:.5,h:.125});assert.deepEqual(box('compass'),{x:.75,y:.5,w:.25,h:.5});assert.deepEqual(box('description'),{x:0,y:.25,w:.25,h:.75});assert.deepEqual(box('viewport'),{x:.25,y:.25,w:.625,h:.625});assert.equal(s.fields.viewport.cells.length,25);assert.deepEqual(s.fields.viewport.cells.filter(c=>s.fields.compass.cells.includes(c)),['zxw','zxy','zzw']);}
assert.deepEqual(bounded[0],bounded[1]);assert.deepEqual(bounded[1],bounded[2]);
console.log('PASS — actual supplied 5x5 viewport, extended compass/description and invariant footer; exact shared cells retained');
