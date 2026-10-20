'use strict';
const assert=require('assert');
const L=require('./display-lens.js');
const map={id:'map',kind:'hud',layer:'hud',cx:900,cy:480,hx:110,hy:120};
const top={id:'top',kind:'hud',layer:'hud',edge:'bottom',cx:550,cy:60,hx:550,hy:60};
const view={w:1100,h:700},run=(s,h,sec,c)=>{for(let t=0;t<sec;t+=1/120)L.step(s,h,1/120,view,c);return s};
let s=L.create(map,view),g=L.geometry(s,map);
assert.strictEqual(g.hx,g.hy);assert.strictEqual(g.round,1);
assert.ok(s.docked&&s.attached);
const start={x:s.x,y:s.y};
run(s,map,.6,{active:true,x:start.x-65,y:start.y});
assert.ok(Math.hypot(s.x-start.x,s.y-start.y)<1,'a nearby cursor never moves the centre');
assert.ok(L.geometry(s,map).rx<-10,'the flesh reaches toward the nearby cursor');
run(s,map,1.2);assert.ok(Math.hypot(L.geometry(s,map).rx,L.geometry(s,map).ry)<1,'without a cursor the flesh settles back');
assert.strictEqual(L.geometry(s,map).hx,L.geometry(s,map).hy);
L.grab(s,s.x,s.y,1);
for(let i=0;i<60;i++){L.move(s,430,350,1);L.step(s,[map,top],1/60,view)}
assert.ok(!s.attached,'pulling far tears the connection');
const heldRadius=s.radius;
L.release(s,2);assert.ok(s.held,'foreign pointer cannot release');
L.release(s,1);run(s,[],1);
assert.ok(s.radius>heldRadius*1.2,'released drop relaxes into a bigger circle');
assert.strictEqual(L.geometry(s,null).neck,0);
assert.strictEqual(L.geometry(s,null).hx,L.geometry(s,null).hy);
const still={x:s.x,y:s.y};run(s,[],1);
assert.ok(Math.hypot(s.x-still.x,s.y-still.y)<1,'free drop settles without creeping');
s.x=650;s.y=155;s.vx=s.vy=0;run(s,[map,top],.4);
assert.ok(s.attached&&!s.docked,'connected tissue draws the drop home slowly, not at once');
run(s,[map,top],8);
assert.strictEqual(s.homeId,'top','another compatible edge absorbs the drop');
assert.ok(s.docked&&s.attached);
assert.ok(s.radius<heldRadius,'stored overfill settles smaller');
assert.ok(L.pullFrom(s,top,650,top.cy+top.hy,3),'top reservoir can be pulled from');
L.move(s,650,400,3);run(s,[map,top],1);L.release(s,3);
assert.ok(!s.attached);
const foreign={...map,id:'foreign',layer:'other'};
s.x=map.cx-map.hx-10;s.y=map.cy;run(s,[foreign],1);
assert.strictEqual(s.attached,false,'different layer cannot absorb');
assert.strictEqual(L.pullFrom(s,foreign,s.x,s.y,4),false);
const otherKind={...map,kind:'other'};
assert.strictEqual(L.pullFrom(s,otherKind,s.x,s.y,4),false);
s=L.create(map,view);L.grab(s,s.x,s.y,1);
for(let i=0;i<100;i++){L.move(s,-500,-500,1);L.step(s,map,1/60,view)}
assert.ok(s.x>=s.radius&&s.y>=s.radius,'drop stays inside viewport');
L.release(s,1);run(s,[],2);
assert.ok(s.x>=s.radius&&s.y>=s.radius&&s.x+s.radius<=view.w&&s.y+s.radius<=view.h);
assert.strictEqual(L.contains(s,s.x+s.radius+20,s.y),false,'hit target is a circle');
for(const edge of ['left','right','top','bottom']){
  const h={...map,edge};s=L.create(h,view);
  const p=L.edgePoint(h,s.x,s.y);assert.strictEqual(p.edge,edge);
}
s=L.create(map,view);s.vx=1e4;L.step(s,map,5,view);
assert.ok(Number.isFinite(s.x)&&Number.isFinite(s.radius));
console.log('round glass drop / cursor / UI edge absorption witness: PASS');

