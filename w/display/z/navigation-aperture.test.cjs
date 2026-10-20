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

/* Execute the delivered guidance against measured layout changes, without inventing
 * a second navigation action or mutating the site's orientation. */
for(const composition of ['single','split','grid']){
 const listeners=new Map(),observers=[];let fontReady;let chrome=92,mapSize=160,legalHeight=24;
 const node=()=>({dataset:{},attrs:{},events:{},hidden:false,style:{getPropertyValue(k){return this[k]||''},setProperty(k,v){this[k]=v}},inert:false,setAttribute(k,v){this.attrs[k]=v},addEventListener(k,f){this.events[k]=f},contains(){return false},focus(){this.events.focus?.()}});
 const ids=['mini','mini-trigger','mini-pocket','legal-links','mini-core','navTwin','mini-help','mini-help-toggle','mini-guide','mini-map-help','mini-axis-help','axis-x','axis-y'];
 const els=Object.fromEntries(ids.map(id=>[id,node()]));const mini=els.mini,guide=els['mini-guide'],button=els['mini-help-toggle'],hint=els['mini-help'];guide.hidden=true;
 Object.defineProperty(els['legal-links'],'offsetHeight',{get:()=>legalHeight});
 Object.defineProperties(els['mini-core'],{offsetHeight:{get:()=>chrome+mapSize},scrollHeight:{get:()=>chrome+mapSize}});
 Object.defineProperty(els.navTwin,'offsetHeight',{get:()=>mapSize});
 const context={innerHeight:844,document:{getElementById:id=>els[id],documentElement:{dataset:{composition},lang:'en'},fonts:{ready:{then(fn){fontReady=fn}}}},SSSDisplayType:{rootRemPx:()=>16},SSSDisplaySafeArea:{snapshot:()=>({insets:{top:80}})},ResizeObserver:class{constructor(fn){this.fn=fn;observers.push(this)}observe(){}},MutationObserver:class{constructor(fn){this.fn=fn}observe(){}},addEventListener(k,f){listeners.set(k,f)},setTimeout(){return 1},clearTimeout(){}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'navigation-aperture.js'),'utf8'),context);
 assert.match(hint.textContent,/select a body/);
 els['axis-x'].events.pointerenter();assert.match(hint.textContent,/hold still/);
 els['axis-x'].events.focus();assert.match(hint.textContent,/hold still/,'mouse focus does not claim the keyboard release semantics');
 listeners.get('keydown')({key:'Tab'});assert.match(hint.textContent,/release to stop/);
 els['axis-x'].events.blur();els.navTwin.events.focus();assert.match(hint.textContent,/arrows pan/);
 els['axis-y'].events.pointerenter();assert.match(hint.textContent,/pull a rail/,'actual pointer contact can replace an earlier map focus');
 els.navTwin.events.blur();els['axis-y'].events.pointerdown();assert.match(hint.textContent,/pull a rail/,'touch can select the applicable hint without hover');
 button.events.click();assert.equal(guide.hidden,false);assert.equal(button.attrs['aria-expanded'],'true');
 context.document.documentElement.lang='de';listeners.get('sss:language')();assert.match(els['mini-map-help'].textContent,/Körper/);assert.match(els['mini-axis-help'].textContent,/Loslassen stoppt/);assert.equal(button.attrs['aria-label'],'Kompasshilfe');
 const cap=()=>parseFloat(mini.style['--compass-map-cap']);const original=cap();chrome+=64;fontReady();assert.equal(cap(),original-64,'larger font or wrapping yields measured room, not overlap');
 legalHeight+=32;observers[0].fn();assert.equal(cap(),original-96,'wrapped legal links reserve their actual height');
 context.innerHeight=390;els['mini-core'].clientHeight=140;listeners.get('resize')();assert(cap()<original-96,'short viewport reduces only the map extent');assert.equal(els['mini-core'].dataset.scroll,'true','constrained overflow keeps its pointer-accessible scrollbar');
 assert.equal(mini.style['--compass-top'],'80px');assert.equal(mini.style['--compass-core-height'],chrome+mapSize+'px');
 context.SSSNavigationAperture.close();assert.equal(guide.hidden,true);assert.equal(button.attrs['aria-expanded'],'false');assert.equal(els['mini-pocket'].inert,true);assert.equal(els['legal-links'].inert,false);
}
console.log('PASS — contextual mouse/touch/keyboard hints, accessible persistent help, live DE/EN copy and measured font/wrapping/viewport room in single/split/grid');
