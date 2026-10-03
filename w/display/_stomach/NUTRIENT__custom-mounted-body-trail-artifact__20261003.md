# NUTRIENT — custom mounted-body trail / black-wedge regression — 2026-10-03

status: OPEN / REGRESSION WOUND
source: Philipp, live screenshots + clarification chat 2026-10-03
target: github.cambium → display, mounted custom-body path
observed current cohort:
- `organism:schattenseiten`
- `organism:papers`
related:
- `w/display/_stomach/NUTRIENT__site-body-material__20260930.md`
- `w/display/w/locus-shader.js`
- Schattenseiten + Papers local renderers
- recent admission of Impressum + Datenschutz site-holons

## observed wound

The Philosophy/global overview shows severe visual corruption around exactly the two mounted holons that currently use the optional site-owned `shader.body` path: **Schattenseiten and Papers**.

Observed symptoms include:

- loop / trail-like remnants behind the bodies;
- large triangular or wedge-shaped residues;
- dark/black regions that appear to persist over unrelated field space;
- corruption that reads as if previous body frames or body state are accumulating rather than being frame-local.

Philipp supplied both mobile and desktop screenshots on 2026-10-03.

The glitch is present on **desktop and mobile**.

## materially narrowed commonality

Current source has exactly two direct `body:Object.freeze(...)` custom floating-body declarations:

- Schattenseiten;
- Papers.

Those are also the two bodies showing the visible corruption in the supplied overview screenshots.

The generic Display floating-body renderer still constructs geometry centrally through its ordinary body-geometry path and swaps only the body fragment/state through:

`b.shader.body || b.shader`

This makes the custom floating-body route a materially stronger first diagnostic cohort than "all new site-holons" or "mobile layout".

It is still not a proven root cause.

## temporal clue, not diagnosis

Philipp noticed the regression around the period when the newer legal site-holons Impressum and Datenschutz were admitted.

Those holons are useful as a population-growth timing clue and as clean comparison bodies, but no causal relation is asserted.

The current evidence instead suggests testing whether population growth exposed a latent custom-body render-state wound.

## likely failure families to falsify

The first pass should explicitly test, not assume:

- depth buffer not reset or restored between custom floating bodies;
- color mask / depth function / depth mask leakage;
- blend state leakage;
- custom body draw path accumulating into a target that should be frame-local;
- body geometry or state being reused under the wrong site identity;
- one custom body draw contaminating the next body or the field beneath it;
- ordering sensitivity that only became obvious with the larger mounted population.

Because both affected sites also own custom entered renderers, local renderer state should still be ruled out, but the corruption is observed in the host overview and the shared custom-body path is the first bounded diagnostic surface.

## acceptance

1. Schattenseiten leaves no persistent loops, wedges or black trails in Philosophy/global overview;
2. Papers leaves no persistent loops, wedges or black trails in Philosophy/global overview;
3. generic bodies remain unchanged;
4. the result is clean on desktop and mobile;
5. adding/reordering Impressum, Datenschutz and other mounted holons does not resurrect the wound;
6. GL/canvas state restoration receives a regression witness if leakage is the cause;
7. if body draw order changes, the final image remains equivalent;
8. the exact current full-population artifact is browser-witnessed after the repair.

If the cause proves generic to the optional custom-body path, repair it once in Display. If one site has an additional local wound, preserve that distinction rather than forcing one explanation over both.