/* Release in a narrow pane now returns across free space to the closest edge. */
const smallView={w:360,h:480},smallMap={...map,cx:255,cy:365,hx:90,hy:110},smallTop={...top,cx:180,cy:54,hx:180,hy:54};
s=L.create(smallTop,smallView);L.grab(s,s.x,s.y,1);
for(let i=0;i<120;i++){L.move(s,75,300,1);L.step(s,[smallTop,smallMap],1/60,smallView)}
assert.strictEqual(s.attached,false);
L.release(s,1);
for(let i=0;i<1200;i++)L.step(s,[smallTop,smallMap],1/60,smallView);
assert.ok(s.attached&&s.docked,'unlocked release returns even beyond capture reach');
assert.equal(s.homeId,'map','the closest reservoir receives the drop');
assert.ok(s.hx===s.hy);
console.log('narrow-pane nearest-reservoir return witness: PASS');

/* The drop lets the world through: a click under it is replayed to what lies beneath; pressing on
 * the drop and pulling takes it at once. Ownership and cancellation still hold. */
const vm=require('vm'),fs=require('fs');
function target(){return {style:{},dataset:{},events:{},attributes:{},classList:{contains:()=>false},setAttribute(k,v){this.attributes[k]=v},
  addEventListener(type,fn){(this.events[type]??=[]).push(fn)},setPointerCapture(){throw Error('capture unavailable')},
  dispatchEvent(ev){for(const f of this.events[ev.type]||[])f(ev);return true},
  fire(type,extra={}){const e={type,button:0,pointerId:1,pointerType:'mouse',clientX:400,clientY:300,currentTarget:this,target:this,preventDefault(){},stopPropagation(){},...extra};for(const f of this.events[type]||[])f(e)}}}
const win=target(),nodes=[],frames=[];let glassOn=true,clock=100,reduced=false;
class PE{constructor(type,init){Object.assign(this,init);this.type=type}}
Object.assign(win,{innerWidth:1100,innerHeight:700,PointerEvent:PE,matchMedia:()=>({matches:reduced}),getComputedStyle:()=>({}),requestAnimationFrame:f=>frames.push(f),
  document:{documentElement:{dataset:{}},body:{append:n=>nodes.push(n)},createElement:target},
  SSSDisplayGlass:{enabled:()=>glassOn,collect:()=>[{id:'top',kind:'hud',layer:'hud',role:'top',rect:{left:0,top:0,right:1100,bottom:120,width:1100,height:120}}]},module:{exports:{}}});
win.globalThis=win;vm.runInNewContext(fs.readFileSync(require.resolve('./display-lens.js'),'utf8'),win);
const controller=win.module.exports;controller.start();
const tick=(ms=16)=>{clock+=ms;frames.shift()(clock)};tick();
const drop=nodes.find(n=>n.id==='display-lens');
assert.strictEqual(drop.style.cssText.includes('pointer-events:none'),true,'the drop never blocks the pointer');
const L0=controller.snapshot().lens,at={clientX:L0.x,clientY:L0.y};
const under=target();let downs=0;under.addEventListener('pointerdown',()=>downs++);
win.fire('pointerdown',{...at,target:under});tick(60);win.fire('pointerup',{...at,target:under});
assert.strictEqual(downs,1,'a click on the drop is replayed to what lies under it');
assert.strictEqual(controller.snapshot().lens.held,false,'a click does not take the drop');
win.fire('pointerdown',{...at,target:under});tick(900);win.fire('pointerup',{...at,target:under});
assert.strictEqual(downs,2,'a still press, however long, is still a click that passes through');
assert.strictEqual(controller.snapshot().lens.held,false);
const hold=()=>{const l=controller.snapshot().lens;win.fire('pointerdown',{clientX:l.x,clientY:l.y,target:under});win.fire('pointermove',{clientX:l.x+12,clientY:l.y,target:under});tick()};
hold();assert.strictEqual(controller.snapshot().lens.held,true,'pressing on the drop and pulling takes it at once');
assert.strictEqual(downs,2,'a pull is not replayed beneath');
win.fire('pointerup',{pointerId:2});
assert.strictEqual(controller.snapshot().lens.held,true,'another pointer cannot end the hold');
win.fire('pointerup');assert.strictEqual(controller.snapshot().lens.held,false);
assert.notStrictEqual(drop.dataset.phase,'held','release phase is visible immediately');
for(const type of ['pointercancel','lostpointercapture']){hold();win.fire(type);assert.strictEqual(controller.snapshot().lens.held,false,type+' clears ownership')}
hold();win.fire('blur');assert.strictEqual(controller.snapshot().lens.held,false);
hold();glassOn=false;tick();glassOn=true;tick();assert.strictEqual(controller.snapshot().lens.held,false,'turning glass off cancels the drag');
assert.ok(controller.snapshot().lens.mag>.11&&controller.snapshot().lens.mag<.12,'the drop magnifies by 13%');
console.log('pass-through click / pull-to-take / ownership witness: PASS');

