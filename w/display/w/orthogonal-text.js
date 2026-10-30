/* A source-neutral, paged text surface on the shared Display tetrahedron. */
(function(root,factory){'use strict';const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.SSSOrthogonalText=api})(typeof globalThis==='object'?globalThis:this,function(root){
'use strict';
const DIM=1024, PAD=62, FONT=54, STEP=70, MAX_LINES=12;
/* Do not truncate words, including long source URLs. Links are attached to
 * every page touched by their containing source block. */
function paginate(blocks,measure,width=DIM-2*PAD,limit=MAX_LINES){
 const pages=[],lines=[],links=new Map();let line='';
 function flushLine(){if(line){lines.push(line);line='';if(lines.length===limit)flushPage()}}
 function flushPage(){if(lines.length){pages.push({lines:lines.splice(0),links:[...links.values()]});links.clear()}}
 for(const block of blocks){
  const words=block.text.trim().split(/\s+/u).filter(Boolean);if(!words.length)continue;
  for(let word of words){
   while(word){let part=word;if(measure(part)>width){const chars=Array.from(word);let end=1;while(end<chars.length&&measure(chars.slice(0,end+1).join(''))<=width)end++;part=chars.slice(0,end).join('');word=chars.slice(end).join('')}else word='';
    if(line&&measure(line+' '+part)>width)flushLine();
    for(const link of block.links||[])links.set(link.href,link);
    line+=line?' '+part:part;
    if(word)flushLine();
   }
  }
  flushLine();
 }
 flushLine();flushPage();return pages;
}
function sourceBlocks(doc,base){
 const safe=href=>{try{const u=new URL(href,base),b=new URL(base);return u.protocol==='mailto:'||u.protocol==='https:'||u.protocol==='http:'&&u.origin===b.origin?u.href:null}catch(_){return null}};
 const blocks=[];
 function visit(el){
  if(['SCRIPT','STYLE','IFRAME','OBJECT'].includes(el.tagName))return;
  if(['UL','OL'].includes(el.tagName)){for(const child of el.children)visit(child);return}
  const raw=el.tagName==='NAV'&&el.childNodes?Array.from(el.childNodes).map(n=>n.nodeType===1?' '+(n.textContent||'')+' ':(n.textContent||'')).join(''):(el.textContent||'');
  const text=raw.replace(/\s+/gu,' ').trim(),links=[];
  const anchors=el.tagName==='A'?[el,...el.querySelectorAll('a')]:[...el.querySelectorAll('a')];
  for(const a of anchors){const href=safe(a.getAttribute('href')||'');if(href)links.push({href,label:(a.textContent||href).trim()})}
  if(text)blocks.push({text,links});
 }
 for(const el of doc.body.children)visit(el);
 return blocks;
}
function compile(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
function vertexShader(){const vertices=root.SSSDisplayNavigation?.V0;if(!vertices||vertices.length!==4)throw new Error('shared tetrahedron required');const vectors=vertices.map(v=>`vec3(${v.map(n=>Number(n).toFixed(12)).join(',')})`).join(',');return `#version 300 es
precision highp float;uniform mat4 uProj,uView,uModel;
const vec3 V[4]=vec3[4](${vectors});const int S[6]=int[6](0,1,2,3,0,1);
out vec2 uv;void main(){vec3 p=V[S[gl_VertexID]];uv=vec2(p.x*0.866025403784+.5,.5-p.y*0.866025403784);gl_Position=uProj*uView*uModel*vec4(p,1.);}`;}
const FS=`#version 300 es
precision highp float;uniform sampler2D image;in vec2 uv;out vec4 color;void main(){color=texture(image,uv);}`;
function makeGL(gl){const p=gl.createProgram(),v=compile(gl,gl.VERTEX_SHADER,vertexShader()),f=compile(gl,gl.FRAGMENT_SHADER,FS);gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));gl.deleteShader(v);gl.deleteShader(f);const texture=gl.createTexture(),vao=gl.createVertexArray();return {p,texture,vao,version:-1}}
function project(P,V,M,p,w,h){let x=[...p,1];for(const a of [M,V,P])x=[0,1,2,3].map(r=>a[r]*x[0]+a[4+r]*x[1]+a[8+r]*x[2]+a[12+r]*x[3]);return {x:(x[0]/x[3]+1)*w/2,y:(1-x[1]/x[3])*h/2,z:x[2]/x[3]}}
function affineTriangle(ctx,img,src,dst){
 const [[x0,y0],[x1,y1],[x2,y2]]=src, [a,b,c]=dst,det=x0*(y1-y2)+x1*(y2-y0)+x2*(y0-y1);if(Math.abs(det)<1e-5)return;
 const coeff=(v0,v1,v2)=>[(v0*(y1-y2)+v1*(y2-y0)+v2*(y0-y1))/det,(v0*(x2-x1)+v1*(x0-x2)+v2*(x1-x0))/det,(v0*(x1*y2-x2*y1)+v1*(x2*y0-x0*y2)+v2*(x0*y1-x1*y0))/det];
 const X=coeff(a.x,b.x,c.x),Y=coeff(a.y,b.y,c.y);ctx.save();ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.closePath();ctx.clip();ctx.transform(X[0],Y[0],X[1],Y[1],X[2],Y[2]);ctx.drawImage(img,0,0);ctx.restore();
}
function create(){
 const canvas=root.document.createElement('canvas');canvas.width=canvas.height=DIM;const c=canvas.getContext('2d');let revision=0,pages=[],blocks=[],index=0,current=null,request=0,active=false,loadedUrl='',font='monospace',fontPx=FONT,linePx=STEP,fitKey='';const gpu=new Map();
 const render=()=>{c.fillStyle='#10191b';c.fillRect(0,0,DIM,DIM);c.fillStyle='#eff5ec';c.textBaseline='top';c.font=fontPx+'px '+font;(pages[index]?.lines||[]).forEach((line,i)=>c.fillText(line,PAD,PAD+i*linePx));revision++;update()};
 const update=()=>{if(!current)return;const {prev,next,count,links,accessible,jump}=current;jump.max=String(pages.length);jump.value=String(index+1);jump.disabled=!pages.length;prev.disabled=index<=0;next.disabled=index>=pages.length-1;count.textContent=(index+1)+' / '+pages.length;accessible.textContent=(pages[index]?.lines||[]).join('\n');links.replaceChildren();for(const link of pages[index]?.links||[]){const a=root.document.createElement('a');a.href=link.href;a.textContent=link.label;a.rel='noreferrer';links.append(a)}};
 async function mount({url,language,controls}){
  const serial=++request;active=true;const same=url===loadedUrl&&pages.length>0;if(!same){pages=[];blocks=[];index=0;fitKey=''}
  const doc=root.document,prev=doc.createElement('button'),next=doc.createElement('button'),count=doc.createElement('span'),jump=doc.createElement('input'),links=doc.createElement('nav'),accessible=doc.createElement('p');
  prev.type=next.type='button';prev.textContent=language==='de'?'Zurück':'Previous';next.textContent=language==='de'?'Weiter':'Next';links.setAttribute('aria-label',language==='de'?'Links auf dieser Seite':'Links on this page');accessible.className='orthogonal-text-accessible';accessible.setAttribute('aria-live','polite');
  jump.type='number';jump.min='1';jump.setAttribute('aria-label',language==='de'?'Seite':'Page');jump.onchange=()=>{const n=Number(jump.value);if(Number.isFinite(n)&&pages.length){index=Math.max(0,Math.min(pages.length-1,Math.floor(n)-1));render()}};prev.onclick=()=>{if(index>0){index--;render()}};next.onclick=()=>{if(index<pages.length-1){index++;render()}};controls.append(prev,count,next,jump,links,accessible);current={prev,next,count,links,accessible,jump};count.textContent=language==='de'?'Lädt …':'Loading …';prev.disabled=next.disabled=true;
  if(same){render();return true}
  try{if(root.document.fonts?.ready)await root.document.fonts.ready;if(serial!==request)return false;font=root.getComputedStyle?.(root.document.documentElement)?.getPropertyValue('--mono')?.trim()||'monospace';const target=new URL(url,root.location.href);if(target.origin!==root.location.origin)throw Error('non-local source');const response=await root.fetch(target.href,{credentials:'same-origin'});if(!response.ok)throw Error('HTTP '+response.status);const doc=new root.DOMParser().parseFromString(await response.text(),'text/html');if(serial!==request)return false;blocks=sourceBlocks(doc,target.href);c.font=fontPx+'px '+font;pages=paginate(blocks,s=>c.measureText(s).width,DIM-2*PAD,Math.max(1,Math.floor((DIM-2*PAD)/linePx)));if(!pages.length)throw Error('empty notice');loadedUrl=url;render();return true}
  catch(e){if(serial===request){count.textContent=language==='de'?'Text nicht verfügbar':'Text unavailable';accessible.textContent=String(e.message||e)}return false}
 }
 function unmount(){request++;active=false;current=null}
 function draw({gl,context2D,proj,view,model,rect,viewRect}){
  if(!active||!pages.length)return;
  const span=Math.max(1,Math.min(viewRect?.width||rect.width,viewRect?.height||rect.height));const nextFont=Math.max(28,Math.min(100,Math.ceil(16*DIM/(span*.49))));const key=String(nextFont);if(key!==fitKey&&blocks.length){const fraction=pages.length>1?index/(pages.length-1):0;fontPx=nextFont;linePx=Math.ceil(fontPx*1.2);c.font=fontPx+'px '+font;pages=paginate(blocks,s=>c.measureText(s).width,DIM-2*PAD,Math.max(1,Math.floor((DIM-2*PAD)/linePx)));index=Math.min(pages.length-1,Math.round(fraction*Math.max(0,pages.length-1)));fitKey=key;render()}
  if(gl){let g=gpu.get(gl);if(!g){g=makeGL(gl);gpu.set(gl,g)}
   const old={program:gl.getParameter(gl.CURRENT_PROGRAM),vao:gl.getParameter(gl.VERTEX_ARRAY_BINDING),active:gl.getParameter(gl.ACTIVE_TEXTURE),depth:gl.getParameter(gl.DEPTH_WRITEMASK),depthFunc:gl.getParameter(gl.DEPTH_FUNC),blend:gl.isEnabled(gl.BLEND),test:gl.isEnabled(gl.DEPTH_TEST),cull:gl.isEnabled(gl.CULL_FACE)};gl.activeTexture(gl.TEXTURE0);const texture=gl.getParameter(gl.TEXTURE_BINDING_2D),flip=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);
   try{gl.bindTexture(gl.TEXTURE_2D,g.texture);if(g.version!==revision){gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);g.version=revision}gl.useProgram(g.p);gl.bindVertexArray(g.vao);gl.uniformMatrix4fv(gl.getUniformLocation(g.p,'uProj'),false,proj);gl.uniformMatrix4fv(gl.getUniformLocation(g.p,'uView'),false,view);gl.uniformMatrix4fv(gl.getUniformLocation(g.p,'uModel'),false,model);gl.uniform1i(gl.getUniformLocation(g.p,'image'),0);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.depthFunc(gl.LEQUAL);gl.drawArrays(gl.TRIANGLE_STRIP,0,6)}finally{gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,flip);gl.activeTexture(old.active);gl.useProgram(old.program);gl.bindVertexArray(old.vao);gl.depthMask(old.depth);gl.depthFunc(old.depthFunc);for(const [k,on] of [[gl.BLEND,old.blend],[gl.DEPTH_TEST,old.test],[gl.CULL_FACE,old.cull]])on?gl.enable(k):gl.disable(k)}
  }else if(context2D){const vs=root.SSSDisplayNavigation.V0,uv=[[DIM,0],[0,DIM],[0,0],[DIM,DIM]],faces=[[0,1,2],[1,2,3],[2,3,0],[3,0,1]];const pts=vs.map(p=>project(proj,view,model,p,rect.width,rect.height));faces.sort((a,b)=>b.reduce((s,i)=>s+pts[i].z,0)-a.reduce((s,i)=>s+pts[i].z,0));for(const f of faces)affineTriangle(context2D,canvas,f.map(i=>uv[i]),f.map(i=>pts[i]))}
 }
 function dispose(){unmount();for(const [gl,g] of gpu){gl.deleteTexture(g.texture);gl.deleteVertexArray(g.vao);gl.deleteProgram(g.p)}gpu.clear()}
 return Object.freeze({mount,unmount,draw,dispose});
}
return Object.freeze({create,paginate,sourceBlocks});
});
