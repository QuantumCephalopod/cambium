/* Canonical site transition: four screen facets fold to a tetrahedral liminal state,
 * the mount swap occurs while closed, then the destination unfolds.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.SSSSiteFold=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';

  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  function sequence(){
    return Object.freeze(['open','closing','closed','opening','open']);
  }

  function createFold(layer, options={}){
    if(!layer || !layer.dataset) throw new TypeError('fold layer element required');
    const reduced=options.reduced ?? (typeof matchMedia==='function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const duration=reduced?40:520;
    let busy=false;

    async function swap(mutator){
      if(busy) return false;
      busy=true;
      layer.hidden=false;
      layer.dataset.fold='closing';
      await wait(duration);
      layer.dataset.fold='closed';
      if(typeof mutator==='function') await mutator();
      await wait(reduced?0:36);
      layer.dataset.fold='opening';
      await wait(duration);
      layer.dataset.fold='open';
      layer.hidden=true;
      busy=false;
      return true;
    }

    return Object.freeze({swap,get busy(){return busy;},sequence});
  }

  return Object.freeze({createFold,sequence});
});
