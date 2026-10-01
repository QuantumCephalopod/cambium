# NUTRIENT — private recognition / public phenotype

status: OPEN / ADMITTED
source: explicit user encounter in chat
date: 2026-10-01
target: github.cambium.display.crawlerbait
owner: Crawlerbait

## encounter

The current public Crawlerbait should preserve the ability to recognize recurring traffic beings and visualize their actual observed relation to bait-space without publishing the recognition material itself.

User decisions:
- `clientRequestQuery` has no sufficient current functional/artistic gain and should not be captured at all.
- literal client IP must remain non-public and should exist only transiently at the capture boundary for recognition.
- the stable IP-derived network pseudonym must also remain non-public.
- exact User-Agent and other provider values may contribute to recognition / phenotype but should not be exposed as readable public attributes merely because they were observed.
- public Crawlerbait should expose an opaque artwork-local being identity and the being's metabolized body/encounter relations, not the private measurements by which the organism recognized it.
- rich provider dimensions may influence body colour, texture, morphology, motion or other phenotype only through irreversible/keyed interference rather than readable attribute publication.
- a visitor who knows their own encounter may still recognize themselves in the artwork from context; Crawlerbait should not become a reverse-lookup interface for private recognition material.

## currently earned functional minimum

Current living implementation can preserve its essential phenotype from:
- `datetime`
- `clientIP` transiently, solely to derive stable recognition
- `userAgent` transiently, as part of current being continuity
- `clientRequestPath` for Bait identity and encounter topology
- `clientRequestHTTPMethodName`
- `edgeResponseStatus`

`clientRequestQuery` is not required for Bait identity, Being identity, Being kind, walk topology, colonies, crawlercam or current HUD/body physiology.

## pressure

The current public repository still persists public raw traffic captures containing `clientIPIdentity`, exact `userAgent`, query strings and many readable provider dimensions. Removing those only from the renderer would be cosmetic rather than a true publication membrane.

The desired relation is:

`provider encounter → transient recognition/raw sensing → immediate metabolism → public artwork identity + necessary encounter topology + irreversible phenotype → discard readable recognition/raw values`

The public organism must not require a separately published network pseudonym or exact User-Agent to preserve longitudinal Being continuity.

## 70-field relation

The current Cloudflare field-width wound is separate from public identity. If rich auxiliary dimensions remain useful for phenotype, field acquisition may recursively split into bounded provider calls. Exact functional encounter truth must remain independently grounded; auxiliary phenotype calls must not be heuristically reassembled into a false exact event.

## unresolved implementation obligations

- define the stable artwork-local Being ID from transient recognition without publishing the network pseudonym;
- define an order-independent/keyed phenotype interference that cannot be inverted into readable provider attributes;
- stop requesting `clientRequestQuery`;
- replace public raw captures with a replayable public carrier containing only metabolized encounter/phenotype consequences;
- run the prepared authoritative migration: condense every historical non-query auxiliary provider value into opaque per-Being DNA before retiring its readable current-tree representation; earlier Git history remains truthfully already-public;
- preserve Baits / Traces / Membrane / Tide closure and current Being-kind law;
- restore Tide through the provider field-width limit without inventing event joins.

Compression:

> Crawlerbait may know how it recognized a Being without telling the public how. Publish the body and the encounter relation, not the recognition substrate.


## 2026-10-01 correction — condensation precedes retirement

The first staging migration incorrectly reduced pre-v5 carriers to the functional five-field record while leaving `phenotype_by_being` empty. That would discard historical phenotype information and is not accepted. The corrected migration remains OPEN until authoritative Tide can use the real recognition key: query is excreted; recognition fields remain transient/private; every other historical provider observation is first collapsed into the same opaque phenotype domain, including nested structures, and only then may the readable carrier retire.
