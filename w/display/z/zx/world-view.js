(() => {
'use strict';
const typeInk=(ctx,...args)=>{if(globalThis.SSSDisplayType?.fillText)return globalThis.SSSDisplayType.fillText(ctx,...args);ctx.fillText(...args)};
const N=globalThis.SSSDisplayNavigation;
if(!N) throw new Error('navigation physiology missing');
const edgeIx=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
const qNorm=q=>{const m=Math.hypot(...q)||1;return q.map(v=>v/m)};
const qMul=(a,b)=>{const[w,x,y,z]=a,[v,i,j,k]=b;return [w*v-x*i-y*j-z*k,w*i+x*v+y*k-z*j,w*j-x*k+y*v+z*i,w*k+x*j-y*i+z*v]};
const qAxis=(a,t)=>{const m=Math.hypot(...a)||1,s=Math.sin(t/2)/m;return [Math.cos(t/2),a[0]*s,a[1]*s,a[2]*s]};
const qRot=(q,p)=>{const r=qMul(qMul(q,[0,...p]),[q[0],-q[1],-q[2],-q[3]]);return r.slice(1)};
const HOME_ORIENT=qNorm(qMul(qAxis([1,0,0],-.12),qAxis([0,1,0],.47)));
let orient=[...HOME_ORIENT];
/* a site's rest view: the shared orientation eases to it; a witness's own turning cancels the ease and the claim */
let ease=null,restActive=false;
const qDot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];
function easeTo(q,ms=900,source='site-rest'){const to=qNorm(q);ease={from:[...orient],to:qDot(orient,to)<0?to.map(v=>-v):to,t0:performance.now(),ms:Math.max(1,ms),source};if(source==='site-rest')restActive=true}
function restoreHome(){if(!restActive)return;restActive=false;easeTo(HOME_ORIENT,700,'site-rest-restore')}
let projection=null,scopeId='main',nav=null,STRUCT={leaves:[],addresses:[]},lang=new URLSearchParams(location.search).get('lang')==='de'?'de':'en',last=performance.now();
let GLOBAL_TARGETS=[],activeGlobalAddress='',activeGlobalLocus='overview';
let GLOBAL_BODIES=[],targetInk=[],hoverTarget=null;
let mapZoom=1,mapOffset={x:0,y:0},bodyTree=null,clusterInk=[];
const twin=document.getElementById('navTwin'),tc=twin.getContext('2d');
const route=document.getElementById('route-mark'),miniState=document.getElementById('mini-state');

function miniProject(p){const scale=twin.width/2.9*mapZoom,q=qRot(orient,p);return {x:twin.width/2+mapOffset.x+q[0]*scale,y:twin.height/2+mapOffset.y-q[1]*scale,z:q[2]}}
function targetActive(t){return t.locus===activeGlobalLocus || t.path===activeGlobalAddress}
function rebuildBodies(){
  const node=path=>({path,tet:N.cellForPath(path).tet,children:new Map(),bodies:[]});bodyTree=node('');
  GLOBAL_BODIES=GLOBAL_TARGETS.flatMap(target=>target.bodies.map(b=>{
    const place=N.bodyPlacement(STRUCT,b.path),body={target,id:b.id,path:b.path,place,drift:N.bodyDrift(place,b.id)};
    let at=bodyTree;for(const gene of place.cell){if(!at.children.has(gene))at.children.set(gene,node(at.path+gene));at=at.children.get(gene)}at.bodies.push(body);return body;
  }));
}
function projectedBodies(ms,U){
  const out=[];clusterInk=[];
  function visit(node){
    const corners=node.tet.map(miniProject),xs=corners.map(p=>p.x),ys=corners.map(p=>p.y),left=Math.min(...xs),top=Math.min(...ys),right=Math.max(...xs),bottom=Math.max(...ys);
    if(right<0||bottom<0||left>twin.width||top>twin.height)return;
    if(node.path&&Math.max(right-left,bottom-top)<2*U){clusterInk.push({corners,x:(left+right)/2,y:(top+bottom)/2});return}
    for(const b of node.bodies){const position=N.bodyPosition(b.drift,ms),point=miniProject(position);out.push({...b,position,point,cellCorners:corners,corners:N.V0.map(v=>miniProject(v.map((x,j)=>position[j]+x*b.place.k)))})}
    for(const child of node.children.values())visit(child);
  }
  if(bodyTree)visit(bodyTree);
  return out.sort((a,b)=>a.point.z-b.point.z);
}
function strokeTet(points){for(const [a,b] of edgeIx){tc.beginPath();tc.moveTo(points[a].x,points[a].y);tc.lineTo(points[b].x,points[b].y);tc.stroke()}}
function drawTwin(ms=performance.now()){
  if(!nav)return;tc.clearRect(0,0,twin.width,twin.height);
  const rect=twin.getBoundingClientRect(),U=twin.width/Math.max(1,rect.width),pad=1.5*U;
  tc.lineWidth=U;tc.strokeStyle='rgba(241,239,233,.16)';
  for(const cell of STRUCT.leaves)strokeTet(cell.tet.map(miniProject));
  const bodies=projectedBodies(ms,U);targetInk=[];
  const current=STRUCT.addresses.find(c=>c.path===nav.view);
  if(current){tc.strokeStyle='rgba(241,239,233,.4)';strokeTet(current.tet.map(miniProject))}
  for(const b of bodies){
    const radius=Math.max(...b.corners.map(q=>Math.hypot(q.x-b.point.x,q.y-b.point.y)));
    if(b.point.x+radius<0||b.point.y+radius<0||b.point.x-radius>twin.width||b.point.y-radius>twin.height)continue;
    if(radius<.5*U){const cs=b.cellCorners;clusterInk.push({corners:cs,x:cs.reduce((s,p)=>s+p.x,0)/4,y:cs.reduce((s,p)=>s+p.y,0)/4});continue}
    const active=targetActive(b.target);tc.lineWidth=(active?1.7:1)*U;
    tc.fillStyle=active?'rgba(232,247,241,.23)':'rgba(197,222,229,.10)';
    for(const face of [[0,2,1],[0,1,3],[0,3,2],[1,2,3]]){tc.beginPath();tc.moveTo(b.corners[face[0]].x,b.corners[face[0]].y);for(const i of face.slice(1))tc.lineTo(b.corners[i].x,b.corners[i].y);tc.closePath();tc.fill()}
    tc.strokeStyle=active?'rgba(255,255,255,.98)':'rgba(241,239,233,.65)';strokeTet(b.corners);
    if(active){tc.strokeStyle='rgba(241,239,233,.32)';tc.lineWidth=U;strokeTet(N.cellForPath(b.place.cell).tet.map(miniProject))}
    targetInk.push({...b,label:null});
  }
  tc.lineWidth=U;tc.strokeStyle='rgba(241,239,233,.45)';for(const group of clusterInk)strokeTet(group.corners);
  /* A name belongs beside its own projected body. Scale comes from that body;
   * crowding removes background ink rather than moving names into rows. */
  const overview=GLOBAL_TARGETS.find(t=>t.path==='');
  if(overview)targetInk.unshift({target:overview,corners:N.V0.map(miniProject),point:miniProject([0,0,0]),root:true,label:null});
  const occupied=[],captioned=new Set();
  const labels=targetInk.filter(b=>!b.root).sort((a,b)=>(b.target===hoverTarget?2:Number(targetActive(b.target)))-(a.target===hoverTarget?2:Number(targetActive(a.target)))||b.point.z-a.point.z||a.id.localeCompare(b.id));
  for(const record of labels){
    const hot=targetActive(record.target)||record.target===hoverTarget,p=record.point;if(hot&&captioned.has(record.target))continue;
    const diameter=Math.max(...record.corners.map(q=>Math.hypot(q.x-p.x,q.y-p.y)))*2;
    const size=hot?globalThis.SSSDisplayType.rankPx(-3,document)*U:Math.min(globalThis.SSSDisplayType.rankPx(-4,document)*U,diameter/5);
    if(!hot&&size<globalThis.SSSDisplayType.rankPx(-6,document)*U)continue;
    const ownedTitle=hot&&record.target.interlocutorIds.length>1?record.target.interlocutorIds.map(id=>record.target.titles[id]||id.replace(/^organism:/,'')).join(' + '):record.target.titles[record.id]||record.id.replace(/^organism:/,'');
    const text=globalThis.SSSDisplayType.fold(ownedTitle.toUpperCase());
    tc.font=size+'px "SpriteSheet Mono",ui-monospace,monospace';tc.textAlign='left';
    const width=(tc.measureText?.(text)?.width||text.length*size)+pad*2,height=size*1.4+pad*2;
    if(width>twin.width-pad*2)continue;
    const gap=diameter/2+pad;
    const choices=[{x:p.x+gap,y:p.y-height/2},{x:p.x-gap-width,y:p.y-height/2},{x:p.x-width/2,y:p.y-gap-height},{x:p.x-width/2,y:p.y+gap}];
    const free=a=>!occupied.some(b=>a.x<b.x+b.w+pad&&a.x+width+pad>b.x&&a.y<b.y+b.h+pad&&a.y+height+pad>b.y);
    let box=choices.find(a=>a.x>=pad&&a.y>=pad&&a.x+width<=twin.width-pad&&a.y+height<=twin.height-pad&&free(a));
    if(!box&&hot){const clamped={x:Math.max(pad,Math.min(twin.width-width-pad,p.x-width/2)),y:Math.max(pad,Math.min(twin.height-height-pad,p.y+gap))};if(free(clamped))box=clamped}
    if(!box)continue;
    record.label={...box,w:width,h:height};occupied.push(record.label);if(hot)captioned.add(record.target);
    if(hot){tc.fillStyle='rgba(5,7,10,.86)';tc.fillRect(box.x,box.y,width,height)}
    tc.fillStyle=hot?'rgba(255,255,255,.98)':'rgba(241,239,233,.64)';typeInk(tc,text,box.x+pad,box.y+pad+size);
  }
}
/* Canvas ink must be repainted when the hosted face finishes loading. */
if(document.fonts){document.fonts.ready.then(()=>drawTwin());document.fonts.addEventListener('loadingdone',()=>drawTwin())}
function twinPoint(e){const r=twin.getBoundingClientRect();return {x:(e.clientX-r.left)*twin.width/r.width,y:(e.clientY-r.top)*twin.height/r.height}}
function hitTarget(x,y){
  const inBox=b=>b&&x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h;
  for(const b of [...targetInk].reverse())if(inBox(b.label))return b.target;
  const cross=(a,b)=>(b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x);
  const inside=ps=>[[0,2,1],[0,1,3],[0,3,2],[1,2,3]].some(f=>{const p=ps[f[0]],q=ps[f[1]],r=ps[f[2]];if(Math.abs((q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x))<1e-9)return false;const a=cross(p,q),b=cross(q,r),c=cross(r,p);return (a>=0&&b>=0&&c>=0)||(a<=0&&b<=0&&c<=0)});
  const bodies=targetInk.filter(b=>!b.root);
  for(const b of [...bodies].reverse())if(inside(b.corners))return b.target;
  let best=null;const reach=8*twin.width/Math.max(1,twin.getBoundingClientRect().width);
  for(const b of bodies)for(const [i,j] of edgeIx){const a=b.corners[i],p=b.corners[j],dx=p.x-a.x,dy=p.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1))),d=Math.hypot(x-a.x-t*dx,y-a.y-t*dy);if(d<=reach&&(!best||d<best.d))best={d,target:b.target}}
  return best?.target||targetInk.find(b=>b.root&&inside(b.corners))?.target||null;
}
function emitView(source){if(!nav)return;route.textContent='GLOBAL '+scopeId+':'+(activeGlobalAddress||'overview')+' · LOCAL VIEW '+(nav.view||'overview');miniState.textContent=(activeGlobalAddress||'overview')+' · '+GLOBAL_TARGETS.length+' sites';miniState.title=miniState.textContent;dispatchEvent(new CustomEvent('sss:view',{detail:{scopeId,path:nav.view||'',source}}))}
function emitOrientation(source='global'){dispatchEvent(new CustomEvent('sss:orientation',{detail:{orientation:[...orient],source}}))}
function inspect(path,source='philosophy-background'){if(!nav||!nav.inspect(path))return false;emitView(source);drawTwin();return true}
function clearInspection(source='clear'){if(!nav)return;nav.clearInspection();emitView(source);drawTwin()}
function setScope({id,projection:p}={}){if(!p?.root)throw new Error('scope projection required');scopeId=id||'scope';projection=p;nav=N.createState(p.root);STRUCT=nav.structure;rebuildBodies();emitView('scope');drawTwin();emitOrientation('scope')}
function setGlobalTargets(targets=[]){GLOBAL_TARGETS=(Array.isArray(targets)?targets:[]).map(t=>Object.freeze({path:String(t.path??''),locus:String(t.locus||''),interlocutorIds:Object.freeze([...(t.interlocutorIds||[])]),titles:Object.freeze({...t.titles}),bodies:Object.freeze((t.bodies||t.interlocutorIds?.filter(()=>t.path).map(id=>({id,path:t.path}))||[]).map(b=>Object.freeze({id:String(b.id),path:String(b.path)})))}));hoverTarget=null;rebuildBodies();drawTwin();emitView('global-targets');return GLOBAL_TARGETS}
function setActiveGlobalAddress(path='',locus='overview'){activeGlobalAddress=String(path??'');activeGlobalLocus=String(locus||'overview');emitView('global-encounter');drawTwin()}
function requestGlobalTarget(target,source='global-minimap',origin=null){if(!target)return false;dispatchEvent(new CustomEvent('sss:global-navigate',{detail:{scopeId,path:target.path,locus:target.locus,interlocutorIds:[...target.interlocutorIds],source,origin}}));return true}
function rotateBy(dx,dy,source='background'){ease=null;restActive=false;orient=qNorm(qMul(qAxis([1,0,0],dy*.00325),qMul(qAxis([0,1,0],dx*.00325),orient)));drawTwin();emitOrientation(source)}

