/* Display-owned glass contract.
 * Every occupied HUD surface (data-display-occupancy) is glass: the field behind it is
 * refracted inside its rounded rectangle. A surface may opt out with data-display-glass="off";
 * any surface may opt in with data-display-glass="on" (a site HUD that is not reserved space).
 * This module owns only the geometry: which rectangles, in the drawing-buffer space of one
 * field canvas. The refraction itself is a render pass in w/locus-shader.js.
 */
(function(root,factory){
  'use strict';
  const api=factory(root);
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.SSSDisplayGlass=api;
})(typeof globalThis==='object'?globalThis:this,function(root){
  'use strict';
  const TYPE=root.SSSDisplayType||(typeof module==='object'&&module.exports?require('../../w/wx/display-type.js'):null);
  if(!TYPE?.typeUnitPx)throw new Error('Display glass requires the shared grid type unit');
  const MAX=8;
  const anonymousIds=new WeakMap(),entrySources=new WeakMap();let nextSurface=0;
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
  const PARAMS=Object.freeze({radius:22,bevel:.18,bevelMax:8,refract:34,theta:.25,aberr:.3,mag:.06,spec:0,fres:0,shadow:26,shadowK:.38,dot:4.5,halftone:.85,overfillWave:7,tint:Object.freeze([.62,.66,.72,.05])});

  function number(v){v=Number(v);return Number.isFinite(v)?v:0}
  function box(r={}){
    const left=number(r.left),top=number(r.top),width=Math.max(0,number(r.width??(number(r.right)-left))),height=Math.max(0,number(r.height??(number(r.bottom)-top)));
    return {left,top,width,height,right:left+width,bottom:top+height};
  }
  function contains(a,b,slack=1){return b.left>=a.left-slack&&b.right<=a.right+slack&&b.top>=a.top-slack&&b.bottom<=a.bottom+slack}
  /* A measured reading rectangle is content, not optical bevel. The same
   * half-cell edge surrounds HUDs and a contacted lens; no glyph scan is needed.
   * Font/layout owners retain measurement and continuation. */
  function readInset(doc=root.document){return TYPE.typeUnitPx(doc)/2}
  function readingFrame(value,inset=PARAMS.bevelMax){
    const readRect=box(value),p=Math.max(0,number(inset));
    return {readRect,rect:box({left:readRect.left-p,top:readRect.top-p,width:readRect.width+2*p,height:readRect.height+2*p}),inset:p};
  }
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
  function derive(entries,canvasRect,buffer,liquid=null){
    const c=box(canvasRect),bw=Math.max(0,number(buffer?.width)),bh=Math.max(0,number(buffer?.height));
    const data=new Float32Array(MAX*4),readData=new Float32Array(MAX*4),mergeData=new Float32Array(MAX);
    if(c.width<1||c.height<1||bw<1||bh<1)return Object.freeze({count:0,data,readData,mergeData,scale:1,inset:PARAMS.bevelMax});
    const sx=bw/c.width,sy=bh/c.height,kept=[];
    for(const e of entries||[]){
      if(!e)continue;const r=box(e.rect||e);
      if(r.width<2||r.height<2)continue;
      if(r.right<=c.left||r.left>=c.right||r.bottom<=c.top||r.top>=c.bottom)continue;
      kept.push({rect:r,readRect:e.readRect?box(e.readRect):null,inset:e.inset,kind:e.kind||'hud',layer:e.layer||'hud'});
    }
    const out=[];
    for(let i=0;i<kept.length;i++){
      let inside=false;
      for(let j=0;j<kept.length;j++){if(i!==j&&kept[j].kind===kept[i].kind&&kept[j].layer===kept[i].layer&&contains(kept[j].rect,kept[i].rect)&&!(contains(kept[i].rect,kept[j].rect)&&j>i)){inside=true;break}}
      if(!inside)out.push(kept[i]);
    }
    let n=0;
    for(const entry of out){
      if(n>=MAX)break;
      const r=flush(entry.rect,c);
      // A nested surface may lend additional reading tissue inside this slab.
      let read=entry.readRect;
      for(const nested of kept)if(nested.kind===entry.kind&&nested.layer===entry.layer&&nested.readRect&&contains(entry.rect,nested.rect)){
        const a=read,b=nested.readRect;
        read=a?box({left:Math.min(a.left,b.left),top:Math.min(a.top,b.top),right:Math.max(a.right,b.right),bottom:Math.max(a.bottom,b.bottom)}):b;
      }
      data[n*4]=((r.left+r.width/2)-c.left)*sx;
      data[n*4+1]=bh-((r.top+r.height/2)-c.top)*sy;
      data[n*4+2]=r.width/2*sx;
      data[n*4+3]=r.height/2*sy;
      const a=read;
      if(a){readData[n*4]=(a.left+a.width/2-c.left)*sx;readData[n*4+1]=bh-(a.top+a.height/2-c.top)*sy;readData[n*4+2]=a.width/2*sx;readData[n*4+3]=a.height/2*sy;}
      mergeData[n]=liquid&&entry.kind===(liquid.kind||'hud')&&entry.layer===(liquid.layer||'hud')?1:0;
      n++;
    }
    return Object.freeze({count:n,data,readData,mergeData,scale:sx,inset:out[0]?.inset??PARAMS.bevelMax});
  }

  function surfaceRect(el,value){
    const grid=globalThis.SSSDisplayMembraneGrid;
    if(!grid)throw new Error('Display membrane UI grid is required for HUD geometry');
    return box(grid.surfaceRect(el,box(value)));
  }
  function visible(el,getStyle,inset){
    const cs=getStyle?getStyle(el):null;
    if(cs&&(cs.display==='none'||cs.visibility==='hidden'||number(cs.opacity)<=.02))return null;
    const raw=box(el.getBoundingClientRect());if(raw.width<2||raw.height<2)return null;
    const r=surfaceRect(el,raw,inset);
    const logicalRole=el.getAttribute('data-display-occupancy')||'',field=el.getAttribute('data-display-ui-field')||'';
    const role=globalThis.SSSDisplayMembraneGrid?.role?.(logicalRole)||logicalRole;
    const entry={id:surfaceId(el),ids:[surfaceId(el)],rect:r,readRect:raw,inset,role,field,
      kind:el.getAttribute('data-display-glass-kind')||'hud',layer:el.getAttribute('data-display-glass-layer')||'hud'};
    entrySources.set(entry,[el]);return entry;
  }
  /* The surfaces: occupied HUD surfaces unless they opt out, plus anything that opts in. */
  function collect(doc,getStyle){
    doc=doc||(typeof document==='object'?document:null);
    getStyle=getStyle||(typeof getComputedStyle==='function'?getComputedStyle:null);
    if(!doc)return [];
    const out=[],inset=readInset(doc,getStyle);
    for(const el of doc.querySelectorAll('[data-display-occupancy],[data-display-glass="on"]')){
      if(el.getAttribute('data-display-glass')==='off')continue;
      const v=visible(el,getStyle,inset);if(v)out.push(v);
    }
    const merged=[];
    for(const e of out){
      const top=v=>v.field==='top'||v.field==='status'||(!v.field&&v.role.split(/\s+/).includes('top'));
      const sibling=top(e)&&merged.find(v=>top(v)&&v.kind===e.kind&&v.layer===e.layer);
      if(!sibling){merged.push(e);continue}
      const a=sibling.rect,b=e.rect,left=Math.min(a.left,b.left),topY=Math.min(a.top,b.top),right=Math.max(a.right,b.right),bottom=Math.max(a.bottom,b.bottom);
      sibling.rect=box({left,top:topY,width:right-left,height:bottom-topY});sibling.ids.push(...e.ids);entrySources.get(sibling).push(...entrySources.get(e));
      const ar=sibling.readRect,br=e.readRect,rl=Math.min(ar.left,br.left),rt=Math.min(ar.top,br.top);
      sibling.readRect=box({left:rl,top:rt,width:Math.max(ar.right,br.right)-rl,height:Math.max(ar.bottom,br.bottom)-rt});
    }
    return merged;
  }
  function enabled(){
    try{return !(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-transparency: reduce)').matches)}catch(_){return true}
  }
  /* A frame timestamp identifies a shared observation phase, not an elapsed
   * time window. A DOM change between consumers opens a new phase even when
   * their animation-frame timestamp is identical. */
  const SURFACE='[data-display-occupancy],[data-display-glass="on"]';
  let observedDoc=null,observer=null,observation=null,revision=0;
  function invalidate(){revision++}
  function hasSurface(node){
    return node?.nodeType===1&&!!(node.matches?.(SURFACE)||node.querySelector?.(SURFACE));
  }
  function affectsObservation(record){
    const node=record.target?.nodeType===1?record.target:record.target?.parentElement;
    if(!node)return true;
    // These fixed-position instruments/labels are outside layout. If one ever
    // contains an offered surface, its mutations remain observable.
    const overlay=node.closest?.('#display-lens,.display-glass-edge,.interlocutor-field-labels');
    if(overlay&&!node.closest?.(SURFACE)&&!overlay.matches?.(SURFACE)){
      const changed=[...(record.addedNodes||[]),...(record.removedNodes||[])];
      if(!changed.some(hasSurface)&&!overlay.querySelector?.(SURFACE))return false;
    }
    return true;
  }
  function mutations(records){if(records.some(affectsObservation))invalidate()}
  function watch(doc){
    observer?.disconnect();observer=null;observation=null;
    if(observedDoc){
      globalThis.removeEventListener?.('resize',invalidate);
      globalThis.removeEventListener?.('scroll',invalidate,true);
      observedDoc.fonts?.removeEventListener?.('loadingdone',invalidate);
      observedDoc.fonts?.removeEventListener?.('loadingerror',invalidate);
    }
    observedDoc=doc;
    if(typeof MutationObserver!=='function'||!doc?.documentElement)return;
    observer=new MutationObserver(mutations);
    observer.observe(doc.documentElement,{attributes:true,childList:true,characterData:true,subtree:true});
    globalThis.addEventListener?.('resize',invalidate,{passive:true});
    globalThis.addEventListener?.('scroll',invalidate,{capture:true,passive:true});
    doc.fonts?.addEventListener?.('loadingdone',invalidate);
    doc.fonts?.addEventListener?.('loadingerror',invalidate);
  }
  function scrollWitness(entries){
    const seen=new Set();
    for(const entry of entries)for(const source of entrySources.get(entry)||[]){
      for(let node=source.parentElement;node;node=node.parentElement)seen.add(node);
    }
    return [...seen].map(node=>({node,left:node.scrollLeft||0,top:node.scrollTop||0}));
  }
  function scrolled(witness){return witness.some(v=>(v.node.scrollLeft||0)!==v.left||(v.node.scrollTop||0)!==v.top)}
  function observe(frame,doc=globalThis.document,getStyle=globalThis.getComputedStyle){
    if(doc!==observedDoc)watch(doc);
    // Without a frame or a way to witness intervening changes, this call is
    // its own observation phase; no stale geometry is silently reused.
    if(!Number.isFinite(frame)||!observer)return collect(doc,getStyle);
    mutations(observer.takeRecords());
    if(!observation||observation.frame!==frame||observation.revision!==revision||observation.getStyle!==getStyle||scrolled(observation.scroll)){
      const entries=collect(doc,getStyle);
      observation={frame,revision,getStyle,entries,scroll:scrollWitness(entries)};
    }
    return observation.entries;
  }
  function rects(canvasRect,buffer,frame,skip,liquid){
    const entries=observe(frame);
    const pack=derive(skip&&skip.length?entries.filter(e=>!e.ids.some(id=>skip.includes(id))):entries,canvasRect,buffer,liquid);
    return {...pack,inset:entries[0]?.inset??PARAMS.bevelMax};
  }
  return Object.freeze({MAX,PARAMS,derive,collect,observe,invalidate,rects,enabled,surfaceRect,readInset,readingFrame});
});
