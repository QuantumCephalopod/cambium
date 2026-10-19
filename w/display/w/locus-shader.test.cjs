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
function fixture({width=1280,height=800,webgl=true,glass=true,host=false,points=false,composite=false,layer=false,preview=false,lens=null,order=['a','b','c','d','e'],tree=root,inspectable=false,snapshot=null,afterDraw=null,fallbackAlpha=undefined,glassEntries=null,glassReference=false}={}){
  let serial=0,currentProgram=null,currentVAO=null,drawTarget=null,readTarget=null,textureUnit=0,now=0;
  const calls=[],frames=[],queue=[],timers=[],events=[],enabled=new Set(),depths=new Map(),values={depth:true,color:[true,true,true,true],clearDepth:1};
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
    calls.push({type:'draw',mode,first,count,name,vao:currentVAO,depthWrite:values.depth,target:drawTarget,model:currentProgram.uniforms?.uModel,previewReady:currentProgram.uniforms?.uPreviewReady,lensControl:currentProgram.uniforms?.uN,lensShape:currentProgram.uniforms?.uL2});
    if(values.depth&&enabled.has(gl.DEPTH_TEST))depths.set(drawTarget,(depths.get(drawTarget)||0)+count);
  };
  for(const name of ['compileShader','linkProgram','enableVertexAttribArray','uniform1f','uniform2f','uniform3fv','uniform4fv','uniform4f','viewport','clearColor','blendFunc','pixelStorei','bindTexture','texImage2D','texParameteri','texStorage2D','bindRenderbuffer','renderbufferStorage','renderbufferStorageMultisample','framebufferRenderbuffer','framebufferTexture2D','blitFramebuffer'])gl[name]=()=>{};
  gl.uniform1i=(loc,value)=>{loc.program.uniforms||={};loc.program.uniforms[loc.name]=value};
  gl.uniform4f=(loc,...value)=>{loc.program.uniforms||={};loc.program.uniforms[loc.name]=value};
  gl.uniformMatrix4fv=(loc,_,value)=>{loc.program.uniforms||={};loc.program.uniforms[loc.name]=Array.from(value)};
  function element(){const ink={textContent:''};return {hidden:false,dataset:{},style:{},attributes:{},children:[],append(n){this.children.push(n)},replaceChildren(){this.children=[]},addEventListener(name,fn){this[name]=fn},setAttribute(k,v){this.attributes[k]=v},querySelector(){return this.children[0]||ink},querySelectorAll(){return this.children}}}
  let inkPath=[];
  const ctx2d={beginPath(){inkPath=[]},moveTo(x,y){inkPath.push([x,y])},lineTo(x,y){inkPath.push([x,y])},fill(){calls.push({type:'fill2d',path:inkPath.map(p=>[...p]),style:this.fillStyle})}};
  for(const name of ['setTransform','fillRect','closePath','stroke','save','restore','translate','rotate','strokeRect','arc'])ctx2d[name]=()=>{};
  const canvas=element();Object.assign(canvas,{width,height,getContext:type=>type==='2d'?ctx2d:webgl?gl:null,getBoundingClientRect:()=>({left:0,top:0,width,height})});
  const hostElement=element(),labelHost=element(),world={orientation:[1,0,0,0],scopeId:'fixture',view:'',restoreHome(){},inspect(path){this.view=path},clearInspection(){this.view=''}};
  const context={console,performance:{now:()=>now},devicePixelRatio:1,requestAnimationFrame:fn=>queue.push(fn),addEventListener(){},dispatchEvent(e){events.push(e)},setTimeout(fn){timers.push(fn)},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}},document:{createElement:()=>element()},SSSDisplayNavigation:N,SSSWorldView:world,SSSInterlocutorModules:new Map()};
  if(glass){const G=require('../z/display-glass.js');context.SSSDisplayGlass={...G,enabled:()=>true,rects:()=>glassEntries?G.derive(glassEntries,{left:0,top:0,width,height},{width,height}):{count:1,scale:1,data:new Float32Array(32),readData:new Float32Array(32),inset:8},PARAMS:glassReference?{...G.PARAMS,bevel:0,refract:0,mag:0,halftone:0,shadowK:0,tint:[0,0,0,0]}:G.PARAMS}}
  if(preview||lens)context.SSSDisplayLens={snapshot:()=>({lens:lens||{x:width/2,y:height/2,hx:2000,hy:2000,ax:0,ay:0,mag:.12},home:null})};
  context.SSSDisplayLabelInk={create:()=>({draw:()=>true,reset(){},dispose(){}})};
  vm.createContext(context);vm.runInContext(source,context,{filename:SOURCE});
  const bodies={a:{id:'body:a',path:'w',root,shader:{id:'shader:a',fragment:fragment('ordinary-a'),state:{blend:true,depthTest:true,depthWrite:false}}},
    b:{id:'body:b',path:'x',root,shader:{id:'shader:b',fragment:fragment('field-b'),body:{fragment:fragment('custom-b'),state:{blend:true,depthTest:true,depthWrite:true}}}},
    c:{id:'body:c',path:'y',root,shader:{id:'shader:c',fragment:fragment('field-c'),body:{fragment:fragment('custom-c'),state:{blend:true,depthTest:true,depthWrite:true}}}},
    d:{id:'body:d',path:'z',root,shader:{id:'shader:d',fragment:fragment('ordinary-d'),state:{blend:true,depthTest:true,depthWrite:false}}},
    e:{id:'body:e',path:'xz',root,shader:{id:'shader:e',fragment:fragment('ordinary-e'),state:{blend:true,depthTest:true,depthWrite:false}}}};
  if(preview)bodies.b.shader.preview=args=>calls.push({type:'preview',target:drawTarget,lens:args.lens});
  const shader={id:'fixture:field',fragment:fragment('field'),state:{blend:true,depthTest:true,depthWrite:false}};
  if(fallbackAlpha!==undefined)shader.fallbackAlpha=fallbackAlpha;
  if(snapshot)shader.snapshot=snapshot;if(afterDraw)shader.afterDraw=afterDraw;
  if(composite)shader.composite=()=>[{width:16,height:16}];
  if(layer)shader.afterDraw=()=>{gl.depthMask(false);gl.colorMask(false,false,false,false);gl.enable(gl.SCISSOR_TEST);gl.clearDepth(0)};
  const projection={root:tree,points:points?[{id:'point',gene:'w',kind:'source'}]:[]};
  const api=context.SSSInterlocutorFields.create({id:'fixture',element:hostElement,canvas,labelHost,projection,shader,inspectable,localScope:'fixture',bodies:()=>order.map(k=>bodies[k]),environment:host?()=>({hostId:'host',path:'w',place:{center:[0,0,0],k:.125},shader:{id:'host:shader',fragment:fragment('host')},palette:[.1,.2,.3]}):null});
  function frame(ms){now=ms;const start=calls.length;assert(queue.length);queue.shift()(ms);frames.push(calls.slice(start));return frames.at(-1)}
  return {gl,canvas,api,world,events,calls,frames,frame,order,bodies,labels:labelHost,host:hostElement,flushTimers(){while(timers.length)timers.shift()()},clickBody(index){labelHost.children.filter(n=>n.className==='field-label field-body-label')[index].click({preventDefault(){},stopPropagation(){},clientX:0,clientY:0})}};
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

