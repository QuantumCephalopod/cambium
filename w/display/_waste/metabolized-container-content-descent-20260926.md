# NUTRIENT — container→content descent — 2026-09-26

status: OPEN / ARCHITECTURE PRESSURE
kind: display structural encounter
target: github.cambium → display (Orientation z, Embodiment w); site-holons philosophy, papers, crawlerbait

## source-faithful pressure

Philipp, after living with the site: the whole feel depends on one infinite recursion
downward and back up that is the same gesture globally and locally, because Display is
self-similar.

Working intuition:
- the only relation is container → content. Philosophy is the container space (which may
  itself later split for finer addressing); whole organisms float inside its cells as
  content: Papers inside `y · Inquiry`, Crawlerbait inside `w · Form`. Their own contents
  (Papers' sources/holons, Crawlerbait's baits) float inside them the same way;
- a site's field is therefore its host's field seen from inside the site's locus, not a
  second picture layered underneath;
- a third global invariant is crystallizing beside minimap orientation and background drag,
  DESCENT:
  - selecting a subtet moves the camera to its centroid;
  - render only the next realized level, plus the level beneath it if it exists, as a
    non-clickable hint that recursion continues (this is LOD: locally bounded at any depth);
  - clicking outside the currently framed structure ascends exactly one rank;
  - this is identical inside an organism and across site-holon membranes: clicking beside
    the whole Crawlerbait organism ascends into Philosophy, zoomed out;
  - load time at a membrane crossing may earn an extra transition animation, never a
    different gesture;
- Philosophy and Papers each already grew their own descent. That independent recurrence
  is the pressure for promoting descent into specimen-agnostic Display tissue.

## revision pressure on current receptors

- `RITUALS/navigation` and `RITUALS/site-holon` currently hold that local traversal never
  seizes global navigation. This encounter holds that separation is superseded: one
  descent/ascent law spans local and global. Must be re-earned explicitly, not silently.
- `Persistent global physiology` already names "recursive split-cell centroid camera
  framing" and "exact address/quotient geometry"; descent must realize those, not bypass them.

## undigested witness — #108 (fe74bcfe, merged 2026-09-26)

Looks right, not earned. Crawlerbait draws Philosophy's fragment full-screen beneath its own
body (`environment:'host'`, host = longest raw-prefix mount, region = next gene).
Known violations:
- raw string prefix, not quotient locus (registry mounts already carry `locus`);
- no recursion (host-of-host absent), cost grows with nesting depth (one pass per layer);
- region is a flat 0..3 enum, not a locus in the host's geometry;
- no receptor update, no HOME.
Keep as visual witness until the lawful realization replaces it; then retire.

## open distinctions

1. Does descent state belong to Orientation alone (camera/focus), or does crossing a
   membrane also touch Population/Continuity (which interlocutor is active)?
2. LOD threshold: Display geometry invariant (screen-space size) vs identity-owned.
   Current lean: Display.
3. How does Philosophy's existing background inspection fold into descent rather than
   remaining a Philosophy specialty?

## distillation — 2026-09-26 (recurrence evidence)

Descent grew independently three times:
- Philosophy/Display nav: `W.inspect(path)` + `N.focusTarget` (centroid, scale `1.02·2^len`); no click-ascent; no LOD;
- Papers chambers: `hitChamber` tests only children of the current chamber; miss → `ascendChamber` (drop one gene);
- Papers organisms: `hitChild` tests only the 4 children; miss → `ascend` (pop walked stack); LOD by `projectedPixels < LOD_PX`.

Invariant: container = one cell; content = its four `splitTet` children; framing = child centroid at ×2;
selection local to the current container; a miss ascends exactly one rank; LOD by projected size.
Costume: easing/timing constants, Esc key, stack-vs-path representation, `MAX_DEPTH`.

Challenge to current body: `focusTarget` caps scale at `Math.min(9, …)` (navigation-physiology.js),
an effective depth ceiling (~rank 3) inside a law that must be unbounded.

Ascent (Philipp, confirmed): back through the container you came through — the walked path.
It equals prefix truncation in a tree and stays truthful in a web (holon lineage, quotient chambers).

## candidate law — DESCENT (open)

1. The witness is inside exactly one current container.
2. Content = the container's four children, whatever they carry (cells, whole site-holons, holons, baits).
3. Selection hit-tests only the current container's children.
4. Descent pushes the container onto the walked path and frames the child relatively (no absolute zoom cap).
5. Render the children, plus their children only if realized, as a non-selectable hint.
6. A miss pops the walked path.
7. Membrane crossings use the same gesture; loading may add a transition, never a different gesture.

## challenge ring

- relocation `y → x`: PASS (placement from registry mount locus, not body bytes);
- quotient `xz ~ zx`: PASS (walked path remembers the entering chamber);
- web holon with two containers: PASS (stack);
- constant per-frame cost: PASS (≤ 4 children + ≤ 16 hints, relative framing);
- nested site at `ww`: was UNDERDETERMINED; resolved below.

## resolution — occupied cells (Philipp)

Cambium wood law: when a cell splits, all of its content propagates to the children, and
`ua^m ~ ua` (`xx` is the same point as `x`). A cell is therefore always container; organisms are
always content, placed at their deepest realized address and shown at the resolution of the
current view. At `w` all organisms under `w` float in `w` (split visible as hint); descending into
`w` sorts them into `ww/wx/wz/wy`. There is no separate global space beneath an organism.

Consequence for Crawlerbait: its bait tree treats split prefixes as routers and keeps tissue only
at leaves; content does not propagate on split. Crawlerbait-local regrowth pressure.
(Program organs keep their adjusted split law: the parent becomes a clean router for historic
incoming dependencies.)

## new pressure — pooling / visual coalescence (Philipp, open)

Content deeper than the rendered hint level coalesces into one pool at the hint cell, carrying
its constituents; pools are directly navigable. Candidate shape:
- pool(cell) = all content whose address continues below that cell; deterministic by prefix;
- a pool opens into its four sub-pools plus content sitting exactly at that point (pools of pools —
  never a flat list, so cost stays local);
- jumping to a constituent fills the walked path through every intermediate container, so ascent
  still returns house by house.
Open: pool presentation (count as size/brightness?) is identity-owned or Display-invariant.
