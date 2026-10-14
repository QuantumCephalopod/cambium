#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const N=require('../z/navigation-physiology.js');
const SOURCE=process.env.LOCUS_SOURCE||path.join(__dirname,'locus-shader.js');
const source=fs.readFileSync(SOURCE,'utf8');
const atom=noun=>({noun,children:{}}),root={noun:'field',children:{w:atom('w'),x:atom('x'),z:atom('z'),y:atom('y')}};
const fragment=name=>`#version 300 es\n// ${name}\nprecision highp float;out vec4 outColor;void main(){outColor=vec4(1.);}`;

/* The actual renderer is executed; only the browser/GL transport is replaced.
 * Clears obey WebGL write-mask/scissor rules and depth belongs to each target.
 * This catches a masked clear even when the frame has no composite canvases. */
function fixture({width=1280,height=800,glass=true,host=false,points=false,composite=false,layer=false,preview=false,order=['a','b','c','d','e']}={}){
  let serial=0,currentProgram=null,currentVAO=null,drawTarget=null,readTarget=null,textureUnit=0,now=0;
  const calls=[],frames=[],queue=[],enabled=new Set(),depths=new Map(),values={depth:true,color:[true,true,true,true],clearDepth:1};
  const gl={},constants=['VERTEX_SHADER','FRAGMENT_SHADER','COMPILE_STATUS','LINK_STATUS','ARRAY_BUFFER','FLOAT','DYNAMIC_DRAW','STATIC_DRAW','TRIANGLES','POINTS','COLOR_BUFFER_BIT','DEPTH_BUFFER_BIT','BLEND','DEPTH_TEST','SCISSOR_TEST','SRC_ALPHA','ONE_MINUS_SRC_ALPHA','ONE','FRAMEBUFFER','READ_FRAMEBUFFER','DRAW_FRAMEBUFFER','RENDERBUFFER','COLOR_ATTACHMENT0','DEPTH_ATTACHMENT','RGBA8','DEPTH_COMPONENT24','FRAMEBUFFER_COMPLETE','TEXTURE_2D','TEXTURE0','TEXTURE_BINDING_2D','ACTIVE_TEXTURE','MAX_SAMPLES','TEXTURE_MIN_FILTER','TEXTURE_MAG_FILTER','TEXTURE_WRAP_S','TEXTURE_WRAP_T','LINEAR','CLAMP_TO_EDGE','NEAREST','RGBA','UNSIGNED_BYTE','UNPACK_FLIP_Y_WEBGL','UNPACK_PREMULTIPLY_ALPHA_WEBGL','TEXTURE1','FRAMEBUFFER_BINDING','RENDERBUFFER_BINDING'];
  constants.forEach((n,i)=>gl[n]=100+i);gl.COLOR_BUFFER_BIT=1;gl.DEPTH_BUFFER_BIT=2;
  for(const kind of ['Program','Shader','VertexArray','Buffer','Texture','Framebuffer','Renderbuffer']){
    gl['create'+kind]=()=>({kind,id:++serial});gl['delete'+kind]=()=>{};
  }
  gl.createProgram=()=>({kind:'Program',id:++serial,shaders:[]});
  gl.shaderSource=(shader,body)=>{shader.source=body};gl.attachShader=(program,shader)=>program.shaders.push(shader);
  gl.getShaderParameter=gl.getProgramParameter=()=>true;gl.getUniformLocation=(program,name)=>({program,name});
  gl.getAttribLocation=(_,name)=>({aPos:0,aNormal:1,aRegion:2,aKind:3,aHot:4}[name]??0);
  gl.getParameter=k=>k===gl.MAX_SAMPLES?4:k===gl.ACTIVE_TEXTURE?textureUnit:k===gl.TEXTURE_BINDING_2D?null:null;
  Object.setPrototypeOf(gl,{bindFramebuffer(target,fb){if(target===gl.READ_FRAMEBUFFER)readTarget=fb;else if(target===gl.DRAW_FRAMEBUFFER)drawTarget=fb;else drawTarget=readTarget=fb}});
  gl.checkFramebufferStatus=()=>gl.FRAMEBUFFER_COMPLETE;
  gl.depthMask=v=>{values.depth=v};gl.colorMask=(...v)=>{values.color=v};gl.clearDepth=v=>{values.clearDepth=v};
  gl.enable=k=>enabled.add(k);gl.disable=k=>enabled.delete(k);gl.activeTexture=u=>{textureUnit=u};
  gl.useProgram=p=>{currentProgram=p};gl.bindVertexArray=v=>{currentVAO=v};
  gl.bindBuffer=(_,b)=>{gl.buffer=b};gl.bufferData=(_,data)=>{gl.buffer.data=Array.from(data)};
  gl.vertexAttribPointer=()=>{if(currentVAO)currentVAO.buffer=gl.buffer};
  gl.clear=bits=>{
    const before=depths.get(drawTarget)||0,effectiveDepth=!!(bits&gl.DEPTH_BUFFER_BIT)&&values.depth&&!enabled.has(gl.SCISSOR_TEST),effectiveColor=!!(bits&gl.COLOR_BUFFER_BIT)&&values.color.every(Boolean)&&!enabled.has(gl.SCISSOR_TEST);
    if(effectiveDepth)depths.set(drawTarget,0);
    calls.push({type:'clear',bits,target:drawTarget,before,effectiveDepth,effectiveColor,depthMask:values.depth,colorMask:[...values.color],scissor:enabled.has(gl.SCISSOR_TEST),clearDepth:values.clearDepth});
  };
  gl.drawArrays=(mode,first,count)=>{
    const name=currentProgram.shaders.find(s=>s.source.includes('outColor')||s.source.includes('out vec4 o;'))?.source||'';
    calls.push({type:'draw',mode,first,count,name,vao:currentVAO,depthWrite:values.depth,target:drawTarget,model:currentProgram.uniforms?.uModel,previewReady:currentProgram.uniforms?.uPreviewReady});
    if(values.depth&&enabled.has(gl.DEPTH_TEST))depths.set(drawTarget,(depths.get(drawTarget)||0)+count);
  };
  for(const name of ['compileShader','linkProgram','enableVertexAttribArray','uniform1f','uniform2f','uniform3fv','uniform4fv','uniform4f','viewport','clearColor','blendFunc','pixelStorei','bindTexture','texImage2D','texParameteri','texStorage2D','bindRenderbuffer','renderbufferStorage','renderbufferStorageMultisample','framebufferRenderbuffer','framebufferTexture2D','blitFramebuffer'])gl[name]=()=>{};
  gl.uniform1i=(loc,value)=>{loc.program.uniforms||={};loc.program.uniforms[loc.name]=value};
  gl.uniformMatrix4fv=(loc,_,value)=>{loc.program.uniforms||={};loc.program.uniforms[loc.name]=Array.from(value)};
  function element(){return {hidden:false,dataset:{},style:{},children:[],append(n){this.children.push(n)},replaceChildren(){this.children=[]},addEventListener(name,fn){this[name]=fn},setAttribute(){},querySelector(){return this.children[0]||{textContent:''}},querySelectorAll(){return this.children}}}
  const canvas=element();Object.assign(canvas,{width,height,getContext:()=>gl,getBoundingClientRect:()=>({left:0,top:0,width,height})});
  const hostElement=element(),labelHost=element(),world={orientation:[1,0,0,0],scopeId:'fixture',view:'',restoreHome(){},inspect(){},clearInspection(){}};
  const context={console,performance:{now:()=>now},devicePixelRatio:1,requestAnimationFrame:fn=>queue.push(fn),addEventListener(){},dispatchEvent(){},setTimeout(){},CustomEvent:class{},document:{createElement:()=>element()},SSSDisplayNavigation:N,SSSWorldView:world,SSSInterlocutorModules:new Map()};
  if(glass)context.SSSDisplayGlass={enabled:()=>true,rects:()=>({count:1,scale:1,data:new Float32Array(64)}),PARAMS:{radius:1,bevel:1,bevelMax:1,refract:1,aberr:1,mag:1,spec:1,fres:1,shadow:1,shadowK:1,theta:1,tint:[0,0,0,0],dot:1,halftone:1}};
  if(preview)context.SSSDisplayLens={snapshot:()=>({lens:{x:width/2,y:height/2,hx:2000,hy:2000,ax:0,ay:0,mag:.12},home:null})};
  context.SSSDisplayLabelInk={create:()=>({draw:()=>true,reset(){},dispose(){}})};
  vm.createContext(context);vm.runInContext(source,context,{filename:SOURCE});
  const bodies={a:{id:'body:a',path:'w',root,shader:{id:'shader:a',fragment:fragment('ordinary-a'),state:{blend:true,depthTest:true,depthWrite:false}}},
    b:{id:'body:b',path:'x',root,shader:{id:'shader:b',fragment:fragment('field-b'),body:{fragment:fragment('custom-b'),state:{blend:true,depthTest:true,depthWrite:true}}}},
    c:{id:'body:c',path:'y',root,shader:{id:'shader:c',fragment:fragment('field-c'),body:{fragment:fragment('custom-c'),state:{blend:true,depthTest:true,depthWrite:true}}}},
    d:{id:'body:d',path:'z',root,shader:{id:'shader:d',fragment:fragment('ordinary-d'),state:{blend:true,depthTest:true,depthWrite:false}}},
    e:{id:'body:e',path:'xz',root,shader:{id:'shader:e',fragment:fragment('ordinary-e'),state:{blend:true,depthTest:true,depthWrite:false}}}};
  if(preview)bodies.b.shader.preview=args=>calls.push({type:'preview',target:drawTarget,lens:args.lens});
  const shader={id:'fixture:field',fragment:fragment('field'),state:{blend:true,depthTest:true,depthWrite:false}};
  if(composite)shader.composite=()=>[{width:16,height:16}];
  if(layer)shader.afterDraw=()=>{gl.depthMask(false);gl.colorMask(false,false,false,false);gl.enable(gl.SCISSOR_TEST);gl.clearDepth(0)};
  const projection={root,points:points?[{id:'point',gene:'w',kind:'source'}]:[]};
  const api=context.SSSInterlocutorFields.create({id:'fixture',element:hostElement,canvas,labelHost,projection,shader,localScope:'fixture',bodies:()=>order.map(k=>bodies[k]),environment:host?()=>({hostId:'host',path:'w',place:{center:[0,0,0],k:.125},shader:{id:'host:shader',fragment:fragment('host')},palette:[.1,.2,.3]}):null});
  function frame(ms){now=ms;const start=calls.length;assert(queue.length);queue.shift()(ms);frames.push(calls.slice(start));return frames.at(-1)}
  return {gl,canvas,api,calls,frames,frame,order,bodies,host:hostElement,clickBody(index){labelHost.children.filter(n=>n.className==='field-label field-body-label')[index].click({preventDefault(){},stopPropagation(){},clientX:0,clientY:0})}};
}

