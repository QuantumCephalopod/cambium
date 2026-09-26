(() => {
'use strict';
const H=globalThis.SSSSiteHolon,F=globalThis.SSSSiteFold,W=globalThis.SSSWorldView,Fields=globalThis.SSSInterlocutorFields,Safe=globalThis.SSSDisplaySafeArea;
const Modules=globalThis.SSSInterlocutorModules;
if(!H||!F||!W||!Fields||!Safe||!(Modules instanceof Map)) throw new Error('Display runtime dependencies missing');
const SPEC=JSON.parse(document.getElementById('site-registry').textContent);
const PROJECTIONS=JSON.parse(document.getElementById('site-projections').textContent);
const DEPENDENCIES=JSON.parse(document.getElementById('display-dependencies').textContent);
const GLOBAL_SCOPE='main';
function dependency(identity,member=''){
  if(typeof identity!=='string'||!identity)throw new TypeError('dependency identity required');
  const dep=DEPENDENCIES?.[identity];if(!dep)throw new Error('unknown Display dependency identity: '+identity);
  if(typeof member!=='string')throw new TypeError('dependency member must be a relative path');
  const path=member.replaceAll('\\','/');
  if(path.startsWith('/')||path.split('/').some(x=>x==='..'))throw new Error('dependency member escaped its body: '+member);
  return new URL(dep.base+path,document.baseURI).href;
}
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
const home=document.getElementById('root-home'),stateEl=document.getElementById('site-state'),stage=document.getElementById('interlocutor-stage');
const fieldById=new Map();
/* A site floats inside the container the witness came through: the encounter it
 * was entered from on the walked stack, else the overview interlocutor that
 * contains all of site-space. Its geometric path inside that host is its mount
 * address relative to the host's own. Central Display names no specimen. */
function hostEnvironment(id){
  const m=registry.getMount(id);if(!m||m.scope!==GLOBAL_SCOPE||!activeIds.includes(id))return null;
  const from=stack.length?stack.at(-1).activeIds.find(x=>x!==id):null,hostId=from||ROOT_IDS.find(x=>x!==id);
  if(!hostId)return null;const hm=registry.getMount(hostId);if(!hm||!m.rawAddress.startsWith(hm.rawAddress)||m.rawAddress===hm.rawAddress)return null;
  const hs=surfaces.get(hostId),shader=hs?.module?.shader,root=(hs?.module?.fieldProjection?hs.module.fieldProjection(hs.projection):hs?.projection)?.root;
  if(!shader?.fragment||!root)return null;
  return Object.freeze({hostId,shader,root,palette:specs.get(hostId)?.shader?.palette,path:m.rawAddress.slice(hm.rawAddress.length)});
}
/* Organisms float as bodies inside the overview interlocutor that contains all of
 * site-space, each at its mount cell. Nested hosting beyond one membrane is not yet
 * realized. */
function floatingBodies(id){
  if(!ROOT_IDS.includes(id))return [];
  const out=[];
  for(const other of specs.keys()){
    if(ROOT_IDS.includes(other))continue;const m=registry.getMount(other);if(!m||m.scope!==GLOBAL_SCOPE||!m.rawAddress)continue;
    const s2=surfaces.get(other),shader=s2?.module?.shader,root=(s2?.module?.fieldProjection?s2.module.fieldProjection(s2.projection):s2?.projection)?.root;
    if(shader?.fragment&&root)out.push({id:other,path:m.rawAddress,shader,root,palette:specs.get(other)?.shader?.palette});
  }
  return out;
}
for(const [id,surface] of surfaces){
  const spec=specs.get(id),fieldProjection=surface.module.fieldProjection?surface.module.fieldProjection(surface.projection):surface.projection;
  fieldById.set(id,Fields.create({id,element:surface.host,canvas:surface.canvas,labelHost:surface.labelHost,projection:fieldProjection,palette:spec.shader?.palette,inspectable:Boolean(spec.manifestation?.background_inspect),draggable:spec.manifestation?.background_drag!==false,localScope:spec.local_scope,environment:()=>hostEnvironment(id),bodies:()=>floatingBodies(id)}));
}
let activeIds=[...ROOT_IDS],activeAddress='',stack=[],restoring=false;
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
    s.module.render({id,host:s.host,content:s.content,projection:s.projection,path:localPath,language:W.language,activity:registry.getInterlocutor(id)?.state?.activity||null,safeArea:Safe.snapshot(),backgroundDrag:spec.manifestation?.background_drag!==false,dependency});
  }
  composition();Safe.refresh();
  const local=(inspectCapable()?(path||'overview'):'root');
  stateEl.textContent='WITNESS viewer · global '+GLOBAL_SCOPE+':'+(activeAddress||'overview')+' · local '+local+' · '+activeIds.join(' + ');
  document.documentElement.dataset.scope=GLOBAL_SCOPE;
}
/* Background inspection is local. Global encounter changes happen only through explicit global target events. */
function setLocalView(path='',source='restore'){if(path)W.inspect(path,source);else W.clearInspection(source);render(W.view)}
function enter(r,path,push=true){
  if(!r.interlocutors.length)return false;
  stack.push({activeIds:[...activeIds],activeAddress,localView:W.view});
  activeIds=r.interlocutors.map(x=>x.interlocutorId);activeAddress=path;
  W.clearInspection('encounter-change');syncGlobalNavigator();render('');
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
  render(W.view);if(push&&!restoring)history.pushState(snap(),'','#'+GLOBAL_SCOPE+':'+encodeURIComponent(activeAddress||'overview'));return true;
}
addEventListener('sss:view',e=>{if(e.detail.scopeId!==GLOBAL_SCOPE)return;render(e.detail.path||'')});
addEventListener('sss:global-navigate',e=>{if(e.detail?.scopeId!==GLOBAL_SCOPE)return;navigateGlobal(e.detail.path??'',true,e.detail.origin||null)});
/* Ascent past a site's own root continues through the membrane: the same
 * gesture returns to the container the witness came through. */
