'use strict';
/* Native font/layout/graphics witness. Browser DOM transport is not simulated as
 * a browser: Skia measures the real face; pinned Pretext and production tissue run. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {createCanvas,GlobalFonts}=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'@napi-rs/canvas'));
assert(GlobalFonts.registerFromPath(path.join(__dirname,'../../../w/spritesheet/SpriteSheet-Mono.ttf'),'SpriteSheet Mono'));
global.OffscreenCanvas=class{constructor(w,h){return createCanvas(w,h)}};global.document={createElement:()=>createCanvas(1,1)};
const {gl,commands}=require('../../../w/gles-transport.cjs').createTransport(),Type=require('../../../w/display-type.js'),Tissue=require('../../../w/display-text-tissue.js'),N=require('../../../z/navigation-physiology.js');
const [width=390,height=844]=process.argv.slice(2).map(Number),box={left:0,top:0,width,height,right:width,bottom:height},canvas=createCanvas(width,height);canvas.dataset={};canvas.getBoundingClientRect=()=>box;
const projection=JSON.parse(fs.readFileSync(path.join(__dirname,'projection.json'))),bodies=Object.fromEntries(fs.readdirSync(path.join(__dirname,'inquiry')).filter(x=>x.endsWith('.json')).map(f=>[f.slice(0,-5),JSON.parse(fs.readFileSync(path.join(__dirname,'inquiry',f)))]));
const context={console,performance,Map,Set,Intl,Float32Array,document:{},SSSDisplayType:Type,SSSDisplayNavigation:N,SSSWorldView:{orientation:[1,0,0,0]},SSSInterlocutorModules:new Map()};
const source=fs.readFileSync(path.join(__dirname,'sierpinski.js'),'utf8').replace(/\}\)\(\);\s*$/,`globalThis.api={ensureBeing,identityIndex,parentIndex,paperLensParts,paperLensReading,paperLensPage,drawPaperLens,setState:s=>state=s,setPretext:p=>pretextModule=p};})();`);vm.runInNewContext(source,context);const api=context.api;
const paragraph={textContent:''},small={textContent:''},state={mounted:true,host:{hidden:false,getBoundingClientRect:()=>box},transition:1,ui:{carrier:{x:0,y:60,w:width,h:height-60}},textCanvas:canvas,wisdomPrepared:new Map(),inquiryBodies:bodies,identities:api.identityIndex(projection),parents:api.parentIndex(projection),renderer:{V0:N.V0},lensReader:{dataset:{},querySelector:k=>k==='p'?paragraph:small},tissueLetters:[]};api.setState(state);
const tissue=Tissue.create({getContext:()=>gl}),audits=[],frames=[],kinds=new Set();
(async()=>{
 api.setPretext(await import(pathToFileURL(path.join(__dirname,'../../../w/pretext/layout.js')).href));
 for(const [id,body]of Object.entries(bodies)){
  state.current={id};const entity={id,kind:'holon'},B=api.ensureBeing(entity,width),G={P:[{x:width*.2,y:height*.3},{x:width*.8,y:height*.3},{x:width*.5,y:height*.7},{x:width*.5,y:height*.5}],front:Object.fromEntries(B.faces.map(f=>[f.key,true])),mets:(body.metabolites||[]).map(m=>({id:m.id,x:width/2,y:height/2,light:{metabolite:m}}))};
  for(const part of api.paperLensParts(B,G).values()){
   state.lensReading=null;const r=api.paperLensReading(part);assert(r.ready);const delivered=[];
   for(let page=0;page<r.pages;page++){delivered.push(...r.lines.slice(page*r.rows,(page+1)*r.rows).map(l=>l.text));api.paperLensPage(1)}
   const compact=s=>Type.fold(s).replace(/\s/g,'');assert.equal(compact(delivered.join('')),compact(part.text));assert(r.frame.left>=0&&r.frame.top>=60&&r.frame.left+r.width<=width+.01&&r.frame.top+r.height<=height+.01);
   audits.push({id:part.id,kind:part.kind,characters:part.text.length,pages:r.pages});
   if(kinds.has(part.kind))continue;kinds.add(part.kind);
   for(const page of new Set([0,r.pages-1])){
    api.paperLensPage(-Infinity);api.paperLensPage(page);state.tissueLetters=[];
    const L={x:r.frame.left+r.width/2,y:r.frame.top+r.height/2,hx:r.width/2,hy:r.height/2,round:0,corner:r.pad,r:Math.min(r.width,r.height)/2};api.drawPaperLens(canvas.getContext('2d'),L,part,box,1);
    assert.equal(paragraph.textContent,part.text);assert(state.tissueLetters.length);assert(state.tissueLetters.every(g=>g.fat===0));
    tissue.draw(state.tissueLetters,{width,height,dpr:1,tissue:0,ink:[.87,.95,.92]});commands.push({name:'readback',width,height,lens:{}});frames.push({kind:part.kind,page:page+1,letters:state.tissueLetters.length,frame:r.frame});
   }
  }
 }
 process.stdout.write(JSON.stringify({commands,audits,frames,source_bodies:Object.keys(bodies),measurement:'Skia with actual SpriteSheet Mono TTF + pinned Pretext'}));
})().catch(e=>{console.error(e);process.exitCode=1});
