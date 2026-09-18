/* Display-owned occupied-region / safe-area contract.
 * Global membrane surfaces expose their actual occupied rectangles; site-holons
 * receive the same specimen-agnostic snapshot and CSS inset variables.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.SSSDisplaySafeArea=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
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
      occupied.push(Object.freeze({id:String(entry.id||''),role:String(entry.role||''),rect:r}));
    }
    let top=0,right=0,bottom=0,left=0;
    for(const entry of occupied){
      const t=tokens(entry.role),r=entry.rect;
      if(t.has('top')) top=Math.max(top,r.bottom+g);
      if(t.has('right')) right=Math.max(right,width-r.left+g);
      if(t.has('bottom')) bottom=Math.max(bottom,height-r.top+g);
      if(t.has('left')) left=Math.max(left,r.right+g);
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
  function visibleEntry(el){
    if(!el||typeof el.getBoundingClientRect!=='function')return null;
    const cs=globalThis.getComputedStyle?getComputedStyle(el):null;
    if(cs&&(cs.display==='none'||cs.visibility==='hidden'||number(cs.opacity)<=.02))return null;
    const r=el.getBoundingClientRect();
    if(r.width<.5||r.height<.5)return null;
    return {id:el.id||'',role:el.getAttribute('data-display-occupancy')||'',rect:r};
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
    const entries=[...document.querySelectorAll('[data-display-occupancy]')].map(visibleEntry).filter(Boolean);
    state=apply(derive({width:innerWidth,height:innerHeight},entries));
    try{dispatchEvent(new CustomEvent('sss:safe-area',{detail:state}))}catch(_){}
    return state;
  }
  function schedule(){if(raf||typeof requestAnimationFrame!=='function')return refresh();raf=requestAnimationFrame(()=>{raf=0;refresh()})}
  function start(){
    if(started||typeof document!=='object')return state;
    started=true;
    const occupancy=[...document.querySelectorAll('[data-display-occupancy]')];
    if(typeof ResizeObserver==='function'){resizeObserver=new ResizeObserver(schedule);for(const el of occupancy)resizeObserver.observe(el)}
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