addEventListener('sss:enter-body',e=>{const d=e.detail||{};if(!d.id||!activeIds.includes(d.from))return;const m=registry.getMount(d.id);if(m&&m.scope===GLOBAL_SCOPE)navigateGlobal(m.rawAddress,true,d.origin||null)});
addEventListener('sss:membrane-ascend',e=>{const id=e.detail?.id;if(!id||!activeIds.includes(id))return;if(stack.length)leave();else if(activeAddress)navigateGlobal('',true,{x:innerWidth/2,y:innerHeight/2})});
addEventListener('sss:language',()=>{render(W.view)});addEventListener('resize',()=>{Safe.refresh();composition()});
home.addEventListener('click',e=>{e.preventDefault();if(activeAddress||!sameIds(activeIds,ROOT_IDS))navigateGlobal('',true,{x:innerWidth/2,y:innerHeight/2});else setLocalView('','home')});
addEventListener('keydown',e=>{if(e.metaKey||e.ctrlKey||e.altKey)return;if(e.key==='Escape'){e.preventDefault();if(stack.length)leave();else home.click()}});
activity.subscribe(e=>{const site=registry.getInterlocutor(e.interlocutorId);if(site)site.state.activity=e;fieldById.get(e.interlocutorId)?.pulse();if(activeIds.includes(e.interlocutorId))render(W.view)});
function receiveActivity(event){return activity.receive(event)}
addEventListener('sss:activity',e=>{if(e.detail)receiveActivity(e.detail)});
addEventListener('popstate',e=>{if(!e.state)return;restoring=true;try{activeIds=e.state.activeIds||[...ROOT_IDS];activeAddress=e.state.activeAddress||'';stack=e.state.stack||[];syncGlobalNavigator();if(inspectCapable(activeIds)&&e.state.localView)W.inspect(e.state.localView,'history');else W.clearInspection('history');render(W.view);reconcile()}finally{restoring=false}});
Safe.start();W.setScope({id:GLOBAL_SCOPE,projection:GLOBAL_PROJECTION});syncGlobalNavigator();history.replaceState(snap(),'','#'+GLOBAL_SCOPE+':overview');render('');
function remount(id,scope,address){const relation=registry.mount(id,{scope,address});if(activeIds.length===1&&activeIds[0]===id&&scope===GLOBAL_SCOPE)activeAddress=relation.rawAddress;syncGlobalNavigator();render(W.view);return relation}
globalThis.SSSDisplayRuntime=Object.freeze({registry,activity,receiveActivity,navigateGlobal,resolveGlobal,resolve:(scope,path)=>registry.resolve(scope,path,{width:innerWidth,height:innerHeight}),dependency,remount,get state(){return snap()},get fields(){return fieldById},get globalScope(){return GLOBAL_SCOPE},get globalTargets(){return globalTargets()},get rootIds(){return [...ROOT_IDS]}});
})();
