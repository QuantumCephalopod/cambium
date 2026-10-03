'use strict';
const assert=require('node:assert/strict');
const Ink=require('./display-label-ink.js'),T=Ink._test;
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-6,`${actual} != ${expected}`);

function fixture(){
  const attrs=new Map(),listeners=new Map(),paint=[];
  const defaults={display:'block',visibility:'visible',opacity:'1',font:'520 12px sans-serif',fontSize:'12px',color:'rgba(240,235,225,.84)',letterSpacing:'-.36px',textShadow:'rgb(0, 0, 0) 0px 1px 14px'};
  const ancestor={parentElement:null,style:{...defaults,opacity:'.5'}};
  const host={parentElement:ancestor,style:{...defaults},labels:[],getAttribute:k=>attrs.get(k)??null,setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k),querySelectorAll:()=>host.labels};
  const label={parentElement:host,hidden:false,style:{...defaults,opacity:'.82'},nodes:[]};
  const bold={parentElement:label,style:{...defaults}},prefix={parentElement:label,style:{...defaults,font:'8px monospace',fontSize:'8px',letterSpacing:'.96px',opacity:'.48'}};
  const node={data:'Body',parentElement:bold,box:{left:150,top:80,width:28,height:14}};
  const tag={data:'x',parentElement:prefix,box:{left:138,top:84,width:5,height:9}};
  label.nodes.push(tag,node);host.labels.push(label);
  const styleParent={children:[],appendChild(el){this.children.push(el);el.remove=()=>this.children.splice(this.children.indexOf(el),1)}};
  const fonts={addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name)}};
  const canvases=[];
  const doc={fonts,head:styleParent,defaultView:{getComputedStyle:e=>e.style},createTreeWalker:el=>{let i=0;return {nextNode:()=>el.nodes[i++]||null}},
    createRange:()=>{let node;return {selectNodeContents:n=>{node=n},getClientRects:()=>node.box.width?[{...node.box}]:[],setStart:()=>{},setEnd:()=>{}}},
    createElement:kind=>{
      if(kind==='style')return {textContent:'',remove(){}};
      assert.equal(kind,'canvas');
      const canvas={width:0,height:0},ctx={letterSpacing:'0px',wordSpacing:'0px',fontKerning:'auto',
        measureText:text=>({width:text.length*7,fontBoundingBoxAscent:11,fontBoundingBoxDescent:3,actualBoundingBoxLeft:0,actualBoundingBoxRight:text.length*7}),
        setTransform(...v){paint.push(['transform',...v])},fillText(text,x,y){paint.push(['text',text,x,y,this.fillStyle,this.shadowBlur])},fillRect(){},drawImage(){}};
      canvas.getContext=()=>ctx;canvases.push(canvas);return canvas;
    }};
  host.ownerDocument=doc;
  return {host,label,node,tag,bold,prefix,doc,attrs,listeners,paint,canvases,styleParent};
}

