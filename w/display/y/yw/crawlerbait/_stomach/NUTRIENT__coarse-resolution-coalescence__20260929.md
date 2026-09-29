# NUTRIENT — beings coalesce at coarse resolution — 2026-09-29

status: NARROWED — law metabolized into z/render.js + RITUAL 4.7 (see HOME crawlerbait-coarse-resolution); open: body↔colony crossfade, ink pass at field resolution, true over-the-shoulder camera
kind: crawlerbait encounter
source: Philipp, chat 2026-09-29 after PR #131 went live: "performance is starting to tank a bit as well =) so we might need a law for how we coalesce for rcoarse resolution"; on the proposed law: "you got it!! pretty much exacgly like that"
target: github.cambium → display → crawlerbait (z/render.js goo layer)

## source-faithful pressure

The goo layer simulates and splats every alive being at full detail at any view, so cost grows with the whole alive population, not with what the view can resolve.

Measured live on sss.saarland (Mnemos's machine, 857×830 canvas, 253 alive, 13 265 splats): JS 3.9 ms/frame (population-bound), GPU goo accumulation 1.3 ms, ink pass ≈2.2 ms (resolution-bound). Philipp's CPU-only laptop pays several times more.

## candidate law (agreed in chat, not yet law)

Display already carries the invariant: content deeper than the container's children and their children (container + 2) coalesces into pools (navigation `Descent`). Beings obey it too:

- a being resolves as its own body only when the bait it last touched lies within the viewed resolution (address depth ≤ container + 2);
- deeper, every being in the same rank container+2 cell coalesces into one colony body whose skeleton is that Sierpinski cell, whose mass is the sum of its members and whose phase is the complex sum of theirs — kin print in their kind's ink, strangers cancel into bone;
- beings outside the container are not drawn;
- descending splits a colony open, the same gesture as pools;
- coalesced and hidden beings keep walking their record but pay no collision, trail or splat.

## open

- colony ↔ body transition when the container changes (crossfade vs cut);
- whether the ink pass should run at field resolution to cut the resolution-bound cost.

## metabolized (2026-09-29)

Contact changed the law before it landed: pure container + 2 left zero bodies at every ordinary depth (baits sit at ranks 4–10) and emptied the overview into 16 blobs. Self-similarity gave the truthful rank: beings are content of baits, so container + 4. A colony of one is not a colony. Philipp then named the missing motion — coarse steps must still happen — so coalesced beings walk their cell changes along coarse Sierpinski edges as droplets. Bonus: crawlercam over Display Descent.

Still open: crossfade when a colony splits into bodies on Descent; ink pass at field resolution; a real over-the-shoulder camera needs a neutral Display camera hook — Display pressure, only if earned.
