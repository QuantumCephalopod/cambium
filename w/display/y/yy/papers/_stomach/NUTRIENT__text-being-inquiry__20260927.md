# NUTRIENT — Text is being: metabolites, organisms and their geometry bloom as text — 2026-09-27

status: EMBODIED (#120, HOME display-papers-text-being-embodied-20260927T142303Z) / RESIDUE OPEN
kind: papers encounter
source: Philipp, walking the live Papers body after the shared-descent nutrient
target: github.cambium → display → papers
related: NUTRIENT__shared-descent-invariant__20260926.md;
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

## prototype witness (2026-09-27, Philipp felt it: "the blueprint for how we handle information from now on")

A standalone Canvas2D + pinned Pretext body of S.-PYM earned these, all as one grammar:

- **Information hides in lower resolution — present, not absent.** At rest nothing is written out:
  lines, faint dust, four sleeping lights, four letters. Everything is *there*, folded, ready to be
  observed. This is Display's content-LOD law applied to meaning.
- **One open piece at a time.** hover = peek, click = descend & lock, click outside = ascend;
  the open piece is the locked one, else the peeked one; everything else steps back.
- **Descent continues into the organism's own simplices.** The walked path does not stop at the body:
  `… › S.-PYM › edge wz` / `face wyz` / `vertex w` / `metabolite 2`; ascent pops one step.
- **Every simplex is made of its letters (text = thing):**
  - metabolite — the light is the sentence asleep; hover unfolds its letters into the sentence;
  - edge — the line is a thread of its sentence's letters, tapered toward the vertices; hover lets the
    pointer itself burst the fibres open where it touches; click turns the body so the edge lies level
    in front and the fibres re-weave into the sentence (string → particles → text-string);
  - face — the surface is dust of its own letters; hover stirs it around the pointer; click turns the
    face frontal and the dust weaves into a disk of text at the incenter, levelled on screen;
  - vertex — drawn as the letter it is (w x z y); its sentence unfolds out of that letter, centered
    beneath it (a side chosen per frame made the bloom jitter while the body turns).
- **Vertices are doors.** For `S.*` a vertex carries its source-body span + invariant (outward:
  a page span of the original work — the provenance handoff). For `nH` the four vertices *are* the
  four parent organisms, so opening a vertex is walking into the ancestor, recursively to Source ground.
  The source-ground sidecar is the same lineage flattened and deduplicated beside it.

Open from the witness: kerning (glyph advances measured per character); where the 1T volume lives
now that the center belongs to the metabolites; several open sentences never overlapping.

## embodied (2026-09-27, #120, live on sss.saarland)

The prototype grammar now lives in the Papers body itself and is browser-witnessed on the
deployed site: 5H.Dw6a's metabolite light unfolds into its sentence on hover; edge wz frays under
the pointer and a click turns the body so the edge lies level and re-weaves into its sentence.
Glyph advances come from measured prefixes (kerning closed). Organisms without projected tissue
(e.g. S.Hark) rest as bare lines and letters — projection absence, not a renderer wound.

## residue — the exit condition of this nutrient

1. **Readability under rotation** — facing / size threshold below which a face stays dust, not ink.
2. **Where 1T lives** now that the center belongs to the metabolites.
3. **Source-ground sidecar** — reconcile with "not a list over the tetrahedron" before building.

(No-collision closed into RITUAL 2.3 — HOME display-papers-ink-membrane-20260927T152946Z.)

## encounter (2026-09-27, Philipp, after #123 went live)

"i love that dynamic resolution change *alot* ... although the performance wasnt bottlenecked by that
at all 😃 its mainly tied to the popup of lots of text eg edges and faces are throttling fps when
opening them =)"

→ residue 4 answered in place (HOME display-papers-containers-story-20260927T180350Z): woven letters are
  blitted from a cached glyph atlas instead of per-glyph fillText. Still owed: a frame-time witness on
  Philipp's own CPU-only laptop.

## narrowed (2026-09-28, HOME display-papers-own-vertex-name-bloom-20260928T0900Z)

Item 2 of the source-faithful pressure ("same bloom at every rank") is now embodied one rank up:
every organism's identity (`id · title`) sleeps as a cluster of its own letters on its body before
selection and unfolds on peek (RITUAL 2.6). Residue 1 is narrowed on one axis: a woven face now opens
at the same readable size at S ground as at every Holon rank. Still owed: the facing/size threshold
below which a turned face stays dust, where 1T lives, the source-ground sidecar, and the CPU-only
frame-time witness — now including the ~200 sleeping name-clusters (one batched path per frame).
