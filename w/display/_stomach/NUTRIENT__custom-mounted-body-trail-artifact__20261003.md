# NUTRIENT — custom mounted-body trail / black-wedge regression — 2026-10-03

status: NARROWED / STAGING-WITNESSED — masked-depth and cached-host re-entry repairs pass source/native tests and desktop/mobile browser QA; canonical promotion/live acceptance remain open
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

## 2026-10-04 encounter — cached host return was also wrong

Foreground browser QA at 390×844 found offscreen overview labels after Papers → root-home in both the original baseline and the clear-only candidate, despite `container=ε`. Baseline examples: Crawlerbait x≈−1842/y≈2444, Datenschutz x≈735/y≈1534, Papers x≈529/y≈430. Schattenseiten return showed the same class. Clearing depth made the oversized body visible; it did not create the retained camera scale. Philipp's foreground explicitly admitted restoring the renderer's truthful current-container camera on re-entry while preserving existing membrane transition semantics, without changing sibling/outside-click topology or history.

## source-proved causes and staged repair

1. **Masked depth clear.** The two custom materials write depth; later transparent generic bodies leave `depthWrite=false`. The next frame cleared before opening depth writes. WebGL clears obey write masks, so earlier custom-body depth survived; label ink restored that state and glass did not change the mask. The direct overview reproduces this with `composite=0`, so entered-site compositing is not required. Frame, host-backdrop and point-depth clears now reset write masks/scissor and depth clear value before drawing state is applied. Geometry, materials, identity and draw order are unchanged.
2. **Cached host camera.** `enterBody()` retained its body-entry camera target; `refreshVisible()` skipped unchanged `ε`. The runtime's explicit membrane-ascent route called `arriveFrom(place,id)`, but root-home/global/keyboard surface return did not. Newly revealed identities now use the existing arrival API to settle from their cached transition into the current-container frame. The explicit membrane body/place transition still overrides it; ordinary language/activity repaint does not restart a camera.

The original baseline fails the new frame-clear regression. The clear-only first candidate passes those clears but fails the independent cached-camera return assertion; the combined candidate passes field and runtime re-entry tests. Regression fixtures exercise mobile/desktop dimensions, glass on/off, host/point/composite passes, opaque/generic body reordering and stable geometry/identity. Actual browser acceptance belongs to the foreground QA witness and the final HOME below; test fixtures do not substitute for it.

## remaining boundary

This is a staging repair, not a deployed-site closure. Keep deliberate canonical owner promotion/deployment and actual live acceptance explicit. The distinct site-owned host-geometry/phenomenology and sibling/outside-click topology nutrients remain untouched. One first-preview reload temporarily reported missing runtime dependencies and later recovered; it is an unassigned QA transient, not a proven startup defect. Delivered preview paths are retained immutably for comparison.

## final staging witness — 2026-10-04

The foreground performed browser A/B on the native six-site artifact: original `eb548b32a7ec3a36`, clear-only `00837123662f5a83`, combined `c92d0ec39b055cce`. Desktop 1280×800 and mobile-emulated 390×844 show bounded white Schattenseiten and green Papers bodies without stale dark occlusion across repeated frames/overview rotation. Both bodies' entry → root-home → settled overview now return to ordinary host scale at both sizes; mobile labels return to ordinary roughly x0..350/y250..520, and rotation after return stays clean. The large blue field faces are intended host geometry, not the defect.

The combined full-aperture artifact has 56 files; all 49 shared members are byte-identical to the foreground-tested immutable `/fix-return/` candidate. Native `y/check.py` passes 118,082 checks; wrapper `--check` verifies all 56 files. Windows execution substituted the installed Python 3 for the unavailable `python3` Store alias and allowed native child-process tests; no repository tests were skipped or rewritten for the host. Regression callbacks cover Escape return, but the browser Escape attempt was consumed by navigator/focus, so no actual Escape-route browser witness is claimed. Mobile browser viewport emulation is not a physical phone GPU test. Final candidate reported no new browser errors.

Detailed source/artifact/QA witnesses and screenshot hashes are bound by the owner-local HOME. Canonical promotion remains the only staged-delivery exit; keep physical-device/actual deployed acceptance limitations explicit rather than asserting a globally clean experience.
