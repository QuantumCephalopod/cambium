# NUTRIENT — the global navigator as HUD, and as glass — 2026-09-30

status: NARROWED — the HUD half is metabolized into z/navigation-aperture.css + navigation RITUAL 2.8 (HOME display-global-nav-hud-20260930T204252Z); the glass half is OPEN and not started
kind: display encounter (from Philipp, after using the site a lot)
source: Philipp 2026-09-30 (English, verbatim): "ok another big pet-peeve (aftter utilising the site alot :D) is the "overlay" nature of the global nav =) i would rather have it be a HUD style (like crawlerbaits for example) whats reaaally nice is if we could do some displacement magic... which means having the "glass" effect with rather simple (computationally) imaginary number shader? :D"
target: github.cambium → display (z/navigation-aperture.css; later w/locus-shader.js)
related: w/display/y/yw/crawlerbait/RITUALS/organism/RITUAL.md (Philipp on HUDs: "ich will keine overlays mehr … wir brauchen ein HUD"; "always locked at the screenborder … so the center is free")

## source-faithful pressure

The open global navigator is an overlay: a 336 px octagonal plate with a near-opaque dark fill and a heavy drop-shadow blooms in the corner over the site. Measured at 1100×700 it makes the safe-area contract reserve 344 px on the right and 296 px at the bottom (31% of the width, 42% of the height), so every site, Crawlerbait's HUD included, has to lay out around it. Philipp wants the navigator to be a HUD in Crawlerbait's sense: ink on the field, locked to the screen borders, the centre free. And, if it can be had cheaply, glass: the field behind it refracted by a displacement built from a simple complex-number map.

## metabolized (HUD)

For single encounters only:

- the plate is gone: no fill, no clip-path, no drop-shadow; ink with a dark text halo, and a soft radial halo of the page's own dark behind the instruments, fading to nothing (inverse mode inverts it with the rest);
- the cluster is flush to the screen corner on Crawlerbait's own edge margin (`clamp(.9rem,2.2vw,1.6rem)`);
- one size knob, `--hud-t`, the side of the map (160 px; 138 at ≤760 px, 118 at ≤520 px, 104 at ≤380 px of height); everything else derives from it; on a short viewport the captions are dropped and the instruments stay;
- the transparent area no longer captures the pointer; only the map, the rails and the trigger do;
- the trigger is a corner mark; closed, the navigator reserves only that mark;
- the existing gestures (hover, click to pin, Escape, the rails, the settle lock) and all element ids are unchanged; `navigation-aperture.js` is untouched;
- split and grid encounters keep the seam aperture exactly as it was.

Measured at 1100×700: open, the safe-area reservation fell from 344 × 296 px to 254 × 272 px; closed, it is the 40 px mark plus edge and gap.

## open (glass)

Nothing is built. What was read, so the next pass starts from ground:

- the field is one WebGL2 canvas (`w/locus-shader.js`, `getContext('webgl2',{alpha:false})`); the pixels to be refracted are GL's, so the honest route is a post pass inside that pipeline, not CSS;
- CSS `backdrop-filter:url(#svg)` with `feDisplacementMap` refracts DOM and GL alike but works only in Chromium; it would be a progressive enhancement at best, not the route;
- inverse mode is `body{filter:invert(1)}`; glass that lives in the GL frame inherits it for free;
- the safe-area contract already measures the rectangle of every occupied surface (`SSSDisplaySafeArea.snapshot().occupied`), so a glass pass can take its rectangles from there and stay specimen-agnostic;
- candidate, not law: render the field into an offscreen texture; a cheap second pass draws it to the screen, displacing the lookup inside each occupied rectangle; with z the pixel relative to the rectangle's centre as one complex number, a rim profile from a rounded-box distance, and the displacement a complex number w = z + k·s(z)·e^{iφ}, φ the argument of the distance gradient; chromatic fringing from three lookups at slightly different k; Crawlerbait's bodies already live on one complex field, so the language is the house's own;
- limits to accept knowingly: only the GL field refracts (DOM prose such as Papers' or Philosophy's text and the header does not); one extra full-screen pass and an offscreen target; touch devices and low-power GPUs may need a no-glass fallback;
- Philipp's decision: whether the glass should stay with the navigator or become a generic property of every occupied HUD surface (the header, the status rail, site HUDs like Crawlerbait's), which the occupied-rectangle route makes natural.
