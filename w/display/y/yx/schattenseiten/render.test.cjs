'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'render.js'),'utf8');
function node(tag){return {tag,className:'',children:[],append(...children){this.children.push(...children)},replaceChildren(...children){this.children=children},addEventListener(){}}}
function fixture(variants){
  const requests=[],modules=new Map();
  const ctx={console,Map,Set,Math,Object,Array,Float32Array,setTimeout:()=>0,clearTimeout(){},addEventListener(){},document:{createElement:node},SSSInterlocutorModules:modules,SSSWorldView:{language:'en'},createImageBitmap(){},fetch(url){requests.push(url);return new Promise(()=>{})}};
  vm.createContext(ctx);vm.runInContext(source,ctx,{filename:'schattenseiten/render.js'});
  const projection={fat:'https://fat.invalid/x/organ/',works:[{id:'one',row:2,rank:2,source:'cluster 1',still:'still/one.webp',cluster_positive:'cluster_positive/one.webp',cluster_negative:'cluster_negative/one.webp',animation:'animation/one.webp'}],ranks:[],words:[],media_variants:variants};
  const module=modules.get('organism:schattenseiten');module.fieldProjection(projection);
  const noOp=()=>{};const gl=new Proxy({createProgram:()=>({}),createShader:()=>({}),createVertexArray:()=>({}),createTexture:()=>({}),getShaderParameter:()=>true,getUniformLocation:(_,name)=>name},{get(target,key){if(key in target)return target[key];return /^[A-Z_0-9]+$/.test(key)?key:noOp}});
  module.shader.afterDraw({gl,proj:new Float32Array(16),view:new Float32Array(16),model:new Float32Array(16),ms:1000});
  const host=node('host'),content=node('content');module.render({host,content,projection});
  module.activateFieldPoint({point:{work:projection.works[0]}});
  const images=[];function walk(n){if(n.tag==='img')images.push(n.src);for(const child of n.children||[])walk(child)}walk(content);
  return {requests,images};
}
const mapping=Object.fromEntries(['still/one.webp','cluster_positive/one.webp','cluster_negative/one.webp','animation/one.webp'].map(p=>[p,'sizes/512/'+p]));
const sized=fixture({'512':mapping});
assert.deepEqual(sized.requests,['https://fat.invalid/x/organ/sizes/512/cluster_positive/one.webp','https://fat.invalid/x/organ/sizes/512/still/one.webp']);
assert.deepEqual(sized.images,['https://fat.invalid/x/organ/sizes/512/cluster_positive/one.webp','https://fat.invalid/x/organ/sizes/512/cluster_negative/one.webp','https://fat.invalid/x/organ/sizes/512/animation/one.webp']);
const legacy=fixture(undefined);
assert.deepEqual(legacy.requests,['https://fat.invalid/x/organ/cluster_positive/one.webp','https://fat.invalid/x/organ/still/one.webp']);
assert.deepEqual(legacy.images,['https://fat.invalid/x/organ/cluster_positive/one.webp','https://fat.invalid/x/organ/cluster_negative/one.webp','https://fat.invalid/x/organ/animation/one.webp']);
for(const unsafe of ['','https://elsewhere.invalid/file.webp','../file.webp','/file.webp']){
  const bad=fixture({'512':Object.fromEntries(Object.keys(mapping).map(p=>[p,unsafe]))});
  assert.deepEqual(bad.requests,legacy.requests);assert.deepEqual(bad.images,legacy.images);
}
console.log('Schattenseiten: declared 512 media selected before fetch and panel loading; legacy feed and same-reserve boundary PASS');
