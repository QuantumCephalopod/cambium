(() => {
'use strict';
const canvas=document.getElementById('locus-stage');if(!canvas)return;
let palette=[.28,.78,.92],pulse=.18;
addEventListener('sss:encounter',e=>{const ps=e.detail?.palettes||[];if(ps.length)palette=[0,1,2].map(i=>ps.reduce((s,p)=>s+(Number(p[i])||0),0)/ps.length);pulse=1;document.documentElement.dataset.siteEntered=String((e.detail?.activeIds||[])[0]!=='organism:philosophy'||e.detail?.scopeId!=='main')});
addEventListener('sss:activity',()=>{pulse=1});
const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false});if(!gl)return;
const vs='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const fs='precision highp float;uniform float t;uniform vec2 r;uniform vec3 c;uniform float pulse;void main(){vec2 u=(gl_FragCoord.xy-.5*r)/min(r.x,r.y);float d=length(u),a=atan(u.y,u.x);float bands=.5+.5*sin(d*34.-t*.7+sin(a*4.)*2.);float ring=exp(-26.*abs(d-(.22+.04*sin(t))));vec3 base=mix(vec3(.005,.008,.014),c*.32,bands*.16+ring*(.18+pulse*.42));float v=smoothstep(1.05,.12,d);gl_FragColor=vec4(base,v*(.45+pulse*.28));}';
const sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s};
const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);const T=gl.getUniformLocation(pr,'t'),R=gl.getUniformLocation(pr,'r'),C=gl.getUniformLocation(pr,'c'),P=gl.getUniformLocation(pr,'pulse');
function frame(ms){const d=Math.min(devicePixelRatio||1,1.5),w=Math.max(1,Math.floor(innerWidth*d)),h=Math.max(1,Math.floor(innerHeight*d));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(pr);gl.uniform1f(T,ms*.001);gl.uniform2f(R,w,h);gl.uniform3fv(C,new Float32Array(palette));gl.uniform1f(P,pulse);gl.drawArrays(gl.TRIANGLES,0,6);pulse*=.965;requestAnimationFrame(frame)}requestAnimationFrame(frame);
})();