/* Soft-lock witnesses: field = exact rounded rectangle, body = released circle that follows,
 * withdrawn target releases continuously, pulling unlocks, locked glass does not magnify. */
{
  const runT=(s,sec,t)=>{for(let i=0;i<sec*120;i++)L.step(s,[],1/120,view,null,typeof t==='function'?t():t);return s};
  const field={id:'site:Description',kind:'field',cx:300,cy:500,hx:180,hy:110,r:10};
  let s=L.create(null,view);s.x=310;s.y=480;s.vx=s.vy=0;
  assert.strictEqual(L.candidateAt(s,[field]),field,'a drop released inside a field rectangle finds it');
  L.lockTo(s,field);runT(s,2,field);
  let g=L.geometry(s,null);
  assert.ok(Math.abs(g.x-300)<1&&Math.abs(g.y-500)<1,'field lock centres on the target');
  assert.ok(Math.abs(g.hx-180)<1&&Math.abs(g.hy-110)<1,'field lock shares the exact dimension');
  assert.strictEqual(g.round,0);assert.strictEqual(g.corner,10);assert.strictEqual(g.mag,0,'locked glass frames, it does not magnify');
  assert.strictEqual(g.focus,1);assert.deepStrictEqual(g.lock,{id:'site:Description',kind:'field'});
  assert.ok(L.contains(s,300+175,500+105)&&!L.contains(s,300+200,500),'pointer surface follows the rectangle');
  const moved={...field,cx:420,cy:300};runT(s,2,moved);g=L.geometry(s,null);
  assert.ok(Math.abs(g.x-420)<1&&Math.abs(g.y-300)<1,'lock follows target identity, not stale pixels');
  const at={x:s.x,y:s.y};L.step(s,[],1/60,view,null,null);
  assert.strictEqual(s.lock,null,'a vanished target unlocks');
  assert.ok(Math.hypot(s.x-at.x,s.y-at.y)<2,'it unlocks where it is');
  g=L.geometry(s,null);assert.strictEqual(g.round,0);assert.ok(g.hx>g.hy,'release preserves the moving reading shape');
  assert.ok(g.mag>0,'free glass magnifies again');
  runT(s,2,null);g=L.geometry(s,null);assert.strictEqual(g.round,1);assert.ok(Math.abs(g.hx-g.hy)<1e-4,'the same flesh settles into a circle');

  const body={id:'site:papers',kind:'body',cx:600,cy:300,hx:24};
  s=L.create(null,view);s.x=590;s.y=310;s.vx=s.vy=0;
  assert.strictEqual(L.candidateAt(s,[field,body]),body,'a drop over a body finds the body');
  L.lockTo(s,body);let p={...body};runT(s,2,()=>p);g=L.geometry(s,null);
  assert.strictEqual(g.round,1);assert.ok(Math.abs(g.hx-s.baseR*L.K.released)<1,'body lock keeps the released circle size');
  assert.strictEqual(g.focus,0,'a body lock highlights the body itself: nothing beneath it is muted');
  p={...body,cx:200,cy:420};runT(s,2,()=>p);
  assert.ok(Math.hypot(s.x-200,s.y-420)<1&&s.lock,'body lock survives while the body persists and follows it');
  L.grab(s,s.x,s.y,7);assert.strictEqual(s.lock,null,'pulling the drop unlocks it');L.release(s,7);
  s.x=50;s.y=50;assert.strictEqual(L.candidateAt(s,[field,body]),null,'no target means free lens');
  assert.throws(()=>L.offer('x',{kind:'field'}));assert.throws(()=>L.offer('',{kind:'body',point:()=>null}));
  console.log('soft-lock field/body/vanish/follow/pull witness: PASS');
}

