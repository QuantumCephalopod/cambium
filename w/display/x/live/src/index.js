const JSON_HEADERS = Object.freeze({
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
});
const MAX_BODY_BYTES = 1024 * 1024;
const EMPTY_PUBLIC_REVISION = "sha256:4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945";
const EVENT_ID = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,200}$/;
const UNIT_KEY = /^[A-Za-z0-9][A-Za-z0-9:._/-]{0,240}$/;
const REVISION = /^sha256:[a-f0-9]{64}$/;
const SHADOW_KEYS = Object.freeze({
  "organism:papers": "y/papers/current.json"
});
const MATERIALIZE_REPO = "self-similar-systems/cambium";
const MATERIALIZE_WORKFLOW = "papers-shadow-materialize.yml";
const ALLOWED_FIELDS = new Set([
  "event_id",
  "site_id",
  "kind",
  "occurred_at",
  "projection_revision",
  "semantic_revision",
  "activity",
  "delta",
  "reconcile"
]);

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: JSON_HEADERS });
}

function optionalString(value, label, max = 256) {
  if (value == null) return null;
  if (typeof value !== "string" || value.length > max) {
    throw new TypeError(`${label} must be a bounded string or null`);
  }
  return value;
}

function normalizeActivity(value) {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("activity must be an object or null");
  }
  return {
    state: optionalString(value.state, "activity.state", 64),
    feed_state: optionalString(value.feed_state, "activity.feed_state", 64),
    projection_changed: Boolean(value.projection_changed),
    semantic_changed: Boolean(value.semantic_changed)
  };
}

function requiredRevision(value, label) {
  if (typeof value !== "string" || !REVISION.test(value)) {
    throw new TypeError(label + " must be a sha256 revision");
  }
  return value;
}

function normalizeUnitKey(value, label) {
  if (typeof value !== "string" || !UNIT_KEY.test(value)) {
    throw new TypeError(label + " must be a bounded opaque unit key");
  }
  return value;
}

function normalizeUnit(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(label + " must be an object");
  }
  for (const key of Object.keys(value)) {
    if (key !== "revision" && key !== "value") {
      throw new TypeError(label + " contains an unexpected field");
    }
  }
  if (!Object.prototype.hasOwnProperty.call(value, "value")) {
    throw new TypeError(label + ".value is required");
  }
  return {
    revision: requiredRevision(value.revision, label + ".revision"),
    value: value.value
  };
}

function normalizeUnits(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(label + " must be an object keyed by public unit id");
  }
  const units = Object.create(null);
  for (const [rawKey, rawUnit] of Object.entries(value)) {
    const key = normalizeUnitKey(rawKey, label + " key");
    units[key] = normalizeUnit(rawUnit, label + "." + key);
  }
  return units;
}

function normalizeDelta(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("delta must be an object");
  }
  const allowed = new Set(["base_public_revision", "target_public_revision", "upserts", "deletes"]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new TypeError("unexpected delta field: " + key);
  }
  const deletes = value.deletes ?? [];
  if (!Array.isArray(deletes)) throw new TypeError("delta.deletes must be an array");
  const normalizedDeletes = deletes.map((key, index) => normalizeUnitKey(key, "delta.deletes[" + index + "]"));
  if (new Set(normalizedDeletes).size !== normalizedDeletes.length) {
    throw new TypeError("delta.deletes contains duplicate keys");
  }
  const upserts = normalizeUnits(value.upserts ?? {}, "delta.upserts");
  for (const key of normalizedDeletes) {
    if (Object.prototype.hasOwnProperty.call(upserts, key)) {
      throw new TypeError("delta key cannot be both upserted and deleted: " + key);
    }
  }
  if (Object.keys(upserts).length === 0 && normalizedDeletes.length === 0) {
    throw new TypeError("delta must change at least one public unit");
  }
  return {
    base_public_revision: requiredRevision(value.base_public_revision, "delta.base_public_revision"),
    target_public_revision: requiredRevision(value.target_public_revision, "delta.target_public_revision"),
    upserts,
    deletes: normalizedDeletes
  };
}

function normalizeReconcile(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("reconcile must be an object");
  }
  const allowed = new Set(["target_public_revision", "units"]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new TypeError("unexpected reconcile field: " + key);
  }
  return {
    target_public_revision: requiredRevision(value.target_public_revision, "reconcile.target_public_revision"),
    units: normalizeUnits(value.units ?? {}, "reconcile.units")
  };
}

