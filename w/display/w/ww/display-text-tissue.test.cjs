'use strict';
const assert=require('assert');
const T=require('./display-text-tissue.js');
const press=[{x:100,y:100,r:50}];
assert.strictEqual(T.pressAt(100,100,press),1,'the centre of a press deflates fully');
assert.strictEqual(T.pressAt(151,100,press),0,'outside a press nothing changes');
assert.ok(T.pressAt(125,100,press)>0&&T.pressAt(125,100,press)<1);
assert.strictEqual(T.fatAfter(1,1),0,'a pressed letter is its bare glyph');
assert.strictEqual(T.fatAfter(.8,0),.8,'an unpressed letter keeps its own fat');
assert.strictEqual(T.pressAt(0,0,[]),0,'without a press nothing deflates');
assert.strictEqual(T.create(null),null,'no canvas, no engine');

// Exercise the actual tissue draw in both modes: its source shadow must enter
// the same global inversion as the glyph, rather than being pre-inverted.
{
 const previousDocument=global.document,previousType=global.SSSDisplayType,colors=[];
 const gl=new Proxy({
  getShaderParameter:()=>true,getProgramParameter:()=>true,getExtension:()=>null,
  getUniformLocation:(_program,name)=>name,
  uniform3fv:(name,value)=>{if(name==='shadowInk')colors.push([...value])}
 },{get:(target,key)=>key in target?target[key]:typeof key==='string'&&key.startsWith('create')?()=>({}):typeof key==='string'&&/^[A-Z0-9_]+$/.test(key)?1:()=>{}});
 const cx={measureText:()=>({width:16}),clearRect(){},fillText(){},getImageData:(_x,_y,w,h)=>({data:new Uint8ClampedArray(w*h*4)})};
 global.document={documentElement:{dataset:{inverse:'false'}},createElement:()=>({getContext:()=>cx})};
 global.SSSDisplayType=require('../wx/display-type.js');
 try{
  const engine=T.create({getContext:()=>gl});
  const letters=[{ch:'A',x:4,y:4,size:16,fat:.2,weight:1}];
  engine.draw(letters,{width:100,height:100});
  global.document.documentElement.dataset.inverse='true';
  engine.draw(letters,{width:100,height:100});
  assert.deepStrictEqual(colors,[[0,0,0],[0,0,0]]);
 }finally{global.document=previousDocument;global.SSSDisplayType=previousType}
}
console.log('text tissue press/fat witness: PASS');
