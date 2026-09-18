---
name: crawlerbait
description: "Local receptor for the independently rooted Crawlerbait site-holon: preserve a same-type bait population, durable captured traces, a bounded passive membrane and periodic local tide without heuristic ecological filtering or repeated provider-history fetches."
version: "4.2"
---

# CRAWLERBAIT SITE-HOLON RITUAL — local root

`crawlerbait` is one independently re-enterable site-holon encountered through Display Population.

Global placement is environment:

`site-space:w ⟦ crawlerbait:ε ⟧`

Its current root constitution is:

- `w · Baits / CREATE` — durable same-type crawlerbait bodies;
- `x · Traces / COPY` — durable captured provider evidence plus derived longitudinal trace state;
- `z · Membrane / CONTROL` — sensing/public/credential boundary;
- `y · Tide / CULTIVATE` — periodic acquisition of only new pressure and local downstream regrowth.

`INDEX.yaml` names these four current vertex wholes and root `_cambium.yaml` carries their exact `4V / 6E / 4F / 1T` closure.

## w · Baits — same-type population membrane

`w` is exclusively the Bait population.

Crossing the vertex restarts a separate same-type geometric address space:

`crawlerbait:w ⟦ bait-space:ε ⟧`

A bait at local bait-space address `<a>` is carried at:

`crawlerbait/w/w<a>/bait.json`

The outer `w` is the Crawlerbait CREATE vertex and is stripped at the bait-space membrane. One exact raw bait-space address may contain one bait. Bait identity is the observed HTTP path, not its current bait-space placement. Placement is deterministic nonsemantic geometry derived from stable path identity; address collisions differentiate deeper until exact occupancy is unique.

The address stream has **no terminal configured depth**. Its first 128 quaternary characters preserve the original SHA-256-derived carrier exactly; if pressure ever exhausts that prefix, additional deterministic hash blocks extend the same identity stream without moving any already-distinguished shallower bait. At every finite population size there remain deeper unoccupied addresses, so growth never closes bait-space by capacity.

Each bait locus contains only its `bait.json` body. Renderer, stylesheet, public secretion, acquisition and tide machinery do not belong in `w`.

## x · Traces — provider evidence becomes owned memory

Cloudflare is a sensor, not Crawlerbait's memory.

`x` separates three distinct trace roles:

- `checkpoint.json` — the one migration baseline containing all already-assimilated history that had been fetched before immutable raw capture storage existed;
- `captures/*.json` — immutable **filtered 404 aggregate** provider windows captured after that baseline for the existing bait-metabolism pipeline, including empty windows so coverage itself is explicit evidence;
- `state.json` — derived current longitudinal aggregate used by Baits and Membrane; it may be regenerated locally from checkpoint + captures.

`x/cursor.json` records only the end of provider time already captured. Acquisition begins exactly there and never intentionally re-queries older windows merely because downstream processing changes.

The migration checkpoint is deliberately honest: the earlier full-history fetch was already metabolized before raw-window persistence existed, so its exact pre-aggregation response cannot be reconstructed without wastefully asking the provider again. We preserve that already-owned aggregate as the fixed baseline and capture raw windows from that point forward. Do not refetch old provider history solely to make the past look more raw.

There is no relevance filter, recurrence threshold, ranking, shortlist or route/signature budget inside the existing 404 bait-metabolism stream. User-Agent strings remain client claims, not authenticated identities. That legacy stream intentionally contains only the fields its old query asked for and **must not be called provider-raw evidence**.

The bait body and trace memory are related but not identical:
- `w` answers *what bait exists and where it lives in bait-space*;
- `x` answers *what evidence Crawlerbait already owns and what current trace state follows from it*.

## z · Membrane — bounded sensing and outward embodiment

`z` owns the site-holon membrane implementation:
- `policy.json` — capture-window mechanics only;
- `projection.json` — derived Display-facing view;
- `render.js` / `style.css` — Crawlerbait phenomenology;
- `public/` — generated crawler-facing static secretion.

Crawlerbait never writes public bait pages at global root paths such as `/login` or `/papers`. Every outward route remains under `/crawlerbait/*`.

Observed path is evidence. Public representation is a separate membrane consequence. When an observed path can be mirrored as ordinary static components, the public receipt uses `/crawlerbait/bait/<observed-shape>/`; otherwise it uses `/crawlerbait/receipt/<stable-id>/`. Representation differences never erase observation.

## y · Tide — acquire once, metabolize locally forever

`y/capture.py` performs provider acquisition. It queries only the interval after `x/cursor.json`, partitions a missed interval into bounded windows, and appends one immutable capture file per queried window. It never mutates Baits or Membrane.

`y/tide.py` performs ordinary downstream metabolism. It reads already-captured local windows, advances `x/state.json`, and regenerates `w · Baits` plus `z · Membrane`. It performs zero provider calls.

`y/replay.py` rebuilds downstream state entirely from the fixed local checkpoint plus immutable captures. It is the normal response to a later processing/addressing/rendering-law change. Replay performs zero provider calls.

Canonical motion is therefore two explicit edges:

`Cloudflare NEW window → x/captures + x/cursor`

then

`local Traces → x/state → w Baits → z Membrane`

