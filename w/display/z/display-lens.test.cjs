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
assert.ok(s.x<start.x-10,'nearby cursor gathers the mass without pressing');
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
s.x=650;s.y=155;s.vx=s.vy=0;run(s,[map,top],2);
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

/* A narrow pane still has room for a released drop between the reservoirs. */
const smallView={w:360,h:480},smallMap={...map,cx:255,cy:365,hx:90,hy:110},smallTop={...top,cx:180,cy:54,hx:180,hy:54};
s=L.create(smallTop,smallView);L.grab(s,s.x,s.y,1);
for(let i=0;i<120;i++){L.move(s,75,300,1);L.step(s,[smallTop,smallMap],1/60,smallView)}
assert.strictEqual(s.attached,false);
L.release(s,1);
for(let i=0;i<180;i++)L.step(s,[smallTop,smallMap],1/60,smallView);
assert.strictEqual(s.attached,false,'nearby UI does not swallow every released drop');
assert.ok(s.radius>65&&s.hx===s.hy);
console.log('narrow-pane free-drop witness: PASS');