/* A contacted body can lend measured readable extent without changing its hit area. */
{
  let layoutCalls=0;const target='specimen:second|part',point={x:640,y:430,r:8};
  L.offer(target,{kind:'body',point:()=>point,frame:()=>{layoutCalls++;return {left:500,top:300,width:280,height:180,r:16}}});
  assert.equal(L.resolveTargets().find(t=>t.id===target).frame,undefined);
  assert.equal(layoutCalls,0,'uncontacted bodies do no readable layout work');
  const t=L.resolveTargets(target).find(t=>t.id===target);assert.equal(layoutCalls,1);
  assert.equal(t.cx,point.x,'finer reading extent never replaces the actual contact point');
  assert.equal(t.hx,8);
  const view={w:800,h:600},s=L.create(null,view);s.x=640;s.y=430;L.lockTo(s,t);
  for(let i=0;i<300;i++)L.step(s,[],1/120,view,null,t);
  const g=L.geometry(s,null);assert.equal(g.round,0);assert.equal(g.lock.kind,'body');assert.equal(g.focus,0);
  assert.ok(Math.abs(g.hx-140)<.1&&Math.abs(g.hy-90)<.1);
  assert.ok(L.contains(s,s.x+120,s.y+60),'pass-through surface follows the actual readable body');
  const far={...t,frame:{cx:-500,cy:2000,hx:1200,hy:900,r:16}};
  for(let i=0;i<300;i++)L.step(s,[],1/120,view,null,far);
  const bounded=L.geometry(s,null);assert.ok(bounded.x-bounded.hx>=0&&bounded.y-bounded.hy>=0&&bounded.x+bounded.hx<=800&&bounded.y+bounded.hy<=600);
  L.withdraw(target);L.step(s,[],1/120,view,null,null);assert.equal(s.lock,null);assert.equal(L.geometry(s,null).round,0);
  console.log('identity-owned readable extent, lazy acquisition, viewport and release witness: PASS');
}

/* The outer optical rim remains part of the same take/pull body. */
{
 const l=L.create(null,{w:390,h:844});l.x=160;l.y=200;l.radius=60;l.hx=90;l.hy=50;l.corner=14;l.lock={kind:'body',id:'reading'};
 assert(L.contains(l,l.x+l.hx+7,l.y));assert(!L.contains(l,l.x+l.hx+10,l.y));
}

/* Offered identity outlives a missing projection; withdrawal, not a timer or
 * invented stale hit area, ends contact. All getters still measure live geometry. */
{
  const id='arbitrary:identity',spec={kind:'field',rect:()=>rect};let rect={left:100,top:180,width:250,height:96};
  L.offer(id,spec);const s=L.create(null,view),sample=()=>L.resolveTargets(s.lock?.id).find(t=>t.id===id);
  L.lockTo(s,sample());for(let i=0;i<240;i++)L.step(s,[],1/120,view,null,sample());
  rect=null;assert(!L.resolveTargets().some(t=>t.id===id),'unprojected offers cannot acquire contact');
  for(let i=0;i<600;i++)L.step(s,[],1/120,view,null,sample());
  assert.equal(s.lock.id,id,'no arbitrary timeout releases an owner-held identity');
  rect={left:420,top:210,width:180,height:140};
  for(let i=0;i<240;i++)L.step(s,[],1/120,view,null,sample());
  assert(Math.abs(s.x-510)<.01&&Math.abs(s.hy-70)<.01,'restoration follows the new geometry');
  L.withdraw(id);L.offer(id,spec);L.step(s,[],1/120,view,null,sample());assert.equal(s.lock.id,id,'synchronous renderer renewal preserves identity');
  L.withdraw(id);L.step(s,[],1/120,view,null,sample());assert.equal(s.lock,null,'owner withdrawal ends contact');
}

