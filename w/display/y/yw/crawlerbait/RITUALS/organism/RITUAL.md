---
name: crawlerbait
description: "Local receptor for the independently rooted Crawlerbait site-holon: preserve public whole-web-traffic traces, a same-type bait population, traffic beings, and periodic raw acquisition without semantic filtering."
version: "4.3"
---

# CRAWLERBAIT SITE-HOLON RITUAL — local root

`crawlerbait` is one independently re-enterable site-holon encountered through Display Population.

Global placement is environment:

`site-space:w ⟦ crawlerbait:ε ⟧`

Its current root constitution is:

- `w · Baits / CREATE` — durable same-type path bodies in unbounded bait-space;
- `x · Traces / COPY` — durable public provider evidence plus replayable derived state;
- `z · Membrane / CONTROL` — public embodiment of the web-traffic organism;
- `y · Tide / CULTIVATE` — periodic acquisition of every new raw HTTP event the provider exposes.

`INDEX.yaml` names these four current vertex wholes and root `_cambium.yaml` carries their exact `4V / 6E / 4F / 1T` closure.

## w · Baits — path identity in unbounded same-type space

Crossing `w` restarts a separate same-type geometric address space:

`crawlerbait:w ⟦ bait-space:ε ⟧`

A bait at local address `<a>` is carried at:

`crawlerbait/w/w<a>/bait.json`

Bait identity is the observed HTTP path, never the folder address. Exact raw addresses exclude pile-up; collisions differentiate deeper. The deterministic address stream has no terminal configured depth. Its first 128 quaternary characters remain byte-for-byte compatible with the original SHA-256 carrier; later deterministic blocks extend only when deeper distinction is required.

At every finite population size deeper unoccupied addresses remain. New traffic can therefore keep differentiating bait-space without a capacity ceiling.

## x · Traces — the public web-traffic record

Cloudflare is a sensor. Crawlerbait owns the observations it has captured.

The canonical live trace source is now:

`cloudflare:httpRequestsAdaptive`

For every capture window, `x/captures/*.traffic.json` preserves the complete provider response for **every field Cloudflare advertises to this zone/token at that time**. The only acquisition predicate is the provider-required datetime interval. Crawlerbait adds no status, source, path, User-Agent, bot, relevance or identity filter.

These raw captures are ordinary public project tissue. Their exact provider bytes remain in the public repository; the outward membrane links them from `/crawlerbait/traffic.json`.

`x/cursor.json` records the end of raw provider time already owned. If the canonical raw cursor is still uninitialized, the next tide starts at the live provider retention boundary and freezes everything still available before switching to incremental acquisition.

Older material is preserved truthfully but is not extended:
- `checkpoint.json`, `*.capture.json`, and `retained-bootstrap/` are historical **404 aggregate evidence** from the earlier sensor law;
- their counts remain distinct as `legacy_404_observations`;
- they are never presented as whole-web-traffic and never added to raw request counts.

`x/state.json` is derived and replayable. Raw captures are source evidence; state is current metabolism.

## traffic beings — identity through repeated public observation

Crawlerbait does not require request order to create a moving being.

For the current provider surface, one traffic being is the exact observed tuple:

`clientIP + userAgent`

Its stable Crawlerbait ID is a deterministic hash of that exact tuple, while the public projection also carries the exact observed IP and User-Agent themselves.

Every raw event is an encounter between:
- one traffic being,
- one bait/path,
- one time.

Within any chosen time window, the being's available body/territory is simply the set of baits it touched inside that window. No historical A→B→C sequence is invented.

The derived state therefore preserves:
- Baits;
- traffic beings;
- time-stamped being↔bait encounters;
- direct source-file/index witnesses back to the exact raw provider event.

## z · Membrane — public means public

Crawlerbait exists to make web traffic publicly encounterable.

The membrane publishes:
- `/crawlerbait/state.json` — current Baits, traffic beings and encounter relation;
- `/crawlerbait/traffic.json` — manifest linking the exact public raw capture files;
- path/receipt pages under `/crawlerbait/*`;
- the Display projection/renderer that visualizes the same living body.

There is no privacy-redaction layer, private-custody branch, encryption membrane, or hidden “safe” derivative inside Crawlerbait. Provider credentials remain secret because they authorize future acquisition; captured observations do not.

Observed HTTP paths never become canonical folder taxonomy. They remain bait identity fields whose bodies inhabit tetrahedral address-space.

## y · Tide — one physiology, one data law

`y/capture.py` performs the only recurring provider acquisition.

Each run:
1. asks Cloudflare which raw HTTP fields are currently available;
2. resolves those fields against the live GraphQL schema;
3. captures only not-yet-owned time;
4. preserves every returned event/field with no semantic filter;
5. recursively subdivides a saturated provider window rather than silently truncating;
6. writes raw captures and the raw cursor before downstream metabolism.

`y/tide.py` performs zero provider calls. It rebuilds current Baits, traffic beings, encounters and public membrane from owned local evidence.

`y/replay.py` performs zero provider calls and proves the same body can be regenerated entirely from local Traces.

Canonical motion:

`Cloudflare NEW raw window → x/captures/*.traffic.json + x/cursor`

then

`owned Traces → x/state → w Baits + traffic beings/encounters → z public Membrane`

The scheduled tide runs every six hours. A change to the capture/metabolism law also earns one immediate tide on main so the body does not wait for the next clock edge.

## address-space invariants

- occupant identity is independent of address;
- exact raw addresses exclude pile-up;
- pressure differentiates colliding addresses deeper;
- address is geometric genealogy, not category;
- the visible background is the bait-space itself;
- Traces, Membrane and Tide remain sibling organism anatomy, not fake background vertices;
- traffic beings are not Baits: Baits are loci, beings are recurring observed identities whose encounters span loci through time.

## closure

A Crawlerbait change closes only when:
1. root `w/x/z/y` still realize Baits / Traces / Membrane / Tide and root `4V/6E/4F/1T` remains closed;
2. `w` contains only addressed bait bodies;
3. future acquisition uses `httpRequestsAdaptive` and every provider-advertised field with datetime bounds only;
4. raw provider windows are persisted before downstream metabolism and remain public source evidence;
5. historical 404 evidence remains explicitly separate and is never extended;
6. `x/state.json` is replayable from owned Traces without provider access;
7. traffic identity is exact observed `clientIP + userAgent`, with no invented traversal order;
8. the public membrane exposes current state plus direct access to the exact raw traffic captures;
9. Cloudflare credentials never enter repository/public bytes;
10. bait identity survives address deepening;
11. bait-space retains no terminal configured depth;
12. exact build/address/tetrahedral/capture/replay/public witnesses pass.

Compression: **All web traffic becomes public living matter: paths become Baits, repeated network identities become traffic beings, time windows expose their touched loci, and the Tide keeps the exact same raw provider surface flowing forward.**
