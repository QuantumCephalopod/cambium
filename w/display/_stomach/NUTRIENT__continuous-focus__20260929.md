# NUTRIENT — a site may offer a continuous focus — 2026-09-29

status: NARROWED — metabolized into w/locus-shader.js (focus hook) + RITUAL 3.8; open: whether a focus should also move Display's pools
kind: display encounter (from a site-holon's pressure)
source: Philipp, trying Crawlerbait's first crawlercam (built on Descent steps): "das following ist leider ganz schrecklich xD da wird mir übel... literally 😕 ich meinte schon smoooth camera follow... nicht jump jump jump jump"
target: github.cambium → display (w/locus-shader.js field camera)

## pressure

Descent is a step gesture (~0.33 s per container change). A camera that follows a moving body by chaining Descent steps jumps and makes the witness physically sick. Following needs a continuous camera, which only Display owns.

## metabolized

Optional `shader.focus()` → `{center, scale, stiffness?}` or null. While offered, Display eases its own frame toward it with a critically damped spring integrated in fixed substeps over real elapsed time (feels the same at any frame rate); when withdrawn, the frame glides back to the walked container. The walk, pools and selection are untouched; Display never learns what is followed.

## open

Display's pools still resolve at the walked container while a focus zooms deep; if another site needs its points to follow the focus, that is new pressure.
