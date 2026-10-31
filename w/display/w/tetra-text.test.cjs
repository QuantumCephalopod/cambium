'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
// Neutral arithmetic/source witness. Actual SpriteSheet pixels have a separate GLES witness.
const drawing=()=>({setTransform(){},fillRect(){},save(){},restore(){},beginPath(){},rect(){},clip(){},fillText(){},measureText:s=>({width:s.length*8})});
global.OffscreenCanvas=class{constructor(w,h){this.width=w;this.height=h;this.context=drawing()}getContext(){return this.context}};
global.document={createElement:()=>new OffscreenCanvas(1,1)};
const Type={rankPx:()=>16,fontEpoch:()=>0,fold:s=>s.replace(/ß/g,'ss'),fillText:(c,...args)=>c.fillText(...args)},N=require('../z/navigation-physiology.js'),T=require('./tetra-text.js');
(async()=>{
 const pretext=await import(pathToFileURL(path.join(__dirname,'pretext/layout.js')));
 const blocks=[{tag:'h1',text:'An arbitrary authored source',links:[]},{tag:'p',text:'Ümlaut, sharp ß and a long continuous source. '.repeat(250),links:[]},{tag:'h2',text:'Final section',links:[]},{tag:'p',text:'The complete final sentence remains reachable.',links:[]}],m=T.create({blocks,pretext,vertices:N.V0,type:Type});
 for(const width of [244,326,640]){assert(m.layout({size:width+32,region:{x:16,y:16,w:width,h:300},dpr:1}));const compact=s=>Type.fold(s).replace(/\s/g,'');assert.equal(compact(m.lines.map(l=>l.text).join('')),compact(blocks.map(b=>b.text).join('')));assert.equal(m.sections.length,2);assert(m.lines.length>50);assert.equal(m.scroll(Infinity),m.maxScroll);assert.equal(m.scroll(1e20),m.maxScroll);assert(m.lines.at(-1).text.includes('reachable.'));m.scroll(0)}
 const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],args={proj:identity,view:identity,model:identity,rect:{width:400,height:400}},p=T.project(N.V0,args),a=1/Math.sqrt(3);
 assert(Math.abs(p[0].x-(1+a)*200)<1e-5);assert(Math.abs(p[0].y-(1-a)*200)<1e-5);assert.equal(T.hull(p).length,4);
 const region=T.freeRectangle({x:0,y:0,w:100,h:100},[{x:75,y:50,w:25,h:50}]);assert.deepEqual(region,{x:0,y:0,w:75,h:100});
 const {gl,commands}=require('./gles-transport.cjs').createTransport();args.gl=gl;gl.enable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.activeTexture(gl.TEXTURE0+1);
 const before=[gl.getParameter(gl.ACTIVE_TEXTURE),gl.isEnabled(gl.BLEND),gl.isEnabled(gl.DEPTH_TEST),gl.getParameter(gl.DEPTH_WRITEMASK)];
 m.draw(args);const version=m.version;for(let i=0;i<30;i++)m.draw(args);assert.equal(m.version,version);assert.equal(commands.filter(c=>c.name==='texImage2D').length,1,'idle frames reuse one bounded raster/upload');assert.equal(commands.filter(c=>c.name==='createProgram').length,1);
 assert.deepEqual([gl.getParameter(gl.ACTIVE_TEXTURE),gl.isEnabled(gl.BLEND),gl.isEnabled(gl.DEPTH_TEST),gl.getParameter(gl.DEPTH_WRITEMASK)],before,'borrowed context state restored');
 m.scroll(100);m.draw(args);assert.equal(commands.filter(c=>c.name==='texImage2D').length,2);assert.equal(commands.filter(c=>c.name==='drawArrays').at(-1).args[2],6,'canonical tetrahedron strip retains all four faces');
 m.release();for(const name of ['deleteTexture','deleteVertexArray','deleteProgram'])assert.equal(commands.filter(c=>c.name===name).length,1);
 console.log('PASS — arbitrary complete source, continuous/end/section layout, canonical projection, obstacle geometry, idle reuse, context restoration and retirement');
})().catch(e=>{console.error(e);process.exitCode=1});
