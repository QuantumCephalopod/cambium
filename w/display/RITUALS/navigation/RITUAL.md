---
name: navigation
description: "Display-local navigation physiology: render only realized organism geometry, separate inspection from committed address transition, keep the large body directly manipulable, and provide a precise minimap with independent one-axis velocity controls."
organism: display
geometry: tetrahedral
version: "0.1"
---

# NAVIGATION RITUAL — display local

This ritual preserves the interaction law earned by direct use of the current tetrahedral display specimen. It governs **how a visitor orients and commits movement**. It does not choose the semantic body being displayed, invent a page ontology, or force a particular visual skin.

## 1 · Realized geometry only

The displayed tetrahedral body is a literal projection of **realized addresses only**.

- Never render a complete rank merely because a recursive rule could generate it.
- If `w` has differentiated and `x/z/y` have not, only `w`'s realized descendants appear; the other three loci remain coarse.
- A deeper branch does not force sibling branches to the same rank.
- Missing descendants remain missing. Potential addressability is not visible anatomy.
- Geometry is rebuilt from current phenotype state rather than from a global `depth`, `rank`, subdivision count, or decorative Sierpiński completion.

Compression:

> **Display may show the organism that exists, never the symmetric organism it could have become.**

## 2 · Inspect first, commit separately

Orientation and navigation are two distinct acts.

- **Inspect/view** changes the current visual focus inside the same encountered whole. The large field may zoom toward the selected realized locus while page identity remains unchanged.
- **Commit/enter** is a separate deliberate action that crosses into the selected realized page/address.
- Rotating either representation changes view state only.
- Selecting a minimap point changes inspection focus only.
- A committed transition must be explicit enough that accidental trackpad/touch movement cannot trigger it.
- After commitment, the newly entered page/whole may have a unique artistic realization; this ritual does not pre-build that page.

The invariant distinction is:

`LOOK HERE != GO HERE`

## 3 · Large body — direct manipulation, no semantic fireworks

The large tetrahedral field is the primary perceptual body and may be directly grabbed.

- Pointer/touch press + drag rotates the large body.
- Release leaves the body exactly where it was placed. No forced drift or snap is required.
- On a fullscreen/no-scroll surface, touch manipulation owns the gesture so rotation does not fight document scrolling.
- The large navigation view performs **no automatic edge, face, or volume highlighting**.
- Merely crossing an edge/face with the pointer must not trigger semantic overlays, flashes, selection states, or relation callouts.
- Rank-2/rank-3/rank-4 derivations may become meaningful in some later content-specific view, but they are not ambient navigation hover affordances.

The absence of highlight is intentional information design: navigation should remain quiet until the visitor actually asks to inspect or enter a realized address.

## 4 · Minimap — orientation organ, not a tiny knowledge object

The small tetrahedron is a persistent **global orientation/minimap** for the currently encountered address space.

It contains only what orientation requires:

- the actual realized structural geometry;
- realized address points;
- current committed `HERE` position;
- current inspected `VIEW` position when different;
- the same orientation state as the large body.

It does not host edge/face/volume derivations, explanatory relation text, content previews, or a second semantic interaction system.

When the organism grows asymmetrically, the minimap grows asymmetrically with it.

## 5 · Two independent velocity axes

Trackpad-friendly rotation uses **two separate controllers**, one per axis.

### Horizontal controller

- one horizontal track;
- one horizontal knob;
- horizontal pointer displacement only;
- controls only horizontal/yaw rotation;
- vertical pointer displacement is ignored.

### Vertical controller

- one vertical track;
- one vertical knob;
- vertical pointer displacement only;
- controls only vertical/pitch rotation;
- horizontal pointer displacement is ignored.

For each controller:

- midpoint means zero velocity;
- small midpoint deadzone prevents accidental drift;
- speed increases continuously with distance from midpoint;
- direction follows the side of midpoint;
- release returns that knob to midpoint and immediately returns that axis velocity to zero;
- one controller never silently changes the other axis.

This is a **velocity controller**, not a position scrubber and not a two-axis joystick.

## 6 · Accessibility and input equivalence

The same structure must remain navigable without precision pointer control.

- generous touch/pointer hit areas around realized minimap addresses;
- keyboard alternatives for axis rotation and address inspection;
- explicit focus states;
- semantic accessible navigation surface independent of canvas pixels;
- reduced-motion preference respected where animation is nonessential;
- no hover-only requirement for a meaningful action;
- no browser persistence is required merely to preserve an interaction state within one encounter.

Accessibility is not a compatibility afterthought here. The interaction should be **low-friction enough that accessibility constraints improve the primary experience**.

## 7 · Current witnessed specimen

`w/display/navigation-physiology.js` is the renderer-independent implementation core distilled from the accepted WebGL specimen, and `w/display/navigation-physiology.test.cjs` is its executable witness. The artistic WebGL skin remains a separate later production transduction problem; this ritual preserves the interaction/geometry law without pretending one visual implementation is source authority.

The implementation core has been checked for:

- finite centroids for every realized leaf, preventing the previous undefined-centroid minimap crash;
- root fixture leaves exactly `w/x/z/y` when only root 4V is realized;
- asymmetric recursion leaves coarse siblings coarse;
- separate x/y velocity controllers;
- inspect → commit distinction;
- independent inspect/commit state transitions and zero-on-release axis behavior.

## Closure

A navigation implementation conforms when a visitor can smoothly orient, inspect, and deliberately enter realized structure without the interface inventing unrealized anatomy or competing with the organism through unsolicited semantic effects.

Compression:

> **Show only what exists. Let me turn the world. Let the minimap tell me where I am. Let each axis behave alone. Looking is reversible; entering is a commitment.**
