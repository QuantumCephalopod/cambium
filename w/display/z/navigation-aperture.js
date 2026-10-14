(() => {
'use strict';
const mini=document.getElementById('mini');
const trigger=document.getElementById('mini-trigger');
const pocket=document.getElementById('mini-pocket');
if(!mini||!trigger||!pocket) throw new Error('global navigation aperture surface missing');

let pinned=false,closeTimer=null;
const CLOSE_DELAY=170;
function clearClose(){if(closeTimer!==null){clearTimeout(closeTimer);closeTimer=null}}
function open(reason='intent'){
  clearClose();
  mini.dataset.aperture='open';
  trigger.setAttribute('aria-expanded','true');
  pocket.setAttribute('aria-hidden','false');
  if('inert' in pocket) pocket.inert=false;
  mini.dataset.reason=reason;
}
function close(reason='leave'){
  if(pinned)return;
  clearClose();
  mini.dataset.aperture='closed';
  trigger.setAttribute('aria-expanded','false');
  pocket.setAttribute('aria-hidden','true');
  if('inert' in pocket) pocket.inert=true;
  mini.dataset.reason=reason;
}
function scheduleClose(){clearClose();closeTimer=setTimeout(()=>{closeTimer=null;close('leave')},CLOSE_DELAY)}
function setPinned(next){pinned=Boolean(next);mini.dataset.pinned=String(pinned);if(pinned)open('pinned');else close('unpinned')}

trigger.addEventListener('pointerenter',()=>open('seam-hover'));
trigger.addEventListener('pointerleave',scheduleClose);
pocket.addEventListener('pointerenter',()=>{clearClose();open('pocket-hover')});
pocket.addEventListener('pointerleave',scheduleClose);
trigger.addEventListener('focus',()=>open('focus'));
mini.addEventListener('focusout',e=>{if(!mini.contains(e.relatedTarget))scheduleClose()});
trigger.addEventListener('click',e=>{e.preventDefault();setPinned(!pinned)});
addEventListener('keydown',e=>{
  if(e.key!=='Escape'||mini.dataset.aperture!=='open')return;
  e.preventDefault();e.stopImmediatePropagation();pinned=false;mini.dataset.pinned='false';close('escape');trigger.focus({preventScroll:true});
},true);

/* Composition changes move the same global aperture between outer membrane and shared seam.
 * No interlocutor reserves layout space for it. */
new MutationObserver(()=>{
  mini.dataset.composition=document.documentElement.dataset.composition||'single';
  mini.dataset.axis=document.documentElement.dataset.compositionAxis||'';
}).observe(document.documentElement,{attributes:true,attributeFilter:['data-composition','data-composition-axis']});

mini.dataset.aperture='closed';
mini.dataset.pinned='false';
mini.dataset.composition=document.documentElement.dataset.composition||'single';
mini.dataset.axis=document.documentElement.dataset.compositionAxis||'';
trigger.setAttribute('aria-expanded','false');
pocket.setAttribute('aria-hidden','true');
if('inert' in pocket) pocket.inert=true;
/* A fresh witness meets the navigator open; it can be tucked away with a click. */
setPinned(true);

globalThis.SSSNavigationAperture=Object.freeze({
  open:()=>open('api'),
  close:()=>{pinned=false;mini.dataset.pinned='false';close('api')},
  pin:()=>setPinned(true),
  unpin:()=>setPinned(false),
  get state(){return {open:mini.dataset.aperture==='open',pinned,composition:mini.dataset.composition,axis:mini.dataset.axis}}
});
})();
