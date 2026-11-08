'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

// Actual Glass and Lens modules share a synthetic browser frame; instrument
// surface reads and expose changes between consumers of the very same frame.
const counts={scans:0,styles:0,rects:0},pending=[],frames=[],events=new Map();
function element(tag='div'){
  return {nodeType:1,tagName:tag.toUpperCase(),style:{},dataset:{},attrs:{},parentElement:null,
    setAttribute(name,value){this.attrs[name]=String(value)},getAttribute(name){return this.attrs[name]??null},
    addEventListener(){},closest(){return null},matches(){return false},querySelector(){return null}};
}
const root=element('html'),body=element('body');root.dataset={};body.parentElement=root;body.append=()=>{};
const scroll=element();scroll.parentElement=body;scroll.scrollTop=0;scroll.scrollLeft=0;
let geometry={left:20,top:60,width:200,height:120},isVisible=true;
const hud=element();hud.id='hud';hud.parentElement=scroll;hud.attrs['data-display-occupancy']='right';
hud.getBoundingClientRect=()=>{counts.rects++;return {...geometry,top:geometry.top-scroll.scrollTop}};
const huds=[hud],doc={documentElement:root,body,createElement:element,querySelectorAll(){counts.scans++;return huds}};
class Observer{constructor(callback){this.callback=callback}observe(){}disconnect(){}takeRecords(){return pending.splice(0)}}
let wallClock=10;
const win={document:doc,innerWidth:800,innerHeight:600,MutationObserver:Observer,
  performance:{now:()=>wallClock},matchMedia:()=>({matches:false}),
  getComputedStyle(node){counts.styles++;return {fontSize:'16px',display:node===hud&&!isVisible?'none':'block',visibility:'visible',opacity:'1'}},
  addEventListener(name,fn){if(!events.has(name))events.set(name,[]);events.get(name).push(fn)},
  requestAnimationFrame(fn){frames.push(fn)},SSSDisplayMembraneGrid:{surfaceRect:(_el,r)=>r}};
win.globalThis=win;vm.createContext(win);
for(const file of ['display-glass.js','display-lens.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),win,{filename:file});
const G=win.SSSDisplayGlass,L=win.SSSDisplayLens,canvas={left:0,top:0,width:800,height:600};
const rectangle=(frame,buffer={width:800,height:600})=>G.rects(canvas,buffer,frame,null,L.snapshot(frame)?.lens);
const styleChange=()=>pending.push({type:'attributes',target:hud,attributeName:'style'});

// A field may run before the lens, or long after it, inside one browser frame.
rectangle(10);assert.equal(counts.scans,1);frames.shift()(10);wallClock=42;
rectangle(10);rectangle(10,{width:1600,height:1200});
assert.deepEqual(counts,{scans:1,styles:2,rects:1},'one phase must not depend on callback wall time or field count');
assert.equal(L.snapshot(10).home.rect.left,20);

// A real style/geometry mutation creates a fresh phase, including the lens's
// home geometry and each field's independently projected drawing-buffer space.
geometry={...geometry,left:50,width:250};styleChange();
assert.equal(L.snapshot(10).home.rect.left,50);
const moved=rectangle(10,{width:1600,height:1200});assert.equal(counts.scans,2);
assert.equal(moved.data[0],350,'field did not project the new viewport geometry into its own buffer');
rectangle(10);assert.equal(counts.scans,2);

// Programmatic scroll can move a surface before its asynchronous scroll event.
scroll.scrollTop=25;assert.equal(L.snapshot(10).home.rect.top,35);assert.equal(counts.scans,3);
// Visibility and an explicit non-DOM grid change cannot reuse an older phase.
isVisible=false;styleChange();assert.equal(L.snapshot(10),null);assert.equal(counts.scans,4);
isVisible=true;styleChange();assert(L.snapshot(10));assert.equal(counts.scans,5);
G.invalidate();rectangle(10);assert.equal(counts.scans,6);
for(const fn of events.get('resize')||[])fn();rectangle(10);assert.equal(counts.scans,7);
for(const fn of events.get('scroll')||[])fn();rectangle(10);assert.equal(counts.scans,8);
rectangle(26);assert.equal(counts.scans,9,'a later frame needs a fresh observation');
// The instrument's own fixed-position movement cannot invalidate HUDs; a
// surface actually added within that space does create a new observation.
const overlay=element();overlay.id='display-lens';overlay.closest=selector=>selector.startsWith('#display-lens')?overlay:null;
pending.push({type:'attributes',target:overlay,attributeName:'style'});rectangle(26);assert.equal(counts.scans,9);
const newHud=element();newHud.id='new';newHud.parentElement=overlay;newHud.attrs['data-display-glass']='on';
newHud.matches=selector=>selector.includes('data-display-glass');newHud.getBoundingClientRect=()=>{counts.rects++;return {left:300,top:40,width:100,height:80}};
huds.push(newHud);pending.push({type:'childList',target:overlay,addedNodes:[newHud],removedNodes:[]});rectangle(26);assert.equal(counts.scans,10);
huds.pop();pending.push({type:'childList',target:overlay,addedNodes:[],removedNodes:[newHud]});rectangle(26);assert.equal(counts.scans,11);
// Canvas attributes may participate in CSS selectors affecting the HUD.
const fieldCanvas=element('canvas');pending.push({type:'attributes',target:fieldCanvas,attributeName:'data-dynamic-style'});
rectangle(26);assert.equal(counts.scans,12,'canvas attribute mutation must reopen observation');
G.observe();G.observe();assert.equal(counts.scans,14,'unframed reads must not reuse geometry');
const before={...counts};
for(let i=0;i<60;i++){
 const frame=100+i*16;frames.shift()(frame);wallClock=frame+12;
 rectangle(frame);rectangle(frame,{width:1600,height:1200});
}
assert.deepEqual({scans:counts.scans-before.scans,styles:counts.styles-before.styles,rects:counts.rects-before.rects},
 {scans:60,styles:120,rects:60},'one lens and two fields exceeded one HUD read per frame');
console.log('PASS — actual Lens and fields share a frame observation; intervening geometry, visibility, scroll and grid changes reopen it');
