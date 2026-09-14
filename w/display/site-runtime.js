(() => {
'use strict';
const H=globalThis.SSSSiteHolon,F=globalThis.SSSSiteFold,N=globalThis.SSSDisplayNavigation;
if(!H||!F||!N) throw new Error('site-holon runtime dependencies missing');
const DATA=JSON.parse(document.getElementById('root-projection').textContent);
const MOUNTS=JSON.parse(document.getElementById('site-mounts').textContent);
const registry=H.createRegistry();
const siteSpecs=new Map();
for(const spec of MOUNTS.sites){
  const site=H.defineSite({id:spec.id,shader:spec.shader,manifestation:spec.manifestation,state:{activity:null}});
  registry.register(site);siteSpecs.set(site.id,spec);
  registry.mount(site.id,spec.witnesses.map((w,i)=>({witness:w,interlocutor:spec.interlocutors?.[i]||{id:spec.id+':'+i}})));
}
const activity=H.createActivityBus(registry);
const fold=F.createFold(document.getElementById('tetra-fold'));
const route=document.getElementById('route-mark'),stateEl=document.getElementById('site-state'),commit=document.getElementById('commit'),home=document.getElementById('root-home'),canvas=document.getElementById('locus-stage');
let currentWitness=null,currentSite=null,initial=true,handlingHistory=false,pulse=0,palette=[.3,.7,.9];

function routeState(){
  const text=route.textContent||'';
  const pm=text.match(/PAGE main:([^ ·]+)/i),vm=text.match(/VIEW main:([^ ·]+)/i);
  const page=!pm||pm[1]==='root'?'':pm[1].toLowerCase();
  const view=!vm||vm[1]==='root'?'':vm[1].toLowerCase();
  return {page,view};
}
function stateFor(witness){return registry.resolve(witness,{width:innerWidth,height:innerHeight});}
function destinationFor(witness){const resolved=stateFor(witness),spec=resolved&&siteSpecs.get(resolved.siteId);return spec?.manifestation?.enter||null;}
function crossMembrane(destination,witness){const event=new CustomEvent('sss:navigate',{cancelable:true,detail:{href:destination.href,siteId:destination.site_id,fromWitness:witness}});if(!dispatchEvent(event))return false;location.assign(destination.href);return true;}
function encounterHandler(){const {page,view}=routeState();if(page||!view)return null;const destination=destinationFor(view);return destination?()=>crossMembrane(destination,view):null;}
function reconcileEncounter(){const {page,view}=routeState();if(page||!view)return;const destination=destinationFor(view),copy=document.getElementById('page-copy');if(destination){const de=document.documentElement.lang==='de';commit.textContent=(de?'Organismus betreten · ':'enter organism · ')+(destination.label||destination.site_id);commit.classList.add('show');commit.onclick=()=>crossMembrane(destination,view);copy?.classList.add('has-commit');}else{commit.classList.remove('show');commit.onclick=null;copy?.classList.remove('has-commit');}}
function showState(witness){
  const resolved=stateFor(witness);
  if(!resolved){stateEl.textContent=witness?'UNMOUNTED WITNESS · '+witness:'';return null;}
  const spec=siteSpecs.get(resolved.siteId),a=activity.current(resolved.siteId);
  palette=spec?.shader?.palette||[.3,.7,.9];
  stateEl.innerHTML='<strong>'+resolved.siteId+'</strong> · locus '+resolved.locus+' · witness '+(resolved.witness||'root')+(a?' · '+a.kind+' '+a.state:'');
  document.documentElement.dataset.siteEntered=String(Boolean(witness));
  document.documentElement.dataset.siteId=resolved.siteId;
  document.documentElement.dataset.locus=resolved.locus;
  document.documentElement.dataset.witness=resolved.witness||'';
  currentSite=resolved;
  return resolved;
}
function syncFromNavigator(){
  const {page}=routeState(),witness=page;
  const changed=currentWitness!==witness;
  const resolved=showState(witness);
  if(changed&&resolved){
    const historyState={siteId:resolved.siteId,locus:resolved.locus,witness};
    if(handlingHistory){handlingHistory=false;}
    else if(initial){history.replaceState(historyState,'',witness?'#/'+witness:location.pathname+location.search);}
    else history.pushState(historyState,'',witness?'#/'+witness:location.pathname+location.search);
    currentWitness=witness;
  }
  initial=false;
}
new MutationObserver(()=>queueMicrotask(()=>{syncFromNavigator();reconcileEncounter();})).observe(route,{childList:true,characterData:true,subtree:true});
addEventListener('resize',()=>showState(currentWitness||''));

function foldClick(element,getHandler){
  element.addEventListener('click',e=>{
    if(fold.busy)return;
    const handler=getHandler();if(typeof handler!=='function')return;
    e.preventDefault();e.stopImmediatePropagation();
    fold.swap(()=>handler.call(element));
  },true);
}
foldClick(commit,()=>{const {page,view}=routeState();if(!page&&view)return encounterHandler();return commit.onclick;});
addEventListener('keydown',e=>{if(e.key!=='Enter'||e.metaKey||e.ctrlKey||e.altKey)return;const {page,view}=routeState();if(page||!view)return;e.preventDefault();e.stopImmediatePropagation();const handler=encounterHandler();if(handler&&!fold.busy)commit.click();},true);
home.addEventListener('click',e=>{
  if(!currentWitness||fold.busy)return;
  const handler=commit.onclick;if(typeof handler!=='function')return;
  e.preventDefault();e.stopImmediatePropagation();fold.swap(()=>handler.call(commit));
},true);

function goRootWitness(witness){
  if(!/^[wxzy]$/.test(witness)) return false;
  const button=document.querySelector('[data-a11y-focus="'+witness+'"]');if(!button)return false;
  button.click();const enter=commit.onclick;if(typeof enter!=='function')return false;enter.call(commit);return true;
}
addEventListener('popstate',e=>{
  const target=e.state?.witness??'';if(target===currentWitness)return;
  handlingHistory=true;
  const leave=currentWitness&&typeof commit.onclick==='function'?commit.onclick:null;
  fold.swap(()=>{
    if(leave)leave.call(commit);
    if(target&&!goRootWitness(target)){handlingHistory=false;showState(currentWitness||'');}
  });
});

const AXIS_HOLD_MS=650,AXIS_STEADY_EPS=.035,AXIS_MIN_LATCH=.09;
function bindAxisLatch(axis){
  const el=document.getElementById('axis-'+axis);if(!el)return;let active=null,latched=false,ready=false,timer=null,last=0;
  const value=e=>N.axisValue(axis,el.getBoundingClientRect(),e.clientX,e.clientY);
  const clear=()=>{if(timer!==null){clearTimeout(timer);timer=null}ready=false;delete el.dataset.latchReady};
  const arm=v=>{clear();if(Math.abs(v)<AXIS_MIN_LATCH)return;const held=v;timer=setTimeout(()=>{timer=null;if(active===null||Math.abs(last-held)>AXIS_STEADY_EPS)return;ready=true;el.dataset.latchReady='true';},AXIS_HOLD_MS);};
  el.addEventListener('pointerdown',e=>{if(e.button!==0)return;if(latched){latched=false;el.dataset.latched='false';}active=e.pointerId;last=value(e);arm(last);},true);
  el.addEventListener('pointermove',e=>{if(active!==e.pointerId)return;const v=value(e);if(Math.abs(v-last)>AXIS_STEADY_EPS)arm(v);last=v;},true);
  el.addEventListener('pointerup',e=>{if(active!==e.pointerId)return;const keep=ready&&Math.abs(last)>=AXIS_MIN_LATCH;clear();if(keep){latched=true;el.dataset.latched='true';e.preventDefault();e.stopImmediatePropagation();if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);}else{latched=false;el.dataset.latched='false';}active=null;},true);
  el.addEventListener('pointercancel',e=>{if(active!==e.pointerId)return;clear();latched=false;el.dataset.latched='false';active=null;},true);
  el.addEventListener('blur',e=>{if(latched)e.stopImmediatePropagation();},true);
}
bindAxisLatch('x');bindAxisLatch('y');

activity.subscribe(e=>{
  const site=registry.getSite(e.siteId);if(site)site.state.activity=e;
  if(currentSite?.siteId===e.siteId){pulse=e.semanticChanged?1:e.projectionChanged?.72:.42;showState(currentWitness||'');}
});
function receiveActivity(event){return activity.receive(event);}
addEventListener('sss:activity',e=>{if(e.detail)receiveActivity(e.detail);});
globalThis.SSSDisplayRuntime=Object.freeze({registry,activity,receiveActivity,resolve:w=>registry.resolve(w,{width:innerWidth,height:innerHeight})});

const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false});
if(gl){
  const vs='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fs='precision highp float;uniform float t;uniform vec2 r;uniform vec3 c;uniform float pulse;void main(){vec2 u=(gl_FragCoord.xy-.5*r)/min(r.x,r.y);float d=length(u),a=atan(u.y,u.x);float bands=.5+.5*sin(d*34.-t*.7+sin(a*4.)*2.);float ring=exp(-26.*abs(d-(.22+.04*sin(t))));vec3 base=mix(vec3(.005,.008,.014),c*.32,bands*.16+ring*(.18+pulse*.42));float v=smoothstep(1.05,.12,d);gl_FragColor=vec4(base,v*(.45+pulse*.28));}';
  const sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
  const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const pos=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  const T=gl.getUniformLocation(pr,'t'),R=gl.getUniformLocation(pr,'r'),C=gl.getUniformLocation(pr,'c'),P=gl.getUniformLocation(pr,'pulse');
  function frame(ms){
    const d=Math.min(devicePixelRatio||1,1.5),w=Math.max(1,Math.floor(innerWidth*d)),h=Math.max(1,Math.floor(innerHeight*d));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(pr);gl.uniform1f(T,ms*.001);gl.uniform2f(R,w,h);gl.uniform3fv(C,new Float32Array(palette));gl.uniform1f(P,pulse);gl.drawArrays(gl.TRIANGLES,0,6);pulse*=.965;requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
syncFromNavigator();reconcileEncounter();
})();
