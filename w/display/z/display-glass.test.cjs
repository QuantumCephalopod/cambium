'use strict';
const assert=require('assert');
const G=require('./display-glass.js');

/* derive: centre + half-size in buffer pixels, origin bottom-left */
let g=G.derive([{id:'a',rect:{left:20,top:10,width:100,height:40}}],{left:0,top:0,width:1000,height:600},{width:1500,height:900});
assert.strictEqual(g.count,1);
assert.strictEqual(g.scale,1.5);
assert.deepStrictEqual([...g.data.slice(0,4)],[105,855,75,30]);
assert.strictEqual(g.data.length,G.MAX*4);

/* a canvas that does not start at the viewport origin: rects are taken relative to it */
g=G.derive([{rect:{left:600,top:300,width:200,height:100}}],{left:500,top:200,width:500,height:400},{width:500,height:400});
assert.deepStrictEqual([...g.data.slice(0,4)],[200,400-(350-200),100,50]);

/* a surface that does not touch the canvas is not glass for it */
g=G.derive([{rect:{left:2000,top:10,width:100,height:40}},{rect:{left:-300,top:10,width:100,height:40}}],{left:0,top:0,width:1000,height:600},{width:1000,height:600});
assert.strictEqual(g.count,0);

/* too small to be a surface */
g=G.derive([{rect:{left:10,top:10,width:1,height:40}}],{left:0,top:0,width:1000,height:600},{width:1000,height:600});
assert.strictEqual(g.count,0);

/* one slab, one lens: a surface wholly inside a larger one is not glass of its own */
g=G.derive([
  {id:'pocket',rect:{left:800,top:400,width:222,height:240}},
  {id:'trigger',rect:{left:982,top:600,width:40,height:40}}
],{left:0,top:0,width:1100,height:700},{width:1100,height:700});
assert.strictEqual(g.count,1);
assert.strictEqual(g.data[2],111);

/* identical rectangles collapse to one, whatever the order */
g=G.derive([{rect:{left:10,top:10,width:100,height:40}},{rect:{left:10,top:10,width:100,height:40}}],{left:0,top:0,width:400,height:300},{width:400,height:300});
assert.strictEqual(g.count,1);

/* at most MAX surfaces, in document order */
const many=[];for(let i=0;i<G.MAX+4;i++)many.push({rect:{left:(i+1)*50,top:10,width:40,height:20}});
g=G.derive(many,{left:0,top:0,width:2000,height:600},{width:2000,height:600});
assert.strictEqual(g.count,G.MAX);
assert.strictEqual(g.data[0],70);

/* a surface flush with the canvas edge has no bevel there: that edge is pushed off-canvas */
g=G.derive([{rect:{left:0,top:0,width:1000,height:50}}],{left:0,top:0,width:1000,height:600},{width:1000,height:600});
assert.deepStrictEqual([...g.data.slice(0,4)],[500,623,596,73]);
/* and a free-floating one is untouched */
g=G.derive([{rect:{left:100,top:100,width:200,height:100}}],{left:0,top:0,width:1000,height:600},{width:1000,height:600});
assert.deepStrictEqual([...g.data.slice(0,4)],[200,450,100,50]);

/* degenerate inputs are refused quietly */
assert.strictEqual(G.derive(null,{left:0,top:0,width:0,height:0},{width:0,height:0}).count,0);
assert.strictEqual(G.derive([{rect:{left:0,top:0,width:10,height:10}}],{left:0,top:0,width:100,height:100},{width:0,height:0}).count,0);

/* collect: occupied surfaces are glass unless they opt out; anything may opt in; hidden ones are not */
const el=(attrs,rect,style={})=>({id:attrs.id||'',getAttribute:k=>attrs[k]??null,getBoundingClientRect:()=>({left:0,top:0,width:100,height:30,...rect}),style});
const all=[
  el({id:'header','data-display-occupancy':'top'}),
  el({id:'optout','data-display-occupancy':'top','data-display-glass':'off'}),
  el({id:'optin','data-display-glass':'on'}),
  el({id:'hidden','data-display-occupancy':'right'},{},{opacity:'0'}),
  el({id:'thin','data-display-occupancy':'right'},{width:1}),
];
const doc={querySelectorAll:()=>all};
const style=e=>({display:'block',visibility:'visible',opacity:e.style.opacity??'1'});
const got=G.collect(doc,style).map(e=>e.id);
assert.deepStrictEqual(got,['header','optin']);

/* the parameters are frozen first drafts, in CSS pixels and radians */
assert.ok(Object.isFrozen(G.PARAMS));
for(const k of ['radius','bevel','bevelMax','refract','theta','aberr','mag','spec','fres','shadow','shadowK'])assert.ok(Number.isFinite(G.PARAMS[k]),k);
assert.ok(G.PARAMS.dot>0&&G.PARAMS.halftone>=0&&G.PARAMS.halftone<=1);
assert.strictEqual(G.PARAMS.tint.length,4);assert.ok(Object.isFrozen(G.PARAMS.tint));
console.log('display glass contract witness: PASS');

/* Top overfill moves the free edge below the type and becomes one same-layer reservoir. */
const topEntries=[
  el({id:'top-a','data-display-occupancy':'top','data-display-glass-overfill':'42'},{left:0,top:0,width:500,height:60}),
  el({id:'top-b','data-display-occupancy':'top','data-display-glass-overfill':'42'},{left:0,top:60,width:500,height:20}),
];
const topGlass=G.collect({querySelectorAll:()=>topEntries},style);
assert.strictEqual(topGlass.length,1);
assert.strictEqual(topGlass[0].rect.bottom,122);
assert.deepStrictEqual(topGlass[0].ids,['top-a','top-b']);
const otherLayer=el({id:'other-layer','data-display-occupancy':'top','data-display-glass-overfill':'42','data-display-glass-layer':'other'},{width:500,height:20});
assert.strictEqual(G.collect({querySelectorAll:()=>[...topEntries,otherLayer]},style).length,2);
const anonymous=[el({'data-display-glass':'on'}),el({'data-display-glass':'on'})];
const first=G.collect({querySelectorAll:()=>anonymous},style).map(e=>e.id);
assert.notStrictEqual(first[0],first[1]);
assert.deepStrictEqual(G.collect({querySelectorAll:()=>anonymous},style).map(e=>e.id),first);
console.log('glass top overfill and stable UI/layer identity witness: PASS');
