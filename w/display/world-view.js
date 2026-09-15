(() => {
'use strict';
const N=globalThis.SSSDisplayNavigation;
if(!N) throw new Error('navigation physiology missing');
const edgeIx=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
const qNorm=q=>{const m=Math.hypot(...q)||1;return q.map(v=>v/m)};
const qMul=(a,b)=>{const[w,x,y,z]=a,[v,i,j,k]=b;return [w*v-x*i-y*j-z*k,w*i+x*v+y*k-z*j,w*j-x*k+y*v+z*i,w*k+x*j-y*i+z*v]};
const qAxis=(a,t)=>{const m=Math.hypot(...a)||1,s=Math.sin(t/2)/m;return [Math.cos(t/2),a[0]*s,a[1]*s,a[2]*s]};
const qRot=(q,p)=>{const r=qMul(qMul(q,[0,...p]),[q[0],-q[1],-q[2],-q[3]]);return r.slice(1)};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const HOME_ORIENT=qNorm(qMul(qAxis([1,0,0],-.12),qAxis([0,1,0],.47)));
let orient=[...HOME_ORIENT],orientTween=null,swingbackTimer=null;
let projection=null,scopeId='main',nav=null,STRUCT={leaves:[],addresses:[]},lang='en',last=performance.now();
let GLOBAL_TARGETS=[],activeGlobalAddress='',activeGlobalLocus='overview';
const twin=document.getElementById('navTwin'),tc=twin.getContext('2d');
const route=document.getElementById('route-mark'),miniState=document.getElementById('mini-state');

function miniProject(p){const scale=twin.width/2.9,q=qRot(orient,p);return {x:twin.width/2+q[0]*scale,y:twin.height/2-q[1]*scale,z:q[2]}}
function targetPoint(t){return t.path===''?[0,0,0]:N.semanticPoint(t.path)}
function targetLabel(t){if(t.path==='')return 'PHILOSOPHY';return (t.interlocutorIds||[]).map(x=>x.replace(/^organism:/,'')).join(' + ').toUpperCase()||t.path.toUpperCase()}
function targetActive(t){return t.locus===activeGlobalLocus || t.path===activeGlobalAddress}
function drawTwin(){
  if(!nav)return;tc.clearRect(0,0,twin.width,twin.height);
  const cells=[...STRUCT.leaves].sort((a,b)=>N.centroid(a.tet)[2]-N.centroid(b.tet)[2]);
  for(const cell of cells){const pts=cell.tet.map(miniProject);tc.strokeStyle='rgba(241,239,233,.15)';tc.lineWidth=1.35;for(const [a,b] of edgeIx){tc.beginPath();tc.moveTo(pts[a].x,pts[a].y);tc.lineTo(pts[b].x,pts[b].y);tc.stroke()}}
  /* Global navigator markers are organism mounts, not every realized Philosophy
   * address. Philosophy may still inspect arbitrary realized addresses locally. */
  for(const t of GLOBAL_TARGETS){
    const p=miniProject(targetPoint(t)),active=targetActive(t);
    if(t.path===''){
      tc.lineWidth=active?2:1.25;tc.strokeStyle=active?'rgba(255,255,255,.96)':'rgba(241,239,233,.44)';tc.strokeRect(p.x-6,p.y-6,12,12);
      if(active){tc.beginPath();tc.arc(p.x,p.y,13,0,Math.PI*2);tc.strokeStyle='rgba(255,255,255,.46)';tc.stroke()}
    }else{
      const rad=active?6:4.2;tc.beginPath();tc.arc(p.x,p.y,rad,0,Math.PI*2);tc.fillStyle=active?'rgba(255,255,255,.98)':'rgba(241,239,233,.52)';tc.fill();
      if(active){tc.beginPath();tc.arc(p.x,p.y,rad+7,0,Math.PI*2);tc.strokeStyle='rgba(255,255,255,.62)';tc.stroke()}
    }
    if(active){tc.fillStyle='rgba(241,239,233,.72)';tc.font='13px ui-monospace,monospace';tc.fillText(targetLabel(t),p.x+16,p.y+4)}
  }
}
function twinPoint(e){const r=twin.getBoundingClientRect();return {x:(e.clientX-r.left)*twin.width/r.width,y:(e.clientY-r.top)*twin.height/r.height}}
function hitTarget(x,y){let best=null;for(const t of GLOBAL_TARGETS){const p=miniProject(targetPoint(t)),d=Math.hypot(x-p.x,y-p.y),limit=t.path===''?23:24;if(d<limit&&(!best||d<best.d))best={target:t,d}}return best?.target||null}
function emitView(source){if(!nav)return;route.textContent='GLOBAL '+scopeId+':'+(activeGlobalAddress||'overview')+' · PHILOSOPHY VIEW '+(nav.view||'overview');miniState.textContent='global '+(activeGlobalAddress||'overview')+' · local view '+(nav.view||'overview');dispatchEvent(new CustomEvent('sss:view',{detail:{scopeId,path:nav.view||'',source}}))}
function emitOrientation(source='global'){dispatchEvent(new CustomEvent('sss:orientation',{detail:{orientation:[...orient],source}}))}
const qDot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];
const qSlerp=(a,b,t)=>{let cos=qDot(a,b),bb=[...b];if(cos<0){cos=-cos;bb=bb.map(v=>-v)}if(cos>.9995)return qNorm(a.map((v,i)=>v+(bb[i]-v)*t));const theta=Math.acos(Math.max(-1,Math.min(1,cos))),s=Math.sin(theta);const wa=Math.sin((1-t)*theta)/s,wb=Math.sin(t*theta)/s;return qNorm(a.map((v,i)=>v*wa+bb[i]*wb))};
const ease=t=>1-Math.pow(1-t,3);
const isPhilosophySource=source=>String(source).startsWith('background:organism:philosophy')||String(source).startsWith('interlocutor:organism:philosophy');
function stopTween(){orientTween=null}
function clearSwingback(){if(swingbackTimer!==null){clearTimeout(swingbackTimer);swingbackTimer=null}}
function swingback(target=HOME_ORIENT,{delay=0,duration=860,source='philosophy-swingback'}={}){clearSwingback();if(reduced){orient=[...target];drawTwin();emitOrientation(source);return}orientTween={from:[...orient],to:qNorm(target),start:performance.now()+delay,duration,source}}
function scheduleSwingback(delay=220){clearSwingback();if(scopeId!=='main')return;swingbackTimer=setTimeout(()=>{swingbackTimer=null;swingback(HOME_ORIENT,{delay:0,duration:860,source:'philosophy-swingback'})},delay)}
function inspect(path,source='philosophy-background'){if(!nav||!nav.inspect(path))return false;emitView(source);drawTwin();if(isPhilosophySource(source))scheduleSwingback(140);return true}
function clearInspection(source='clear'){if(!nav)return;nav.clearInspection();emitView(source);drawTwin()}
function setScope({id,projection:p}={}){if(!p?.root)throw new Error('scope projection required');scopeId=id||'scope';projection=p;nav=N.createState(p.root);STRUCT=nav.structure;clearSwingback();stopTween();emitView('scope');drawTwin();emitOrientation('scope')}
function setGlobalTargets(targets=[]){GLOBAL_TARGETS=(Array.isArray(targets)?targets:[]).map(t=>Object.freeze({path:String(t.path??''),locus:String(t.locus||''),interlocutorIds:Object.freeze([...(t.interlocutorIds||[])])}));drawTwin();return GLOBAL_TARGETS}
function setActiveGlobalAddress(path='',locus='overview'){activeGlobalAddress=String(path??'');activeGlobalLocus=String(locus||'overview');emitView('global-encounter');drawTwin()}
function requestGlobalTarget(target,source='global-minimap'){if(!target)return false;dispatchEvent(new CustomEvent('sss:global-navigate',{detail:{scopeId,path:target.path,locus:target.locus,interlocutorIds:[...target.interlocutorIds],source}}));return true}
function rotateBy(dx,dy,source='background'){clearSwingback();stopTween();orient=qNorm(qMul(qAxis([1,0,0],dy*.00325),qMul(qAxis([0,1,0],dx*.00325),orient)));drawTwin();emitOrientation(source);if(isPhilosophySource(source))scheduleSwingback(260)}

twin.addEventListener('pointerdown',e=>{if(e.button!==0||!nav)return;const p=twinPoint(e),target=hitTarget(p.x,p.y);if(target){requestGlobalTarget(target,'global-minimap');e.preventDefault()}});

const axes={x:document.getElementById('axis-x'),y:document.getElementById('axis-y')};
const AXIS_SETTLE_MS=520,AXIS_SETTLE_EPS=.018;
function paintAxis(axis){if(!nav)return;const el=axes[axis],v=nav.axes[axis],k=el.querySelector('.knob');el.setAttribute('aria-valuenow',String(Math.round(v*100)));if(axis==='x')k.style.left=(50+v*43)+'%';else k.style.top=(50-v*43)+'%'}
function bindAxis(axis){
  const el=axes[axis];let active=null,timer=null,latched=false,lastValue=0;
  const clearTimer=()=>{if(timer!==null){clearTimeout(timer);timer=null}};
  const sample=e=>{const v=N.axisValue(axis,el.getBoundingClientRect(),e.clientX,e.clientY),changed=Math.abs(v-lastValue)>AXIS_SETTLE_EPS;lastValue=v;nav.setAxis(axis,v);paintAxis(axis);return changed};
  const arm=()=>{clearTimer();if(active===null)return;timer=setTimeout(()=>{timer=null;if(active===null)return;const pid=active;active=null;latched=true;el.dataset.latched='true';try{if(el.hasPointerCapture(pid))el.releasePointerCapture(pid)}catch(_){}},AXIS_SETTLE_MS)};
  el.addEventListener('pointerdown',e=>{if(e.button!==0||!nav)return;clearTimer();if(latched){latched=false;el.dataset.latched='false'}active=e.pointerId;try{el.setPointerCapture(active)}catch(_){}lastValue=N.axisValue(axis,el.getBoundingClientRect(),e.clientX,e.clientY);nav.setAxis(axis,lastValue);paintAxis(axis);arm();e.preventDefault()});
  el.addEventListener('pointermove',e=>{if(active!==e.pointerId)return;if(sample(e))arm();e.preventDefault()});
  const release=e=>{if(active!==e.pointerId)return;clearTimer();const pid=active;active=null;nav.releaseAxis(axis);paintAxis(axis);try{if(el.hasPointerCapture(pid))el.releasePointerCapture(pid)}catch(_){}e.preventDefault()};
  el.addEventListener('pointerup',release);el.addEventListener('pointercancel',release);
  el.addEventListener('keydown',e=>{if(!nav)return;const valid=axis==='x'?['ArrowLeft','ArrowRight']:['ArrowUp','ArrowDown'];if(!valid.includes(e.key))return;e.preventDefault();const sign=(e.key==='ArrowRight'||e.key==='ArrowUp')?1:-1;nav.setAxis(axis,sign*(e.shiftKey?1:.52));paintAxis(axis)});
  el.addEventListener('keyup',()=>{if(!nav)return;nav.releaseAxis(axis);paintAxis(axis)});
  el.addEventListener('blur',()=>{if(!nav||latched)return;nav.releaseAxis(axis);paintAxis(axis)});
}
bindAxis('x');bindAxis('y');

function frame(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(orientTween){
    if(now>=orientTween.start){
      const t=Math.min(1,(now-orientTween.start)/orientTween.duration);
      orient=qSlerp(orientTween.from,orientTween.to,ease(t));
      drawTwin();emitOrientation(orientTween.source);
      if(t>=1)orientTween=null;
    }
  }
  if(nav){const av=nav.angularVelocity();if(av.yaw||av.pitch){clearSwingback();stopTween();if(av.yaw)orient=qNorm(qMul(qAxis([0,1,0],av.yaw*dt),orient));if(av.pitch)orient=qNorm(qMul(qAxis([1,0,0],av.pitch*dt),orient));drawTwin();emitOrientation('global-axis')}}
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame);

document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>{lang=b.dataset.lang;document.documentElement.lang=lang;document.querySelectorAll('[data-lang]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.lang===lang)));dispatchEvent(new CustomEvent('sss:language',{detail:{language:lang}}))}));
document.querySelectorAll('[data-a11y-focus]').forEach(b=>b.addEventListener('click',()=>{const path=b.dataset.a11yFocus||'',target=GLOBAL_TARGETS.find(t=>t.path===path);if(target)requestGlobalTarget(target,'accessible-global-nav')}));

globalThis.SSSWorldView=Object.freeze({setScope,setGlobalTargets,setActiveGlobalAddress,requestGlobalTarget,inspect,clearInspection,rotateBy,drawTwin,swingback,get scopeId(){return scopeId},get projection(){return projection},get view(){return nav?.view||''},get language(){return lang},get orientation(){return [...orient]},get structure(){return STRUCT},get globalTargets(){return GLOBAL_TARGETS.slice()},get activeGlobalAddress(){return activeGlobalAddress},projectPoint(p,rect,scale=1.72){const q=qRot(orient,p),f=(Math.min(rect.width,rect.height)/2)/Math.tan(Math.PI/6.6),z=3.0-q[2]*scale;return {x:rect.width/2+q[0]*scale*f/z,y:rect.height/2-q[1]*scale*f/z,z:q[2]}}});
})();
