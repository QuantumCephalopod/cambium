import assert from "node:assert/strict";
import worker, { EMPTY_PUBLIC_REVISION, revisionLedger, stateRevision, valueRevision } from "./src/index.js";

class R2Body {
  constructor(record) {
    this.record = record;
    this.etag = record.etag;
    this.customMetadata = record.customMetadata || {};
  }
  async text() { return this.record.body; }
}

class MockR2 {
  constructor() {
    this.map = new Map();
    this.sequence = 0;
    this.putCount = 0;
    this.raceState = null;
  }
  async get(key) {
    const record = this.map.get(key);
    return record ? new R2Body(record) : null;
  }
  async put(key, body, options = {}) {
    if (this.raceState) {
      const other = this.raceState;
      this.raceState = null;
      this.map.set(key, {
        body: JSON.stringify(other),
        etag: "etag-" + (++this.sequence),
        customMetadata: { public_revision: other.public_revision }
      });
      return null;
    }
    const current = this.map.get(key);
    const condition = options.onlyIf;
    let allowed = true;
    if (condition instanceof Headers) {
      if (condition.get("If-None-Match") === "*" && current) allowed = false;
    } else if (condition?.etagMatches && (!current || current.etag !== condition.etagMatches)) {
      allowed = false;
    }
    if (!allowed) return null;
    const record = {
      body: String(body),
      etag: "etag-" + (++this.sequence),
      customMetadata: options.customMetadata || {},
      httpMetadata: options.httpMetadata || {}
    };
    this.map.set(key, record);
    this.putCount += 1;
    return { etag: record.etag, customMetadata: record.customMetadata };
  }
}

const packet = (event_id, extra = {}) => ({
  event_id,
  site_id: "organism:papers",
  kind: "HOME",
  activity: {
    state: "READY",
    feed_state: "READY",
    projection_changed: true,
    semantic_changed: false
  },
  ...extra
});

const unit = async (value) => ({ revision: await valueRevision(value), value });

async function post(env, body) {
  return worker.fetch(new Request("https://sss.saarland/__live/home", {
    method: "POST",
    headers: { Authorization: "Bearer secret", "content-type": "application/json" },
    body: JSON.stringify(body)
  }), env);
}

async function ledger(env, siteId = "organism:papers", secret = "secret") {
  return worker.fetch(new Request("https://sss.saarland/__live/home?site_id=" + encodeURIComponent(siteId), {
    method: "GET",
    headers: { Authorization: "Bearer " + secret }
  }), env);
}

const bucket = new MockR2();
const env = { HOME_SECRET: "secret", SHADOW: bucket };
const units1 = { root: await unit({ count: 1 }), "holon:a": await unit({ title: "A" }) };
const revision1 = await stateRevision(units1);

let response = await post(env, packet("bootstrap", {
  reconcile: { target_public_revision: revision1, units: units1 }
}));
let result = await response.json();
assert.equal(response.status, 200);
assert.equal(result.mode, "reconcile");
assert.equal(result.public_revision, revision1);
assert.equal(bucket.putCount, 1);

response = await ledger(env);
result = await response.json();
assert.equal(response.status, 200);
assert.equal(result.public_revision, revision1);
assert.deepEqual(result.unit_revisions, { ...revisionLedger(units1) });
assert.equal(result.empty_current, false);

response = await ledger(env, "organism:papers", "wrong");
assert.equal(response.status, 401);

const emptyBucket = new MockR2();
const emptyEnv = { HOME_SECRET: "secret", SHADOW: emptyBucket };
response = await ledger(emptyEnv);
result = await response.json();
assert.equal(response.status, 200);
assert.equal(result.public_revision, EMPTY_PUBLIC_REVISION);
assert.deepEqual(result.unit_revisions, {});
assert.equal(result.empty_current, true);

response = await post(emptyEnv, packet("empty-base-delta", {
  delta: {
    base_public_revision: EMPTY_PUBLIC_REVISION,
    target_public_revision: revision1,
    upserts: units1,
    deletes: []
  }
}));
result = await response.json();
assert.equal(response.status, 200);
assert.equal(result.mode, "delta");
assert.equal(result.public_revision, revision1);
assert.equal(emptyBucket.putCount, 1);

const richBefore = bucket.map.get("y/papers/current.json").body;
response = await post(env, packet("activity-only", {
  activity: { state: "READY", feed_state: "READY", projection_changed: false, semantic_changed: false }
}));
result = await response.json();
assert.equal(result.activity_only, true);
assert.equal(result.rich_write, false);
assert.equal(result.public_revision, revision1);
assert.equal(bucket.putCount, 1);
assert.equal(bucket.map.get("y/papers/current.json").body, richBefore);

