---
name: crawlerbait
description: "Local receptor for the independently rooted Crawlerbait site-holon: preserve public whole-web-traffic traces, a same-type bait population, stable traffic beings, and periodic field-complete acquisition without semantic filtering."
version: "4.4"
---

# CRAWLERBAIT SITE-HOLON RITUAL — local root

`crawlerbait` is one independently re-enterable site-holon encountered through Display Population.

Global placement is environment:

`site-space:w ⟦ crawlerbait:ε ⟧`

Its current root constitution is:

- `w · Baits / CREATE` — durable same-type path bodies in unbounded bait-space;
- `x · Traces / COPY` — durable public whole-web-traffic evidence plus replayable derived state;
- `z · Membrane / CONTROL` — public embodiment and the narrow capture-time secret boundary;
- `y · Tide / CULTIVATE` — periodic acquisition of every new HTTP event/field the provider exposes.

`INDEX.yaml` names these four current vertex wholes and root `_cambium.yaml` carries their exact `4V / 6E / 4F / 1T` closure.

## w · Baits — path identity in unbounded same-type space

Crossing `w` restarts a separate same-type geometric address space:

`crawlerbait:w ⟦ bait-space:ε ⟧`

A bait at local address `<a>` is carried at:

`crawlerbait/w/w<a>/bait.json`

Bait identity is the observed HTTP path, never the folder address. Exact raw addresses exclude pile-up; collisions differentiate deeper. The deterministic address stream has no terminal configured depth. Its first 128 quaternary characters remain byte-for-byte compatible with the original SHA-256 carrier; later deterministic blocks extend only when deeper distinction is required.

At every finite population size deeper unoccupied addresses remain. New traffic can therefore keep differentiating bait-space without a capacity ceiling.

## x · Traces — glasshouse whole-web-traffic record

Cloudflare is a sensor. Crawlerbait owns the observations it has captured.

The canonical live source is:

`cloudflare:httpRequestsAdaptive`

Every live capture requests every field Cloudflare advertises to this zone/token at that moment. The query uses only provider-required datetime bounds; Crawlerbait adds no status, source, path, User-Agent, bot, relevance, human/bot or identity filter.

Before public persistence, exactly one provider field crosses a stable keyed identity transform:

`clientIP → clientIPIdentity = HMAC-SHA256(K_v1, "crawlerbait:clientIP:v1\0" + canonical(clientIP))`

where `K_v1` is the persistent GitHub Actions secret `CRAWLERBAIT_ID_KEY`.

The transform law is intentionally narrow:
- the literal `clientIP` exists only inside the capture runner long enough to compute the identity and is not persisted;
- equal canonical IPs under the same key epoch produce exactly equal `clientIPIdentity` values, including months later;
- different IPs are not intentionally coalesced;
- the transform is one-way HMAC, not reversible encryption;
- every other captured provider field — datetime, path, query, User-Agent, session hash, ASN, country, device, status, security/bot metadata and any future provider-advertised field — remains public as captured;
- a key fingerprint is persisted so accidental secret rotation can be detected without exposing the key;
- changing the secret while remaining in key epoch `v1` is a continuity error and capture must stop rather than silently remint all beings.

The resulting `x/captures/*.traffic.json` files are ordinary public project tissue. They are field-complete provider events **except for this explicit deterministic IP representation**. The membrane links them from `/crawlerbait/traffic.json`.

`x/cursor.json` records the end of provider time already owned plus the identity-key fingerprint. If the canonical cursor is still uninitialized, the next tide begins at the live provider retention boundary and freezes everything still available before switching to incremental acquisition.

Older material is preserved truthfully but is not extended:
- `checkpoint.json`, `*.capture.json`, and `retained-bootstrap/` are historical filtered 404 aggregate evidence;
- their counts remain distinct as `legacy_404_observations`;
- they are never presented as whole-web-traffic and never added to canonical request counts.

`x/state.json` is derived and replayable. Public traffic captures are source evidence; state is current metabolism.

## traffic beings — stable relation without literal IP publication

Crawlerbait does not require request order to create a moving being.

For the current public trace surface:
- one stable **network identity** is `clientIPIdentity`;
- one current **traffic being** is the exact tuple `clientIPIdentity + userAgent`;
- its Crawlerbait being ID is a deterministic hash of that tuple.

The HMAC key is needed only when fresh provider events cross the capture membrane. Historical public events already carry the stable network identity, so later metabolism/replay compares those tokens directly and never needs to decrypt or recover an IP.

Every canonical event is an encounter between:
- one traffic being;
- one bait/path;
- one time.

