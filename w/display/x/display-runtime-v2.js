(() => {
'use strict';
const H=globalThis.SSSSiteHolon,F=globalThis.SSSSiteFold,W=globalThis.SSSWorldView,Fields=globalThis.SSSInterlocutorFields,Safe=globalThis.SSSDisplaySafeArea;
const Modules=globalThis.SSSInterlocutorModules;
if(!H||!F||!W||!Fields||!Safe||!(Modules instanceof Map)) throw new Error('Display runtime dependencies missing');
const SPEC=JSON.parse(document.getElementById('site-registry').textContent);
const PROJECTIONS=JSON.parse(document.getElementById('site-projections').textContent);
const GLOBAL_SCOPE='main';
const registry=H.createRegistry(),specs=new Map(),surfaces=new Map();
for(const s of SPEC.interlocutors||[]){
  const site=H.defineInterlocutor({id:s.id,localScope:s.local_scope,shader:s.shader,manifestation:s.manifestation,state:{activity:null}});
  registry.register(site);specs.set(site.id,s);
}
for(const m of SPEC.mounts||[]) registry.mount(m.interlocutor,{scope:m.scope,address:m.address});
for(const id of specs.keys()){
  const host=document.querySelector(`[data-interlocutor="${CSS.escape(id)}"]`);
  if(!host) throw new Error('missing interlocutor surface: '+id);
  const canvas=host.querySelector('.interlocutor-background'),labelHost=host.querySelector('.interlocutor-field-labels'),content=host.querySelector('.interlocutor-content');
  if(!canvas||!labelHost||!content) throw new Error('incomplete interlocutor surface: '+id);
  const module=Modules.get(id);if(!module) throw new Error('missing interlocutor module: '+id);
  if(!(id in PROJECTIONS)) throw new Error('missing interlocutor projection: '+id);
  surfaces.set(id,{host,canvas,labelHost,content,module,projection:PROJECTIONS[id]});
}
const rootResolved=registry.resolve(GLOBAL_SCOPE,'',{width:innerWidth,height:innerHeight});
if(!rootResolved.interlocutors.length) throw new Error('Display site-space has no overview interlocutor');
const ROOT_IDS=rootResolved.interlocutors.map(x=>x.interlocutorId);
const rootSurface=surfaces.get(ROOT_IDS[0]);
const GLOBAL_PROJECTION=(rootSurface.module.fieldProjection?rootSurface.module.fieldProjection(rootSurface.projection):rootSurface.projection);
if(!GLOBAL_PROJECTION?.root) throw new Error('overview interlocutor must expose the global address-space projection');
const activity=H.createActivityBus(registry),fold=F.createFold(document.getElementById('tetra-fold'));
const commit=document.getElementById('commit'),home=document.getElementById('root-home'),stateEl=document.getElementById('site-state'),stage=document.getElementById('interlocutor-stage');
const fieldById=new Map();
for(const [id,surface] of surfaces){
  const spec=specs.get(id),fieldProjection=surface.module.fieldProjection?surface.module.fieldProjection(surface.projection):surface.projection;
  fieldById.set(id,Fields.create({id,element:surface.host,canvas:surface.canvas,labelHost:surface.labelHost,projection:fieldProjection,palette:spec.shader?.palette,inspectable:Boolean(spec.manifestation?.background_inspect),draggable:spec.manifestation?.background_drag!==false,localScope:spec.local_scope}));
}
let activeIds=[...ROOT_IDS],activeAddress='',stack=[],pending=null,restoring=false;
function sameIds(a,b){return a.length===b.length&&a.every((x,i)=>x===b[i])}
function resolveGlobal(path=''){return registry.resolve(GLOBAL_SCOPE,path,{width:innerWidth,height:innerHeight})}
function snap(){return {globalScope:GLOBAL_SCOPE,activeIds:[...activeIds],activeAddress,stack:stack.map(x=>({...x,activeIds:[...x.activeIds]})),localView:W.view}}
function composition(){const c=H.composeInterlocutors(activeIds.map(interlocutorId=>({interlocutorId})),{width:innerWidth,height:innerHeight});document.documentElement.dataset.composition=c.mode;document.documentElement.dataset.compositionAxis=c.axis||'';stage.dataset.composition=c.mode;stage.dataset.axis=c.axis||'';stage.style.setProperty('--interlocutor-columns',String(c.columns||1));return c}
function globalTargets(){
  const loci=new Map();
  for(const id of specs.keys()){
    const m=registry.getMount(id);if(!m||m.scope!==GLOBAL_SCOPE)continue;
    let t=loci.get(m.locus);
    if(!t){t={path:m.rawAddress,locus:m.locus,interlocutorIds:[]};loci.set(m.locus,t)}
    if(m.rawAddress.length<t.path.length||(m.rawAddress.length===t.path.length&&m.rawAddress<t.path))t.path=m.rawAddress;
    if(!t.interlocutorIds.includes(id))t.interlocutorIds.push(id);
  }
  return [...loci.values()].sort((a,b)=>a.path.length-b.path.length||a.path.localeCompare(b.path));
}
function syncGlobalNavigator(){const r=resolveGlobal(activeAddress);W.setGlobalTargets(globalTargets());W.setActiveGlobalAddress(activeAddress,r.locus)}
function inspectCapable(ids=activeIds){return ids.some(id=>Boolean(specs.get(id)?.manifestation?.background_inspect))}
function resetSurface(id){const s=surfaces.get(id);if(!s)return;if(typeof s.module.unmount==='function')s.module.unmount({host:s.host,content:s.content,projection:s.projection});else{s.host.hidden=true;s.content.replaceChildren()}}
function render(path=W.view){
  for(const id of surfaces.keys())resetSurface(id);
  for(const id of activeIds){
    const s=surfaces.get(id),spec=specs.get(id);if(!s||!spec)continue;
    const localPath=spec.manifestation?.background_inspect?(path||''):'';
    s.module.render({id,host:s.host,content:s.content,projection:s.projection,path:localPath,language:W.language,activity:registry.getInterlocutor(id)?.state?.activity||null,safeArea:Safe.snapshot(),backgroundDrag:spec.manifestation?.background_drag!==false});
  }
  composition();Safe.refresh();
  const local=(inspectCapable()?(path||'overview'):'root');
  stateEl.textContent='WITNESS viewer · global '+GLOBAL_SCOPE+':'+(activeAddress||'overview')+' · local '+local+' · '+activeIds.join(' + ');
  document.documentElement.dataset.scope=GLOBAL_SCOPE;
}
/* Background inspection is intentionally separate from direct global minimap movement. */
function reconcile(){
  pending=null;commit.classList.remove('show');
  if(!inspectCapable()||!W.view)return;
  const r=resolveGlobal(W.view);if(!r.interlocutors.length)return;
  const ids=r.interlocutors.map(x=>x.interlocutorId);
  if(W.view===activeAddress&&sameIds(ids,activeIds))return;
  pending={resolved:r,path:W.view};
  const names=ids.map(id=>specs.get(id)?.title||id.replace(/^organism:/,''));
  commit.textContent=(W.language==='de'?'Locus öffnen · ':'open locus · ')+names.join(' + ');commit.classList.add('show');
}
function setLocalView(path='',source='restore'){if(path)W.inspect(path,source);else W.clearInspection(source);render(W.view);reconcile()}
function enter(r,path,push=true){
  if(!r.interlocutors.length)return false;
  stack.push({activeIds:[...activeIds],activeAddress,localView:W.view});
  activeIds=r.interlocutors.map(x=>x.interlocutorId);activeAddress=path;
  W.clearInspection('encounter-change');syncGlobalNavigator();render('');reconcile();
  if(push&&!restoring)history.pushState(snap(),'','#'+encodeURIComponent(GLOBAL_SCOPE)+':'+encodeURIComponent(activeAddress||'overview'));
  return true;
}
function navigateGlobal(path,push=true,origin=null){
  const r=resolveGlobal(path);if(!r.interlocutors.length)return false;
  const ids=r.interlocutors.map(x=>x.interlocutorId);
  if(path===activeAddress&&sameIds(ids,activeIds)){if(inspectCapable())setLocalView('','global-current');return true}
  if(fold.busy)return false;
  fold.swap(()=>enter(r,path,push),{origin,from:activeAddress,to:path});return true;
}
function leave(push=true){
  if(!stack.length)return navigateGlobal('',push,{x:innerWidth/2,y:innerHeight/2});
  const prev=stack.pop();activeIds=prev.activeIds;activeAddress=prev.activeAddress||'';syncGlobalNavigator();
  if(inspectCapable(activeIds)&&prev.localView)W.inspect(prev.localView,'return');else W.clearInspection('return');
  render(W.view);reconcile();if(push&&!restoring)history.pushState(snap(),'','#'+GLOBAL_SCOPE+':'+encodeURIComponent(activeAddress||'overview'));return true;
}
addEventListener('sss:view',e=>{if(e.detail.scopeId!==GLOBAL_SCOPE)return;render(e.detail.path||'');reconcile()});
addEventListener('sss:global-navigate',e=>{if(e.detail?.scopeId!==GLOBAL_SCOPE)return;navigateGlobal(e.detail.path??'',true,e.detail.origin||null)});
addEventListener('sss:language',()=>{render(W.view);reconcile()});addEventListener('resize',()=>{Safe.refresh();composition()});
commit.addEventListener('click',e=>{if(!pending||fold.busy)return;e.preventDefault();const p=pending;fold.swap(()=>enter(p.resolved,p.path),{origin:{x:innerWidth/2,y:innerHeight/2},from:activeAddress,to:p.path})});
home.addEventListener('click',e=>{e.preventDefault();if(activeAddress||!sameIds(activeIds,ROOT_IDS))navigateGlobal('',true,{x:innerWidth/2,y:innerHeight/2});else setLocalView('','home')});
addEventListener('keydown',e=>{if(e.metaKey||e.ctrlKey||e.altKey)return;if(e.key==='Enter'&&pending&&!fold.busy){e.preventDefault();commit.click()}else if(e.key==='Escape'){e.preventDefault();if(stack.length)leave();else home.click()}});
activity.subscribe(e=>{const site=registry.getInterlocutor(e.interlocutorId);if(site)site.state.activity=e;fieldById.get(e.interlocutorId)?.pulse();if(activeIds.includes(e.interlocutorId))render(W.view)});
function receiveActivity(event){return activity.receive(event)}
addEventListener('sss:activity',e=>{if(e.detail)receiveActivity(e.detail)});
addEventListener('popstate',e=>{if(!e.state)return;restoring=true;try{activeIds=e.state.activeIds||[...ROOT_IDS];activeAddress=e.state.activeAddress||'';stack=e.state.stack||[];syncGlobalNavigator();if(inspectCapable(activeIds)&&e.state.localView)W.inspect(e.state.localView,'history');else W.clearInspection('history');render(W.view);reconcile()}finally{restoring=false}});
Safe.start();W.setScope({id:GLOBAL_SCOPE,projection:GLOBAL_PROJECTION});syncGlobalNavigator();history.replaceState(snap(),'','#'+GLOBAL_SCOPE+':overview');render('');reconcile();
function remount(id,scope,address){const relation=registry.mount(id,{scope,address});if(activeIds.length===1&&activeIds[0]===id&&scope===GLOBAL_SCOPE)activeAddress=relation.rawAddress;syncGlobalNavigator();render(W.view);reconcile();return relation}
globalThis.SSSDisplayRuntime=Object.freeze({registry,activity,receiveActivity,navigateGlobal,resolveGlobal,resolve:(scope,path)=>registry.resolve(scope,path,{width:innerWidth,height:innerHeight}),remount,get state(){return snap()},get fields(){return fieldById},get globalScope(){return GLOBAL_SCOPE},get globalTargets(){return globalTargets()},get rootIds(){return [...ROOT_IDS]}});
})();
