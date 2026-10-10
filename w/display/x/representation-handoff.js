/* Representation continuity: key is owner-supplied identity + revision + resolution.
 * A live representation stays valid while another is queued or fails. This module
 * knows no site, media type, depth, addresses or rendering surface.
 * Instances recur at any membrane/rank; the caller chooses perceptual resolution.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SSSRepresentationHandoff=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  function create({limit=4,active=true}={}){
    if(!Number.isInteger(limit)||limit<1)throw new RangeError('handoff concurrency must be positive');
    const records=new Map(),queue=[];let running=0,open=active!==false;
    function dispose(rec,value){
      try{rec.dispose?.(value)}catch(error){/* retirement never destabilizes the next witness */console.warn?.('representation retire failed',error)}
    }
    function pump(){
      while(open&&running<limit&&queue.length){
        const rec=queue.shift();
        if(records.get(rec.key)!==rec||rec.status!=='queued')continue;
        rec.status='loading';running++;
        let value;
        try{value=rec.acquire()}catch(error){value=Promise.reject(error)}
        Promise.resolve(value).then(result=>{
          if(records.get(rec.key)!==rec||rec.status==='retired'){dispose(rec,result);return}
          rec.status='ready';rec.value=result;rec.resolve(result);
        },error=>{
          if(records.get(rec.key)!==rec||rec.status==='retired')return;
          rec.status='failed';rec.error=error;rec.reject(error);
        }).finally(()=>{running--;pump()});
      }
    }
    function request(key,acquire,{dispose:release}={}){
      if(typeof key!=='string'||!key||typeof acquire!=='function')throw new TypeError('representation requires stable key and acquisition function');
      const previous=records.get(key);
      if(previous&&previous.status!=='failed')return previous;
      if(previous)records.delete(key); // Retry failed detail without changing fallback identity.
      let resolve,reject;
      const promise=new Promise((ok,bad)=>{resolve=ok;reject=bad});
      promise.catch(()=>{}); // Callers may inspect status without awaiting a failing image.
      const rec={key,status:'queued',value:null,error:null,promise,resolve,reject,acquire,dispose:release};
      records.set(key,rec);queue.push(rec);pump();return rec;
    }
    function retire(key){
      const rec=records.get(key);if(!rec)return false;
      records.delete(key);
      if(rec.status==='ready')dispose(rec,rec.value);
      else if(rec.status==='queued'||rec.status==='loading'){
        rec.status='retired';rec.reject(new Error('representation retired: '+key));
      }
      return true;
    }
    function clear(){for(const key of [...records.keys()])retire(key);queue.length=0}
    function setActive(next){open=Boolean(next);pump()}
    function best(keys){
      for(const key of keys||[]){const rec=records.get(key);if(rec?.status==='ready')return rec}
      return null;
    }
    function pending(){return [...records.values()].filter(x=>x.status==='queued'||x.status==='loading').map(x=>x.key)}
    return Object.freeze({request,get:key=>records.get(key)||null,best,retire,clear,setActive,pending,
      get active(){return open},get running(){return running}});
  }
  return Object.freeze({create});
});
