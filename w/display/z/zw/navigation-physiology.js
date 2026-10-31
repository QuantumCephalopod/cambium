/* Display navigation physiology — one realized tetrahedral field, inspect != enter.
 * Semantic places are exact address loci/vertices; camera focus is the centroid of
 * the recursive split-tetrahedron anchored by the selected address.
 */
(function (root, factory) {
  'use strict';
  const address = (typeof module === 'object' && module.exports)
    ? require('../../../../z/address.js')
    : root.CambiumAddress;
  const api = factory(address);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SSSDisplayNavigation = api;
})(typeof globalThis === 'object' ? globalThis : this, function (A) {
  'use strict';
  if (!A || typeof A.barycentric !== 'function') throw new Error('CambiumAddress geometry is required');

  const GENES = Object.freeze(['w', 'x', 'z', 'y']);
  const V0 = Object.freeze([[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]].map(v => {
    const m = Math.hypot(...v);
    return Object.freeze(v.map(n => n / m));
  }));

  const add = (a,b) => a.map((x,i) => x + b[i]);
  const mul = (a,s) => a.map(x => x * s);
  const mid = (a,b) => mul(add(a,b), .5);
  const centroid = t => t.reduce((s,p) => add(s,p), [0,0,0]).map(v => v / 4);
  function childTet(tet, gene) {
    const i = GENES.indexOf(gene);
    if (i < 0) throw new Error('Unknown tetrahedral gene: ' + gene);
    return tet.map((p,j) => i === j ? p : mid(tet[i],p));
  }
  const splitTet = t => GENES.map(g => childTet(t,g));
  // A raw recursive cell in any lent parent frame; no owner layout or route.
  function cellTet(path, parent=V0) {
    A.validate(path);
    let tet=parent.map(v=>[...v]);
    for (const gene of path) tet=childTet(tet,gene);
    return tet;
  }
  const hasFullSplit = node => !!node && !!node.children && GENES.every(g => node.children[g]);
  const addressIndexes = new WeakMap();

  function semanticPoint(path) {
    A.validate(path);
    if (!path) return [0,0,0];
    const bary=A.barycentric(path);
    return [0,1,2].map(axis=>bary.reduce((sum,w,i)=>sum+w*V0[i][axis],0));
  }

  function collectStructure(rootNode) {
    const leaves = [], addresses = [], byAddress = new Map();
    const pending = [{node:rootNode, tet:V0, path:''}];
    while (pending.length) {
      const {node, tet, path} = pending.pop();
      const center = centroid(tet);
      if (path) {
        const record = {path, node, tet, center, point:semanticPoint(path), locus:A.key(path)};
        addresses.push(record); byAddress.set(path, record);
      }
      if (hasFullSplit(node)) {
        const children = splitTet(tet);
        for (let i=GENES.length-1;i>=0;i--) {
          const g=GENES[i];
          pending.push({node:node.children[g], tet:children[i], path:path+g});
        }
      } else {
        leaves.push({path, node, tet, center});
      }
    }
    const structure = {leaves, addresses};
    addressIndexes.set(structure, byAddress);
    return structure;
  }

  function addressRecord(structure, path) {
    const index = addressIndexes.get(structure);
    if (index) return index.get(path) || null;
    // Preserve uncollected legacy carriers without caching their mutable arrays.
    return structure.addresses.find(a => a.path === path) || null;
  }

  function cellForPath(path) {
    const tet=cellTet(path);
    return {path,tet,center:centroid(tet),point:semanticPoint(path),locus:path?A.key(path):'overview'};
  }

  /* One host-space body frame for the actual field and its global compass.
   * Content refines inward two ranks below its realized containing cell. */
  function bodyPlacement(structure,raw) {
    const realized=new Set(structure.addresses.map(a=>a.path));
    // The actual mount realizes its containing path even when the overview's
    // semantic specimen has no corresponding descendants. Never enlarge a deep
    // site to its nearest authored Philosophy cell.
    let p=raw;
    if(p)while(realized.has(p+p.at(-1)))p+=p.at(-1);
    const center=cellForPath(p).center;
    return Object.freeze({cell:p,center:[...center],k:Math.pow(2,-(p.length+2))});
  }
  function hash32(text) {
    let h=2166136261>>>0;
    for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)>>>0}
    h^=h>>>16;h=Math.imul(h,0x7feb352d)>>>0;h^=h>>>15;h=Math.imul(h,0x846ca68b)>>>0;h^=h>>>16;
    return h>>>0;
  }
  function random01(text,salt){return (hash32(text+'·'+salt)+1)/4294967297}
  function sampleTet(tet,id,inset=.22) {
    let weights=[0,1,2,3].map(i=>-Math.log(Math.max(1e-7,random01(id,i))));
    const sum=weights.reduce((a,b)=>a+b,0);weights=weights.map(v=>v/sum);weights=weights.map(v=>(1-inset)*v+inset*.25);
    return [0,1,2].map(k=>weights.reduce((s,w,i)=>s+w*tet[i][k],0));
  }
  function bodyDrift(place,id) {
    const cell=cellForPath(place.cell),c=cell.center,room=Math.max(0,1-place.k/Math.pow(2,-place.cell.length));
    const tet=cell.tet.map(v=>v.map((x,j)=>c[j]+(x-c[j])*room));
    return {base:place.center,points:[0,1,2,3].map(i=>sampleTet(tet,id+'·drift-'+i)),phase:random01(id,'drift-phase')*4,speed:.72+.56*random01(id,'drift-speed')};
  }
  function bodyPosition(d,ms) {
    const u=((ms/42000)*d.speed+d.phase)%4,i=Math.floor(u),f=u-i,t=f<=0?0:f>=1?1:f*f*(3-2*f),a=d.points[i],b=d.points[(i+1)%4];
    return a.map((v,j)=>v+(b[j]-v)*t);
  }

  /* The address/locus remains a vertex. The camera instead frames the recursive
   * tetrahedral cell rooted at that address. That keeps the selected continuation
   * and its three peer directions perceptually co-equal rather than throwing the
   * camera onto an outer vertex. Each additional address step halves the cell, so
   * rank-local zoom compensates by 2^rank.
   */
  function focusTarget(structure, path) {
    const record = addressRecord(structure, path);
    if (!record) return {center:[0,0,0], scale:1};
    return {center:[...record.center], scale:1.02 * Math.pow(2, path.length)};
  }

  function velocity(value, max=.86, dead=.035) {
    const v = Math.max(-1, Math.min(1, Number(value) || 0));
    const a = Math.abs(v);
    if (a <= dead) return 0;
    const n = (a - dead) / (1 - dead);
    return Math.sign(v) * Math.pow(n, 1.75) * max;
  }

  function axisValue(axis, bounds, pointerX, pointerY) {
    if (!bounds || !Number.isFinite(bounds.left) || !Number.isFinite(bounds.top) ||
        !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height)) return 0;
    if (axis === 'x') return Math.max(-1, Math.min(1, (pointerX - (bounds.left + bounds.width/2)) / (bounds.width * .43)));
    if (axis === 'y') return Math.max(-1, Math.min(1, ((bounds.top + bounds.height/2) - pointerY) / (bounds.height * .43)));
    throw new Error('axis must be x or y');
  }

  function createState(rootNode) {
    const structure = collectStructure(rootNode);
    let view = '';
    const axes = {x:0, y:0};
    function exists(path) { return !!addressRecord(structure, path); }
    return Object.freeze({
      structure,
      get view(){ return view; },
      get page(){ return ''; },
      get axes(){ return {...axes}; },
      inspect(path){ if (!exists(path)) return false; view = path; return true; },
      clearInspection(){ view = ''; },
      setAxis(axis, value){ if (!(axis in axes)) throw new Error('axis must be x or y'); axes[axis] = Math.max(-1, Math.min(1, Number(value) || 0)); },
      releaseAxis(axis){ if (!(axis in axes)) throw new Error('axis must be x or y'); axes[axis] = 0; },
      angularVelocity(){ return {yaw:velocity(axes.x), pitch:velocity(axes.y)}; },
      target(){ return focusTarget(structure, view); }
    });
  }

  return Object.freeze({GENES,V0,hasFullSplit,childTet,splitTet,cellTet,centroid,semanticPoint,cellForPath,collectStructure,addressRecord,bodyPlacement,bodyDrift,bodyPosition,sampleTet,focusTarget,velocity,axisValue,createState});
});
