/* Display-owned glass contract.
 * Every occupied HUD surface (data-display-occupancy) is glass: the field behind it is
 * refracted inside its rounded rectangle. A surface may opt out with data-display-glass="off";
 * any surface may opt in with data-display-glass="on" (a site HUD that is not reserved space).
 * This module owns only the geometry: which rectangles, in the drawing-buffer space of one
 * field canvas. The refraction itself is a render pass in w/locus-shader.js.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.SSSDisplayGlass=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const MAX=8;
  const anonymousIds=new WeakMap();let nextSurface=0;
  function surfaceId(el){if(el.id)return el.id;if(!anonymousIds.has(el))anonymousIds.set(el,'glass-surface-'+(++nextSurface));return anonymousIds.get(el)}
  /* CSS pixels and radians, first drafts: one line each to tune by eye.
   *  radius   corner radius of a glass surface
   *  bevel    width of the curved edge, as a fraction of the surface's shorter side (capped by bevelMax)
   *  refract  how far, at the very edge, the lookup is pulled from outside (capped at 0.9 of the bevel)
   *  theta    the turn of that pull off the edge normal: the argument of e^{i·theta}
   *  aberr    dispersion: red uses the pull·(1-aberr), blue pull·(1+aberr); it grows with the bend, so it is
   *           strongest at the edge and gone in the flat middle
   *  mag      complex scaling about the centre: the interior is magnified by this fraction
   *  spec     light on the bevel from two lamps, upper left strong, lower right half as strong
   *  fres     light that grows where the surface tilts away
   *  shadow   reach of the soft shadow around a surface, and shadowK its depth
   *  dot      halftone cell size in CSS px; halftone how much of the shadow and the rim is printed as dots (0 = smooth)
   *  tint     a faint dye, rgb + strength */
  const PARAMS=Object.freeze({radius:22,bevel:.18,bevelMax:56,refract:34,theta:.25,aberr:.3,mag:.06,spec:0,fres:0,shadow:26,shadowK:.38,dot:4.5,halftone:.85,overfillWave:7,tint:Object.freeze([.62,.66,.72,.05])});

  function number(v){v=Number(v);return Number.isFinite(v)?v:0}
  function box(r={}){
    const left=number(r.left),top=number(r.top),width=Math.max(0,number(r.width??(number(r.right)-left))),height=Math.max(0,number(r.height??(number(r.bottom)-top)));
    return {left,top,width,height,right:left+width,bottom:top+height};
  }
  function contains(a,b,slack=1){return b.left>=a.left-slack&&b.right<=a.right+slack&&b.top>=a.top-slack&&b.bottom<=a.bottom+slack}
  /* A surface that touches the edge of the canvas has no bevel on that side: its edge is pushed
   * out past the screen, so the rim and the rounded corner fall off-canvas and only the free
   * sides show glass. */
  const EDGE_PAD=96;
  function flush(r,c){
    const left=r.left<=c.left+1?c.left-EDGE_PAD:r.left,right=r.right>=c.right-1?c.right+EDGE_PAD:r.right,top=r.top<=c.top+1?c.top-EDGE_PAD:r.top,bottom=r.bottom>=c.bottom-1?c.bottom+EDGE_PAD:r.bottom;
    return {left,top,right,bottom,width:right-left,height:bottom-top};
  }

  /* entries: [{rect}] in viewport CSS px. canvasRect: the canvas in viewport CSS px.
   * buffer: {width,height} of its drawing buffer. Returns the rectangles that touch the
   * canvas as centre + half-size in buffer pixels (origin bottom-left, as gl_FragCoord),
   * at most MAX. A surface wholly inside a larger one is not glass of its own: one slab,
   * one lens. */
  function derive(entries,canvasRect,buffer){
    const c=box(canvasRect),bw=Math.max(0,number(buffer?.width)),bh=Math.max(0,number(buffer?.height));
    const data=new Float32Array(MAX*4);
    if(c.width<1||c.height<1||bw<1||bh<1)return Object.freeze({count:0,data,scale:1});
    const sx=bw/c.width,sy=bh/c.height,kept=[];
    for(const e of entries||[]){
      if(!e)continue;const r=box(e.rect||e);
      if(r.width<2||r.height<2)continue;
      if(r.right<=c.left||r.left>=c.right||r.bottom<=c.top||r.top>=c.bottom)continue;
      kept.push(r);
    }
    const out=[];
    for(let i=0;i<kept.length;i++){
      let inside=false;
      for(let j=0;j<kept.length;j++){if(i!==j&&contains(kept[j],kept[i])&&!(contains(kept[i],kept[j])&&j>i)){inside=true;break}}
      if(!inside)out.push(kept[i]);
    }
    let n=0;
    for(const raw of out){
      if(n>=MAX)break;
      const r=flush(raw,c);
      data[n*4]=((r.left+r.width/2)-c.left)*sx;
      data[n*4+1]=bh-((r.top+r.height/2)-c.top)*sy;
      data[n*4+2]=r.width/2*sx;
      data[n*4+3]=r.height/2*sy;
      n++;
    }
    return Object.freeze({count:n,data,scale:sx});
  }

  function surfaceRect(el,value){
    const r=box(value),overfill=Math.max(0,Math.min(96,number(el.getAttribute('data-display-glass-overfill'))));
    return overfill?box({left:r.left,top:r.top,width:r.width,height:r.height+overfill}):r;
  }
  function visible(el,getStyle){
    const cs=getStyle?getStyle(el):null;
    if(cs&&(cs.display==='none'||cs.visibility==='hidden'||number(cs.opacity)<=.02))return null;
    const r=surfaceRect(el,el.getBoundingClientRect());
    return r.width<2||r.height<2?null:{id:surfaceId(el),ids:[surfaceId(el)],rect:r,role:el.getAttribute('data-display-occupancy')||'',
      kind:el.getAttribute('data-display-glass-kind')||'hud',layer:el.getAttribute('data-display-glass-layer')||'hud',
      overfill:number(el.getAttribute('data-display-glass-overfill'))};
  }
  /* The surfaces: occupied HUD surfaces unless they opt out, plus anything that opts in. */
  function collect(doc,getStyle){
    doc=doc||(typeof document==='object'?document:null);
    getStyle=getStyle||(typeof getComputedStyle==='function'?getComputedStyle:null);
    if(!doc)return [];
    const out=[];
    for(const el of doc.querySelectorAll('[data-display-occupancy],[data-display-glass="on"]')){
      if(el.getAttribute('data-display-glass')==='off')continue;
      const v=visible(el,getStyle);if(v)out.push(v);
    }
    const merged=[];
    for(const e of out){
      const top=e.overfill>0&&e.role.split(/\s+/).includes('top');
      const sibling=top&&merged.find(v=>v.overfill>0&&v.role.split(/\s+/).includes('top')&&v.kind===e.kind&&v.layer===e.layer);
      if(!sibling){merged.push(e);continue}
      const a=sibling.rect,b=e.rect,left=Math.min(a.left,b.left),topY=Math.min(a.top,b.top),right=Math.max(a.right,b.right),bottom=Math.max(a.bottom,b.bottom);
      sibling.rect=box({left,top:topY,width:right-left,height:bottom-topY});sibling.ids.push(...e.ids);
    }
    return merged;
  }
  function enabled(){
    try{return !(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-transparency: reduce)').matches)}catch(_){return true}
  }
  /* One DOM read per animation frame, shared by every field that asks. */
  let cache=null,cacheAt=-1e9;
  function rects(canvasRect,buffer,now,skip){
    const t=typeof now==='number'?now:(typeof performance==='object'?performance.now():0);
    if(!cache||t-cacheAt>6){cache=collect();cacheAt=t}
    return derive(skip&&skip.length?cache.filter(e=>!e.ids.some(id=>skip.includes(id))):cache,canvasRect,buffer);
  }
  return Object.freeze({MAX,PARAMS,derive,collect,rects,enabled,surfaceRect});
});
