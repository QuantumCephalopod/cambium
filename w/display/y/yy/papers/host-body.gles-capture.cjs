'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {gl,commands}=require(process.argv[5]).createTransport(),modules=new Map(),N=require(process.argv[4]);
const ctx={console,performance,Float32Array,SSSInterlocutorModules:modules,SSSDisplayNavigation:N,SSSDisplayType:{rankPx:()=>12},SSSWorldView:{orientation:[1,0,0,0]},document:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'sierpinski.js'),'utf8'),ctx);
const projection=JSON.parse(fs.readFileSync(path.join(__dirname,'_feed/display-preview.json'))),shader=modules.get('organism:papers').shader;
const [width=390,height=844]=process.argv.slice(2).map(Number),span=1.65*Math.min(1,height/width),proj=new Float32Array([span,0,0,0,0,span*width/height,0,0,0,0,-.1,0,0,0,0,1]),identity=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
for(const ms of [0,12000]){gl.viewport(0,0,width,height);gl.depthMask(true);gl.clearColor(.004,.007,.009,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);shader.body.draw({gl,proj,view:identity,model:identity,projection,ms,rect:{width,height},dpr:1});commands.push({name:'readback',width,height,lens:{}})}
shader.body.release({gl});process.stdout.write(JSON.stringify({commands,cells:shader.body.cells({projection}).map(c=>({path:c.path,tet:c.tet})),source_ids:projection.population.map(x=>x.id)}));