/* Withdrawal carries existing motion and all shape/optical coordinates into
 * the nearest eligible reservoir, including remote free-space release. */
for(const [w,h] of [[390,844],[1280,800]])for(const destination of ['top','compass','free']){
  const v={w,h},hs=[{id:'top',kind:'hud',layer:'hud',cx:w/2,cy:32,hx:w/2,hy:32,edge:'bottom'},
    {id:'compass',kind:'hud',layer:'hud',cx:w-65,cy:h-85,hx:55,hy:75}];
  const pos=destination==='top'?{x:w/2,y:100}:destination==='compass'?{x:w-150,y:h-85}:{x:90,y:h/2};
  const s=L.create(null,v),t={id:'arbitrary:field',kind:'field',cx:pos.x,cy:pos.y,hx:72,hy:32,r:9};
  L.lockTo(s,t);for(let i=0;i<240;i++)L.step(s,hs,1/120,v,null,t);
  s.vx=14;s.vy=-7;s.hxV=3;s.hyV=-2;
  const before=L.geometry(s,hs),velocity=[s.vx,s.vy,s.hxV,s.hyV];L.unlock(s);
  const distance=h=>Math.hypot(Math.max(0,Math.abs(before.x-h.cx)-h.hx),Math.max(0,Math.abs(before.y-h.cy)-h.hy));
  const expected=hs.reduce((a,b)=>distance(a)<=distance(b)?a:b).id;
  assert.deepEqual([s.vx,s.vy,s.hxV,s.hyV],velocity,'withdrawal preserves momentum');
  const just=L.geometry(s,hs);for(const k of ['x','y','hx','hy','corner','protect','focus','mag'])assert.equal(just[k],before[k],'no release jump in '+k);
  let maxDelta=0,prior=just;
  for(let i=0;i<1800;i++){
    L.step(s,[...hs,{...hs[0],id:'foreign',layer:'elsewhere',cy:pos.y}],1/120,v);
    const g=L.geometry(s,hs);for(const k of ['x','y','hx','hy','corner']){assert(Number.isFinite(g[k]));maxDelta=Math.max(maxDelta,Math.abs(g[k]-prior[k]))}
    assert(g.x-g.boundX>=-.001&&g.y-g.boundY>=-.001&&g.x+g.boundX<=w+.001&&g.y+g.boundY<=h+.001,'moving shape stays within the carrier');prior=g;
  }
  assert(maxDelta<8,'bounded substep motion, including circle and neck transition');
  assert.ok(s.attached&&s.docked);assert.equal(s.homeId,expected,'nearest eligible reservoir receives the same drop');
  assert.equal(L.geometry(s,hs).round,1);assert.equal(L.geometry(s,hs).protect,0);
  console.log(JSON.stringify({carrier:[w,h],withdrawal:destination,max_substep_delta:maxDelta,settled:true}));
  const reduced=L.create(null,v);L.lockTo(reduced,t);L.step(reduced,hs,1/60,v,null,t,true);
  assert.equal(reduced.x,t.cx);assert.equal(reduced.hx,t.hx);
  L.step(reduced,hs,1/60,v,null,null,true);
  assert.equal(reduced.lock,null);assert.equal(reduced.hx,reduced.hy);assert.equal(reduced.vx,0);assert.equal(reduced.protect,0);
}

