'use strict';
const assert=require('node:assert/strict'),Q=require('./recursive-fold.js');
const genes=['w','x','z','y'];
assert.deepEqual(Q.GENES,genes);
const key=(i,depth)=>{let path='';for(let j=0;j<depth;j++){path=genes[i%4]+path;i=Math.floor(i/4)}return path};
const sum=rows=>rows.reduce((n,r)=>n+r.count,0);

// An unrelated owner: opaque mineral samples, with no site identity, clock,
// Bait schema or source-population callback in the common carrier.
const ore=Q.create(),samples=new Map();let root=ore.empty;
for(let i=0;i<1024;i++){
  const path=key(i,5),value=Object.freeze({pigment:'mineral '+i,temperature:i%31});
  samples.set(path,value);root=ore.replace(root,path,ore.leaf(value)).root;
}
assert.equal(root.count,samples.size);
for(const [path,value] of samples)assert.strictEqual(ore.at(root,path).value,value);
const projection=ore.view(root,{project:r=>({noun:r.value?.pigment||String(r.count)+' samples'})});
assert.equal(projection.visited,21);assert.equal(projection.terminals.length,16);
assert.equal(sum(projection.terminals),samples.size);
assert(projection.terminals.every(r=>r.fold&&r.value===null&&r.path.length===2));
assert(projection.root.children.w.children.x.noun.endsWith(' samples'));
const closed=ore.view(root,{ranks:0});assert.equal(closed.visited,1);assert.equal(closed.terminals[0].count,1024);
const oneRank=ore.view(root,{ranks:1});assert.equal(oneRank.visited,5);assert.equal(oneRank.terminals.length,4);
const blank=ore.view(ore.empty);assert.equal(blank.visited,5);assert.equal(blank.terminals.length,0);
assert.deepEqual(Object.keys(blank.root.children),genes,'blank overview retains directions without inventing population');
assert(Object.isFrozen(root)&&Object.isFrozen(root.children));

// Replacement renews only its spine. The source oracle is an ordinary Map;
// retained older roots keep the exact prior values and sibling identities.
const old=root,oldW=root.children.w,replaced=samples.get('yyyyy');
const newer=Object.freeze({pigment:'new mineral',temperature:99});
let change=ore.replace(root,'yyyyy',ore.leaf(newer));root=change.root;samples.set('yyyyy',newer);
assert.equal(change.edits,5);assert.strictEqual(root.children.w,oldW);
assert.strictEqual(ore.at(old,'yyyyy').value,replaced);
assert.strictEqual(ore.at(root,'yyyyy').value,newer);
assert.deepEqual(ore.replace(root,'yyyyy',ore.at(root,'yyyyy')),{root,edits:0});
change=ore.replace(root,'yyyyy');root=change.root;samples.delete('yyyyy');
assert.equal(root.count,samples.size);assert.equal(ore.at(root,'yyyyy').count,0);
root=ore.replace(root,'yyyyy',ore.leaf(replaced)).root;samples.set('yyyyy',replaced);
assert.equal(root.count,old.count);
for(const [path,value] of samples)assert.strictEqual(ore.at(root,path).value,value);

// Invalid acquisition and mixed generations fail without changing a good root.
const foreign=Q.create();
for(const count of [0,-1,.1,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,0n,-1n,'4'])assert.throws(()=>ore.leaf({},count),/exact positive/);
assert.throws(()=>ore.replace(root,'bad',ore.leaf({})),/invalid/);
assert.throws(()=>ore.view(root,{container:'bad'}),/invalid/);
assert.throws(()=>ore.view(root,{ranks:-1}),/invalid/);
assert.throws(()=>ore.view(root,{project:()=>null}),/projection/);
assert.throws(()=>ore.replace(root,'w',foreign.leaf({})),/foreign/);
assert.throws(()=>foreign.view(root),/foreign/);
assert.equal(root.count,samples.size);
let atom=ore.replace(ore.empty,'x',ore.leaf({pigment:'one'})).root;
assert.throws(()=>ore.replace(atom,'xy',ore.leaf({})),/occupied leaf/);
assert.equal(ore.at(atom,'xy'),null,'an inhabited self-child is not silently inferred');
atom=ore.replace(atom,'x').root;assert.strictEqual(atom,ore.empty);
const acquired=Q.create(),fresh=acquired.replace(acquired.empty,'x',acquired.leaf({pigment:'fresh'})).root;
assert.equal(acquired.at(fresh,'x').value.pigment,'fresh');
assert.throws(()=>ore.at(fresh,'x'),/foreign/);

