'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const H=require('./site-holon.js'),N=require('../z/navigation-physiology.js');
const runtimeSource=fs.readFileSync(path.join(__dirname,'display-runtime-v2.js'),'utf8');
const fieldSource=fs.readFileSync(path.join(__dirname,'../w/locus-shader.js'),'utf8');
const ids=['organism:origin','organism:branch','organism:nested','organism:plain'];
const atom=noun=>({noun,children:{}});
const anatomy=noun=>({noun,children:{w:atom('W'),x:atom('X'),z:atom('Z'),y:atom('Y')}});
function boot(version=1,hash=''){
  const calls=new Map(),sources=new Map(),projected=new Map(),renders=[],unmounts=[],options=new Map(),pulses=new Map(),collected=[];
  const events=new Map(),elements=new Map(),history=[],swaps=[];
  const element=()=>({hidden:true,dataset:{},style:{setProperty(){}},replaceChildren(){},addEventListener(name,fn){this[name]=fn}});
  const spec={interlocutors:ids.map(id=>({id,local_scope:id==='organism:origin'?'main':id,shader:{palette:[.4,.7,.9]},manifestation:{background_inspect:id==='organism:origin'}})),mounts:ids.map((id,i)=>({interlocutor:id,scope:'main',address:['','w','wx','y'][i]}))};
  const input=Object.fromEntries(ids.map(id=>[id,{sourceMarker:id,version,root:anatomy('source '+id)}]));
  elements.set('site-registry',{textContent:JSON.stringify(spec)});elements.set('site-projections',{textContent:JSON.stringify(input)});elements.set('display-dependencies',{textContent:'{}'});
  for(const id of ['tetra-fold','root-home','site-state','interlocutor-stage'])elements.set(id,element());
  const hosts=new Map(ids.map(id=>{const host=element(),canvas=element(),labelHost=element(),content=element();host.querySelector=selector=>({'.interlocutor-background':canvas,'.interlocutor-field-labels':labelHost,'.interlocutor-content':content})[selector];return [id,host]}));
  const Modules=new Map();
  for(const id of ids){
    const module={shader:{id,fragment:'identity-owned fragment'},render(payload){renders.push(payload);payload.host.hidden=false;assert.equal(payload.projection.sourceMarker,id);assert.equal(payload.projection.version,version);if(sources.has(id))assert.strictEqual(payload.projection,sources.get(id),'render retains the original source carrier')},unmount(payload){unmounts.push(payload);payload.host.hidden=true}};
    if(id!=='organism:plain')module.fieldProjection=function(source){
      assert.strictEqual(this,module,'projection method retains its owning module');
      calls.set(id,(calls.get(id)||0)+1);sources.set(id,source);
      const result={root:anatomy('projected '+id),version:source.version};projected.set(id,result);return result;
    };
    Modules.set(id,module);
  }
  const emit=(name,detail)=>{for(const fn of events.get(name)||[])fn({detail})};
  const W={view:'',language:'en',scopeId:'main',orientation:[1,0,0,0],setScope({id,projection}){this.scopeId=id;this.projection=projection},setGlobalTargets(targets){this.targets=targets},setActiveGlobalAddress(address,locus){this.activeGlobalAddress=address;this.activeGlobalLocus=locus},inspect(view){this.view=view;emit('sss:view',{scopeId:this.scopeId,path:view});return true},clearInspection(){this.view='';emit('sss:view',{scopeId:this.scopeId,path:''})}};
  const context={Map,URL,console,innerWidth:1000,innerHeight:800,CSS:{escape:value=>value},document:{baseURI:'https://display.invalid/',getElementById:id=>elements.get(id),querySelector:selector=>{const id=selector.match(/data-interlocutor="([^"]+)"/)?.[1];return hosts.get(id)},documentElement:{dataset:{}}},location:{hash},history:{pushState(state,_,url){history.push({kind:'push',state,url});context.location.hash=url},replaceState(state,_,url){history.push({kind:'replace',state,url});context.location.hash=url}},addEventListener(name,fn){if(!events.has(name))events.set(name,[]);events.get(name).push(fn)},SSSDisplayNavigation:{...N,collectStructure(root){collected.push(root);return N.collectStructure(root)}},SSSSiteHolon:H,SSSSiteFold:{createFold:()=>({busy:false,swap(fn,details){swaps.push(details);return fn()}})},SSSWorldView:W,SSSDisplaySafeArea:{start(){},refresh(){},snapshot:()=>({})},SSSInterlocutorModules:Modules};
  vm.createContext(context);
  // Use the real placement physiology; only rendering/canvas creation is a fixture.
  vm.runInContext(fieldSource,context,{filename:'locus-shader.js'});
  const fields=context.SSSInterlocutorFields;
  context.SSSInterlocutorFields={...fields,create(config){options.set(config.id,config);return {pulse(){pulses.set(config.id,(pulses.get(config.id)||0)+1)},arriveFrom(){}}}};
  vm.runInContext(runtimeSource,context,{filename:'display-runtime-v2.js'});
  const hand=(url,kind='popstate')=>{context.location.hash=url;for(const fn of events.get(kind)||[])fn({state:null})};
  return {runtime:context.SSSDisplayRuntime,hand,location:context.location,W,calls,sources,projected,renders,unmounts,options,pulses,collected,emit,history,swaps,input};
}
const f=boot(),runtime=f.runtime;
const once=()=>{for(const id of ids.slice(0,3))assert.equal(f.calls.get(id),1,'one anatomy resolution per parsed source entry: '+id);assert.equal(f.calls.has('organism:plain'),false)};
once();assert.strictEqual(f.W.projection,f.projected.get('organism:origin'));
for(const id of ids.slice(0,3))assert.strictEqual(f.options.get(id).projection,f.projected.get(id));
const plain=f.options.get('organism:plain').projection;assert.equal(plain.sourceMarker,'organism:plain');
for(let frame=0;frame<30;frame++){
  const bodies=f.options.get('organism:origin').bodies();
  assert.equal(bodies.length,3);
  for(const body of bodies)assert.strictEqual(body.root,f.options.get(body.id).projection.root,'floating body uses its field anatomy');
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
  assert.equal(environment.hostId,'organism:branch');assert.equal(environment.path,'x');
  assert.deepEqual(Array.from(environment.place.center),N.cellForPath('x').center);
}
assert.strictEqual(f.collected[1],f.projected.get('organism:branch').root);
f.W.language='de';f.emit('sss:language');assert.equal(f.renders.at(-1).language,'de');
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
console.log('display runtime: one source projection per entry, shared anatomy, repeated body/host callbacks, navigation/language/activity/remount, fresh re-entry and hash-as-input PASS');
