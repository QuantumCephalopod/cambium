# Papers pixel-material specimen · exterior face visibility

Status: UNRESOLVED — direct user counterexample, 2026-11-17.
Owner: Papers public inquiry specimen (the separately staged experimental carrier).

Exact encounter: "Oooh yessss! Very awesome! I just think the faces surface is flipped :D we're looking inside, through the backface into the tet, instead of from outside at the surface of the tet"

The earlier CPU pixel specimen is visually promising, but its tetrahedral face presentation appears viewed through backfaces, rather than as an exterior surface. Preserve the source-backed Holon genealogy, authored surfaces and contact; correct the material projection rather than reconstructing different organism geometry.

Affected carrier: `_stomach/EXPERIMENT__cpu-pixel-material-inquiry__20261116.html`. Current renderer draws triangles from every tetrahedral face, then composites samples from every face in a separate pass. Investigate outward winding, view-dependent face visibility, consistency between coverage splats and solid surfaces, and face contact/overlay. Verify multiple viewpoints in CPU-only browser tests. Do not treat the test's inferred cause as a user claim.

The broader pixel-material inquiry experiment remains unresolved independently of this bounded face-visibility correction.
