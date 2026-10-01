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