/* Real controller: cancellation cannot acquire; keyboard is a take/pull/release
 * interaction, and owns its hold independently of pointer input. */
{
  const at=()=>{const g=controller.snapshot().lens;return {clientX:g.x,clientY:g.y,target:under}};
  controller.offer('under:drop',{kind:'field',rect:()=>({left:0,top:0,width:1100,height:700})});
  hold();win.fire('pointercancel',at());assert.equal(controller.snapshot().lens.lock,null,'cancel never acquires the offered target');
  drop.fire('keydown',{key:'Enter'});assert.equal(controller.snapshot().lens.held,true);assert.equal(drop.attributes['aria-pressed'],'true');
  let repeatPrevented=false;drop.fire('keydown',{key:' ',repeat:true,preventDefault(){repeatPrevented=true}});assert(repeatPrevented&&controller.snapshot().lens.held,'held key repeat neither scrolls nor toggles ownership');
  win.fire('pointerup',at());assert.equal(controller.snapshot().lens.held,true,'pointer cannot release keyboard ownership');
  const x=controller.snapshot().lens.x;drop.fire('keydown',{key:'ArrowRight'});for(let i=0;i<90;i++)tick();assert(controller.snapshot().lens.x>x+5);
  drop.fire('keydown',{key:'Escape'});assert.equal(controller.snapshot().lens.held,false);assert.equal(controller.snapshot().lens.lock,null);
  drop.fire('keydown',{key:'Enter'});drop.fire('blur');assert.equal(controller.snapshot().lens.held,false,'moving focus away cannot strand keyboard ownership');assert.equal(controller.snapshot().lens.lock,null);
  drop.fire('keydown',{key:' '});drop.fire('keydown',{key:' '});assert.equal(controller.snapshot().lens.lock.id,'under:drop','deliberate keyboard release shares target acquisition');
  for(let i=0;i<90;i++)tick();controller.withdraw('under:drop');reduced=true;tick();assert.equal(controller.snapshot().lens.round,1);assert.equal(controller.snapshot().lens.protect,0);reduced=false;
  assert.equal(drop.attributes['aria-pressed'],'false');assert.match(drop.attributes['aria-description'],/plain click passes through/);
}
console.log('identity/projection, bounded continuous return, reduced motion and keyboard/cancel witness: PASS');

/* The production controller carries actual pointer endings into return. */
for(const ending of ['pointerup','pointercancel']){
 hold();win.fire('pointermove',{clientX:400,clientY:450,target:under});for(let i=0;i<150;i++)tick();
 assert(controller.snapshot().lens.held&&!controller.snapshot().lens.attached);
 win.fire(ending,{clientX:400,clientY:450,target:under});
 assert(!controller.snapshot().lens.held&&!controller.snapshot().lens.lock);
 const released=controller.snapshot().lens;tick();const returning=controller.snapshot().lens;
 assert(returning.y<released.y&&!returning.attached,'release starts return across free space without a bridge');
 for(let i=0;i<900;i++)tick();
 assert(controller.snapshot().lens.docked&&controller.snapshot().home.id==='top',ending+' returns to storage');
}

/* Return is a force on unheld, unlocked glass, separate from short physical
 * contact. Selection uses boundary distance and stays live as reservoirs change. */
