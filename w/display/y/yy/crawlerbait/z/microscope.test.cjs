'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const navigation = process.argv[2];
assert(navigation, 'pass the shared navigation module');
const renderer = process.argv[3] || path.join(__dirname, 'render.js');
const source = fs.readFileSync(renderer, 'utf8');
const registration = 'modules.set(id,Object.freeze(';
assert.equal(source.split(registration).length, 2, 'renderer registration hook');
function openRenderer() {
  const scope = {SSSDisplayNavigation: require(path.resolve(navigation)), performance};
  const expose = 'globalThis.probe={SIM,CAM,body,step,resetTo,opticalMoment:typeof opticalMoment==="function"&&opticalMoment};';
  vm.runInNewContext(source.replace(registration, expose + registration), scope);
  return {...scope.probe, law: scope.SSSInterlocutorModules.get('organism:crawlerbait')._law};
}

// Two actual walking sessions contact the same place. Only the camera differs.
const iso = seconds => new Date(Date.UTC(2026, 0, 1) + seconds * 1000).toISOString();
const routes = ['ww','wx'].map((address,i) => ({path:'/place-'+i,address,first_seen:iso(0)}));
const crawlers = ['a','b'].map((id,i) => ({id,genome:(i?'ab12':'cd34').repeat(16)}));
const encounters = crawlers.flatMap(({id}) => routes.map(({path,address},i) =>
  ({crawler:id,path,bait_address:address,method:'GET',status:200,t:iso(i*15)})));
const fixture = {routes,crawlers,encounters,raw_capture_end:iso(120)};
function walk(scales) {
  const {SIM,step,resetTo,law} = openRenderer();
  SIM.life = law.buildLife(fixture);
  resetTo(16);
  SIM.paceCur = SIM.paceLog = 0;
  const frames = [];
  let coarse;
  for (const [i,scale] of scales.entries()) {
    SIM.playing = i < 4;
    step(.03, 100 + 30*i, (_,r) => r*scale);
    const actors = [...SIM.alive].filter(o => o.fade > 0);
    assert.equal(actors.length, 2);
    // Optical gates can change across cameras. World walks/contacts cannot.
    frames.push(actors.map(o => [o.S.b.id,o.dist,Array.from(o.p),o.trail.map(p=>Array.from(p)),Array.from(o.head),o.hot]));
    if (!SIM.playing && scale === 1) {
      coarse = {count:SIM.beingSplats,
        expected:actors.map(o => Array.from(o.p,Math.fround)),
        printed:actors.map((o,i) => Array.from(SIM.sPos.subarray(i*7,i*7+3)))};
    }
  }
  // Objects originate from two independent VM realms.
  return JSON.parse(JSON.stringify({frames,coarse}));
}
const fixed = walk([1e6,1e6,1e6,1e6,1e6,1e6]);
const zoomed = walk([1,1e6,1,1e6,1,1e6]);
assert.deepEqual(zoomed.frames,fixed.frames,'zoom moved a walker or changed its trail');
assert.deepEqual(zoomed.frames[4],zoomed.frames[5],'paused zoom changed the physical encounter');

assert.equal(zoomed.coarse.count,2);
assert.deepEqual(zoomed.coarse.printed,zoomed.coarse.expected,'unresolved Being moved to a shared surrogate position');

// Compare integrated density and both coherent components against the actual
// authored kernels. Radius already includes the material's support multiplier.
const {SIM,CAM,body,opticalMoment} = openRenderer();
const o = {S:{g:Array.from({length:32},(_,i)=>(57*i+31)%256)},p:[.1,.2,.3],
  radius:.017,head:[1,0,0],hot:.72,fine:1,facts:{days:4,baits:7}};
for (const kind of ['w','x','y','z']) {
  o.facts.k = kind;
  for (const time of [0,1700]) for (const followed of [false,true]) {
    CAM.o = followed ? o : null;
    o.trail = Array.from({length:followed?34:0},(_,i)=>[i*.001,0,0]);
    for (const fade of [.001,.001001,.001/.85,.003,.57,1]) {
      o.fade = fade;
      SIM.ns = 0;
      body(o,time,()=>Infinity);
      let mass=0,re=0,im=0;
      for (let i=0;i<7*SIM.ns;i+=7) {
        const a=SIM.sPos, m=a[i+3]**2*a[i+4];
        mass+=m;
        re+=m*a[i+6]*Math.cos(a[i+5]);
        im+=m*a[i+6]*Math.sin(a[i+5]);
      }
      const expected=[mass,re,im], actual=opticalMoment(o,time,followed);
      [actual.mass,actual.re,actual.im].forEach((v,i) => {
        const tolerance=mass*2e-6;
        assert(Math.abs(v-expected[i])<=tolerance,'optical moment drift: '+[kind,time,fade,followed,i]);
      });
    }
  }
}
console.log('PASS · moving and paused camera-independent transport; hidden mass and complex field match authored anatomy for all four kinds');
