<!-- retired 2026-09-30: spent. Its function was to wait for user acceptance on the live site. Philipp gave it in chat on 2026-09-30: "the hold to lock works". The gesture is live in z/world-view.js (AXIS_SETTLE_MS, dataset.latched), asserted by y/check.py, and the live page advertises it as 'pull anywhere · hold still → lock exact velocity'. This was staging evidence only; the user/production receipt it lacked is the acceptance above. -->

# Browser witness — 2026-09-14

state: staging/browser witnessed; production/user witness still pending

The generated Pages membrane was exercised in a real Chromium instance before promotion.

Observed acceptance:

- quick x-axis drag/release returns to center;
- x-axis held steady for 800 ms remains latched after release and keeps its nonzero velocity;
- picking up a latched x axis and immediately releasing unlocks and returns it to center;
- x and y axes can remain latched independently at the same time;
- unmaterialized root loci do not expose a meaningful Enter action;
- y / Inquiry exposes `organism:papers` as its realized membrane destination;
- the navigation event for Papers fires while the tetrahedral fold is in `closed` phase;
- the Papers manifestation loads as its own local root with four visible phenotype groups.

This is not yet a production/user acceptance receipt. Keep this as bounded staging evidence until the promoted site is exercised directly.
