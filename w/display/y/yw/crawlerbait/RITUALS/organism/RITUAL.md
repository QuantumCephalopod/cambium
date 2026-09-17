---
name: crawlerbait
description: "Local receptor for the independently rooted Crawlerbait site-holon: preserve a same-type bait population, durable captured traces, a bounded passive membrane and periodic local tide without heuristic ecological filtering or repeated provider-history fetches."
version: "4.1"
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

Each bait locus contains only its `bait.json` body. Renderer, stylesheet, public secretion, acquisition and tide machinery do not belong in `w`.

## x · Traces — provider evidence becomes owned memory

Cloudflare is a sensor, not Crawlerbait's memory.

`x` separates three distinct trace roles:

- `checkpoint.json` — the one migration baseline containing all already-assimilated history that had been fetched before immutable raw capture storage existed;
- `captures/*.json` — immutable provider windows captured after that baseline, including empty windows so coverage itself is explicit evidence;
- `state.json` — derived current longitudinal aggregate used by Baits and Membrane; it may be regenerated locally from checkpoint + captures.

`x/cursor.json` records only the end of provider time already captured. Acquisition begins exactly there and never intentionally re-queries older windows merely because downstream processing changes.

The migration checkpoint is deliberately honest: the earlier full-history fetch was already metabolized before raw-window persistence existed, so its exact pre-aggregation response cannot be reconstructed without wastefully asking the provider again. We preserve that already-owned aggregate as the fixed baseline and capture raw windows from that point forward. Do not refetch old provider history solely to make the past look more raw.

There is no relevance filter, recurrence threshold, ranking, shortlist or route/signature budget. User-Agent strings remain client claims, not authenticated identities. The current sensor does not request client IP addresses.

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

### one-time retained-history freeze — setup aperture, not physiology

During the present setup window only, while Cloudflare still retains historical analytics that will later expire, Crawlerbait must freeze **every still-retained provider response as raw as this API exposes it** into `x/retained-bootstrap/`.

`y/bootstrap_once.py` and the manual `crawlerbait retained-history bootstrap ONCE` workflow exist only to close this historical custody gap. They:
- query the complete provider-retained interval available at execution time;
- preserve the full returned GraphQL payload for each leaf time window, not merely the downstream aggregate;
- snapshot the provider retention/page/window settings used;
- recursively split a time window when it hits the provider page ceiling so transport truncation is not silently accepted;
- seal the archive once complete;
- never refresh that archive later.

This is deliberately **one-time setup**, because the provider deletes old history. After the seal exists, the temporary bootstrap aperture has finished its only job and should be removed from active workflow code. Future sensing is incremental only through `capture.py`.

The already-owned pre-bootstrap aggregate checkpoint remains valuable because some oldest provider time may disappear before this raw freeze can recover it. The raw retained bootstrap is additional source evidence, not permission to discard earlier owned memory.

Ordinary crawler reads remain static CDN/Pages traffic and invoke no Worker merely to announce presence.

## address-space invariants

The same-type population law is intentionally the same family of relation used by Display Population:
- occupant identity is independent of address;
- exact raw addresses exclude pile-up;
- pressure differentiates a colliding address deeper rather than inventing a named bucket;
- address is geometric genealogy, not a category label;
- projection/visualization may read the actual address tree instead of reconstructing synthetic point placement.

This is why `/login`, `/.env`, `/wp-json`, etc. are never directory taxonomy inside the canonical body. They remain bait identity fields in `bait.json`; the physical tree is recursive bait-space.

## closure

A Crawlerbait change closes only when:
1. root `w/x/z/y` still realize Baits / Traces / Membrane / Tide and root `4V/6E/4F/1T` remains closed;
2. `w` contains only addressed bait bodies;
3. during setup, every provider window still retained is frozen once into the sealed raw retained-bootstrap before that history expires;
4. after sealing, historical bootstrap is never refreshed or treated as recurring physiology;
5. provider windows captured during normal operation are durable local evidence and are never re-requested because downstream law changed;
6. `x/state.json` remains explicitly derived from owned local memory;
7. capture persists new raw windows/cursor before downstream metabolism can fail;
8. `z` alone carries public/static/renderer membrane tissue;
9. Cloudflare credentials never enter repository/public bytes;
10. ordinary crawler reads remain static;
11. bait identity survives bait-space relocation/deepening;
12. exact build/address/tetrahedral/bootstrap/capture/replay/public witnesses pass.

Compression: **While the historical window still exists, freeze it raw once. Then Cloudflare only senses the future, Traces remembers locally, and every downstream reinterpretation replays owned evidence rather than refetching the past.**
