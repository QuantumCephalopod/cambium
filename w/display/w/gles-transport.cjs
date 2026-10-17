'use strict';
function createTransport(){
const commands=[];
const enums={ALIASED_POINT_SIZE_RANGE:33901,FUNC_ADD:32774,TEXTURE_2D:3553,TEXTURE_BINDING_2D:32873,TEXTURE_WRAP_S:10242,TEXTURE_WRAP_T:10243,CLAMP_TO_EDGE:33071,UNPACK_ALIGNMENT:3317,R8:33321,RED:6403,RGBA16F:34842,HALF_FLOAT:5131,COLOR_ATTACHMENT0:36064,ARRAY_BUFFER:34962,FLOAT:5126,DYNAMIC_DRAW:35048,STATIC_DRAW:35044,TRIANGLES:4,LINES:1,POINTS:0,ONE:1,TRIANGLE_STRIP:5,VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,FRAMEBUFFER:36160,FRAMEBUFFER_BINDING:36006,DEPTH_BUFFER_BIT:256,COLOR_BUFFER_BIT:16384,DEPTH_TEST:2929,BLEND:3042,SCISSOR_TEST:3089,SRC_ALPHA:770,ONE_MINUS_SRC_ALPHA:771,LESS:513,LEQUAL:515,TEXTURE0:33984,ACTIVE_TEXTURE:34016,TEXTURE_2D_ARRAY:35866,TEXTURE_BINDING_2D_ARRAY:35869,RGBA8:32856,RGBA:6408,UNSIGNED_BYTE:5121,TEXTURE_MIN_FILTER:10241,TEXTURE_MAG_FILTER:10240,NEAREST:9728,LINEAR:9729,LINEAR_MIPMAP_LINEAR:9987,CURRENT_PROGRAM:35725,VERTEX_ARRAY_BINDING:34229,DEPTH_WRITEMASK:2930,COLOR_WRITEMASK:3107,DEPTH_FUNC:2932,DEPTH_CLEAR_VALUE:2931,BLEND_SRC_RGB:32969,BLEND_DST_RGB:32968,BLEND_SRC_ALPHA:32971,BLEND_DST_ALPHA:32970};
let serial=0,program=null,vao=null,texture=null,active=enums.TEXTURE0,depth=true,color=[true,true,true,true],depthFunc=enums.LESS,clear=1;const enabled=new Set();
const serialize=x=>x==null||typeof x!=='object'?x:Array.isArray(x)||ArrayBuffer.isView(x)?{array:Array.from(x)}:x.dataFile?{image:{width:x.width,height:x.height,path:x.dataFile}}:x;
const gl=new Proxy({...enums},{get(t,key){if(key in t)return t[key];if(key==='getParameter')return k=>({[enums.ALIASED_POINT_SIZE_RANGE]:[1,256],[enums.CURRENT_PROGRAM]:program,[enums.VERTEX_ARRAY_BINDING]:vao,[enums.TEXTURE_BINDING_2D_ARRAY]:texture,[enums.ACTIVE_TEXTURE]:active,[enums.DEPTH_WRITEMASK]:depth,[enums.COLOR_WRITEMASK]:color,[enums.DEPTH_FUNC]:depthFunc,[enums.DEPTH_CLEAR_VALUE]:clear,[enums.BLEND_SRC_RGB]:enums.SRC_ALPHA,[enums.BLEND_SRC_ALPHA]:enums.SRC_ALPHA,[enums.BLEND_DST_RGB]:enums.ONE_MINUS_SRC_ALPHA,[enums.BLEND_DST_ALPHA]:enums.ONE_MINUS_SRC_ALPHA}[k]??null);
 if(key==='isEnabled')return k=>enabled.has(k);
 if(key==='getExtension')return name=>name==='EXT_color_buffer_float'?{name}:null;
 if(key==='getShaderParameter'||key==='getProgramParameter')return()=>true;
 if(key==='getUniformLocation')return(p,name)=>({uniform:name,program:p.object});
 if(key==='getAttribLocation')return(p,name)=>{p.attributes||={};if(!(name in p.attributes))p.attributes[name]=Object.keys(p.attributes).length;const result=p.attributes[name];commands.push({name:key,args:[p,name],result});return result};
 return(...args)=>{let result;
  if(key.startsWith('create'))result={object:++serial,kind:key.slice(6)};
  if(key==='useProgram')program=args[0];if(key==='bindVertexArray')vao=args[0];if(key==='bindTexture')texture=args[1];if(key==='activeTexture')active=args[0];if(key==='depthMask')depth=args[0];if(key==='colorMask')color=args;if(key==='depthFunc')depthFunc=args[0];if(key==='clearDepth')clear=args[0];if(key==='enable')enabled.add(args[0]);if(key==='disable')enabled.delete(args[0]);
  commands.push({name:key,args:args.map(serialize),result});return result;
 }}});
return {gl,commands};
}
module.exports={createTransport};
