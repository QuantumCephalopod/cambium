'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),Module=require('node:module');
// Witnessed against d84196fe4486ee1db5b84687ce3416409ee98984; re-run only with that base or unchanged renderer/fixture sources.
// Usage: node cambium-render-perf-probe.cjs [repository-root]
const repo=process.argv[2]||'/tmp/cambium-perf-20261106';
const dir=path.resolve(repo,'w/display/w/wy'),req=Module.createRequire(path.join(dir,'locus-shader.test.cjs'));
let src=fs.readFileSync(path.join(dir,'locus-shader.test.cjs'),'utf8').split('\nfunction assertClears')[0];
src=src.replace('devicePixelRatio:1,','devicePixelRatio:1.5,').replace('  const canvas=element();',`
  const probe={allocations:[],calls:{},deletes:0};
  for(const [key,old] of Object.entries(gl))if(typeof old==='function')gl[key]=function(...args){probe.calls[key]=(probe.calls[key]||0)+1;if(key.startsWith('delete'))probe.deletes++;if(key==='texStorage2D')probe.allocations.push({kind:'texture',format:args[2],width:args[3],height:args[4],samples:1});if(key==='renderbufferStorage')probe.allocations.push({kind:'renderbuffer',format:args[1],width:args[2],height:args[3],samples:1});if(key==='renderbufferStorageMultisample')probe.allocations.push({kind:'renderbuffer',format:args[2],width:args[3],height:args[4],samples:args[1]});return old.apply(this,args)};
  PROBES.push(probe);
  const canvas=element();`);
const probes=[];let results;
const context={require:req,__dirname:dir,process,console,PROBES:probes,REPORT:r=>{results=r}};
vm.runInNewContext(src+`
const cases=[];
for(const mode of ['dry','glass','preview','contact']){
const lens={x:640,y:400,hx:2000,hy:2000,mag:.12,round:1};if(mode==='contact')lens.lock={id:'known',kind:'body'};
const f=fixture({glass:mode!=='dry',preview:mode==='preview'||mode==='contact',lens:mode==='dry'||mode==='glass'?null:lens,foreground:mode==='contact'?()=>true:null});const p=PROBES.at(-1);
f.frame(0);f.frame(16);const alloc=p.allocations.map(a=>({...a,format:a.format===f.gl.RGBA8?'RGBA8':a.format===f.gl.DEPTH_COMPONENT24?'DEPTH24':'other'}));
p.calls={};for(let i=0;i<60;i++)f.frame(32+i*16);const activeCalls={...p.calls};p.calls={};f.host.hidden=true;const deleteBefore=p.deletes;for(let i=0;i<60;i++)f.frame(1100+i*16);cases.push({mode,buffer:[f.canvas.width,f.canvas.height],allocations:alloc,active60:activeCalls,hidden60:p.calls,hiddenDeletes:p.deletes-deleteBefore});
}
REPORT(cases);
`,context);
console.log(JSON.stringify({scope:'Actual production field under existing native transport; allocation and invocation counts, not GPU time or browser measurements',cases:results},null,2));
