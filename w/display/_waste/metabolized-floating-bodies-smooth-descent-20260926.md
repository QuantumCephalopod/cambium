# NUTRIENT — floating bodies + smooth descent — 2026-09-26

status: OPEN / ARCHITECTURE PRESSURE
kind: display structural encounter
target: github.cambium → display (Orientation z, Embodiment w)

## source-faithful pressure (Philipp, after living with #111)

a) Papers needs the same Descent invariant.
b) The invariant must contain free-floating bodies: organisms in Philosophy (Crawlerbait,
   Papers) behave visually like holons in Papers. The shape of a body is its own realized
   subdivision (Crawlerbait ~rank 10, Papers rank 1). Difference: holons build size from small
   to bigger (composition grows outward); organisms keep one size and subdivide finer
   (differentiation refines inward). Papers' body in Philosophy is as big as Crawlerbait's.
c) No teleport: interpolate smoothly (~0.33 s) to the target and back.

Revision: geometry is drawn at full realized resolution from outside — a Sierpinski body is
computationally cheap and each rank quadruples capacity, so depth settles. LOD is for
clustering content and loading only what is in view, never for the shape of a body. This
revises the geometry half of Descent's "render" line.
