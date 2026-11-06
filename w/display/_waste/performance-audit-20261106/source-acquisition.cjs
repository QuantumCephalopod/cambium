'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),{performance}=require('perf_hooks');
const root=path.resolve(process.argv[2]||process.cwd()),artifact=path.resolve(process.argv[3]||path.join(root,'_site'));
const output=path.resolve(process.argv[4]||'/tmp/perf-acquisition-metrics.json');
const html=fs.readFileSync(artifact+'/index.html','utf8');
const feedMap=JSON.parse(html.match(/<script id="site-feed-locations" type="application\/json">(.*?)<\/script>/s)[1]);
const source=fs.readFileSync(path.join(artifact,feedMap['organism:crawlerbait']),'utf8');
const metrics={sourceBytes:Buffer.byteLength(source),node:process.version};
const parsedTimes=[];let projection;
for(let i=0;i<5;i++){global.gc?.();let t=performance.now();projection=JSON.parse(source);parsedTimes.push(performance.now()-t)}
metrics.parseMs=parsedTimes;metrics.population={routes:projection.routes.length,crawlers:projection.crawlers.length,encounters:projection.encounters.length};
globalThis.SSSDisplayNavigation=require(root+'/w/display/z/zw/navigation-physiology.js');
globalThis.SSSRecursiveFold=require(root+'/w/display/x/recursive-fold.js');
globalThis.SSSInterlocutorModules=new Map();
const oldF=global.Float32Array,allocations=[];
global.Float32Array=new Proxy(oldF,{construct(t,args){const a=new t(...args);allocations.push(a.byteLength);return a}});
let t=performance.now();require(root+'/w/display/y/yw/crawlerbait/z/render.js');metrics.moduleEvaluationMs=performance.now()-t;global.Float32Array=oldF;metrics.moduleFloat32Allocations=allocations;
const mod=SSSInterlocutorModules.get('organism:crawlerbait');
(async()=>{
 const slices=[];let last=performance.now(),yieldCount=0;
 const before=process.memoryUsage();t=performance.now();
 await mod.prepareFieldProjection(projection,{yieldControl:async()=>{const now=performance.now();slices.push(now-last);yieldCount++;await new Promise(r=>setImmediate(r));last=performance.now()}});
 slices.push(performance.now()-last);metrics.preparation={elapsedMs:performance.now()-t,yieldCount,maxSliceMs:Math.max(...slices),sortedSlicesMs:slices.sort((a,b)=>b-a).slice(0,10),heapDelta:process.memoryUsage().heapUsed-before.heapUsed};
 t=performance.now();const field=mod.fieldProjection(projection);metrics.installMs=performance.now()-t;metrics.initialPoints=field.points.length;
 t=performance.now();await mod.prepareFieldProjection(projection);metrics.sameGenerationPreparationMs=performance.now()-t;
 const workerSource=fs.readFileSync(root+'/w/display/x/feed-acquisition.js','utf8');
 let batches=0,records=0,maxRecords=0,cloneMs=0,maxClone=0,receiverMs=0,maxReceiver=0,terminated=0,inFlight=0,maxFlight=0;
 class Worker {
  constructor(){const that=this;this.scope={URL,importScripts(){},location:{origin:'https://owner.test'},fetch:async()=>({ok:true,text:async()=>source}),postMessage(m){
   let a=performance.now();const clone=structuredClone(m),cost=performance.now()-a;cloneMs+=cost;maxClone=Math.max(maxClone,cost);
   if(m.nodes){batches++;records+=m.nodes.length;maxRecords=Math.max(maxRecords,m.nodes.length);maxFlight=Math.max(maxFlight,++inFlight)}
   queueMicrotask(()=>{const a=performance.now();that.onmessage?.({data:clone});const cost=performance.now()-a;receiverMs+=cost;maxReceiver=Math.max(maxReceiver,cost)});
  }};vm.runInNewContext(workerSource,this.scope)}
  postMessage(m){if(m.ack)inFlight--;queueMicrotask(()=>this.scope.onmessage({data:m}))}
  terminate(){terminated++}
 }
 const host={URL,Worker,document:{currentScript:{src:'https://owner.test/feed-acquisition.js'}}};vm.runInNewContext(workerSource,host);
 t=performance.now();const restored=await host.SSSFeedAcquisition.acquire('https://owner.test/feed');const total=performance.now()-t;
 if(JSON.stringify(restored)!==JSON.stringify(projection))throw Error('source transport differs');
 metrics.transport={harness:'production sender/receiver through Node structuredClone and microtask ACK; excludes network/real Worker scheduling',elapsedMs:total,batches,records,maxRecords,cloneMs,maxCloneMs:maxClone,receiverMs,maxReceiverMs:maxReceiver,maxFlight,terminated};
 fs.writeFileSync(output,JSON.stringify(metrics,null,2)+'\n');console.log(JSON.stringify(metrics,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