function publicPacket(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new TypeError("HOME packet must be an object");
  }
  for (const key of Object.keys(body)) {
    if (!ALLOWED_FIELDS.has(key)) throw new TypeError("unexpected HOME field: " + key);
  }
  if (typeof body.event_id !== "string" || !EVENT_ID.test(body.event_id)) {
    throw new TypeError("event_id must be a stable literal id");
  }
  if (typeof body.site_id !== "string" || !(body.site_id in SHADOW_KEYS)) {
    throw new TypeError("site_id is not admitted to the public shadow");
  }
  const kind = body.kind ?? "HOME";
  if (kind !== "HOME") throw new TypeError("only HOME secretion is admitted");
  if (body.delta != null && body.reconcile != null) {
    throw new TypeError("HOME packet may carry delta or reconcile, not both");
  }
  return {
    event_id: body.event_id,
    site_id: body.site_id,
    kind,
    occurred_at: optionalString(body.occurred_at, "occurred_at", 64),
    projection_revision: optionalString(body.projection_revision, "projection_revision", 128),
    semantic_revision: optionalString(body.semantic_revision, "semantic_revision", 128),
    activity: normalizeActivity(body.activity),
    delta: body.delta == null ? null : normalizeDelta(body.delta),
    reconcile: body.reconcile == null ? null : normalizeReconcile(body.reconcile)
  };
}

function canonicalJson(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("public unit contains a non-finite number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map((item) => canonicalJson(item)).join(",") + "]";
  }
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key])).join(",") + "}";
  }
  throw new TypeError("public unit contains an unsupported JSON value");
}

async function sha256Revision(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return "sha256:" + hex;
}

async function valueRevision(value) {
  return sha256Revision(canonicalJson(value));
}

function revisionLedger(units) {
  const ledger = Object.create(null);
  for (const key of Object.keys(units).sort()) ledger[key] = units[key].revision;
  return ledger;
}

async function stateRevision(units) {
  const ledger = Object.entries(revisionLedger(units));
  return sha256Revision(canonicalJson(ledger));
}

async function verifyUnits(units, label) {
  for (const key of Object.keys(units)) {
    const expected = await valueRevision(units[key].value);
    if (units[key].revision !== expected) {
      throw new TypeError(label + "." + key + ".revision does not match its canonical public value");
    }
  }
}

function cloneUnits(units) {
  const cloned = Object.create(null);
  for (const [key, unit] of Object.entries(units)) {
    cloned[key] = { revision: unit.revision, value: unit.value };
  }
  return cloned;
}

function isV2State(value, siteId) {
  return Boolean(
    value && typeof value === "object" && !Array.isArray(value) &&
    value.version === 2 && value.site_id === siteId && REVISION.test(value.public_revision || "") &&
    value.units && typeof value.units === "object" && !Array.isArray(value.units)
  );
}

async function readCurrent(bucket, key, siteId) {
  const object = await bucket.get(key);
  if (!object) return { object: null, state: null, legacy: false };
  let parsed = null;
  try { parsed = JSON.parse(await object.text()); }
  catch (_) { return { object, state: null, legacy: true }; }
  if (!isV2State(parsed, siteId)) return { object, state: null, legacy: true };
  return { object, state: parsed, legacy: false };
}

function writeCondition(currentObject) {
  if (currentObject) return { etagMatches: currentObject.etag };
  const headers = new Headers();
  headers.set("If-None-Match", "*");
  return headers;
}

function responseContext(packet, key, extra = {}) {
  return {
    event_id: packet.event_id,
    site_id: packet.site_id,
    key,
    ...extra
  };
}

