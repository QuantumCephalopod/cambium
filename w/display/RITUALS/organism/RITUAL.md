---
name: display
description: "Visitor-facing Display organism: an oriented membrane whose Population vertex physically addresses autonomous site-holons; repository anatomy is the global mount truth."
version: "3.15"
---

# DISPLAY ORGAN RITUAL — local root

`display` is the visitor-facing organ of `cambium`. It owns how admitted organism truth becomes perceptible; it does not own the semantic constitution of the independent organisms it depicts.

## Boundary

- host whole: `cambium`
- outer host locus: `w / expression`
- physical custody: `w/display/`
- inner root: this directory

Host `w ⟦ display:root ⟧` is a membrane/scope transition, never fake host `ww`.

## Earned local phenotype

Display has differentiated into one complete local tetrahedral 4V:

- `w · Embodiment` — local world, shader, background and manifestation;
- `x · Continuity` — stable interlocutor identity, local-root/state/activity continuity and relocation;
- `z · Orientation` — global address perception, navigator, camera, shared orientation and membrane movement;
- `y · Population` — actual page-organisms physically admitted into global site-space.

`INDEX.yaml` carries these four atomic nouns and `_cambium.yaml` closes their `4V/6E/4F/1T` relation. The `w/x/z/y` directories carry all active functional tissue. After differentiation the Display root contains only canonical shell/receptors/constitution plus those four child addresses; there is no shared fifth functional layer.

## Population is the site-space membrane

Crossing Display `y` restarts the global site-holon address space:

`display:y ⟦ site-space:ε ⟧`

Physical custody encodes global site address:

- a site-holon directly under `w/display/y/` occupies site-space `ε / overview`;
- a site-holon under `w/display/y/y<address>/` occupies site-space `<address>`;
- thus `w/display/y/yw/crawlerbait/` means Crawlerbait at global site-space `w`;
- thus `w/display/y/yy/papers/` means Papers at global site-space `y`;
- recursion continues by the same `{w,x,z,y}*` law.

The outer first `y` is Display Population custody, not part of the restarted site address.

No empty address directories are fabricated. Physical site-holon presence determines whether a global navigation target exists.

## Autonomous site-holon body

A site-holon is one movable body. Its `site.json` declares stable identity, local scope, shader and manifestation contracts plus body-local projection/render/style members.

Address is environment, not identity. Moving the whole body to another lawful Population address must remount it without editing its internal bytes.

Current first bodies:

- `w/display/y/philosophy/` -> global `ε / overview` -> `organism:philosophy`;
- `w/display/y/yw/crawlerbait/` -> global `w / Form` -> `organism:crawlerbait`;
- `w/display/y/yy/papers/` -> global `y / Inquiry` -> `organism:papers`.

Philosophy retains its own independently rooted recursive organism anatomy inside its body. Papers remains independently rooted at `papers:ε` even while globally mounted at site-space `y`. Crawlerbait remains locally rooted at `crawlerbait:ε`; its machine-facing HTTP bait routes are local public apertures, not additional global site-space addresses.

## Shared body / local phenomenology

Display supplies the common body law, not a common aesthetic. Every site-holon remains geometrically self-similar through the same tetrahedral topology, camera/projection law, shared orientation state and global membrane/navigation physiology, while its local appearance and behavior remain identity-owned.

