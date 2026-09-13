# Display live nerve

`w/display/live` is the canonical code for the `sss-live` Cloudflare Worker. Cloudflare is the execution substrate; GitHub is the source of truth for this code. No local development checkout is required for normal deployment.

## Scope

The live nerve does exactly three public things:

- `GET /state` — return the current admitted public state.
- `GET /watch` — open a hibernatable WebSocket and receive the current state plus later HOME events.
- `POST /home` — receive one authenticated public HOME secretion.

The same handlers work after the Worker is routed under `/__live/*` on `sss.saarland`.

The Worker stores state by stable `site_id`, never by current locus/address. A HOME without a `snapshot` still broadcasts activity while preserving the previous public snapshot. Recent event IDs are retained as a bounded deduplication ring.

## Cloudflare deployment

Connect the existing Cloudflare Worker named `sss-live` to the GitHub repository containing this directory.

Workers Builds settings:

- production branch: `main`
- root directory: `w/display/live`
- build command: none
- deploy command: `npx wrangler deploy`
- non-production branch builds: optional; not required for the live nerve

The Worker name in Cloudflare and `wrangler.jsonc` must both remain `sss-live`.

After the first successful build, create one runtime secret named `HOME_SECRET` in Cloudflare. Never commit that value to GitHub.

## HOME packet

Minimum authenticated packet:

```json
{
  "event_id": "globally-stable-home-event-id",
  "site_id": "organism:papers"
}
```

Optional public fields include `kind`, `occurred_at`, `projection_revision`, `semantic_revision`, `activity`, and `snapshot`.

Only already-admitted public state belongs in `snapshot`. Private Drive IDs, internal source URLs, credentials, and non-public tissue must never cross this boundary.

## Growth law

This directory is infrastructure, not semantic anatomy. Drive changes what an organism currently is. Git changes how Display perceives and transports that public state.
