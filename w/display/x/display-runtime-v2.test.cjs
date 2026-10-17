'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const H=require('./site-holon.js'),N=require('../z/navigation-physiology.js'),UI=require('../w/ui-grid.js'),RH=require('./representation-handoff.js');
const runtimeSource=fs.readFileSync(process.env.RUNTIME_SOURCE||path.join(__dirname,'display-runtime-v2.js'),'utf8');
const fieldSource=fs.readFileSync(path.join(__dirname,'../w/locus-shader.js'),'utf8');
const ids=['organism:origin','organism:branch','organism:nested','organism:plain'];
const atom=noun=>({noun,children:{}});
const anatomy=noun=>({noun,children:{w:atom('W'),x:atom('X'),z:atom('Z'),y:atom('Y')}});
function boot(version=1,hash='',insets={},feedKinds={},renderKinds={},holdFold=false){
  const calls=new Map(),sources=new Map(),projected=new Map(),renders=[],unmounts=[],options=new Map(),pulses=new Map(),collected=[];
  const events=new Map(),elements=new Map(),history=[],swaps=[],arrivals=[],fetches=[],held=[];
  const heldFolds=[];let foldBusy=false;
  const fold={get busy(){return foldBusy},swap(fn,details){swaps.push(details);if(!holdFold)return fn();foldBusy=true;return new Promise((resolve,reject)=>heldFolds.push(()=>{try{resolve(fn())}catch(error){reject(error)}finally{foldBusy=false}}))}};
  const element=()=>({hidden:true,dataset:{},style:{setProperty(){}},replaceChildren(){},addEventListener(name,fn){this[name]=fn}});
  const spec={interlocutors:ids.map(id=>({id,local_scope:id==='organism:origin'?'main':id,shader:{palette:[.4,.7,.9]},manifestation:{background_inspect:id==='organism:origin'}})),mounts:ids.map((id,i)=>({interlocutor:id,scope:'main',address:['','w','wx','y'][i]}))};
  const input=Object.fromEntries(ids.map(id=>[id,{sourceMarker:id,version,root:anatomy('source '+id)}]));
  const grids=Object.fromEntries(ids.map(id=>[id,{schema:UI.SCHEMA,meta:{name:id},splits:[''],fields:{slot:{cells:['w'],label:'slot',z:2}},elements:{}}]));
  const feedUrls=Object.fromEntries(Object.keys(feedKinds).map(id=>[id,'assets/0123456789abcdef/site-'+id.replace(':','-')+'-feed.json']));
  const previews=Object.fromEntries(ids.map(id=>[id,feedKinds[id]?{schema:'sss.display.feed-preview.v1',identity:id,root:anatomy('preview '+id)}:input[id]]));
  elements.set('site-registry',{textContent:JSON.stringify(spec)});elements.set('site-projections',{textContent:JSON.stringify(previews)});
  elements.set('site-feed-locations',{textContent:JSON.stringify(feedUrls)});
  elements.set('site-ui-grids',{textContent:JSON.stringify(grids)});elements.set('display-dependencies',{textContent:'{}'});
  for(const id of ['tetra-fold','root-home','site-state','interlocutor-stage'])elements.set(id,element());
  const hosts=new Map(ids.map(id=>{const host=element(),canvas=element(),labelHost=element(),content=element();host.querySelector=selector=>({'.interlocutor-background':canvas,'.interlocutor-field-labels':labelHost,'.interlocutor-content':content})[selector];return [id,host]}));
  const Modules=new Map();
  for(const id of ids){
    const module={shader:{id,fragment:'identity-owned fragment'},render(payload){renders.push(payload);payload.host.hidden=false;if(renderKinds[id]==='throw')throw new Error('renderer unavailable');if(renderKinds[id]==='decline'){payload.host.hidden=true;return false}if(renderKinds[id]==='hidden'){payload.host.hidden=true;return}assert.equal(payload.projection.sourceMarker,id);assert.equal(payload.projection.version,version);if(sources.has(id))assert.strictEqual(payload.projection,sources.get(id),'render retains the original source carrier')},unmount(payload){unmounts.push(payload);payload.host.hidden=true}};
    if(id!=='organism:plain')module.fieldProjection=function(source){
      assert.strictEqual(this,module,'projection method retains its owning module');
      calls.set(id,(calls.get(id)||0)+1);sources.set(id,source);
      const result={root:{...anatomy('projected '+id),en:'English '+id,de:'Deutsch '+id},version:source.version};projected.set(id,result);return result;
    };
    Modules.set(id,module);
  }
  const emit=(name,detail)=>{for(const fn of events.get(name)||[])fn({detail})};
  const W={view:'',language:'en',scopeId:'main',orientation:[1,0,0,0],setScope({id,projection}){this.scopeId=id;this.projection=projection},setGlobalTargets(targets){this.targets=targets},setActiveGlobalAddress(address,locus){this.activeGlobalAddress=address;this.activeGlobalLocus=locus},inspect(view){this.view=view;emit('sss:view',{scopeId:this.scopeId,path:view});return true},clearInspection(){this.view='';emit('sss:view',{scopeId:this.scopeId,path:''})}};
  function fetchFeed(url){
    const target=Object.keys(feedUrls).find(id=>String(url).endsWith(feedUrls[id]));
    assert(target,'unexpected feed URL '+String(url));fetches.push(target);
    if(feedKinds[target]==='fail')return Promise.reject(new Error('offline'));
    if(feedKinds[target]==='hold')return new Promise(resolve=>held.push(()=>resolve({ok:true,json:async()=>input[target]})));
    return Promise.resolve({ok:true,json:async()=>input[target]});
  }
  const context={Map,URL,console,fetch:fetchFeed,innerWidth:1000,innerHeight:800,CSS:{escape:value=>value},document:{baseURI:'https://display.invalid/',getElementById:id=>elements.get(id),querySelector:selector=>{const id=selector.match(/data-interlocutor="([^"]+)"/)?.[1];return hosts.get(id)},documentElement:{dataset:{}}},location:{hash},history:{pushState(state,_,url){history.push({kind:'push',state,url});context.location.hash=url},replaceState(state,_,url){history.push({kind:'replace',state,url});context.location.hash=url}},addEventListener(name,fn){if(!events.has(name))events.set(name,[]);events.get(name).push(fn)},SSSDisplayNavigation:{...N,collectStructure(root){collected.push(root);return N.collectStructure(root)}},SSSUIGrid:UI,SSSRepresentationHandoff:RH,SSSSiteHolon:H,SSSSiteFold:{createFold:()=>fold},SSSWorldView:W,SSSDisplaySafeArea:{start(){},refresh(){},snapshot:()=>({insets})},SSSInterlocutorModules:Modules};
  vm.createContext(context);
  // Use the real placement physiology; only rendering/canvas creation is a fixture.
  vm.runInContext(fieldSource,context,{filename:'locus-shader.js'});
  const fields=context.SSSInterlocutorFields;
  context.SSSInterlocutorFields={...fields,create(config){options.set(config.id,config);return {pulse(){pulses.set(config.id,(pulses.get(config.id)||0)+1)},arriveFrom(place,bodyId){arrivals.push({id:config.id,place,bodyId})}}}};
  vm.runInContext(runtimeSource,context,{filename:'display-runtime-v2.js'});
  const hand=(url,kind='popstate')=>{context.location.hash=url;for(const fn of events.get(kind)||[])fn({state:null})};
  return {runtime:context.SSSDisplayRuntime,hand,location:context.location,W,calls,sources,projected,renders,unmounts,options,pulses,collected,emit,history,swaps,input,arrivals,fetches,held,heldFolds,hosts,renderKinds,stateEl:elements.get('site-state'),home:elements.get('root-home'),pop(state,url){context.location.hash=url;for(const fn of events.get('popstate')||[])fn({state})},key(event){for(const fn of events.get('keydown')||[])fn(event)}};
}
const f=boot(),runtime=f.runtime;
const once=()=>{for(const id of ids.slice(0,3))assert.equal(f.calls.get(id),1,'one anatomy resolution per parsed source entry: '+id);assert.equal(f.calls.has('organism:plain'),false)};
once();assert.strictEqual(f.W.projection,f.projected.get('organism:origin'));
assert.equal(f.W.targets.find(t=>t.path==='w').titles['organism:branch'],'English organism:branch');
assert.equal(f.options.get('organism:origin').bodies().find(b=>b.id==='organism:branch').title,'English organism:branch');
for(const id of ids.slice(0,3))assert.strictEqual(f.options.get(id).projection,f.projected.get(id));
const slotBounds=runtime.ui.get(ids[0]).field('slot').bounds;assert.equal(slotBounds.x,0);assert.equal(slotBounds.y,0);assert.equal(slotBounds.w,.5);assert.equal(slotBounds.h,.5);
assert.equal(runtime.ui.get(ids[0]).field('slot').z,2);
/* A bottom-right HUD must not shrink the entire lattice or force field extent. */
const orient=boot(1,'',{top:170,right:310,bottom:320,left:90});
const ui=orient.runtime.ui.get(ids[0]);
assert.deepEqual({...ui.carrier},{x:0,y:170,w:1000,h:630});
const node={style:{width:'36rem',height:'max-content',right:'12px',setProperty(k,v){this[k]=v}},dataset:{},isConnected:true};
ui.bind(node,'slot');
assert.equal(node.style.left,'0px');assert.equal(node.style.top,'170px');
assert.equal(node.style.width,'36rem');assert.equal(node.style.height,'max-content');
assert.equal(node.style.right,'12px');assert.equal(node.style.zIndex,'132');assert.equal(node.style['--ui-field-x'],node.style.left);assert.equal(node.style['--ui-field-y'],node.style.top);
orient.emit('sss:safe-area');
assert.equal(node.style.width,'36rem');assert.equal(node.style.height,'max-content');
const plain=f.options.get('organism:plain').projection;assert.equal(plain.sourceMarker,'organism:plain');
for(let frame=0;frame<30;frame++){
  const bodies=f.options.get('organism:origin').bodies();
  assert.equal(bodies.length,3);
  for(const body of bodies){assert.strictEqual(body.root,f.options.get(body.id).projection.root,'floating body uses its field anatomy');assert.strictEqual(body.projection,f.options.get(body.id).projection,'own host draw receives the bounded source preview rather than a central specimen reconstruction')}
  assert.equal(f.options.get('organism:branch').environment(),null,'inactive site has no host environment');
}
once();
assert.equal(runtime.navigateGlobal('w'),true);assert.equal(runtime.state.activeAddress,'w');
for(let frame=0;frame<30;frame++){
  const environment=f.options.get('organism:branch').environment();
  assert.equal(environment.hostId,'organism:origin');assert.equal(environment.path,'w');
  assert.deepEqual(Array.from(environment.place.center),N.cellForPath('w').center);
}
assert.strictEqual(f.collected[0],f.projected.get('organism:origin').root);
assert.equal(runtime.navigateGlobal('wx'),true);
for(let frame=0;frame<30;frame++){
  const environment=f.options.get('organism:nested').environment();
  assert.equal(environment.hostId,'organism:origin');assert.equal(environment.path,'wx');
  assert.deepEqual(Array.from(environment.place.center),N.cellForPath('wx').center);
}
assert.equal(f.collected.length,1,'mount prefixes do not create independently rooted host interiors');
f.W.language='de';f.emit('sss:language');assert.equal(f.renders.at(-1).language,'de');
assert.equal(f.W.targets.find(t=>t.path==='wx').titles['organism:nested'],'Deutsch organism:nested');
runtime.receiveActivity({siteId:'organism:nested',kind:'fixture',projectionChanged:true});assert.equal(f.pulses.get('organism:nested'),1);assert.equal(f.renders.at(-1).activity.kind,'fixture');
assert.equal(runtime.navigateGlobal('y'),true);assert.strictEqual(f.renders.at(-1).projection,plain,'no-projector site keeps the source object');
runtime.navigateGlobal('');f.W.inspect('x');assert.equal(f.renders.at(-1).path,'x');
runtime.navigateGlobal('w');runtime.remount('organism:branch','main','z');assert.equal(runtime.state.activeAddress,'z');
assert.equal(f.options.get('organism:branch').environment().path,'z');
runtime.remount('organism:nested','other-scope','w');assert.ok(!f.options.get('organism:origin').bodies().some(body=>body.id==='organism:nested'));
once();assert.ok(f.swaps.length>=5);assert.ok(f.history.length>=5);assert.ok(f.unmounts.length>ids.length);
for(const [id,source] of f.sources)assert.equal(JSON.stringify(source),JSON.stringify(f.input[id]),'projection does not replace/mutate source');
const next=boot(2);
for(const id of ids.slice(0,3)){assert.equal(next.calls.get(id),1);assert.equal(next.projected.get(id).version,2);assert.notStrictEqual(next.projected.get(id),f.projected.get(id),'new source/re-entry resolves afresh')}
/* The address hash is an input: arrival, a hand-made change, an unknown address and a foreign anchor. */
const arrive=boot(1,'#main:w');
assert.equal(arrive.runtime.state.activeAddress,'w','arrival at #main:w enters w');
assert.equal(arrive.runtime.state.stack.length,1,'overview stays beneath the arrival');
assert.equal(arrive.history.at(-1).kind,'replace');assert.equal(arrive.history.at(-1).url,'#main:w');
assert.equal(arrive.history.filter(h=>h.kind==='push').length,0,'arrival makes no extra entry');
const swaps=arrive.swaps.length;
arrive.hand('#main:overview');assert.equal(arrive.runtime.state.activeAddress,'','a hand-made #main:overview returns to the overview');
assert.equal(arrive.swaps.length,swaps+1,'through the same membrane fold');
assert.equal(arrive.history.at(-1).kind,'replace');assert.equal(arrive.history.at(-1).state.activeAddress,'','the hand-made entry receives its state');
arrive.hand('#main:y');assert.equal(arrive.runtime.state.activeAddress,'y');
arrive.hand('#main:y','hashchange');assert.equal(arrive.swaps.length,swaps+2,'hashchange after popstate is a no-op');
arrive.hand('#main:w','hashchange');assert.equal(arrive.runtime.state.activeAddress,'w','hashchange alone also moves the encounter');
arrive.hand('#main:y');
const before=arrive.history.length;
arrive.hand('#main:zzzz');assert.equal(arrive.runtime.state.activeAddress,'y','an unresolvable address does not move the encounter');
assert.equal(arrive.location.hash,'#main:y','and the truthful hash is restored');assert.equal(arrive.history.length,before+1);
arrive.hand('#mini-trigger');assert.equal(arrive.location.hash,'#mini-trigger','a foreign anchor is left alone');assert.equal(arrive.runtime.state.activeAddress,'y');
assert.equal(boot(1,'#main:zzzz').runtime.state.activeAddress,'','unresolvable arrival stays at the overview');
assert.equal(boot(1,'#other:w').runtime.state.activeAddress,'','another scope is not this address');
/* Cached fields re-enter their current container on root-home/global return;
 * ordinary language/activity repaint is not another arrival. Explicit membrane
 * return still supplies its body/place after that generic restoration. */
for(const address of ['w','y']){
  const cycle=boot(),rootArrivals=()=>cycle.arrivals.filter(a=>a.id===ids[0]);
  const before=rootArrivals().length;cycle.runtime.navigateGlobal(address);
  cycle.home.click({preventDefault(){}});
  assert.equal(cycle.runtime.state.activeAddress,'');
  assert.equal(rootArrivals().length,before+1,'root-home reveals a cached zoom without reframing');
  assert.equal(rootArrivals().at(-1).place,null,'root-home restores the truthful current container');
  const stable=cycle.arrivals.length;cycle.emit('sss:language');cycle.runtime.receiveActivity({siteId:ids[0],kind:'fixture'});
  assert.equal(cycle.arrivals.length,stable,'repaint resets an already-visible camera');
  cycle.runtime.navigateGlobal(address);const beforeEscape=rootArrivals().length;
  cycle.key({key:'Escape',preventDefault(){}});assert.equal(cycle.runtime.state.activeAddress,'');
  assert.equal(rootArrivals().length,beforeEscape+1,'Escape return reveals a cached camera without reframing');
  cycle.runtime.navigateGlobal(address);cycle.emit('sss:membrane-ascend',{id:address==='w'?ids[1]:ids[3]});
  const explicit=rootArrivals().at(-1);assert(explicit.place?.k>0,'explicit membrane zoom-out lost its place');assert.equal(explicit.bodyId,address==='w'?ids[1]:ids[3]);
}
/* Global visits do not become walked parents. Actual body descent retains its
 * own container, and the browser's history can independently restore a visit. */
for(const first of ['w','wx','y'])for(const second of ['w','wx','y']){
 const f=boot();f.runtime.navigateGlobal(first);f.runtime.navigateGlobal(second);
 assert.equal(f.runtime.state.stack.length,1);
 assert.equal(f.runtime.state.stack[0].activeAddress,'');
 const visited=f.history.at(-1).state,expected=f.runtime.state.activeIds[0];
 f.emit('sss:membrane-ascend',{id:expected});
 assert.equal(f.runtime.state.activeAddress,'');assert.equal(f.runtime.state.stack.length,0);
 const stable=[f.history.length,f.swaps.length];f.emit('sss:membrane-ascend',{id:ids[0]});
 assert.deepEqual([f.history.length,f.swaps.length],stable,'outside at root is inert');
 f.pop(visited,'#main:'+second);assert.equal(f.runtime.state.activeAddress,second,'browser history restores the visit');
 f.emit('sss:membrane-ascend',{id:expected});assert.equal(f.runtime.state.activeAddress,'','history does not alter structural parent');
}
{
 const f=boot();f.W.inspect('w');
 f.emit('sss:enter-body',{from:ids[0],id:ids[2]});
 assert.equal(f.runtime.state.activeAddress,'wx');assert.equal(f.runtime.state.stack[0].localView,'w');
 f.emit('sss:membrane-ascend',{id:ids[2]});
 assert.equal(f.runtime.state.activeAddress,'');assert.equal(f.W.view,'w','body ascent returns to the actual local container');
 f.runtime.navigateGlobal('w');f.emit('sss:enter-body',{from:ids[1],id:ids[2]});
 assert.equal(f.runtime.state.activeAddress,'w','a textual mount prefix alone does not offer a child body');
}
{
 const f=boot();f.runtime.navigateGlobal('w');const obsolete=f.history.at(-1).state;
 f.runtime.navigateGlobal('y');const visited=f.history.at(-1).state;
 visited.stack.push({...obsolete,stack:undefined});
 f.pop(visited,'#main:y');
 assert.equal(f.runtime.state.stack.length,1,'old browser snapshots discard visit-derived parent links');
 f.emit('sss:membrane-ascend',{id:ids[3]});assert.equal(f.runtime.state.activeAddress,'');
}
/* Real promise-based public feed boundary: same proxy identity; body materializes only after acquisition. */
async function feedHandoffWitness(){
  const drain=async()=>{for(let i=0;i<24;i++)await Promise.resolve()};
  const feedId='organism:branch',f=boot(1,'',{}, {[feedId]:'hold'});
  assert.equal(f.calls.has(feedId),false,'unentered feed must not project detailed anatomy');
  assert.equal(f.options.has(feedId),false,'unentered feed must not allocate a field');
  const before=f.options.get(ids[0]).bodies().find(b=>b.id===feedId).root;
  assert.equal(before.noun,'preview '+feedId,'parent sees child-owned preview body');
  assert.equal(f.runtime.navigateGlobal('w'),true);
  assert.equal(f.runtime.state.activeAddress,'','parent must remain present during fetch');
  assert.deepEqual([...f.runtime.pendingFeeds],[feedId]);
  assert.deepEqual(f.fetches,[feedId]);
  f.held.shift()();await drain();
  assert.equal(f.runtime.state.activeAddress,'w');
  assert.equal(f.calls.get(feedId),1,'full source processed only at encounter');
  assert.equal(f.options.has(feedId),true);
  assert.strictEqual(f.options.get(ids[0]).bodies().find(b=>b.id===feedId).root,before,'host preview is stable across handoff');
  f.runtime.navigateGlobal('');f.runtime.navigateGlobal('w');
  assert.deepEqual(f.fetches,[feedId],'revisit reuses acquired immutable feed');

  const sibling=boot(1,'',{}, {[feedId]:'hold'});
  sibling.runtime.navigateGlobal('y');sibling.runtime.navigateGlobal('w');
  sibling.held.shift()();await drain();
  sibling.emit('sss:membrane-ascend',{id:feedId});
  assert.equal(sibling.runtime.state.activeAddress,'','lazy acquisition never makes the prior sibling its parent');

  const race=boot(1,'',{}, {[feedId]:'hold'});
  race.runtime.navigateGlobal('w');race.home.click({preventDefault(){}});
  race.held.shift()();await drain();
  assert.equal(race.runtime.state.activeAddress,'','home cancels pending navigation without canceling harmless resource acquisition');

  const failed=boot(1,'',{}, {[feedId]:'fail'});
  const beforeFailedCamera=failed.arrivals.length;
  failed.runtime.navigateGlobal('w');await drain();
  assert.equal(failed.runtime.state.activeAddress,'','missing feed preserves parent');
  assert.equal(failed.runtime.pendingFeeds.length,0,'failed feed may be retried');
  assert.match(failed.stateEl.textContent,/FEED UNAVAILABLE/);
  assert.equal(failed.arrivals.length,beforeFailedCamera+1,'acquisition failure restores the approached field, not only initial mounting');
  assert.deepEqual(failed.arrivals.at(-1),{id:ids[0],place:null,bodyId:undefined},'acquisition failure also restores the active field camera');

  const arrival=boot(1,'#main:w',{}, {[feedId]:'hold'});
  assert.equal(arrival.runtime.state.activeAddress,'','deep link begins with parent body');
  arrival.held.shift()();await drain();
  assert.equal(arrival.runtime.state.activeAddress,'w','deep link resumes when detailed feed is ready');
  assert.equal(arrival.history.at(-1).kind,'replace');
  assert.equal(arrival.history.at(-1).url,'#main:w');

  /* Valid acquired detail is not a usable body when its owner refuses rendering.
   * This reproduces live Papers in a WebGL-less browser without naming Papers. */
  for(const kind of ['decline','hidden','throw']){
    const kinds={[feedId]:kind},refused=boot(1,'',{}, {[feedId]:'hold'},kinds);
    refused.W.inspect('x');
    const oldUnmounts=refused.unmounts.filter(p=>p.host===refused.hosts.get(ids[0])).length;
    const oldArrivals=refused.arrivals.length;
    refused.runtime.navigateGlobal('w');refused.held.shift()();await drain();
    assert.equal(refused.runtime.state.activeAddress,'','renderer refusal preserves prior identity');
    assert.equal(refused.W.view,'x','renderer refusal preserves prior local container');
    assert.equal(refused.runtime.state.stack.length,0,'renderer refusal does not add a visit');
    assert.equal(refused.location.hash,'#main:overview','renderer refusal restores truthful history');
    assert.equal(refused.hosts.get(ids[0]).hidden,false,'the prior body remains visible');
    assert.equal(refused.hosts.get(feedId).hidden,true,'the refused body is not visible');
    assert.equal(refused.unmounts.filter(p=>p.host===refused.hosts.get(ids[0])).length,oldUnmounts,'failed candidate never unmounts the prior body');
    assert.match(refused.stateEl.textContent,/ENCOUNTER UNAVAILABLE/);
    assert.equal(refused.arrivals.length,oldArrivals+1,'renderer refusal restores the approached field, not only initial mounting');
    assert.deepEqual(refused.arrivals.at(-1),{id:ids[0],place:null,bodyId:undefined},'a refused body restores the prior field camera to its walked container');
    kinds[feedId]='ready';assert.doesNotThrow(()=>refused.runtime.navigateGlobal('w'));await drain();
    assert.equal(refused.runtime.state.activeAddress,'w','the same immutable body can retry');
    assert.deepEqual(refused.fetches,[feedId],'render retry does not refetch ready detail');
    assert.equal(refused.calls.get(feedId),1,'render retry does not remint source anatomy');
  }

  const historyKinds={},historyRefusal=boot(1,'',{}, {},historyKinds);
  historyRefusal.runtime.navigateGlobal('w');const visited=historyRefusal.history.at(-1).state;
  historyRefusal.runtime.navigateGlobal('');historyKinds[feedId]='decline';
  assert.doesNotThrow(()=>historyRefusal.pop(visited,'#main:w'));
  assert.equal(historyRefusal.runtime.state.activeAddress,'','history restoration also validates the renderer');
  assert.equal(historyRefusal.hosts.get(ids[0]).hidden,false);
  assert.equal(historyRefusal.location.hash,'#main:overview');

  const leaveKinds={},leaveRefusal=boot(1,'',{}, {},leaveKinds);
  leaveRefusal.runtime.navigateGlobal('w');leaveKinds[ids[0]]='decline';
  assert.doesNotThrow(()=>leaveRefusal.key({key:'Escape',preventDefault(){}}));
  assert.equal(leaveRefusal.runtime.state.activeAddress,'w','failed ascent preserves current identity');
  assert.equal(leaveRefusal.runtime.state.stack.length,1,'failed ascent preserves return stack');
  assert.equal(leaveRefusal.hosts.get(feedId).hidden,false);

  const closing=boot(1,'',{}, {},{},true);
  closing.runtime.navigateGlobal('w');closing.home.click({preventDefault(){}});
  closing.heldFolds.shift()();await drain();
  assert.equal(closing.runtime.state.activeAddress,'','home also cancels a fold already closing');
  assert.equal(closing.runtime.state.stack.length,0);

  const busy=boot(1,'',{}, {},{},true);
  busy.runtime.navigateGlobal('w');assert.equal(busy.runtime.navigateGlobal('y'),false);
  busy.heldFolds.shift()();await drain();
  assert.equal(busy.runtime.state.activeAddress,'w','rejected busy navigation cannot replace the running intent');

  const asyncRefusal=boot(1,'',{}, {},{[feedId]:'throw'},true);
  asyncRefusal.runtime.navigateGlobal('w');asyncRefusal.heldFolds.shift()();await drain();
  assert.equal(asyncRefusal.runtime.state.activeAddress,'','promise-based fold refusal rolls back');
  assert.equal(asyncRefusal.hosts.get(ids[0]).hidden,false);
  assert.match(asyncRefusal.stateEl.textContent,/ENCOUNTER UNAVAILABLE/);
}
feedHandoffWitness().then(()=>console.log('display runtime: orientation-only carrier + lazy feed identity handoff/navigation PASS'))
  .catch(error=>{console.error(error);process.exitCode=1});
/* A source-owned Inquiry encounter uses the actual offered body membrane.
 * The containing Philosophy view survives while the project restarts locally. */
{
 const inquiry=boot();inquiry.W.inspect('w');inquiry.emit('sss:enter-body',{from:ids[0],id:ids[1],origin:{x:30,y:40}});
 assert.equal(inquiry.runtime.state.activeIds[0],ids[1]);assert.equal(inquiry.runtime.state.localView,'');assert.equal(inquiry.runtime.state.stack[0].localView,'w');
 inquiry.key({key:'Escape',preventDefault(){}});assert.equal(inquiry.runtime.state.activeIds[0],ids[0]);assert.equal(inquiry.runtime.state.localView,'w');
}
