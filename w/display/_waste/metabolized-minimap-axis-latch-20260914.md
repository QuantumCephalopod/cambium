<!-- retired 2026-09-30: spent. Its function was to wait for user acceptance on the live site. Philipp gave it in chat on 2026-09-30: "the hold to lock works". The gesture is live in z/world-view.js (AXIS_SETTLE_MS, dataset.latched), asserted by y/check.py, and the live page advertises it as 'pull anywhere · hold still → lock exact velocity'. The withdrawal it records is superseded: the latch returned and now has its real witness. Its lesson stands and was followed again today: witness against the real membrane, not only against state transitions. -->

# INCOMING — minimap axis latch

Status: nutrient / unearned interaction

The minimap axis controls invited a small aesthetic mechanism: if a rotation knob is held at one displacement long enough and then released, it should remain physically latched at that position so the body keeps rotating. Clicking/picking up a latched knob should release the latch; moving it should permit a new latch, while immediate release should snap it back to center.

Desired phenomenology:

- ordinary drag + release -> return to center;
- drag -> hold steadily at one non-central position -> release -> remain latched there;
- latched x and y may coexist independently;
- picking up a latched knob unlocks it immediately;
- pickup + immediate release -> center;
- no extra lock button, modal state, or explanatory UI is required; the knob remaining in place is the visible mechanical fact.

Two implementation attempts were admitted into navigation physiology on 2026-09-14. Both passed synthetic/state-level tests, but the behavior was not observed on the actual merged public site in the user's real browser interaction. Therefore the feature did not earn anatomy and was withdrawn from the live navigation primitive.

Important lesson: future attempts must be witnessed against the actual generated membrane with real pointer events before admission, not only against state transitions or inferred browser behavior. If it returns, treat the hold/latch gesture as optional local display tissue rather than a navigation invariant until it has a real interaction witness.

The underlying independent-axis control remains viable and unchanged.
