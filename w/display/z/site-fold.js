/* Canonical site transition: four screen facets close onto the chosen global
 * navigation target, the encounter swap occurs under closure, then the new
 * organism is revealed by the inverse opening motion.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.SSSSiteFold=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';

  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const nextFrame=()=>typeof requestAnimationFrame==='function'?new Promise(resolve=>requestAnimationFrame(()=>resolve())):wait(0);
  const finite=(v,fallback)=>Number.isFinite(Number(v))?Number(v):fallback;

  function sequence(){
    return Object.freeze(['open','closing','closed','opening','open']);
  }

  function createFold(layer, options={}){
    if(!layer || !layer.dataset) throw new TypeError('fold layer element required');
    const reduced=options.reduced ?? (typeof matchMedia==='function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const duration=reduced?40:1650;
    let particles=null;
    const material=globalThis.SSSSiteFoldParticles||(typeof module==='object'&&module.exports?require('./site-fold-particles.js'):null);
    let busy=false;
    globalThis.addEventListener?.('pagehide',()=>{particles?.dispose();particles=null});

    function prepare(context={}){
      const viewportW=typeof innerWidth==='number'?innerWidth:1000;
      const viewportH=typeof innerHeight==='number'?innerHeight:700;
      const x=Math.max(0,Math.min(viewportW,finite(context.origin?.x,viewportW/2)));
      const y=Math.max(0,Math.min(viewportH,finite(context.origin?.y,viewportH/2)));
      if(layer.style?.setProperty){layer.style.setProperty('--fold-x',x+'px');layer.style.setProperty('--fold-y',y+'px')}
      if(!particles)particles=material?.create?.(layer)||null;
      particles?.prepare(viewportW,viewportH,{x,y});
      layer.style?.setProperty?.('--fold-duration',duration+'ms');
      layer.dataset.from=String(context.from??'');
      layer.dataset.to=String(context.to??'');
    }

    async function swap(mutator, context={}){
      if(busy) return false;
      busy=true;prepare(context);
      try{
        layer.dataset.fold='open';
        layer.hidden=false;
        await nextFrame();
        layer.dataset.fold='closing';
        context.onClosing?.(duration);
        if(particles&&!reduced)await particles.animate(1,duration);else{particles?.paint(1);await wait(duration);}
        layer.dataset.fold='closed';
        if(typeof mutator==='function') await mutator();
        await nextFrame();
        layer.dataset.fold='opening';
        if(particles&&!reduced)await particles.animate(0,duration);else{particles?.paint(0);await wait(duration);}
        return true;
      }finally{
        particles?.stop();particles?.paint(0);
        layer.dataset.fold='open';
        layer.hidden=true;
        busy=false;
      }
    }

    return Object.freeze({swap,get busy(){return busy;},sequence});
  }

  return Object.freeze({createFold,sequence});
});
