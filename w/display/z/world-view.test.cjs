'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const N=require('./navigation-physiology.js');
function boot(search='',{width=1280,height=800,reduced=false}={}){
  const texts=[],events=[],buttons=[],listeners=new Map(),elements=new Map(),state={activeIds:['independent:one']};
  let clock=0,nextTimer=0;const timers=new Map(),frames=new Map();
  const painted={faces:[],labels:[]};let shape=[],box=null;
  const ink=new Proxy({clearRect(){painted.faces=[];painted.labels=[]},beginPath(){shape=[]},moveTo(x,y){shape.push({x,y})},lineTo(x,y){shape.push({x,y})},fill(){painted.faces.push(shape.map(p=>({...p})))},fillRect(x,y,w,h){box={x,y,w,h}},measureText(text){return {width:text.length*parseFloat(this.font)}},fillText(text,x,y){texts.push(text);const font=parseFloat(this.font);painted.labels.push({text,x,y:y-font,w:this.measureText(text).width,h:font*1.4,font})}},{get:(o,k)=>o[k]||(()=>{})});
  function node(){return {dataset:{},children:[],style:{setProperty(k,v){this[k]=v}},attrs:{},setAttribute(k,v){this.attrs[k]=v},appendChild(n){this.children.push(n)},addEventListener(k,fn){this[k]=fn},querySelector(){return this.knob||(this.knob=node())},getBoundingClientRect:()=>({left:width-210,top:height-200,width:180,height:160}),setPointerCapture(){},hasPointerCapture:()=>true,releasePointerCapture(){}}}
  for(const name of ['navTwin','route-mark','mini-state','axis-x','axis-y','inverse-mode'])elements.set(name,node());
  const mapSize=width<520?118:width<760?138:160;
  Object.assign(elements.get('navTwin'),{width:300,height:300,getContext:()=>ink,getBoundingClientRect:()=>({left:width-mapSize-30,top:height-mapSize-100,width:mapSize,height:mapSize})});
  for(const lang of ['de','en']){const b=node();b.dataset.lang=lang;buttons.push(b)}
  const location={search,href:'https://site.invalid/?keep=yes'+(search?'&'+search.slice(1):'')+'#main:wx'};
  const document={documentElement:{dataset:{}},getElementById:id=>elements.get(id),querySelectorAll:s=>s==='[data-lang]'?buttons:[],createElementNS:()=>node()};
  const history={state,replaceState(s,_,url){assert.strictEqual(s,state);location.href=new URL(url,location.href).href;this.last=url}};
  const context={document,history,location,URL,URLSearchParams,performance:{now:()=>clock},requestAnimationFrame(fn){const id=++nextTimer;frames.set(id,fn);return id},cancelAnimationFrame:id=>frames.delete(id),setTimeout(fn,ms){const id=++nextTimer;timers.set(id,{at:clock+ms,fn});return id},clearTimeout:id=>timers.delete(id),matchMedia:()=>({matches:reduced}),addEventListener(k,fn){listeners.set(k,fn)},dispatchEvent:e=>events.push(e),CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}},SSSDisplayNavigation:N,SSSDisplayType:{fold:s=>s,rankPx:r=>16*2**(r/2)}};
  vm.runInNewContext(fs.readFileSync(process.env.WORLD_VIEW_SOURCE||path.join(__dirname,'world-view.js'),'utf8'),context);
  return {W:context.SSSWorldView,document,buttons,events,history,texts,elements,painted,advance(ms){clock+=ms;for(const [id,t] of timers)if(t.at<=clock){timers.delete(id);t.fn()}const current=[...frames];frames.clear();for(const [,fn] of current)fn(clock)},back(url){location.href=url;listeners.get('popstate')()}};
}
for(const [query,expected] of [['','en'],['?lang=de','de'],['?lang=en','en'],['?lang=fr','en']]){
  const f=boot(query);assert.equal(f.W.language,expected);assert.equal(f.document.documentElement.lang,expected);
  assert.equal(f.buttons.find(b=>b.dataset.lang===expected).attrs['aria-pressed'],'true');
}
const f=boot('?lang=de');f.W.setScope({id:'main',projection:{root:{noun:'root',children:{}}}});
f.W.setGlobalTargets([{path:'wx',locus:'place',interlocutorIds:['independent:one'],titles:{'independent:one':'Owned translated name'}}]);
f.W.setActiveGlobalAddress('wx','place');
assert(f.texts.includes('OWNED TRANSLATED NAME'),'canvas paints owned title rather than identity');
const orientation=JSON.stringify(f.W.orientation),view=f.W.view;
assert.equal(f.document.documentElement.dataset.inverse,'false');
const inverse=f.elements.get('inverse-mode');inverse.checked=true;inverse.change();
assert.equal(f.document.documentElement.dataset.inverse,'true','the existing inverse control must have a global material consequence');
const inverseSheets=['../w/root-view.css','site-runtime.css'].map(file=>fs.readFileSync(path.join(__dirname,file),'utf8')).join('\n');
const blackCover='html[data-inverse="true"] #tetra-fold{filter:invert(1)}';assert(inverseSheets.includes(blackCover),'the specifically black transition must compensate global inversion');
assert.equal((inverseSheets.replace(blackCover,'').match(/filter\s*:\s*invert\(1\)/g)||[]).length,1,'site contents still have exactly one global inverse; only the black transition is exempt');
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

