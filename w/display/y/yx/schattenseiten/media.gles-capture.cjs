'use strict';
/* Run the real consumer with the separately acquired, decoded declared bytes.
 * Only DOM/network/GL transport is supplied here; GLES executes the captured work. */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const [cache,mode='low',w='390',h='844']=process.argv.slice(2),manifest=JSON.parse(fs.readFileSync(path.join(cache,'manifest.json'))),byURL=new Map(manifest.records.map(r=>[r.url,r]));
const [handoff,navigation,transport]=process.argv.slice(6);
if(!handoff||!navigation||!transport)throw Error('pass shared handoff, navigation and GLES transport modules after cache/mode/width/height');
const RH=require(path.resolve(handoff)),N=require(path.resolve(navigation));
const projection=JSON.parse(fs.readFileSync(path.join(__dirname,'projection.json'))),requests=[],modules=new Map();
const {gl,commands:captured}=require(path.resolve(transport)).createTransport();
const commands=captured;

function node(tag){return{tag,children:[],append(...xs){this.children.push(...xs)},replaceChildren(...xs){this.children=xs},addEventListener(){}}}
let running=0,peak=0;const ctx={console,Map,Set,Math,Object,Array,Float32Array,URL,setTimeout:()=>0,clearTimeout(){},addEventListener(){},document:{createElement:node},SSSInterlocutorModules:modules,SSSRepresentationHandoff:RH,SSSDisplayNavigation:N,SSSWorldView:{language:'en'},fetch:async url=>{requests.push(url);running++;peak=Math.max(peak,running);const record=byURL.get(url);if(!record)throw Error('unadmitted media '+url);const fail=mode==='failed'&&record.tier===512&&record.source===projection.works[0].still;return{ok:!fail,status:fail?503:200,blob:async()=>{running--;return record}}},createImageBitmap:async(record,options)=>({width:options.resizeWidth,height:options.resizeHeight,dataFile:record.rgba,close(){}})};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'render.js'),'utf8'),ctx);const site=modules.get('organism:schattenseiten');site.fieldProjection(projection);
const flush=async()=>{for(let i=0;i<600;i++)await Promise.resolve()};
(async()=>{
 site.shader.preload();await flush();if(requests.length!==55||requests.some(u=>!u.includes('/64/')))throw Error('host acquired high/original');
 if(mode!=='low'){site.render({host:node('host'),content:node('content'),projection});await flush();}
 gl.viewport(0,0,+w,+h);gl.depthMask(true);gl.clearColor(.93,.925,.91,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 const span=1.65*Math.min(1,Number(h)/Number(w)),proj=new Float32Array([span,0,0,0,0,span*Number(w)/Number(h),0,0,0,0,-.1,0,0,0,0,1]),identity=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
 const args={gl,proj,view:identity,model:identity,ms:1000,rect:{left:0,top:0,width:+w,height:+h},dpr:1};
 if(mode==='low')site.shader.body.draw(args);else site.shader.afterDraw(args);
 commands.push({name:'readback',width:+w,height:+h,lens:{}});
 if(mode!=='low')site.unmount({host:node('host'),content:node('content')});site.shader.body.release({gl});
 process.stdout.write(JSON.stringify({commands,requests,peak,mode,sourceDimensions:manifest.records.map(r=>r.source_dimensions)}));
})().catch(e=>{console.error(e);process.exitCode=1});
