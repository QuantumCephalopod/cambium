/* Derived field-label ink for the existing glass scene. DOM text and buttons remain
 * authoritative. Call draw after positioning labels, with the scene FBO bound;
 * call reset on every frame that does not use glass, and dispose with the renderer.
 * Text/style/layout changes rebuild a compact atlas; movement/opacity only move quads. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SSSDisplayLabelInk=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const ATTR='data-display-label-ink',styles=new WeakMap();
  const VERTEX=`#version 300 es
  layout(location=0) in vec2 aPosition;
  layout(location=1) in vec2 aUV;
  layout(location=2) in float aOpacity;
  out vec2 vUV; out float vOpacity;
  void main(){vUV=aUV;vOpacity=aOpacity;gl_Position=vec4(aPosition,0.,1.);}`;
  const FRAGMENT=`#version 300 es
  precision highp float;
  uniform sampler2D uAtlas;
  in vec2 vUV; in float vOpacity; out vec4 ink;
  void main(){ink=texture(uAtlas,vUV)*vOpacity;}`;
  const finite=(x,fallback=0)=>Number.isFinite(Number(x))?Number(x):fallback;
  const px=x=>finite(parseFloat(x));
  const quantize=x=>Math.round(x*64)/64;
  function rect(r){return {left:finite(r.left),top:finite(r.top),width:Math.max(0,finite(r.width)),height:Math.max(0,finite(r.height))}}

  function acquireStyle(doc){
    let record=styles.get(doc);
    if(!record){
      const node=doc.createElement('style');
      node.textContent=`[${ATTR}="gpu"] .field-label,[${ATTR}="gpu"] .field-label *{-webkit-text-fill-color:transparent!important;text-shadow:none!important;text-decoration-color:transparent!important}`;
      (doc.head||doc.documentElement).appendChild(node);
      record={node,users:0};styles.set(doc,record);
    }
    record.users++;
    return ()=>{if(--record.users===0){record.node.remove();styles.delete(doc)}};
  }
  function paintStyle(cs){
    return {
      font:cs.font||`${cs.fontStyle||'normal'} ${cs.fontWeight||'400'} ${cs.fontSize||'12px'} ${cs.fontFamily||'sans-serif'}`,
      size:px(cs.fontSize)||12,color:cs.color||'#fff',letterSpacing:cs.letterSpacing||'normal',wordSpacing:cs.wordSpacing||'normal',
      direction:cs.direction||'ltr',kerning:cs.fontKerning||'auto',stretch:cs.fontStretch||'normal',caps:cs.fontVariantCaps||'normal',
      transform:cs.textTransform||'none',shadow:cs.textShadow||'none',decoration:cs.textDecorationLine||'none',
      decorationColor:cs.textDecorationColor||cs.color||'#fff',thickness:cs.textDecorationThickness||'auto',underlineOffset:cs.textUnderlineOffset||'auto'
    };
  }
  /* Paint identity deliberately excludes viewport position and ancestor opacity. */
  function cacheKey(run,density,fontEpoch){
    return JSON.stringify([run.text,run.paint,quantize(run.rect.width),quantize(run.rect.height),density,fontEpoch]);
  }
  function transformed(text,kind){
    if(kind==='uppercase')return text.toLocaleUpperCase();
    if(kind==='lowercase')return text.toLocaleLowerCase();
    if(kind==='capitalize')return text.replace(/(^|\s)(\S)/gu,(_,a,b)=>a+b.toLocaleUpperCase());
    return text;
  }
  function effectiveOpacity(element,host,getStyle){
    let opacity=1,reached=false;
    for(let e=element;e;e=e.parentElement){
      const s=getStyle(e);
      if(e.hidden||s.display==='none'||s.visibility==='hidden'||s.visibility==='collapse')return 0;
      if(!reached)opacity*=Math.max(0,Math.min(1,finite(s.opacity,1)));
      if(e===host)reached=true; // Shared canvas ancestors apply their opacity to both surfaces.
    }
    return opacity;
  }
  function collect(host,doc,getStyle){
    const runs=[];
    for(const label of host.querySelectorAll('.field-label')){
      const walk=doc.createTreeWalker(label,4); // NodeFilter.SHOW_TEXT, including renderer-owned spans/b.
      for(let node=walk.nextNode();node;node=walk.nextNode()){
        if(!node.data||!node.data.trim())continue;
        const element=node.parentElement,opacity=effectiveOpacity(element,host,getStyle);
        if(opacity<=0)continue;
        const range=doc.createRange();range.selectNodeContents(node);
        const boxes=Array.from(range.getClientRects()).filter(r=>r.width>0&&r.height>0);
        if(!boxes.length)continue;
        const paint=paintStyle(getStyle(element));
        if(boxes.length===1){runs.push({text:transformed(node.data,paint.transform),paint,rect:rect(boxes[0]),opacity});continue}
        // Wrapped runs: derive each line from character ranges rather than guessing wrap widths.
        let line=null,offset=0;
        for(const char of node.data){
          range.setStart(node,offset);offset+=char.length;range.setEnd(node,offset);
          const boxes=Array.from(range.getClientRects()).filter(r=>r.width>0&&r.height>0);
          if(boxes.length!==1)throw new Error('ambiguous label text fragment');
          const r=rect(boxes[0]);
          if(!line||Math.abs(line.rect.top-r.top)>.5||Math.abs(line.rect.height-r.height)>.5){
            line={text:char,paint,rect:r,opacity};runs.push(line);
          }else{
            const right=Math.max(line.rect.left+line.rect.width,r.left+r.width);
            line.rect.left=Math.min(line.rect.left,r.left);line.rect.width=right-line.rect.left;line.text+=char;
          }
        }
        for(const run of runs)if(run.paint===paint)run.text=transformed(run.text,paint.transform);
      }
    }
    return runs;
  }
  function shadows(value){
    if(!value||value==='none')return [];
    const layers=value.match(/(?:[^,(]|\([^)]*\))+/g)||[];
    return layers.map(layer=>{
      const color=layer.match(/(?:rgba?|hsla?|color)\([^)]*\)|#[\da-f]+|\b[a-z]+\b/i);
      if(!color)throw new Error('unsupported text shadow');
      const lengths=layer.replace(color[0],'').match(/-?(?:\d*\.)?\d+(?:px)?/g)||[];
      if(lengths.length<2||lengths.length>3)throw new Error('unsupported text shadow');
      return {color:color[0],x:px(lengths[0]),y:px(lengths[1]),blur:Math.max(0,px(lengths[2]))};
    });
  }
  function configure(ctx,p){
    ctx.font=p.font;ctx.textBaseline='alphabetic';ctx.textAlign='left';ctx.direction=p.direction;
    if('fontKerning' in ctx)ctx.fontKerning=p.kerning;
    if('fontStretch' in ctx)ctx.fontStretch=p.stretch;
    if('fontVariantCaps' in ctx)ctx.fontVariantCaps=p.caps;
    if('letterSpacing' in ctx)ctx.letterSpacing=p.letterSpacing==='normal'?'0px':p.letterSpacing;
    if('wordSpacing' in ctx)ctx.wordSpacing=p.wordSpacing==='normal'?'0px':p.wordSpacing;
  }
  function baseline(metrics,height,size){
    const ascent=finite(metrics.fontBoundingBoxAscent,finite(metrics.actualBoundingBoxAscent,size*.8));
    const descent=finite(metrics.fontBoundingBoxDescent,finite(metrics.actualBoundingBoxDescent,size*.2));
    return (height-ascent-descent)/2+ascent;
  }
  function text(ctx,run,x,y){
    const p=run.paint,spacing=p.letterSpacing==='normal'?0:px(p.letterSpacing),word=p.wordSpacing==='normal'?0:px(p.wordSpacing);
    if((!spacing||'letterSpacing' in ctx)&&(!word||'wordSpacing' in ctx)){ctx.fillText(run.text,x,y);return}
    // Older Canvas2D implementations: preserve grapheme clusters and measured prefix kerning.
    const chars=typeof Intl==='object'&&Intl.Segmenter?Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(run.text),s=>s.segment):Array.from(run.text);
    let prefix='',extra=0;
    for(const char of chars){
      ctx.fillText(char,x+ctx.measureText(prefix).width+extra,y);
      prefix+=char;if(!('letterSpacing' in ctx))extra+=spacing;if(!('wordSpacing' in ctx)&&/\s/u.test(char))extra+=word;
    }
  }
  function makeTile(doc,run,density){
    const canvas=doc.createElement('canvas'),ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('Canvas2D label ink unavailable');
    configure(ctx,run.paint);
    const metrics=ctx.measureText(run.text),layers=shadows(run.paint.shadow);
    const pad=Math.ceil(Math.max(3,finite(metrics.actualBoundingBoxLeft),finite(metrics.actualBoundingBoxRight)-run.rect.width,
      ...layers.map(s=>Math.max(Math.abs(s.x),Math.abs(s.y))+s.blur*2+2)));
    const width=Math.ceil((run.rect.width+pad*2)*density),height=Math.ceil((run.rect.height+pad*2)*density);
    canvas.width=width;canvas.height=height;ctx.setTransform(density,0,0,density,0,0);configure(ctx,run.paint);
    const y=pad+baseline(metrics,run.rect.height,run.paint.size);
    // Paint each shadow with its source ink outside the tile, then paint the letters once.
    const shift=width/density*2;
    for(const s of layers.slice().reverse()){
      ctx.shadowColor=s.color;ctx.shadowBlur=s.blur*density;ctx.shadowOffsetX=(s.x-shift)*density;ctx.shadowOffsetY=s.y*density;
      ctx.fillStyle=run.paint.color;text(ctx,run,pad+shift,y);
    }
    ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;
    ctx.fillStyle=run.paint.color;text(ctx,run,pad,y);
    if(run.paint.decoration!=='none'){
      const p=run.paint,thickness=p.thickness==='auto'||p.thickness==='from-font'?Math.max(.5,p.size/14):px(p.thickness);
      ctx.fillStyle=p.decorationColor;
      for(const kind of p.decoration.split(/\s+/)){
        const offset=kind==='underline'?(p.underlineOffset==='auto'?p.size*.1:px(p.underlineOffset)):kind==='line-through'?-p.size*.3:kind==='overline'?-p.size*.8:null;
        if(offset!==null)ctx.fillRect(pad,y+offset,run.rect.width,thickness);
      }
    }
    return {canvas,width,height,pad,density};
  }
  function pack(tiles,maxSize){
    const area=tiles.reduce((sum,t)=>sum+t.width*t.height,0),widest=Math.max(1,...tiles.map(t=>t.width));
    let width=Math.min(maxSize,Math.max(widest,Math.ceil(Math.sqrt(area))));
    for(;;){
      let x=0,y=0,row=0;
      for(const tile of tiles){
        if(tile.width>width||tile.height>maxSize)throw new Error('label atlas exceeds texture size');
        if(x+tile.width>width){x=0;y+=row;row=0}
        tile.x=x;tile.y=y;x+=tile.width;row=Math.max(row,tile.height);
      }
      const height=Math.max(1,y+row);
      if(height<=maxSize)return {width,height};
      if(width===maxSize)throw new Error('label atlas exceeds texture size');
      width=Math.min(maxSize,width*2);
    }
  }
  function quads(runs,atlas,canvasRect){
    const c=rect(canvasRect),out=new Float32Array(runs.length*30);let at=0;
    for(const run of runs){
      const t=atlas.tiles.get(run.key),x=run.rect.left-t.pad,y=run.rect.top-t.pad;
      const left=2*(x-c.left)/c.width-1,right=2*(x+t.width/t.density-c.left)/c.width-1;
      const top=1-2*(y-c.top)/c.height,bottom=1-2*(y+t.height/t.density-c.top)/c.height;
      const u=t.x/atlas.width,v=t.y/atlas.height,U=(t.x+t.width)/atlas.width,V=(t.y+t.height)/atlas.height;
      for(const p of [[left,top,u,v],[left,bottom,u,V],[right,top,U,v],[right,top,U,v],[left,bottom,u,V],[right,bottom,U,V]]){
        out.set([...p,run.opacity],at);at+=5;
      }
    }
    return out;
  }
  function state(gl){
    const saved={program:gl.getParameter(gl.CURRENT_PROGRAM),vao:gl.getParameter(gl.VERTEX_ARRAY_BINDING),buffer:gl.getParameter(gl.ARRAY_BUFFER_BINDING),
      active:gl.getParameter(gl.ACTIVE_TEXTURE),viewport:gl.getParameter(gl.VIEWPORT),mask:gl.getParameter(gl.COLOR_WRITEMASK),depthMask:gl.getParameter(gl.DEPTH_WRITEMASK),
      srcRGB:gl.getParameter(gl.BLEND_SRC_RGB),dstRGB:gl.getParameter(gl.BLEND_DST_RGB),srcAlpha:gl.getParameter(gl.BLEND_SRC_ALPHA),dstAlpha:gl.getParameter(gl.BLEND_DST_ALPHA),
      eqRGB:gl.getParameter(gl.BLEND_EQUATION_RGB),eqAlpha:gl.getParameter(gl.BLEND_EQUATION_ALPHA),flip:gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL),premult:gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL),
      alignment:gl.getParameter(gl.UNPACK_ALIGNMENT),unpackBuffer:gl.getParameter(gl.PIXEL_UNPACK_BUFFER_BINDING),enabled:new Map()};
    for(const cap of [gl.BLEND,gl.DEPTH_TEST,gl.CULL_FACE,gl.SCISSOR_TEST,gl.STENCIL_TEST,gl.RASTERIZER_DISCARD])saved.enabled.set(cap,gl.isEnabled(cap));
    gl.activeTexture(gl.TEXTURE0);saved.texture=gl.getParameter(gl.TEXTURE_BINDING_2D);saved.sampler=gl.getParameter(gl.SAMPLER_BINDING);
    return saved;
  }
  function restore(gl,s){
    gl.useProgram(s.program);gl.bindVertexArray(s.vao);gl.bindBuffer(gl.ARRAY_BUFFER,s.buffer);gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER,s.unpackBuffer);
    gl.bindTexture(gl.TEXTURE_2D,s.texture);gl.bindSampler(0,s.sampler);gl.activeTexture(s.active);
    gl.viewport(...s.viewport);gl.colorMask(...s.mask);gl.depthMask(s.depthMask);
    gl.blendFuncSeparate(s.srcRGB,s.dstRGB,s.srcAlpha,s.dstAlpha);gl.blendEquationSeparate(s.eqRGB,s.eqAlpha);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,s.flip);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,s.premult);gl.pixelStorei(gl.UNPACK_ALIGNMENT,s.alignment);
    for(const [cap,on] of s.enabled)if(on)gl.enable(cap);else gl.disable(cap);
  }
  function resources(gl){
    const shaders=[],owned={};
    try{
      for(const [type,source] of [[gl.VERTEX_SHADER,VERTEX],[gl.FRAGMENT_SHADER,FRAGMENT]]){
        const shader=gl.createShader(type);if(!shader)throw new Error('label shader unavailable');shaders.push(shader);
        gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error('label shader compilation failed');
      }
      owned.program=gl.createProgram();if(!owned.program)throw new Error('label program unavailable');
      for(const shader of shaders)gl.attachShader(owned.program,shader);
      gl.linkProgram(owned.program);if(!gl.getProgramParameter(owned.program,gl.LINK_STATUS))throw new Error('label program linking failed');
      owned.vao=gl.createVertexArray();owned.buffer=gl.createBuffer();owned.texture=gl.createTexture();
      if(!owned.vao||!owned.buffer||!owned.texture)throw new Error('label GL resources unavailable');
      gl.bindVertexArray(owned.vao);gl.bindBuffer(gl.ARRAY_BUFFER,owned.buffer);
      for(const [location,size,offset] of [[0,2,0],[1,2,8],[2,1,16]]){gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,size,gl.FLOAT,false,20,offset)}
      gl.bindTexture(gl.TEXTURE_2D,owned.texture);
      for(const [name,value] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,name,value);
      owned.uniform=gl.getUniformLocation(owned.program,'uAtlas');owned.maxSize=gl.getParameter(gl.MAX_TEXTURE_SIZE);
      return owned;
    }catch(error){release(gl,owned);throw error}
    finally{for(const shader of shaders)gl.deleteShader(shader)}
  }
  function release(gl,r){
    if(!r)return;
    for(const [name,method] of [['texture','deleteTexture'],['buffer','deleteBuffer'],['vao','deleteVertexArray'],['program','deleteProgram']])if(r[name])gl[method](r[name]);
  }
  function create(gl,labelHost){
    const doc=labelHost?.ownerDocument,getStyle=doc?.defaultView?.getComputedStyle?.bind(doc.defaultView),original=labelHost?.getAttribute(ATTR);
    let disposed=false,gpu=null,atlas=null,fontEpoch=0,releaseStyle=null;
    const fonts=doc?.fonts,onFonts=()=>{fontEpoch++};
    fonts?.addEventListener?.('loadingdone',onFonts);fonts?.addEventListener?.('loadingerror',onFonts);
    fonts?.ready?.then(()=>{if(!disposed)onFonts()});
    function reset(){
      if(!labelHost)return;
      if(original===null||original===undefined)labelHost.removeAttribute(ATTR);else labelHost.setAttribute(ATTR,original);
    }
    function draw(canvasRect,bufferWidth,bufferHeight){
      reset();
      const c=rect(canvasRect||{});
      if(disposed||!gl||!labelHost||!doc||!getStyle||c.width<=0||c.height<=0||!Number.isFinite(bufferWidth)||!Number.isFinite(bufferHeight)||bufferWidth<=0||bufferHeight<=0)return false;
      if(gl.isContextLost()){release(gl,gpu);gpu=null;atlas=null;return false}
      let saved=null;
      try{
        const runs=collect(labelHost,doc,getStyle);
        if(!runs.length)return false;
        const density=Math.max(bufferWidth/c.width,bufferHeight/c.height);
        for(const run of runs)run.key=cacheKey(run,density,fontEpoch);
        saved=state(gl);if(!gpu)gpu=resources(gl);
        gl.bindTexture(gl.TEXTURE_2D,gpu.texture);gl.bindSampler(0,null);
        if(!atlas||runs.some(run=>!atlas.tiles.has(run.key))){
          const tiles=new Map();
          for(const run of runs)if(!tiles.has(run.key))tiles.set(run.key,makeTile(doc,run,density));
          const size=pack([...tiles.values()],gpu.maxSize),image=doc.createElement('canvas');image.width=size.width;image.height=size.height;
          const ctx=image.getContext('2d');if(!ctx)throw new Error('Canvas2D label atlas unavailable');
          for(const tile of tiles.values())ctx.drawImage(tile.canvas,tile.x,tile.y);
          gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER,null);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
          atlas={...size,tiles};
        }
        const vertices=quads(runs,atlas,c);
        gl.viewport(0,0,bufferWidth,bufferHeight);gl.colorMask(true,true,true,true);gl.depthMask(false);
        for(const cap of [gl.DEPTH_TEST,gl.CULL_FACE,gl.SCISSOR_TEST,gl.STENCIL_TEST,gl.RASTERIZER_DISCARD])gl.disable(cap);
        gl.enable(gl.BLEND);gl.blendEquationSeparate(gl.FUNC_ADD,gl.FUNC_ADD);gl.blendFuncSeparate(gl.ONE,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(gpu.program);gl.uniform1i(gpu.uniform,0);gl.bindVertexArray(gpu.vao);gl.bindBuffer(gl.ARRAY_BUFFER,gpu.buffer);
        gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,vertices.length/5);
        if(gl.getError()!==gl.NO_ERROR)throw new Error('label GL drawing failed');
        if(!releaseStyle)releaseStyle=acquireStyle(doc);
        labelHost.setAttribute(ATTR,'gpu');return true;
      }catch(_){atlas=null;reset();return false}
      finally{if(saved)restore(gl,saved)}
    }
    function dispose(){
      if(disposed)return;disposed=true;reset();release(gl,gpu);gpu=null;atlas=null;
      releaseStyle?.();releaseStyle=null;fonts?.removeEventListener?.('loadingdone',onFonts);fonts?.removeEventListener?.('loadingerror',onFonts);
    }
    return Object.freeze({draw,reset,dispose});
  }
  return Object.freeze({create,_test:Object.freeze({cacheKey,baseline,quads,collect,pack,shadows})});
});
