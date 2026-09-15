(() => {
'use strict';
const H=globalThis.SSSSiteHolon,F=globalThis.SSSSiteFold,W=globalThis.SSSWorldView,Fields=globalThis.SSSInterlocutorFields;
const Philosophy=globalThis.SSSPhilosophyView,Papers=globalThis.SSSPapersView;
if(!H||!F||!W||!Fields||!Philosophy||!Papers) throw new Error('Display v2 dependencies missing');
const MAIN=JSON.parse(document.getElementById('root-projection').textContent);
const PAPERS=JSON.parse(document.getElementById('papers-projection').textContent);
const SPEC=JSON.parse(document.getElementById('site-mounts').textContent);
const G=['w','x','z','y'],DNA={w:'CREATE',x:'COPY',z:'CONTROL',y:'CULTIVATE'};
function papersScope(d){const children={};for(const g of G){const items=d.groups?.[g]||[],noun=d.phenotype?.[g]||g;children[g]={noun,de:noun,en:noun,gene:DNA[g],one:{de:`${items.length} realisierte Forschungsorganismen.`,en:`${items.length} realized research organisms.`},children:{}}}return {source:{organism:'papers',home:d.event_id||'papers'},root:{noun:'Papers',children},occupancy:{w:[],x:[],z:[],y:[]}}}
const PAPERS_SCOPE=papersScope(PAPERS),SCOPES=new Map([['main',MAIN],['papers',PAPERS_SCOPE]]);
const registry=H.createRegistry(),specs=new Map();
for(const s of SPEC.interlocutors||[]){const x=H.defineInterlocutor({id:s.id,localScope:s.local_scope,shader:s.shader,manifestation:s.manifestation,state:{activity:null}});registry.register(x);specs.set(x.id,s)}
for(const m of SPEC.mounts||[])registry.mount(m.interlocutor,{scope:m.scope,address:m.address});
const activity=H.createActivityBus(registry),fold=F.createFold(document.getElementById('tetra-fold'));
const commit=document.getElementById('commit'),home=document.getElementById('root-home'),stateEl=document.getElementById('site-state'),stage=document.getElementById('interlocutor-stage');
const fieldById=new Map();
fieldById.set('organism:philosophy',Fields.create({id:'organism:philosophy',element:document.getElementById('philosophy-interlocutor'),canvas:document.getElementById('philosophy-background'),labelHost:document.getElementById('philosophy-field-labels'),projection:MAIN,palette:specs.get('organism:philosophy')?.shader?.palette,interactive:true,localScope:'main'}));
fieldById.set('organism:papers',Fields.create({id:'organism:papers',element:document.getElementById('papers-interlocutor'),canvas:document.getElementById('papers-background'),labelHost:document.getElementById('papers-field-labels'),projection:PAPERS_SCOPE,palette:specs.get('organism:papers')?.shader?.palette,interactive:false,localScope:'papers'}));
let scopeId='main',activeIds=['organism:philosophy'],stack=[],pending=null,restoring=false;
function resolve(path=''){return registry.resolve(scopeId,path,{width:innerWidth,height:innerHeight})}
function snap(){return {scopeId,activeIds:[...activeIds],stack:stack.map(x=>({...x,activeIds:[...x.activeIds]})),view:W.view}}
function composition(){const c=H.composeInterlocutors(activeIds.map(interlocutorId=>({interlocutorId})),{width:innerWidth,height:innerHeight});document.documentElement.dataset.composition=c.mode;document.documentElement.dataset.compositionAxis=c.axis||'';stage.dataset.composition=c.mode;stage.dataset.axis=c.axis||'';stage.style.setProperty('--interlocutor-columns',String(c.columns||1));return c}
function render(path=W.view){Philosophy.unmount();Papers.unmount();for(const id of activeIds){if(id==='organism:philosophy')Philosophy.render({projection:MAIN,path:scopeId==='main'?path:'',language:W.language});if(id==='organism:papers')Papers.render({projection:PAPERS,path:scopeId==='papers'?path:''})}composition();stateEl.textContent='WITNESS viewer · scope '+scopeId+' · '+activeIds.join(' + ');document.documentElement.dataset.scope=scopeId}
function reconcile(){pending=null;commit.classList.remove('show');if(!W.view)return;const r=resolve(W.view);if(!r.interlocutors.length)return;pending={resolved:r,path:W.view};const names=r.interlocutors.map(x=>x.interlocutorId.replace(/^organism:/,''));commit.textContent=(W.language==='de'?'Locus öffnen · ':'open locus · ')+names.join(' + ');commit.classList.add('show')}
function setWorld(view=''){const projection=SCOPES.get(scopeId);if(!projection)throw new Error('unknown scope '+scopeId);W.setScope({id:scopeId,projection});if(view)W.inspect(view,'restore');render(W.view);reconcile()}
function enter(r,path,push=true){if(!r.interlocutors.length)return false;stack.push({scopeId,activeIds:[...activeIds],view:path});activeIds=r.interlocutors.map(x=>x.interlocutorId);if(activeIds.length===1)scopeId=r.interlocutors[0].interlocutor.localScope;setWorld('');if(push&&!restoring)history.pushState(snap(),'','#'+encodeURIComponent(scopeId)+':root');return true}
function leave(push=true){if(!stack.length){W.clearInspection('home');render('');reconcile();return false}const prev=stack.pop();scopeId=prev.scopeId;activeIds=prev.activeIds;setWorld(prev.view||'');if(push&&!restoring)history.pushState(snap(),'','#'+encodeURIComponent(scopeId)+':'+encodeURIComponent(prev.view||'root'));return true}
addEventListener('sss:view',e=>{if(e.detail.scopeId!==scopeId)return;render(e.detail.path||'');reconcile()});
addEventListener('sss:language',()=>{render(W.view);reconcile()});
addEventListener('resize',()=>composition());
commit.addEventListener('click',e=>{if(!pending||fold.busy)return;e.preventDefault();const p=pending;fold.swap(()=>enter(p.resolved,p.path))});
home.addEventListener('click',e=>{e.preventDefault();if(fold.busy)return;if(stack.length)fold.swap(()=>leave());else{W.clearInspection('home');render('');reconcile()}});
addEventListener('keydown',e=>{if(e.metaKey||e.ctrlKey||e.altKey)return;if(e.key==='Enter'&&pending&&!fold.busy){e.preventDefault();commit.click()}else if(e.key==='Escape'){e.preventDefault();home.click()}});
activity.subscribe(e=>{const site=registry.getInterlocutor(e.interlocutorId);if(site)site.state.activity=e;fieldById.get(e.interlocutorId)?.pulse();if(activeIds.includes(e.interlocutorId))render(W.view)});
function receiveActivity(event){return activity.receive(event)}
addEventListener('sss:activity',e=>{if(e.detail)receiveActivity(e.detail)});
addEventListener('popstate',e=>{if(!e.state)return;restoring=true;try{scopeId=e.state.scopeId||'main';activeIds=e.state.activeIds||['organism:philosophy'];stack=e.state.stack||[];setWorld(e.state.view||'')}finally{restoring=false}});
history.replaceState(snap(),'','#main:root');setWorld('');
globalThis.SSSDisplayRuntime=Object.freeze({registry,activity,receiveActivity,resolve:(scope,path)=>registry.resolve(scope,path,{width:innerWidth,height:innerHeight}),remount:(id,scope,address)=>registry.mount(id,{scope,address}),get state(){return snap()},get fields(){return fieldById}});
})();
