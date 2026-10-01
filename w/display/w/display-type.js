/* Display's main type: Philipp's SpriteSheet face, resolved by stable identity through the Display
 * dependency projection, never by path. Its alphabet is A-Z and space, so rendered text is folded into
 * it (Ä→AE, Ö→OE, Ü→UE, ß→SS, case kept); digits and marks fall back glyph by glyph to the next family.
 * A subtree may keep its own spelling with data-type-fold="off". */
(function(root,factory){
  'use strict';const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{root.SSSDisplayType=api;if(typeof document==='object')api.start()}
})(typeof globalThis==='object'?globalThis:this,function(root){
  'use strict';
  const IDENTITY='@sss/spritesheet';
  const FACES=[['SpriteSheet Mono','SpriteSheet-Mono.woff2'],['SpriteSheet','SpriteSheet-Regular.woff2']];
  const MAP={'Ä':'AE','Ö':'OE','Ü':'UE','ä':'ae','ö':'oe','ü':'ue','ß':'ss','ẞ':'SS'};
  const ANY=/[ÄÖÜäöüßẞ]/,ALL=/[ÄÖÜäöüßẞ]/g;
  const SKIP=new Set(['SCRIPT','STYLE','TEXTAREA','INPUT','NOSCRIPT']);
  function fold(text){return typeof text==='string'&&ANY.test(text)?text.replace(ALL,c=>MAP[c]):text}
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
    if(root.FontFace&&document.fonts)for(const [family,member] of FACES){
      const url=faceUrl(document,member);if(!url)continue;
      const face=new root.FontFace(family,`url("${url}") format("woff2")`,{display:'swap'});
      document.fonts.add(face);face.load().catch(()=>{});
    }
    foldNode(document.body);
    new root.MutationObserver(records=>{
      for(const r of records){if(r.type==='characterData')foldNode(r.target);else for(const n of r.addedNodes)foldNode(n)}
    }).observe(document.body,{subtree:true,childList:true,characterData:true});
  }
  return Object.freeze({IDENTITY,fold,foldNode,faceUrl,start});
});
