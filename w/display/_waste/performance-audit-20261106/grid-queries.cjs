'use strict';
const vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process'),{performance}=require('node:perf_hooks');
const base=process.env.CAMBIUM_AUDIT_ROOT||process.argv[2]||process.cwd(),revision='d84196fe4486ee1db5b84687ce3416409ee98984';
const read=path=>cp.execFileSync('git',['show',revision+':'+path],{cwd:base,encoding:'utf8'});
let parses=0;const sandbox={module:{exports:{}},JSON:{parse:s=>{parses++;return JSON.parse(s)},stringify:JSON.stringify}};
vm.runInNewContext(read('w/display/w/wz/ui-grid.js'),sandbox);
const UI=sandbox.module.exports;
const bodies=['philosophy','yw/crawlerbait','yx/schattenseiten','yy/papers','yz/datenschutz','yxz/impressum'];
const results=[];
for(const body of bodies){const dir='w/display/y/'+body,manifest=JSON.parse(read(dir+'/site.json')),text=read(dir+'/'+manifest.ui_grid),source=JSON.parse(text),state=UI.normalizeState(source),names=Object.keys(state.fields),variants=['','portrait'];
 const prepared=new Map();for(const variant of variants)for(const name of names)prepared.set(variant+':'+name,UI.fieldInfo(state,name,variant));
 parses=0;let calls=0;const t=performance.now();for(let i=0;i<500;i++)for(const variant of variants)for(const name of names){const actual=UI.fieldInfo(state,name,variant);if(i===0)assert.equal(JSON.stringify(actual),JSON.stringify(prepared.get(variant+':'+name)));calls++;}
 results.push({body,source_bytes:Buffer.byteLength(text),split_addresses:state.splits.length,fields:names.length,calls,json_clone_parse_calls:parses,elapsed_ms:performance.now()-t});
 assert.throws(()=>UI.fieldInfo(state,'absent'),/unknown field/);
 const malformed=structuredClone(source);malformed.splits.push('qq');assert.throws(()=>UI.normalizeState(malformed));
}
console.log(JSON.stringify({source_revision:revision,scope:'Native actual-grid repeated fieldInfo workload. This measures per-query validation cost, not browser frame time; locus-shader viewBox already caches stable presentation by width/height.',results},null,2));
