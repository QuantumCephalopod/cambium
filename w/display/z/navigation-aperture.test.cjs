'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
/* Execute the production aperture; measured footer height changes as real link
 * wording wraps. The footer remains outside the pocket's inert/ARIA boundary. */
for(const composition of ['single','split','grid']){
 const listeners=new Map(),observers=[];let height=24,timer=null;
 const node=()=>({dataset:{},attrs:{},events:{},style:{getPropertyValue(k){return this[k]||''},setProperty(k,v){this[k]=v}},inert:false,setAttribute(k,v){this.attrs[k]=v},addEventListener(k,f){this.events[k]=f},contains(n){return n===legal},focus(){if(!this.focused){this.focused=true;this.events.focus?.()}}});
 const mini=node(),trigger=node(),pocket=node(),legal=node();legal.getBoundingClientRect=()=>({height});
 const elements=new Map([['mini',mini],['mini-trigger',trigger],['mini-pocket',pocket],['legal-links',legal]]);
 const context={document:{getElementById:id=>elements.get(id),documentElement:{dataset:{composition}}},ResizeObserver:class{constructor(fn){this.fn=fn;observers.push(this)}observe(el){this.el=el}},MutationObserver:class{constructor(fn){this.fn=fn}observe(){}},addEventListener(k,f){listeners.set(k,f)},setTimeout(fn){timer=fn;return 1},clearTimeout(){timer=null}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'navigation-aperture.js'),'utf8'),context);
 assert.equal(mini.style['--legal-footer-height'],'24px');assert.equal(observers[0].el,legal);
 height=48;observers[0].fn();assert.equal(mini.style['--legal-footer-height'],'48px','wrapping reserves its measured height');
 height=32;listeners.get('sss:language')();assert.equal(mini.style['--legal-footer-height'],'32px','language change measures current link wording');
 height=24;listeners.get('resize')();assert.equal(mini.style['--legal-footer-height'],'24px');
 context.SSSNavigationAperture.close();assert.equal(pocket.inert,true);assert.equal(pocket.attrs['aria-hidden'],'true');assert.equal(legal.inert,false,'legal links remain reachable when compass closes');
 trigger.focus();assert.equal(pocket.inert,false);context.SSSNavigationAperture.unpin();mini.events.focusout({relatedTarget:legal});assert.equal(timer,null,'footer focus belongs to the same cluster');
 context.SSSNavigationAperture.open();trigger.focused=false;listeners.get('keydown')({key:'Escape',preventDefault(){},stopImmediatePropagation(){}});assert.equal(pocket.inert,true);assert(trigger.focused,'Escape returns focus without reopening the pocket');
}
const html=fs.readFileSync(path.join(__dirname,'../w/template.html'),'utf8');
assert.match(html,/<\/div>\s*<nav id="legal-links"[^>]*data-display-occupancy="right bottom"[^>]*><\/nav>\s*<\/aside>/,'one shared legal slot sits after the closed pocket and before the compass boundary');
console.log('PASS — measured legal slot, DE/EN wrapping/resize, open/closed keyboard access and single/split/grid aperture ownership');