function assertClears(f){
  for(const frame of f.frames){
    const clear=frame.find(c=>c.type==='clear');assert(clear.effectiveDepth,'frame depth clear is masked');assert(clear.effectiveColor,'frame color clear is masked');assert.equal(clear.clearDepth,1,'frame depth clear inherits site value');
    for(const c of frame.filter(c=>c.type==='clear'&&c.bits&f.gl.DEPTH_BUFFER_BIT))assert(c.effectiveDepth,'pass depth clear is masked');
    const bodies=frame.filter(c=>c.type==='draw'&&/\/\/ (custom-|ordinary-)/.test(c.name));
    assert.equal(bodies.length,5);assert.equal(new Set(bodies.map(c=>c.vao)).size,5,'body identity shares a VAO');
    for(const draw of bodies)assert.equal(draw.count,48,'full rank-1 body geometry changed');
  }
}

/* Direct overview: no composite, two opaque custom bodies followed by transparent
 * generic bodies. Their depth must be cleared on every orientation/frame. */
for(const size of [[1280,800],[390,844]])for(const glass of [false,true]){
  const f=fixture({width:size[0],height:size[1],glass});f.frame(0);f.frame(50);f.frame(100);assertClears(f);
  assert.equal(f.canvas.dataset.composite,'0');
  const writes=f.frames[0].filter(c=>c.type==='draw'&&/\/\/ custom-/.test(c.name));assert(writes.every(c=>c.depthWrite));
  const clear=f.frames[1].find(c=>c.type==='clear');assert(clear.before>0,'fixture did not preserve previous body depth');
}
/* Host backdrop and site-layer→point overlay: the pass reset precedes the clear,
 * even when an earlier layer leaves depth/color writes off and a narrow scissor. */
