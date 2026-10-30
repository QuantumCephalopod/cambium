'use strict';
/* Capture the actual field's existing regression transport. The companion EGL
 * witness replays its GL commands on Mesa; it does not automate a browser. */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const enums={VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,ARRAY_BUFFER:34962,FLOAT:5126,DYNAMIC_DRAW:35048,STATIC_DRAW:35044,TRIANGLES:4,LINES:1,POINTS:0,COLOR_BUFFER_BIT:16384,DEPTH_BUFFER_BIT:256,BLEND:3042,DEPTH_TEST:2929,SCISSOR_TEST:3089,SRC_ALPHA:770,ONE_MINUS_SRC_ALPHA:771,ONE:1,FRAMEBUFFER:36160,READ_FRAMEBUFFER:36008,DRAW_FRAMEBUFFER:36009,RENDERBUFFER:36161,COLOR_ATTACHMENT0:36064,DEPTH_ATTACHMENT:36096,RGBA8:32856,DEPTH_COMPONENT24:33190,FRAMEBUFFER_COMPLETE:36053,TEXTURE_2D:3553,TEXTURE0:33984,TEXTURE_BINDING_2D:32873,ACTIVE_TEXTURE:34016,MAX_SAMPLES:36183,TEXTURE_MIN_FILTER:10241,TEXTURE_MAG_FILTER:10240,TEXTURE_WRAP_S:10242,TEXTURE_WRAP_T:10243,LINEAR:9729,CLAMP_TO_EDGE:33071,NEAREST:9728,RGBA:6408,UNSIGNED_BYTE:5121,UNPACK_FLIP_Y_WEBGL:37440,UNPACK_PREMULTIPLY_ALPHA_WEBGL:37441,TEXTURE1:33985,FRAMEBUFFER_BINDING:36006,RENDERBUFFER_BINDING:36007};
