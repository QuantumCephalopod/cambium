# One observed HUD geometry per frame phase

status: OPEN
owner: display
source_intake: https://github.com/QuantumCephalopod/cambium/blob/5be32202af99f0146a7f882bf3bafa3c40d45b89/_stomach/NUTRIENT__visitor-runtime-performance-audit__20261106.md
source_revision: d84196fe4486ee1db5b84687ce3416409ee98984

Philipp's reported lag and invariant-folding request led to an actual-carrier audit. Lens measures HUD geometry through `z/zz/display-lens.js:267` / `Glass.collect()`; field optics independently requests `Glass.rects()` through `w/wy/locus-shader.js:667`. The latter's six-millisecond cache does not identify an animation frame.

The production-module native witness with three synthetic HUDs records 120 DOM scans, 480 style reads and 360 rectangle reads over 60 frames with Lens plus one field. A second field arriving seven milliseconds later in the same simulated frame raises that to 180/720/540. These are invocation counts, not browser layout cost or a device FPS diagnosis. The frozen audit and exact probe will remain at Display HOME and its source-separated evidence return.

Resolve a shared observation phase owned by Glass. Lens and fields should consume the same measured geometry and derive their own coordinates without repeating the DOM acquisition. A real geometry/style change between distinct phases must earn fresh acquisition; do not replace the current six-millisecond guess with another time window. Preserve HUD overflow/perimeter, visibility, clipping, viewport/DPR changes, moving surfaces, lens contact and per-field coordinates.

Before release, witness one and multiple consumers, early/late execution within a frame, changed geometry between phases, resize, scroll and actual hit/optical alignment. The current immutable revision and paths reacquire both old consumers. Revoke the quotient if shared observations become stale or a consumer requires a genuinely different observation phase. Keep source meaning and WebGL-context resources local. Return completed work through Display HOME, exact retirement and feed.