const units2 = {
  ...units1,
  "holon:a": await unit({ title: "A2" }),
  "inquiry:a": await unit({ whole: "x" })
};
const revision2 = await stateRevision(units2);
response = await post(env, packet("delta", {
  delta: {
    base_public_revision: revision1,
    target_public_revision: revision2,
    upserts: { "holon:a": units2["holon:a"], "inquiry:a": units2["inquiry:a"] },
    deletes: []
  }
}));
result = await response.json();
assert.equal(response.status, 200);
assert.equal(result.mode, "delta");
assert.equal(result.public_revision, revision2);
assert.equal(bucket.putCount, 2);

response = await post(env, packet("retry", {
  delta: {
    base_public_revision: revision1,
    target_public_revision: revision2,
    upserts: { "holon:a": units2["holon:a"], "inquiry:a": units2["inquiry:a"] },
    deletes: []
  }
}));
result = await response.json();
assert.equal(result.deduped, true);
assert.equal(result.rich_write, false);
assert.equal(bucket.putCount, 2);

const units3 = { ...units2, root: await unit({ count: 3 }) };
const revision3 = await stateRevision(units3);
response = await post(env, packet("stale-base", {
  delta: {
    base_public_revision: revision1,
    target_public_revision: revision3,
    upserts: { root: units3.root },
    deletes: []
  }
}));
result = await response.json();
assert.equal(response.status, 409);
assert.equal(result.error, "REBASE_REQUIRED");
assert.equal(result.actual_public_revision, revision2);
assert.equal(bucket.putCount, 2);

response = await post(env, packet("recovery", {
  reconcile: { target_public_revision: revision3, units: units3 }
}));
result = await response.json();
assert.equal(response.status, 200);
assert.equal(result.mode, "reconcile");
assert.equal(result.public_revision, revision3);
assert.equal(bucket.putCount, 3);

const legacyBucket = new MockR2();
legacyBucket.map.set("y/papers/current.json", {
  body: JSON.stringify({ version: 1, event_id: "old", snapshot: { rich: true } }),
  etag: "legacy-etag",
  customMetadata: {}
});
const legacyEnv = { HOME_SECRET: "secret", SHADOW: legacyBucket };
const legacyBody = legacyBucket.map.get("y/papers/current.json").body;
response = await ledger(legacyEnv);
result = await response.json();
assert.equal(response.status, 409);
assert.equal(result.error, "LEGACY_CURRENT_REQUIRES_RECONCILE");

response = await post(legacyEnv, packet("legacy-activity"));
result = await response.json();
assert.equal(result.activity_only, true);
assert.equal(result.legacy_current, true);
assert.equal(legacyBucket.putCount, 0);
assert.equal(legacyBucket.map.get("y/papers/current.json").body, legacyBody);

response = await post(legacyEnv, packet("legacy-delta", {
  delta: {
    base_public_revision: revision1,
    target_public_revision: revision2,
    upserts: { "inquiry:a": units2["inquiry:a"] },
    deletes: []
  }
}));
result = await response.json();
assert.equal(response.status, 409);
assert.equal(result.error, "REBASE_REQUIRED");
assert.equal(result.legacy_current, true);
assert.equal(legacyBucket.map.get("y/papers/current.json").body, legacyBody);

response = await post(legacyEnv, packet("legacy-recovery", {
  reconcile: { target_public_revision: revision1, units: units1 }
}));
assert.equal(response.status, 200);
assert.equal(legacyBucket.putCount, 1);

const raceBucket = new MockR2();
const raceEnv = { HOME_SECRET: "secret", SHADOW: raceBucket };
response = await post(raceEnv, packet("race-bootstrap", {
  reconcile: { target_public_revision: revision1, units: units1 }
}));
assert.equal(response.status, 200);
raceBucket.raceState = {
  version: 2,
  site_id: "organism:papers",
  public_revision: revision3,
  units: units3,
  last_event: { event_id: "other" },
  materialized_at: new Date().toISOString()
};
response = await post(raceEnv, packet("race-delta", {
  delta: {
    base_public_revision: revision1,
    target_public_revision: revision2,
    upserts: { "holon:a": units2["holon:a"], "inquiry:a": units2["inquiry:a"] },
    deletes: []
  }
}));
result = await response.json();
assert.equal(response.status, 409);
assert.equal(result.error, "REBASE_REQUIRED");
assert.equal(result.actual_public_revision, revision3);

const invalid = { root: { revision: revision1, value: { count: 999 } } };
response = await post(env, packet("bad-unit", {
  reconcile: { target_public_revision: revision1, units: invalid }
}));
result = await response.json();
assert.equal(response.status, 400);
assert.match(result.error, /revision does not match/);

console.log("display live nerve regression witness: PASS");
