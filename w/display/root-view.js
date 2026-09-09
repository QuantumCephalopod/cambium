(() => {
'use strict';
const DATA=JSON.parse(document.getElementById('root-projection').textContent);
const N=globalThis.SSSDisplayNavigation;
if(!N) throw new Error('navigation physiology missing');
const genes=N.GENES, geneIndex={w:0,x:1,z:2,y:3};
const nav=N.createState(DATA.root), STRUCT=nav.structure, V0=N.V0;
const faceIx=[[0,2,1],[0,1,3],[0,3,2],[1,2,3]], edgeIx=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
const palettes=[[.28,.78,.92],[.47,.54,.94],[.92,.48,.58],[.62,.92,.42]];
let lang='en', viewScale=1,targetScale=1,viewCenter=[0,0,0],targetCenter=[0,0,0];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,s)=>a.map(x=>x*s);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const nrm=v=>{const m=Math.hypot(...v)||1;return v.map(x=>x/m)};
const qNorm=q=>{const m=Math.hypot(...q)||1;return q.map(v=>v/m)};
const qMul=(a,b)=>{const[w,x,y,z]=a,[v,i,j,k]=b;return [w*v-x*i-y*j-z*k,w*i+x*v+y*k-z*j,w*j-x*k+y*v+z*i,w*k+x*j-y*i+z*v]};
const qAxis=(a,t)=>{const m=Math.hypot(...a)||1,s=Math.sin(t/2)/m;return [Math.cos(t/2),a[0]*s,a[1]*s,a[2]*s]};
const qRot=(q,p)=>{const r=qMul(qMul(q,[0,...p]),[q[0],-q[1],-q[2],-q[3]]);return r.slice(1)};
let orient=qNorm(qMul(qAxis([1,0,0],-.12),qAxis([0,1,0],.47)));

const stage=document.getElementById('stage'),stage2d=document.getElementById('stage2d');
let gl=stage.getContext('webgl2',{antialias:true,alpha:false,premultipliedAlpha:false});
const cpu=!gl, sceneCanvas=cpu?stage2d:stage;
if(cpu){stage.style.display='none';stage2d.style.display='block'}
let dpr=1,W=1,H=1;
function resize(){dpr=Math.min(devicePixelRatio||1,1.55);W=Math.max(1,Math.floor(innerWidth*dpr));H=Math.max(1,Math.floor(innerHeight*dpr));for(const c of [stage,stage2d]){if(c.width!==W||c.height!==H){c.width=W;c.height=H}}}
resize();addEventListener('resize',resize);
function viewParams(){return {bigScale:innerWidth<760?1.48:1.82,baseOffset:[innerWidth<760?.08:.27,.03,0],camZ:innerWidth<760?3.45:3.0,fov:Math.PI/3.3}}
function project3(p,globalOnly=false){const {bigScale,baseOffset,camZ,fov}=viewParams(),scale=bigScale*(globalOnly?1:viewScale),center=globalOnly?[0,0,0]:viewCenter,r=qRot(orient,sub(p,center)),w=[r[0]*scale+baseOffset[0],r[1]*scale+baseOffset[1],r[2]*scale],z=camZ-w[2],f=(innerHeight/2)/Math.tan(fov/2);return [innerWidth/2+w[0]*f/z,innerHeight/2-w[1]*f/z,w[2]]}

let GL=null;
if(gl){
 const vs=`#version 300 es\nprecision highp float;in vec3 aPos;in vec3 aNormal;in float aRegion;uniform mat4 uProj,uView,uModel;out vec3 vN;out vec3 vW;out float vRegion;void main(){vec4 w=uModel*vec4(aPos,1.);vW=w.xyz;vN=mat3(uModel)*aNormal;vRegion=aRegion;gl_Position=uProj*uView*w;}`;
 const fs=`#version 300 es\nprecision highp float;in vec3 vN;in vec3 vW;in float vRegion;uniform float uTime,uFocus;uniform vec3 uPalette[4];out vec4 outColor;float h(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}void main(){vec3 n=normalize(vN),eye=normalize(vec3(0.,0.,3.1)-vW);float fres=pow(1.-abs(dot(n,eye)),2.15);int ri=int(clamp(floor(vRegion+.5),0.,3.));vec3 c=uPalette[ri];float bands=.5+.5*sin((vW.x*1.7+vW.y*2.3+vW.z*.9)*31.+uTime*.27+vRegion*1.9);float fine=.5+.5*sin((vW.x-vW.z)*97.-uTime*.07);float selected=(uFocus<-.5||abs(vRegion-uFocus)<.2)?1.:.14;vec3 base=mix(vec3(.012,.016,.021),c*.24,fres*.76+bands*.07);base+=c*(.105*fres+.035*bands*fine)*selected;base+=(h(vW*37.+uTime*.01)-.5)*.018;float a=(.19+.63*fres+.04*bands)*selected;outColor=vec4(pow(max(base,0.),vec3(.92)),a);}`;
 function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
 function program(v,f){const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,v));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p}
 const p=program(vs,fs),data=[];
 function tri(a,b,c,region){const no=nrm(cross(sub(b,a),sub(c,a)));for(const v of [a,b,c])data.push(...v,...no,region)}
 for(const cell of STRUCT.leaves){const region=geneIndex[cell.path[0]]??0;for(const f of faceIx)tri(cell.tet[f[0]],cell.tet[f[1]],cell.tet[f[2]],region)}
 const vao=gl.createVertexArray();gl.bindVertexArray(vao);const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);const stride=7*4;
 for(const [name,size,off] of [['aPos',3,0],['aNormal',3,12],['aRegion',1,24]]){const loc=gl.getAttribLocation(p,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,stride,off)}
 const loc=n=>gl.getUniformLocation(p,n), U={proj:loc('uProj'),view:loc('uView'),model:loc('uModel'),time:loc('uTime'),focus:loc('uFocus')};
 const pal=gl.getUniformLocation(p,'uPalette[0]');
 function perspective(fovy,aspect,near,far){const f=1/Math.tan(fovy/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0])}
 function lookAt(eye,center,up){const z=nrm(sub(eye,center)),x=nrm(cross(up,z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x.reduce((s,v,i)=>s+v*eye[i],0),-y.reduce((s,v,i)=>s+v*eye[i],0),-z.reduce((s,v,i)=>s+v*eye[i],0),1])}
 function model(q,scale,offset,center){const[w,x,y,z]=q,c=qRot(q,center),o=[offset[0]-c[0]*scale,offset[1]-c[1]*scale,offset[2]-c[2]*scale];return new Float32Array([(1-2*y*y-2*z*z)*scale,(2*x*y+2*w*z)*scale,(2*x*z-2*w*y)*scale,0,(2*x*y-2*w*z)*scale,(1-2*x*x-2*z*z)*scale,(2*y*z+2*w*x)*scale,0,(2*x*z+2*w*y)*scale,(2*y*z-2*w*x)*scale,(1-2*x*x-2*y*y)*scale,0,o[0],o[1],o[2],1])}
 GL={p,vao,count:data.length/7,U,pal,perspective,lookAt,model};
}
function drawGL(t){const {bigScale,baseOffset,camZ,fov}=viewParams();gl.viewport(0,0,W,H);gl.clearColor(.019,.027,.039,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(GL.p);gl.uniformMatrix4fv(GL.U.proj,false,GL.perspective(fov,W/H,.1,20));gl.uniformMatrix4fv(GL.U.view,false,GL.lookAt([0,0,camZ],[0,0,0],[0,1,0]));gl.uniformMatrix4fv(GL.U.model,false,GL.model(orient,bigScale*viewScale,baseOffset,viewCenter));gl.uniform1f(GL.U.time,t*.001);const active=nav.view||nav.page;gl.uniform1f(GL.U.focus,active?(geneIndex[active[0]]??-1):-1);gl.uniform3fv(GL.pal,new Float32Array(palettes.flat()));gl.bindVertexArray(GL.vao);gl.drawArrays(gl.TRIANGLES,0,GL.count);gl.depthMask(true)}
function drawCPU(){const c=stage2d.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,innerWidth,innerHeight);c.fillStyle='#05070a';c.fillRect(0,0,innerWidth,innerHeight);const active=nav.view||nav.page,ri=active?geneIndex[active[0]]:-1;const cells=STRUCT.leaves.map(cell=>({cell,pts:cell.tet.map(project3),z:cell.tet.map(p=>project3(p)[2]).reduce((a,b)=>a+b,0)/4})).sort((a,b)=>a.z-b.z);for(const {cell,pts} of cells){const p=palettes[geneIndex[cell.path[0]]??0],sel=ri<0||(geneIndex[cell.path[0]]??0)===ri,alpha=sel?.18:.035;for(const f of faceIx){c.beginPath();c.moveTo(pts[f[0]][0],pts[f[0]][1]);c.lineTo(pts[f[1]][0],pts[f[1]][1]);c.lineTo(pts[f[2]][0],pts[f[2]][1]);c.closePath();c.fillStyle=`rgba(${p.map(x=>Math.round(x*255)).join(',')},${alpha})`;c.fill();c.strokeStyle=`rgba(241,239,233,${sel?.09:.02})`;c.stroke()}}}

