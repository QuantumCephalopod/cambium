# NUTRIENT — text-as-tissue in open organisms needs work; performance next — 2026-10-01

status: OPEN
kind: Papers encounter (from Philipp), after PR #151 merged (Papers RITUAL 2.9, Display RITUAL 3.13; HOMEs papers-text-as-tissue-20261001T204500Z, display-text-tissue-engine-20261001T204500Z)
source: Philipp, session 33Γ, 2026-10-01
target: github.cambium → display → papers (sierpinski.js open-organism tissue path); Display w/display-text-tissue.js where the cost is the engine's

## source-faithful pressure

> is gemerged 😃 although this one really needs some work <333... but lets do that in a new session <333... you can add it as nutrient to the _stomach tho <333 und dann kannst du gern sl33pen <33 das war ne ganz schöne tour!! nächte sessoin kümmern wir uns wieder ein bisschen um perfromance <33

## what is known to be open (from the act's own witness)

- **Reading through the drop is not yet witnessed by eye.** A woven face or metabolite sentence read inside the drop was never seen: the browser pane stopped drawing before that frame.
- **Metabolite sentences wider than the drop** are still laid out at their own width; the part outside the drop stays fat tissue.
- **Edges at rest** are still plain lines, not threads of tissue.
- **First looks were wrong before tuning**: plain white snow until dust fat and opacity were raised; the current fat/softness/opacity numbers (dust 2.4–3.2, woven .9, tissue .3, alpha .62) are one pass of tuning, not accepted values.
- **Performance is unmeasured**: about 1 700–2 200 letter bodies per frame in an open organism, each an instanced quad into a float field, plus three-to-four full-canvas uploads per frame for the glass composite (Display RITUAL 3.12). Papers' own law holds smoothness on a CPU-only laptop as the baseline. Per-character atlas cells are built on demand with a CPU distance transform on first use of each character.
- `y/check.py` was not run locally (Crawlerbait bait tree excluded from the working checkout).

## next session

Philipp: performance first. Measure before changing: frame time with an organism open, with and without the drop, on the CPU-only baseline; then reduce what the measurement names (letter count, composite uploads, atlas warm-up, field resolution).

## exit

Closes when the open-organism tissue reads well through the drop under Philipp's eye and holds frame rate on the CPU-only baseline, or when parts are narrowed with reasons.

## Reentry — 2026-10-10 · Papers perceptual performance

User re-activated the already-unresolved Papers visitor performance wound after the production-wide feed handoff: Papers remains markedly slow. Preserve the 2026-10-01 tissue/readability concerns above; today's bounded experiment changes neither text meaning nor body/flow semantics.

Source inspection shows the overview creates a WebGL text-tissue context and copies its canvas even when no opened organism has admitted letters. Active drawing builds ancestry/embers outside the camera frustum and imposes a fixed `MAX_DEPTH=8` rather than an earned genealogy-depth / projected-pixel limit. Existing per-frame spring/reach physics must remain byte-for-byte unchanged.

Candidate: keep the tissue context dormant until text is genuinely present, gate individual letter instances by the actual droplet with their material reach, omit the unused tissue composite and clear once on retreat. Cull *only wholly off-screen* recursive background geometry with conservative projected world bounds; preserve every organism, its simulation, point identity, and correct camera/selection. Resolve genealogy to the source-owned available rank and pixel-size threshold, not a universal 8-level ceiling. Document current source structure and proof separately from device FPS claims.

Local pure-source prototype: rank-10 lineage, near/far visibility, lens-gated letters, dormant GPU and one-time clear PASS with extracted current production Papers JS; node microbench suggests fewer off-screen generated nodes, but is **not a browser/physical-device FPS witness**. Native CI, source/render test, glass optics and visitor acceptance remain pending. Keep this nutrient OPEN until earned.

## Native staging witness — 2026-10-10

The clean branch `staging/papers-encounter-lod-20261010` was forked from production `94a564613895ffba9e6c956086630193ece91c0b` after an unrelated, transient Crawlerbait stale-projection baseline wound was repaired upstream. It changes only Papers code/receipt and native checker assertions; Crawlerbait data is untouched. GitHub Display membrane action `38053418521` completed SUCCESS for commit `a4e3160ee52edca9f0e23ae0b09cab764c157033` including structural, current source, physics-reference, rank-10 genealogy, viewport LOD, tissue activation/lens/one-clear, privacy, and byte-exact publication witnesses. The constructed Node VM cost example (current public Papers population) emits substantially fewer background draw instances during inward passage; these CPU-stage numbers do not establish on-device frame rate, visual parity or glass/refraction acceptance. Keep OPEN until real browser/performance and user witness are obtained.
