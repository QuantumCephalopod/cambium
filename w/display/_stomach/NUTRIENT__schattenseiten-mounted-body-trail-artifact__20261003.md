# NUTRIENT — Schattenseiten mounted-body black trail / loop artifact — 2026-10-03

status: OPEN / REGRESSION WOUND
source: Philipp, live screenshot + clarification chat 2026-10-03
target: github.cambium → display, mounted `organism:schattenseiten`
related:
- `w/display/y/yx/schattenseiten/RITUALS/organism/RITUAL.md`
- generic site body / field compositing
- recent admission of Impressum + Datenschutz site-holons

## observed wound

The mounted Schattenseiten holon glitches in the global/Philosophy encounter.

The visual symptom is not merely a wrong shape:

- loop / trail-like remnants appear behind the body;
- artifacts persist across its path;
- affected regions can become black, as if the body is contaminating or erasing what it crosses.

Philipp supplied a live mobile screenshot on 2026-10-03 showing the corruption.

The same glitch occurs on **desktop and mobile**, so it is not currently treated as a mobile-only layout problem.

## temporal clue, not diagnosis

Philipp is not certain when the regression entered.

It was noticed around the period in which the newer legal site-holons, Impressum and Datenschutz, were added.

That correlation is evidence for the investigation but **not a root-cause claim**.

Do not assume the legal holons are wrong; test render order/state before assigning causality.

## boundary

Schattenseiten's semantic body remains the admitted 8×8 projection and its overview body remains shadow ink.

The wound concerns mounted-body rendering/compositing, not the ontology or source artwork.

Possible renderer families worth falsifying include:

- stale framebuffer / incomplete clear;
- blend/depth/color-mask state leaking across site bodies;
- accumulation where a pass should be frame-local;
- body/material state not restored between mounted holons;
- ordering interaction introduced when the population gained more bodies.

These are hypotheses only.

## acceptance

1. Schattenseiten's mounted holon leaves no persistent loops/trails while the overview moves or redraws;
2. its passage never paints unrelated field regions permanently black;
3. the result is clean on both desktop and mobile;
4. adding/reordering other mounted holons does not resurrect the artifact;
5. the local Schattenseiten 8×8 site remains visually and semantically unchanged unless the actual root cause is local;
6. GL/canvas state restoration is regression-tested if state leakage is the cause;
7. the exact generated artifact is browser-witnessed with the current full site population.

If the wound proves generic to Display body rendering, repair it in Display. If it is local to Schattenseiten, keep the repair local. Intake does not prejudge the owner.
