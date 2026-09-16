# Display live nerve

`w/display/x/live` is the canonical code for the `sss-live` Cloudflare Worker. Cloudflare is the execution substrate; GitHub is the source of truth for this code. No local checkout, local Node install, local Wrangler install, or local deployment step is part of the production architecture.

## What this organ is

The live nerve is the transport/memory layer between living organism state and the public Display membrane. It must not become a second semantic authority.

```text
Google Drive living organism
        |
        | HOME + admitted public secretion
        v
Cloudflare sss-live Worker
        |
        +-- LiveState Durable Object = current public memory
        +-- hibernating WebSockets = push to open browsers
        |
        v
sss.saarland Display membrane
```

The current public site itself remains a GitHub Pages artifact behind Cloudflare:

```text
Internet
  -> Cloudflare DNS/proxy
  -> GitHub Pages origin
  -> sss.saarland
```

The intended production route will intercept only `sss.saarland/__live/*` with `sss-live`; every other request continues to GitHub Pages. That route is **not mounted yet**.

## Authority boundaries

- **Drive** is authoritative for what a living research organism currently is.
- **GitHub / cambium** is authoritative for Display anatomy, transport code, rituals and public build logic.
- **Cloudflare** executes the live transport and keeps admitted current public state; it is not semantic source truth.
- **GitHub Pages** serves the ordinary static Display membrane.
- **The user's local PC is not part of this architecture.**

Code changes alter how Display perceives/transports. Organism HOME changes alter what current admitted public state is perceived. A normal Papers heartbeat must never require a Git commit.

## Runtime contract

The Worker exposes three operations. The implementation accepts them both at the bare Worker paths and under the future `/__live/*` production route.

- `GET /state` — return current admitted public state; optional `?site_id=...` narrows to one stable site identity.
- `GET /watch` — open a hibernatable WebSocket, immediately receive current state, then receive later HOME events by push.
- `POST /home` — receive one authenticated public HOME secretion.

The Worker stores state by stable `site_id`, never by current locus/address. This preserves the site-holon invariant `identity != locus`: e.g. Papers remains `site_id = organism:papers` even if later growth remounts it from one locus to another.

A HOME packet without `snapshot` still carries/broadcasts activity while preserving the previous snapshot. Event delivery is idempotent through a bounded ring of the most recent 256 `event_id` values.

## Durable memory

`wrangler.jsonc` declares one SQLite-backed Durable Object binding:

```text
LIVE_STATE -> LiveState
```

`LiveState` currently persists:

- `sites` — current public state keyed by stable `site_id`;
- `last_event` — most recently accepted event summary;
- `recent_events` — bounded deduplication ring.

WebSockets are accepted with the Durable Object hibernation API, allowing the object to sleep between events instead of requiring a polling process.

## Production deployment — canonical path

Production deployment is **GitHub Actions**, not Cloudflare Workers Builds/Git integration.

The direct Cloudflare Git-integration UI was intentionally abandoned after its GitHub-App handoff failed to complete the Worker↔repository build link reliably. The Cloudflare GitHub App may remain installed with access only to `self-similar-systems/cambium`, but it is not the canonical deployment mechanism and no re-entry should depend on it.

Canonical production flow:

```text
staging work
QuantumCephalopod/cambium
        |
        | deliberate merge
        v
production source
self-similar-systems/cambium:main
        |
        | .github/workflows/cloudflare-live.yml
        v
GitHub Actions
        |
        | cloudflare/wrangler-action@v4
        | workingDirectory = w/display/x/live
        | wrangler 4.131.1
        v
Cloudflare Worker: sss-live
```

The production workflow deploys when `main` changes under `w/display/x/live/**` or when the workflow itself changes. The Worker name in Cloudflare and `wrangler.jsonc` must remain `sss-live`.

### Deployment credentials

The **values are never committed**. Production repository Actions secrets are named:

- `CLOUDFLARE_API_TOKEN` — Cloudflare API token with Worker-edit capability;
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID.

