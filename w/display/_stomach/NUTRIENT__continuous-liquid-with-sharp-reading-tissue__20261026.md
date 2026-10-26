# NUTRIENT — Continuous liquid across reading tissue

status: OPEN / ADMITTED — implementation and actual-raster witness pending
owner: display
source: Philipp, 2026-10-26 (Europe/Berlin), direct owner correction with screenshot grafik(20261026-205342).png
baseline: f3928c83f16fcaa10905e5307b40be9cf5c8eab4

## Owner observation — verbatim

> etwas das mir grade sofort aufgefallen ist gehört zur display invariant n1 ist das wir momentan in der oberen liquidborder plötzlich einen scharfen cut haben und dann nochmal einen teil ohne die lensrefracture/lense-distortion =)
> was wir da wollen ist durchgängiges liquid =)

## Admitted target invariant

A shared liquid surface keeps one continuous background optical field across its complete hull, including top-border reading tissue, overfill and capillary transitions. A text reading rectangle must not become a second dry/flat background rectangle inside the liquid. Foreground legibility and background optics are separate quantities.

## Current mechanism and differential

w/locus-shader.js currently computes reading-rectangle distance and multiplies gShift, rim and lighting by optical. That suppresses refraction for every scene pixel in the rectangle, including the background. The screenshot visibly shows a hard internal transition; the mechanism is a matching source-level explanation, not a browser reproduction of the screenshot.

Retain actual hull, safe-area, source ownership, shared drop, target identity and reading/continuation geometry. Replace blanket scene protection with actual foreground protection. No site-specific top strip or another lens. Coordinate with sharp-target/background pressure; the prior whole-reading-rectangle optical exemption is the implementation being challenged.

## Exit witness

- Real software-GLES and browser views at wide/narrow sizes: top reading strip, free edge, capillary neck and moving drop have no internal optical cut introduced by text bounds.
- Structured background continues to refract behind sharp text; a whole clear rectangle is a failure even if its text is readable.
- Preserve source/identity, geometry, truthful fallback, clipping and continuation.
- Record implementation/witness in owner HOME, derive feed separately, and retire this same intake only after its outcome is earned.
