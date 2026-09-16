(() => {
'use strict';
const H=globalThis.SSSSiteHolon,F=globalThis.SSSSiteFold,P=globalThis.PapersDisplay;
if(!H||!F||!P) throw new Error('Papers site-holon dependencies missing');
const mounts=JSON.parse(document.getElementById('papers-site-mounts').textContent);
if(mounts.scope!=='papers') throw new Error('Papers mount registry scope mismatch');

const registry=H.createRegistry();
const siteSpecs=new Map();
for(const spec of mounts.sites){
  const site=H.defineSite({id:spec.id,shader:spec.shader,manifestation:spec.manifestation,state:{activity:null}});
  registry.register(site);
  siteSpecs.set(site.id,spec);
  registry.mount(site.id,spec.witnesses.map((w,i)=>({witness:w,interlocutor:spec.interlocutors?.[i]||{id:spec.id+':'+i}})));
}

const current=registry.resolve('',{width:innerWidth,height:innerHeight});
if(!current||current.siteId!=='organism:papers') throw new Error('Papers root site identity is not mounted at local root');
const activity=H.createActivityBus(registry);
const fold=F.createFold(document.getElementById('tetra-fold'));
const stateEl=document.getElementById('site-state');
const rootReturn=document.getElementById('root-return');
let pulseTimer=null;

function showState(){
  const resolved=registry.resolve('',{width:innerWidth,height:innerHeight});
  const event=activity.current(resolved.siteId);
  stateEl.innerHTML='<strong>'+resolved.siteId+'</strong> · local root · witness root'+(event?' · '+event.kind+' '+event.state:'');
  document.documentElement.dataset.siteId=resolved.siteId;
  document.documentElement.dataset.locus=resolved.locus;
  document.documentElement.dataset.witness=resolved.witness||'';
  return resolved;
}

activity.subscribe(event=>{
  const site=registry.getSite(event.siteId);
  if(site) site.state.activity=event;
  document.documentElement.dataset.activity=event.semanticChanged?'semantic':event.projectionChanged?'projection':'activity';
  clearTimeout(pulseTimer);
  pulseTimer=setTimeout(()=>{delete document.documentElement.dataset.activity;},760);
  showState();
});

function receiveActivity(event){return activity.receive(event);}
addEventListener('sss:activity',event=>{if(event.detail)receiveActivity(event.detail);});
addEventListener('resize',showState);
rootReturn.addEventListener('click',event=>{
  if(fold.busy) return;
  event.preventDefault();
  fold.swap(()=>{location.href=rootReturn.href;});
});

P.render(true);
showState();
globalThis.SSSDisplayRuntime=Object.freeze({
  registry,
  activity,
  receiveActivity,
  resolve:w=>registry.resolve(w,{width:innerWidth,height:innerHeight}),
  fold
});
})();