These two secrets are sufficient for the GitHub Actions deployment path. Cloudflare R2/S3 credentials such as Access Key ID, Secret Access Key, or S3 endpoint are unrelated and must not be substituted for `CLOUDFLARE_API_TOKEN`.

The first production deployment through this path succeeded in GitHub Actions run `34785905263`. Wrangler reported:

- `Created: LiveState`;
- binding `env.LIVE_STATE (LiveState)`;
- `Uploaded sss-live`;
- Worker URL `https://sss-live.philipp-bartholomaeus.workers.dev`;
- deployed Worker version `8612f637-e9b6-40cf-9ae7-b708ba1ad32c`.

That run is the durable witness that GitHub -> Cloudflare deployment and Durable Object creation are operational.

## HOME authentication

`POST /home` is designed to require a Cloudflare runtime secret named:

```text
HOME_SECRET
```

The caller sends it as `Authorization: Bearer <secret>`. The value must live only in secret stores (Cloudflare runtime secret and the authorized Drive/Apps-Script side when that secretion path is actualized). It must never appear in Git, public browser JavaScript, a public snapshot, or a HOME receipt.

`HOME_SECRET` is **not yet actualized** as of the first successful Worker deployment, so `/home` correctly remains unusable until that boundary is intentionally closed.

## HOME packet

Minimum authenticated packet:

```json
{
  "event_id": "globally-stable-home-event-id",
  "site_id": "organism:papers"
}
```

Optional public fields include `kind`, `occurred_at`, `projection_revision`, `semantic_revision`, `activity`, and `snapshot`.

Only already-admitted public state belongs in `snapshot`. Private Drive IDs, internal source URLs, credentials, private receipt paths, and non-public tissue must never cross this boundary.

## Public-secretion law

The intended physiology is event-driven, not polled:

```text
organism changes
-> durable HOME
-> local _feed refresh attempt
-> bounded UPLINK witness
-> admitted PUBLIC SECRETION
-> sss-live current state
-> push to connected browsers
```

Every meaningful HOME may emit one outward activity event. A new/replaced public snapshot is sent only when the admitted public projection actually changes. Delivery must be idempotent by `event_id`.

The Drive/Apps-Script side must eventually maintain a tiny durable outbox: successful delivery removes the parcel; failed delivery leaves it pending and creates only a temporary retry trigger while wounded. Idle organisms must have no timer/polling loop.

## Current boundary — 2026-09-13

**PASS / actualized**

- `sss.saarland` DNS/proxy is under Cloudflare while GitHub Pages remains the normal origin.
- `sss-live` Worker exists and is reachable on `workers.dev`.
- `LiveState` SQLite Durable Object exists.
- `/state`, `/watch`, and authenticated `/home` transport code exists.
- WebSocket hibernation is implemented.
- state is keyed by stable site identity, not locus.
- production GitHub Actions -> Wrangler -> Cloudflare deployment is proven successful.
- deployment credentials are safely held as production repository Actions secrets.

**OPEN / next tissue**

1. create `HOME_SECRET` in Cloudflare and the authorized HOME producer;
2. mount Worker route `sss.saarland/__live/*` while leaving all other traffic on GitHub Pages;
3. connect the public Display runtime to `/__live/state` + `/__live/watch` and feed events into the existing identity-bound activity receptor;
4. create the admitted Papers public projection from live Drive truth rather than `w/display/papers.json`;
5. attach Papers HOME secretion with durable outbox/retry semantics;
6. acceptance test: cause one real Papers heartbeat, perform no manual site/Git update, and observe `sss.saarland` change by itself.

If that test requires a Git commit, manual JSON refresh, build button, reminder, or polling loop, the live physiology has failed.

## Growth law

This directory is infrastructure, not semantic anatomy. **Drive changes what an organism is; Git changes how Display perceives it; Cloudflare carries and remembers only admitted public secretion. Stable site identity is the vascular address; locus remains external placement.**
