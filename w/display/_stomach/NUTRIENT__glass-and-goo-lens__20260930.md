# NUTRIENT — glass for occupied HUD surfaces, and a goo lens — 2026-09-30

status: RESIDUAL / OPEN — achieved portions catabolized 2026-10-04
kind: display encounter (from Philipp)
source: Philipp 2026-09-30 (German and English, verbatim): "glass für alle occupied HUD surfaces, go!" ; on the lab: "oooohgott jaaaa!!!! das is sooo geil xD.... ich frag mich ob ma nden lichtpunkt weglassen kann und rein mit dem displacement arbeitet?" ; "würde es funktionieren sowas zu nutzen um nur local extra info zu rendern? eg was is wenn wir sone lupe haben die, wenn sie über nem organism liegt, diesen tatsächlich als solchen rendered? eg wir schaun tatsächlich kurz in papers rein und nicht nur auf seinen coarse-body in philosophy?" ; "ich hätte gern das die lupe genauso ein pane ist wie in der demo =) so hoch wie die globalmap aber nur so halb so breit. wenn man die pane wegzieht, dann solle es wie goo kleben bleiben (und auch wieder magnetic werden wen mans zurück in die richtung zieht) und wenn mans hält dann wirds rund =) eg als würde man ein stück semi-wobbeliges transparent goo vom globalm compass abziehn um damit über den screen zu wandern" ; "können wir da noch nen halftone drüberlegen? ich find edie harten kanten geben immer so pixelated ugliness die halftone so gekonnt überspielt für weniger compute"
target: github.cambium → display (z/, w/locus-shader.js)
related: w/display/y/yw/crawlerbait (halftone ink)

## surviving owner and return address

`z/display-glass.js`, `z/display-lens.js`, `w/locus-shader.js`, `_root/display-glass-goo-lens-20260930T215021Z.json` and current navigation law own occupied-surface displacement and the drop. The fine-preview, image-release/preload and bright-field questions below remain separate.

## open
- the lens as a real lens: over an organism it should render that organism itself (Papers, Schattenseiten) and not only its coarse body. Schattenseiten and Crawlerbait draw through a GL layer with a focus camera, so a second, lens-clipped draw of that layer is the cheap route; Papers owns several canvases and DOM text and is a larger job; Philosophy is DOM only. Not started.
- Schattenseiten load time: measured 49 stills, 3.15 MB, all in about 2.7 s; the files are 2048 px and decoded to 512 px, so derivatives at 512 px would be about 0.3 MB. Sized-media generation and the 512 binding were subsequently staged and CUA-witnessed at `display-live-type-performance-sized-media-20261003T111336Z`; current source carries that binding. Fat release/current visitor agreement and hover preload are not proved by that implementation receipt. The remaining promotion/visitor boundary is carried by `NUTRIENT__live-type-density-and-performance__20261003.md`.
- on a dark field pure displacement has little to bend; the rim is therefore printed as light dots. A bright field (inverse mode, Crawlerbait's goo) was not looked at.

The extracted preimage is at `../_waste/catabolized-NUTRIENT__glass-and-goo-lens__20260930-20261004.md`. Reopen only if its cited owner changes, a retained question requires an extracted distinction, or a countercase defeats the witness.
