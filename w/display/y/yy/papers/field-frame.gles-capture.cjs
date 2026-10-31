'use strict';
/* Execute Papers' production layer against a borrowed Display frame. Actual
 * population, Skia type and layout; command capture is replayed by software GLES. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{pathToFileURL}=require('node:url'),assert=require('node:assert/strict');
const {createCanvas,GlobalFonts}=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'@napi-rs/canvas'));
global.OffscreenCanvas=class{constructor(w,h){return createCanvas(w,h)}};
GlobalFonts.registerFromPath(path.join(__dirname,'../../../w/spritesheet/SpriteSheet-Mono.ttf'),'SpriteSheet Mono');
global.document={createElement:()=>createCanvas(1,1)};
const tissueTransport=require('../../../w/gles-transport.cjs').createTransport(),Tissue=require('../../../w/display-text-tissue.js');
const {gl,commands}=require('../../../w/gles-transport.cjs').createTransport(),N=require('../../../z/zw/navigation-physiology.js'),Type=require('../../../w/display-type.js'),W={orientation:[1,0,0,0]};
const [width=390,height=844]=process.argv.slice(2).map(Number),rect={left:0,top:0,width,height,right:width,bottom:height},textCanvas=createCanvas(width,height);textCanvas.dataset={};textCanvas.getBoundingClientRect=()=>rect;
const canvas={width,height,dataset:{},style:{},getBoundingClientRect:()=>rect,getContext:()=>gl},label={classList:{add(){},remove(){}},textContent:''};
const source=fs.readFileSync(process.env.PAPERS_SOURCE||path.join(__dirname,'sierpinski.js'),'utf8'),legacy=!source.includes('afterDraw:frame=>draw(frame.ms,frame)'),context={console,performance,Float32Array,Map,Set,Intl,devicePixelRatio:1,requestAnimationFrame:()=>0,document:{createElement:()=>createCanvas(1,1),querySelectorAll:()=>[]},SSSDisplayLens:{offer(){},withdraw(){}},SSSDisplayNavigation:N,SSSDisplayType:Type,SSSWorldView:W};
vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,`globalThis.api={shader,createRenderer,identityIndex,parentIndex,fieldProjection,buildRecords,openGlobal,descend,draw,paperLensReading,ensureBeing,perspective,lookAt,setState:s=>state=s,setPretext:p=>pretextModule=p,setLens:f=>lensAccess=f};})();`),context);const api=context.api;
const snapshot=JSON.parse(fs.readFileSync(path.join(__dirname,'public/papers-shadow/current.json'))).snapshot,projection=snapshot.projection,built=api.buildRecords(projection,api.fieldProjection(projection).root);
const state={mounted:true,host:{hidden:false,querySelectorAll:()=>[]},canvas,textCanvas,tissueCanvas:{dataset:{},getContext:()=>tissueTransport.gl},renderer:legacy?api.createRenderer?.(canvas):null,projection,structure:built.structure,identities:api.identityIndex(projection),parents:api.parentIndex(projection),records:built.records,recordById:new Map(built.records.map(r=>[r.id,r])),inquiryBodies:snapshot.inquiry.bodies,shadowApplied:true,wisdomPrepared:new Map(),pretextStatus:'ready',chamberPath:'',chamberFocus:{center:[0,0,0],scale:1},backgroundPassage:0,current:null,stack:[],label,hud:{},sourceInfo:null,physiology:null,transition:0,transitionStart:0,localQ:[1,0,0,0],tissue:Tissue.create({getContext:()=>tissueTransport.gl}),ui:{carrier:{x:0,y:60,w:width,h:height-60}}};
// Legacy baseline owns its canvas; the candidate borrows this same context.
if(legacy)state.renderer=api.createRenderer(canvas);
api.setState(state);api.setLens(()=>({x:width/2,y:height/2,r:96,round:1,held:false,docked:false}));
(async()=>{
 api.setPretext(await import(pathToFileURL(path.join(__dirname,'../../../w/pretext/layout.js')).href));
 const cases=[],samples=[];let now=1000;
 for(const pick of [null,'4H.vPbh','S.CTLJ']){
  state.current=null;state.stack=[];state.transition=0;state.backgroundPassage=0;state.being=null;
  if(pick){assert(api.openGlobal(pick,width,now));state.transition=1;state.transitionStart=now-900;state.backgroundPassage=1;state.backgroundPassageFrom=null;state.backgroundPassageTo=null;}
  const scale=pick?3.2/state.current.cameraTo:1;
  for(let f=0;f<8;f++){
   now+=33;gl.viewport(0,0,width,height);gl.depthMask(true);gl.clearColor(.003,.006,.006,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   const frame={gl,proj:api.perspective(Math.PI/3.3,width/height,.1,2000),view:api.lookAt([0,0,3.2],[0,0,0],[0,1,0]),ms:now,dpr:1,width,height,frame:{center:[0,0,0],scale},container:'',orientation:W.orientation};
   const begin=performance.now();if(legacy)api.draw(now);else api.shader.afterDraw(frame);const elapsed=performance.now()-begin;if(f>1)samples.push(elapsed);
   if(f===7){const whole=[...(state.lensParts?.values()||[])].find(p=>p.kind==='whole');if(whole){const reading=api.paperLensReading(whole),compact=s=>Type.fold(s).replace(/\s/g,'');assert.equal(compact(reading.lines.map(l=>l.text).join('')),compact(whole.text));}
    commands.push({name:'readback',width,height,lens:{}});tissueTransport.commands.push({name:'readback',width,height,lens:{}});cases.push({id:pick||'overview',population:state.records.length,rank:state.canvas.dataset.currentRank||null,scale,cam:Number(state.canvas.dataset.inquiryCameraZ),resolved:Number(state.canvas.dataset.populationResolved),parts:state.lensParts?.size||0,whole:[...(state.lensParts?.values()||[])].filter(p=>p.kind==='whole').length,tissue_letters:state.tissueLetters?.length||0});}
  }
 }
 samples.sort((a,b)=>a-b);process.stdout.write(JSON.stringify({commands,tissue_commands:tissueTransport.commands,cases,cpu_ms:{median:samples[Math.floor(samples.length/2)],p95:samples[Math.floor(samples.length*.95)]},legacy,scope:'actual production Papers body/text preparation on Node/Skia and software GLES transport; no browser or device FPS claim'}));
})().catch(e=>{console.error(e);process.exitCode=1});
