"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const projection=JSON.parse(fs.readFileSync(path.join(__dirname,'projection.json'))),events=[],modules=new Map();
function node(tag){return{tag,children:[],append(...xs){this.children.push(...xs)},replaceChildren(...xs){this.children=xs},addEventListener(k,f){this[k]=f},remove(){}}}
const W={globalTargets:[{path:'y',interlocutorIds:['organism:papers']}]},context={console,SSSInterlocutorModules:modules,SSSWorldView:W,document:{createElement:node},addEventListener(){},dispatchEvent:e=>events.push(e),CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'render.js'),'utf8'),context);const site=modules.get('organism:philosophy'),host=node('host'),content=node('content');
assert(site.shader.bodyPlaceholder?.fragment.includes('void main'),'Philosophy owns the plain material used before liquid revelation');
for(const language of ['de','en']){
 site.render({host,content,projection,path:'w',language});const button=content.children[0].children.find(n=>n.tag==='button');assert(button);button.click({preventDefault(){},stopPropagation(){},clientX:60,clientY:80});
 assert.equal(events.at(-1).type,'sss:enter-body');assert.equal(events.at(-1).detail.id,'organism:papers');assert.equal(events.at(-1).detail.from,'organism:philosophy');assert.equal(W.globalTargets[0].path,'y');
}
W.globalTargets[0].path='xy';site.render({host,content,projection,path:'w'});assert(content.children[0].children.some(n=>n.tag==='button'),'relocation retains the source-owned encounter identity');
W.globalTargets=[];site.render({host,content,projection,path:'w'});assert(!content.children[0].children.some(n=>n.tag==='button'),'an absent project is never fabricated by explanatory prose');
site.render({host,content,projection,path:'z'});assert(!content.children[0].children.some(n=>n.tag==='button'),'the authored Inquiry placement is not silently repeated at other loci');
console.log('Philosophy source-owned Inquiry encounter: actual mount identity, relocation, absence and language PASS');