Within any chosen time window, the being's available body/territory is the set of baits it touched inside that window. No historical A→B→C traversal is invented.

The derived state preserves:
- Baits;
- stable traffic beings;
- time-stamped being↔bait encounters;
- direct source-file/index witnesses back to the exact public capture record;
- provider fields needed for later alternative readings without deciding in advance which patterns matter.

## z · Membrane — public means public

Crawlerbait exists to make web traffic publicly encounterable.

The membrane publishes:
- `/crawlerbait/state.json` — current Baits, traffic beings and encounter relation;
- `/crawlerbait/traffic.json` — manifest linking the exact public capture files and declaring the IP transform;
- path/receipt pages under `/crawlerbait/*`;
- the Display projection/renderer that visualizes the same living body.

There is no private raw-data branch, encrypted archive physiology or privacy-safe derivative ontology inside Crawlerbait. The narrow secret boundary exists only so literal IP can become a stable longitudinal public identity before persistence.

Two secrets remain non-public because they authorize/define future capture:
- Cloudflare acquisition credentials;
- `CRAWLERBAIT_ID_KEY`.

Captured observations themselves are public. Query strings and other attacker-controlled request material remain part of the observed public trace rather than being silently truncated or sanitized by a hidden relevance policy.

Observed HTTP paths never become canonical folder taxonomy. They remain bait identity fields whose bodies inhabit tetrahedral address-space.

## y · Tide — one physiology, one data law

`y/capture.py` performs the only recurring provider acquisition.

Each run:
1. reacquires Cloudflare's live `httpRequestsAdaptive` settings and available fields;
2. resolves all advertised fields against the live GraphQL schema;
3. reacquires the stable `CRAWLERBAIT_ID_KEY` from GitHub Actions;
4. refuses to continue if its key fingerprint would silently break the current identity epoch;
5. captures only not-yet-owned provider time;
6. replaces literal `clientIP` with stable `clientIPIdentity` before any capture file is written;
7. preserves every other returned event/field with no semantic filter;
8. recursively subdivides saturated provider windows rather than accepting page truncation;
9. writes public captures and cursor before downstream metabolism.

`y/tide.py` performs zero provider calls and needs no identity secret. It rebuilds current Baits, traffic beings, encounters and public membrane from owned local evidence.

`y/replay.py` likewise performs zero provider calls and proves the same body can be regenerated entirely from local Traces.

Canonical motion:

`Cloudflare NEW whole event → capture-time HMAC(clientIP) → x/captures/*.traffic.json + x/cursor`

then

`owned public Traces → x/state → w Baits + traffic beings/encounters → z public Membrane`

The scheduled tide runs every six hours. A change to capture/metabolism law also earns one immediate main-branch tide so the body need not wait for the next clock edge.

## address-space invariants

- occupant identity is independent of address;
- exact raw addresses exclude pile-up;
- pressure differentiates colliding addresses deeper;
- address is geometric genealogy, not category;
- the visible background is the bait-space itself;
- Traces, Membrane and Tide remain sibling organism anatomy, not fake background vertices;
- traffic beings are not Baits: Baits are loci; beings are recurring observed identities whose encounters span loci through time.

## closure

A Crawlerbait change closes only when:
1. root `w/x/z/y` still realize Baits / Traces / Membrane / Tide and root `4V/6E/4F/1T` remains closed;
2. `w` contains only addressed bait bodies;
3. future acquisition uses `httpRequestsAdaptive` and every provider-advertised field with datetime bounds only;
4. literal `clientIP` never persists, while stable `clientIPIdentity` preserves equality across time under the same v1 secret;
5. accidental HMAC-key rotation is detected and refused rather than silently breaking longitudinal identity;
6. every non-IP provider field remains public and untruncated by Crawlerbait semantics;
7. public provider windows persist before downstream metabolism;
8. historical 404 evidence remains explicitly separate and is never extended;
9. `x/state.json` is replayable from owned public Traces without provider access or the HMAC key;
10. traffic-being identity is `clientIPIdentity + userAgent`, with no invented traversal order;
11. the public membrane exposes current state plus direct access to the public capture files and their transform declaration;
12. provider credentials and `CRAWLERBAIT_ID_KEY` never enter repository/public bytes;
13. bait identity survives address deepening;
14. bait-space retains no terminal configured depth;
15. exact build/address/tetrahedral/capture/replay/public witnesses pass.

Compression: **All web traffic becomes public living matter. Literal IP crosses one stable keyed membrane into a durable equality-preserving network identity; everything else remains glasshouse-visible, and the same Tide keeps that relation alive across time.**
