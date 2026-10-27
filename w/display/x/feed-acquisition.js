/* Transport only: owner preparation stays local. The same asset is the Worker
 * entry point. Acknowledged batches avoid one large structured-clone delivery. */
(function(root){
 'use strict';
 async function read(url,report){
  const response=await root.fetch(url,{credentials:'same-origin',cache:'force-cache'});
  if(!response.ok)throw Error('feed HTTP '+response.status);
  report(.1);
  // Milestones, not byte percentages: streams may be decompressed while the
  // Content-Length header describes the compressed wire representation.
  const text=await response.text();report(.45);
  const detail=JSON.parse(text);report(.55);return detail;
 }
 const workerScope=typeof root.document==='undefined'&&typeof root.postMessage==='function'&&typeof root.importScripts==='function';
 if(workerScope){
  let acknowledge=null;
  root.onmessage=async event=>{
   if(event.data.ack){const done=acknowledge;acknowledge=null;done?.();return}
   try{
    const url=new URL(event.data.url);if(url.origin!==root.location.origin)throw Error('feed origin refused');
    const detail=await read(url.href,progress=>root.postMessage({progress}));
    // Small source subtrees travel intact, avoiding a second object per scalar.
    // Large containers unfold through the same depth-first cursor at any rank.
    const footprint=value=>{const todo=[value];let count=0,bytes=0;
      while(todo.length){const v=todo.pop();if(++count>128)return null;bytes+=64;
       if(typeof v==='string')bytes+=v.length*4;
       else if(v!==null&&typeof v==='object'){const keys=Object.keys(v);if(keys.length>128)return null;for(const key of keys){bytes+=key.length*4;todo.push(v[key])}}
       if(bytes>32768)return null;
      }return bytes;
    };
    // At most one acknowledged 64-record/~64KiB batch is in flight. A single
    // authored scalar remains atomic; complete source storage is still real.
    const stack=[{value:detail,parent:null,key:null}];let nextId=0,batch=[],batchBytes=0;
    const send=()=>new Promise(resolve=>{acknowledge=resolve;root.postMessage({nodes:batch});batch=[];batchBytes=0});
    while(stack.length){
     const frame=stack.at(-1);
     if(!frame.entered){
      frame.id=nextId++;frame.entered=true;
      const size=footprint(frame.value),object=size===null&&frame.value!==null&&typeof frame.value==='object';
      if(batch.length&&batchBytes+(size||128)>65536)await send();
      batch.push({id:frame.id,parent:frame.parent,key:frame.key,kind:object?(Array.isArray(frame.value)?'array':'object'):'value',value:object?null:frame.value});batchBytes+=size||128;
      if(object){frame.keys=Array.isArray(frame.value)?null:Object.keys(frame.value);frame.length=frame.keys?frame.keys.length:frame.value.length;frame.index=0}else stack.pop();
      if(batch.length===64)await send();
     }else if(frame.index<frame.length){const key=frame.keys?frame.keys[frame.index]:frame.index;frame.index++;stack.push({value:frame.value[key],parent:frame.id,key})}
     else{batch.push({id:frame.id,kind:'end'});stack.pop();if(batch.length===64)await send()}
    }
    if(batch.length)await send();root.postMessage({complete:true});
   }catch(error){root.postMessage({error:String(error?.message||error)})}
  };return;
 }
 const workerURL=root.document?.currentScript?.src;
 function acquire(url,{onProgress=()=>{}}={}){
  let worker;
  if(typeof root.Worker==='function'&&workerURL){try{worker=new root.Worker(workerURL)}catch(_){/* absent capability uses the same read boundary */}}
  if(!worker)return read(url,onProgress);
  return new Promise((resolve,reject)=>{
   const objects=new Map();let detail;
   const end=(fn,value)=>{worker.terminate();objects.clear();fn(value)};
   worker.onmessage=event=>{
    try{
     const data=event.data;
     if(data.error)end(reject,Error(data.error));
     else if(data.complete){onProgress(.6);end(resolve,detail)}
     else if(data.nodes){
      for(const node of data.nodes){
       if(node.kind==='end'){objects.delete(node.id);continue}
       const value=node.kind==='array'?[]:node.kind==='object'?{}:node.value;
       if(node.kind!=='value')objects.set(node.id,value);
       if(node.parent===null)detail=value;
       else Object.defineProperty(objects.get(node.parent),node.key,{value,enumerable:true,writable:true,configurable:true});
      }
      worker.postMessage({ack:true});
     }else if(Number.isFinite(data.progress))onProgress(data.progress);
    }catch(error){end(reject,error)}
   };
   worker.onerror=()=>end(reject,Error('feed worker unavailable'));
   worker.postMessage({url:String(url)});
  });
 }
 const api=Object.freeze({acquire});
 if(typeof module==='object'&&module.exports)module.exports=api;else root.SSSFeedAcquisition=api;
})(typeof globalThis==='object'?globalThis:this);