/* The compass consumes the same host-space frame and clock as the actual field.
 * Semantic address loci remain unchanged; moving geometry is what gets picked. */
const atom=noun=>({noun,children:{}}),split=()=>({noun:'space',children:Object.fromEntries(N.GENES.map(g=>[g,atom(g)]))});
function project(q,p){const [w,x,y,z]=q,[a,b,c]=p;return {x:150+(a*(1-2*y*y-2*z*z)+b*(2*x*y-2*w*z)+c*(2*x*z+2*w*y))*300/2.9,y:150-(a*(2*x*y+2*w*z)+b*(1-2*x*x-2*z*z)+c*(2*y*z-2*w*x))*300/2.9}}
for(const width of [390,1280]){
 const f=boot('',{width}),root=split();root.children.x=split();root.children.x.children.x=split();
 f.W.setScope({id:'main',projection:{root}});
 const target={path:'x',locus:'place:x',interlocutorIds:['real:body'],titles:{'real:body':'Actual body'},bodies:[{id:'real:body',path:'x'}]};
 f.W.setGlobalTargets([target]);let ms=0;
 for(const delta of [0,13000,28000,59000]){
  ms+=delta;f.advance(delta);f.W.rotateBy(17,-11);const place=N.bodyPlacement(N.collectStructure(root),'x'),position=N.bodyPosition(N.bodyDrift(place,'real:body'),ms);
  const corners=N.V0.map(v=>project(f.W.orientation,v.map((x,j)=>position[j]+x*place.k)));
  assert.equal(f.painted.faces.length,4,'one real tetrahedral envelope replaces the vertex dot');
  for(const [i,j] of [[0,0],[0,1],[0,2]]){const k=[0,2,1][j];assert(Math.hypot(f.painted.faces[i][j].x-corners[k].x,f.painted.faces[i][j].y-corners[k].y)<1e-9,'actual host extent, clock and shared rotation agree')}
  const p=project(f.W.orientation,position),r=f.elements.get('navTwin').getBoundingClientRect();
  f.elements.get('navTwin').pointerdown({button:0,clientX:r.left+p.x*r.width/300,clientY:r.top+p.y*r.height/300,preventDefault(){}});
  assert.equal(f.events.at(-1).type,'sss:global-navigate');assert.equal(f.events.at(-1).detail.interlocutorIds[0],'real:body');
  assert.equal(f.events.at(-1).detail.path,'x');
 }
 const previous=f.painted.faces[0][0].x;f.W.setGlobalTargets([{...target,path:'y',bodies:[{id:'real:body',path:'y'}]}]);assert.notEqual(f.painted.faces[0][0].x,previous,'whole-body relocation changes the compass frame');
 const roots=[{path:'',locus:'overview',interlocutorIds:['host'],titles:{host:'Overview'},bodies:[]}];
 const ts=['w','x','y','z','xz'].map((path,i)=>({path,locus:path,interlocutorIds:['site:'+i],titles:{['site:'+i]:['Crawlerbait','Schattenseiten','Papers','Datenschutz','Impressum'][i]},bodies:[{id:'site:'+i,path}]}));
 f.W.setGlobalTargets([...roots,...ts]);f.advance(16000);
 assert(f.painted.labels.length<=5,'crowding suppresses normal labels instead of moving them into rows');assert(f.painted.labels.every(l=>l.font<=4*300/f.elements.get('navTwin').getBoundingClientRect().width),'normal body names stay at most rank -4');
 for(const a of f.painted.labels){assert(a.x>=0&&a.y>=0&&a.x+a.w<=300&&a.y+a.h<=300,'label stays inside the real compass canvas');for(const b of f.painted.labels)if(a!==b)assert(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),'labels remain distinct while their leaders track bodies')}
 const aliases={path:'xyw',locus:'same',interlocutorIds:['alias:a','alias:b'],titles:{'alias:a':'One','alias:b':'Two'},bodies:[{id:'alias:a',path:'xyw'},{id:'alias:b',path:'xwy'}]};
 f.W.setGlobalTargets([aliases]);assert.equal(f.painted.faces.length,8,'quotient-coalesced identities retain their two actual body frames');assert.equal(f.W.globalTargets[0].bodies[1].path,'xwy');
 const r=f.elements.get('navTwin').getBoundingClientRect(),face=f.painted.faces[0],point={x:face.reduce((a,p)=>a+p.x,0)/3,y:face.reduce((a,p)=>a+p.y,0)/3};f.elements.get('navTwin').pointermove({clientX:r.left+point.x*r.width/300,clientY:r.top+point.y*r.height/300});const label=f.painted.labels[0];assert(label,'hover lends a readable local name to a fine body');f.elements.get('navTwin').pointerdown({button:0,clientX:r.left+(label.x+label.w/2)*r.width/300,clientY:r.top+(label.y+label.h/2)*r.height/300,preventDefault(){}});
 assert.deepEqual(Array.from(f.events.at(-1).detail.interlocutorIds),['alias:a','alias:b'],'spatial picking preserves the existing coalesced encounter');
 f.W.setGlobalTargets([]);assert.equal(f.painted.faces.length,0,'withdrawn mount has no stale compass body');
}
console.log('PASS — actual contained body extent/drift/rotation, relocation, spatial picking, bounded labels and quotient-coalesced identities');

