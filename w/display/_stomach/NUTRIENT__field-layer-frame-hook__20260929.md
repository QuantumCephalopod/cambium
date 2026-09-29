# NUTRIENT — a site may draw its own layer inside its field's Descent frame — 2026-09-29

status: NARROWED — hook metabolized into w/locus-shader.js + RITUALS 3.7/2.9 (HOME display-site-layer-frame-hook-20260929T101545Z); only the pointer question stays open
kind: display encounter (from a site-holon's pressure)
source: Crawlerbait body half — carry `beingbodies`, design at 2026-09-28 (Philipp + Mnemos), Philipp 2026-09-29: "the entire visual langauge we built yesterday FOR the data needs to find its way into the live organism"
target: github.cambium → display (w/locus-shader.js field draw)
related: w/display/y/yw/crawlerbait/_stomach/NUTRIENT__being-kinds-and-bodies__20260928.md

## source-faithful pressure

Crawlerbait's accepted visual language (monochrome/riso halftone goo, ferrofluid bodies on tetrahedral skeletons, beings walking Sierpinski edges) lives only in a standalone prototype with its own camera. To live in the organism, the goo must be drawn **inside Crawlerbait's own shared field**: same GL context, same orientation, same Descent camera, beneath Display's point layer — so Descent, drag, pools, bait selection and body entry stay Display's and do not regress.

## what the site cannot do alone

Display's field owns the only camera: `proj`, `view`, `model(orientation, scale, centre)` are computed inside `draw()` and never exposed. The existing `shader.beforeDraw` fires *before* the cells are drawn, and gives no matrices. A site renderer therefore cannot place anything in its own field space without re-deriving Display's camera (which would fork the shared geometry law).

## candidate (specimen-agnostic)

One optional identity-owned shader hook, symmetric to `beforeDraw`:

`shader.afterDraw({gl, proj, view, model, ms, width, height, dpr, frame, container, orientation})`

- called once per frame after the field geometry and floating bodies, before Display's point layer;
- `frame` = the current Descent frame (`{center, scale}`), `container` = current walked container;
- Display restores default framebuffer + viewport after the call and guards it with try/catch, so a failing site layer cannot break the field;
- Display never names a site; a site without `afterDraw` pays nothing.

The meaning of what is drawn stays entirely in the site body.

## open

- whether pointer interaction with a site layer (e.g. picking a being) should later get a neutral hit hook, or stays site-local DOM;
- performance budget belongs to the site, but Display may later want a frame-time witness per layer.