for(const lock of [null,{kind:'body',id:'independent:body'},{kind:'field',id:'independent:field'}]){
  const lens={x:400,y:300,hx:180,hy:90,round:0,corner:14,ax:400,ay:300,mag:0,focus:lock?.kind==='field'?1:0,neck:0,smooth:18,lock};
  const f=fixture({lens});const frame=f.frame(0),glass=frame.find(c=>c.type==='draw'&&c.name.includes('uniform sampler2D uScene'));
  assert(glass,'actual field runs the shared glass pass');assert.equal(glass.lensControl[1],lock?1:0,'body/field locks explicitly preserve zero magnification rather than falling back to general HUD magnification');
  assert.equal(glass.lensShape[0],15,'the body-owned rounded extent reaches the shared optical shader');
}

/* An unavailable optional GPU cannot remove the already-offered population from
 * the existing 2D field. Exercise real mesh paint and both actual entry paths. */
for(const [width,height] of [[1280,800],[390,844]]){
  const f=fixture({width,height,webgl:false,glass:false});
  f.bodies.c.root={noun:'deeper',children:{...root.children,w:root}};f.frame(0);
  const labels=()=>f.labels.children.filter(n=>n.className==='field-label field-body-label');
  assert.equal(labels().length,5,'Canvas2D lost the floating population and attached labels');
  assert(f.labels.children.filter(n=>n.className==='field-label').every(n=>n.attributes['aria-hidden']==='true'),'decorative address labels repeat native semantic controls');
  assert(labels().every(n=>n.type==='button'&&!n.attributes['aria-hidden']),'body entry must retain its native accessible button');
  assert.equal(f.frames[0].filter(c=>c.type==='fill2d').length,16+4*16+28,'fallback must paint all realized body triangles, including finer children');
  const first=f.api.projectBody('body:b');assert(first&&first.r>0,'fallback body has no geometric contact');
  const identity=labels()[1];f.bodies.b.title='Datenschutz';f.order.reverse();f.frame(2000);
  assert.equal(labels().find(n=>n.querySelector('b').textContent==='Datenschutz'),identity,'language/reorder remints label identity');
  assert.notDeepEqual(f.api.projectBody('body:b'),first,'fallback projection does not follow body drift');
  f.clickBody(1);f.flushTimers();assert.equal(f.events.at(-1).type,'sss:enter-body');assert.equal(f.events.at(-1).detail.id,'body:b');
  f.api.arriveFrom(null);f.frame(2500);
  const p=f.api.projectBody('body:c'),event={button:0,pointerId:1,clientX:p.x,clientY:p.y,preventDefault(){}};
  f.canvas.pointerdown(event);f.canvas.pointerup(event);f.flushTimers();assert.equal(f.events.at(-1).detail.id,'body:c','fallback face entry loses identity');
  f.order.splice(f.order.indexOf('b'),1);f.frame(3000);
  assert.equal(f.api.projectBody('body:b'),null,'withdrawn body remains contactable');assert(identity.hidden,'withdrawn body label remains selectable');
  const before=f.events.length;identity.click({preventDefault(){},stopPropagation(){},clientX:0,clientY:0});f.flushTimers();assert.equal(f.events.length,before,'withdrawn label can still enter a stale body');
}
console.log('PASS — Canvas2D retains full offered bodies, localized labels, drift, face/label entry and withdrawal at wide and portrait carriers');
/* A declined target returns through arriveFrom(null). Compare the real moving
 * body projection with an otherwise identical field that never approached it. */
