'use strict';
// Explicit integration inputs preserve whole-body relocation without host edits.
const fs=require('fs'),path=require('path'),vm=require('vm'),{performance}=require('perf_hooks'),{createHash}=require('crypto'),zlib=require('zlib'),assert=require('assert');
const [carrierPath,transportPath,beforePath]=process.argv.slice(2);
if(!carrierPath||!transportPath||!beforePath)throw Error('pass shared recursive-fold, emitted transport and pinned before-renderer paths');
const raw=fs.readFileSync(path.join(__dirname,'projection.json')),compact=fs.readFileSync(transportPath),source=JSON.parse(raw),Q=require(path.resolve(carrierPath));
assert.deepStrictEqual(JSON.parse(compact),source);
const median=a=>a.sort((x,y)=>x-y)[Math.floor(a.length/2)],sha=bytes=>createHash('sha256').update(bytes).digest('hex'),parse={};
for(const [name,bytes]of [['before',raw],['after',compact]]){const ms=[];for(let i=0;i<9;i++){const t=performance.now();JSON.parse(bytes.toString());ms.push(performance.now()-t)}parse[name]=median(ms)}
const stages={};for(const [name,file]of [['before',beforePath],['after',path.join(__dirname,'render.js')]]){
 const code=fs.readFileSync(file,'utf8'),prep=[],first=[];let points;
 for(let i=0;i<7;i++){const modules=new Map(),c={SSSInterlocutorModules:modules,SSSRecursiveFold:Q,performance};vm.runInNewContext(code,c);const owner=modules.get('organism:crawlerbait');let t=performance.now();owner.fieldProjection(source);prep.push(performance.now()-t);t=performance.now();owner.shader.focus({ms:0});const view=owner.shader.snapshot({container:''});first.push(performance.now()-t);points=view.points.length}
 stages[name]={renderer_sha256:sha(code),preparation_median_ms:median(prep),first_source_frame_median_ms:median(first),points};
}
console.log(JSON.stringify({source_sha256:sha(raw),transport_sha256:sha(compact),source_bytes:raw.length,transport_bytes:compact.length,gzip_before:zlib.gzipSync(raw).length,gzip_after:zlib.gzipSync(compact).length,parse_median_ms:parse,stages,identity:{routes:source.routes.length,beings:source.crawlers.length,encounters:source.encounters.length},scope:'Same full public generation; local CPU stages and byte sizes. First source frame is not browser first paint, remote-network latency or physical GPU performance.'},null,2));
