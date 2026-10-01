/* Text is tissue (organism RITUAL "Type is body"). Each letter is its own body: a signed distance field of
 * its own outline. Its fat offsets that outline; letters close enough fuse through an exponential smooth
 * union into one mass. A press deflates the letters under it to their bare glyph where they stand; position
 * never moves. No second layer is laid over the text. Monochrome. The caller owns the canvas and says which
 * letters exist where; what they mean stays the caller's. */
(function(root,factory){
  'use strict';const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.SSSDisplayTextTissue=api;
})(typeof globalThis==='object'?globalThis:this,function(root){
  'use strict';
  const EM=32,PAD=40,COLS=20,ROWS=16,FACE='"SpriteSheet Mono", system-ui, sans-serif';
  /* press: 1 at the centre of a press, 0 at its rim; the strongest press wins */
  function pressAt(x,y,presses){let p=0;for(const q of presses||[]){const d=Math.hypot(x-q.x,y-q.y)/Math.max(1e-6,q.r);if(d<1){const t=1-d;p=Math.max(p,t*t*(3-2*t))}}return p}
  /* a letter's effective fat after the press, and the softness of its union */
  function fatAfter(fat,press){return Math.max(0,fat)*(1-press)}
  function edt1d(f,n,d,v,z){
    let k=0;v[0]=0;z[0]=-1e20;z[1]=1e20;
    for(let q=1;q<n;q++){let s=((f[q]+q*q)-(f[v[k]]+v[k]*v[k]))/(2*q-2*v[k]);
      while(s<=z[k]){k--;s=((f[q]+q*q)-(f[v[k]]+v[k]*v[k]))/(2*q-2*v[k])}k++;v[k]=q;z[k]=s;z[k+1]=1e20}
    k=0;for(let q=0;q<n;q++){while(z[k+1]<q)k++;d[q]=(q-v[k])*(q-v[k])+f[v[k]]}
  }
  function edt2d(g,w,h){
    const n=Math.max(w,h),f=new Float64Array(n),d=new Float64Array(n),v=new Int32Array(n),z=new Float64Array(n+1);
    for(let x=0;x<w;x++){for(let y=0;y<h;y++)f[y]=g[y*w+x];edt1d(f,h,d,v,z);for(let y=0;y<h;y++)g[y*w+x]=d[y]}
    for(let y=0;y<h;y++){for(let x=0;x<w;x++)f[x]=g[y*w+x];edt1d(f,w,d,v,z);for(let x=0;x<w;x++)g[y*w+x]=d[x]}
  }
  function create(canvas){
    const gl=canvas?.getContext?.('webgl2',{alpha:true,premultipliedAlpha:true,antialias:false,preserveDrawingBuffer:true});
    if(!gl)return null;
    const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o};
    const prog=(v,f)=>{const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,v));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p};
    const body=prog(`#version 300 es
    layout(location=0) in vec4 iA; layout(location=1) in vec4 iB;
    uniform vec2 res,cell,atlasPx;uniform float pad,cols;
    out vec2 vUV,vC;out float vR,vS,vW,vSc;
    void main(){
      /* iA: anchor x,y (top-left of the glyph, device px), slot, scale (px per atlas px); iB: angle, fat px, softness px, weight */
      vec2 c=vec2(gl_VertexID&1,gl_VertexID>>1);float sc=iA.w;
      vec2 local=(-vec2(pad)+c*cell)*sc;float a=iB.x;vec2 rot=vec2(cos(a)*local.x-sin(a)*local.y,sin(a)*local.x+cos(a)*local.y);
      vec2 px=iA.xy+rot;vec2 o=vec2(mod(iA.z,cols),floor(iA.z/cols))*cell;
      vUV=(o+c*cell)/atlasPx;vC=c;vR=iB.y;vS=iB.z;vW=iB.w;vSc=sc;
      vec2 n=px/res*2.-1.;gl_Position=vec4(n.x,-n.y,0.,1.);
    }`,`#version 300 es
    precision highp float;uniform sampler2D A;uniform float pad,scale;
    in vec2 vUV,vC;in float vR,vS,vW,vSc;out vec4 o;
    void main(){
      float d=(texture(A,vUV).r-.5)*2.*pad*vSc;        /* device px */
      float e=exp(min(-(d-vR)/vS,9.));
      float edge=min(min(vC.x,1.-vC.x),min(vC.y,1.-vC.y));
      o=vec4(e*vW*smoothstep(0.,.12,edge)*scale);
    }`);
    const full=prog(`#version 300 es
    void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}`,`#version 300 es
    precision highp float;uniform sampler2D F;uniform vec2 res;uniform float scale,alpha;uniform vec3 ink;out vec4 o;
    void main(){float S=texture(F,gl_FragCoord.xy/res).r/scale,L=log(max(S,1e-6));
      float a=clamp(L/max(fwidth(L),1e-4)+.5,0.,1.)*alpha;o=vec4(ink*a,a);}`);
    const half=!!gl.getExtension('EXT_color_buffer_float');
    const cvs=document.createElement('canvas'),cx=cvs.getContext('2d',{willReadFrequently:true});
    cx.font=EM+'px '+FACE;const cw=Math.ceil(cx.measureText('M').width)+PAD*2+8,ch=Math.ceil(EM*1.3)+PAD*2;cvs.width=cw;cvs.height=ch;
    const atlas=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,atlas);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.R8,cw*COLS,ch*ROWS,0,gl.RED,gl.UNSIGNED_BYTE,null);
    for(const [p,v] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,p,v);
    const slots=new Map();
    function slot(chr){
      let s=slots.get(chr);if(s!==undefined)return s;s=slots.size;if(s>=COLS*ROWS)return -1;slots.set(chr,s);
      cx.clearRect(0,0,cw,ch);cx.font=EM+'px '+FACE;cx.textBaseline='top';cx.fillStyle='#fff';cx.fillText(chr,PAD,PAD);
      const a=cx.getImageData(0,0,cw,ch).data,N=cw*ch,gi=new Float64Array(N),go=new Float64Array(N);
      for(let p=0;p<N;p++){const inside=a[p*4+3]>=128;go[p]=inside?0:1e20;gi[p]=inside?1e20:0}
      edt2d(go,cw,ch);edt2d(gi,cw,ch);const out=new Uint8Array(N);
      for(let p=0;p<N;p++){const sd=Math.sqrt(go[p])-Math.sqrt(gi[p]);out[p]=Math.max(0,Math.min(255,Math.round((.5+sd/(2*PAD))*255)))}
      gl.bindTexture(gl.TEXTURE_2D,atlas);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texSubImage2D(gl.TEXTURE_2D,0,(s%COLS)*cw,Math.floor(s/COLS)*ch,cw,ch,gl.RED,gl.UNSIGNED_BYTE,out);
      return s;
    }
    const field=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,field);
    for(const [p,v] of [[gl.TEXTURE_MIN_FILTER,gl.NEAREST],[gl.TEXTURE_MAG_FILTER,gl.NEAREST],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,p,v);
    const fb=gl.createFramebuffer(),vao=gl.createVertexArray(),buf=gl.createBuffer(),empty=gl.createVertexArray();
    gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,4,gl.FLOAT,false,32,0);gl.vertexAttribDivisor(0,1);
    gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,4,gl.FLOAT,false,32,16);gl.vertexAttribDivisor(1,1);gl.bindVertexArray(null);
    const u=(p,n)=>gl.getUniformLocation(p,n),UB={A:u(body,'A'),res:u(body,'res'),cell:u(body,'cell'),atlasPx:u(body,'atlasPx'),pad:u(body,'pad'),cols:u(body,'cols'),scale:u(body,'scale')},UC={F:u(full,'F'),res:u(full,'res'),scale:u(full,'scale'),ink:u(full,'ink'),alpha:u(full,'alpha')};
    const SCALE=half?1:1/16;let W=0,H=0,data=new Float32Array(0);
    /* letters: [{ch, x, y (top-left in CSS px), size (CSS px), angle, fat (0..1, multiple of size), weight (0..1)}] */
    function draw(letters,{width,height,dpr=1,presses=[],ink=[.87,.95,.92],alpha=1,tissue=.3}={}){
      const w=Math.max(1,Math.round(width*dpr)),h=Math.max(1,Math.round(height*dpr));
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
      if(W!==w||H!==h){gl.bindTexture(gl.TEXTURE_2D,field);
        if(half)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA16F,w,h,0,gl.RGBA,gl.HALF_FLOAT,null);else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
        gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,field,0);W=w;H=h}
      const n=letters.length;if(data.length<n*8)data=new Float32Array(Math.ceil(n*1.5)*8);let k=0;
      for(const L of letters){
        if(!L||L.ch===' '||!(L.weight>0))continue;const s=slot(L.ch);if(s<0)continue;
        const size=L.size*dpr,sc=size/EM,press=pressAt(L.cx??L.x,L.cy??L.y,presses),fat=fatAfter(L.fat,press)*tissue*size;
        data[k++]=L.x*dpr;data[k++]=L.y*dpr;data[k++]=s;data[k++]=sc;
        data[k++]=L.angle||0;data[k++]=fat;data[k++]=size*(.035+.07*Math.min(1,fat/(size*.2+1e-6)));data[k++]=Math.min(1,L.weight)}
      const count=k/8;
      gl.viewport(0,0,w,h);gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
      if(count){gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.useProgram(body);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,atlas);gl.uniform1i(UB.A,0);
        gl.uniform2f(UB.res,w,h);gl.uniform2f(UB.cell,cw,ch);gl.uniform2f(UB.atlasPx,cw*COLS,ch*ROWS);gl.uniform1f(UB.pad,PAD);gl.uniform1f(UB.cols,COLS);gl.uniform1f(UB.scale,SCALE);
        gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,data.subarray(0,k),gl.DYNAMIC_DRAW);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,count);gl.disable(gl.BLEND)}
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
      if(count){gl.useProgram(full);gl.bindVertexArray(empty);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,field);gl.uniform1i(UC.F,0);
        gl.uniform2f(UC.res,w,h);gl.uniform1f(UC.scale,SCALE);gl.uniform3fv(UC.ink,ink);gl.uniform1f(UC.alpha,alpha);gl.drawArrays(gl.TRIANGLES,0,3)}
      return count;
    }
    return Object.freeze({draw,canvas});
  }
  return Object.freeze({create,pressAt,fatAfter,EM,PAD});
});