const vertexBox=document.getElementById('vertex-labels'), labels={};
for(const g of genes){const n=document.createElement('div');n.className='vertex-label';n.innerHTML=`<span class="gene">${g} · ${DATA.root.children[g].gene}</span><span class="concept"></span>`;vertexBox.append(n);labels[g]=n}
const organBox=document.getElementById('organ-labels'), organs=[];
for(const g of genes)for(const [j,name] of DATA.occupancy[g].entries()){const n=document.createElement('div');n.className='organ-label';n.textContent='⟦ '+name+' : root ⟧';organBox.append(n);organs.push({g,j,n})}
function record(path){return N.addressRecord(STRUCT,path)}
function updateLabels(){const active=nav.view||nav.page;for(const g of genes){const r=record(g);if(!r)continue;const p=project3(r.center);const n=labels[g];n.style.left=p[0]+'px';n.style.top=p[1]+'px';n.style.opacity=(active&&active[0]!==g)?'.11':(p[2]<-.12?'.28':'.88');n.classList.toggle('back',p[2]<-.12);n.classList.toggle('focus',active?.[0]===g);n.querySelector('.concept').textContent=DATA.root.children[g][lang]}
 for(const o of organs){const r=record(o.g),show=!!active&&active[0]===o.g;if(!r){o.n.classList.remove('show');continue}const q=project3(add(r.center,[.05*(o.j-.5),-.08-.06*o.j,.04]));o.n.style.left=q[0]+'px';o.n.style.top=q[1]+'px';o.n.classList.toggle('show',show)}
 const eye=document.getElementById('tree-eye'), ep=project3([-.42,.48,-.42]);eye.style.left=(ep[0]-13)+'px';eye.style.top=(ep[1]-13)+'px';eye.style.display=active?'none':'block';}

