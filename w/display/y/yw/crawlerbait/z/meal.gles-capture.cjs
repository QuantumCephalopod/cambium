'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {createCanvas,GlobalFonts}=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'@napi-rs/canvas'));
const display=path.resolve(__dirname,'../../../..');assert(GlobalFonts.registerFromPath(path.join(display,'w/spritesheet/SpriteSheet-Mono.ttf'),'SpriteSheet Mono'));
global.OffscreenCanvas=class{constructor(w,h){return createCanvas(w,h)}};global.document={createElement:()=>createCanvas(1,1)};
const Type=require(path.join(display,'w/display-type.js')),{gl,commands}=require(path.join(display,'w/gles-transport.cjs')).createTransport();gl.canvas={dataset:{}};
const [width=390,height=844]=process.argv.slice(2).map(Number),canvas=createCanvas(width,height);Object.assign(canvas,{dataset:{},style:{},getBoundingClientRect:()=>({left:0,top:0,width,height,right:width,bottom:height})});
const offers=new Map();let lens=null;const context={console,performance,Map,Set,Intl,Float32Array,document:{},SSSDisplayType:Type,SSSDisplayLens:{snapshot:()=>lens?{lens}:null,offer:(id,target)=>offers.set(id,target),withdraw:id=>offers.delete(id)},SSSInterlocutorModules:new Map()};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'render.js'),'utf8').replace(/\}\)\(\);\s*$/,`globalThis.api={INK,SIM,buildLife,resetTo,updateInk,afterDraw,textPages,triangleRows,STORY,beingText,setProjection:p=>{lastProjection=p;crawlerById=new Map(p.crawlers.map(c=>[c.id,c]))}};})();`),context);
const A=context.api,projection=JSON.parse(fs.readFileSync(path.join(__dirname,'projection.json'))),I=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),P=new Float32Array([1,0,0,0,0,width/height,0,0,0,0,1,0,0,0,0,1]);
(async()=>{
 A.setProjection(projection);A.SIM.life=A.buildLife(projection);A.resetTo(A.SIM.life.seconds*.3);A.INK.canvas=canvas;A.INK.ui={carrier:{x:0,y:60,w:width,h:height-60}};A.INK.pretext=await import(pathToFileURL(path.join(display,'w/pretext/layout.js')).href);
 const audits=[];for(const text of [...A.STORY,'Harvester 1234. Being 0123456789abcdef01234567. Body genome '+ 'abcd'.repeat(16)+'. 12 encounters, 3 baits, 2 days at this replay time.']){
  const rows=A.triangleRows([{x:24,y:70},{x:width-24,y:70},{x:width/2,y:height-90}],16);const pages=A.textPages(text,'400 12px "SpriteSheet Mono", monospace',rows);assert(pages.length);const compact=s=>Type.fold(s).replace(/\s/g,'');assert.equal(compact(pages.flat().map(x=>x.text).join('')),compact(text));audits.push({characters:text.length,pages:pages.length});
 }
 // Execute the actual simulation and all actual goo/ink shaders, not substitutes.
 for(let i=0;i<35;i++)A.afterDraw({gl:i<33?null:gl,canvas:gl.canvas,proj:P,view:I,model:I,ms:1000+i*16,width,height,dpr:1,frame:{scale:1},container:''});
 commands.push({name:'readback',width,height,lens:{}});
 // Contact is the actual per-being offer contract. Text frame stays in safe carrier.
 if(!offers.size){const o=[...A.SIM.alive][0];o.cell='';o.fine=1;o.fade=1;A.updateInk(()=>({x:width/2,y:height/2,front:true}),2000,width,height,1,gl.canvas)}
 assert(offers.size);const [id,target]=offers.entries().next().value,f=target.frame();assert(f&&f.left>=0&&f.top>=60&&f.left+f.width<=width&&f.top+f.height<=height);
 lens={lock:{id,kind:'body'},round:0,x:f.left+f.width/2,y:f.top+f.height/2,hx:f.width/2,hy:f.height/2};A.updateInk(()=>({x:width/2,y:height/2,front:true}),2100,width,height,1,gl.canvas);assert.equal(canvas.dataset.lensBeing,id.slice(18));
 const rgba=canvas.getContext('2d').getImageData(0,0,width,height).data;let ink=0;for(let i=3;i<rgba.length;i+=4)if(rgba[i]>0)ink++;assert(ink>100);
 process.stdout.write(JSON.stringify({commands,dataset:gl.canvas.dataset,audits,lens:{safe:true,inkPixels:ink,target:id},scope:'Actual public projection, pinned Pretext and SpriteSheet font; software GL transport replay required separately.'}));
})().catch(e=>{console.error(e);process.exitCode=1});
