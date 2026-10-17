'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const N=require('./navigation-physiology.js');
function boot(search=''){
  const texts=[],events=[],buttons=[],listeners=new Map(),elements=new Map(),state={activeIds:['independent:one']};
  const ink=new Proxy({fillText(text){texts.push(text)}},{get:(o,k)=>o[k]||(()=>{})});
  function node(){return {dataset:{},style:{setProperty(){}},attrs:{},setAttribute(k,v){this.attrs[k]=v},appendChild(){},addEventListener(k,fn){this[k]=fn},querySelector(){return this.knob||(this.knob=node())}}}
  for(const name of ['navTwin','route-mark','mini-state','axis-x','axis-y'])elements.set(name,node());
  Object.assign(elements.get('navTwin'),{width:300,height:300,getContext:()=>ink});
  for(const lang of ['de','en']){const b=node();b.dataset.lang=lang;buttons.push(b)}
  const location={search,href:'https://site.invalid/?keep=yes'+(search?'&'+search.slice(1):'')+'#main:wx'};
  const document={documentElement:{},getElementById:id=>elements.get(id),querySelectorAll:s=>s==='[data-lang]'?buttons:[],createElementNS:()=>node()};
  const history={state,replaceState(s,_,url){assert.strictEqual(s,state);location.href=new URL(url,location.href).href;this.last=url}};
  const context={document,history,location,URL,URLSearchParams,performance:{now:()=>0},requestAnimationFrame(){},addEventListener(k,fn){listeners.set(k,fn)},dispatchEvent:e=>events.push(e),CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}},SSSDisplayNavigation:N,SSSDisplayType:{fold:s=>s,rankPx:()=>10}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'world-view.js'),'utf8'),context);
  return {W:context.SSSWorldView,document,buttons,events,history,texts,back(url){location.href=url;listeners.get('popstate')()}};
}
for(const [query,expected] of [['','en'],['?lang=de','de'],['?lang=en','en'],['?lang=fr','en']]){
  const f=boot(query);assert.equal(f.W.language,expected);assert.equal(f.document.documentElement.lang,expected);
  assert.equal(f.buttons.find(b=>b.dataset.lang===expected).attrs['aria-pressed'],'true');
}
const f=boot('?lang=de');f.W.setScope({id:'main',projection:{root:{noun:'root',children:{}}}});
f.W.setGlobalTargets([{path:'wx',locus:'place',interlocutorIds:['independent:one'],titles:{'independent:one':'Owned translated name'}}]);
assert(f.texts.includes('OWNED TRANSLATED NAME'),'canvas paints owned title rather than identity');
const orientation=JSON.stringify(f.W.orientation),view=f.W.view;
f.buttons.find(b=>b.dataset.lang==='en').click();
assert.equal(f.W.language,'en');assert.equal(f.history.last,'/?keep=yes&lang=en#main:wx');
assert.equal(f.events.at(-1).type,'sss:language');assert.equal(f.events.at(-1).detail.language,'en');
assert.equal(JSON.stringify(f.W.orientation),orientation);assert.equal(f.W.view,view);
assert.deepEqual(Array.from(f.history.state.activeIds),['independent:one']);
f.back('https://site.invalid/?lang=de#main:wx');assert.equal(f.W.language,'de');
assert.equal(f.document.documentElement.lang,'de');assert.equal(f.events.at(-1).detail.language,'de');
console.log('PASS — initial/unsupported language, controls, URL round trip, owned canvas titles and encounter continuity');
