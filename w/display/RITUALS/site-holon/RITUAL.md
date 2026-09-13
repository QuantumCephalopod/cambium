---
name: site-holon
description: "Rank-invariant Display primitive for relocatable viable sites: separate identity from locus, quotient raw navigation witnesses without erasing genealogy, preserve witness-specific interlocutor chambers, require a locus-shader protocol, and transition arbitrary manifestations through tetrahedral closure."
organism: display
geometry: tetrahedral
version: "0.2"
---

# SITE-HOLON RITUAL — display local

This ritual preserves the reusable site primitive of Display. It is not a page template and does not prescribe one visual composition. It defines the invariant outer physiology that lets radically different local sites remain one indefinitely growing organism.

## Fundamental distinctions

- **Identity** — the continuing individual site-holon. `identity != locus`. It survives relocation caused by later differentiation.
- **Locus** — the canonical place presently occupied inside one declared organismic address space. `locus != identity`.
- **Witness** — a lawful raw genealogical navigation path resolving to a locus. It records how the locus was reached.
- **Interlocutor** — the active local counterpart carried through one populated witness chamber: the tissue presently speaking, acting, showing or computing through that genealogy at the shared locus.

Distinct witnesses may coalesce without becoming identical histories. For the ordinary reciprocal case:

`xyw ~ xwy`

therefore `witness(xyw) != witness(xwy)` while `locus(xyw) = locus(xwy)`.

## Site-holon invariant

Every viable site-holon provides:

```text
SITE-HOLON
├── stable identity
├── externally mounted locus
├── lawful witness set
├── witness chamber(s)
│   └── interlocutor / local tissue
├── locus shader
├── local manifestation
├── navigation apertures
├── live activity receptor
└── tetrahedral closure interface
```

The primitive governs this physiology, not the contents. Local manifestation may be text, images, video, sound, HTML/DOM, canvas, WebGL/WebGPU, runnable code, simulation, navigation only, independently rooted organs, or any lawful combination.

## Relocation law

A site's absolute organism address is environment, not identity. Site-local implementation must not depend on one permanent raw path.

Conceptually the surrounding organism mounts a site with current relation:

```text
mount(siteIdentity, { locus, witnesses, enteredThrough, neighbors, children, activity })
```

If growth later moves a site from `x` to `xy`, its mount changes while its identity and local tissue remain viable.

Growth should therefore be cheap:

`differentiate -> recompute loci -> remount affected site-holons -> preserve identities and local tissue -> update connections`.

## Quotient site law

`path != site`.

Display inherits Cambium's router quotient; it does not invent a second address geometry. Raw paths remain genealogical witnesses while the quotient determines canonical locus. No chosen canonical serialization may erase or privilege one lawful witness.

Coalescence shares a place without erasing provenance or interlocutors.

## Chamber law

A merely possible reciprocal witness does not force an empty chamber.

- **one populated witness** → one undivided site body;
- **two populated witnesses at one locus** → one site with two witness chambers.

For the ordinary two-witness case, wide viewports split the site **vertically** (side-by-side); tall viewports split it **horizontally** (stacked). Responsive recomposition changes presentation only, never site identity, locus or witness identity.

Neither chamber is "the real page". Both are interlocutors of one locus.

## Locus shader invariant

Every site carries a locus shader as part of its membrane.

The invariant is not one universal shader implementation. It is one shader **protocol**, allowing every locus to earn its own field-language. A shader realization may respond to locus/site identity, witness/chamber state, active interlocutor, interaction, vascular activity, viewport, transition phase and time.

Thus: **one organism-wide shader protocol; arbitrarily many local shader embodiments.**

DOM/CSS, canvas, HTML-in-canvas, WebGL, WebGPU or later rendering backends are implementation choices, not ontology.

## Tetrahedral closure transition

Arbitrary sites transition through one invariant membrane operation:

