'use strict';
/* Actual SpriteSheet + pinned Pretext + production tetrahedral material. */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),{createCanvas,GlobalFonts}=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'@napi-rs/canvas'));
assert(GlobalFonts.registerFromPath(path.join(__dirname,'spritesheet/SpriteSheet-Mono.ttf'),'SpriteSheet Mono'));
global.document={createElement:()=>createCanvas(1,1)};global.OffscreenCanvas=class{constructor(w,h){return createCanvas(w,h)}};global.SSSDisplayNavigation=require('../z/navigation-physiology.js');global.SSSDisplayType=require('./display-type.js');const T=require('./tetra-text.js'),[width=390,height=844]=process.argv.slice(2).map(Number),directory=fs.mkdtempSync(path.join(os.tmpdir(),'tetra-text-pixels-'));
const transport=require('./gles-transport.cjs').createTransport(),{commands}=transport;let uploads=0;
const gl=new Proxy(transport.gl,{get(t,key){if(key==='texImage2D')return(...args)=>{const c=args[5],file=path.join(directory,(uploads++)+'.rgba');fs.writeFileSync(file,c.getContext('2d').getImageData(0,0,c.width,c.height).data);return t.texImage2D(...args.slice(0,5),{width:c.width,height:c.height,dataFile:file})};return t[key]}});
(async()=>{
 const pretext=await import(pathToFileURL(path.join(__dirname,'pretext/layout.js'))),blocks=[{tag:'h1',text:'Authored text on the actual tetrahedron',links:[]},{tag:'p',text:'Philipp Remy Bartholomäus — Ä Ö Ü ä ö ü. '.repeat(25),links:[]},{tag:'h2',text:'The last section',links:[]},{tag:'p',text:'Every original word reaches the final line.',links:[]}],m=T.create({blocks,pretext});
 const size=Math.min(width,height)-32,region={x:16,y:16,w:size-32,h:size-32};m.layout({size,region,dpr:1});assert.equal(m.lines.map(l=>l.text).join('').replace(/\s/g,''),SSSDisplayType.fold(blocks.map(b=>b.text).join('')).replace(/\s/g,''));
 const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],extent=1/Math.sqrt(3),proj=[size/(width*extent),0,0,0,0,size/(height*extent),0,0,0,0,-.5,0,0,0,0,1],canvas=createCanvas(width,height),cases=[];
 for(const [label,offset,model]of [['start',0,identity],['idle',0,identity],['turned',0,[.8,.15,-.58,0,.1,.92,.38,0,.59,-.36,.72,0,0,0,0,1]],['end',1e20,identity]]){
  m.scroll(offset);gl.viewport(0,0,width,height);gl.depthMask(true);gl.clearColor(.012,.018,.015,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);const args={gl,proj,view:identity,model,rect:{width,height},dpr:1},points=m.draw(args);commands.push({name:'readback',width,height,lens:{}});
  const c=canvas.getContext('2d');c.clearRect(0,0,width,height);m.draw({...args,gl:null,context2D:c});const file=path.join(directory,label+'.png');fs.writeFileSync(file,canvas.toBuffer('image/png'));cases.push({label,points,canvas2d:file,offset:m.offset});
 }
 assert.equal(uploads,2,'idle/rotation reuse text upload; end changes it once');m.release();assert.equal(commands.filter(c=>c.name==='deleteProgram').length,1);process.stdout.write(JSON.stringify({commands,cases,texture_size:[size,size],uploads,pixel_directory:directory}));
})().catch(e=>{console.error(e);process.exitCode=1});
