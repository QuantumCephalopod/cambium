/* Display-owned occupied-region / safe-area contract.
 * Global membrane surfaces expose their actual occupied rectangles; site-holons
 * receive the same specimen-agnostic snapshot and CSS inset variables.
 */
(function(root,factory){
  'use strict';
  const UI=typeof module==='object'&&module.exports?require('../../w/wz/ui-grid.js'):root.SSSUIGrid;
  const api=factory(UI);
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.SSSDisplaySafeArea=api;
})(typeof globalThis==='object'?globalThis:this,function(UI){
  'use strict';
  if(!UI)throw new Error('recursive UI-grid algebra is required');
  const GAP=8;
  let state=Object.freeze({viewport:Object.freeze({width:0,height:0}),occupied:Object.freeze([]),insets:Object.freeze({top:0,right:0,bottom:0,left:0})});
  let started=false,resizeObserver=null,mutationObserver=null,raf=0;

  function number(v){v=Number(v);return Number.isFinite(v)?v:0}
  function rect(value={}){
    const left=number(value.left),top=number(value.top),width=Math.max(0,number(value.width??(number(value.right)-left))),height=Math.max(0,number(value.height??(number(value.bottom)-top)));
    return Object.freeze({left,top,right:left+width,bottom:top+height,width,height});
  }
  function tokens(role){return new Set(String(role||'').trim().split(/\s+/).filter(Boolean))}
  function derive(viewport={},entries=[],gap=GAP){
    const width=Math.max(0,number(viewport.width)),height=Math.max(0,number(viewport.height)),g=Math.max(0,number(gap));
    const occupied=[];
    for(const entry of entries||[]){
      if(!entry)continue;
      const r=rect(entry.rect||entry);
      if(r.width<.5||r.height<.5)continue;
      occupied.push(Object.freeze({id:String(entry.id||''),role:String(entry.role||''),rect:r,canonical:!!entry.canonical,clearance:Math.max(0,number(entry.clearance))}));
    }
    let top=0,right=0,bottom=0,left=0;
    for(const entry of occupied){
      const t=tokens(entry.role),r=entry.rect,p=entry.canonical?entry.clearance:g;
      if(t.has('top')) top=Math.max(top,r.bottom+p);
      if(t.has('right')) right=Math.max(right,width-r.left+p);
      if(t.has('bottom')) bottom=Math.max(bottom,height-r.top+p);
      if(t.has('left')) left=Math.max(left,r.right+p);
    }
    const insets=Object.freeze({
      top:Math.min(height,Math.max(0,top)),
      right:Math.min(width,Math.max(0,right)),
      bottom:Math.min(height,Math.max(0,bottom)),
      left:Math.min(width,Math.max(0,left))
    });
    return Object.freeze({viewport:Object.freeze({width,height}),occupied:Object.freeze(occupied),insets});
  }
  function snapshot(){return state}
  function measure(el){
    if(!el||typeof el.getBoundingClientRect!=='function')return null;
    const cs=globalThis.getComputedStyle?getComputedStyle(el):null;
    if(cs&&(cs.display==='none'||cs.visibility==='hidden'||number(cs.opacity)<=.02))return null;
    const raw=el.getBoundingClientRect();
    if(raw.width<.5||raw.height<.5)return null;
    return {el,raw};
  }
  function visibleEntry(measured,clearance=0,mode='landscape'){
    if(!measured)return null;
    const {el,raw}=measured;
    const r=globalThis.SSSDisplayGlass?.surfaceRect?SSSDisplayGlass.surfaceRect(el,raw):raw;
    if(r.width<.5||r.height<.5)return null;
    return {id:el.id||'',role:UI.orientEdges(el.getAttribute('data-display-occupancy')||'',mode),rect:r,readRect:rect(raw),canonical:!!globalThis.SSSDisplayMembraneGrid,clearance};
  }
  function readingLimit(clearance,mode){
    let limit=Infinity;
    for(const field of document.querySelectorAll('[data-interlocutor]:not([hidden]) [data-ui-bounded="true"]')){
      const b=field.getBoundingClientRect(),portrait=mode==='portrait';
      if(portrait?(b.right<innerWidth-.5||b.width<1):(b.top>.5||b.height<1))continue;
      const ink=field.querySelector('h1,h2,button,span,b,small');if(!ink)continue;
      const r=ink.getBoundingClientRect(),extent=portrait?r.width:r.height;if(extent<=0)continue;
      const cs=globalThis.getComputedStyle?getComputedStyle(field):null;
      const padding=parseFloat(portrait?cs?.paddingLeft:cs?.paddingBottom)||0;
      limit=Math.min(limit,(portrait?innerWidth-b.left:b.bottom)-extent-padding-clearance);
    }
    return limit;
  }
  function apply(next){
    if(typeof document!=='object')return next;
    const rootEl=document.documentElement,s=next.insets;
    rootEl.style.setProperty('--display-safe-top',s.top+'px');
    rootEl.style.setProperty('--display-safe-right',s.right+'px');
    rootEl.style.setProperty('--display-safe-bottom',s.bottom+'px');
    rootEl.style.setProperty('--display-safe-left',s.left+'px');
    rootEl.dataset.displaySafeArea='ready';
    return next;
  }
  function refresh(){
    if(typeof document!=='object')return state;
    const mode=UI.orientation(innerWidth,innerHeight),root=document.documentElement;
    if(root.dataset.displayOrientation!==mode)root.dataset.displayOrientation=mode;
    const elements=[...document.querySelectorAll('[data-display-occupancy]')];
    // Place real feedback after the measured header before acquiring its own
    // geometry. Reuse the ordinary header read; no additional layout scan or
    // observer phase is needed, including the first/explicit refresh.
    const header=elements.find(el=>el.id==='display-header'),headerEntry=header?measure(header):null;
    if(header){
      const style=document.documentElement.style,value=(headerEntry?.raw.bottom??(headerEntry?headerEntry.raw.top+headerEntry.raw.height:0))+'px';
      if(style.getPropertyValue?.('--display-header-bottom')!==value)style.setProperty('--display-header-bottom',value);
      const depth=(mode==='portrait'&&headerEntry?Math.max(0,innerWidth-headerEntry.raw.left):0)+'px';
      if(style.getPropertyValue?.('--display-header-depth')!==depth)style.setProperty('--display-header-depth',depth);
    }
    const measured=elements.map(el=>el===header?headerEntry:measure(el)).filter(Boolean);
    const find=id=>measured.find(entry=>entry.el.id===id)?.raw;
    let inset=0;
    if(globalThis.SSSDisplayMembraneGrid){
      const glass=globalThis.SSSDisplayGlass;
      inset=glass?.readInset?.()||0;
      const status=find('display-membrane-status'),ratio=Number(globalThis.devicePixelRatio)||1;
      SSSDisplayMembraneGrid.reconcile({width:innerWidth,height:innerHeight,headerRect:headerEntry?.raw,
        statusRect:status,triggerRect:find('mini-trigger'),inset,
        limit:status?readingLimit(inset,mode):Infinity,quantum:1/ratio});
      glass?.invalidate?.();
    }
    const entries=measured.map(entry=>visibleEntry(entry,inset,mode)).filter(Boolean);
    state=apply(derive({width:innerWidth,height:innerHeight},entries));
    try{dispatchEvent(new CustomEvent('sss:safe-area',{detail:state}))}catch(_){}
    return state;
  }
  function schedule(){if(raf)return;if(typeof requestAnimationFrame!=='function')return refresh();raf=requestAnimationFrame(()=>{raf=0;refresh()})}
  function start(){
    if(started||typeof document!=='object')return state;
    started=true;
    const occupancy=[...document.querySelectorAll('[data-display-occupancy]')];
    if(typeof ResizeObserver==='function'){resizeObserver=new ResizeObserver(schedule);for(const el of occupancy)resizeObserver.observe(el)}
    /* Occupancy can change through CSS transitions driven by an ancestor state
     * (the navigator aperture is the first witness). Mutation observes the edge,
     * but settled opacity/transform is only truthful at transition completion. */
    for(const el of occupancy){
      el.addEventListener('transitionend',schedule,{passive:true});
      el.addEventListener('transitioncancel',schedule,{passive:true});
    }
    if(typeof MutationObserver==='function'){
      mutationObserver=new MutationObserver(schedule);
      for(const el of occupancy)mutationObserver.observe(el,{attributes:true,childList:true,subtree:true,characterData:true,attributeFilter:['class','hidden','aria-hidden','style']});
      const mini=document.getElementById('mini');if(mini)mutationObserver.observe(mini,{attributes:true,attributeFilter:['data-aperture','data-pinned','style']});
    }
    addEventListener('resize',schedule,{passive:true});
    return refresh();
  }
  return Object.freeze({derive,snapshot,refresh,start});
});