const twin=document.getElementById('navTwin'),tc=twin.getContext('2d');
function miniProject(p){const r=twin.getBoundingClientRect(),scale=twin.width/2.9,q=qRot(orient,p);return {x:twin.width/2+q[0]*scale,y:twin.height/2-q[1]*scale,z:q[2]}}
function drawTwin(){tc.clearRect(0,0,twin.width,twin.height);const cells=[...STRUCT.leaves].sort((a,b)=>N.centroid(a.tet)[2]-N.centroid(b.tet)[2]);for(const cell of cells){const pts=cell.tet.map(miniProject);tc.strokeStyle='rgba(241,239,233,.15)';tc.lineWidth=1.35;for(const [a,b] of edgeIx){tc.beginPath();tc.moveTo(pts[a].x,pts[a].y);tc.lineTo(pts[b].x,pts[b].y);tc.stroke()}}
 for(const a of STRUCT.addresses){const p=miniProject(a.center),isPage=nav.page===a.path,isView=(nav.view||nav.page)===a.path,rad=Math.max(2.7,5.2-a.path.length*.55);tc.beginPath();tc.arc(p.x,p.y,rad,0,Math.PI*2);tc.fillStyle=isPage?'rgba(255,255,255,.98)':isView?'rgba(255,255,255,.90)':'rgba(241,239,233,.34)';tc.fill();if(isView&&!isPage){tc.beginPath();tc.arc(p.x,p.y,rad+7,0,Math.PI*2);tc.strokeStyle='rgba(255,255,255,.68)';tc.stroke()}if(isPage||isView){tc.fillStyle='rgba(241,239,233,.72)';tc.font='16px ui-monospace,monospace';tc.fillText((isPage?'HERE ':'VIEW ')+a.path.toUpperCase(),p.x+rad+9,p.y+4)}}}
