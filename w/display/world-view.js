(() => {
'use strict';
const N=globalThis.SSSDisplayNavigation;
if(!N) throw new Error('navigation physiology missing');
const genes=N.GENES,edgeIx=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
const qNorm=q=>{const m=Math.hypot(...q)||1;return q.map(v=>v/m)};
const qMul=(a,b)=>{const[w,x,y,z]=a,[v,i,j,k]=b;return [w*v-x*i-y*j-z*k,w*i+x*v+y*k-z*j,w*j-x*k+y*v+z*i,w*k+x*j-y*i+z*v]};
const qAxis=(a,t)=>{const m=Math.hypot(...a)||1,s=Math.sin(t/2)/m;return [Math.cos(t/2),a[0]*s,a[1]*s,a[2]*s]};
const qRot=(q,p)=>{const r=qMul(qMul(q,[0,...p]),[q[0],-q[1],-q[2],-q[3]]);return r.slice(1)};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let orient=qNorm(qMul(qAxis([1,0,0],-.12),qAxis([0,1,0],.47)));
let projection=null,scopeId='main',nav=null,STRUCT={leaves:[],addresses:[]},lang='en',last=performance.now();
const twin=document.getElementById('navTwin'),tc=twin.getContext('2d');
const route=document.getElementById('route-mark'),miniState=document.getElementById('mini-state');

function miniProject(p){const scale=twin.width/2.9,q=qRot(orient,p);return {x:twin.width/2+q[0]*scale,y:twin.height/2-q[1]*scale,z:q[2]}}
function drawTwin(){
  if(!nav)return;tc.clearRect(0,0,twin.width,twin.height);
  const cells=[...STRUCT.leaves].sort((a,b)=>N.centroid(a.tet)[2]-N.centroid(b.tet)[2]);
  for(const cell of cells){const pts=cell.tet.map(miniProject);tc.strokeStyle='rgba(241,239,233,.15)';tc.lineWidth=1.35;for(const [a,b] of edgeIx){tc.beginPath();tc.moveTo(pts[a].x,pts[a].y);tc.lineTo(pts[b].x,pts[b].y);tc.stroke()}}
  for(const a of STRUCT.addresses){const p=miniProject(a.point),isView=nav.view===a.path,rad=Math.max(2.7,5.2-a.path.length*.55);tc.beginPath();tc.arc(p.x,p.y,rad,0,Math.PI*2);tc.fillStyle=isView?'rgba(255,255,255,.98)':'rgba(241,239,233,.34)';tc.fill();if(isView){tc.beginPath();tc.arc(p.x,p.y,rad+7,0,Math.PI*2);tc.strokeStyle='rgba(255,255,255,.68)';tc.stroke();tc.fillStyle='rgba(241,239,233,.72)';tc.font='16px ui-monospace,monospace';tc.fillText('VIEW '+a.path.toUpperCase(),p.x+rad+9,p.y+4)}}
}
function twinPoint(e){const r=twin.getBoundingClientRect();return {x:(e.clientX-r.left)*twin.width/r.width,y:(e.clientY-r.top)*twin.height/r.height}}
function hitAddress(x,y){let best=null;for(const a of STRUCT.addresses){const p=miniProject(a.point),d=Math.hypot(x-p.x,y-p.y),limit=Math.max(24,34-a.path.length*2);if(d<limit&&(!best||d<best.d))best={a,d}}return best?.a?.path||''}
function emitView(source){if(!nav)return;route.textContent='SCOPE '+scopeId+':root · VIEW '+scopeId+':'+(nav.view||'root');miniState.textContent='scope '+scopeId+' · view '+(nav.view||'root');dispatchEvent(new CustomEvent('sss:view',{detail:{scopeId,path:nav.view||'',source}}))}
function emitOrientation(source='global'){dispatchEvent(new CustomEvent('sss:orientation',{detail:{orientation:[...orient],source}}))}
function inspect(path,source='global-minimap'){if(!nav||!nav.inspect(path))return false;emitView(source);drawTwin();return true}
function clearInspection(source='clear'){if(!nav)return;nav.clearInspection();emitView(source);drawTwin()}
function setScope({id,projection:p}={}){if(!p?.root)throw new Error('scope projection required');scopeId=id||'scope';projection=p;nav=N.createState(p.root);STRUCT=nav.structure;emitView('scope');drawTwin();emitOrientation('scope')}
function rotateBy(dx,dy,source='background'){orient=qNorm(qMul(qAxis([1,0,0],dy*.00325),qMul(qAxis([0,1,0],dx*.00325),orient)));drawTwin();emitOrientation(source)}

twin.addEventListener('pointerdown',e=>{if(e.button!==0||!nav)return;const p=twinPoint(e),path=hitAddress(p.x,p.y);if(path){inspect(path,'global-minimap');e.preventDefault()}});

const axes={x:document.getElementById('axis-x'),y:document.getElementById('axis-y')};
const AXIS_SETTLE_MS=520;
function paintAxis(axis){if(!nav)return;const el=axes[axis],v=nav.axes[axis],k=el.querySelector('.knob');el.setAttribute('aria-valuenow',String(Math.round(v*100)));if(axis==='x')k.style.left=(50+v*43)+'%';else k.style.top=(50-v*43)+'%'}
function bindAxis(axis){
  const el=axes[axis];let active=null,timer=null,latched=false;
  const clearTimer=()=>{if(timer!==null){clearTimeout(timer);timer=null}};
  const set=e=>{const v=N.axisValue(axis,el.getBoundingClientRect(),e.clientX,e.clientY);nav.setAxis(axis,v);paintAxis(axis)};
  const arm=()=>{clearTimer();if(active===null)return;timer=setTimeout(()=>{timer=null;if(active===null)return;const pid=active;active=null;latched=true;el.dataset.latched='true';try{if(el.hasPointerCapture(pid))el.releasePointerCapture(pid)}catch(_){}},AXIS_SETTLE_MS)};
  el.addEventListener('pointerdown',e=>{if(e.button!==0||!nav)return;clearTimer();if(latched){latched=false;el.dataset.latched='false'}active=e.pointerId;try{el.setPointerCapture(active)}catch(_){}set(e);arm();e.preventDefault()});
  el.addEventListener('pointermove',e=>{if(active!==e.pointerId)return;set(e);arm();e.preventDefault()});
  const release=e=>{if(active!==e.pointerId)return;clearTimer();const pid=active;active=null;nav.releaseAxis(axis);paintAxis(axis);try{if(el.hasPointerCapture(pid))el.releasePointerCapture(pid)}catch(_){}e.preventDefault()};
  el.addEventListener('pointerup',release);el.addEventListener('pointercancel',release);
  el.addEventListener('keydown',e=>{if(!nav)return;const valid=axis==='x'?['ArrowLeft','ArrowRight']:['ArrowUp','ArrowDown'];if(!valid.includes(e.key))return;e.preventDefault();const sign=(e.key==='ArrowRight'||e.key==='ArrowUp')?1:-1;nav.setAxis(axis,sign*(e.shiftKey?1:.52));paintAxis(axis)});
  el.addEventListener('keyup',()=>{if(!nav)return;nav.releaseAxis(axis);paintAxis(axis)});
  el.addEventListener('blur',()=>{if(!nav||latched)return;nav.releaseAxis(axis);paintAxis(axis)});
}
bindAxis('x');bindAxis('y');

function frame(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(nav){const av=nav.angularVelocity();if(av.yaw||av.pitch){if(av.yaw)orient=qNorm(qMul(qAxis([0,1,0],av.yaw*dt),orient));if(av.pitch)orient=qNorm(qMul(qAxis([1,0,0],av.pitch*dt),orient));drawTwin();emitOrientation('global-axis')}}
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame);

document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>{lang=b.dataset.lang;document.documentElement.lang=lang;document.querySelectorAll('[data-lang]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.lang===lang)));dispatchEvent(new CustomEvent('sss:language',{detail:{language:lang}}))}));
document.querySelectorAll('[data-a11y-focus]').forEach(b=>b.addEventListener('click',()=>inspect(b.dataset.a11yFocus,'accessible-nav')));

globalThis.SSSWorldView=Object.freeze({setScope,inspect,clearInspection,rotateBy,drawTwin,get scopeId(){return scopeId},get projection(){return projection},get view(){return nav?.view||''},get language(){return lang},get orientation(){return [...orient]},get structure(){return STRUCT},projectPoint(p,rect,scale=1.72){const q=qRot(orient,p),f=(Math.min(rect.width,rect.height)/2)/Math.tan(Math.PI/6.6),z=3.0-q[2]*scale;return {x:rect.width/2+q[0]*scale*f/z,y:rect.height/2-q[1]*scale*f/z,z:q[2]}}});
})();
