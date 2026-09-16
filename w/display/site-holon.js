/* Display site-holon primitive v2.
 * Page-organisms are stable interlocutors mounted into scoped quotient loci.
 * Raw address occupancy is unique; distinct genealogies may still coalesce by quotient.
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

  const ID = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,200}$/;
  function stableId(value, label='identity') {
    if (typeof value !== 'string' || !ID.test(value)) throw new TypeError(label+' must be a stable literal id');
    return value;
  }
  function scopeId(value) { return stableId(value, 'scope identity'); }

  function resolveAddress(rawPath) {
    A.validate(rawPath);
    const address = A.stripSelf(rawPath);
    return Object.freeze({
      rawPath,
      address,
      locus: A.key(rawPath),
      equivalentAddresses: Object.freeze(A.witnesses(rawPath).slice())
    });
  }

  function defineInterlocutor(spec) {
    if (!spec || typeof spec !== 'object') throw new TypeError('interlocutor spec required');
    const id = stableId(spec.id, 'interlocutor identity');
    const localScope = scopeId(spec.localScope || id);
    const state = spec.state && typeof spec.state === 'object' ? spec.state : {};
    return Object.freeze({id,localScope,shader:spec.shader||null,manifestation:spec.manifestation||null,state});
  }

  function composeInterlocutors(entries, viewport={width:0,height:0}) {
    const active = Array.isArray(entries) ? entries.filter(Boolean) : [];
    if (active.length <= 1) return Object.freeze({mode:'single',axis:null,columns:1,active:Object.freeze(active.slice())});
    const width = Math.max(0, Number(viewport.width) || 0);
    const height = Math.max(0, Number(viewport.height) || 0);
    if (active.length === 2) {
      const axis = width >= height ? 'vertical' : 'horizontal';
      return Object.freeze({mode:'split',axis,columns:axis==='vertical'?2:1,active:Object.freeze(active.slice())});
    }
    const columns = Math.max(1, Math.ceil(Math.sqrt(active.length * Math.max(1,width) / Math.max(1,height))));
    return Object.freeze({mode:'grid',axis:null,columns,active:Object.freeze(active.slice())});
  }

  function locusKey(scope, locus) { return scopeId(scope)+'::'+locus; }
  function rawKey(scope, rawAddress) { return scopeId(scope)+'::raw::'+rawAddress; }

  function createRegistry() {
    const interlocutors = new Map();
    const mounts = new Map();
    const loci = new Map();
    const raws = new Map();

    function register(interlocutor) {
      if (!interlocutor || typeof interlocutor !== 'object') throw new TypeError('interlocutor object required');
      stableId(interlocutor.id, 'interlocutor identity');
      if (interlocutors.has(interlocutor.id) && interlocutors.get(interlocutor.id) !== interlocutor) {
        throw new Error('interlocutor identity already registered: '+interlocutor.id);
      }
      interlocutors.set(interlocutor.id, interlocutor);
      return interlocutor;
    }

    function detach(id) {
      const previous = mounts.get(id);
      if (!previous) return false;
      const key = locusKey(previous.scope, previous.locus);
      const set = loci.get(key);
      if (set) {
        set.delete(id);
        if (!set.size) loci.delete(key);
      }
      raws.delete(rawKey(previous.scope, previous.rawAddress));
      mounts.delete(id);
      return true;
    }

    function mount(id, placement) {
      stableId(id, 'interlocutor identity');
      if (!interlocutors.has(id)) throw new Error('unknown interlocutor identity: '+id);
      if (typeof placement === 'string') placement = {scope:'main', address:placement};
      if (!placement || typeof placement !== 'object') throw new TypeError('mount placement required');
      const scope = scopeId(placement.scope || 'main');
      const rawAddress = placement.address ?? '';
      const route = resolveAddress(rawAddress);
      const rk = rawKey(scope, rawAddress), occupant = raws.get(rk);
      if (occupant && occupant !== id) {
        throw new Error('raw address already occupied by '+occupant+'; differentiate before mounting '+id);
      }
      detach(id);
      const relation = Object.freeze({siteId:id,interlocutorId:id,scope,rawAddress,address:route.address,locus:route.locus});
      mounts.set(id, relation); raws.set(rk, id);
      const key = locusKey(scope, route.locus);
      if (!loci.has(key)) loci.set(key, new Set());
      loci.get(key).add(id);
      return relation;
    }

    function unmount(id) { return detach(id); }

    function resolve(scope, rawPath, viewport={width:0,height:0}) {
      scope = scopeId(scope);
      const route = resolveAddress(rawPath);
      const ids = Array.from(loci.get(locusKey(scope, route.locus)) || []);
      const entries = ids.map(id => Object.freeze({site:interlocutors.get(id),siteId:id,interlocutor:interlocutors.get(id),interlocutorId:id,mount:mounts.get(id)}));
      return Object.freeze({scope,rawPath:route.rawPath,address:route.address,locus:route.locus,equivalentAddresses:route.equivalentAddresses,interlocutors:Object.freeze(entries),composition:composeInterlocutors(entries, viewport)});
    }

    function snapshot(id, viewport={width:0,height:0}) {
      stableId(id, 'interlocutor identity');
      const site = interlocutors.get(id), relation = mounts.get(id);
      if (!site || !relation) return null;
      const resolved = resolve(relation.scope, relation.rawAddress, viewport);
      return Object.freeze({site,siteId:id,interlocutor:site,interlocutorId:id,mount:relation,scope:relation.scope,locus:relation.locus,composition:resolved.composition});
    }

    return Object.freeze({
      register,mount,unmount,resolve,snapshot,
      getSite:id=>interlocutors.get(id)||null,
      getInterlocutor:id=>interlocutors.get(id)||null,
      getMount:id=>mounts.get(id)||null,
      getRawOccupant:(scope,rawAddress)=>raws.get(rawKey(scope,rawAddress))||null,
      getInterlocutorsAt:(scope,rawPath,viewport)=>resolve(scope,rawPath,viewport).interlocutors.map(x=>x.interlocutor)
    });
  }

  function createActivityBus(registry) {
    if (!registry || typeof registry.getInterlocutor !== 'function') throw new TypeError('interlocutor registry required');
    const latest = new Map();
    const listeners = new Set();

    function normalize(event) {
      if (!event || typeof event !== 'object') throw new TypeError('activity event required');
      const id = stableId(event.siteId || event.interlocutorId, 'interlocutor identity');
      if (!registry.getInterlocutor(id)) throw new Error('activity target is not registered: '+id);
      return Object.freeze({siteId:id,interlocutorId:id,kind:String(event.kind||'activity'),state:String(event.state||'READY'),at:event.at||new Date().toISOString(),projectionChanged:Boolean(event.projectionChanged),semanticChanged:Boolean(event.semanticChanged),payload:event.payload??null});
    }

    function receive(event) {
      const e = normalize(event);latest.set(e.interlocutorId,e);for(const fn of listeners)fn(e);return e;
    }

    function receiveAt(scope, rawPath, event={}) {
      const resolved = registry.resolve(scope, rawPath);
      if (!resolved.interlocutors.length) throw new Error('no mounted interlocutor at locus');
      const requested = event.siteId || event.interlocutorId;
      if (requested) return receive({...event,siteId:requested});
      if (resolved.interlocutors.length !== 1) throw new Error('activity locus is ambiguous; target one interlocutor identity');
      return receive({...event,siteId:resolved.interlocutors[0].interlocutorId});
    }

    function subscribe(fn) {if(typeof fn!=='function')throw new TypeError('activity listener must be a function');listeners.add(fn);return()=>listeners.delete(fn)}
    return Object.freeze({receive,receiveAt,subscribe,current:id=>latest.get(id)||null});
  }

  return Object.freeze({resolveAddress,resolvePath:resolveAddress,defineInterlocutor,defineSite:defineInterlocutor,composeInterlocutors,createRegistry,createActivityBus});
});
