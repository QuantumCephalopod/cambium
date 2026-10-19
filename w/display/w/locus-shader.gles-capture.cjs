'use strict';
/* Capture the actual field's existing regression transport. The companion EGL
 * witness replays its GL commands on Mesa; it does not automate a browser. */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const enums={VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,ARRAY_BUFFER:34962,FLOAT:5126,DYNAMIC_DRAW:35048,STATIC_DRAW:35044,TRIANGLES:4,POINTS:0,COLOR_BUFFER_BIT:16384,DEPTH_BUFFER_BIT:256,BLEND:3042,DEPTH_TEST:2929,SCISSOR_TEST:3089,SRC_ALPHA:770,ONE_MINUS_SRC_ALPHA:771,ONE:1,FRAMEBUFFER:36160,READ_FRAMEBUFFER:36008,DRAW_FRAMEBUFFER:36009,RENDERBUFFER:36161,COLOR_ATTACHMENT0:36064,DEPTH_ATTACHMENT:36096,RGBA8:32856,DEPTH_COMPONENT24:33190,FRAMEBUFFER_COMPLETE:36053,TEXTURE_2D:3553,TEXTURE0:33984,TEXTURE_BINDING_2D:32873,ACTIVE_TEXTURE:34016,MAX_SAMPLES:36183,TEXTURE_MIN_FILTER:10241,TEXTURE_MAG_FILTER:10240,TEXTURE_WRAP_S:10242,TEXTURE_WRAP_T:10243,LINEAR:9729,CLAMP_TO_EDGE:33071,NEAREST:9728,RGBA:6408,UNSIGNED_BYTE:5121,UNPACK_FLIP_Y_WEBGL:37440,UNPACK_PREMULTIPLY_ALPHA_WEBGL:37441,TEXTURE1:33985,FRAMEBUFFER_BINDING:36006,RENDERBUFFER_BINDING:36007};
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
const [width,height,preview,magnification=.12]=process.argv.slice(2).map(Number),commands=[];
const context={require,__dirname,process:{env:{LOCUS_SOURCE:process.env.LOCUS_SOURCE}},console:{log(){},warn(){}},ENUMS:enums,COMMANDS:commands,WIDTH:width,HEIGHT:height,PREVIEW:preview,MAGNIFICATION:magnification,GLYPH_IMAGE:process.env.GLYPH_IMAGE,GLYPH_FRAME:process.env.GLYPH_FRAME?JSON.parse(process.env.GLYPH_FRAME):null,READ_SURFACE:process.env.READ_SURFACE?JSON.parse(process.env.READ_SURFACE):null,READ_LOCK:process.env.READ_LOCK||'',READ_REFERENCE:process.env.READ_REFERENCE==='1',COALESCENCE:process.env.COALESCENCE||'',RETURN_PROTECTION:process.env.RETURN_PROTECTION===undefined?null:Number(process.env.RETURN_PROTECTION)};
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
const f=fixture({width:WIDTH,height:HEIGHT,webgl:true,glass:true,preview:!!PREVIEW,composite:!!GLYPH_IMAGE,lens:READ_SURFACE&&!READ_LOCK?null:lens,glassEntries:entries,glassReference:READ_REFERENCE,glassParams,lensHome});
if(PREVIEW)f.bodies.b.shader.preview=()=>{
  const gl=f.gl,p=gl.createProgram();
  for(const [type,body] of [[gl.VERTEX_SHADER,\`#version 300 es
  void main(){vec2 p=gl_VertexID==0?vec2(-1.,-1.):(gl_VertexID==1?vec2(3.,-1.):vec2(-1.,3.));gl_Position=vec4(p,0.,1.);}\`],[gl.FRAGMENT_SHADER,sample()]]){
    const s=gl.createShader(type);gl.shaderSource(s,body);gl.compileShader(s);gl.attachShader(p,s);
  }
  gl.linkProgram(p);gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.useProgram(p);gl.drawArrays(gl.TRIANGLES,0,3);
  gl.deleteProgram(p);
};
f.frame(0);if(!GLYPH_FRAME&&!READ_SURFACE&&!COALESCENCE){const contacted=f.api.projectBody('body:b');lens.x=contacted.x;lens.y=contacted.y;}
f.frame(50);COMMANDS.push({name:'readback',width:WIDTH,height:HEIGHT,lens:{x:lens.x,y:lens.y,r:lens.r}});
f.frame(100);COMMANDS.push({name:'readback',width:WIDTH,height:HEIGHT,lens:{x:lens.x,y:lens.y,r:lens.r}});
`,context,{filename:'actual-field-gles-capture'});
process.stdout.write(JSON.stringify(commands));
