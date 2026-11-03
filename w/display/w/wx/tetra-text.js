/* Neutral authored text material on Display's canonical tetrahedron.
 * Source meaning, section controls and ordinary apertures belong to callers. */
(function(root,factory){'use strict';const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.SSSTetraText=api})(typeof globalThis==='object'?globalThis:this,function(root){
'use strict';
const faces=[[0,1,2],[1,3,2],[2,3,0],[3,1,0]],sequence=[0,1,2,3,0,1];
const VS=`#version 300 es
precision highp float;
uniform mat4 uProj,uView,uModel;uniform vec3 uV[4];uniform float uExtent;
out vec2 vUV;out vec3 vW;
const int S[6]=int[6](0,1,2,3,0,1);
void main(){vec3 p=uV[S[gl_VertexID]];vec4 w=uModel*vec4(p,1.);vW=w.xyz;vUV=vec2(p.x/uExtent*.5+.5,.5-p.y/uExtent*.5);gl_Position=uProj*uView*w;}`;
const FS=`#version 300 es
precision highp float;
uniform sampler2D uText;in vec2 vUV;in vec3 vW;out vec4 color;
void main(){vec3 n=normalize(cross(dFdx(vW),dFdy(vW)));float light=mix(.72,1.,clamp(abs(n.z)*1.7320508,0.,1.));color=vec4(texture(uText,vUV).rgb*light,1.);}`;
function transform(m,p){return [0,1,2,3].map(i=>m[i]*p[0]+m[4+i]*p[1]+m[8+i]*p[2]+m[12+i]*p[3])}
function project(vertices,{model,view,proj,rect}){return vertices.map(v=>{const p=transform(proj,transform(view,transform(model,[...v,1])));return {x:(p[0]/p[3]+1)*rect.width/2,y:(1-p[1]/p[3])*rect.height/2,z:p[2]/p[3]}})}
function hull(points){const cross=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x),ps=[...points].sort((a,b)=>a.x-b.x||a.y-b.y),lo=[],hi=[];for(const p of ps){while(lo.length>1&&cross(lo.at(-2),lo.at(-1),p)<=0)lo.pop();lo.push(p)}for(const p of ps.reverse()){while(hi.length>1&&cross(hi.at(-2),hi.at(-1),p)<=0)hi.pop();hi.push(p)}return lo.slice(0,-1).concat(hi.slice(0,-1))}
/* Exact obstacle edges, no specimen-specific camera displacement. */
function freeRectangle(bounds,obstacles){
 const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y,obs=obstacles.filter(b=>b.w>0&&b.h>0&&overlap(bounds,b));
 const xs=[...new Set([bounds.x,bounds.x+bounds.w,...obs.flatMap(b=>[Math.max(bounds.x,b.x),Math.min(bounds.x+bounds.w,b.x+b.w)])])].sort((a,b)=>a-b),ys=[...new Set([bounds.y,bounds.y+bounds.h,...obs.flatMap(b=>[Math.max(bounds.y,b.y),Math.min(bounds.y+bounds.h,b.y+b.h)])])].sort((a,b)=>a-b);let best={...bounds,w:0,h:0};
 for(let i=0;i<xs.length;i++)for(let j=i+1;j<xs.length;j++)for(let k=0;k<ys.length;k++)for(let l=k+1;l<ys.length;l++){const r={x:xs[i],y:ys[k],w:xs[j]-xs[i],h:ys[l]-ys[k]};if(r.w*r.h>best.w*best.h&&!obs.some(b=>overlap(r,b)))best=r}return best;
}
let preparation=null;
function prepare(dependency){
 if(!preparation)preparation=(async()=>{
  const url=dependency('@chenglou/pretext','layout.js'),layout=await import(url);
  for(const key of ['prepareWithSegments','layoutNextLineRange','materializeLineRange'])if(typeof layout[key]!=='function')throw new Error('Incomplete Pretext dependency');
  if(root.document?.fonts){await root.document.fonts.load('16px "SpriteSheet Mono"');await root.document.fonts.ready}
  return layout;
 })().catch(e=>{preparation=null;throw e});return preparation;
}
function program(gl){const p=gl.createProgram();try{for(const [kind,source]of [[gl.VERTEX_SHADER,VS],[gl.FRAGMENT_SHADER,FS]]){const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);gl.deleteShader(s)}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p}catch(e){gl.deleteProgram(p);throw e}}
function create({blocks,pretext,vertices=root.SSSDisplayNavigation.V0,type=root.SSSDisplayType,canvas=root.document.createElement('canvas')}={}){
 const extent=Math.max(...vertices.map(v=>Math.abs(v[0]))),gpu=new Map();let lines=[],sections=[],length=0,offset=0,version=0,key='',paintKey='',size=1,region={x:0,y:0,w:1,h:1},density=1,font='',px=16,lineHeight=24;
 function layout(options){
  const previous=maxScroll()>0?offset/maxScroll():0;size=options.size;region=options.region;density=options.dpr||1;px=type.rankPx(0);lineHeight=px*1.5;
  const family=root.getComputedStyle?.(root.document.documentElement).getPropertyValue('--mono').trim()||'"SpriteSheet Mono", monospace';font=px+'px '+family;
  const next=[region.w,region.h,font,type.fontEpoch(),size,density].join('|');if(key===next)return false;key=next;lines=[];sections=[];let y=0;
  blocks.forEach((block,index)=>{
   if(block.tag==='h2'||block.tag==='h1'){y+=index?lineHeight:0;sections.push({index,text:block.text,y})}
   const prepared=pretext.prepareWithSegments(type.fold(block.text),font);let cursor={segmentIndex:0,graphemeIndex:0};
   for(;;){const range=pretext.layoutNextLineRange(prepared,cursor,Math.max(1,region.w));if(range===null)break;if(range.end.segmentIndex===cursor.segmentIndex&&range.end.graphemeIndex===cursor.graphemeIndex)throw new Error('Authored text layout made no progress');const line=pretext.materializeLineRange(prepared,range);lines.push({text:line.text,y,block:index,heading:/^h/.test(block.tag)});y+=lineHeight;cursor=range.end}
   y+=lineHeight/2;
  });length=y;offset=Math.max(0,Math.min(maxScroll(),previous*maxScroll()));paintKey='';return true;
 }
 function maxScroll(){return Math.max(0,length-region.h,sections.at(-1)?.y||0)}
 function scroll(value){offset=Math.max(0,Math.min(maxScroll(),Number(value)||0));return offset}
 function texture(){
  const next=[key,offset].join('|');if(next===paintKey)return canvas;paintKey=next;
  const n=Math.max(1,Math.ceil(size*density));if(canvas.width!==n)canvas.width=n;if(canvas.height!==n)canvas.height=n;
  const c=canvas.getContext('2d');c.setTransform(density,0,0,density,0,0);c.fillStyle='#0b1714';c.fillRect(0,0,size,size);c.save();c.beginPath();c.rect(region.x,region.y,region.w,region.h);c.clip();c.font=font;c.textBaseline='top';
  for(const line of lines){const y=region.y+line.y-offset;if(y+lineHeight<region.y||y>region.y+region.h)continue;c.fillStyle=line.heading?'#e1f6c7':'#c6d6c9';type.fillText(c,line.text,region.x,y)}c.restore();version++;return canvas;
 }
 function drawGL(args){const {gl,model,view,proj}=args;
  const saved={active:gl.getParameter(gl.ACTIVE_TEXTURE),program:gl.getParameter(gl.CURRENT_PROGRAM),vao:gl.getParameter(gl.VERTEX_ARRAY_BINDING),depth:gl.getParameter(gl.DEPTH_WRITEMASK),color:gl.getParameter(gl.COLOR_WRITEMASK),func:gl.getParameter(gl.DEPTH_FUNC),clear:gl.getParameter(gl.DEPTH_CLEAR_VALUE),flags:[gl.DEPTH_TEST,gl.BLEND,gl.CULL_FACE,gl.SCISSOR_TEST].map(k=>[k,gl.isEnabled(k)])};
  gl.activeTexture(gl.TEXTURE0);const oldTexture=gl.getParameter(gl.TEXTURE_BINDING_2D),flip=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);
  try{let g=gpu.get(gl);if(!g){g={p:program(gl),vao:gl.createVertexArray(),texture:gl.createTexture(),version:-1};gpu.set(gl,g);gl.bindTexture(gl.TEXTURE_2D,g.texture);for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR);for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE)}
   gl.bindTexture(gl.TEXTURE_2D,g.texture);if(g.version!==version){gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);g.version=version}
   gl.useProgram(g.p);gl.bindVertexArray(g.vao);for(const [name,m]of [['uModel',model],['uView',view],['uProj',proj]])gl.uniformMatrix4fv(gl.getUniformLocation(g.p,name),false,m);gl.uniform3fv(gl.getUniformLocation(g.p,'uV'),new Float32Array(vertices.flat()));gl.uniform1f(gl.getUniformLocation(g.p,'uExtent'),extent);gl.uniform1i(gl.getUniformLocation(g.p,'uText'),0);
   gl.disable(gl.SCISSOR_TEST);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.colorMask(true,true,true,true);gl.depthFunc(gl.LEQUAL);gl.clearDepth(1);gl.clear(gl.DEPTH_BUFFER_BIT);gl.drawArrays(gl.TRIANGLE_STRIP,0,sequence.length);
  }finally{gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,flip);gl.bindTexture(gl.TEXTURE_2D,oldTexture);gl.activeTexture(saved.active);gl.useProgram(saved.program);gl.bindVertexArray(saved.vao);gl.depthMask(saved.depth);gl.colorMask(...saved.color);gl.depthFunc(saved.func);gl.clearDepth(saved.clear);for(const [k,on]of saved.flags)on?gl.enable(k):gl.disable(k)}
 }
 function draw2D(args,points){const c=args.context2D;if(!c)return;const n=canvas.width,uv=vertices.map(v=>[(v[0]/extent*.5+.5)*n,(.5-v[1]/extent*.5)*n]);
  for(const face of [...faces].sort((a,b)=>b.reduce((s,i)=>s+points[i].z,0)-a.reduce((s,i)=>s+points[i].z,0))){const [i,j,k]=face,[a,b,d]=face.map(i=>points[i]),[u,v,w]=face.map(i=>uv[i]),det=(v[0]-u[0])*(w[1]-u[1])-(v[1]-u[1])*(w[0]-u[0]);if(Math.abs(det)<1e-8)continue;
   const A=((b.x-a.x)*(w[1]-u[1])-(d.x-a.x)*(v[1]-u[1]))/det,B=((b.y-a.y)*(w[1]-u[1])-(d.y-a.y)*(v[1]-u[1]))/det,C=((d.x-a.x)*(v[0]-u[0])-(b.x-a.x)*(w[0]-u[0]))/det,D=((d.y-a.y)*(v[0]-u[0])-(b.y-a.y)*(w[0]-u[0]))/det;
   c.save();c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.lineTo(d.x,d.y);c.closePath();c.clip();c.transform(A,B,C,D,a.x-A*u[0]-C*u[1],a.y-B*u[0]-D*u[1]);c.drawImage(canvas,0,0);c.restore();
  }
 }
 function draw(args){texture();const points=project(vertices,args);if(args.gl)drawGL(args);else draw2D(args,points);return points}
 function release(){for(const [gl,g]of gpu){gl.deleteTexture(g.texture);gl.deleteVertexArray(g.vao);gl.deleteProgram(g.p)}gpu.clear();canvas.width=canvas.height=1;paintKey=''}
 return Object.freeze({layout,scroll,draw,release,get lines(){return lines},get sections(){return sections},get offset(){return offset},get maxScroll(){return maxScroll()},get length(){return length},get version(){return version},get canvas(){return canvas},get region(){return region},get size(){return size}});
}
return Object.freeze({prepare,create,project,hull,freeRectangle});
});