for(const webgl of [false,true]){
  const f=fixture({webgl,glass:false}),control=fixture({webgl,glass:false});
  f.frame(0);control.frame(0);const before=f.api.projectBody('body:b');
  f.clickBody(1);f.frame(330);control.frame(330);
  assert(f.api.projectBody('body:b').r>before.r*1.5,'fixture did not approach the contacted body');
  f.api.arriveFrom(null);f.frame(660);control.frame(660);
  assert.deepEqual({...f.api.projectBody('body:b')},{...control.api.projectBody('body:b')},'camera recovery loses the original local container or moving body geometry');
}
console.log('PASS — actual shared-glass lock/shape uniforms preserve contacted readable geometry');

/* A language-only title change updates the existing label and keeps its GPU body. */
{
 const f=fixture();f.bodies.a.title='English name';f.frame(0);
 const label=f.labels.children.find(n=>n.className==='field-label field-body-label');
 assert.equal(label.querySelector('b').textContent,'English name');
 const draw=f.frames[0].find(c=>c.type==='draw'&&c.name.includes('// ordinary-a'));
 f.bodies.a.title='Deutscher Name';f.frame(1000);
 assert.strictEqual(f.labels.children.find(n=>n.className==='field-label field-body-label'),label);
 assert.equal(label.querySelector('b').textContent,'Deutscher Name');
 assert.strictEqual(f.frames[1].find(c=>c.type==='draw'&&c.name.includes('// ordinary-a')).vao,draw.vao);
}