twin.addEventListener('pointermove',e=>{const p=twinPoint(e),t=hitTarget(p.x,p.y);if(t!==hoverTarget){hoverTarget=t;drawTwin()}});
function zoomMap(factor,p={x:twin.width/2,y:twin.height/2}){
  const next=Math.max(1,mapZoom*factor);if(!Number.isFinite(next))return;const ratio=next/mapZoom;
  mapOffset.x=(mapOffset.x+twin.width/2-p.x)*ratio-twin.width/2+p.x;
  mapOffset.y=(mapOffset.y+twin.height/2-p.y)*ratio-twin.height/2+p.y;
  mapZoom=next;if(next===1)mapOffset={x:0,y:0};hoverTarget=null;drawTwin();
}
twin.addEventListener('wheel',e=>{e.preventDefault();zoomMap(Math.exp(-Math.max(-240,Math.min(240,e.deltaY))*.004),twinPoint(e))},{passive:false});
twin.addEventListener('dblclick',e=>{mapZoom=1;mapOffset={x:0,y:0};hoverTarget=null;drawTwin();e.preventDefault()});
twin.addEventListener('keydown',e=>{if(e.key.startsWith('Arrow')){e.preventDefault();const d=twin.width/4;mapOffset.x+=e.key==='ArrowLeft'?d:e.key==='ArrowRight'?-d:0;mapOffset.y+=e.key==='ArrowUp'?d:e.key==='ArrowDown'?-d:0;drawTwin();return}if(['+','=','-','0','Escape'].includes(e.key)){e.preventDefault();if(e.key==='0'||e.key==='Escape'){mapZoom=1;mapOffset={x:0,y:0};drawTwin()}else zoomMap(e.key==='-'?.5:2)}});
twin.addEventListener('pointerleave',()=>{hoverTarget=null;drawTwin()});
twin.addEventListener('pointerdown',e=>{
  if(e.button!==0||!nav)return;drawTwin();const p=twinPoint(e),target=hitTarget(p.x,p.y);
  const group=(!target||target.path==='')&&clusterInk.find(b=>Math.hypot(b.x-p.x,b.y-p.y)<=8*twin.width/Math.max(1,twin.getBoundingClientRect().width));
  if(group){zoomMap(2,{x:group.x,y:group.y});e.preventDefault()}
  else if(target){requestGlobalTarget(target,'global-minimap',{x:e.clientX,y:e.clientY});e.preventDefault()}
});