const transport=fs.readFileSync(path.join(__dirname,'locus-shader.test.cjs'),'utf8').split('\nfunction assertClears')[0];
const inject=`
  Object.assign(gl,ENUMS);
  function capturedValue(value){
    if(value==null||typeof value!=='object')return value;
    if(ArrayBuffer.isView(value)||Array.isArray(value))return {array:Array.from(value),type:value.constructor.name};
    if(value.program&&value.name)return {uniform:value.name,program:value.program.id};
    if(value.kind&&value.id)return {object:value.id,kind:value.kind};
    if(Number.isFinite(value.width)&&Number.isFinite(value.height))return {image:{width:value.width,height:value.height,path:value.dataFile}};
    return value;
  }
  for(const name of new Set([...Object.keys(gl),'bindFramebuffer'])){
    const original=gl[name];if(typeof original!=='function')continue;
    const wrapped=function(...args){const result=original.apply(gl,args);COMMANDS.push({name,args:args.map(capturedValue),result:capturedValue(result)});return result};
    if(name==='bindFramebuffer')Object.getPrototypeOf(gl)[name]=wrapped;else gl[name]=wrapped;
  }
  gl.activeTexture(gl.TEXTURE0);
`;
const source=transport.replace('  const canvas=element();',inject+'\n  const canvas=element();').replace('if(composite)shader.composite=()=>[{width:16,height:16}];','if(composite)shader.composite=()=>[{width:WIDTH,height:HEIGHT,dataFile:GLYPH_IMAGE}];');
const sites=require('./site-witness.cjs').discoverSites(),overview=sites.get('organism:philosophy');
const ownModules=new Map();vm.runInNewContext(fs.readFileSync(overview.file('renderer'),'utf8'),{SSSInterlocutorModules:ownModules,addEventListener(){}});
const [width,height,preview,magnification=.12]=process.argv.slice(2).map(Number),commands=[];
const context={require,__dirname,SITE_WITNESSES:sites,process:{env:{LOCUS_SOURCE:process.env.LOCUS_SOURCE}},console:{log(){},warn(){}},ENUMS:enums,COMMANDS:commands,WIDTH:width,HEIGHT:height,PREVIEW:preview,MAGNIFICATION:magnification,GLYPH_IMAGE:process.env.GLYPH_IMAGE,FOREGROUND_IMAGE:process.env.FOREGROUND_IMAGE,GLYPH_FRAME:process.env.GLYPH_FRAME?JSON.parse(process.env.GLYPH_FRAME):null,READ_SURFACE:process.env.READ_SURFACE?JSON.parse(process.env.READ_SURFACE):null,READ_LOCK:process.env.READ_LOCK||'',READ_REFERENCE:process.env.READ_REFERENCE==='1',COALESCENCE:process.env.COALESCENCE||'',RETURN_PROTECTION:process.env.RETURN_PROTECTION===undefined?null:Number(process.env.RETURN_PROTECTION),PHILOSOPHY_PLAIN:ownModules.get('organism:philosophy').shader.bodyPlaceholder,PHILOSOPHY_SHADER:ownModules.get('organism:philosophy').shader,PHILOSOPHY_PALETTE:overview.manifest.shader.palette,SPECIMEN:process.env.SPECIMEN||'',NATIVE_REFERENCE:process.env.NATIVE_REFERENCE==='1',REVEAL_SURFACE:process.env.REVEAL_SURFACE||'',REVEAL_READY:process.env.REVEAL_READY==='1',REVEAL_OFFSET:Number(process.env.REVEAL_OFFSET||0)};
vm.runInNewContext(source+`
const sample=(name)=>\`#version 300 es
precision highp float;out vec4 outColor;
void main(){vec2 p=floor(gl_FragCoord.xy/12.);float v=mod(p.x+p.y,2.);outColor=vec4(v,.15,.8-v*.5,1.);}\`;
const lens={x:WIDTH/2,y:HEIGHT/2,r:80,hx:80,hy:80,ax:0,ay:0,smooth:16,round:1,mag:MAGNIFICATION,held:false,docked:false};
if(GLYPH_FRAME){const r=GLYPH_FRAME;Object.assign(lens,{x:r.left+r.width/2,y:r.top+r.height/2,hx:r.width/2,hy:r.height/2,r:Math.min(r.width,r.height)/2,round:0,corner:r.r||0})}
if(READ_LOCK){lens.lock={kind:READ_LOCK,id:'measured:reading'};lens.focus=READ_LOCK==='field'?1:0;}
if(RETURN_PROTECTION!==null){lens.lock=null;lens.protect=RETURN_PROTECTION;lens.mag=(1-RETURN_PROTECTION)*(1-1/1.13);}
let entries=READ_SURFACE?[require('../z/display-glass.js').readingFrame(READ_SURFACE)]:null;
let lensHome=null,glassParams=null;
if(COALESCENCE){
 const x=WIDTH*.55,top=(COALESCENCE==='separated'||COALESCENCE==='proof')?64:145;
 Object.assign(lens,{x,y:190,hx:80,hy:80,r:80,smooth:40,neck:16,ax:x,ay:top,kind:'hud',layer:'hud'});
 lensHome={id:'upper',kind:'hud',layer:'hud',rect:{left:0,top:0,width:WIDTH,height:top}};
 entries=[{id:'compass',kind:COALESCENCE==='kind'?'foreign':'hud',layer:COALESCENCE==='layer'?'foreign':'hud',rect:{left:x,top:190,width:WIDTH-x-12,height:270}}];
 glassParams={mag:0,refract:0,shadowK:0,tint:[0,0,0,0]};
 if(COALESCENCE==='separated'){entries=[];glassParams.tint=[.62,.66,.72,.2]}
 if(COALESCENCE==='proof'){glassParams=null;lensHome.readRect={left:12,top:10,width:WIDTH-24,height:30};entries[0].readRect={left:x+12,top:212,width:WIDTH-x-36,height:220}}
 if(COALESCENCE==='ellipse'){lensHome=null;entries=[];Object.assign(lens,{x:WIDTH/2,y:HEIGHT/2,hx:100,hy:64,angle:.6});glassParams.tint=[.62,.66,.72,.2]}
}
if(REVEAL_SURFACE){
 glassParams={mag:0,refract:0,shadowK:0,spec:0,fres:0,halftone:0,tint:[0,0,0,0]};
 Object.assign(lens,{x:WIDTH/2,y:HEIGHT/2,hx:80,hy:60,r:60,angle:.4,mag:0,neck:0,smooth:24,kind:'hud',layer:'hud'});
 if(REVEAL_SURFACE==='top')entries=[{kind:'hud',layer:'hud',rect:{left:0,top:-10,width:WIDTH,height:HEIGHT*.68+10}}];
 else if(REVEAL_SURFACE==='compass')entries=[{kind:'hud',layer:'hud',rect:{left:WIDTH/2-150,top:HEIGHT*.53,width:174,height:210}}];
 else if(REVEAL_SURFACE==='merged'){lens.x=WIDTH*.55;lens.y=190;lens.hx=lens.hy=80;lens.angle=0;lensHome={kind:'hud',layer:'hud',rect:{left:0,top:0,width:WIDTH,height:145}};entries=[];}
 else entries=[];
 lens.x+=REVEAL_OFFSET;
}
const f=fixture({foreground:FOREGROUND_IMAGE?()=>[{width:WIDTH,height:HEIGHT,dataFile:FOREGROUND_IMAGE}]:null,width:WIDTH,height:HEIGHT,webgl:true,fieldShader:SPECIMEN?PHILOSOPHY_SHADER:null,fieldPalette:SPECIMEN?PHILOSOPHY_PALETTE:undefined,glass:REVEAL_SURFACE!=='dry',bodyPlaceholder:!NATIVE_REFERENCE&&(REVEAL_SURFACE||SPECIMEN)?PHILOSOPHY_PLAIN:false,preview:!!PREVIEW,composite:!!GLYPH_IMAGE,lens:REVEAL_SURFACE&&['top','compass'].includes(REVEAL_SURFACE)?false:READ_SURFACE&&!READ_LOCK?null:lens,glassEntries:entries,glassReference:READ_REFERENCE,glassParams,lensHome});
if(SPECIMEN&&SPECIMEN!=='ordinary'){
 const paperSite=SITE_WITNESSES.get('organism:papers'),papersModules=new Map();require('node:vm').runInNewContext(require('node:fs').readFileSync(paperSite.file('renderer'),'utf8'),{console,performance:{now:()=>0},SSSDisplayNavigation:require('../z/navigation-physiology.js'),SSSDisplayType:{rankPx:r=>16*2**(r/2)},SSSInterlocutorModules:papersModules,document:{}});
 const projection=JSON.parse(require('node:fs').readFileSync(paperSite.file('feed_preview')));
 f.bodies.b.shader=papersModules.get('organism:papers').shader;f.bodies.b.root=projection.root;f.bodies.b.projection=projection;f.order.splice(0,f.order.length,'b');
}
if(SPECIMEN==='ordinary'){
 const ordinaryModules=new Map(),node={append(){},setAttribute(){}};
 const ctx={console,performance:{now:()=>0},SSSDisplayNavigation:require('../z/navigation-physiology.js'),SSSDisplayType:{rankPx:r=>16*2**(r/2)},SSSInterlocutorModules:ordinaryModules,document:{getElementById:()=>node,querySelectorAll:()=>[]},addEventListener(){}};
 for(const id of ['organism:crawlerbait','organism:datenschutz','organism:impressum'])require('node:vm').runInNewContext(require('node:fs').readFileSync(SITE_WITNESSES.get(id).file('renderer'),'utf8'),ctx);
 for(const [key,id] of [['a','crawlerbait'],['d','datenschutz'],['e','impressum']]){const module=ordinaryModules.get('organism:'+id);f.bodies[key].shader=module.shader;const site=SITE_WITNESSES.get('organism:'+id),data=JSON.parse(require('node:fs').readFileSync(site.file(site.manifest.feed_preview?'feed_preview':'projection')));f.bodies[key].root=id==='crawlerbait'?data.root:module.fieldProjection(data).root;}
 f.order.splice(0,f.order.length,'a','d','e');
}
if(REVEAL_SURFACE==='merged'){f.bodies.b.path='w';lens.y=240;lens.hy=lens.hx=100;}
if(REVEAL_SURFACE)f.bodies.b.shader.body.draw=()=>{
 if(!REVEAL_READY)return false;
 if(REVEAL_SURFACE==='failed')throw Error('declared failed source');
 paintInput();
};
function paintInput(){
  const gl=f.gl,p=gl.createProgram();
  for(const [type,body] of [[gl.VERTEX_SHADER,\`#version 300 es
  void main(){vec2 p=gl_VertexID==0?vec2(-1.,-1.):(gl_VertexID==1?vec2(3.,-1.):vec2(-1.,3.));gl_Position=vec4(p,0.,1.);}\`],[gl.FRAGMENT_SHADER,sample()]]){
    const s=gl.createShader(type);gl.shaderSource(s,body);gl.compileShader(s);gl.attachShader(p,s);
  }
  gl.linkProgram(p);gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.useProgram(p);gl.drawArrays(gl.TRIANGLES,0,3);
  gl.deleteProgram(p);
}
if(PREVIEW)f.bodies.b.shader.preview=paintInput;
f.frame(0);if(!GLYPH_FRAME&&!READ_SURFACE&&!COALESCENCE&&!REVEAL_SURFACE){const contacted=f.api.projectBody('body:b');if(contacted){lens.x=contacted.x;lens.y=contacted.y;}if(SPECIMEN&&SPECIMEN!=='ordinary'){lens.hx=lens.hy=lens.r=180;lens.mag=0;lens.lock={kind:'body',id:'actual:papers'};if(SPECIMEN==='dry')lens.x=-1000;if(SPECIMEN==='partial')lens.x+=180;}}
f.frame(50);COMMANDS.push({name:'readback',width:WIDTH,height:HEIGHT,lens:{x:lens.x,y:lens.y,r:lens.r,errors:{...f.canvas.dataset},body:f.api.projectBody('body:b')}});
f.frame(100);COMMANDS.push({name:'readback',width:WIDTH,height:HEIGHT,lens:{x:lens.x,y:lens.y,r:lens.r,errors:{...f.canvas.dataset},body:f.api.projectBody('body:b')}});
`,context,{filename:'actual-field-gles-capture'});
process.stdout.write(JSON.stringify(commands));
