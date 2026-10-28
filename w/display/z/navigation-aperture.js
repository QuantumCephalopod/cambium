(() => {
'use strict';
const mini=document.getElementById('mini');
const trigger=document.getElementById('mini-trigger');
const pocket=document.getElementById('mini-pocket');
if(!mini||!trigger||!pocket) throw new Error('global navigation aperture surface missing');
const legal=document.getElementById('legal-links');
const core=document.getElementById('mini-core'),map=document.getElementById('navTwin');
const helpButton=document.getElementById('mini-help-toggle'),guide=document.getElementById('mini-guide');
const hints=Object.fromEntries(['map','mapKeys','axis','keys'].map(key=>[key,document.getElementById('mini-hint-'+key)]));
const mapHelp=document.getElementById('mini-map-help'),axisHelp=document.getElementById('mini-axis-help');
const COPY={
  en:{map:'scroll to explore · select a body',mapKeys:'+/− zoom · arrows pan · 0 resets',axis:'pull a rail · hold still to lock',keys:'hold an arrow · release to stop',help:'Navigator help',mapHelp:'Map: scroll or +/− to magnify; arrows pan; 0 resets. Select a body to enter; select a cluster to magnify.',axisHelp:'Rotation: pull an x/y rail; hold still to lock its speed. The midpoint stops rotation. With a keyboard, hold an arrow to rotate and release to stop.'},
  de:{map:'scrollen erkundet · Körper wählen',mapKeys:'+/− Zoom · Pfeile schieben · 0 zurück',axis:'Regler ziehen · stillhalten fixiert',keys:'Pfeil halten · loslassen stoppt',help:'Kompasshilfe',mapHelp:'Karte: Scrollen oder +/− vergrößert; Pfeile verschieben; 0 setzt zurück. Einen Körper zum Betreten wählen; eine Gruppe zum Vergrößern wählen.',axisHelp:'Drehung: Am x/y-Regler ziehen; Stillhalten fixiert die Geschwindigkeit. Die Mitte stoppt die Drehung. Mit der Tastatur einen Pfeil zum Drehen halten; Loslassen stoppt.'}
};
let pointerContext='map',focusContext=null,keyboard=true;
function copy(){return COPY[document.documentElement.lang==='de'?'de':'en']}
function renderHint(){const key=focusContext&&keyboard?(focusContext==='axis'?'keys':'mapKeys'):pointerContext||focusContext||'map';for(const [id,el] of Object.entries(hints))el?.setAttribute('aria-hidden',String(id!==key))}
function language(){const c=copy();for(const [key,el] of Object.entries(hints))if(el)el.textContent=c[key];renderHint();if(helpButton)helpButton.setAttribute('aria-label',c.help);if(mapHelp)mapHelp.textContent=c.mapHelp;if(axisHelp)axisHelp.textContent=c.axisHelp;measure()}
for(const [el,key] of [[map,'map'],[document.getElementById('axis-x'),'axis'],[document.getElementById('axis-y'),'axis']]){
  if(!el)continue;
  el.setAttribute('aria-describedby',key==='map'?'mini-map-help':'mini-axis-help');
  el.addEventListener('pointerenter',()=>{keyboard=false;pointerContext=key;renderHint()});
  el.addEventListener('pointerdown',()=>{keyboard=false;pointerContext=key;renderHint()});
  el.addEventListener('pointerleave',()=>{pointerContext=null;renderHint()});
  el.addEventListener('focus',()=>{focusContext=key;renderHint()});
  el.addEventListener('blur',()=>{focusContext=null;renderHint()});
}
function setHelp(next){if(!guide||!helpButton)return;guide.hidden=!next;helpButton.setAttribute('aria-expanded',String(next));measure()}
helpButton?.addEventListener('click',()=>setHelp(guide.hidden));

function px(name,value){const v=Math.ceil(value)+'px';if(mini.style.getPropertyValue(name)!==v)mini.style.setProperty(name,v)}
function measure(){
  const legalHeight=legal?.offsetHeight??legal?.getBoundingClientRect().height??0;
  px('--legal-footer-height',legalHeight);
  if(!core||!map)return;
  // Layout extents do not inherit the pocket's opening transform. No frame polling.
  const top=globalThis.SSSDisplaySafeArea?.snapshot().insets.top||0;
  const rem=globalThis.SSSDisplayType?.rootRemPx?.()||16;
  const bounded=mini.dataset.gridBounded==='true',field=mini.getBoundingClientRect?.(),available=bounded?Math.max(0,(field?.height||0)-legalHeight-3*rem):Math.max(0,innerHeight-top-legalHeight-6*rem);
  px('--compass-top',top);px('--compass-core-cap',available);
  px('--compass-guide-cap',available*.45);
  const chrome=core.scrollHeight-map.offsetHeight;
  px('--compass-map-cap',bounded?Math.max(24,Math.min(available*.7,(field?.width||0)-3.5*rem)):Math.max(24,available-chrome));
  px('--compass-core-height',core.offsetHeight);
  core.dataset.scroll=String(core.scrollHeight>core.clientHeight+1);
}
if(typeof ResizeObserver==='function'){
  const observer=new ResizeObserver(measure);
  for(const el of [legal,core,document.getElementById('mini-state'),document.getElementById('mini-help-bar'),guide])if(el)observer.observe(el);
}
addEventListener('resize',measure,{passive:true});
addEventListener('sss:safe-area',measure);
addEventListener('sss:language',language);
document.fonts?.ready.then(measure);
language();

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
  setHelp(false);
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
  keyboard=true;renderHint();
  if(e.key!=='Escape'||mini.dataset.aperture!=='open')return;
  e.preventDefault();e.stopImmediatePropagation();pinned=false;mini.dataset.pinned='false';trigger.focus({preventScroll:true});close('escape');
},true);

/* Composition changes move the same global aperture between outer membrane and shared seam.
 * No interlocutor reserves layout space for it. */
new MutationObserver(()=>{
  mini.dataset.composition=document.documentElement.dataset.composition||'single';
  mini.dataset.axis=document.documentElement.dataset.compositionAxis||'';
  measure();
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
