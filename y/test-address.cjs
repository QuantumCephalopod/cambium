/* deterministic exact tests; run with node y/test-address.cjs. */
'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const root=path.basename(__dirname)==='y'?path.dirname(__dirname):__dirname;
const split=fs.existsSync(path.join(root,'z'));
const A=require(path.join(root,split?'z':'','address.js'));
const N=require(path.join(root,split?'z':'','navigation.js'));
let checks=0;function ok(value,msg){checks++;assert.ok(value,msg);}function eq(a,b,msg){checks++;assert.deepEqual(a,b,msg);}
for(const [a,b] of [['w','wwww'],['wx','xw'],['wxxx','xwwww'],['wxz','wzx'],['wxzzzz','wzxxxx']]){eq(A.key(a),A.key(b));eq(A.exactKey(a),A.exactKey(b));}
for(const [a,b] of [['wxz','xwz'],['wxzy','yzwx'],['wwx','wxx'],['wxzy','wxzz']])ok(!A.same(a,b),'non-terminal order must survive');
for(const p of [' a','wx.','a','<script>','w/x',undefined,12])assert.throws(()=>A.validate(p));checks+=7;
eq(A.display('wxz',true),'a.b.c');eq(A.fromDisplay(' A.b.C ',true),'wxz');eq(A.witnesses('wxzy'),['wxzy','wxyz']);
assert.throws(()=>A.exact(''));checks++;
let words=[''],count=0,geom=new Map(),keys=new Map(),level5;
for(let depth=1;depth<=7;depth++){
 words=words.flatMap(p=>A.GENES.map(g=>p+g));
 const level=new Map();
 for(const p of words){const k=A.key(p),e=A.exactKey(p);if(keys.has(k))eq(keys.get(k),e);if(geom.has(e))eq(geom.get(e),k);keys.set(k,e);geom.set(e,k);count++;level.set(e,(level.get(e)||0)+1);}
 if(depth===6){const counts=[...level.values()];level5={loci:level.size,one:counts.filter(v=>v===1).length,two:counts.filter(v=>v===2).length};}
}
eq(count,21844);eq(keys.size,8194);eq(level5,{loci:2050,one:4,two:2046});
const deep='wxzy'.repeat(1024),p=deep+'wx',q=deep+'xw';eq(A.key(p),A.key(q));eq(A.exactKey(p),A.exactKey(q));
const relative=A.relative(deep+'w',deep+'x',deep.length);eq(relative,[1,-1,0,0]);
eq(A.key('wxzy'.repeat(3000)).length>12000,true,'symbolic algebra has no 4k depth limit');
const specimen=JSON.parse(fs.readFileSync(path.join(root,'y/specimen.json'))).index;
const registry=N.registry(specimen);eq([...registry.nodes.keys()].slice(0,5),['','w','ww','wx','wxw']);
const state=N.resolve('site','wx',specimen),trails=N.trails(state,specimen);
eq(trails.map(t=>t.steps.map(s=>s.path)),[['w','wx'],['x','xw']]);
eq(trails.map(t=>t.steps.map(s=>s.label)),[['expression','representation'],['continuity','representation']]);
eq(trails.flatMap(t=>t.steps).filter(s=>s.current).map(s=>s.path),['wx']);
eq(N.resolve('site','xw',specimen).locus,state.locus);
eq(N.trails(N.resolve('site','wxz',specimen),specimen).map(t=>t.steps.map(s=>s.label)),[['expression','representation','comparison'],['expression','legibility','comparison']]);
eq(N.trails(N.resolve('site','wzx',specimen),specimen)[1].steps[2].label,'comparison');
eq(N.namePath('wzx',specimen),'cambium · expression · legibility · comparison');
eq(N.parse('#/w.x').path,'wx');eq(N.parse('#/site/w.x.x.x').path,'wxxx');eq(N.url('site','wz'),'#/w.z');
for(const h of ['#/site/wx<script>','#/study/w.x','#/../','#/w..x','#/else/w','#/'+deep+'w']){assert.throws(()=>N.parse(h));checks++;}
assert.throws(()=>N.resolve('study','wx',specimen));checks++;
eq(N.parse('#/w.w').path,'ww');eq(N.resolve('site','ww',specimen).path,'ww');eq(N.resolve('site','ww',specimen).locus,N.resolve('site','w',specimen).locus);eq(N.resolve('site','ww',specimen).aliases,['ww']);
// Production navigation consumes the browser projection derived by y/build.py,
// never canonical INDEX.yaml directly.
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const match=html.match(/<script id="cambium-data" type="application\/json">(.*?)<\/script>/s);ok(match,'embedded runtime projection missing');
const index=JSON.parse(match[1]).index;N.registry(index);checks++;
assert.throws(()=>N.resolve('site','wx',index));checks++;
eq(N.resolve('site','w',index).aliases,['w']);assert.throws(()=>N.resolve('site','wwww',index));checks++;
const one=JSON.parse(JSON.stringify(specimen));for(const g of A.GENES)delete one.x[g];eq(N.resolve('site','wx',one).aliases,['wx']);
const unnamed=JSON.parse(JSON.stringify(index));unnamed.w.name='';assert.throws(()=>N.registry(unnamed));checks++;
const unwhole=JSON.parse(JSON.stringify(index));unwhole.z.whole='';assert.throws(()=>N.registry(unwhole));checks++;
const partial=JSON.parse(JSON.stringify(index));partial.w.w={name:'unearned',whole:'partial'};assert.throws(()=>N.registry(partial));checks++;
const R=require(path.join(root,'w/view.js'));
const near=(a,b,eps=1e-10)=>ok(Math.abs(a-b)<eps);
let q0=R.initial(),q1=R.multiply(R.axisQuaternion([1,0,0],.6),q0);
ok(q0.some((v,i)=>Math.abs(v-q1[i])>.01),'pitch must change the camera');
near(Math.hypot(...R.rotateVector(q1,[1,2,3])),Math.sqrt(14));
near(Math.hypot(...R.ball(.2,.3)),1);near(Math.hypot(...R.ball(3,4)),1);
for(const [a,b] of [[[1,0,0],[-1,0,0]],[[0,0,1],[0,1,0]],[[0,1,0],[1,0,0]]]){const q=R.between(a,b),v=R.rotateVector(q,a);v.forEach((n,i)=>near(n,b[i]));}
let camera=q0;for(let i=0;i<2000;i++)camera=R.normalize(R.multiply(R.axisQuaternion([[1,0,0],[0,1,0],[0,0,1]][i%3],.02),camera));
near(Math.hypot(...camera),1);near(Math.hypot(...R.rotateVector(camera,[1,0,0])),1);eq(A.key('wx'),state.locus,'camera operations must not mutate address identity');
const result={status:'pass',assertions:checks,enumerated_words:count,unique_loci:keys.size,depth_five:level5,deep_exact_relative_prefix_length:deep.length,unbounded_symbolic_test_length:12000,named_prefixes:'pass',raw_self_witnesses:'pass',quaternion_camera:'pass',production_projection:'pass'};
console.log(JSON.stringify(result,null,2));