function fakeGL(){
  const gl={},names=['CURRENT_PROGRAM','VERTEX_ARRAY_BINDING','ARRAY_BUFFER_BINDING','ACTIVE_TEXTURE','VIEWPORT','COLOR_WRITEMASK','DEPTH_WRITEMASK','BLEND_SRC_RGB','BLEND_DST_RGB','BLEND_SRC_ALPHA','BLEND_DST_ALPHA','BLEND_EQUATION_RGB','BLEND_EQUATION_ALPHA','UNPACK_FLIP_Y_WEBGL','UNPACK_PREMULTIPLY_ALPHA_WEBGL','UNPACK_ALIGNMENT','PIXEL_UNPACK_BUFFER_BINDING','BLEND','DEPTH_TEST','CULL_FACE','SCISSOR_TEST','STENCIL_TEST','RASTERIZER_DISCARD','TEXTURE0','TEXTURE_BINDING_2D','SAMPLER_BINDING','TEXTURE_2D','ARRAY_BUFFER','PIXEL_UNPACK_BUFFER','VERTEX_SHADER','FRAGMENT_SHADER','COMPILE_STATUS','LINK_STATUS','FLOAT','TEXTURE_MIN_FILTER','TEXTURE_MAG_FILTER','TEXTURE_WRAP_S','TEXTURE_WRAP_T','LINEAR','CLAMP_TO_EDGE','MAX_TEXTURE_SIZE','RGBA','UNSIGNED_BYTE','FUNC_ADD','ONE','ONE_MINUS_SRC_ALPHA','DYNAMIC_DRAW','TRIANGLES'];
  names.forEach((name,i)=>gl[name]=i+1);gl.NO_ERROR=0;
  const values=new Map([[gl.CURRENT_PROGRAM,'scene-program'],[gl.VERTEX_ARRAY_BINDING,'scene-vao'],[gl.ARRAY_BUFFER_BINDING,'scene-buffer'],[gl.PIXEL_UNPACK_BUFFER_BINDING,'scene-unpack'],
    [gl.ACTIVE_TEXTURE,gl.TEXTURE0+5],[gl.VIEWPORT,[2,3,600,400]],[gl.COLOR_WRITEMASK,[false,true,false,true]],[gl.DEPTH_WRITEMASK,true],
    [gl.BLEND_SRC_RGB,200],[gl.BLEND_DST_RGB,201],[gl.BLEND_SRC_ALPHA,202],[gl.BLEND_DST_ALPHA,203],[gl.BLEND_EQUATION_RGB,204],[gl.BLEND_EQUATION_ALPHA,205],
    [gl.UNPACK_FLIP_Y_WEBGL,true],[gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false],[gl.UNPACK_ALIGNMENT,8],[gl.MAX_TEXTURE_SIZE,4096]]);
  const enabled=new Set([gl.DEPTH_TEST,gl.CULL_FACE,gl.SCISSOR_TEST,gl.STENCIL_TEST]),textures=new Map([[gl.TEXTURE0,'unit-zero'],[gl.TEXTURE0+5,'unit-five']]),samplers=new Map([[gl.TEXTURE0,'sampler-zero']]);
  let serial=0;const created=[],deleted=[];
  for(const kind of ['Shader','Program','VertexArray','Buffer','Texture']){
    gl['create'+kind]=()=>{const resource={kind,id:++serial};created.push(resource);return resource};
    gl['delete'+kind]=resource=>deleted.push(resource);
  }
  gl.getParameter=k=>k===gl.TEXTURE_BINDING_2D?textures.get(values.get(gl.ACTIVE_TEXTURE)):k===gl.SAMPLER_BINDING?(samplers.get(values.get(gl.ACTIVE_TEXTURE))??null):values.get(k);
  gl.activeTexture=u=>values.set(gl.ACTIVE_TEXTURE,u);gl.bindTexture=(_,t)=>textures.set(values.get(gl.ACTIVE_TEXTURE),t);gl.bindSampler=(u,s)=>samplers.set(gl.TEXTURE0+u,s);
  gl.useProgram=p=>values.set(gl.CURRENT_PROGRAM,p);gl.bindVertexArray=v=>values.set(gl.VERTEX_ARRAY_BINDING,v);
  gl.bindBuffer=(target,b)=>values.set(target===gl.ARRAY_BUFFER?gl.ARRAY_BUFFER_BINDING:gl.PIXEL_UNPACK_BUFFER_BINDING,b);
  gl.viewport=(...v)=>values.set(gl.VIEWPORT,v);gl.colorMask=(...v)=>values.set(gl.COLOR_WRITEMASK,v);gl.depthMask=v=>values.set(gl.DEPTH_WRITEMASK,v);
  gl.pixelStorei=(k,v)=>values.set(k,v);gl.enable=k=>enabled.add(k);gl.disable=k=>enabled.delete(k);gl.isEnabled=k=>enabled.has(k);
  gl.blendFuncSeparate=(a,b,c,d)=>{for(const [k,v] of [[gl.BLEND_SRC_RGB,a],[gl.BLEND_DST_RGB,b],[gl.BLEND_SRC_ALPHA,c],[gl.BLEND_DST_ALPHA,d]])values.set(k,v)};
  gl.blendEquationSeparate=(a,b)=>{values.set(gl.BLEND_EQUATION_RGB,a);values.set(gl.BLEND_EQUATION_ALPHA,b)};
  for(const name of ['shaderSource','compileShader','attachShader','linkProgram','enableVertexAttribArray','vertexAttribPointer','texParameteri','uniform1i'])gl[name]=()=>{};
  gl.getShaderParameter=()=>!gl.compileFailure;gl.getProgramParameter=()=>true;gl.getUniformLocation=()=>({});gl.isContextLost=()=>!!gl.lost;
  gl.uploads=0;gl.draws=0;gl.texImage2D=()=>{gl.uploads++};gl.bufferData=(_,v)=>{gl.vertices=v};gl.drawArrays=()=>{if(gl.throwDraw)throw new Error('draw failure');gl.draws++};gl.getError=()=>gl.error||0;
  gl.snapshot=()=>({values:[...values].map(([k,v])=>[k,Array.isArray(v)?[...v]:v]),enabled:[...enabled].sort(),textures:[...textures],samplers:[...samplers]});
  gl.created=created;gl.deleted=deleted;return gl;
}

