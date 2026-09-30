'use strict';
const assert=require('assert');
const L=require('./display-lens.js');

const home={cx:900,cy:500,hx:111,hy:120};
const run=(s,h,sec)=>{for(let t=0;t<sec;t+=1/60)L.step(s,h,1/60);return s};

/* born docked beside the compass, half as wide and as tall as it is */
let s=L.create(home);
const dock=L.dockPoint(home,L.scaleOf(home));
assert.strictEqual(s.docked,true);
assert.strictEqual(s.x,dock.x);assert.strictEqual(s.y,dock.y);
assert.strictEqual(s.hx,home.hx/2);assert.strictEqual(s.hy,home.hy);
assert.ok(dock.x<home.cx-home.hx,'the dock is left of the compass');

/* resting it stays put */
run(s,home,1);
assert.strictEqual(s.x,dock.x);assert.strictEqual(s.docked,true);

/* held: it follows the pointer and turns round */
L.grab(s,dock.x,dock.y,1);
for(let i=1;i<=30;i++){L.move(s,dock.x-i*6,dock.y,1);run(s,home,1/30)}
assert.ok(s.held);assert.ok(s.round>.9,'round while held');
assert.ok(s.x<dock.x-120,'followed the pointer');
assert.strictEqual(s.docked,false);

/* a foreign pointer does not steer it */
const before=s.px;L.move(s,0,0,2);assert.strictEqual(s.px,before);
L.release(s,2);assert.ok(s.held);

/* the neck thins with distance and tears */
const near=L.geometry(Object.assign(L.create(home),{x:dock.x-20}),home);
const far=L.geometry(Object.assign(L.create(home),{x:dock.x-300}),home);
assert.ok(near.neck>0&&near.thin>far.thin);
assert.strictEqual(far.neck,0,'torn past the break distance');

/* released far: it stays where it was put */
L.release(s,1);run(s,home,1.5);
assert.strictEqual(s.held,false);assert.strictEqual(s.docked,false);
const stuck={x:s.x,y:s.y};
assert.ok(Math.hypot(stuck.x-dock.x,stuck.y-dock.y)>L.K.magnet,'beyond the magnet');
run(s,home,1);
assert.ok(Math.abs(s.x-stuck.x)<2,'it does not creep once it has stopped');
assert.ok(s.round<.05,'round again once released');

/* brought inside the magnet's reach and released: it goes home and docks */
s.x=dock.x-80;s.y=dock.y;s.vx=s.vy=0;
run(s,home,1.2);
assert.strictEqual(s.docked,true);assert.ok(Math.hypot(s.x-dock.x,s.y-dock.y)<1);

/* moving fast stretches it along the motion; at rest it does not */
s=L.create(home);L.grab(s,dock.x,dock.y,1);
for(let i=1;i<=12;i++){L.move(s,dock.x-i*40,dock.y,1);run(s,home,1/60)}
assert.ok(s.stretch>.05,'stretched while fast');
L.release(s,1);s.x=dock.x-400;run(s,null,3);
assert.ok(s.stretch<.02,'relaxed at rest');

/* no home (compass closed and away from it): it is a free blob; nothing pulls it, and there is no neck */
s=L.create(home);s.x=500;s.y=300;s.docked=false;
run(s,null,1);assert.strictEqual(Math.round(s.x),500);
assert.strictEqual(L.geometry(s,null).neck,0);

/* it never leaves the screen */
s=L.create(home);L.grab(s,dock.x,dock.y,1);
for(let i=1;i<=40;i++){L.move(s,dock.x-i*60,dock.y-i*30,1);L.step(s,home,1/60,{w:1100,h:700})}
assert.ok(s.x>=s.hx-1&&s.y>=s.hy-1,'stopped against the left/top border');
L.release(s,1);for(let i=0;i<120;i++)L.step(s,home,1/60,{w:1100,h:700});
assert.ok(s.x>=s.hx-1&&s.y>=s.hy-1&&s.x<=1100&&s.y<=700);

/* distances scale with the compass */
assert.ok(L.scaleOf({hy:60})<L.scaleOf({hy:120}));
assert.strictEqual(L.scaleOf(null),1);

/* the physics is finite under a wild step */
s=L.create(home);s.vx=1e4;L.step(s,home,5);assert.ok(Number.isFinite(s.x)&&Number.isFinite(s.stretch));
console.log('display lens physics witness: PASS');
