/* Display site-holon primitive v0.
 * Stable site identity is mounted into quotient loci; raw paths remain witnesses.
 */
(function (root, factory) {
  'use strict';
  const address = (typeof module === 'object' && module.exports)
    ? require('../../z/address.js')
    : root.CambiumAddress;
  const api = factory(address);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SSSSiteHolon = api;
})(typeof globalThis === 'object' ? globalThis : this, function (A) {
  'use strict';
  if (!A || typeof A.key !== 'function' || typeof A.witnesses !== 'function') {
    throw new Error('CambiumAddress quotient is required');
  }

  const SITE_ID = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,200}$/;

  function siteId(value) {
    if (typeof value !== 'string' || !SITE_ID.test(value)) throw new TypeError('site identity must be a stable literal id');
    return value;
  }

  function resolvePath(rawPath) {
    A.validate(rawPath);
    const witness = A.stripSelf(rawPath);
    return Object.freeze({
      rawPath,
      witness,
      locus: A.key(rawPath),
      equivalentWitnesses: Object.freeze(A.witnesses(rawPath).slice())
    });
  }

  function defineSite(spec) {
    if (!spec || typeof spec !== 'object') throw new TypeError('site spec required');
    const id = siteId(spec.id);
    const state = spec.state && typeof spec.state === 'object' ? spec.state : {};
    return Object.freeze({
      id,
      shader: spec.shader || null,
      manifestation: spec.manifestation || null,
      state
    });
  }

  function composeChambers(chambers, viewport) {
    const active = chambers.filter(c => c.interlocutor != null);
    if (active.length <= 1) return Object.freeze({mode:'single',axis:null,active:Object.freeze(active.slice())});
    if (active.length > 2) throw new RangeError('v0 site-holon supports at most two populated reciprocal witness chambers');
    const width = Math.max(0, Number(viewport?.width) || 0);
    const height = Math.max(0, Number(viewport?.height) || 0);
    const axis = width >= height ? 'vertical' : 'horizontal';
    return Object.freeze({mode:'split',axis,active:Object.freeze(active.slice())});
  }

  function createRegistry() {
    const sites = new Map();
    const mounts = new Map();
    const loci = new Map();

    function register(site) {
      if (!site || typeof site !== 'object') throw new TypeError('site object required');
      siteId(site.id);
      if (sites.has(site.id) && sites.get(site.id) !== site) throw new Error('site identity already registered: ' + site.id);
      sites.set(site.id, site);
      return site;
    }

    function normalizeChamber(entry) {
      if (!entry || typeof entry !== 'object') throw new TypeError('witness chamber required');
      const r = resolvePath(entry.witness);
      return Object.freeze({
        rawWitness: entry.witness,
        witness: r.witness,
        locus: r.locus,
        interlocutor: entry.interlocutor ?? null
      });
    }

    function mount(id, entries) {
      siteId(id);
      const site = sites.get(id);
      if (!site) throw new Error('unknown site identity: ' + id);
      if (!Array.isArray(entries) || entries.length < 1) throw new TypeError('mount needs at least one witness');
      const chambers = entries.map(normalizeChamber);
      const locus = chambers[0].locus;
      if (chambers.some(c => c.locus !== locus)) throw new Error('one site mount must occupy exactly one quotient locus');
      const witnessNames = new Set(chambers.map(c => c.witness));
      if (witnessNames.size !== chambers.length) throw new Error('duplicate witness chamber');
      if (witnessNames.size > 2) throw new RangeError('v0 reciprocal locus supports at most two witness chambers');
      const occupied = loci.get(locus);
      if (occupied && occupied !== id) throw new Error('locus already occupied by another site identity: ' + locus);
      const previous = mounts.get(id);
      if (previous) loci.delete(previous.locus);
      const relation = Object.freeze({siteId:id,locus,chambers:Object.freeze(chambers)});
      mounts.set(id, relation);
      loci.set(locus, id);
      return relation;
    }

    function unmount(id) {
      const relation = mounts.get(id);
      if (!relation) return false;
      mounts.delete(id); loci.delete(relation.locus); return true;
    }

    function resolve(rawPath, viewport={width:0,height:0}) {
      const route = resolvePath(rawPath);
      const id = loci.get(route.locus);
      if (!id) return null;
      const site = sites.get(id), relation = mounts.get(id);
      const chamber = relation.chambers.find(c => c.witness === route.witness) || null;
      return Object.freeze({
        site,
        siteId:id,
        locus:relation.locus,
        rawPath:route.rawPath,
        witness:route.witness,
        enteredThrough:route.witness,
        chamber,
        chambers:relation.chambers,
        composition:composeChambers(relation.chambers, viewport)
      });
    }

    function snapshot(id, enteredThrough='', viewport={width:0,height:0}) {
      siteId(id);
      const site = sites.get(id), relation = mounts.get(id);
      if (!site || !relation) return null;
      const chamber = enteredThrough ? relation.chambers.find(c => c.witness === A.stripSelf(enteredThrough)) || null : null;
      return Object.freeze({site,siteId:id,locus:relation.locus,enteredThrough,chamber,chambers:relation.chambers,composition:composeChambers(relation.chambers,viewport)});
    }

    return Object.freeze({register,mount,unmount,resolve,snapshot,getSite:id=>sites.get(id)||null,getMount:id=>mounts.get(id)||null});
  }

  return Object.freeze({resolvePath, defineSite, composeChambers, createRegistry});
});
