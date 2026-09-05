/* One semantic organism, one navigation. The canonical index follows the same
 * recursive w/x/z/y grammar as the body; runtime registries are derived views.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./address.js'));
  else root.CambiumNavigation = factory(root.CambiumAddress);
})(typeof globalThis === 'object' ? globalThis : this, function (A) {
  'use strict';
  const registryCache = new WeakMap();
  const ROUTE_BUDGET = 4096; // finite browser interaction budget, not semantic depth
  const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
  const genes = node => A.GENES.filter(g => own(node,g));
  const url = (_mode, path) => '#/' + A.display(A.validate(path));

  function parse(hash) {
    if (!hash || hash === '#' || hash === '#/') return {mode:'site', path:''};
    if (hash === '#main') return {anchor:true};
    // Keep the earlier /site/ prefix usable; the public demo namespace stays retired.
    const match = /^#\/(?:site\/)?([wxzy.]*)$/.exec(hash);
    if (!match) throw new Error('this link does not identify a place in this website');
    if (match[1].length > ROUTE_BUDGET * 2) throw new Error('this address exceeds the browser interaction budget');
    const path = A.fromDisplay(match[1]);
    if (path.length > ROUTE_BUDGET) throw new Error('this address exceeds the browser interaction budget');
    return {mode:'site', path};
  }

  function registry(index) {
    if (registryCache.has(index)) return registryCache.get(index);
    if (!index || typeof index !== 'object' || Array.isArray(index)) throw new Error('the organism index must be one semantic whole');
    const nodes = new Map(), byLocus = new Map();

    function walk(source, path, parent) {
      A.validate(path);
      if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('a realized place must be a semantic object');
      if (typeof source.name !== 'string' || !source.name.trim()) throw new Error('a realized place needs its own derived name');
      if (typeof source.whole !== 'string' || !source.whole.trim()) throw new Error('a realized place needs its current semantic whole');
      const childGenes = genes(source);
      if (childGenes.length && childGenes.length !== 4) throw new Error('a realized differentiation needs all four CCCC children');
      const tissue = source.tissue === undefined ? {} : source.tissue;
      if (!tissue || typeof tissue !== 'object' || Array.isArray(tissue)) throw new Error('local tissue must be a semantic carrier map');
      for (const [name, carrier] of Object.entries(tissue)) {
        if (!name.trim() || typeof carrier !== 'string' || !carrier.trim()) throw new Error('local tissue needs a semantic name and carrier');
      }
      if (nodes.has(path)) throw new Error('duplicate address '+path);
      const node = {
        path,
        locus:A.key(path),
        name:source.name.trim(),
        whole:source.whole.trim(),
        parent,
        children:childGenes.map(g=>path+g),
        tissue:{...tissue},
        source
      };
      nodes.set(path,node);
      const bucket=byLocus.get(node.locus)||[];bucket.push(path);byLocus.set(node.locus,bucket);
      for (const g of childGenes) walk(source[g], path+g, path);
    }

    walk(index,'',null);
    const result={nodes,byLocus};registryCache.set(index,result);return result;
  }

  function resolve(mode, word, index) {
    if (mode !== 'site') throw new Error('the website has one atlas');
    const path=A.validate(word);
    if (path.length > ROUTE_BUDGET) throw new Error('this address exceeds the browser interaction budget');
    const r=registry(index),node=r.nodes.get(path);
    if (!node) throw new Error('this place has not yet been differentiated');
    // Geometry can share a locus without semantic coalescence. Alternate trails are
    // exposed only when independently realized witnesses carry the same semantic whole.
    const aliases=(r.byLocus.get(node.locus)||[]).filter(p=>{
      const other=r.nodes.get(p);return other.name===node.name&&other.whole===node.whole;
    }).sort(A.compare);
    return {mode:'site',path,locus:node.locus,node,aliases,
      children:node.children.map(raw=>({gene:raw.at(-1),path:raw,self:path!==''&&A.same(raw,path),name:r.nodes.get(raw).name}))};
  }

  function trails(state,index) {
    const r=registry(index);
    return state.aliases.map(path=>({path,active:path===state.path,
      steps:A.prefixes(path).map(p=>({path:p,symbol:p.at(-1),href:url('site',p),label:r.nodes.get(p).name,
        current:p===state.path&&path===state.path}))}));
  }

  function namePath(word,index) {
    const r=registry(index),path=A.validate(word);
    return [r.nodes.get('').name,...A.prefixes(path).map(p=>{
      const n=r.nodes.get(p);if(!n)throw new Error('unrealized named prefix');return n.name;
    })].join(' · ');
  }

  return Object.freeze({ROUTE_BUDGET,url,parse,registry,resolve,trails,namePath});
});