/* Range rectangles and inherited opacity remain DOM-derived; shared canvas ancestor
 * opacity is applied by the browser once, rather than baked into the ink twice. */
{
  const f=fixture(),runs=T.collect(f.host,f.doc,e=>e.style);
  assert.equal(runs.length,2);assert.equal(runs[1].text,'Body');assert.deepEqual(runs[1].rect,f.node.box);
  near(runs[0].opacity,.82*.48);near(runs[1].opacity,.82);
  f.label.hidden=true;assert.equal(T.collect(f.host,f.doc,e=>e.style).length,0);
  f.label.hidden=false;f.bold.style.visibility='hidden';assert.equal(T.collect(f.host,f.doc,e=>e.style).length,1);
}

/* Shared ancestors and repeated text under one element use one style snapshot per
 * collection, while a later collection observes fresh opacity/paint/visibility. */
{
  const f=fixture(),calls=new Map();
  f.label.nodes.push({data:' again',parentElement:f.bold,box:{...f.node.box,left:180,width:35}});
  const styleFor=e=>{calls.set(e,(calls.get(e)||0)+1);return {...e.style}};
  const first=T.collect(f.host,f.doc,styleFor);
  assert.equal(first.length,3);assert.equal(calls.size,5);
  assert.ok([...calls.values()].every(n=>n===1),'single collection reads each element/ancestor once');
  near(first[1].opacity,.82);assert.equal(first[1].paint.color,f.bold.style.color);
  calls.clear();f.label.style.opacity='.4';f.host.style.opacity='.5';f.bold.style.color='#f00';f.prefix.style.opacity='.2';
  const next=T.collect(f.host,f.doc,styleFor);
  assert.ok([...calls.values()].every(n=>n===1));
  near(next[0].opacity,.2*.4*.5);near(next[1].opacity,.4*.5);
  assert.equal(next[1].paint.color,'#f00');assert.equal(next[2].paint.color,'#f00');
  calls.clear();f.host.parentElement.style.visibility='hidden';
  assert.equal(T.collect(f.host,f.doc,styleFor).length,0,'later collection sees changed ancestor visibility');
  assert.ok([...calls.values()].every(n=>n===1));
}

/* Off-origin canvases, DPR and padded UVs: quads follow the DOM box without changing
 * the canvas-sized coordinate frame or moving the semantic label itself. */
{
  const run={key:'r',rect:{left:120,top:230,width:40,height:12},opacity:.4};
  const atlas={width:100,height:50,tiles:new Map([['r',{x:10,y:5,width:88,height:32,pad:2,density:2}]])};
  const v=T.quads([run],atlas,{left:100,top:200,width:200,height:100});
  assert.equal(v.length,30);near(v[0],-.82);near(v[1],.44);near(v[2],.1);near(v[3],.1);near(v[4],.4);
  near(v[5],-.82);near(v[6],.12);near(v[7],.1);near(v[8],.74);
  near(v[10],-.38);near(v[11],.44);
  assert.equal(T.baseline({fontBoundingBoxAscent:11,fontBoundingBoxDescent:3},14,12),11);
}

/* Paint identity changes for content/font/color/layout/DPR/font completion, while
 * the two per-frame properties never invalidate the atlas. */
{
  const f=fixture(),run=T.collect(f.host,f.doc,e=>e.style)[1],key=T.cacheKey(run,2,0);
  assert.equal(T.cacheKey({...run,rect:{...run.rect,left:321,top:456},opacity:.01},2,0),key);
  for(const change of [{text:'Another'},{paint:{...run.paint,font:'16px serif'}},{paint:{...run.paint,color:'#f00'}},{paint:{...run.paint,letterSpacing:'2px'}},{rect:{...run.rect,width:36}}])assert.notEqual(T.cacheKey({...run,...change},2,0),key);
  assert.notEqual(T.cacheKey(run,1,0),key);assert.notEqual(T.cacheKey(run,2,1),key);
  assert.deepEqual(T.shadows('rgba(0, 0, 0, 0.5) 0px 1px 14px'),[{color:'rgba(0, 0, 0, 0.5)',x:0,y:1,blur:14}]);
  assert.deepEqual(T.pack([{width:10,height:20},{width:10,height:20}],64),{width:20,height:20});
  assert.throws(()=>T.pack([{width:65,height:20}],64),/texture size/);
}

