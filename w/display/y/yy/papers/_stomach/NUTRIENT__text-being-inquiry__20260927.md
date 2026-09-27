# NUTRIENT — Text is being: metabolites, organisms and their geometry bloom as text — 2026-09-27

status: OPEN / PHENOMENOLOGY + SELECTION PRESSURE
kind: papers encounter
source: Philipp, walking the live Papers body after the shared-descent nutrient
target: github.cambium → display → papers
related: NUTRIENT__shared-descent-invariant__20260926.md; NUTRIENT__global-tetrahedral-text-physiology__20260923.md (Pretext);
display `_stomach/NUTRIENT__text-is-body__20260927.md` (watched Display-level candidate)

## source-faithful pressure

1. **Metabolight = the sentence, asleep.** Every letter of a surviving metabolite is one particle.
   At rest the particles cluster into one blob — that blob *is* the metabolight we see.
   On hover the blob blooms: the particles unfold into the metabolite's own sentence, laid out by
   Pretext; on leave they fold back into light. Not a label attached to a light, not text on a
   string running out to a caption — the string *is* the living thing. label = thing.
2. **Same bloom at every rank.** Holons and Sources unfold their information the same way
   metabolites do — one physiology for metabolite, Source and Holon.
3. **Pretext draws the geometry itself.** A selected organism's `6E` text lies along its edges,
   its `4F` text fills its faces, its `1T` text fills the volume — the tetrahedral body written out
   of its own relations, not information placed on top of a mesh.
4. **Selection only inside a container.** Nothing is selectable from the global Papers view. The
   witness first descends into a realized chamber / subtet (e.g. Governance) and selects there —
   the same Descent rule Display already carries (navigation `Descent`: only the current
   container's children can be entered).
5. **Unfolded text never collides.** Several bloomed sentences / faces coexist without overlap
   while still moving in space (the live 3H.x3Cd encounter shows metabolite sentences overlapping).

## why it is realistic (carrier witness, not ontology)

Pinned `@chenglou/pretext` 0.0.9 (`w/display/w/pretext/`):
- `prepareWithSegments` measures once; relayout is arithmetic on cached widths, so a sentence's
  glyph home positions are cheap targets for particles;
- `layoutNextLineRange(prepared, start, maxWidth)` takes a width per line — a projected triangle's
  width falls linearly with height, so face text can fill the face line by line;
- a projected face is (up to perspective) an affine image of a plane, so one Canvas2D
  `setTransform` maps the laid-out text plane onto it; edges are single lines along a segment.
Budget: descent LOD keeps only the current rank's organism(s) open — a handful of metabolites,
6 edges, 4 faces, 1 volume — on the order of 10³ glyph particles.

## open (for Papers' own receptor)

1. Readability under rotation: faces turned away or collapsed to slivers stay light, not text;
   which facing / size threshold admits ink.
2. How bloom and descent share one gesture (hover blooms, select descends?) without two grammars.
3. Source ground sidecar — lineage made legible: a Holon's *distinct* participating Sources
   (4ⁿ ancestry slots, deduplicated, since a Source may ground several parents), each descendable.
   Belongs to GROUND / LINEAGE; must be reconciled with RITUAL 2.1 "not a list over the
   tetrahedron" / "no permanent inquiry sidebar" rather than silently violating it.

## witness to build first

One standalone organism prototype (S.-PYM Embedology: 4V/6E/4F/1T + 4 surviving invariants)
before touching the Papers renderer: rotate, bloom, read.
