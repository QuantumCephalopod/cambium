# Display live nerve

`w/display/x/live` is the canonical code for the `sss-live` Cloudflare Worker. Cloudflare is execution substrate; GitHub is source truth for this transport code. The Worker is not semantic authority and the user's local PC is not part of production physiology.

## Current physiology

The live nerve is deliberately one-way and change-driven:

```text
Google Drive living organism
        |
        | durable HOME + admitted public secretion
        | authenticated POST only when source state changes
        v
Cloudflare Worker: sss-live
        |
        | R2 binding (no R2 credential in code)
        v
R2 bucket: sss-shadow
        |
        | ordinary static object delivery when public domain is enabled
        v
Display / browser
```

Visitors do **not** call the Worker. There is no browser polling loop, public state endpoint or WebSocket watch channel. A page refresh must not execute `sss-live`.

## R2 shadow-address law

R2 is a co-addressed public/heavy-data shadow of site-space, not a second taxonomy. A public object belonging to a locus keeps the same relative address as that locus.

Examples:

```text
site-space / repo             R2 object key

y/papers                     y/papers/current.json
y/papers/foo                  y/papers/foo/image.webp
y/project                     y/project/cover.webp
```

The carrier may differ; the address does not. Subdirectories such as `images/` or `data/` are introduced only when a local holon actually earns that differentiation.

Current admitted live mapping is intentionally narrow:

```text
organism:papers -> y/papers/current.json
```

Any unregistered `site_id` is rejected rather than allowed to invent an R2 path.

## Public surface

Production Worker exposure is exactly one authenticated route:

```text
POST https://sss.saarland/__live/home
GET  https://sss.saarland/__live/home?site_id=<admitted-site-id>
```

`wrangler.jsonc` disables the `workers.dev` entrance and mounts only that exact custom-domain route. Other `__live` paths are not part of the production contract.

Both methods require:

```text
Authorization: Bearer <HOME_SECRET>
```

`HOME_SECRET` exists only in the Cloudflare Worker secret store and the authorized Drive/Apps-Script producer. It must never appear in Git, R2, public JavaScript or receipts.

POST request bodies are bounded to 1 MiB, admit only a fixed field set, currently admit only `organism:papers`, and admit only `kind = HOME`.

Authenticated GET is transport introspection only: it returns the current deterministic `public_revision` plus the opaque `unit_key → unit_revision` ledger. It never returns unit values and is not a browser/public state API. Producers use it to reacquire the actual acknowledged baseline after local ScriptProperties loss, deployment migration, or stale-base recovery.

## R2 write semantics

`wrangler.jsonc` binds:

```text
SHADOW -> R2 bucket sss-shadow
```

The public object is one current materialized state, not an event archive. Rich state is stored as opaque keyed public units plus one deterministic `public_revision`. Unit keys and values belong to the source organism; the Worker does not interpret Papers Source/Holon/Inquiry semantics.

Normal rich circulation is acknowledged-base delta:

```text
last Worker-ACKNOWLEDGED public revision
        -> changed opaque keyed units
        -> deterministic target public revision
        -> conditional atomic replacement
        -> ACK target revision
```

The packet carries `delta.base_public_revision`, `delta.target_public_revision`, keyed `upserts` and lawful `deletes`. Each unit revision is `sha256(canonical-json(value))`; the whole public revision is `sha256(canonical-json(sorted [unit-key, unit-revision] ledger))`.

The Worker closes a delta only when:
- current revision already equals target -> `DEDUPED`, no write;
- otherwise current revision equals base;
- all changed unit revisions verify against their opaque public values;
- applying upserts/deletes computes exactly the claimed target revision;
- the R2 replacement succeeds under an ETag conditional write.

If current state is neither base nor target, the Worker returns `REBASE_REQUIRED` with the actual current revision and does not overwrite. If an ETag race is lost after the read, the Worker re-reads current state: an already-reached target dedupes; any other result becomes `REBASE_REQUIRED`.

Ordinary growth never requires a complete snapshot. If one source-derived delta would exceed the 1 MiB POST bound, the producer deterministically partitions the changed opaque units into a sequence of smaller **ordinary deltas**. Each chunk:
- starts from the immediately previous Worker-ACKed revision;
- carries only a subset of the still-different units;
- computes one deterministic intermediate public revision from that updated revision ledger;
- is conditionally written and ACKed before the next chunk is derived.

Chunking therefore introduces no second transport ontology: **a chunk is the same acknowledged-base delta law recursively applied at smaller transport scale**. A single opaque unit that cannot fit by itself is an explicit unit-granularity wound and is never silently split by Display.

The deterministic empty-map revision is a lawful first base. An empty R2 locus may therefore grow by bounded deltas without requiring one oversized first snapshot.

A complete `reconcile` unit set remains bounded integrity/legacy recovery physiology only. It is not the normal bootstrap or growth path for a state whose size can increase without bound.