/* Integration contract: only successful scene draws suppress ink; movement and opacity
 * upload vertex data only. All touched GL state is restored and no FBO is rebound. */
{
  const f=fixture(),gl=fakeGL(),before=gl.snapshot(),ink=Ink.create(gl,f.host),canvasRect={left:100,top:50,width:400,height:300};
  assert.equal(ink.draw(canvasRect,800,600),true);assert.equal(f.attrs.get('data-display-label-ink'),'gpu');assert.equal(gl.uploads,1);
  assert.deepEqual(gl.snapshot(),before);const first=[...gl.vertices];
  f.node.box.left+=20;f.label.style.opacity='.4';
  assert.equal(ink.draw(canvasRect,800,600),true);assert.equal(gl.uploads,1);assert.notDeepEqual([...gl.vertices],first);
  assert.equal(f.node.data,'Body');assert.equal(f.label.hidden,false);assert.equal(f.label.style.opacity,'.4');assert.equal(f.host.style.opacity,'1');
  f.node.data='Body changed';f.node.box.width=75;assert.equal(ink.draw(canvasRect,800,600),true);assert.equal(gl.uploads,2);
  f.bold.style.color='#fff';assert.equal(ink.draw(canvasRect,800,600),true);assert.equal(gl.uploads,3);
  f.listeners.get('loadingdone')();assert.equal(ink.draw(canvasRect,800,600),true);assert.equal(gl.uploads,4);
  ink.reset();assert.equal(f.attrs.has('data-display-label-ink'),false);
  assert.equal(ink.draw(canvasRect,800,600),true);assert.equal(gl.uploads,4);
  gl.throwDraw=true;assert.equal(ink.draw(canvasRect,800,600),false);assert.equal(f.attrs.has('data-display-label-ink'),false);assert.deepEqual(gl.snapshot(),before);
  gl.throwDraw=false;assert.equal(ink.draw(canvasRect,800,600),true);gl.error=1282;
  assert.equal(ink.draw(canvasRect,800,600),false);assert.equal(f.attrs.has('data-display-label-ink'),false);assert.deepEqual(gl.snapshot(),before);
  ink.dispose();ink.dispose();assert.equal(f.styleParent.children.length,0);assert.equal(f.listeners.size,0);
  for(const resource of gl.created)assert.equal(gl.deleted.filter(r=>r===resource).length,1,`release ${resource.kind}`);
  assert.equal(ink.draw(canvasRect,800,600),false);
}

/* Initialization failure, hidden/empty text, context loss, tiny canvas and no GL all
 * preserve DOM paint. Original host attributes are restored rather than discarded. */
{
  const f=fixture(),gl=fakeGL();f.host.setAttribute('data-display-label-ink','original');gl.compileFailure=true;
  const ink=Ink.create(gl,f.host);assert.equal(ink.draw({width:400,height:300},400,300),false);
  assert.equal(f.attrs.get('data-display-label-ink'),'original');assert.equal(gl.draws,0);assert.equal(gl.created.length,gl.deleted.length);ink.dispose();
  const g=fixture(),gpu=fakeGL(),labels=Ink.create(gpu,g.host),r={width:400,height:300};
  assert.equal(labels.draw(r,400,300),true);gpu.lost=true;assert.equal(labels.draw(r,400,300),false);assert.equal(g.attrs.has('data-display-label-ink'),false);
  gpu.lost=false;g.label.hidden=true;assert.equal(labels.draw(r,400,300),false);g.label.hidden=false;
  assert.equal(labels.draw({width:0,height:300},400,300),false);assert.equal(labels.draw(r,NaN,300),false);
  g.node.box.width=5000;assert.equal(labels.draw(r,400,300),false);assert.equal(g.attrs.has('data-display-label-ink'),false);labels.dispose();
  const absent=Ink.create(null,g.host);assert.equal(absent.draw(r,400,300),false);absent.dispose();
}
console.log('display label ink: DOM layout, atlas caching, GL isolation and fallback PASS');