```text
VISIBLE SITE MEMBRANE
        ↓
FOUR-FACET FOLD
        ↓
TETRAHEDRAL CLOSURE
        ↓
SAFE LOCUS / WITNESS / MOUNT SWAP
        ↓
FOUR-FACET UNFOLD
        ↓
NEXT SITE MEMBRANE
```

The visible screen folds inward from four corners/facets into a tetrahedral liminal state. Exact rendering technique may evolve; the invariant is closure before the destination manifestation is exposed.

While closed, Display may unmount the old local runtime, resolve the destination witness and locus, resolve the mounted site identity, choose the relevant chamber, prepare local media/runtime, update history/activity bindings, and mount the destination. The destination unfolds only once viable.

The closed tetrahedron is also the native loading/recovery state; arbitrary sites need no shared inner implementation to transition coherently.

## Navigation and history

Runtime navigation must preserve both canonical place and actual route. It distinguishes at least:

`siteIdentity · locus · witness · enteredThrough`

rather than reducing identity to `page = rawPath`.

Two routes such as `/xyw` and `/xwy` may enter the same site at one locus while preserving different entry witnesses. Browser history retains the traversal actually taken.

`LOOK HERE != GO HERE` remains invariant: inspection focuses a realized locus; commitment crosses into the site mounted there.

## Live activity

Activity follows current placement. Site-local code must not hard-code an organism/interlocutor to one address forever. Display resolves the current relation first and supplies local activity through the site membrane. Activity may alter shader or manifestation without manufacturing semantic anatomy.

## v0 acceptance tests

The primitive is not executable-closed until one specimen proves:

1. relocation of one unchanged site across deeper loci without rewriting local implementation;
2. `xyw ~ xwy` resolving to one locus and one site identity;
3. preservation of both raw witnesses and truthful browser history;
4. one populated witness → one body; two → responsive two-chamber composition;
5. materially different local tissue in the two chambers remains viable;
6. wide/tall recomposition leaves identity/locus untouched;
7. arbitrary Site A folds closed, the mount swaps, arbitrary Site B unfolds;
8. distinct loci may use distinct shaders through one protocol.

## Current implementation status

`w/display/site-holon.js` is the first executable core. It delegates quotient identity to the canonical `z/address.js` carrier rather than inventing a Display-local geometry, registers stable site identities independently of mounts, remounts one identity across loci, preserves reciprocal witness chambers, and computes responsive one/two-chamber composition.

`w/display/site-holon.test.cjs` currently passes the core torture sequence:

`x -> xy -> (xyw ~ xwy)`

while preserving the same site object and local state. It also proves `xyw` and `xwy` resolve to one locus while remaining different witnesses; wide two-chamber composition is vertical and tall composition is horizontal; distinct sites may carry distinct shader realizations through one primitive.

`w/display/site-holon-specimen.html` + `.js` + `.css` are the first living browser cell. One interlocutor is ordinary DOM/text; the reciprocal interlocutor is a runnable WebGL field. The specimen can physically remount the same site identity across `x`, `xy`, and the coalesced reciprocal locus without rewriting either interlocutor.

`navigation-physiology.js` remains a valuable **pre-primitive navigation witness** for realized-only geometry, inspect/commit separation and independent rotation controls. The production navigator still resolves records by exact raw-path equality and therefore is not yet wired through the site-holon registry.

Current closure status:

- relocation core: **PASS**;
- reciprocal quotient locus: **PASS**;
- witness-preserving two-chamber composition: **PASS**;
- mixed DOM/WebGL local viability specimen: **PASS**;
- browser-history witness retention inside specimen: **PASS**;
- production navigation integration: **OPEN**;
- canonical tetrahedral fold/unfold transition: **OPEN**;
- live vascular receptor binding: **OPEN**.

The next actualization pressure is therefore narrower than before:

`production navigator -> witness/locus resolver -> site-holon registry -> mounted manifestation`

followed by executable tetrahedral closure between two arbitrary site identities.

## Compression

**Identity persists. Locus places. Witnesses approach. Interlocutors speak. Chambers preserve genealogy. Shaders embody loci. Tetrahedral closure carries transition.**
