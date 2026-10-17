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
