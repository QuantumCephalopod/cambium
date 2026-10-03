# NUTRIENT — site-owned host body geometry / canonical coarse manifestation — 2026-10-03

status: OPEN / ADMITTED
source: Philipp, live Philosophy overview + clarification chat 2026-10-03
target: github.cambium → display → floating site-holon bodies
related:
- `NUTRIENT__site-body-material__20260930.md`
- `NUTRIENT__lens-softlock-local-preview__20261003.md`
- Papers and Schattenseiten local manifestations

## encounter

The existing body-material hook solved only half of the original Philosophy problem.

A site may currently provide its own floating-body **material** through `shader.body`, while Display still owns the floating body's generic recursively tetrahedral geometry.

That is truthful for site-holons whose public body is actually well represented by the shared tetrahedral body grammar.

It is not necessarily truthful for sites whose canonical entered manifestation is structurally different.

The two clearest current cases are:

- **Schattenseiten** — entered form is a depth-three 8×8 sheet of shadow works with its own orthographic rest view and custom layer;
- **Papers** — entered form is its own canvas-based living research field with organisms, chambers, text tissue, metabolites and local scale grammar.

In Philosophy they currently receive site-owned materials on a generic self-similar floating geometry. Philipp's live overview makes the mismatch obvious: they read as generic fractal wedges/tetrahedra even though entering them reveals a substantially different canonical body.

## distinction

Self-similarity is an invariant of **construction / navigation / relation**, not a requirement that every site-holon must look visually identical or literally recursively tetrahedral from the host.

A site-holon may therefore need a host-facing body that is:

- a bounded coarse manifestation of its own canonical local body;
- still one selectable/relocatable Display body;
- still governed by the same host placement, rank, Descent and membrane laws;
- visually/structurally identity-owned.

The host-facing body is not a screenshot and not a second ontology. It is the site's lawful coarse LOD as seen from its parent.

## current technical gap

Current Display can substitute a site's body fragment/state, but the generic renderer still derives the body geometry from shared recursive structure.

The next coupling should allow a site to own enough of its floating-body manifestation to represent its actual canonical form.

Possible interfaces include an optional site-owned:

- body geometry;
- body draw callback;
- body projection / canonical coarse renderer;

but the exact API is not decided by this nutrient.

The generic contract matters more than the mechanism:

> Display owns where/how a site body is hosted; the site owns what its body actually is.

## Papers pressure

A host-facing Papers body should be recognizably a coarse state of the same organism one enters, not merely a green generic fractal body with Papers material.

It may compress its actual chamber/population physiology heavily, but the compression must remain Papers.

The new specimen-bound explanation and lens-preview pressures should be able to refine this same body rather than jumping between unrelated visual species.

## Schattenseiten pressure

A host-facing Schattenseiten body should be recognizably a coarse state of the actual shadow-sheet organism.

Its 8×8 / orthographic / shadow-work identity should survive host-level compression rather than being represented only as a blue/black generic recursive body.

## relation to the current regression

The same two sites are currently the only direct consumers of the custom `shader.body` route and are also the two bodies showing the overview trail/black-wedge artifact.

That coincidence does **not** mean the visual-overhaul requirement caused the bug.

It does mean the next repair should avoid spending effort perfecting a body embodiment that is already known to be only a material-level approximation of the intended canonical host representation.

Fix corruption and representation truth as separate obligations, while sharing any genuinely generic body hook they both need.

## acceptance

1. Display remains specimen-agnostic;
2. a site may provide a truthful host-facing body beyond fragment/material alone;
3. sites that do not need custom geometry keep the existing generic body path unchanged;
4. Papers' host body is a recognizable coarse manifestation of Papers;
5. Schattenseiten's host body is a recognizable coarse manifestation of Schattenseiten;
6. host placement, global address, selection, Descent, orientation and relocation remain Display-owned;
7. body LOD/refinement never invents semantic anatomy;
8. the same generic coupling can support future non-generic site-holons without central site-name branches;
9. entering the body feels like refinement into the same organism, not replacement by a different visual object;
10. desktop/mobile overview and membrane-crossing witnesses compare the host body to the entered manifestation.

No new Display CCCC split is implied by admission.