/* The same outside pointer gesture pops one realized local rank for mouse and
 * touch. A restored view must be reconciled before the very first frame. */
for(const pointerType of ['mouse','touch']){
 const tree=anatomy();function anatomy(depth=0){return depth===3?{noun:'leaf',children:{}}:{noun:'cell',children:Object.fromEntries(N.GENES.map(g=>[g,anatomy(depth+1)]))}}
 const f=fixture({tree,inspectable:true});f.world.view='wx';
 assert.equal(f.api.ascend('restored'),true);assert.equal(f.world.view,'w');
 f.frame(0);
 const event={button:0,pointerId:7,pointerType,clientX:1,clientY:1,preventDefault(){}};
 f.canvas.pointerdown(event);f.canvas.pointerup(event);
 assert.equal(f.world.view,'','outside pops exactly one rank');
 f.canvas.pointerdown(event);f.canvas.pointerup(event);
 assert.equal(f.world.view,'');assert.equal(f.events.at(-1).type,'sss:membrane-ascend');
}

/* Site-owned coarse cells/draw stay inside the shared placement/identity frame.
 * A failed own draw retains the truthful coarse-cell fallback. */
for(const webgl of [true,false]){
 const f=fixture({webgl}),material=f.bodies.b.shader.body;
 material.cells=()=>[{path:'w',tet:N.V0.map(v=>[...v])}];let draws=0,released=0;
 material.release=()=>released++;
 if(webgl)material.draw=args=>{draws++;assert.equal(args.gl,f.gl);assert(Math.abs(args.model[0]-1.75*.125)<1e-6);throw Error('declared own-draw refusal')};
 f.frame(0);
 if(webgl){assert.equal(draws,1);assert.match(f.canvas.dataset.bodyError,/own-draw refusal/);assert.equal(f.frames[0].find(c=>c.type==='draw'&&c.name.includes('// custom-b')).count,12)}
 else assert.equal(f.frames[0].filter(c=>c.type==='fill2d').length,4*4+4*4*4+4,'one own tetra replaces the old four-tetra body while other populations stay whole');
 f.bodies.b.path='y';f.frame(50);if(webgl)assert.equal(released,1,'remount retires context-local own resources before rebuilding');
}
console.log('PASS — site-owned coarse geometry, shared body frame, failed-draw fallback and remount retirement');

// A live source changes its addressed field without remounting its body or point
// identity. Empty births, deeper addresses, withdrawal and Canvas2D all matter.
for(const webgl of [true,false]){let revision=0,points=[],frames=0,backend=null;const f=fixture({webgl,snapshot:()=>({root:revision===2?{...root,children:{...root.children,w:root}}:root,points,revision}),afterDraw:a=>{frames++;backend=!!a.gl}});
 f.frame(0);assert.equal(f.api.points.length,0);points=[{id:'a',path:'w',label:'same tissue'}];revision++;f.frame(16);assert.equal(f.api.points[0].id,'a');f.api.selectPoint('a',false);
 points=[{id:'a',path:'ww',label:'same tissue'}];revision++;f.frame(32);assert.equal(f.api.selectedPointId,'a');assert.equal(f.api.points[0].path,'ww');
 points=[];revision++;f.frame(48);assert.equal(f.api.selectedPointId,'');assert.equal(frames,4);assert.equal(backend,webgl);
}
console.log('PASS — live source birth/split/withdrawal preserves identity and lends the same frame on both backends');

/* An explicitly transparent fallback contributes neither fill nor wire under a
 * source-owned layer; the layer and shared frame must continue to execute. */
for(const alpha of [0,.12]){let layers=0;const f=fixture({webgl:false,glass:false,order:[],fallbackAlpha:alpha,afterDraw:()=>layers++});f.frame(0);
assert.equal(f.frames[0].filter(c=>c.type==='fill2d').length,alpha?16:0);assert.equal(layers,1);}
console.log('Transparent fallback suppresses duplicate base geometry while preserving the borrowed source layer PASS');