for(const v of [{w:390,h:844},{w:1280,h:800}]){
 const hs=[{id:'upper',kind:'hud',layer:'hud',cx:v.w/2,cy:20,hx:v.w/2,hy:20,edge:'bottom'},
   {id:'lower',kind:'hud',layer:'hud',cx:v.w-45,cy:v.h-80,hx:35,hy:60}];
 const fresh=()=>{const q=L.create(null,v);q.x=v.w*.35;q.y=v.h*.45;return q};
 const s=fresh(),from={x:s.x,y:s.y};
 const dist=h=>Math.hypot(Math.max(0,Math.abs(s.x-h.cx)-h.hx),Math.max(0,Math.abs(s.y-h.cy)-h.hy));
 const expected=hs.reduce((a,b)=>dist(a)<=dist(b)?a:b);
 assert(dist(expected)>L.K.magnet*s.U,'start beyond former capture reach');
 L.step(s,hs,1/120,v);let g=L.geometry(s,hs);
 assert(!s.attached&&!s.docked&&g.neck===0&&s.join===0,'remote attraction never invents a fluid connection');
 assert(Math.hypot(s.x-from.x,s.y-from.y)>0,'return starts on the first unlocked step');
 for(let i=0;i<2400;i++)L.step(s,[...hs].reverse(),1/120,v);
 assert(s.docked&&s.homeId===expected.id,'actual nearest boundary wins regardless of surface order');
 const held=fresh();L.grab(held,held.x,held.y,9);for(let i=0;i<240;i++)L.step(held,hs,1/120,v);
 assert(Math.hypot(held.x-from.x,held.y-from.y)<1e-8,'holding excludes reservoir attraction');
 const locked=fresh(),t={id:'owner',kind:'body',cx:locked.x,cy:locked.y,hx:8};L.lockTo(locked,t);
 for(let i=0;i<240;i++)L.step(locked,hs,1/120,v,null,t);
 assert(locked.lock&&Math.hypot(locked.x-t.cx,locked.y-t.cy)<1e-8,'soft-lock beats every reservoir');
 for(let i=0;i<240;i++)L.step(locked,hs,1/120,v,null,{id:t.id,kind:t.kind,pending:true});
 assert(locked.lock&&!locked.attached,'missing projection retains the lock instead of returning');
 const absent=fresh();for(let i=0;i<600;i++)L.step(absent,hs.map(h=>({...h,layer:'foreign'})),1/120,v);
 assert(Math.hypot(absent.x-from.x,absent.y-from.y)<1e-8&&!absent.attached,'foreign liquid cannot pull free glass');
 const rerouted=fresh();for(let i=0;i<30;i++)L.step(rerouted,hs,1/120,v);
 const remaining=hs.filter(h=>h.id!==expected.id);for(let i=0;i<2400;i++)L.step(rerouted,remaining,1/120,v);
 assert(rerouted.docked&&rerouted.homeId===remaining[0].id,'withdrawn reservoir is replaced by the remaining live one');
 const moving=fresh(),relocated={...expected,cy:v.h-20};L.step(moving,[relocated],1/120,v);
 assert(moving.vy>0,'return uses the reservoir current measured geometry');
 for(let i=0;i<2400;i++)L.step(moving,[relocated],1/120,v);
 assert(moving.docked&&moving.homeId===relocated.id&&moving.y>v.h/2,'the same moved reservoir receives the drop');
 const quiet=fresh();L.step(quiet,hs,1/60,v,null,null,true);
 assert(quiet.docked&&quiet.homeId===expected.id&&quiet.vx===0&&quiet.vy===0,'reduced motion settles directly at the nearest reservoir');
 console.log(JSON.stringify({carrier:[v.w,v.h],nearest_return:expected.id,held_lock_priority:true,physical_contact_only:true}));
}
{
 const v={w:1280,h:800},q=L.create(null,v);q.x=100;q.y=260;
 const wide={id:'wide',kind:'hud',layer:'hud',cx:640,cy:20,hx:640,hy:20},small={id:'small',kind:'hud',layer:'hud',cx:400,cy:260,hx:40,hy:40};
 assert(Math.hypot(q.x-small.cx,q.y-small.cy)<Math.hypot(q.x-wide.cx,q.y-wide.cy));
 L.step(q,[small,wide],1/60,v,null,null,true);assert.equal(q.homeId,'wide','closest boundary wins over closest centre');
}

/* Capillary strain is a viscous shape degree of freedom. Stretch redistributes
 * area instead of adding a capsule/lobe; pressure and pointer use the same axes. */
