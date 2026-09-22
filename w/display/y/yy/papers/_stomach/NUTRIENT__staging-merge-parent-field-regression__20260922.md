# NUTRIENT — Papers staging build regression after main merge — 2026-09-22

status: OPEN / UNRESOLVED
kind: display.papers CI regression encounter
target: github.cambium → display.papers
source: user-provided GitHub Actions traceback in chat

## encounter

The user reports the current staging build fails at:

`python3 y/check.py --artifact _site`

with:

`AssertionError: superseded full Philosophy structural parent field remains in Papers`

The failing permanent assertion is:

`'PARENT_FIELD_ID' not in papers_sierpinski and 'createParentInquiryField' not in papers_sierpinski and 'parentInquiryViewTarget' not in papers_sierpinski`

Current staging head is a merge of `main` into `staging/papers-chamber-parent-field-20260922`.

## unresolved pressure

Determine exactly which merge hunk reintroduced superseded Philosophy parent-field code/tokens into the current Papers renderer.

Repair the smallest dependency cone:
- preserve the accepted Inquiry-only environment relation;
- preserve Papers-local fourfold rest frame;
- preserve chamber labels/counts;
- preserve bounded genealogy-gap hydration;
- do not reintroduce affine parent-frame coupling or full Philosophy tetrahedral geometry;
- update permanent checks only if the implementation changed truthfully, not to silence a valid regression.

## acceptance

- current branch contains no superseded `PARENT_FIELD_ID`, `createParentInquiryField`, or `parentInquiryViewTarget` implementation;
- Inquiry-only environment remains live and Philosophy-owned;
- `python3 y/check.py --artifact _site` passes on the exact current head;
- complete staging workflow passes;
- completed carrier retires to waste; only genuinely unresolved browser/runtime pressure remains.


## ACT / WITNESS — 2026-09-22

### exact cause

Current staging head had merged `main` after the last successful Papers state.

Comparison against the last known-good Papers head `f1d4fc5d1d484215d44b1511d786120229c9003f` showed the merge reintroduced exactly 12 superseded parent-frame lines into `w/display/y/yy/papers/sierpinski.js`:
- `parentMountFrame()`
- `parentInquiryViewTarget()`

The rejected `PARENT_MOUNT_PATH` constant itself was not reintroduced, leaving this as orphaned dead physiology.

The same merge also reintroduced the temporary generic external `viewTarget` hook into `w/display/w/locus-shader.js`.

### repair

- `w/display/y/yy/papers/sierpinski.js`: removed only the orphan parent-frame helper block.
- `w/display/w/locus-shader.js`: restored the pre-merge accepted generic field state, retaining reusable `paletteSet` but removing the rejected external `viewTarget` path.

Post-repair readback confirms:
- `PARENT_FIELD_ID`: absent
- `createParentInquiryField`: absent
- `parentInquiryViewTarget`: absent
- Inquiry-only `createInquiryEnvironment`: present
- chamber labels: present
- bounded genealogy repair: present
- generic `paletteSet`: present
- generic external `viewTarget`: absent

### mechanical witness

GitHub Actions run `35774169837`
head under test: `080f07558b0a3a57bdb42d9f82d69b0e84624ff1`
conclusion: SUCCESS

Witnesses:
- feed projector compatibility: SUCCESS
- persistent Display build: SUCCESS
- `python3 y/check.py --artifact _site`: SUCCESS
- address algebra: SUCCESS
- tetrahedral closure: SUCCESS
- membrane bytes: SUCCESS
- staging artifact: SUCCESS

### assimilation

The existing permanent negative check for superseded Philosophy parent-field physiology correctly caught the merge regression and remains sufficient. No new receptor law is required.

This nutrient is fully metabolized and may retire to waste.
