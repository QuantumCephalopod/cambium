'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const N=require('./navigation-physiology.js');
function boot(search='',{width=1280,height=800,reduced=false}={}){
  const texts=[],events=[],buttons=[],listeners=new Map(),elements=new Map(),state={activeIds:['independent:one']};
  let clock=0,nextTimer=0;const timers=new Map(),frames=new Map();
  const ink=new Proxy({fillText(text){texts.push(text)}},{get:(o,k)=>o[k]||(()=>{})});
  function node(){return {dataset:{},children:[],style:{setProperty(k,v){this[k]=v}},attrs:{},setAttribute(k,v){this.attrs[k]=v},appendChild(n){this.children.push(n)},addEventListener(k,fn){this[k]=fn},querySelector(){return this.knob||(this.knob=node())},getBoundingClientRect:()=>({left:width-210,top:height-200,width:180,height:160}),setPointerCapture(){},hasPointerCapture:()=>true,releasePointerCapture(){}}}
  for(const name of ['navTwin','route-mark','mini-state','axis-x','axis-y','inverse-mode'])elements.set(name,node());
  Object.assign(elements.get('navTwin'),{width:300,height:300,getContext:()=>ink});
  for(const lang of ['de','en']){const b=node();b.dataset.lang=lang;buttons.push(b)}
  const location={search,href:'https://site.invalid/?keep=yes'+(search?'&'+search.slice(1):'')+'#main:wx'};
  const document={documentElement:{dataset:{}},getElementById:id=>elements.get(id),querySelectorAll:s=>s==='[data-lang]'?buttons:[],createElementNS:()=>node()};
  const history={state,replaceState(s,_,url){assert.strictEqual(s,state);location.href=new URL(url,location.href).href;this.last=url}};
  const context={document,history,location,URL,URLSearchParams,performance:{now:()=>clock},requestAnimationFrame(fn){const id=++nextTimer;frames.set(id,fn);return id},cancelAnimationFrame:id=>frames.delete(id),setTimeout(fn,ms){const id=++nextTimer;timers.set(id,{at:clock+ms,fn});return id},clearTimeout:id=>timers.delete(id),matchMedia:()=>({matches:reduced}),addEventListener(k,fn){listeners.set(k,fn)},dispatchEvent:e=>events.push(e),CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}},SSSDisplayNavigation:N,SSSDisplayType:{fold:s=>s,rankPx:()=>10}};
  vm.runInNewContext(fs.readFileSync(process.env.WORLD_VIEW_SOURCE||path.join(__dirname,'world-view.js'),'utf8'),context);
  return {W:context.SSSWorldView,document,buttons,events,history,texts,elements,advance(ms){clock+=ms;for(const [id,t] of timers)if(t.at<=clock){timers.delete(id);t.fn()}const current=[...frames];frames.clear();for(const [,fn] of current)fn(clock)},back(url){location.href=url;listeners.get('popstate')()}};
}
for(const [query,expected] of [['','en'],['?lang=de','de'],['?lang=en','en'],['?lang=fr','en']]){
  const f=boot(query);assert.equal(f.W.language,expected);assert.equal(f.document.documentElement.lang,expected);
  assert.equal(f.buttons.find(b=>b.dataset.lang===expected).attrs['aria-pressed'],'true');
}
const f=boot('?lang=de');f.W.setScope({id:'main',projection:{root:{noun:'root',children:{}}}});
f.W.setGlobalTargets([{path:'wx',locus:'place',interlocutorIds:['independent:one'],titles:{'independent:one':'Owned translated name'}}]);
assert(f.texts.includes('OWNED TRANSLATED NAME'),'canvas paints owned title rather than identity');
const orientation=JSON.stringify(f.W.orientation),view=f.W.view;
assert.equal(f.document.documentElement.dataset.inverse,'false');
const inverse=f.elements.get('inverse-mode');inverse.checked=true;inverse.change();
assert.equal(f.document.documentElement.dataset.inverse,'true','the existing inverse control must have a global material consequence');
inverse.checked=false;inverse.change();assert.equal(f.document.documentElement.dataset.inverse,'false');
assert.equal(JSON.stringify(f.W.orientation),orientation);assert.equal(f.W.view,view);assert.equal(f.W.language,'de');
f.buttons.find(b=>b.dataset.lang==='en').click();
assert.equal(f.W.language,'en');assert.equal(f.history.last,'/?keep=yes&lang=en#main:wx');
assert.equal(f.events.at(-1).type,'sss:language');assert.equal(f.events.at(-1).detail.language,'en');
assert.equal(JSON.stringify(f.W.orientation),orientation);assert.equal(f.W.view,view);
assert.deepEqual(Array.from(f.history.state.activeIds),['independent:one']);
f.back('https://site.invalid/?lang=de#main:wx');assert.equal(f.W.language,'de');
assert.equal(f.document.documentElement.lang,'de');assert.equal(f.events.at(-1).detail.language,'de');
console.log('PASS — initial/unsupported language, controls, URL round trip, owned canvas titles and encounter continuity');
for(const [width,height] of [[1280,800],[390,844]])for(const pointerType of ['mouse','touch'])for(const reduced of [false,true]){
  const f=boot('',{width,height,reduced});f.W.setScope({id:'main',projection:{root:{noun:'root',children:{}}}});
  const axis=f.elements.get('axis-x'),knob=axis.querySelector('.knob'),r=axis.getBoundingClientRect();
  const e={button:0,pointerId:7,pointerType,clientX:r.left+r.width*.8,clientY:r.top+30,preventDefault(){}};
  axis.pointerdown(e);f.advance(260);
  if(!reduced){assert(+knob.style['--knob-lock']>0&&+knob.style['--knob-lock']<1);assert(+knob.style['--knob-scale']>1,'settling swells the same knob')}
  f.advance(259);assert.notEqual(axis.dataset.latched,'true','lock cannot precede its520ms contract');
  f.advance(1);assert.equal(axis.dataset.latched,'true');assert.equal(+knob.style['--knob-lock'],1);
  const locked=knob.children[0].children[0].attrs.points;assert.equal(locked.split(' ').length,36);
  axis.pointerdown(e);assert.equal(axis.dataset.latched,'false');assert.equal(+knob.style['--knob-lock'],0);
  f.advance(200);axis.pointermove({...e,clientX:r.left+r.width*.2});f.advance(400);assert.notEqual(axis.dataset.latched,'true','movement rearms the settle');
  axis.pointercancel(e);f.advance(600);assert.notEqual(axis.dataset.latched,'true','cancel cannot leave a pending latch');
  axis.keydown({key:'ArrowRight',shiftKey:false,preventDefault(){}});assert.notEqual(+axis.attrs['aria-valuenow'],0);
  axis.keyup();assert.equal(+axis.attrs['aria-valuenow'],0,'keyboard release stops the axis without inventing a pointer latch');
}
console.log('PASS — wide/narrow mouse/touch520ms swell/lock/rearm/cancel and keyboard/reduced-motion contract');
