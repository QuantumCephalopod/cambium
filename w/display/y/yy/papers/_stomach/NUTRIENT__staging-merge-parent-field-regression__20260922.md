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