async function queueMaterialization(env, packet, publicRevision) {
  if (!env.GITHUB_ACTIONS_TOKEN) return false;
  try {
    const response = await fetch(
      "https://api.github.com/repos/" + MATERIALIZE_REPO +
      "/actions/workflows/" + MATERIALIZE_WORKFLOW + "/dispatches",
      {
        method: "POST",
        headers: {
          "accept": "application/vnd.github+json",
          "authorization": "Bearer " + env.GITHUB_ACTIONS_TOKEN,
          "content-type": "application/json",
          "user-agent": "sss-live-materializer/1",
          "x-github-api-version": "2022-11-28"
        },
        body: JSON.stringify({
          ref: "main",
          inputs: {
            site_id: packet.site_id,
            public_revision: publicRevision,
            event_id: packet.event_id
          }
        })
      }
    );
    if (response.status !== 204) {
      console.error("same-origin materialization dispatch HTTP " + response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error("same-origin materialization dispatch failed", error);
    return false;
  }
}

async function writeState(env, key, packet, units, publicRevision, currentObject, mode) {
  const state = {
    version: 2,
    site_id: packet.site_id,
    public_revision: publicRevision,
    units,
    last_event: {
      event_id: packet.event_id,
      kind: packet.kind,
      occurred_at: packet.occurred_at,
      projection_revision: packet.projection_revision,
      semantic_revision: packet.semantic_revision,
      activity: packet.activity
    },
    materialized_at: new Date().toISOString()
  };
  const stored = await env.SHADOW.put(key, JSON.stringify(state), {
    onlyIf: writeCondition(currentObject),
    httpMetadata: {
      contentType: "application/json; charset=utf-8",
      cacheControl: "private, no-store"
    },
    customMetadata: {
      site_id: packet.site_id,
      event_id: packet.event_id,
      public_revision: publicRevision,
      mode
    }
  });
  return { stored, state };
}

async function concurrentResult(env, key, packet, targetRevision) {
  const latest = await readCurrent(env.SHADOW, key, packet.site_id);
  const actual = latest.state?.public_revision ?? null;
  if (actual && actual === targetRevision) {
    const materializationQueued = await queueMaterialization(env, packet, actual);
    return json(responseContext(packet, key, {
      ok: true,
      deduped: true,
      public_revision: actual,
      rich_write: false,
      concurrent: true,
      materialization_queued: materializationQueued
    }));
  }
  return json(responseContext(packet, key, {
    ok: false,
    error: "REBASE_REQUIRED",
    actual_public_revision: actual,
    legacy_current: latest.legacy
  }), 409);
}

async function applyDelta(env, key, packet, current) {
  const delta = packet.delta;
  let baseUnits;
  if (!current.state) {
    if (current.legacy || delta.base_public_revision !== EMPTY_PUBLIC_REVISION) {
      return json(responseContext(packet, key, {
        ok: false,
        error: "REBASE_REQUIRED",
        actual_public_revision: current.legacy ? null : EMPTY_PUBLIC_REVISION,
        legacy_current: current.legacy
      }), 409);
    }
    baseUnits = Object.create(null);
  } else {
    baseUnits = current.state.units;
  }
  if (current.state?.public_revision === delta.target_public_revision) {
    const materializationQueued = await queueMaterialization(env, packet, delta.target_public_revision);
    return json(responseContext(packet, key, {
      ok: true,
      deduped: true,
      public_revision: delta.target_public_revision,
      rich_write: false,
      materialization_queued: materializationQueued
    }));
  }
  const actualBase = current.state?.public_revision ?? EMPTY_PUBLIC_REVISION;
  if (actualBase !== delta.base_public_revision) {
    return json(responseContext(packet, key, {
      ok: false,
      error: "REBASE_REQUIRED",
      actual_public_revision: actualBase
    }), 409);
  }

  await verifyUnits(delta.upserts, "delta.upserts");
  const units = cloneUnits(baseUnits);
  for (const keyToDelete of delta.deletes) delete units[keyToDelete];
  for (const [unitKey, unit] of Object.entries(delta.upserts)) units[unitKey] = unit;
  const computed = await stateRevision(units);
  if (computed !== delta.target_public_revision) {
    return json(responseContext(packet, key, {
      ok: false,
      error: "TARGET_REVISION_MISMATCH",
      computed_public_revision: computed,
      target_public_revision: delta.target_public_revision
    }), 400);
  }

  const written = await writeState(env, key, packet, units, computed, current.object, "delta");
  if (!written.stored) return concurrentResult(env, key, packet, delta.target_public_revision);
  const materializationQueued = await queueMaterialization(env, packet, computed);
  return json(responseContext(packet, key, {
    ok: true,
    deduped: false,
    public_revision: computed,
    rich_write: true,
    mode: "delta",
    materialization_queued: materializationQueued
  }));
}

async function applyReconcile(env, key, packet, current) {
  const reconcile = packet.reconcile;
  if (current.state?.public_revision === reconcile.target_public_revision) {
    const materializationQueued = await queueMaterialization(env, packet, reconcile.target_public_revision);
    return json(responseContext(packet, key, {
      ok: true,
      deduped: true,
      public_revision: reconcile.target_public_revision,
      rich_write: false,
      materialization_queued: materializationQueued
    }));
  }
  await verifyUnits(reconcile.units, "reconcile.units");
  const computed = await stateRevision(reconcile.units);
  if (computed !== reconcile.target_public_revision) {
    return json(responseContext(packet, key, {
      ok: false,
      error: "TARGET_REVISION_MISMATCH",
      computed_public_revision: computed,
      target_public_revision: reconcile.target_public_revision
    }), 400);
  }
  const written = await writeState(env, key, packet, reconcile.units, computed, current.object, "reconcile");
  if (!written.stored) return concurrentResult(env, key, packet, reconcile.target_public_revision);
  const materializationQueued = await queueMaterialization(env, packet, computed);
  return json(responseContext(packet, key, {
    ok: true,
    deduped: false,
    public_revision: computed,
    rich_write: true,
    mode: "reconcile",
    materialization_queued: materializationQueued
  }));
}

async function readPacket(request) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw Object.assign(new Error("HOME packet exceeds 1 MiB"), { status: 413 });
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw Object.assign(new Error("HOME packet exceeds 1 MiB"), { status: 413 });
  }
  let body;
  try { body = JSON.parse(text); }
  catch (_) { throw Object.assign(new Error("HOME packet must be JSON"), { status: 400 }); }
  try { return publicPacket(body); }
  catch (error) { throw Object.assign(error, { status: 400 }); }
}

