# NUTRIENT — floating bodies disappear in the 2D field

status: OPEN
owner: Display Embodiment / shared field
source: bounded public-browser encounter on 2026-10-17, admitted before implementation
source_revision: 12af521488a3bf5f08076262fc4776c9d7e4bb5e

## Encounter

At https://sss.saarland/?lang=de#main:overview, the Chrome cloud browser exposes a 1363×936 CSS viewport. The Philosophy field draws tetrahedral faces and four gene labels, while no floating site bodies or attached body-label buttons are present. The global navigator still lists six sites. Browser DOM records one 1363×936 field canvas and five inactive 300×150 field canvases. No site renderer error was reported; an extension metadata error is a separate observation.

Source localizes this without querying GPU internals: `w/locus-shader.js` already paints the field with Canvas2D when WebGL2 is unavailable, but `floatingBodies()` returns an empty array whenever `gl` is absent. Body creation, drift, labels, hit testing, entry and `projectBody()` also depend on a compiled GL program. Thus a supported field representation loses the independent bodies it is meant to carry. This is additional bounded evidence for the existing legal-label/representation acceptance pressure, not proof of a driver fault or GPU success.

## Bounded question

Can the existing 2D field retain the same offered identities, realized full body geometry, placement, drift, localized attached labels, hit testing and entry relation while rendering an explicitly simplified palette representation? GLSL phenomenology, glass optics and site-owned WebGL-only renderer fallback remain outside this act.

## Acceptance / stop

Execute the real field source with absent WebGL and a Canvas2D fixture at wide and portrait carriers. Require all offered bodies and all realized triangles; stable identity under reorder/language changes; drift-following body projection; selectable body faces and labels; correct structural entry event; disappeared offers no longer selectable. Preserve existing GL regressions and build/address/artifact checks.

A native fixture is not a visitor visual witness. Candidate HTTPS/browser appearance and physical-device acceptance must stay OPEN unless actually exercised; narrow-device/legal visual acceptance and Papers' own renderer refusal are not closed by this repair. Preserve source evidence and bounded residue through HOME with truthful staged/deferred status.

## Staged bounded result — 2026-10-17

Status: NATIVE REPAIR EARNED / CANDIDATE VISITOR ACCEPTANCE OPEN.

Implementation `c9fe1c61b188377849ddbcb5fd230d0a257fc11d` retains the same offered identities, full realized meshes, placement, drift and localized label/face entry in Canvas2D. Withdrawn offers are no longer contactable and their attached labels hide. Palette paint is a reduced representation; no GLSL/glass parity or site-owned renderer fallback is claimed.

The actual-source regression failed on the admitted baseline (0 instead of 5 floating labels), then passed at 1280×800 and 390×844, including a finer child mesh, title/reorder continuity, drift, label/face entry and withdrawal. Existing GL regressions passed. A fresh generated artifact passed 234247 checks, 38 address assertions, tetrahedral closure and exact 11249-file verification; bundle `ab40c777a85baf22`.

The live browser observation above describes the pre-repair deployment. The cloud browser could not reach the local HTTP candidate (`net::ERR_CONNECTION_REFUSED`); no candidate screenshot, layout/performance, narrow-device or physical-device acceptance is claimed. Preserve this residue until owner promotion and an actual visitor witness of the candidate. The legal-label/narrow-view and Papers renderer/media/optics wounds remain independently open.

Persistent source correspondence: the native-tested local source commit above and GitHub commit cbbd4f45d6fbc2e0a9f95f0194224873b388d314 share tree 88da019ab0876974e6733232dfac75de926d79cb. The bounded carrier witness is ../_root/display-canvas2d-body-carrier-20261017T131032Z.json; it changes neither the original HOME nor its open acceptance boundary.
