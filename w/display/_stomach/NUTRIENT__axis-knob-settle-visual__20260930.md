# NUTRIENT — the axis knob shows its settle — 2026-09-30

status: NARROWED — metabolized into z/world-view.js (knobShape, KNOB_* constants) + w/root-view.css + navigation RITUAL 2.7 (HOME display-axis-knob-settle-visual-20260930T201201Z); open: how it feels under Philipp's hand
kind: display encounter (from Philipp)
source: Philipp 2026-09-30 (English, verbatim): "the hold to lock works =) but i would like to fine-tune it better eg give it a visual. the knob could slowly blow up and then change to a triangle when its locked. picking it up again makes it a circle again that slowly morphs back to a triangle as soon as you keep it still =)"
target: github.cambium → display (z/world-view.js axis knob; w/root-view.css)

## source-faithful pressure

The hold-to-lock gesture on the x/y rails works, but nothing shows that it is working: the knob is an 18px circle before, during and after the lock, so a witness cannot tell a held-still knob from one that has locked. Philipp wants the knob to wear the state: swell while held still, become a triangle at the lock; a locked knob picked up again is a circle that morphs back toward a triangle while it is held still.

## metabolized

One picture, driven by the same still-time the lock already uses, so the shape cannot disagree with the lock:

- while a pointer holds the knob, progress = time since the last real movement over AXIS_SETTLE_MS; the knob swells (KNOB_SWELL 1.45) and its outline morphs from circle to an up-pointing triangle, arriving at the triangle exactly when the lock fires;
- moving more than AXIS_SETTLE_EPS restarts the stillness, and the picture falls back toward the circle (KNOB_FALL);
- releasing before the lock returns to the circle; a locked knob rests as the triangle;
- picking a locked knob up makes it a circle at once and the morph begins again as it is held still;
- prefers-reduced-motion: no animation; the triangle appears at the lock;
- at rest nothing changes: no data-morph, the original circle and halo.

The shape is one SVG polygon of 36 points per knob, created once, interpolating a circle to an equilateral triangle by radial projection, so the corners arrive gradually and exactly at the vertex angles.

## open

- how it feels by hand on the live site: the swell size, the morph curve (smoothstep), the fall-back speed are named constants, first drafts, Philipp's to judge by eye;
- "slowly": the picture can only take as long as the lock does (520 ms); a slower morph means a slower lock, which changes a gesture that works, so it is left to Philipp's word;
- the keyboard path has no latch and therefore no picture;
- touch devices were not witnessed.