export {
  EMPTY_PUBLIC_REVISION,
  canonicalJson,
  publicPacket,
  readCurrent,
  revisionLedger,
  stateRevision,
  valueRevision
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/__live/home") return new Response("not found", { status: 404 });

    const supplied = request.headers.get("Authorization");

    if (request.method === "GET" && url.searchParams.get("view") === "materialized") {
      if (!env.MATERIALIZE_SECRET || supplied !== `Bearer ${env.MATERIALIZE_SECRET}`) {
        return new Response("unauthorized", { status: 401 });
      }
      const siteId = url.searchParams.get("site_id") || "";
      const keys = [...url.searchParams.keys()];
      if (!(siteId in SHADOW_KEYS) || keys.some((key) => key !== "site_id" && key !== "view")) {
        return json({ ok: false, error: "materialized state request is not admitted" }, 400);
      }
      try {
        const current = await readCurrent(env.SHADOW, SHADOW_KEYS[siteId], siteId);
        if (current.legacy || !current.state) {
          return json({
            ok: false,
            site_id: siteId,
            error: current.legacy ? "LEGACY_CURRENT_REQUIRES_RECONCILE" : "MATERIALIZED_STATE_UNAVAILABLE"
          }, 409);
        }
        return json(current.state);
      } catch (error) {
        return json({
          ok: false,
          site_id: siteId,
          error: error?.message || "materialized state read failed"
        }, error instanceof TypeError ? 400 : (error?.status || 500));
      }
    }

    if (!env.HOME_SECRET || supplied !== `Bearer ${env.HOME_SECRET}`) {
      return new Response("unauthorized", { status: 401 });
    }

    if (request.method === "GET") {
      const siteId = url.searchParams.get("site_id") || "";
      if (!(siteId in SHADOW_KEYS) || [...url.searchParams.keys()].some((key) => key !== "site_id")) {
        return json({ ok: false, error: "site_id is not admitted to the public shadow" }, 400);
      }
      const key = SHADOW_KEYS[siteId];
      try {
        const current = await readCurrent(env.SHADOW, key, siteId);
        if (current.legacy) {
          return json({
            ok: false,
            site_id: siteId,
            key,
            error: "LEGACY_CURRENT_REQUIRES_RECONCILE",
            legacy_current: true,
            public_revision: null,
            unit_revisions: null
          }, 409);
        }
        return json({
          ok: true,
          site_id: siteId,
          key,
          public_revision: current.state?.public_revision ?? EMPTY_PUBLIC_REVISION,
          unit_revisions: current.state ? revisionLedger(current.state.units) : {},
          empty_current: !current.state
        });
      } catch (error) {
        return json({
          ok: false,
          site_id: siteId,
          key,
          error: error?.message || "live ledger read failed"
        }, error instanceof TypeError ? 400 : (error?.status || 500));
      }
    }

    if (request.method !== "POST") return new Response("method not allowed", { status: 405 });

    let packet;
    try { packet = await readPacket(request); }
    catch (error) { return json({ ok: false, error: error.message }, error.status || 400); }

    const key = SHADOW_KEYS[packet.site_id];
    try {
      const current = await readCurrent(env.SHADOW, key, packet.site_id);

      if (packet.reconcile) return await applyReconcile(env, key, packet, current);
      if (packet.delta) return await applyDelta(env, key, packet, current);

      return json(responseContext(packet, key, {
        ok: true,
        activity_only: true,
        rich_write: false,
        public_revision: current.state?.public_revision ?? (current.legacy ? null : EMPTY_PUBLIC_REVISION),
        legacy_current: current.legacy
      }));
    } catch (error) {
      return json(responseContext(packet, key, {
        ok: false,
        error: error?.message || "live shadow mutation failed"
      }), error instanceof TypeError ? 400 : (error?.status || 500));
    }
  }
};
