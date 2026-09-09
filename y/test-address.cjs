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

cp.execFileSync('node',[path.join(root,'w','display','navigation-physiology.test.cjs')],{stdio:'pipe'});checks++;

const site=process.env.SITE_DIR?path.resolve(root,process.env.SITE_DIR):path.join(root,'_site');
const html=fs.readFileSync(path.join(site,'index.html'),'utf8');
const match=html.match(/<script id="root-projection" type="application\/json">(.*?)<\/script>/s);ok(match,'embedded main-root projection missing');
const projection=JSON.parse(match[1]);
eq(projection.source.organism,'main-root');
eq(Object.keys(projection.root.children).sort(),['w','x','y','z']);
eq(['w','x','z','y'].map(g=>projection.root.children[g].noun),['Form','Continuity','Care','Inquiry']);
const N=require(path.join(root,'w','display','navigation-physiology.js'));
let structure=N.collectStructure(projection.root);
eq(structure.leaves.map(x=>x.path).sort(),['w','x','y','z']);
ok(structure.leaves.every(x=>x.center.length===3&&x.center.every(Number.isFinite)),'all realized leaf centroids must be finite');

const clone=JSON.parse(JSON.stringify(projection.root));
const atom=noun=>({noun,de:noun,en:noun,gene:'CREATE',one:{de:noun,en:noun},children:{}});
clone.children.w.children={w:atom('ww'),x:atom('wx'),z:atom('wz'),y:atom('wy')};
structure=N.collectStructure(clone);
eq(structure.leaves.map(x=>x.path).sort(),['ww','wx','wy','wz','x','y','z']);
ok(!structure.leaves.some(x=>['xx','yy','zz'].includes(x.path)),'unrealized sibling rank must not be fabricated');

console.log(JSON.stringify({status:'pass',assertions:checks,public_root:'main-root',realized_only:true,inspect_commit:true},null,2));
