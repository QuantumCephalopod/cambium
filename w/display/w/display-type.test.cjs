'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const T=require('./display-type.js');
assert.strictEqual(T.IDENTITY,'@sss/spritesheet');
assert.strictEqual(T.rankFactor(-4),.25);
assert.strictEqual(T.rankFactor(-2),.5);
assert.strictEqual(T.rankFactor(0),1);
assert.strictEqual(T.rankFactor(2),2);
assert.strictEqual(T.rankFactor(4),4);
for(let r=-8;r<=8;r++)assert.ok(Math.abs(T.rankFactor(r+2)/T.rankFactor(r)-2)<1e-12,'two half-octaves must recover one octave');
const mock={documentElement:{},defaultView:{getComputedStyle:()=>({fontSize:'20px'})}};
assert.strictEqual(T.rootRemPx(mock),20,'browser/user root rem must remain the live root');
assert.ok(Math.abs(T.rankPx(-1,mock)-20/Math.SQRT2)<1e-12);
const css=fs.readFileSync(path.join(__dirname,'root-view.css'),'utf8');
for(let r=-4;r<=4;r++){
  const m=css.match(new RegExp(T.rankVar(r)+':([\\d.]+)rem'));
  assert.ok(m,`missing CSS rank ${r}`);
  assert.ok(Math.abs(Number(m[1])-T.rankFactor(r))<1e-12,`CSS rank ${r} diverges from power-of-two lattice`);
}
const htmlBody=(css.match(/html,body\{([^}]*)\}/)||[])[1]||'';
assert.ok(!/font-size\s*:/.test(htmlBody),'Display must not force browser/user root font size');
const displayRoot=path.join(__dirname,'..');
const rankedCss=[
  'w/root-view.css','w/interlocutors.css','z/site-runtime.css','z/navigation-aperture.css',
  'y/philosophy/style.css','y/yw/crawlerbait/z/style.css','y/yx/schattenseiten/style.css',
  'y/yy/papers/style.css','y/yy/papers/sierpinski.css','y/yz/datenschutz/style.css','y/yxz/impressum/style.css',
  'y/yz/datenschutz/public/privacy/index.html','y/yxz/impressum/public/impressum/index.html',
  'y/yw/crawlerbait/y/tide.py'
];
const arbitrary=/font(?:-size)?\s*:[^;}]*?(?:\d+(?:\.\d+)?(?:px|rem)|clamp\()/i;
for(const rel of rankedCss){
  const source=fs.readFileSync(path.join(displayRoot,rel),'utf8');
  assert.ok(!arbitrary.test(source),rel+' contains a font size outside the shared rank lattice');
}
for(const rel of ['z/world-view.js','y/yy/papers/sierpinski.js']){
  const source=fs.readFileSync(path.join(displayRoot,rel),'utf8');
  assert.ok(!/["'`][^"'\n`]*\d+(?:\.\d+)?px\b/.test(source),rel+' contains a literal Canvas/Pretext pixel font');
}
assert.strictEqual(T.fold('Du gefällst mir. Mir gefällst du.'),'Du gefaellst mir. Mir gefaellst du.');
assert.strictEqual(T.fold('ÄÖÜ äöü Grüße GROẞ'),'AEOEUE aeoeue Gruesse GROSS');
assert.strictEqual(T.fold('79S · 66H'),'79S · 66H','digits and marks are left for per-glyph fallback');
assert.strictEqual(T.fold(42),42);
/* text nodes fold in place; an opted-out subtree keeps its spelling */
const kept={tagName:'DIV',closest:s=>s==='[data-type-fold="off"]'?kept:null};
const plain={tagName:'P',closest:()=>null};
const a={nodeType:3,data:'Schöne Grüße',parentElement:plain},b={nodeType:3,data:'Schöne Grüße',parentElement:kept};
T.foldNode({nodeType:1,tagName:'MAIN',closest:()=>null,childNodes:[a,b]});
assert.strictEqual(a.data,'Schoene Gruesse');
assert.strictEqual(b.data,'Schöne Grüße');
console.log('display type fold witness: PASS');
