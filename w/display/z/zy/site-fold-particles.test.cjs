'use strict';
const assert=require('assert/strict'),fs=require('fs'),vm=require('vm');
const P=require('./site-fold-particles.js'),G=require('../../w/goo-material.js');
assert.equal(P.MESH.length,36);assert.equal(new Set(Array.from({length:12},(_,i)=>Array.from(P.MESH.subarray(i*3,i*3+3)).join(','))).size,4);
for(const [w,h]of [[320,640],[1280,800],[3840,2160]]){const a=P.layout(w,h,{x:w*.37,y:h*.42}),b=P.layout(w,h,{x:w*.37,y:h*.42});assert(a.count<=2048);assert.deepEqual(a.data,b.data);assert.equal(new Set(Array.from({length:a.count},(_,i)=>a.data[i*6+4])).size,4);assert.equal(a.data.length,a.count*6);}
for(let i=0;i<=100;i++){assert(P.ease(i/100)>=0&&P.ease(i/100)<=1);if(i)assert(P.ease(i/100)>=P.ease((i-1)/100));}assert(Math.abs(P.ease(.5)-.5)<.001);
(async()=>{
 let time=0;const queue=[],canvas={setAttribute(){},getContext:()=>null,addEventListener(){},remove(){this.removed=true}},style={setProperty(k,v){this[k]=v}},layer={dataset:{},style,appendChild(){},ownerDocument:{createElement:()=>canvas}};
 const context={SSSGooMaterial:G,performance:{now:()=>time},requestAnimationFrame:f=>{queue.push(f);return queue.length},cancelAnimationFrame(){},Float32Array};vm.runInNewContext(fs.readFileSync(require.resolve('./site-fold-particles.js'),'utf8'),context);
 const e=context.SSSSiteFoldParticles.create(layer);e.prepare(400,700,{x:200,y:350});assert.equal(queue.length,0,'idle renderer scheduled frames');assert.equal(layer.dataset.particleBackend,'opacity-fallback');const run=e.animate(1,1650);assert.equal(queue.length,1);time=825;queue.shift()(time);assert.equal(queue.length,1);time=1650;queue.shift()(time);await run;assert.equal(queue.length,0);assert.equal(style['--fold-fallback-alpha'],'1');e.dispose();assert(canvas.removed);
 console.log('tetra particle geometry, deterministic tracks, timing, bounded fallback and idle lifetime PASS');
})().catch(e=>{console.error(e);process.exitCode=1});

(async()=>{
 let time=0,nextId=0;const queue=new Map(),canvas={setAttribute(){},getContext:()=>null,addEventListener(){},remove(){}},style={setProperty(k,v){this[k]=v}},layer={dataset:{},style,appendChild(){},ownerDocument:{createElement:()=>canvas}};
 const context={SSSGooMaterial:G,performance:{now:()=>time},requestAnimationFrame:f=>{queue.set(++nextId,f);return nextId},cancelAnimationFrame:id=>queue.delete(id),Float32Array};vm.runInNewContext(fs.readFileSync(require.resolve('./site-fold-particles.js'),'utf8'),context);
 const e=context.SSSSiteFoldParticles.create(layer);e.prepare(400,700,{x:200,y:350});let work={progress:.45,done:false};
 const fill=e.fill(()=>work,1650);let previous=0;
 const frame=()=>{time+=16;const jobs=[...queue.values()];queue.clear();for(const fn of jobs)fn(time)};
 for(let i=0;i<180;i++){frame();assert(e.progress>=previous);previous=e.progress;assert(e.progress<=.62)}
 const held=e.progress;assert(held>.2&&held<.3);assert(queue.size,'waiting liquid stopped rendering');
 work={progress:1,done:false};for(let i=0;i<60;i++)frame();assert(e.progress<=.62,'complete download alone sealed the cover');
 work={progress:1,done:true};for(let i=0;i<120&&queue.size;i++)frame();assert.equal(await fill,true);assert.equal(e.progress,1);assert.equal(queue.size,0);
 e.paint(0);work={progress:1,done:true};const warm=e.fill(()=>work,1650),start=time;while(time-start<1648)frame();assert(e.progress<1,'warm receiver bypassed minimum close duration');while(queue.size)frame();assert.equal(await warm,true);assert(time-start>=1650&&time-start<=1680);
 e.paint(0);work={progress:.3,done:false};const cancel=e.fill(()=>work,1650);frame();work.cancelled=true;frame();assert.equal(await cancel,false);assert.equal(queue.size,0);
 const failed=e.fill(()=>({error:Error('refused')}),1650);frame();await assert.rejects(failed,/refused/);assert.equal(queue.size,0);
 const stopped=e.fill(()=>({progress:.1}),1650);e.stop();assert.equal(await stopped,false);assert.equal(queue.size,0);e.dispose();
 console.log('progress follows completed work, moving hold/gap, minimum warm duration, ready closure, cancel/failure and stopped RAF PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