const axes={x:document.getElementById('axis-x'),y:document.getElementById('axis-y')};
const AXIS_SETTLE_MS=520,AXIS_SETTLE_EPS=.018;
// The knob wears the settle: swell and morph circle -> triangle while held still; the triangle arrives exactly at the lock.
const KNOB_SWELL=1.45,KNOB_FALL=4,KNOB_N=36,KNOB_R_CIRCLE=8.5,KNOB_R_TRIANGLE=11;
const KNOB_REDUCED=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const KNOB_CIRCLE=[],KNOB_TRIANGLE=[];
for(let i=0;i<KNOB_N;i++){const th=(-90+i*360/KNOB_N)*Math.PI/180,c=Math.cos(th),s=Math.sin(th),d=Math.min(...[-30,90,210].map(a=>Math.abs(Math.atan2(Math.sin(th-a*Math.PI/180),Math.cos(th-a*Math.PI/180))))),r=KNOB_R_TRIANGLE/2/Math.cos(d);KNOB_CIRCLE.push([KNOB_R_CIRCLE*c,KNOB_R_CIRCLE*s]);KNOB_TRIANGLE.push([r*c,r*s])}
function knobShape(knob){
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),poly=document.createElementNS(ns,'polygon');
  svg.setAttribute('class','knob-shape');svg.setAttribute('viewBox','-16 -16 32 32');svg.setAttribute('aria-hidden','true');svg.appendChild(poly);knob.appendChild(svg);
  return p=>{const u=p*p*(3-2*p);poly.setAttribute('points',KNOB_CIRCLE.map((c,i)=>(c[0]+(KNOB_TRIANGLE[i][0]-c[0])*u).toFixed(2)+','+(c[1]+(KNOB_TRIANGLE[i][1]-c[1])*u).toFixed(2)).join(' '));knob.style.setProperty('--knob-scale',(1+(KNOB_SWELL-1)*p).toFixed(3));knob.style.setProperty('--knob-lock',p.toFixed(3));knob.dataset.morph=p>0?'on':'off'}
}
function paintAxis(axis){if(!nav)return;const el=axes[axis],v=nav.axes[axis],k=el.querySelector('.knob');el.setAttribute('aria-valuenow',String(Math.round(v*100)));if(axis==='x')k.style.left=(50+v*43)+'%';else k.style.top=(50-v*43)+'%'}
function bindAxis(axis){
  const el=axes[axis];let active=null,timer=null,latched=false,lastValue=0;
  const clearTimer=()=>{if(timer!==null){clearTimeout(timer);timer=null}};
  const shape=knobShape(el.querySelector('.knob'));let shown=0,since=0,prev=0,raf=0;
  const showKnob=p=>{shown=Math.max(0,Math.min(1,p));shape(shown)};
  const stopKnob=()=>{if(raf){cancelAnimationFrame(raf);raf=0}};
  const tick=now=>{raf=0;if(active===null)return;const dt=Math.max(0,now-prev),target=Math.min(1,(now-since)/AXIS_SETTLE_MS);prev=now;showKnob(target>=shown?target:shown-dt*KNOB_FALL/AXIS_SETTLE_MS);raf=requestAnimationFrame(tick)};
  const sample=e=>{const v=N.axisValue(axis,el.getBoundingClientRect(),e.clientX,e.clientY),changed=Math.abs(v-lastValue)>AXIS_SETTLE_EPS;lastValue=v;nav.setAxis(axis,v);paintAxis(axis);return changed};
  const arm=()=>{clearTimer();if(active===null)return;since=prev=performance.now();if(!KNOB_REDUCED&&!raf)raf=requestAnimationFrame(tick);timer=setTimeout(()=>{timer=null;if(active===null)return;const pid=active;active=null;latched=true;el.dataset.latched='true';stopKnob();showKnob(1);try{if(el.hasPointerCapture(pid))el.releasePointerCapture(pid)}catch(_){}},AXIS_SETTLE_MS)};
  el.addEventListener('pointerdown',e=>{if(e.button!==0||!nav)return;clearTimer();if(latched){latched=false;el.dataset.latched='false';showKnob(0)}active=e.pointerId;try{el.setPointerCapture(active)}catch(_){}lastValue=N.axisValue(axis,el.getBoundingClientRect(),e.clientX,e.clientY);nav.setAxis(axis,lastValue);paintAxis(axis);arm();e.preventDefault()});
  el.addEventListener('pointermove',e=>{if(active!==e.pointerId)return;if(sample(e))arm();e.preventDefault()});
  const release=e=>{if(active!==e.pointerId)return;clearTimer();const pid=active;active=null;stopKnob();showKnob(0);nav.releaseAxis(axis);paintAxis(axis);try{if(el.hasPointerCapture(pid))el.releasePointerCapture(pid)}catch(_){}e.preventDefault()};
  el.addEventListener('pointerup',release);el.addEventListener('pointercancel',release);
  el.addEventListener('keydown',e=>{if(!nav)return;const valid=axis==='x'?['ArrowLeft','ArrowRight']:['ArrowUp','ArrowDown'];if(!valid.includes(e.key))return;e.preventDefault();const sign=(e.key==='ArrowRight'||e.key==='ArrowUp')?1:-1;nav.setAxis(axis,sign*(e.shiftKey?1:.52));paintAxis(axis)});
  el.addEventListener('keyup',()=>{if(!nav)return;nav.releaseAxis(axis);paintAxis(axis)});
  el.addEventListener('blur',()=>{if(!nav||latched)return;nav.releaseAxis(axis);paintAxis(axis)});
}
bindAxis('x');bindAxis('y');

