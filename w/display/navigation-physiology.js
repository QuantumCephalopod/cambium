/* Display navigation physiology — realized-only structure, inspect != commit.
 * Renderer-independent core extracted from the accepted WebGL navigation specimen.
 * This module must never synthesize unrealized recursive rank.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SSSDisplayNavigation = api;
})(globalThis, function () {
  'use strict';

  const GENES = Object.freeze(['w', 'x', 'z', 'y']);
  const V0 = Object.freeze([[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]].map(v => {
    const m = Math.hypot(...v);
    return Object.freeze(v.map(n => n / m));
  }));

  const add = (a,b) => a.map((x,i) => x + b[i]);
  const mul = (a,s) => a.map(x => x * s);
  const mid = (a,b) => mul(add(a,b), .5);
  const centroid = t => t.reduce((s,p) => add(s,p), [0,0,0]).map(v => v / 4);
  const splitTet = t => GENES.map((_,i) => t.map((p,j) => i === j ? p : mid(t[i],p)));
  const hasFullSplit = node => !!node && !!node.children && GENES.every(g => node.children[g]);

  function collectStructure(rootNode) {
    const leaves = [], addresses = [];
    function walk(node, tet, path) {
      const center = centroid(tet);
      if (path) addresses.push({path, node, tet, center});
      if (hasFullSplit(node)) {
        const children = splitTet(tet);
        GENES.forEach((g,i) => walk(node.children[g], children[i], path + g));
      } else {
        leaves.push({path, node, tet, center});
      }
    }
    walk(rootNode, V0, '');
    return {leaves, addresses};
  }

  function addressRecord(structure, path) {
    return structure.addresses.find(a => a.path === path) || null;
  }

  function focusTarget(structure, path) {
    const record = addressRecord(structure, path);
    if (!record) return {center:[0,0,0], scale:1};
    return {center:[...record.center], scale:Math.min(9, 1.02 * Math.pow(2, path.length))};
  }

  function velocity(value, max=.86, dead=.035) {
    const v = Math.max(-1, Math.min(1, Number(value) || 0));
    const a = Math.abs(v);
    if (a <= dead) return 0;
    const n = (a - dead) / (1 - dead);
    return Math.sign(v) * Math.pow(n, 1.75) * max;
  }

  /* Axis pointer mapping is deliberately separable.
   * x reads only pointerX; y reads only pointerY.
   */
  function axisValue(axis, bounds, pointerX, pointerY) {
    if (!bounds || !Number.isFinite(bounds.left) || !Number.isFinite(bounds.top) ||
        !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height)) return 0;
    if (axis === 'x') {
      return Math.max(-1, Math.min(1, (pointerX - (bounds.left + bounds.width/2)) / (bounds.width * .43)));
    }
    if (axis === 'y') {
      return Math.max(-1, Math.min(1, ((bounds.top + bounds.height/2) - pointerY) / (bounds.height * .43)));
    }
    throw new Error('axis must be x or y');
  }

  function createState(rootNode) {
    const structure = collectStructure(rootNode);
    let page = '', view = '';
    const axes = {x:0, y:0};

    function exists(path) { return !!addressRecord(structure, path); }
    return Object.freeze({
      structure,
      get page(){ return page; },
      get view(){ return view; },
      get axes(){ return {...axes}; },
      inspect(path){
        if (!exists(path)) return false;
        view = path;
        return true;
      },
      clearInspection(){ view = page; },
      commit(){
        if (!view || view === page || !exists(view)) return false;
        page = view;
        return true;
      },
      leave(){ page = ''; view = ''; },
      setAxis(axis, value){
        if (!(axis in axes)) throw new Error('axis must be x or y');
        axes[axis] = Math.max(-1, Math.min(1, Number(value) || 0));
      },
      releaseAxis(axis){
        if (!(axis in axes)) throw new Error('axis must be x or y');
        axes[axis] = 0;
      },
      angularVelocity(){ return {yaw:velocity(axes.x), pitch:velocity(axes.y)}; },
      target(){ return focusTarget(structure, view || page); }
    });
  }

  return Object.freeze({GENES, V0, hasFullSplit, splitTet, centroid, collectStructure,
    addressRecord, focusTarget, velocity, axisValue, createState});
});