function twinPoint(e){const r=twin.getBoundingClientRect();return {x:(e.clientX-r.left)*twin.width/r.width,y:(e.clientY-r.top)*twin.height/r.height}}
function hitAddress(x,y){let best=null;for(const a of STRUCT.addresses){const p=miniProject(a.center),d=Math.hypot(x-p.x,y-p.y),limit=Math.max(24,34-a.path.length*2);if(d<limit&&(!best||d<best.d))best={a,d}}return best?.a?.path||''}
twin.addEventListener('pointerdown',e=>{if(e.button!==0)return;const p=twinPoint(e),path=hitAddress(p.x,p.y);if(path){nav.inspect(path);syncTarget();updatePage();e.preventDefault()}});

const axes={x:document.getElementById('axis-x'),y:document.getElementById('axis-y')};
function paintAxis(axis){const el=axes[axis],v=nav.axes[axis],k=el.querySelector('.knob');el.setAttribute('aria-valuenow',String(Math.round(v*100)));if(axis==='x')k.style.left=(50+v*43)+'%';else k.style.top=(50-v*43)+'%'}
function bindAxis(axis){const el=axes[axis];let active=null;const set=e=>{const r=el.getBoundingClientRect(),v=N.axisValue(axis,r,e.clientX,e.clientY);nav.setAxis(axis,v);paintAxis(axis)};el.addEventListener('pointerdown',e=>{if(e.button!==0)return;active=e.pointerId;el.setPointerCapture(active);set(e);e.preventDefault()});el.addEventListener('pointermove',e=>{if(active!==e.pointerId)return;set(e);e.preventDefault()});const end=e=>{if(active!==e.pointerId)return;nav.releaseAxis(axis);paintAxis(axis);if(el.hasPointerCapture(active))el.releasePointerCapture(active);active=null;e.preventDefault()};el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);el.addEventListener('keydown',e=>{const valid=axis==='x'?['ArrowLeft','ArrowRight']:['ArrowUp','ArrowDown'];if(!valid.includes(e.key))return;e.preventDefault();const sign=(e.key==='ArrowRight'||e.key==='ArrowUp')?1:-1;nav.setAxis(axis,sign*(e.shiftKey?1:.52));paintAxis(axis)});el.addEventListener('keyup',()=>{nav.releaseAxis(axis);paintAxis(axis)});el.addEventListener('blur',()=>{nav.releaseAxis(axis);paintAxis(axis)})}
bindAxis('x');bindAxis('y');paintAxis('x');paintAxis('y');

let drag=null;const ROTATE_PER_PX=.00325;
sceneCanvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;sceneCanvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,q:[...orient]};sceneCanvas.classList.add('dragging');e.preventDefault()});
sceneCanvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const evs=e.getCoalescedEvents?e.getCoalescedEvents():[e],last=evs[evs.length-1],dx=last.clientX-drag.x,dy=last.clientY-drag.y;orient=qNorm(qMul(qAxis([1,0,0],dy*ROTATE_PER_PX),qMul(qAxis([0,1,0],dx*ROTATE_PER_PX),drag.q)));e.preventDefault()});
function endDrag(e){if(!drag||drag.id!==e.pointerId)return;drag=null;sceneCanvas.classList.remove('dragging');if(sceneCanvas.hasPointerCapture(e.pointerId))sceneCanvas.releasePointerCapture(e.pointerId);e.preventDefault()}
sceneCanvas.addEventListener('pointerup',endDrag);sceneCanvas.addEventListener('pointercancel',endDrag);

