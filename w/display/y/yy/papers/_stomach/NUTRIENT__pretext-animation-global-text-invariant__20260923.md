# NUTRIENT — Papers Pretext animation capability + global text invariant — 2026-09-23

status: OPEN / DESIGN PRESSURE
kind: display.papers typography/runtime architecture question
source: user chat encounter

## encounter

The user asks:
1. whether the bundled Papers Pretext implementation has the fuller animation-capable behavior associated with the upstream/open-source pre-rendered text approach, given that current Papers use appears visually static;
2. whether there is a principled case for routing all Display/Papers text through Pretext as a global invariant.

## unresolved questions

- distinguish upstream/library capability from the current Papers adapter;
- identify which APIs in the bundled papers-pretext-0.0.9 support premeasurement, stable cursors/ranges, incremental line materialization, geometry reuse, bidi/segmentation and animation-friendly rendering;
- identify which animation responsibilities remain external (per-line/per-glyph transforms, opacity, motion, clipping, scheduling, GPU/canvas/DOM carrier);
- assess whether a global all-text-through-Pretext invariant would improve consistency/performance or wrongly capture semantic/accessibility/static UI text that should remain native DOM;
- prefer a minimal architectural boundary over universalization by convenience.

No implementation change is authorized by this nutrient yet.