Display owns:
- shared tetrahedral body topology and geometric projection;
- shared orientation coupling and global camera relation;
- global site-space navigation, target-origin fold and membrane law;
- neutral generic couplings required for arbitrary site-holons to inhabit that body — including the live glass-drop geometry in every render context (`lens()` → viewport `{x, y, r, held, docked}` or null; Display lends where the drop lies, the site decides what it means), a site composite (a site whose body lives in its own canvases may offer `shader.composite()` returning them in paint order; while glass is active the field draws them into its scene so the same invariant glass refracts them, and marks itself `data-composite="1"` so the site's own style can let its originals step back), and one optional site layer: a site shader may carry `afterDraw`, which Display calls once per frame inside the site's own field, after geometry and floating bodies and before the point layer, lending it the current Descent frame (`proj`, `view`, `model`, `frame`, `container`, orientation, size). Display restores its framebuffer/viewport afterwards and contains a failing layer; what the layer draws means nothing to Display.

The site-holon owns:
- its public/local projection boundary;
- its renderer and style;
- its shader/material phenomenology;
- its local interaction and organism-specific navigation inside its own body;
- any locally earned static public aperture carried under its own `public/` surface.

Therefore two site-holons may look and behave radically differently while the same tetrahedral body moves isomorphically under one global orientation. Shader and local interaction are bound to interlocutor identity, never to global mount address.

Default mutation law: if pressure originates in one site-holon, keep the change inside that body. Lift tissue into Display only when the change is genuinely specimen-agnostic, required by arbitrary future site-holons, and leaves semantic/local behavior in the site body. Central Display must never learn Papers-, Philosophy- or Crawlerbait-specific meaning merely to support their local expression.

### Mounted anatomy and frame work

The current static runtime parses one source snapshot per mounted site. Derive that site's `fieldProjection` once during mounted-field initialization and share the same projected anatomy between its own field, host environment and floating body. View, language, activity and address-remount movement do not recreate that source anatomy. A new source snapshot requires new mounted-field/runtime initialization; this is not a new in-place update API. Dynamic appearance and movement remain in source-owned render/shader hooks.

Each field's gene-label update owns only its four gene labels; it must not hide autonomous body labels because those have no gene tag. Reuse the frame's canvas rectangle within that draw. Refracted label ink may reuse computed styles within one collection only, while reading current DOM text, geometry, opacity and source styles afresh in the next collection. Atlas identity, GL-state restoration, fallback paint and geometry remain intact.

### Identity-resolved foreign embodiment

Display may host an intact foreign code body at the **currently truthful semantic locus** without tetrahedralizing that body's interior or inventing a new semantic container merely for custody. A foreign body remains one occupant until real local pressure earns finer Display addressability.

Display realizes the shared Cambium distinction:

`stable identity != current semantic address != physical custody`

- **identity** names which foreign whole/capability is being depended on;
- **semantic address** says what that whole currently means inside Display;
- **custody** says where its current carrier lives in the repository.

Consumers bind to stable identity/capability, never to the current semantic address or repository path. `y/build.py` reacquires current Display `INDEX.yaml`, traverses only realized Display loci, inspects direct occupants there, and derives a public dependency projection. Traversal does not recursively crawl arbitrary folders and does not cross site-holon/independent-organism membranes. Runtime hands each site renderer one neutral `dependency(identity, member)` resolver; site-local code never needs to know whether the foreign body currently lives at `w`, a later descendant, or another lawfully regrown Display locus.

Current first realization: the intact `@chenglou/pretext` 0.0.9 body lives directly in unsplit `w · Embodiment`. Its native `VERSION.json` is the current identity witness. This does **not** split Embodiment and does not make Pretext a Display semantic vertex. If Embodiment later differentiates under real pressure, Cambium may move the same foreign identity to whichever earned child then accounts for it; the derived dependency projection changes while consumers remain unchanged.

### Type is body

Display speaks in one main face: Philipp's **SpriteSheet** (`@sss/spritesheet` package 2.0.0), an intact body at unsplit `w · Embodiment` beside Pretext, resolved by its `VERSION.json` identity like any hosted body. Its supplied Mono v2 build is the main type for both Display font tokens, with 1024 units per em; every glyph sits centred in one fixed 1024-unit cell, and fixed width is part of the face's identity, so a correction that lets letters drift out of their cells is a wound to the face. The alphabet is A–Z and space: rendered text is folded into it (`Ä→AE`, `Ö→OE`, `Ü→UE`, `ß→SS`, case kept) by `w/display-type.js`, and digits and marks fall back glyph by glyph to the next family. A subtree keeps its own spelling with `data-type-fold="off"`. The existing Regular build remains unchanged at 1.0.1. Site-holons inherit the face unless their own style says otherwise.

Entry-copy scale belongs to the site's actual mounted content class, not an obsolete carrier selector. The overview introduction remains secondary to the field, with bounded responsive type and a width tied to its real panel. `ch` is not a truthful main-alphabet cell here: it measures the zero glyph or its fallback measure, while this face has no zero glyph. Typography does not alter semantic labels, camera, body geometry or navigation.

Text in Display is body, not label. Where text becomes tissue, **each letter is its own body**: its own outline inflates by its own fat, and letters close enough fuse like metaballs into one mass. No second layer (goo, blur field, shared fat buffer) is laid over or under the text. A press makes text readable by deflating the letters under it to their bare glyphs **where they stand**; position never moves, so what is aimed at holds still, and the squeezed volume swells the letters around the press. Tissue is monochrome. The physiology lives at `w/display-text-tissue.js`: a caller hands it letters (character, place, angle, size, own fat, weight) and presses; each letter is a distance field of its own outline, inflated by its own fat, fused to its neighbours through an exponential smooth union, deflated to its bare glyph under a press. The caller owns the canvas and the meaning. Papers is its first consumer.

### Acknowledged live circulation — delta recurs before snapshot

Display Continuity may carry a site-holon's admitted public state through an opaque keyed-unit transport, but transport growth must not require repeatedly resending the whole organism projection.

The rank-invariant circulation law is:

`source-owned unit map → actual Worker revision ledger → changed units only → acknowledged delta → next base`

Rules:
- the Worker may expose, only through the authenticated source membrane, the current `public_revision` and opaque `unit_key → unit_revision` hashes; it does not return semantic values through this handshake and does not become source authority;
- a producer whose local ACK ledger is absent/corrupt reacquires that remote ledger rather than inventing a historical baseline or forcing a complete snapshot;
- ordinary circulation compares the acknowledged ledger with current source-owned unit revisions and sends only changed opaque units and lawful deletes;
- if one delta exceeds the bounded request size, the **same delta law recurs at smaller transport scale**: choose a deterministic subset of changed units that fits, compute the intermediate target revision, send/ACK it, then use that ACK as the next base;
- every chunk is an ordinary delta. Chunking is not a second protocol, semantic subdivision, or organism anatomy;
- a single opaque unit that exceeds the transport bound is explicit unit-granularity pressure and must not be silently split by Display;
- the deterministic empty unit ledger is a lawful first base, so first publication may also grow through bounded deltas;
- full-state reconciliation remains bounded legacy/integrity repair only. It is not the normal growth path for a state whose size may increase without bound;
- asynchronous intermediate projections are truthful transport lag. Display must not claim final convergence until the source reaches the current source-owned public revision.

Compression:

> **Remember hashes, move differences, recurse the same delta when the difference is too large.**

Do not invent a universal foreign-body manifest merely to generalize this first case. Extend identity witnessing only when another real foreign body proves the present native witness insufficient.

## Tree-derived public membrane

`y/build.py` discovers Population anatomy and derives the public interlocutor registry, global mounts, page projections and identity-owned render/style assets from that tree.

`y/site-public.py` extends the same generated artifact with optional identity-owned `public/` bytes discovered inside site-holon bodies. It copies bytes generically, refuses path collisions/escapes/reserved namespaces, and never interprets route meaning or site identity. A site without such a surface remains unaffected.

A separately authored mount table is not semantic authority. Central Display runtime must not name Philosophy, Papers, Crawlerbait, or future sites. Adding a lawful new site-holon is a Population mutation, not a central runtime feature edit.

One immutable content-addressed asset bundle carries the shared visual generation; identity-owned static site apertures remain ordinary generated artifact files outside the reserved shared bundle namespace.

### Materialized-shadow publication continuation

The Pages workflow may wake after a successful canonical-main `papers static shadow materialization` run. This is a mechanical continuation, not another Display digestion. It reads the committed shadow and the last successful `github-pages` deployment before acting: an already-published shadow needs no deployment, and a superseded completion yields to the current source. A committed shadow left unpublished by an interrupted materializer tail remains eligible on the next successful completion. Missing source or an unavailable publication baseline is an explicit failure, never a fabricated no-change witness.

This continuation builds the Pages event's own canonical commit, never the materializer's pre-push head or an untrusted branch. Ordinary push and deliberate dispatch retain their existing publication path. Live closure still requires a real materializer completion followed by its Pages deployment and a visitor witness.

## Persistent global physiology

Display keeps alive across every encounter:

- one global infinitely recursive tetrahedral address field embodied broadly by Philosophy;
- one global navigator containing physically present site-holon encounters only;
- shared global orientation state and x/y controls;
- default-true site-holon background drag with an identity-local explicit-false opt-out;
- exact address/quotient geometry;
- recursive split-cell centroid camera framing;
- Descent: one container→content gesture at every rank and across membranes (navigation `Descent`);
- target-origin tetrahedral closure transition;
- activity receptor and browser encounter/history body.

Entering an interlocutor never hands the global minimap to its local recursive space; descent and ascent are one gesture on both sides of the membrane.

## Navigation and local inspection

A global minimap click moves immediately to the selected mounted encounter. There is no global select-then-commit step.

Philosophy has a separate local specialty: its background may inspect any realized global address without changing the active encounter. Manual orientation remains where the witness leaves it; Display performs no automatic swingback.

## Raw address and quotient law

One exact raw global site address may carry only one direct site-holon. New pressure at an occupied raw address requires prior recursive differentiation.

Distinct raw addresses may nevertheless quotient-coalesce onto one geometric locus. Such separately addressed holons compose there as a split/grid encounter rather than being assigned the same raw address.

## Target-origin page swap

The selected global minimap point supplies the transition origin. Four membrane facets close from the viewport boundaries onto that point, the encounter changes only under complete closure, and the facets reverse to reveal the destination.

The global navigator, orientation and browser history survive this swap.

## Closure / acceptance

A Display mutation closes only when:

1. local `INDEX.yaml` and `_cambium.yaml` remain complete and coherent;
2. Population discovery derives all global mounted encounters from physical site-holon bodies;
3. exact raw-address collision is rejected while quotient coalescence remains lawful;
4. whole-body relocation changes mount address with zero internal site edits;
5. central runtime remains specimen-agnostic;
6. optional identity-owned public secretion is copied only through the generic collision-safe hook;
7. site-local shader/render/interaction divergence does not fork the shared tetrahedral geometry or global orientation law;
8. exact generated artifact passes structural/address/closure witnesses;
9. exact artifact is exercised in a real browser, including direct minimap pointer navigation;
10. target-origin closure surrounds the actual encounter swap;
11. manual Philosophy orientation remains persistent;
12. durable HOME is appended only after witnessed anatomy exists; `_feed` catch-up remains a separate mechanical consequence.

CI success alone is not browser closure.

## Compression

**Display is a tetrahedrally differentiated oriented membrane. Embodiment gives autonomous interlocutors local worlds, Continuity preserves identity through relocation, Orientation makes the global recursive field navigable, and Population physically plants site-holons into that field. Display preserves one shared tetrahedral body and orientation law while each site-holon owns its projection, shader, rendering, local interaction and any earned static public aperture. The Population tree is mount truth: what is bodily present is globally reachable, while each holon remains locally itself.**

Version 3.3 background-orientation interaction correction (2026-09-18): the already-shared orientation field now owns default background drag across arbitrary site-holons. Local membranes may opt out with explicit false without changing global navigator orientation, site identity, geometry, inspection capability or locally owned interaction.

Version 3.4 identity/address/custody correction (2026-09-23): Display now hosts foreign code bodies at their currently truthful semantic loci while consumers resolve stable identity through current live anatomy. The first realized case moves pinned Pretext intact into unsplit Embodiment and derives its public module location at build time; no Typography container or convenience split is introduced.


Version 3.6 descent correction (2026-09-26): Descent entered persistent global physiology as the shared container→content gesture; the global minimap remains global.

Version 3.5 acknowledged-live-circulation correction (2026-09-24): Continuity now treats complete snapshots as bounded recovery only. Producers reacquire the authenticated Worker unit-revision ledger, derive only source-owned differences, and recursively subdivide an oversized difference into sequential ordinary acknowledged-base deltas. Empty state has a deterministic revision base; one oversized opaque unit remains an explicit granularity wound rather than being silently split.

Version 3.7 site-layer correction (2026-09-29): a site shader may draw its own layer inside its field's Descent frame through optional `afterDraw`; Descent, drag, pools, point selection and body entry stay Display's. First realized by Crawlerbait's beings (goo bodies walking bait-space).

Version 3.8 continuous-focus correction (2026-09-29): a site shader may offer `focus()` → `{center, scale}`; Display eases its own camera toward it with a frame-rate-independent critically damped spring and glides back to the walked container when released. Descent steps are for the witness's own gestures, never for following motion (Philipp: chained steps made him nauseous).

Version 3.9 rest-view correction (2026-09-30): a site shader may declare `view: {rest, projection}`. `rest` is a quaternion the shared orientation eases to when the site is shown (and back to Display's home when another site is shown, unless the witness has turned it since); `projection: 'orthographic'` makes the field and its hit-testing use a parallel projection matched to the perspective at the centre plane. Absent it nothing changes; Display names no site. First realized by Schattenseiten, whose works rest in the leaves of a depth-three body so that, along the shadow axis, the 8×8 sheet is one flat picture.

Version 3.10 body-material correction (2026-09-30): a site shader may offer `body: {fragment, state}`, the material of its floating body in the overview, used in place of its field fragment/state. Absent, nothing changes; Display prescribes no look. First realized by Schattenseiten and Papers, whose field shaders draw (almost) nothing and so were labels only.

Version 3.11 type-is-body correction (2026-10-01): Philipp's SpriteSheet Mono became Display's main face at `w · Embodiment` (identity `@sss/spritesheet` 1.0.1, cells re-centred and bearings made truthful), with rendered-text folding to its A–Z alphabet; letters-as-bodies became Display text law. The tissue engine is not yet grown: it waits for its first consumer.

Version 3.12 invariant-glass-over-own-canvases correction (2026-10-01): a site that paints its own canvases (Papers) had no glass at all, neither HUD glass nor the drop, because the glass pass refracts only the field's scene. A site may now hand its canvases to its field through `shader.composite()`; the field composites them under the same glass. Every render context also carries `lens()`, the drop's live geometry, so a site can let the one invariant lens act as its instrument without drawing a lens of its own.

Version 3.13 text-tissue correction (2026-10-01): the letters-as-bodies engine grew into `w · Embodiment` with its first consumer, Papers' open organisms.

Version 3.14 font-v2 correction (2026-10-02): the supplied SpriteSheet Mono v2 bytes replace Mono under the same `@sss/spritesheet` identity and member paths, now package 2.0.0 with 1024-unit em and fixed cells; Regular remains 1.0.1. Schattenseiten's HUD inherits Display's main face, and global minimap canvas labels use it with the same rendered-text folding and a redraw after font loading. Text-tissue law, source spelling and navigation identity remain intact.

Version 3.15 live-type-and-frame-work correction (2026-10-03): Philosophy's overview copy is bound to its mounted class with compact responsive typography. The generic runtime shares one derived anatomy per mounted source snapshot; own gene-label updates leave body labels alone, and label-ink style reads are reused only within the current collection. Source meaning, font bytes, dynamic rendering, geometry, glass and pointer identities remain intact.
