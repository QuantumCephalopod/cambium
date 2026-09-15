(() => {
'use strict';
const H=globalThis.SSSSiteHolon,F=globalThis.SSSSiteFold,W=globalThis.SSSWorldView,Fields=globalThis.SSSInterlocutorFields;
const Philosophy=globalThis.SSSPhilosophyView,Papers=globalThis.SSSPapersView;
if(!H||!F||!W||!Fields||!Philosophy||!Papers) throw new Error('Display v2 dependencies missing');
const MAIN=JSON.parse(document.getElementById('root-projection').textContent);
const PAPERS=JSON.parse(document.getElementById('papers-projection').textContent);
const SPEC=JSON.parse(document.getElementById('site-mounts').textContent);
const GLOBAL_SCOPE='main';
const G=['w','x','z','y'],DNA={w:'CREATE',x:'COPY',z:'CONTROL',y:'CULTIVATE'};
function papersScope(d){const children={};for(const g of G){const items=d.groups?.[g]||[],noun=d.phenotype?.[g]||g;children[g]={noun,de:noun,en:noun,gene:DNA[g],one:{de:`${items.length} realisierte Forschungsorganismen.`,en:`${items.length} realized research organisms.`},children:{}}}return {source:{organism:'papers',home:d.event_id||'papers'},root:{noun:'Papers',children},occupancy:{w:[],x:[],z:[],y:[]}}}
const PAPERS_SCOPE=papersScope(PAPERS);
const registry=H.createRegistry(),specs=new Map();
for(const s of SPEC.interlocutors||[]){const x=H.defineInterlocutor({id:s.id,localScope:s.local_scope,shader:s.shader,manifestation:s.manifestation,state:{activity:null}});registry.register(x);specs.set(x.id,s)}
for(const m of SPEC.mounts||[])registry.mount(m.interlocutor,{scope:m.scope,address:m.address});
const activity=H.createActivityBus(registry),fold=F.createFold(document.getElementById('tetra-fold'));
const commit=document.getElementById('commit'),home=document.getElementById('root-home'),stateEl=document.getElementById('site-state'),stage=document.getElementById('interlocutor-stage');
const fieldById=new Map();
fieldById.set('organism:philosophy',Fields.create({id:'organism:philosophy',element:document.getElementById('philosophy-interlocutor'),canvas:document.getElementById('philosophy-background'),labelHost:document.getElementById('philosophy-field-labels'),projection:MAIN,palette:specs.get('organism:philosophy')?.shader?.palette,interactive:true,localScope:'main'}));
fieldById.set('organism:papers',Fields.create({id:'organism:papers',element:document.getElementById('papers-interlocutor'),canvas:document.getElementById('papers-background'),labelHost:document.getElementById('papers-field-labels'),projection:PAPERS_SCOPE,palette:specs.get('organism:papers')?.shader?.palette,interactive:false,localScope:'papers'}));
let activeIds=['organism:philosophy'],activeAddress='',stack=[],pending=null,restoring=false;
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
    if(m.rawAddress.length<t.path.length || (m.rawAddress.length===t.path.length&&m.rawAddress<t.path))t.path=m.rawAddress;
    if(!t.interlocutorIds.includes(id))t.interlocutorIds.push(id);
  }
  return [...loci.values()].sort((a,b)=>a.path.length-b.path.length||a.path.localeCompare(b.path));
}
function syncGlobalNavigator(){const r=resolveGlobal(activeAddress);W.setGlobalTargets(globalTargets());W.setActiveGlobalAddress(activeAddress,r.locus)}
function render(path=W.view){
  Philosophy.unmount();Papers.unmount();
  for(const id of activeIds){
    if(id==='organism:philosophy')Philosophy.render({projection:MAIN,path,language:W.language});
    if(id==='organism:papers')Papers.render({projection:PAPERS,path:''});
  }
  composition();
  stateEl.textContent='WITNESS viewer · global '+GLOBAL_SCOPE+':'+(activeAddress||'overview')+' · local '+(activeIds.includes('organism:philosophy')?(path||'overview'):'root')+' · '+activeIds.join(' + ');
  document.documentElement.dataset.scope=GLOBAL_SCOPE;
}
function reconcile(){
  pending=null;commit.classList.remove('show');
  if(!activeIds.includes('organism:philosophy')||!W.view)return;
  const r=resolveGlobal(W.view);if(!r.interlocutors.length)return;
  const ids=r.interlocutors.map(x=>x.interlocutorId);
  if(W.view===activeAddress&&sameIds(ids,activeIds))return;
  pending={resolved:r,path:W.view};
  const names=ids.map(x=>x.replace(/^organism:/,''));
  commit.textContent=(W.language==='de'?'Locus öffnen · ':'open locus · ')+names.join(' + ');
  commit.classList.add('show');
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
function navigateGlobal(path,push=true){
  const r=resolveGlobal(path);if(!r.interlocutors.length)return false;
  const ids=r.interlocutors.map(x=>x.interlocutorId);
  if(path===activeAddress&&sameIds(ids,activeIds)){
    if(activeIds.includes('organism:philosophy'))setLocalView('','global-current');
    return true;
  }
  if(fold.busy)return false;
  fold.swap(()=>enter(r,path,push));
  return true;
}
function leave(push=true){
  if(!stack.length)return navigateGlobal('',push);
  const prev=stack.pop();activeIds=prev.activeIds;activeAddress=prev.activeAddress||'';
  syncGlobalNavigator();
  if(activeIds.includes('organism:philosophy')&&prev.localView)W.inspect(prev.localView,'return');else W.clearInspection('return');
  render(W.view);reconcile();
  if(push&&!restoring)history.pushState(snap(),'','#'+GLOBAL_SCOPE+':'+encodeURIComponent(activeAddress||'overview'));
  return true;
}
addEventListener('sss:view',e=>{if(e.detail.scopeId!==GLOBAL_SCOPE)return;render(e.detail.path||'');reconcile()});
addEventListener('sss:global-navigate',e=>{if(e.detail?.scopeId!==GLOBAL_SCOPE)return;navigateGlobal(e.detail.path??'')});
addEventListener('sss:language',()=>{render(W.view);reconcile()});
addEventListener('resize',()=>composition());
commit.addEventListener('click',e=>{if(!pending||fold.busy)return;e.preventDefault();const p=pending;fold.swap(()=>enter(p.resolved,p.path))});
home.addEventListener('click',e=>{e.preventDefault();if(activeAddress||!activeIds.includes('organism:philosophy'))navigateGlobal('');else setLocalView('','home')});
addEventListener('keydown',e=>{if(e.metaKey||e.ctrlKey||e.altKey)return;if(e.key==='Enter'&&pending&&!fold.busy){e.preventDefault();commit.click()}else if(e.key==='Escape'){e.preventDefault();if(stack.length)leave();else home.click()}});
activity.subscribe(e=>{const site=registry.getInterlocutor(e.interlocutorId);if(site)site.state.activity=e;fieldById.get(e.interlocutorId)?.pulse();if(activeIds.includes(e.interlocutorId))render(W.view)});
function receiveActivity(event){return activity.receive(event)}
addEventListener('sss:activity',e=>{if(e.detail)receiveActivity(e.detail)});
addEventListener('popstate',e=>{if(!e.state)return;restoring=true;try{activeIds=e.state.activeIds||['organism:philosophy'];activeAddress=e.state.activeAddress||'';stack=e.state.stack||[];syncGlobalNavigator();if(activeIds.includes('organism:philosophy')&&e.state.localView)W.inspect(e.state.localView,'history');else W.clearInspection('history');render(W.view);reconcile()}finally{restoring=false}});
W.setScope({id:GLOBAL_SCOPE,projection:MAIN});syncGlobalNavigator();history.replaceState(snap(),'','#'+GLOBAL_SCOPE+':overview');render('');reconcile();
function remount(id,scope,address){const relation=registry.mount(id,{scope,address});if(activeIds.length===1&&activeIds[0]===id&&scope===GLOBAL_SCOPE)activeAddress=relation.rawAddress;syncGlobalNavigator();render(W.view);reconcile();return relation}
globalThis.SSSDisplayRuntime=Object.freeze({registry,activity,receiveActivity,navigateGlobal,resolveGlobal,resolve:(scope,path)=>registry.resolve(scope,path,{width:innerWidth,height:innerHeight}),remount,get state(){return snap()},get fields(){return fieldById},get globalScope(){return GLOBAL_SCOPE},get globalTargets(){return globalTargets()}});
})();