const copy=document.getElementById('page-copy'),route=document.getElementById('route-mark'),commit=document.getElementById('commit'),miniState=document.getElementById('mini-state');
function nodeAt(path){let n=DATA.root;for(const g of path){n=n?.children?.[g];if(!n)return null}return n}
function syncTarget(){const t=nav.target();targetCenter=[...t.center];targetScale=t.scale}
function leave(){nav.leave();syncTarget();updatePage()}
function commitView(){if(nav.commit()){syncTarget();updatePage()}}
function updatePage(){document.documentElement.lang=lang;document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===lang)));const g=nav.view||nav.page,node=g?nodeAt(g):DATA.root;miniState.textContent='page '+(nav.page||'root')+' · view '+(g||'root');if(nav.page){route.textContent='PAGE main:'+nav.page+' · VIEW main:'+nav.page;copy.className='';copy.innerHTML=`<div class="kicker">committed address · ${nav.page}</div><h1>${node?.[lang]||node?.noun||nav.page}</h1><p>${lang==='de'?'Die einzigartige Seite dieses realisierten Ortes ist noch nicht gestaltet. Dies ist die Eintrittsschwelle.':'The unique page for this realized locus is not designed yet. This is the entry threshold.'}</p>`;commit.textContent=lang==='de'?'← zurück zum root':'← back to root';commit.classList.add('show');commit.onclick=leave;copy.classList.add('has-commit')}else if(nav.view){route.textContent='PAGE main:root · VIEW main:'+nav.view;copy.className='';copy.innerHTML=`<div class="kicker">root inspection · ${nav.view} · ${node?.gene||''}</div><h1>${node?.[lang]||node?.noun||nav.view}</h1><p>${node?.one?.[lang]||''}${DATA.occupancy[nav.view]?.length?'<br><br>'+DATA.occupancy[nav.view].map(x=>'⟦ '+x+' : root ⟧').join('  '):''}</p>`;commit.textContent=(lang==='de'?'Seite betreten · ':'enter page · ')+nav.view+' · '+(node?.[lang]||node?.noun||nav.view);commit.classList.add('show');commit.onclick=commitView;copy.classList.add('has-commit')}else{route.textContent='PAGE main:root · VIEW main:root';copy.className='root';copy.innerHTML=`<div class="kicker">main-root · ${DATA.source.home}</div><h1>Form · Continuity · Care · Inquiry</h1><p>${lang==='de'?'Großen Körper direkt ziehen. Die Minimap zeigt nur realisierte Struktur. Einen realen Ort wählen = ansehen; Eintritt bleibt eine eigene Entscheidung. Die zwei Regler steuern horizontale und vertikale Rotation vollständig getrennt.':'Drag the large body directly. The minimap shows only realized structure. Select a real address to inspect it; entering remains a separate commitment. The two controls drive horizontal and vertical rotation independently.'}</p>`;commit.classList.remove('show');commit.onclick=null;copy.classList.remove('has-commit')}updateLabels();drawTwin()}
document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>{lang=b.dataset.lang;updatePage()}));document.querySelectorAll('[data-a11y-focus]').forEach(b=>b.addEventListener('click',()=>{if(nav.inspect(b.dataset.a11yFocus)){syncTarget();updatePage()}}));document.getElementById('root-home').addEventListener('click',leave);
addEventListener('keydown',e=>{if(e.metaKey||e.ctrlKey||e.altKey)return;const k=e.key.toLowerCase();if(['1','2','3','4'].includes(k)){nav.inspect(genes[+k-1]);syncTarget();updatePage();e.preventDefault()}else if(e.key==='Enter'&&nav.view&&!nav.page){commitView();e.preventDefault()}else if(e.key==='Escape'){if(nav.page)leave();else{nav.clearInspection();syncTarget();updatePage()}e.preventDefault()}});

let last=performance.now();function damp(v,t,k,dt){return v+(t-v)*(1-Math.exp(-k*dt))}function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;const av=nav.angularVelocity();if(av.yaw)orient=qNorm(qMul(qAxis([0,1,0],av.yaw*dt),orient));if(av.pitch)orient=qNorm(qMul(qAxis([1,0,0],av.pitch*dt),orient));const k=reduced?60:7.2;viewScale=damp(viewScale,targetScale,k,dt);for(let i=0;i<3;i++)viewCenter[i]=damp(viewCenter[i],targetCenter[i],k,dt);if(gl)drawGL(now);else drawCPU();updateLabels();drawTwin();requestAnimationFrame(frame)}
syncTarget();updatePage();requestAnimationFrame(frame);
})();