function frame(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(ease){const u=Math.min(1,(now-ease.t0)/ease.ms),s=u*u*(3-2*u);orient=qNorm(ease.from.map((v,i)=>v+(ease.to[i]-v)*s));const src=ease.source;if(u>=1)ease=null;emitOrientation(src)}
  if(nav){const av=nav.angularVelocity();if(av.yaw||av.pitch){ease=null;restActive=false;if(av.yaw)orient=qNorm(qMul(qAxis([0,1,0],av.yaw*dt),orient));if(av.pitch)orient=qNorm(qMul(qAxis([1,0,0],av.pitch*dt),orient));emitOrientation('global-axis')}}
  const pocket=document.getElementById('mini-pocket');if(nav&&GLOBAL_BODIES.length&&pocket?.getAttribute?.('aria-hidden')!=='true')drawTwin(now);
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame);

function languageControls(){const help=lang==='de'?'Globale Site-Koerper: Scrollen oder +/- vergroessert; Pfeile verschieben; 0 setzt zurueck.':'Global site bodies: scroll or +/- to magnify; arrows pan; 0 resets.';twin.setAttribute('aria-label',help);twin.title=help;document.documentElement.lang=lang;document.querySelectorAll('[data-lang]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.lang===lang)))}
languageControls();
const inverseControl=document.getElementById('inverse-mode');
function inverseControls(){document.documentElement.dataset.inverse=String(Boolean(inverseControl?.checked))}
inverseControl?.addEventListener('change',inverseControls);inverseControls();
document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>{lang=b.dataset.lang==='de'?'de':'en';languageControls();const url=new URL(location.href);url.searchParams.set('lang',lang);history.replaceState(history.state,'',url.pathname+url.search+url.hash);dispatchEvent(new CustomEvent('sss:language',{detail:{language:lang}}))}));
addEventListener('popstate',()=>{const next=new URL(location.href).searchParams.get('lang')==='de'?'de':'en';if(next===lang)return;lang=next;languageControls();dispatchEvent(new CustomEvent('sss:language',{detail:{language:lang}}))});
document.querySelectorAll('[data-a11y-focus]').forEach(b=>b.addEventListener('click',()=>{const path=b.dataset.a11yFocus||'',target=GLOBAL_TARGETS.find(t=>t.path===path);if(target)requestGlobalTarget(target,'accessible-global-nav',{x:innerWidth/2,y:innerHeight/2})}));

globalThis.SSSWorldView=Object.freeze({setScope,setGlobalTargets,setActiveGlobalAddress,requestGlobalTarget,inspect,clearInspection,rotateBy,easeTo,restoreHome,drawTwin,get scopeId(){return scopeId},get projection(){return projection},get view(){return nav?.view||''},get language(){return lang},get orientation(){return [...orient]},get structure(){return STRUCT},get globalTargets(){return GLOBAL_TARGETS.slice()},get activeGlobalAddress(){return activeGlobalAddress},projectPoint(p,rect,scale=1.72){const q=qRot(orient,p),f=(Math.min(rect.width,rect.height)/2)/Math.tan(Math.PI/6.6),z=3.0-q[2]*scale;return {x:rect.width/2+q[0]*scale*f/z,y:rect.height/2-q[1]*scale*f/z,z:q[2]}}});
})();