Activity-only HOME packets never replace or strip the rich current object. A legacy v1 shadow is likewise preserved by activity-only traffic and requires explicit reconciliation before a rich delta can apply.

R2 conditional writes are the concurrency barrier: the Worker uses `put(..., { onlyIf })` with the previously read ETag (or `If-None-Match: *` for first materialization), so concurrent stale writers cannot silently become last-write-wins.

Drive remains authority for what an organism is; R2 stores only public-safe units the source deliberately secretes.

## Drive-side delivery

The bound `/papers/_feed` Apps Script owns delivery. Its physiology is:

```text
Papers changes
-> durable HOME
-> local _feed refresh
-> child→host UPLINK
-> one public HOME secretion to sss-live
-> R2 current object replacement if needed
```

Failed live delivery is kept in a bounded ScriptProperties outbox and creates only a temporary wound-only retry trigger. The producer reacquires the Worker revision ledger when its local ACK ledger is absent/corrupt, computes only the remaining difference to current source truth, and advances its local acknowledged ledger only after each accepted Worker target revision. A newer HOME while circulation is pending recomputes against the latest ACKed/remote ledger rather than replaying stale parcels. If the remaining difference is large, deterministic bounded delta chunks advance that same ledger one ACK at a time. Successful convergence removes the parcel. An idle organism has no polling schedule.

A visitor opening or refreshing the website never participates in this chain.

## R2 public-read safety

The bucket is private by default. Public object delivery, when enabled, uses the custom domain:

```text
assets.sss.saarland
```

The `r2.dev` public development URL remains disabled. Before the custom domain is enabled for production reads, install the intended cache/WAF/rate-limit shell. Public reads then go directly through the R2 custom domain and Cloudflare cache; they do not traverse `sss-live`.

Emergency CUT:

```text
Cloudflare R2
-> sss-shadow
-> Custom Domains
-> assets.sss.saarland
-> Disable domain
```

This removes public read access while preserving the bucket and objects. Billing alerts are secondary witnesses, not a hard shutoff.

## Production deployment

Production Worker deployment remains GitHub Actions:

```text
staging work
QuantumCephalopod/cambium
        |
        | deliberate promotion
        v
self-similar-systems/cambium:main
        |
        | .github/workflows/cloudflare-live.yml
        v
cloudflare/wrangler-action
        v
sss-live
```

Only the canonical organization repository deploys the Worker. Staging does not double-deploy production infrastructure.

Production Actions secrets remain:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

R2 itself is accessed through the Worker binding; no S3/R2 access key is required by Worker code.

## Current boundary — 2026-09-17

Actualized before this R2 mutation:

- `sss-live` deployment from the canonical organization repository is proven;
- `HOME_SECRET` is installed on Worker and bound Papers Apps Script;
- the exact `/__live/home` route has successfully accepted real Papers HOME delivery;
- Drive-side outbox/retry physiology is installed and a repeated current HOME was correctly recognized as already delivered;
- `sss-shadow` exists as a Standard R2 bucket;
- `assets.sss.saarland` is attached but deliberately unpublished while safety controls are prepared;
- the R2 public development URL is disabled;
- non-zero billable-usage alerts are configured as anomaly witnesses.

This mutation changes current public memory from Durable Object/browser-push physiology to one-way R2 shadow secretion. The old `/state` and `/watch` model is retired.

Acceptance witness for this mutation:

1. deploy the Worker with the `SHADOW -> sss-shadow` binding;
2. run one current Papers synchronization or wait for the next genuine Papers HOME;
3. observe exactly `y/papers/current.json` in the private bucket;
4. repeat the same HOME and witness `deduped: true` without replacing the object;
5. confirm no browser request is needed to create or update the object.

## Staged acknowledged-base acceptance — 2026-09-19

The current staging source now requires these regression witnesses before canonical promotion:

1. full reconciliation bootstraps one deterministic public revision;
2. an activity-only HOME performs no rich R2 write and preserves the existing object byte-for-byte;
3. a valid delta advances exactly from base to target;
4. retrying an already-reached target dedupes without a write;
5. a stale base returns `REBASE_REQUIRED` without overwrite;
6. full reconciliation recovers a valid acknowledged base;
7. a legacy v1 rich shadow survives metadata-only traffic and refuses delta until reconciliation;
8. a lost R2 ETag race cannot overwrite the concurrently advanced state;
9. unit revision mismatch is rejected.

These are transport witnesses only. Production remains unchanged until deliberate promotion to `self-similar-systems/cambium:main`, deployment, source-producer adaptation and real end-to-end delivery witnesses close the larger circulation relation.

## Growth law

This directory is infrastructure, not semantic anatomy. **Drive changes what an organism is; Git changes how Display transports/perceives it; R2 carries public/heavy state at the same site-space address. Writes happen from source change, reads are static, and carrier substrate never becomes ontology.**
