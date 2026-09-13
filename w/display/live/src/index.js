import { DurableObject } from "cloudflare:workers";

const JSON_HEADERS = Object.freeze({
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
});

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: JSON_HEADERS
  });
}

function livePath(pathname) {
  if (pathname === "/__live") return "/";
  if (pathname.startsWith("/__live/")) return pathname.slice("/__live".length);
  return pathname;
}

function publicPacket(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new TypeError("HOME packet must be an object");
  }
  if (typeof body.event_id !== "string" || !body.event_id) {
    throw new TypeError("event_id required");
  }
  if (typeof body.site_id !== "string" || !body.site_id) {
    throw new TypeError("site_id required");
  }
  return body;
}

export class LiveState extends DurableObject {
  async readState() {
    const [sites, lastEvent] = await Promise.all([
      this.ctx.storage.get("sites"),
      this.ctx.storage.get("last_event")
    ]);
    return {
      status: "alive",
      organism: "sss-live",
      sites: sites ?? {},
      last_event: lastEvent ?? null
    };
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = livePath(url.pathname);

    if (path === "/state" && request.method === "GET") {
      const state = await this.readState();
      const siteId = url.searchParams.get("site_id");
      if (!siteId) return json(state);
      return json({
        status: "alive",
        organism: "sss-live",
        site: state.sites[siteId] ?? null,
        last_event: state.last_event
      });
    }

    if (path === "/watch" && request.method === "GET") {
      if ((request.headers.get("Upgrade") || "").toLowerCase() !== "websocket") {
        return new Response("Expected WebSocket", { status: 426 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.ctx.acceptWebSocket(server);

      server.send(JSON.stringify({
        type: "state",
        data: await this.readState()
      }));

      return new Response(null, {
        status: 101,
        webSocket: client
      });
    }

    if (path === "/home" && request.method === "POST") {
      let packet;
      try {
        packet = publicPacket(await request.json());
      } catch (error) {
        return json({ ok: false, error: error.message }, 400);
      }

      const recent = (await this.ctx.storage.get("recent_events")) ?? [];
      if (recent.includes(packet.event_id)) {
        return json({ ok: true, deduped: true, event_id: packet.event_id });
      }

      const receivedAt = new Date().toISOString();
      const sites = (await this.ctx.storage.get("sites")) ?? {};
      const previous = sites[packet.site_id] ?? {
        site_id: packet.site_id,
        snapshot: null,
        last_event: null
      };

      const nextSite = {
        ...previous,
        site_id: packet.site_id,
        snapshot: Object.prototype.hasOwnProperty.call(packet, "snapshot")
          ? packet.snapshot
          : previous.snapshot,
        last_event: {
          event_id: packet.event_id,
          kind: packet.kind ?? "HOME",
          occurred_at: packet.occurred_at ?? null,
          projection_revision: packet.projection_revision ?? null,
          semantic_revision: packet.semantic_revision ?? null,
          activity: packet.activity ?? null,
          received_at: receivedAt
        }
      };

      sites[packet.site_id] = nextSite;
      const nextRecent = [...recent, packet.event_id].slice(-256);
      const lastEvent = {
        event_id: packet.event_id,
        site_id: packet.site_id,
        kind: packet.kind ?? "HOME",
        received_at: receivedAt
      };

      await this.ctx.storage.put({
        sites,
        recent_events: nextRecent,
        last_event: lastEvent
      });

      const message = JSON.stringify({
        type: "home",
        data: {
          ...packet,
          received_at: receivedAt
        }
      });

      for (const socket of this.ctx.getWebSockets()) {
        try {
          socket.send(message);
        } catch (_) {
          // Broken sockets disappear from the hibernation set after disconnect.
        }
      }

      return json({
        ok: true,
        deduped: false,
        event_id: packet.event_id,
        site_id: packet.site_id
      });
    }

    return new Response("not found", { status: 404 });
  }

  async webSocketMessage(socket, message) {
    if (message === "state") {
      socket.send(JSON.stringify({
        type: "state",
        data: await this.readState()
      }));
    }
  }

  async webSocketClose(socket, code, reason) {
    try {
      socket.close(code, reason);
    } catch (_) {}
  }

  async webSocketError() {
    // The runtime owns reconnection; the browser may reconnect when desired.
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = livePath(url.pathname);

    if (path === "/home") {
      if (request.method !== "POST") {
        return new Response("method not allowed", { status: 405 });
      }
      const expected = env.HOME_SECRET;
      const supplied = request.headers.get("Authorization");
      if (!expected || supplied !== `Bearer ${expected}`) {
        return new Response("unauthorized", { status: 401 });
      }
    }

    if (!["/state", "/watch", "/home"].includes(path)) {
      return json({ status: "alive", organism: "sss-live" });
    }

    const live = env.LIVE_STATE.getByName("sss");
    return live.fetch(request);
  }
};
