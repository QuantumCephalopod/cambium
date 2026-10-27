'use strict';
const assert=require('assert/strict'),fs=require('fs'),vm=require('vm');
const source=fs.readFileSync(require.resolve('./feed-acquisition.js'),'utf8');
(async()=>{
 const progress=[],value={root:{noun:'unchanged'},items:[1,'ä',null]},scope={URL,fetch:async()=>({ok:true,text:async()=>JSON.stringify(value)})};
 vm.runInNewContext(source,scope);assert.deepEqual(JSON.parse(JSON.stringify(await scope.SSSFeedAcquisition.acquire('https://owner.test/feed',{onProgress:p=>progress.push(p)}))),value);assert.deepEqual(progress,[.1,.45,.55]);
 scope.fetch=async()=>({ok:false,status:503});await assert.rejects(scope.SSSFeedAcquisition.acquire('x'),/HTTP 503/);
 scope.fetch=async()=>({ok:true,text:async()=>'{broken'});await assert.rejects(scope.SSSFeedAcquisition.acquire('x'),/JSON|Unexpected|property/i);
 let worker,terminated=0,url;
 class Worker{constructor(src){url=src;worker=this}postMessage(message){this.message=message}terminate(){terminated++}}
 const host={Worker,document:{currentScript:{src:'https://owner.test/assets/hash/feed-acquisition.js'}}};vm.runInNewContext(source,host);
 const run=host.SSSFeedAcquisition.acquire('https://owner.test/feed',{onProgress:p=>progress.push(p)});assert.equal(url,host.document.currentScript.src);assert.equal(worker.message.url,'https://owner.test/feed');worker.onmessage({data:{progress:.45}});worker.onmessage({data:{nodes:[{id:0,parent:null,kind:'object'},{id:1,parent:0,key:'root',kind:'object'},{id:2,parent:1,key:'noun',kind:'value',value:'unchanged'},{id:1,kind:'end'},{id:3,parent:0,key:'items',kind:'array'},{id:4,parent:3,key:0,kind:'value',value:1},{id:5,parent:3,key:1,kind:'value',value:'ä'},{id:6,parent:3,key:2,kind:'value',value:null},{id:3,kind:'end'},{id:0,kind:'end'}]}});assert.equal(worker.message.ack,true);worker.onmessage({data:{complete:true}});assert.deepEqual(JSON.parse(JSON.stringify(await run)),value);assert.equal(terminated,1);
 const failed=host.SSSFeedAcquisition.acquire('x');worker.onmessage({data:{error:'offline'}});await assert.rejects(failed,/offline/);assert.equal(terminated,2);
 const workerMessages=[],workerScope={URL,importScripts(){},location:{origin:'https://owner.test'},postMessage:m=>{workerMessages.push(m);if(m.nodes)queueMicrotask(()=>workerScope.onmessage({data:{ack:true}}))},fetch:async()=>({ok:true,text:async()=>JSON.stringify(value)})};vm.runInNewContext(source,workerScope);
 await workerScope.onmessage({data:{url:'https://owner.test/feed'}});assert.deepEqual(workerMessages.filter(m=>'progress'in m).map(m=>m.progress),[.1,.45,.55]);assert.equal(workerMessages.at(-1).complete,true);assert(workerMessages.filter(m=>m.nodes).every(m=>m.nodes.length<=256));
 await workerScope.onmessage({data:{url:'https://other.test/feed'}});assert.match(workerMessages.at(-1).error,/origin refused/);
 console.log('feed worker/source equality, honest milestones, origin refusal, lifecycle, HTTP/parse failure and unavailable-worker transport PASS');
})().catch(e=>{console.error(e);process.exitCode=1});

(async()=>{
 // Real production sender and receiver, with structured-clone boundaries and
 // acknowledgement backpressure. Keys are data, including __proto__.
 const value=JSON.parse('{"__proto__":{"owned":true},"negative":-0,"rows":[]}');
 value.rows=Array.from({length:800},(_,i)=>({id:i,text:'ä 🐙 '+i,children:[null,true,{n:i/3}]}));
 let inFlight=0,maxFlight=0,maxRecords=0,terminated=0;
 class Worker{
  constructor(){const that=this;this.scope={URL,importScripts(){},location:{origin:'https://owner.test'},fetch:async()=>({ok:true,text:async()=>JSON.stringify(value)}),postMessage(m){if(m.nodes){inFlight++;maxFlight=Math.max(maxFlight,inFlight);maxRecords=Math.max(maxRecords,m.nodes.length)}queueMicrotask(()=>that.onmessage?.({data:structuredClone(m)}))}};vm.runInNewContext(source,this.scope)}
  postMessage(m){if(m.ack)inFlight--;queueMicrotask(()=>this.scope.onmessage({data:structuredClone(m)}))}
  terminate(){terminated++}
 }
 const scope={URL,Worker,document:{currentScript:{src:'https://owner.test/assets/feed-acquisition.js'}}};vm.runInNewContext(source,scope);
 const result=await scope.SSSFeedAcquisition.acquire('https://owner.test/feed');assert.equal(JSON.stringify(result),JSON.stringify(value));assert.equal(Object.getPrototypeOf(result).owned,undefined);assert.equal(result.__proto__.owned,true);assert.equal(maxFlight,1);assert(maxRecords<=64);assert.equal(inFlight,0);assert.equal(terminated,1);
 console.log('actual batched sender/receiver: complete nested source, ordered arrays, literal keys and one in-flight batch PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
