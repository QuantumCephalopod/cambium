# NUTRIENT — Chamber labels hang from a shared vertex — 2026-09-28

status: SPENT — metabolized into RITUAL 2.6 (chamber labels hang from their own outer vertex); HOME display-papers-own-vertex-name-bloom-20260928T0900Z
kind: papers encounter
source: Philipp, walking the live Papers overview after #125 (screenshot)
target: github.cambium → display → papers

## source-faithful pressure

"ok looks like we also got this small problem =) as you can see the labels are attached to the wrong vertices =)"

## witnessed

- live overview (org main = deployed, asset 25becbd3c67dc6fd): `W · GENESIS` sits on the w corner; `X · CONTINUITY`, `Z · GOVERNANCE`, `Y · EVOLUTION` sit away from their populations.
- inside chamber z, `Z · GOVERNANCE` hangs from the top-right vertex of the z cell while its 145 organisms float at the cell centroid; touching that population correctly entered `z` (hit-testing is sound).
- `updateChamberLabels` anchors every label at `cell.tet[0]`. For split child `i`, vertex `j` is the outer corner only when `i == j`, otherwise `mid(V_i, V_j)`. Proven with `navigation-physiology.js`: w → own corner (by coincidence); x, z, y → `mid(gene, w)`, the vertex each shares with Genesis.
- introduced with #124 (visible r1 containers), where the witness recorded "vertex-hung labels" without checking which vertex.

## bears on

RITUAL 2.4: "Chamber labels hang from their chamber's body." The one vertex a chamber owns alone is its own outer corner, `tet[GENES.indexOf(gene)]`.
