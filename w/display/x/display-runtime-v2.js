(() => {
'use strict';
const Nav=globalThis.SSSDisplayNavigation,H=globalThis.SSSSiteHolon,F=globalThis.SSSSiteFold,W=globalThis.SSSWorldView,Fields=globalThis.SSSInterlocutorFields,Safe=globalThis.SSSDisplaySafeArea,UI=globalThis.SSSUIGrid;
const Modules=globalThis.SSSInterlocutorModules,RH=globalThis.SSSRepresentationHandoff;
if(!H||!F||!W||!Fields||!Safe||!UI||!RH||!(Modules instanceof Map)) throw new Error('Display runtime dependencies missing');
const SPEC=JSON.parse(document.getElementById('site-registry').textContent);
const PROJECTIONS=JSON.parse(document.getElementById('site-projections').textContent);
const FEED_URLS=JSON.parse(document.getElementById('site-feed-locations')?.textContent||'{}');
const UI_GRIDS=JSON.parse(document.getElementById('site-ui-grids').textContent);
const DEPENDENCIES=JSON.parse(document.getElementById('display-dependencies').textContent);
const GLOBAL_SCOPE='main';
/* The glass drop's current viewport geometry (or null). Display lends where it lies; what it means over a site is the site's. */
function lensNow(){const s=globalThis.SSSDisplayLens?.snapshot?.()?.lens;return s?{x:s.x,y:s.y,r:s.hx,held:!!s.held,docked:!!s.docked}:null}
function dependency(identity,member=''){
  if(typeof identity!=='string'||!identity)throw new TypeError('dependency identity required');
  const dep=DEPENDENCIES?.[identity];if(!dep)throw new Error('unknown Display dependency identity: '+identity);
  if(typeof member!=='string')throw new TypeError('dependency member must be a relative path');
  const path=member.replaceAll('\\','/');
  if(path.startsWith('/')||path.split('/').some(x=>x==='..'))throw new Error('dependency member escaped its body: '+member);
  return new URL(dep.base+path,document.baseURI).href;
}
function surfaceRect(host){
  const r=typeof host?.getBoundingClientRect==='function'?host.getBoundingClientRect():null;
  if(r&&Number.isFinite(r.width)&&Number.isFinite(r.height)){
    const left=Number(r.left)||0,top=Number(r.top)||0;
    return {left,top,right:Number.isFinite(r.right)?r.right:left+r.width,bottom:Number.isFinite(r.bottom)?r.bottom:top+r.height,width:r.width,height:r.height};
  }
  return {left:0,top:0,right:innerWidth,bottom:innerHeight,width:innerWidth,height:innerHeight};
}
/* The screen lattice orients content; occupied regions do not subtract
 * field capacity. The top membrane supplies a shared starting line, while
 * right/bottom HUDs remain overlapping, independently layered surfaces. */
function safeCarrier(host){
  const hr=surfaceRect(host),snap=Safe.snapshot?.()||{},ins=snap.insets||{};
  const top=Math.max(0,Math.min(hr.height,(Number(ins.top)||0)-hr.top));
  return {x:0,y:top,w:hr.width,h:Math.max(0,hr.height-top)};
}
function makeSiteUI(id,host,raw){
  const state=UI.normalizeState(raw),bindings=new Map();
  function carrierVariant(carrier){return carrier.h>carrier.w?'portrait':''}
  function field(name,carrier=safeCarrier(host)){
    const info=UI.fieldInfo(state,name,carrierVariant(carrier));
    return Object.freeze({id:name,label:info.label,cells:Object.freeze([...info.cells]),bounds:Object.freeze({...info.bounds}),z:info.z,variant:info.variant||'default'});
  }
  function apply(el,name){
    if(!el)throw new TypeError('UI field element required');
    const c=safeCarrier(host),info=field(name,c),b=info.bounds;
    // Do not force grid-cell width/height or wipe identity-owned insets.
    // Stacking is deterministic within the site's isolated Display layer.
    const tie=Object.keys(state.fields).sort().indexOf(name);
    Object.assign(el.style,{
      position:'absolute',
      left:(c.x+b.x*c.w)+'px',
      top:(c.y+b.y*c.h)+'px',
      zIndex:String(4+info.z*64+tie)
    });
    if(el.dataset){el.dataset.uiField=name;el.dataset.uiVariant=info.variant}
    return el;
  }
  function bind(el,name){bindings.set(el,name);return apply(el,name)}
  function refresh(){
    for(const [el,name] of [...bindings]){
      if(el.isConnected===false){bindings.delete(el);continue}
      apply(el,name);
    }
  }
  return Object.freeze({id,state,field,bind,refresh,get carrier(){return Object.freeze({...safeCarrier(host)})}});
}
const registry=H.createRegistry(),specs=new Map(),surfaces=new Map(),uiById=new Map();
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
  if(!(id in UI_GRIDS)) throw new Error('missing interlocutor UI grid: '+id);
  const preview=PROJECTIONS[id],deferred=Object.prototype.hasOwnProperty.call(FEED_URLS,id);
  // A public _feed preview belongs to this child. Full source is not present yet.
  // An unopted-in site keeps its existing eager source/renderer behavior.
  const previewFieldProjection=deferred
    ?(module.feedPreview?module.feedPreview(preview):preview)
    :(module.fieldProjection?module.fieldProjection(preview):preview);
  if(!previewFieldProjection?.root)throw new Error('site preview lacks a rooted body: '+id);
  const projection=deferred?null:preview,fieldProjection=previewFieldProjection,ui=makeSiteUI(id,host,UI_GRIDS[id]);
  uiById.set(id,ui);surfaces.set(id,{host,canvas,labelHost,content,module,projection,fieldProjection,previewFieldProjection,ui});
}
const rootResolved=registry.resolve(GLOBAL_SCOPE,'',{width:innerWidth,height:innerHeight});
if(!rootResolved.interlocutors.length) throw new Error('Display site-space has no overview interlocutor');
const ROOT_IDS=rootResolved.interlocutors.map(x=>x.interlocutorId);
const rootSurface=surfaces.get(ROOT_IDS[0]);
const GLOBAL_PROJECTION=rootSurface.fieldProjection;
if(!rootSurface.projection||!GLOBAL_PROJECTION?.root) throw new Error('overview interlocutor must expose its full public root; an outer preview cannot replace site-space authority');
const activity=H.createActivityBus(registry),fold=F.createFold(document.getElementById('tetra-fold'));
const home=document.getElementById('root-home'),stateEl=document.getElementById('site-state'),stage=document.getElementById('interlocutor-stage');
const fieldById=new Map();
/* A site floats inside the container the witness came through: the encounter it
 * was entered from on the walked stack, else the overview interlocutor that
 * contains all of site-space. Its geometric path inside that host is its mount
 * address relative to the host's own. Central Display names no specimen. */
const hostStructures=new Map();
function placeIn(hostId,root,path){let st=hostStructures.get(hostId);if(!st){st=Nav.collectStructure(root);hostStructures.set(hostId,st)}return Fields.placement(st,path)}
function hostEnvironment(id){
  const m=registry.getMount(id);if(!m||m.scope!==GLOBAL_SCOPE||!activeIds.includes(id))return null;
  const from=stack.length?stack.at(-1).activeIds.find(x=>x!==id):null,hostId=from||ROOT_IDS.find(x=>x!==id);
  if(!hostId)return null;const hm=registry.getMount(hostId);if(!hm||!m.rawAddress.startsWith(hm.rawAddress)||m.rawAddress===hm.rawAddress)return null;
  const hs=surfaces.get(hostId),shader=hs?.module?.shader,root=hs?.fieldProjection?.root;
  if(!shader?.fragment||!root)return null;
  const path=m.rawAddress.slice(hm.rawAddress.length);
  return Object.freeze({hostId,shader,palette:specs.get(hostId)?.shader?.palette,path,place:placeIn(hostId,root,path)});
}
/* Organisms float as bodies inside the overview interlocutor that contains all of
 * site-space, each at its mount cell. Nested hosting beyond one membrane is not yet
 * realized. */
function floatingBodies(id){
  if(!ROOT_IDS.includes(id))return [];
  const out=[];
  for(const other of specs.keys()){
    if(ROOT_IDS.includes(other))continue;const m=registry.getMount(other);if(!m||m.scope!==GLOBAL_SCOPE||!m.rawAddress)continue;
    const s2=surfaces.get(other),shader=s2?.module?.shader,root=s2?.previewFieldProjection?.root;
    if((shader?.body?.fragment||shader?.fragment)&&root)out.push({id:other,path:m.rawAddress,shader,root,palette:specs.get(other)?.shader?.palette,title:specs.get(other)?.title||other});
  }
  return out;
}
function activateField(id){
  if(fieldById.has(id))return fieldById.get(id);
  const surface=surfaces.get(id),spec=specs.get(id);
  if(!surface?.projection)throw new Error('site detail not acquired: '+id);
  if(surface.fieldProjection===surface.previewFieldProjection && FEED_URLS[id]){
    surface.fieldProjection=surface.module.fieldProjection?surface.module.fieldProjection(surface.projection):surface.projection;
  }
  const field=Fields.create({id,element:surface.host,canvas:surface.canvas,labelHost:surface.labelHost,projection:surface.fieldProjection,palette:spec.shader?.palette,inspectable:Boolean(spec.manifestation?.background_inspect),draggable:spec.manifestation?.background_drag!==false,localScope:spec.local_scope,environment:()=>hostEnvironment(id),bodies:()=>floatingBodies(id)});
  fieldById.set(id,field);return field;
}
// Existing small/inlined bodies keep their established eager behavior.
// Feed-opted children remain real mounted identities without GPU initialization.
for(const [id,s] of surfaces)if(s.projection)activateField(id);
const detailHandoff=RH.create({limit:2});
function acquireDetail(id){
  const s=surfaces.get(id);if(!s)throw new Error('unknown site identity: '+id);
  if(s.projection)return null;
  const entry=FEED_URLS[id];
  if(typeof entry!=='string'||!/^assets\/[a-f0-9]{16}\/site-[a-z0-9-]+-feed\.json$/.test(entry))throw new Error('untrusted feed source for '+id);
  const record=detailHandoff.request(id,()=>fetch(new URL(entry,document.baseURI),{credentials:'same-origin',cache:'force-cache'})
    .then(response=>{if(!response.ok)throw new Error('feed HTTP '+response.status+' for '+id);return response.json()})
    .then(detail=>{if(!detail||typeof detail!=='object'||Array.isArray(detail))throw new Error('malformed public feed for '+id);s.projection=detail;return detail}),{retryFailed:true});
  return record.promise;
}
function acquireTarget(ids){
  const jobs=ids.map(acquireDetail).filter(Boolean);
  return jobs.length?Promise.all(jobs):null;
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
let renderedIds=new Set();
function render(path=W.view){
  for(const id of surfaces.keys())resetSurface(id);
  for(const id of activeIds){
    const s=surfaces.get(id),spec=specs.get(id);if(!s||!spec)continue;
    const localPath=spec.manifestation?.background_inspect?(path||''):'';
    s.module.render({id,host:s.host,content:s.content,projection:s.projection,path:localPath,language:W.language,activity:registry.getInterlocutor(id)?.state?.activity||null,safeArea:Safe.snapshot(),backgroundDrag:spec.manifestation?.background_drag!==false,dependency,lens:lensNow,ui:s.ui});
    if(!renderedIds.has(id))fieldById.get(id)?.arriveFrom(null);
  }
  renderedIds=new Set(activeIds);
  composition();Safe.refresh();for(const ui of uiById.values())ui.refresh();
  const local=(inspectCapable()?(path||'overview'):'root');
  stateEl.textContent='WITNESS viewer · global '+GLOBAL_SCOPE+':'+(activeAddress||'overview')+' · local '+local+' · '+activeIds.join(' + ');
  document.documentElement.dataset.scope=GLOBAL_SCOPE;
}
/* Background inspection is local. Global encounter changes happen only through explicit global target events. */
/* The address hash is an input as well as a witness: a typed, linked or restored
 * #scope:address moves the global encounter there. A hash of another form
 * (a skip link, a foreign anchor) is not an address and is left alone. */
function hashFor(address){return '#'+encodeURIComponent(GLOBAL_SCOPE)+':'+encodeURIComponent(address||'overview')}
function hashAddress(hash){const m=/^#([^:]*):(.*)$/.exec(hash||'');if(!m)return null;let scope,address;try{scope=decodeURIComponent(m[1]);address=decodeURIComponent(m[2])}catch(_){return null}return scope===GLOBAL_SCOPE?(address==='overview'?'':address):null}
/* mode: true pushes a new entry; 'replace' gives the current entry (one the witness made by hand) its state. */
function writeHistory(mode){if(mode&&!restoring)history[mode==='replace'?'replaceState':'pushState'](snap(),'',hashFor(activeAddress))}
function setLocalView(path='',source='restore'){if(path)W.inspect(path,source);else W.clearInspection(source);render(W.view)}
function enter(r,path,push=true){
  if(!r.interlocutors.length)return false;
  // Expensive per-site geometry is installed only at the membrane crossing,
  // under the closing fold; the parent proxy has remained visible until now.
  for(const e of r.interlocutors)activateField(e.interlocutorId);
  stack.push({activeIds:[...activeIds],activeAddress,localView:W.view});
  activeIds=r.interlocutors.map(x=>x.interlocutorId);activeAddress=path;
  W.clearInspection('encounter-change');syncGlobalNavigator();render('');
  writeHistory(push);
  return true;
}
let handoffIntent=0;
function feedWound(error){
  console.warn('Display feed handoff refused; prior encounter preserved',error);
  stateEl.dataset.feedWound=String(error?.message||error);
  stateEl.textContent='FEED UNAVAILABLE · RETRY THE ENCOUNTER';
  writeHistory('replace');
}
function navigateGlobal(path,push=true,origin=null){
  const r=resolveGlobal(path);if(!r.interlocutors.length)return false;
  const ids=r.interlocutors.map(x=>x.interlocutorId),token=++handoffIntent;
  if(path===activeAddress&&sameIds(ids,activeIds)){if(inspectCapable())setLocalView('','global-current');if(push==='replace')writeHistory('replace');return true}
  if(fold.busy)return false;
  const context={origin,from:activeAddress,to:path};
  const acquired=acquireTarget(ids);
  const swap=()=>fold.swap(()=>enter(r,path,push),context);
  if(!acquired){swap();return true}
  // The parent keeps displaying the child-owned preview while detail arrives.
  stateEl.textContent='ACQUIRING PUBLIC FEED · '+path;
  acquired.then(()=>{if(token!==handoffIntent)return;const launched=swap();if(launched&&typeof launched.catch==='function')launched.catch(feedWound)})
          .catch(error=>{if(token===handoffIntent)feedWound(error)});
  return true;
}
function leave(push=true){
  if(!stack.length)return navigateGlobal('',push,{x:innerWidth/2,y:innerHeight/2});
  const prev=stack.pop();activeIds=prev.activeIds;activeAddress=prev.activeAddress||'';syncGlobalNavigator();
  if(inspectCapable(activeIds)&&prev.localView)W.inspect(prev.localView,'return');else W.clearInspection('return');
  render(W.view);writeHistory(push);return true;
}
addEventListener('sss:view',e=>{if(e.detail.scopeId!==GLOBAL_SCOPE)return;render(e.detail.path||'')});
addEventListener('sss:global-navigate',e=>{if(e.detail?.scopeId!==GLOBAL_SCOPE)return;navigateGlobal(e.detail.path??'',true,e.detail.origin||null)});
/* Ascent past a site's own root continues through the membrane: the same
 * gesture returns to the container the witness came through. */
addEventListener('sss:enter-body',e=>{const d=e.detail||{};if(!d.id||!activeIds.includes(d.from))return;const m=registry.getMount(d.id);if(m&&m.scope===GLOBAL_SCOPE)navigateGlobal(m.rawAddress,true,d.origin||null)});
/* Leaving an organism is the same transition as arriving: the membrane closes,
 * the host returns, and the host camera zooms out from the body it left. */
addEventListener('sss:membrane-ascend',e=>{
  const id=e.detail?.id;if(!id||!activeIds.includes(id)||fold.busy)return;
  if(!stack.length&&!activeAddress)return; /* already the outermost container: nothing to ascend into */
  const env=hostEnvironment(id);
  const back=()=>{if(stack.length)leave();else{const r=resolveGlobal('');if(r.interlocutors.length)enter(r,'',true)}if(env)fieldById.get(env.hostId)?.arriveFrom(env.place,id)};
  fold.swap(back,{origin:{x:innerWidth/2,y:innerHeight/2},from:activeAddress,to:''});
});
addEventListener('sss:language',()=>{render(W.view)});addEventListener('sss:safe-area',()=>{for(const ui of uiById.values())ui.refresh()});addEventListener('resize',()=>{Safe.refresh();composition();for(const ui of uiById.values())ui.refresh()});
home.addEventListener('click',e=>{e.preventDefault();if(activeAddress||!sameIds(activeIds,ROOT_IDS))navigateGlobal('',true,{x:innerWidth/2,y:innerHeight/2});else{++handoffIntent;setLocalView('','home')}});
addEventListener('keydown',e=>{if(e.metaKey||e.ctrlKey||e.altKey)return;if(e.key==='Escape'){e.preventDefault();if(stack.length)leave();else home.click()}});
activity.subscribe(e=>{const site=registry.getInterlocutor(e.interlocutorId);if(site)site.state.activity=e;fieldById.get(e.interlocutorId)?.pulse();if(activeIds.includes(e.interlocutorId))render(W.view)});
function receiveActivity(event){return activity.receive(event)}
addEventListener('sss:activity',e=>{if(e.detail)receiveActivity(e.detail)});
/* An unresolvable address is answered by restoring the truthful current hash. */
function followHash(){const address=hashAddress(location.hash);if(address===null)return;if(!navigateGlobal(address,'replace',{x:innerWidth/2,y:innerHeight/2}))writeHistory('replace')}
addEventListener('popstate',e=>{
  if(!e.state){followHash();return}
  const desired=e.state,ids=desired.activeIds||[...ROOT_IDS],token=++handoffIntent;
  const restore=()=>{
    if(token!==handoffIntent)return;
    for(const id of ids)activateField(id);
    restoring=true;
    try{activeIds=ids;activeAddress=desired.activeAddress||'';stack=desired.stack||[];syncGlobalNavigator();if(inspectCapable(activeIds)&&desired.localView)W.inspect(desired.localView,'history');else W.clearInspection('history');render(W.view)}
    finally{restoring=false}
  };
  const acquired=acquireTarget(ids);
  if(acquired)acquired.then(restore).catch(error=>{if(token===handoffIntent)feedWound(error)});
  else restore();
});
/* Fallback for a substrate that changes the fragment without popstate; history traversal has already restored by the time it fires. */
addEventListener('hashchange',()=>{const address=hashAddress(location.hash);if(address!==null&&address!==activeAddress&&!fold.busy)followHash()});
const arrival=hashAddress(globalThis.location?.hash);
Safe.start();W.setScope({id:GLOBAL_SCOPE,projection:GLOBAL_PROJECTION});syncGlobalNavigator();history.replaceState(snap(),'',hashFor(''));render('');
/* Arriving at #scope:address enters that encounter directly; overview stays beneath it, so ascent and Escape return there. */
if(arrival){const r=resolveGlobal(arrival);if(r.interlocutors.length)navigateGlobal(arrival,'replace')}
function remount(id,scope,address){const relation=registry.mount(id,{scope,address});if(activeIds.length===1&&activeIds[0]===id&&scope===GLOBAL_SCOPE)activeAddress=relation.rawAddress;syncGlobalNavigator();render(W.view);return relation}
globalThis.SSSDisplayRuntime=Object.freeze({registry,activity,receiveActivity,navigateGlobal,resolveGlobal,resolve:(scope,path)=>registry.resolve(scope,path,{width:innerWidth,height:innerHeight}),dependency,remount,get state(){return snap()},get fields(){return fieldById},get ui(){return uiById},get pendingFeeds(){return detailHandoff.pending()},get globalScope(){return GLOBAL_SCOPE},get globalTargets(){return globalTargets()},get rootIds(){return [...ROOT_IDS]}});
})();