for(const settings of [{host:true},{points:true,layer:true},{points:true,host:true,composite:true}]){
  const f=fixture(settings);f.frame(0);f.frame(50);assertClears(f);
}
/* Reordering transparent and opaque site cohorts must not change frame clearance,
 * body identity, geometry or each body's prescribed depth-write policy. */
for(const order of [['e','d','c','b','a'],['b','a','e','c','d'],['a','c','d','e','b']]){
  const f=fixture({order});f.frame(0);f.frame(50);assertClears(f);
}
{
  const f=fixture();f.frame(0);
  const identity=new Map(f.frames[0].filter(c=>c.type==='draw'&&/\/\/ (custom-|ordinary-)/.test(c.name)).map(c=>[c.name,c.vao]));
  f.order.reverse();f.frame(50);assertClears(f);
  for(const draw of f.frames[1].filter(c=>identity.has(c.name)))assert.equal(draw.vao,identity.get(draw.name),'reordering remints or exchanges body geometry');
}
/* Body entry zoom is transition state, not the container. Re-entry with no
 * explicit place must settle back to the truthful container; an explicit
 * membrane arrival keeps its existing body→container transition. */
for(const [width,height] of [[1280,800],[390,844]])for(const bodyIndex of [1,2]){
  const base=width<560?1.42:1.75,f=fixture({width,height});f.frame(0);f.clickBody(bodyIndex);f.frame(500);
  const fieldScale=()=>f.frames.at(-1).find(c=>c.type==='draw'&&c.name.includes('// field\n')).model[0];
  assert(fieldScale()>5,'fixture did not retain the body-entry zoom');
  f.host.hidden=true;f.frame(1000);f.host.hidden=false;f.api.arriveFrom(null);f.frame(1500);
  assert(Math.abs(fieldScale()-base)<1e-6,'cached host re-entry retained body-entry zoom');assert.equal(f.api.container,'');
  const place={center:[0,0,0],k:.125};f.api.arriveFrom(place);f.frame(1500);
  assert(Math.abs(fieldScale()-base*8)<1e-6,'explicit membrane arrival no longer starts at body scale');f.frame(2000);assert(Math.abs(fieldScale()-base)<1e-6);
}
{
  const f=fixture({preview:true});f.frame(0);f.frame(50);assertClears(f);
  for(const frame of f.frames){const p=frame.findIndex(c=>c.type==='preview'),g=frame.findIndex(c=>c.type==='draw'&&c.name.includes('uniform sampler2D uScene'));
    assert(p>=0&&g>p,'preview must be optical input before final glass, not a post-pass overlay');assert(frame[p].target,'preview needs separate transparent target');assert.equal(frame[p].lens,null,'premature circular clipping loses refracted edge input');assert.equal(frame[g].previewReady,1);
    assert(frame[g].name.includes('texture(uPreview,(frag+gShift*(1.-uB.x))/uRes)')&&frame[g].name.includes('texture(uPreview,(frag+gShift)/uRes)')&&frame[g].name.includes('texture(uPreview,(frag+gShift*(1.+uB.x))/uRes)'),'preview must use all existing optical channel coordinates');
  }
}
console.log('PASS — frame/pass clears reset write masks; full-population body identity and geometry survive ordering, glass, host, points and composite');
