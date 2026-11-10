/* Display's main type: Philipp's SpriteSheet face, resolved by stable identity through the Display
 * dependency projection, never by path. Mono v3 supplies letters, digits and umlauts. Preserve them;
 * normalize decomposed umlauts and fold only unsupported sharp-s (ß→ss, ẞ→SS). Marks use family fallback.
 * A subtree may keep its own spelling with data-type-fold="off". */
(function(root,factory){
  'use strict';const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{root.SSSDisplayType=api;if(typeof document==='object')api.start()}
})(typeof globalThis==='object'?globalThis:this,function(root){
  'use strict';
  const IDENTITY='@sss/spritesheet';
  const GRID=root.SSSDisplayMembraneGrid||(typeof module==='object'&&module.exports
    ?require('../wz/membrane-grid.js').create(require('../wz/membrane-grid.json'),require('../wz/navigator-grid.json')):null);
  if(!GRID)throw new Error('Display type requires the authored membrane grid');
  const FACES=[['SpriteSheet Mono','SpriteSheet-Mono.woff2'],['SpriteSheet','SpriteSheet-Regular.woff2']];
  function rankFactor(rank){if(!Number.isInteger(rank))throw new TypeError('type rank must be an integer');return 2**(rank/2)}
  function rankVar(rank){if(!Number.isInteger(rank))throw new TypeError('type rank must be an integer');return '--type-r'+(rank<0?'n'+Math.abs(rank):rank>0?'p'+rank:'0')}
  function rankCss(rank){return `calc(var(--type-unit) * ${rankFactor(rank)})`}
  // Read the browser root only when a caller explicitly asks for it; it is not
  // the origin for the shared typography.
  function rootRemPx(doc=root.document){
    const px=parseFloat((doc?.defaultView||root).getComputedStyle?.(doc?.documentElement)?.fontSize);
    if(!Number.isFinite(px)||px<=0)throw new Error('browser root font size unavailable');
    return px;
  }
  function typeUnitPx(doc=root.document){
    const view=doc?.defaultView||root,w=Number(view.innerWidth),h=Number(view.innerHeight);
    if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0)throw new Error('Display type needs a positive viewport');
    return Math.max(w,h)*GRID.typeUnitRatio;
  }
  function rankPx(rank,doc=root.document){return typeUnitPx(doc)*rankFactor(rank)}
  const SHADOW=Object.freeze({x:-.03125,y:.09375,blur:.65625,spread:.09375,opacity:.86});
  const SHADOW_RGB=Object.freeze([0,0,0]);
  function shadowColor(){return `rgba(${SHADOW_RGB.join(',')},${SHADOW.opacity})`}
  function shadowPadding(doc=root.document){return Math.ceil(typeUnitPx(doc)*(Math.max(Math.abs(SHADOW.x),Math.abs(SHADOW.y))+SHADOW.spread+SHADOW.blur*2)+2)}
  function cssShadow(doc=root.document){const unit=typeUnitPx(doc),rgb=SHADOW_RGB.join(','),out=[];for(let i=0;i<9;i++){const a=i*Math.PI/4,rad=i===8?0:SHADOW.spread;out.push(`rgba(${rgb},${SHADOW.opacity/9}) ${(SHADOW.x+Math.cos(a)*rad)*unit}px ${(SHADOW.y+Math.sin(a)*rad)*unit}px ${SHADOW.blur*unit}px`)}return out.join(',')}
  function shadow(ctx){if(!ctx)return;const m=ctx.getTransform?.(),density=m?Math.hypot(m.a,m.b):1,unit=typeUnitPx()*density;ctx.shadowColor=shadowColor();ctx.shadowOffsetX=unit*SHADOW.x;ctx.shadowOffsetY=unit*SHADOW.y;ctx.shadowBlur=unit*SHADOW.blur}
  // Expanded opaque glyph masks are reusable across position, colour and frame time.
  const shadowMasks=new Map();let shadowMaskBytes=0,fontGeneration=0;
  function fontEpoch(){return fontGeneration}
  function renewFonts(){shadowMasks.clear();shadowMaskBytes=0;fontGeneration++}
  function maskFor(ctx,text,maxWidth){
    if(!ctx.measureText||!ctx.drawImage)return null;const create=root.OffscreenCanvas?()=>new root.OffscreenCanvas(1,1):root.document?.createElement?()=>root.document.createElement('canvas'):null;if(!create)return null;
    const m=ctx.getTransform?.()||{a:1,b:0,c:0,d:1},density=Math.max(Math.hypot(m.a,m.b),Math.hypot(m.c,m.d)),spread=typeUnitPx()*SHADOW.spread;
    const props=['font','textAlign','textBaseline','direction','fontKerning','fontStretch','fontVariantCaps','letterSpacing','wordSpacing'],key=JSON.stringify([text,maxWidth,spread,density,shadowColor(),...props.map(k=>ctx[k])]);let mask=shadowMasks.get(key);if(mask)return mask;
    const metrics=ctx.measureText(text),left=Math.max(0,metrics.actualBoundingBoxLeft||0),up=Math.max(0,metrics.actualBoundingBoxAscent||0),right=Math.max(metrics.width,metrics.actualBoundingBoxRight||0),down=Math.max(0,metrics.actualBoundingBoxDescent||0),pad=shadowPadding(),w=Math.ceil(left+right+pad*2),h=Math.max(1,Math.ceil(up+down+pad*2)),c=create();c.width=Math.max(1,Math.ceil(w*density));c.height=Math.max(1,Math.ceil(h*density));const x=c.getContext('2d');if(!x)return null;x.setTransform(density,0,0,density,0,0);for(const p of props)if(ctx[p]!==undefined)x[p]=ctx[p];x.fillStyle=x.strokeStyle='#000';x.lineWidth=spread*2;x.lineJoin='round';const args=[text,left+pad,up+pad];if(Number.isFinite(maxWidth))args.push(maxWidth);x.strokeText(...args);x.fillText(...args);const out=create();out.width=c.width;out.height=c.height;const blur=out.getContext('2d');if(!blur||!('filter' in blur))return null;blur.filter='blur('+(typeUnitPx()*SHADOW.blur*density/2)+'px)';blur.drawImage(c,0,0);blur.filter='none';blur.globalCompositeOperation='source-in';blur.fillStyle=shadowColor();blur.fillRect(0,0,out.width,out.height);mask={c:out,w,h,ox:left+pad,oy:up+pad};const bytes=c.width*c.height*4;while(shadowMasks.size&&(shadowMasks.size>=256||shadowMaskBytes+bytes>8*1024*1024)){const first=shadowMasks.keys().next().value;shadowMaskBytes-=shadowMasks.get(first).bytes;shadowMasks.delete(first);}mask.bytes=bytes;if(bytes<=8*1024*1024){shadowMasks.set(key,mask);shadowMaskBytes+=bytes;}return mask;
  }
  function fillText(ctx,text,x,y,maxWidth){ctx.save();try{const mask=maskFor(ctx,text,maxWidth);shadow(ctx);if(mask){ctx.shadowColor='transparent';const unit=typeUnitPx();ctx.drawImage(mask.c,x-mask.ox+SHADOW.x*unit,y-mask.oy+SHADOW.y*unit,mask.w,mask.h);}const args=[text,x,y];if(Number.isFinite(maxWidth))args.push(maxWidth);ctx.fillText(...args)}finally{ctx.restore()}}

  const MAP={'ß':'ss','ẞ':'SS'};
  const ANY=/[ßẞ]|[aouAOU]\u0308/,ALL=/[ßẞ]/g;
  const SKIP=new Set(['SCRIPT','STYLE','TEXTAREA','INPUT','NOSCRIPT']);
  function fold(text){return typeof text==='string'&&ANY.test(text)?text.normalize('NFC').replace(ALL,c=>MAP[c]):text}
  function skipped(el){return !el||SKIP.has(el.tagName)||!!el.closest?.('[data-type-fold="off"]')}
  function foldNode(node){
    if(!node)return;
    if(node.nodeType===3){if(ANY.test(node.data)&&!skipped(node.parentElement))node.data=fold(node.data);return}
    if(node.nodeType!==1||skipped(node))return;
    for(const child of node.childNodes)foldNode(child);
  }
  function faceUrl(doc,member){
    const el=doc.getElementById('display-dependencies');if(!el)return null;
    let deps;try{deps=JSON.parse(el.textContent)}catch(_){return null}
    const dep=deps?.[IDENTITY];return dep?new URL(dep.base+member,doc.baseURI).href:null;
  }
  let started=false;
  function start(){
    if(started||typeof document!=='object')return;started=true;
    document.documentElement.style.setProperty('--type-unit',(GRID.typeUnitRatio*100)+'vmax');
    root.addEventListener('resize',renewFonts,{passive:true});
    if(root.FontFace&&document.fonts)for(const [family,member] of FACES){
      const url=faceUrl(document,member);if(!url)continue;
      const face=new root.FontFace(family,`url("${url}") format("woff2")`,{display:'swap'});
      document.fonts.add(face);face.load().catch(()=>{});
    }
    document.fonts?.addEventListener?.('loadingdone',renewFonts);document.fonts?.ready?.then?.(renewFonts);
    foldNode(document.body);
    new root.MutationObserver(records=>{
      for(const r of records){if(r.type==='characterData')foldNode(r.target);else for(const n of r.addedNodes)foldNode(n)}
    }).observe(document.body,{subtree:true,childList:true,characterData:true});
  }
  return Object.freeze({IDENTITY,rankFactor,rankVar,rankCss,rootRemPx,typeUnitPx,rankPx,SHADOW,SHADOW_RGB,fontEpoch,shadowColor,shadowPadding,cssShadow,shadow,fillText,fold,foldNode,faceUrl,start});
});