The capture edge is persisted before downstream metabolism. If downstream processing fails, already-captured provider evidence remains durable and the next tide can retry locally without requesting the same window again.

### retained 404 aggregate freeze — historical evidence, not provider-raw

The sealed `x/retained-bootstrap/` archive is retained permanently, but its meaning is narrower than previously named. It preserves every byte returned by one historical **filtered analytics query**:

`httpRequestsAdaptiveGroups · requestSource=eyeball · status=404 · groupBy(path,userAgent)`.

That archive is valuable immutable evidence of the bait stream, but it is **not** “all Cloudflare raw data” and must never again be described that way. The completeness claim applies only to the responses of that exact query over the retained interval that existed when it was sealed.

### one-time provider-raw repair — complete accessible HTTP-event surface

While provider retention still contains data that was omitted by the earlier narrow query, Crawlerbait opens one bounded repair aperture: `y/provider_raw_once.py` plus the `crawlerbait provider-raw freeze ONCE` workflow.

For this repair, **provider-raw** means:

> every raw HTTP-request field and event surface Cloudflare exposes to this exact zone/token/plan within its still-retained history, with no Crawlerbait relevance/status/source/path/UA filter.

The repair must:
- snapshot GraphQL schema discovery and the live `httpRequestsAdaptive` Settings node before acquisition;
- request every field named by provider `availableFields`, respecting only provider `maxNumberOfFields`, `maxPageSize`, `maxDuration` and `notOlderThan`;
- query `httpRequestsAdaptive` with **time bounds only** and recursively split saturated time windows rather than accepting silent page truncation;
- probe Logpull, Log Explorer and Logpush HTTP-request field surfaces and preserve those provider responses as evidence of what this token/plan did or did not expose;
- when Logpull is available, request **all listed fields**, no `count`, no `sample`, and only transport time-window parameters;
- preserve provider responses verbatim. Field slicing caused by a provider field-count limit is transport partitioning, not semantic selection;
- record all provider/plan/sampling/retention limits explicitly in the archive manifest;
- fail rather than claim completeness if a one-second GraphQL window still saturates the provider page ceiling.

True raw HTTP evidence may contain client IPs, query strings, TLS/security fingerprints or other sensitive material. Therefore its plaintext **must never enter this public Git repository or public membrane**. The one-time runner encrypts the complete private archive before artifact custody; the decryption private key is held separately in private Drive custody. Only privacy-safe derived organism projections may later return to the public body.

The old 404 checkpoint/captures/retained-bootstrap remain valid evidence for the already-grown bait physiology. Provider-raw repair augments source custody; it does not retroactively rename or discard those earlier tissues.

Ordinary crawler reads remain static CDN/Pages traffic and invoke no Worker merely to announce presence.

## address-space invariants

The same-type population law is intentionally the same family of relation used by Display Population:
- occupant identity is independent of address;
- exact raw addresses exclude pile-up;
- pressure differentiates a colliding address deeper rather than inventing a named bucket;
- address is geometric genealogy, not a category label;
- projection/visualization reads the actual address tree instead of reconstructing synthetic point placement;
- Crawlerbait's background field is the bait-space itself, rooted at `crawlerbait:w ⟦ bait-space:ε ⟧`; Traces, Membrane and Tide remain organism anatomy but do not occupy that local visualization field.

This is why `/login`, `/.env`, `/wp-json`, etc. are never directory taxonomy inside the canonical body. They remain bait identity fields in `bait.json`; the physical tree is recursive bait-space.

## closure

A Crawlerbait change closes only when:
1. root `w/x/z/y` still realize Baits / Traces / Membrane / Tide and root `4V/6E/4F/1T` remains closed;
2. `w` contains only addressed bait bodies;
3. the sealed `x/retained-bootstrap` is named truthfully as a complete freeze of its old filtered 404 aggregate query, not as provider-raw HTTP history;
4. while the repair aperture is active, every raw HTTP-request field/event surface exposed to this zone/token is discovered and frozen without semantic traffic filters before retained history expires;
5. provider-raw plaintext never enters the public repository or membrane; private evidence is encrypted before external artifact custody and its private key remains separate;
6. provider windows captured during normal operation are durable local evidence and are never re-requested because downstream law changed;
7. `x/state.json` remains explicitly derived from owned local memory;
8. capture persists new filtered bait-stream windows/cursor before downstream metabolism can fail;
9. `z` alone carries public/static/renderer membrane tissue plus the provider-raw **public** encryption key; no private key or plaintext raw event archive may enter the tree;
10. Cloudflare credentials never enter repository/public bytes;
11. ordinary crawler reads remain static;
12. bait identity survives bait-space relocation/deepening;
13. the bait-space address carrier has no terminal configured depth and preserves all existing prefixes while extending deeper on demand;
14. the local background visualizes only bait-space anatomy, never the sibling Traces/Membrane/Tide vertices;
15. exact build/address/tetrahedral/provider-raw/capture/replay/public witnesses pass.

Compression: **Own the provider evidence before interpretation: the old 404 archive is exactly what its filtered query returned; provider-raw means the entire accessible raw HTTP-event surface with no semantic traffic filter, held privately. Then interpretation may grow Baits, Crawlers and timelines without asking Cloudflare to remember our past for us.**