// A physically mounted deep path earns its own contained frame without requiring
// Philosophy to invent semantic descendants. Scale recurs; it is never clamped
// to the handful of currently authored overview concepts.
{
 const structure=N.collectStructure(split());
 for(const depth of [2,8,24]){const path='wx'.repeat(depth/2),p=N.bodyPlacement(structure,path);assert.equal(p.cell,path);assert.equal(p.k,2**-(path.length+2))}
 const f=boot(),tree=split();f.W.setScope({id:'main',projection:{root:tree}});
 const paths=Array.from({length:4096},(_,i)=>i.toString(4).padStart(6,'0').replace(/[0-3]/g,n=>'wxyz'[+n]));
 f.W.setGlobalTargets(paths.map((path,i)=>({path,locus:path,interlocutorIds:['dense:'+i],titles:{['dense:'+i]:'A real deep holon '+i},bodies:[{id:'dense:'+i,path}]})));
 assert(f.painted.labels.length<50,'dense populations cannot turn into a name list');
 assert(f.painted.faces.length<paths.length*4,'subpixel mount branches stay spatially coalesced');
 const canvas=f.elements.get('navTwin'),r=canvas.getBoundingClientRect();
 const chosen=N.bodyPosition(N.bodyDrift(N.bodyPlacement(N.collectStructure(tree),'wwwwww'),'dense:0'),0),at=project(f.W.orientation,chosen);
 const center={clientX:r.left+at.x*r.width/300,clientY:r.top+at.y*r.height/300,deltaY:-240,preventDefault(){}};
 const priorOrientation=JSON.stringify(f.W.orientation),priorView=f.W.view,priorEvents=f.events.length;
 canvas.pointerdown({...center,button:0,pointerType:'touch'});
 assert.equal(f.events.length,priorEvents,'touching an occupied coarse cell refines the map without manufacturing a destination');
 canvas.keydown({key:'0',preventDefault(){}});
 const before=f.painted.faces.length;for(let i=0;i<8;i++)canvas.wheel(center);
 assert(f.painted.faces.length>0,'fine physical bodies become available by map magnification');
 canvas.keydown({key:'ArrowRight',preventDefault(){}});
 assert.equal(JSON.stringify(f.W.orientation),priorOrientation);assert.equal(f.W.view,priorView);assert.equal(f.events.length,priorEvents,'magnification and pan stay local to the map camera');
 canvas.keydown({key:'0',preventDefault(){}});assert.equal(f.painted.faces.length,before,'reset returns to the same coarse spatial projection');
}
console.log('PASS — recursive mounted scale, dense spatial LOD, small local labels and unbounded map magnification');
