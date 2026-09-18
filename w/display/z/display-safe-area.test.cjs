'use strict';
const assert=require('assert');
const S=require('./display-safe-area.js');

let s=S.derive({width:1440,height:1000},[
  {id:'header',role:'top',rect:{left:0,top:0,width:1440,height:50}},
  {id:'rail',role:'top',rect:{left:28,top:56,width:800,height:14}},
  {id:'mini',role:'right bottom',rect:{left:1392,top:720,width:48,height:48}},
  {id:'commit',role:'left bottom',rect:{left:28,top:938,width:160,height:44}}
],8);
assert.deepStrictEqual(s.insets,{top:78,right:56,bottom:288,left:196});
assert.strictEqual(s.occupied.length,4);

s=S.derive({width:390,height:844},[
  {id:'header',role:'top',rect:{left:0,top:0,width:390,height:38}},
  {id:'rail',role:'top',rect:{left:18,top:47,width:354,height:12}}
],8);
assert.deepStrictEqual(s.insets,{top:67,right:0,bottom:0,left:0});

s=S.derive({width:800,height:600},[],8);
assert.deepStrictEqual(s.insets,{top:0,right:0,bottom:0,left:0});
console.log('display safe-area contract pass');