// Exact source summaries can exceed Number precision without rounding or a
// configured population ceiling. No hidden member list is needed to fold them.
const mass=Q.create(),huge=1n<<512n;
let massive=mass.replace(mass.empty,'www',mass.leaf({stratum:'old'},huge)).root;
massive=mass.replace(massive,'x',mass.leaf({stratum:'new'},7)).root;
assert.equal(massive.count,huge+7n);
const massView=mass.view(massive);assert.equal(massView.terminals.reduce((n,r)=>n+BigInt(r.count),0n),huge+7n);
let precise=mass.replace(mass.empty,'w',mass.leaf({},Number.MAX_SAFE_INTEGER)).root;
assert.throws(()=>mass.replace(precise,'x',mass.leaf({})),/BigInt precision/);
assert.equal(precise.count,Number.MAX_SAFE_INTEGER);

// Exponential hidden populations leave the same overview and only an enclosing
// spine on Descent. A projector cannot enumerate a closed node's source leaves.
const scaling=[];
for(const depth of [4,6,8]){
  const tissue=Q.create();let tree=tissue.empty;
  const source={get hidden(){throw new Error('closed population was inspected')}};
  for(let i=0;i<4**depth;i++)tree=tissue.replace(tree,key(i,depth),tissue.leaf(source)).root;
  const overview=tissue.view(tree,{project:r=>({count:r.count})});
  assert.equal(overview.visited,21);assert.equal(overview.terminals.length,16);
  assert.equal(sum(overview.terminals),4**depth);
  const container='w'.repeat(depth-2),detail=tissue.view(tree,{container,project:r=>({count:r.count})});
  assert.equal(detail.visited,4*container.length+21);assert.equal(detail.terminals.length,16);
  assert.equal(sum(detail.terminals),16);
  const surroundings=tissue.view(tree,{container,context:true,project:r=>({count:r.count})});
  assert.equal(surroundings.visited,detail.visited);assert.equal(surroundings.terminals.length,16+3*container.length);assert.equal(sum(surroundings.terminals),4**depth);
  const mutation=tissue.replace(tree,'y'.repeat(depth),tissue.leaf({changed:true}));
  assert.equal(mutation.edits,depth);assert.strictEqual(mutation.root.children.w,tree.children.w);
  scaling.push({population:4**depth,overview:overview.visited,descent:detail.visited,mutation:mutation.edits});
}

// Deep iteration covers mutation, lookup and projection, not just a recursive
// fixture builder. Self-child and sibling remain different raw genealogies.
const deep=Q.create(),prefix='w'.repeat(12000);let tree=deep.empty;
tree=deep.replace(tree,prefix+'w',deep.leaf({name:'self'})).root;
tree=deep.replace(tree,prefix+'x',deep.leaf({name:'sibling'})).root;
assert.equal(deep.at(tree,prefix+'w').value.name,'self');
const view=deep.view(tree,{container:prefix});
assert.equal(view.visited,4*prefix.length+5);assert.equal(view.terminals.length,2);
assert.equal(sum(view.terminals),2);
assert.equal(deep.replace(tree,prefix+'x').root.count,1);
console.log('PASS · independent opaque owner, exact source, shared siblings, generation refusal, BigInt mass and 12001-rank iteration');
console.log(JSON.stringify({sharedFoldWork:scaling}));
