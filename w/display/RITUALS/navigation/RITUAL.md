---
name: navigation
description: "Display-local navigation physiology: Population anatomy determines global site targets while Philosophy locally inspects the same recursive field."
organism: display
geometry: tetrahedral
version: "2.5"
---

# NAVIGATION RITUAL — display local

Navigation relates the witness/viewer, one global recursive tetrahedral address field, and the autonomous site-holons physically populated into it.

Canonical identity/locus/body law is carried by `../site-holon/RITUAL.md`.

## Global field

The global address alphabet is `{w,x,z,y}` recursively without fixed depth. Semantic place is the exact quotient vertex/locus. Potential recursion is not fabricated anatomy.

Camera focus is perceptual and distinct:

The membrane minimap is **not** a generic Philosophy VIEW selector.

so each selected recursive cell is framed as one co-equal fourfold rather than throwing the witness onto an outer vertex.

## Population-derived target set

Display `y / Population` is the membrane into site-space:

`display:y ⟦ site-space:ε ⟧`

The global minimap target set is derived from physical site-holon bodies discovered under `w/display/y/`. No page-organism body at an address means no global target there.

Current physical/semantic relation:

- `w/display/y/philosophy/` -> site-space `ε` -> **PHILOSOPHY**;
- `w/display/y/yw/crawlerbait/` -> site-space `w / Form` -> **CRAWLERBAIT**;
- `w/display/y/yy/papers/` -> site-space `y / Inquiry` -> **PAPERS**.

The navigator labels targets by stable site identity/title, not by generic Philosophy vertex names.

## Direct global movement

The global minimap is not a Philosophy VIEW selector.

A target click performs the encounter transition immediately:

`pointer target -> target-origin closure -> mounted encounter swap -> destination`

There is no global inspect-then-commit step.

## Philosophy background inspection

Philosophy's background inspection is Descent inside Philosophy's own container: selecting a child cell descends into it without moving the active global encounter.

Therefore:

- global minimap = direct movement among physically populated site encounters;
- Philosophy background = local inspection of realized global geometry.

Philosophy's address inspection remains local, but **background drag is no longer Philosophy-specific**. Every site-holon inherits shared background drag/orientation by default; a site may explicitly opt out with local `background_drag: false`. The toggle is independent of inspection and never disables the global navigator's x/y rails.

When enabled, manual background drag updates shared global orientation and remains exactly where the witness leaves it. No automatic swingback/recenter occurs.

## Global versus local organism space

Each site-holon has a global Population address and may contain its own independent recursive anatomy.

Examples:

`site-space:y ⟦ papers:ε ⟧`

`site-space:w ⟦ crawlerbait:ε ⟧`

Address spaces stay distinct across the membrane; the gesture does not. Crawlerbait-local machine-facing routes never become global navigation addresses.

## Descent — one gesture at every rank

The witness is always inside exactly one current container: a realized cell of the global field or an organism body floating in one. A container's content is its four children. Content propagates on every split (Cambium wood law, `ua^m ~ ua`), so every organism floats in every cell above its deepest realized address; the view's resolution only decides how finely it is sorted.

- select: only the current container's children can be entered;
- descend: the container is pushed onto the walked path and the child is framed at its centroid, relatively, with no absolute zoom ceiling; the camera moves there smoothly (~0.33 s), never teleports, and ascent moves back the same way;
- render: geometry is drawn at full realized resolution — a Sierpinski body is cheap and each rank quadruples capacity, so depth settles. LOD governs content only: content below the container's children and their realized children coalesces into pools (Display invariant); a pool opens into its four sub-pools, never a flat list, and entering it fills the walked path through every intermediate container;
- bodies: organisms float as bodies in their host, drawn with their own identity shader at full geometry and entered by selection. Content is two ranks smaller than the realized container carrying it; when that container splits, the content propagates into the finer child (self-child for content at the split point) and shrinks with it, keeping its own subdivision. Organisms refine inward; composed holons grow with rank (composition grows outward);
- ascend: a gesture that enters no child pops the walked path — back through the container the witness came through;
- membranes: entering or leaving a site-holon is the same gesture. Entering zooms into the body, then crosses under the target-origin fold; leaving crosses under the same fold and the host zooms out from the body it left. The active interlocutor is the organism whose container is innermost on the walked path; Continuity reads it rather than switching separately. The target-origin fold remains a loading cover at membrane crossings.

The global minimap and x/y rails remain shared orientation controls. A fresh witness meets the navigator open (pinned); a click tucks it away.


## Raw address and quotient navigation

Exact raw site addresses are unique occupancy slots. If pressure would add another direct site at the same raw address, that address must differentiate before admission.

Distinct raw genealogies may quotient-coalesce onto one locus; the navigator then opens their composed encounter at that locus.

## Global Navigation Aperture

The global navigator belongs to Display membrane space, never interlocutor content:

- single encounter -> square outer membrane port;
- two coalesced interlocutors -> diamond threshold on shared seam;
- larger composition -> compositor junction.

The opening shell may bloom into a rectilinear control cavity while minimap and x/y rails remain stable control tissue.

## Global orientation controls

The x/y rails are angular-velocity controls:

- x controls yaw;
- y controls pitch;
- midpoint is zero;
- holding sufficiently still locks the exact current value;
- a latched value is not altered by later movement of the still-held pointer;
- a new pointer-down picks it up again.

Every visible interlocutor-local field reads the same global orientation.

## Target-origin closure

Pointer navigation supplies the actual minimap target as membrane origin. Four facets converge on that point, encounter state changes only under full closure, then the destination is revealed by the inverse opening. Non-pointer/direct access may use viewport center as a neutral origin.

## Compression

**The witness moves directly among site-holons physically present in Display Population. Philosophy may independently inspect the larger realized recursive field. Global targets come from the Population tree, exact raw addresses require unique occupancy, quotient-coalesced genealogies may compose, camera focus uses recursive cell centroids, and the persistent membrane closes on the actual chosen target. Site-local routes remain local and never silently become global navigation addresses.**

Version 2.5 content-rank correction (2026-09-26): content sits two ranks below its realized container and shrinks into finer children on split; leaving an organism uses the membrane fold and zooms out from the body; the navigator opens pinned by default.

Version 2.4 floating-bodies correction (2026-09-26): organisms float as full-resolution bodies of one size in their host cell and are entered by selection; composed holons grow with rank; geometry is never LOD'd, only content; descent and ascent interpolate (~0.33 s).

Version 2.3 descent correction (2026-09-26): container→content descent became one Display invariant at every rank and across site-holon membranes — local child selection, relative centroid framing without zoom ceiling, two-level LOD with pooled deeper content, ascent back through the walked path, and the active interlocutor read from the innermost container. Supersedes the separation of local traversal from global navigation.

Version 2.2 default background-drag correction (2026-09-18): shared background drag/orientation is now a Display-global site-holon default rather than a Philosophy/Papers special case. The site membrane may explicitly disable only its own background drag with `background_drag: false`; Philosophy-style inspection and global navigator controls remain separate capabilities.
