/* Exact address + public realized-geometry regression witness. */
'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),cp=require('node:child_process');
const root=path.basename(__dirname)==='y'?path.dirname(__dirname):__dirname;
const A=require(path.join(root,'z','address.js'));
let checks=0;const ok=(v,m)=>{checks++;assert.ok(v,m)},eq=(a,b,m)=>{checks++;assert.deepEqual(a,b,m)};

for(const [a,b] of [['w','wwww'],['wx','xw'],['wxxx','xwwww'],['wxz','wzx'],['wxzzzz','wzxxxx']]){eq(A.key(a),A.key(b));eq(A.exactKey(a),A.exactKey(b));}
for(const [a,b] of [['wxz','xwz'],['wxzy','yzwx'],['wwx','wxx'],['wxzy','wxzz']])ok(!A.same(a,b),'non-terminal order must survive');
for(const p of [' a','wx.','a','<script>','w/x',undefined,12]){assert.throws(()=>A.validate(p));checks++;}
const deep='wxzy'.repeat(1024);eq(A.key(deep+'wx'),A.key(deep+'xw'));eq(A.relative(deep+'w',deep+'x',deep.length),[1,-1,0,0]);

cp.execFileSync('node',[path.join(root,'w','display','z','navigation-physiology.test.cjs')],{stdio:'pipe'});checks++;
cp.execFileSync('node',[path.join(root,'w','display','x','site-holon.test.cjs')],{stdio:'pipe'});checks++;

const site=process.env.SITE_DIR?path.resolve(root,process.env.SITE_DIR):path.join(root,'_site');
const html=fs.readFileSync(path.join(site,'index.html'),'utf8');
const projMatch=html.match(/<script id="site-projections" type="application\/json">(.*?)<\/script>/s);ok(projMatch,'embedded site projection map missing');
const projections=JSON.parse(projMatch[1]);
const regMatch=html.match(/<script id="site-registry" type="application\/json">(.*?)<\/script>/s);ok(regMatch,'embedded tree-derived site registry missing');
const registry=JSON.parse(regMatch[1]);eq(registry.source,'w/display/y tree');
const identities=registry.mounts.map(m=>m.interlocutor),addresses=registry.mounts.map(m=>m.address);
eq(new Set(identities).size,identities.length,'one mount per identity');
eq(new Set(addresses).size,addresses.length,'one identity per raw address');
eq(addresses.filter(a=>a==='').length,1,'one admitted overview');
for(const m of registry.mounts){A.validate(m.address);eq(m.scope,'main');ok(projections[m.interlocutor],'mounted owner projection missing');}
eq(new Set(Object.keys(projections)),new Set(identities),'projection map follows current mounts');
const N=require(path.join(root,'w','display','z','navigation-physiology.js'));
for(const projection of Object.values(projections))if(projection.root){
  const realized=N.collectStructure(projection.root);
  ok(realized.leaves.every(x=>x.center.length===3&&x.center.every(Number.isFinite)),'all realized leaf centroids must be finite');
}
// Geometry law is independent of the source semantics or current overview owner.
const atom=noun=>({noun,de:noun,en:noun,gene:'CREATE',one:{de:noun,en:noun},children:{}});
const clone={...atom('fixture'),children:Object.fromEntries(['w','x','z','y'].map(g=>[g,atom(g)]))};
let structure=N.collectStructure(clone);
eq(structure.leaves.map(x=>x.path).sort(),['w','x','y','z']);
clone.children.w.children={w:atom('ww'),x:atom('wx'),z:atom('wz'),y:atom('wy')};
structure=N.collectStructure(clone);
eq(structure.leaves.map(x=>x.path).sort(),['ww','wx','wy','wz','x','y','z']);
ok(!structure.leaves.some(x=>['xx','yy','zz'].includes(x.path)),'unrealized sibling rank must not be fabricated');

console.log(JSON.stringify({status:'pass',assertions:checks,public_sites:identities.length,tree_registry:true,realized_only:true,site_holon:true},null,2));
