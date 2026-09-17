const JSON_HEADERS = Object.freeze({
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
});
const MAX_BODY_BYTES = 1024 * 1024;
const EVENT_ID = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,200}$/;
const SHADOW_KEYS = Object.freeze({
  "organism:papers": "y/papers/current.json"
});
const ALLOWED_FIELDS = new Set([
  "event_id",
  "site_id",
  "kind",
  "occurred_at",
  "projection_revision",
  "semantic_revision",
  "activity",
  "snapshot"
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

function publicPacket(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new TypeError("HOME packet must be an object");
  }
  for (const key of Object.keys(body)) {
    if (!ALLOWED_FIELDS.has(key)) throw new TypeError(`unexpected HOME field: ${key}`);
  }
  if (typeof body.event_id !== "string" || !EVENT_ID.test(body.event_id)) {
    throw new TypeError("event_id must be a stable literal id");
  }
  if (typeof body.site_id !== "string" || !(body.site_id in SHADOW_KEYS)) {
    throw new TypeError("site_id is not admitted to the public shadow");
  }
  const kind = body.kind ?? "HOME";
  if (kind !== "HOME") throw new TypeError("only HOME secretion is admitted");
  if (Object.prototype.hasOwnProperty.call(body, "snapshot")) {
    if (!body.snapshot || typeof body.snapshot !== "object" || Array.isArray(body.snapshot)) {
      throw new TypeError("snapshot must be an object when present");
    }
  }
  return {
    event_id: body.event_id,
    site_id: body.site_id,
    kind,
    occurred_at: optionalString(body.occurred_at, "occurred_at", 64),
    projection_revision: optionalString(body.projection_revision, "projection_revision", 128),
    semantic_revision: optionalString(body.semantic_revision, "semantic_revision", 128),
    activity: normalizeActivity(body.activity),
    ...(Object.prototype.hasOwnProperty.call(body, "snapshot") ? { snapshot: body.snapshot } : {})
  };
}

function receiptKey(packet) {
  return [
    packet.site_id,
    packet.event_id,
    packet.projection_revision ?? "",
    packet.semantic_revision ?? "",
    packet.activity?.feed_state ?? packet.activity?.state ?? ""
  ].join("\u001f");
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/__live/home") return new Response("not found", { status: 404 });
    if (request.method !== "POST") return new Response("method not allowed", { status: 405 });

    const expected = env.HOME_SECRET;
    const supplied = request.headers.get("Authorization");
    if (!expected || supplied !== `Bearer ${expected}`) {
      return new Response("unauthorized", { status: 401 });
    }

    let packet;
    try { packet = await readPacket(request); }
    catch (error) { return json({ ok: false, error: error.message }, error.status || 400); }

    const key = SHADOW_KEYS[packet.site_id];
    const receipt = receiptKey(packet);
    const current = await env.SHADOW.head(key);
    if (current?.customMetadata?.receipt === receipt) {
      return json({ ok: true, deduped: true, event_id: packet.event_id, site_id: packet.site_id, key });
    }

    const receivedAt = new Date().toISOString();
    const state = {
      version: 1,
      ...packet,
      received_at: receivedAt
    };

    await env.SHADOW.put(key, JSON.stringify(state), {
      httpMetadata: {
        contentType: "application/json; charset=utf-8",
        cacheControl: "public, max-age=300"
      },
      customMetadata: {
        receipt,
        site_id: packet.site_id,
        event_id: packet.event_id,
        projection_revision: packet.projection_revision ?? "",
        semantic_revision: packet.semantic_revision ?? ""
      }
    });

    return json({
      ok: true,
      deduped: false,
      event_id: packet.event_id,
      site_id: packet.site_id,
      key
    });
  }
};
