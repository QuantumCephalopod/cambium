'use strict';
const assert=require('assert');
const T=require('./display-type.js');
assert.strictEqual(T.IDENTITY,'@sss/spritesheet');
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
