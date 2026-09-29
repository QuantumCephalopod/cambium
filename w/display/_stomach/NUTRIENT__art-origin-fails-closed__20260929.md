# NUTRIENT — Philipp's artwork needs a visitor origin that fails closed — 2026-09-29

status: OPEN / UNRESOLVED — admitted, not metabolized
kind: display encounter (publication-membrane pressure; likely new Population body)
source: Philipp, 32Ω chat: "a way for me to host my real paintings/images eg my artistic work on sss.saarland (i dont wanna go through r2 storage…)", then the correction: "its about literal exploitabilaty... r2 storage means that we expose the potential of someone attacking by forcing more downloads and therefore traffic… you get a bill… ever image is a potential payload"
target: github.cambium → display (y · Population; publication membrane)

## pressure

Philipp wants his artwork on sss.saarland. Copying is welcome and is not the concern. The threat is **denial-of-wallet**: every public media file is a request an attacker can repeat. The origin that serves those files must **fail closed**. Under abuse it may throttle or refuse, but it must never produce a bill.

Provider facts checked on 2026-09-29 (re-verify before building):
- R2: 10M Class B reads/month free, then $0.36/million, billed and rounded up per million. A visitor-reachable R2 object is a meter anyone can run. This matches Display's existing live-nerve law: the `sss-shadow` bucket stays private, and `assets.sss.saarland` stays disabled and "not a future publication step" (`w/display/x/live/README.md`).
- GitHub Pages: 1 GB per published site, 100 GB/month *soft* bandwidth. Excess gets HTTP 429 or a support email, never a charge. One Pages site per repository. Pages "is not intended for or allowed to be used as a free web-hosting service" for commerce, so sharding many repos to evade limits is out.

## first shape (unmetabolized proposal, not law)

- A **separate** repository in the org with its own Pages site on its own subdomain carries web-ready artwork. This contains the damage (abuse throttles that origin, not sss.saarland), keeps `cambium` clones lean, and gives the artwork its own 1 GB.
- Originals stay in Philipp's Drive. Only derivatives are published, and each work is admitted explicitly (deny-by-default, as in the main-root `PUBLIC_MEMBRANE.md`).
- Longer video is embedded from a platform that carries its own bandwidth (YouTube-nocookie, Vimeo or the Internet Archive). It is never committed to git (100 MB file limit, bandwidth budget).
- On the Display side, the artwork most plausibly becomes its own site-holon in Population whose projection references the art origin. No Display runtime learns about the artwork, and no visitor-facing Worker or R2 route is added.

## first body of work

The first work is the **Schattenseiten** (shadowshapes), Philipp's 49-image shadow series: seven seeds, then 21 first-order descendants, then 21 second-order (`[1 row → 3 rows] → 3 rows = 7 rows`). The same 49 form the shared-root j-space sensing substrate (`/jSpace_49ShapeGrid.png`). Publication must read copies only and never move, rename or re-encode the Drive originals or the root sensing carriers.

Drive inventory as observed (private, for derivation only): the 49 at 1024² WebP (~3.4 MB), 33 animated WebPs (~88 MB), 4 MP4s (~30 MB), photographed plates 4984×3744 (~224 MB), physical documentation (~290 MB) and a sticker set (~98 MB). Web-sized, this comes to roughly 200 MB.

## open

- Which organism owns the art origin: a new independently rooted organism, a Display-hosted carrier, or something else? That is a Cambium birth question and is not answered here.
- The site-holon's name, address in site-space and phenomenology are Philipp's and the body's own to earn.
- The derivation pipeline (Drive → web derivatives → art repo): where it runs and how each work is admitted.
- Whether the tile/deep-zoom embodiment (Descent into a painting) is wanted.
