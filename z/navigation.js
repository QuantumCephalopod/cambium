/* One atlas, one navigation. Names belong to full realized prefixes; genes do
 * not serve as display labels. Synthetic geometry is confined to test inputs.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./address.js'));
  else root.CambiumNavigation = factory(root.CambiumAddress);
})(typeof globalThis === 'object' ? globalThis : this, function (A) {
  'use strict';
  const registryCache = new WeakMap();
  const ROUTE_BUDGET = 4096; // finite interaction budget, not geometric depth
  const url = (_mode, path) => '#/' + A.display(A.stripSelf(path));
  function parse(hash) {
    if (!hash || hash === '#' || hash === '#/') return {mode:'site', path:''};
    if (hash === '#main') return {anchor:true};
    // Keep earlier genuine site links usable, but retire the public demo namespace.
    const match = /^#\/(?:site\/)?([wxzy.]*)$/.exec(hash);
    if (!match) throw new Error('this link does not identify a place in this website');
    if (match[1].length > ROUTE_BUDGET * 2) throw new Error('this address exceeds the browser interaction budget');
    if (match[1] && !/^[wxzy](?:\.?[wxzy])*$/.test(match[1])) throw new Error('the address has an empty step');
    const path = match[1].replaceAll('.', '');
    if (path.length > ROUTE_BUDGET) throw new Error('this address exceeds the browser interaction budget');
    return {mode:'site',path:A.stripSelf(path)};
  }
  function registry(index) {
    if (registryCache.has(index)) return registryCache.get(index);
    const nodes = new Map(), byLocus = new Map();
    for (const n of index.nodes) {
      A.validate(n.path);
      if (typeof n.name !== 'string' || !n.name.trim()) throw new Error('a realized place needs its own derived name');
      if (n.path !== A.stripSelf(n.path) && n.role !== 'router') throw new Error('self membranes are not additional semantic nodes');
      if (n.role === 'router' && (n.children.length || (n.occupants || []).length)) throw new Error('a repeated-self membrane is navigation wood only');
      if (nodes.has(n.path)) throw new Error('duplicate address ' + n.path);
      if (n.locus !== A.key(n.path)) throw new Error('incorrect geometric locus ' + n.path);
      nodes.set(n.path,n);
      const bucket=byLocus.get(n.locus)||[], p=A.stripSelf(n.path);
      if(!bucket.includes(p))bucket.push(p); byLocus.set(n.locus,bucket);
    }
    if(!nodes.has(''))throw new Error('missing overview');
    for(const n of nodes.values()) {
      if(n.path && (!nodes.has(n.path.slice(0,-1)) || !nodes.get(n.path.slice(0,-1)).children.includes(n.path)))throw new Error('orphan prefix '+n.path);
      if(n.children.length && (n.children.length!==4 || !n.split_receipt))throw new Error('a realized split needs four positions and its receipt');
      for(const g of A.GENES)if(n.children.length && (!n.children.includes(n.path+g)||!nodes.has(n.path+g)))throw new Error('incomplete split '+n.path);
    }
    const result={nodes,byLocus};registryCache.set(index,result);return result;
  }
  function resolve(mode, word, index) {
    if(mode!=='site')throw new Error('the website has one atlas');
    const path=A.stripSelf(word);
    if(path.length>ROUTE_BUDGET)throw new Error('this address exceeds the browser interaction budget');
    const r=registry(index),node=r.nodes.get(path);
    if(!node)throw new Error('this place has not yet been differentiated');
    return {mode:'site',path,locus:node.locus,node,aliases:[...(r.byLocus.get(node.locus)||[])].sort(A.compare),
      children:node.children.map(raw=>({gene:raw.at(-1),path:A.stripSelf(raw),self:path!==''&&A.same(raw,path),name:r.nodes.get(raw).name}))};
  }
  function trails(state,index) {
    const r=registry(index);
    return state.aliases.map(path=>({path,active:path===state.path,
      steps:A.prefixes(path).map(p=>({path:p,symbol:p.at(-1),href:url('site',p),label:r.nodes.get(p).name,
        current:p===state.path&&path===state.path}))}));
  }
  function namePath(word,index) {
    const r=registry(index);
    return [r.nodes.get('').name,...A.prefixes(word).map(p=>{
      const n=r.nodes.get(p);if(!n)throw new Error('unrealized named prefix');return n.name;
    })].join(' · ');
  }
  return Object.freeze({ROUTE_BUDGET,url,parse,registry,resolve,trails,namePath});
});