for(const v of [{w:390,h:844},{w:1280,h:800}]){
 const s=L.create(null,v);s.x=v.w/2;s.y=v.h/2;
 for(let i=0;i<300;i++)L.step(s,[],1/120,v);
 const centre={x:s.x,y:s.y},r=s.radius;
 for(let i=0;i<120;i++)L.step(s,[],1/120,v,{active:true,x:centre.x+60,y:centre.y+50});
 let g=L.geometry(s,null);assert(g.stretch>1.02&&g.stretch<=1.28,'cursor load deforms the flesh');assert(Math.hypot(s.x-centre.x,s.y-centre.y)<1e-8,'cursor does not tow its centre');
 assert(Math.abs(g.hx*g.hy-r*r)<1e-7,'reciprocal axes conserve free-drop area');assert(g.angle>.1,'shape follows the load direction');assert.equal(g.neck,0);assert.equal(g.reachR,0,'no extra mass is painted as a lobe');
 const c=Math.cos(g.angle),sn=Math.sin(g.angle);
 assert(L.contains(s,g.x+c*g.hx*.97,g.y+sn*g.hx*.97));assert(!L.contains(s,g.x-sn*(g.hy+20),g.y+c*(g.hy+20)));
 const strain=s.strain;L.step(s,[],1/120,v);assert(s.strain>0&&Math.abs(s.strain-strain)<.02,'removing the load preserves viscous continuity');
 for(let i=0;i<600;i++){L.step(s,[],1/120,v);g=L.geometry(s,null);assert(Math.abs(g.hx*g.hy-s.radius*s.radius)<1e-7);assert(g.stretch>=1&&g.stretch<=1.28)}
 assert.equal(g.stretch,1,'surface tension restores the circle');
 const h={id:'ordinary',kind:'hud',layer:'hud',cx:v.w/2,cy:32,hx:v.w/2,hy:32,edge:'bottom'},t=L.create(h,v);
 L.grab(t,t.x,t.y,1);
 for(let i=0;i<300;i++){L.move(t,v.w/2,64+t.baseR*1.8,1);L.step(t,h,1/120,v)}
 assert(!t.attached,'a long empty gap cannot keep a ghost spring connection');
 L.step(t,h,1/120,v,null,null,true);assert.equal(L.geometry(t,h).stretch,1,'reduced motion settles deformation too');
}
console.log('area-preserving viscous capillary mode, rotated contact, relaxation and physical separation PASS');

/* A declared membrane crossing releases only unheld world contact. It is not
 * a guessed timeout on a missing projection or a change to local traversal. */
for(const v of [{w:390,h:844},{w:1280,h:800}]){
 const s=L.create(null,v);s.x=v.w*.6;s.y=v.h*.5;
 const body={id:'owned:world',kind:'body',cx:s.x,cy:s.y};L.lockTo(s,body);
 const before={x:s.x,y:s.y,hx:s.hx,hy:s.hy,vx:s.vx,vy:s.vy};
 L.depart(s,{x:v.w*.5,y:v.h*.5},v,.38);
 assert.equal(s.lock,null);assert.deepEqual({x:s.x,y:s.y,hx:s.hx,hy:s.hy,vx:s.vx,vy:s.vy},before,'departure begins from the same physical state');
 let previous=s.x,travel=0;
 for(let i=0;i<46;i++){
  L.step(s,[],1/120,v,null,body);const g=L.geometry(s,null);
  assert.equal(s.lock,null,'a surviving offer does not silently relock a departed body');assert(Number.isFinite(g.x)&&Number.isFinite(g.y));
  assert(g.x-g.hx>=-.01&&g.x+g.hx<=v.w+.01&&g.y-g.hy>=-.01&&g.y+g.hy<=v.h+.01,'outward flesh remains inside its actual viewport');
  assert(Math.abs(s.x-previous)<v.w*.12,'departure has no positional jump');travel+=s.x-previous;previous=s.x;
 }
 assert(travel>v.w*.15,'closing-camera flow must carry the drop outward');assert(!s.departure,'departure ends with its declared closing interval');
 const held=L.create(null,v);L.grab(held,v.w/2,v.h/2,7);L.depart(held,{x:0,y:0},v);assert(held.held&&!held.departure,'owning pointer has priority');
 const field=L.create(null,v);L.lockTo(field,{id:'reading',kind:'field'});L.depart(field,{x:0,y:0},v);assert.equal(field.lock.id,'reading','screen tissue is not world-camera flow');
 const quiet=L.create(null,v);L.lockTo(quiet,body);L.depart(quiet,{x:0,y:0},v);L.step(quiet,[],1/120,v,null,null,true);assert(!quiet.departure&&quiet.vx===0&&quiet.vy===0,'reduced motion settles without flight');
 L.lockTo(s,body);L.depart(s,{x:s.x,y:s.y},v,.04);L.grab(s,s.x,s.y,4);assert(!s.departure,'a new deliberate take cancels departure');
 console.log(JSON.stringify({carrier:[v.w,v.h],membrane_outward_travel:travel,continuous_start:true,held_and_reading_priority:true}));
}
