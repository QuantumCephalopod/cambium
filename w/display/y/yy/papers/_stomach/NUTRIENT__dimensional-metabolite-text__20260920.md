# NUTRIENT — dimensional metabolite text embodiment via Pretext-derived layout

status: OPEN / UNRESOLVED
kind: display.papers phenomenology + text embodiment pressure
admitted_at: 2026-09-20
target: github.cambium → display.papers
source: user design encounter + current Papers phenomenology + rechecked upstream Pretext capabilities

## encounter

The current Papers body has gained recursive scale, free tetrahedral tissue motion, living overview physiology and Source inquiry.

A new display-specific pressure is now explicit:

- Source organisms should remain **absurdly small** as the minimum Papers organism quantum;
- higher-rank Holons should become perceptibly massive only because recursive scale actually accumulates;
- bodies should be free to drift organically inside their current bounded tetrahedral chamber rather than read as a static packed diagram;
- the same law must survive future Cambium splits recursively instead of introducing depth-specific animation code;
- metabolite text should become dimensional, spatial and dynamic rather than behaving like a static text overlay.

This is primarily an embodiment problem in display.papers, not a Drive /papers source-metabolism problem.

## source boundary — metabolite content vs display embodiment

Drive /papers owns what metabolite tissue actually is and whether its public projection is well-formed.

A separate Drive nutrient already carries the raw-information / possible catabolic-normalization pressure:
- metabolites are organism-owned raw knowledge tissue;
- Display must not invent editorial summaries;
- malformed/merged/empty projected rows may need source-side normalization.

This nutrient assumes only that whatever metabolite tissue is truthfully public may later be embodied by Display.

It does **not** authorize Display to rewrite, summarize, clean or semantically reinterpret metabolite content.

## scale phenomenology

Desired bodily relation:

`Source quantum << 1H << 2H << 3H << 4H << 5H`

with the existing Papers law:

`linear scale(nH) = S_QUANTUM × 2^n`

The intent is not merely numeric correctness.

Perceptually:
- Sources should be almost particle-small from ordinary overview distance;
- low-rank Holons should become readable only as one approaches;
- high-rank Holons should be the first bodies that carry unmistakable mass at distance;
- zoom should reveal that apparent mass is recursive contained tissue, not a larger icon;
- selection remains a scale passage inside the same continuing world.

The visual hierarchy should therefore come primarily from actual scale and recursive resolution, not from bloom/intensity compensation.

## dynamic matter

Current Papers already has bounded in-chamber drift.

The desired continuation is stronger organic freedom without semantic fabrication:

- organisms may move freely enough to feel alive;
- motion remains constrained to the currently realized tetrahedral chamber;
- motion must not imply a semantic subdivision that Cambium has not earned;
- if Cambium later subdivides a chamber, the same movement law should automatically rebind to the realized child cells;
- no hard-coded rank/depth-specific movement physiology;
- same law under recursive address substitution.

The feeling target remains:

`organ → tissue → cell`

not:

`nodes moving around a visualization`.

## Pretext provenance / capability recheck

Upstream rechecked:
https://github.com/chenglou/pretext

Pretext is a multiline text measurement/layout engine that avoids DOM reflow and supports manual layout to Canvas/SVG/WebGL-style surfaces.

The capability relevant to Papers is not “render a static paragraph”.

The useful primitive family is:
- one-time text preparation / segmentation / measurement;
- cheap repeated layout over cached widths;
- manual line materialization;
- `layoutNextLineRange(...)` / equivalent line-by-line routing where available width changes during layout;
- dynamic-layout use where text can flow around moving geometry.

Current Papers intentionally does **not** take Pretext as a live runtime dependency.

Instead, it carries a pinned extracted subset at:
`papers-pretext-0.0.9/layout.js`

Current selected-Wisdom use already relies on:
- `prepareWithSegments`
- `layoutNextLineRange`
- `materializeLineRange`

This nutrient preserves that boundary:
**reuse/extend only the small pinned text-layout physiology actually needed by Papers; do not casually reintroduce the whole upstream package as a dependency.**

## present limitation

Current Pretext-derived use is still comparatively static.

For selected Wisdom:
- one central metabolight acts as the exclusion body;
- rows are routed around a mostly static circular avoidance region;
- text is recomputed as layout, but does not yet behave like independent living tissue;
- text itself does not yet drift, bend through changing spatial constraints, reveal by scale, or participate visibly in the surrounding organism motion.

So Pretext is currently used mostly as a very capable line-break / obstacle-routing mechanism, not yet as a dimensional text-body engine.

## metabolite embodiment pressure

Once source-owned metabolite projection is trustworthy, metabolite light and metabolite text should become one scale-sensitive organismic relation.

Candidate LOD relation:

### far
- metabolight / luminous presence only;
- no readable text required.

### nearer
- native organism-owned `Compression` becomes legible;
- text may occupy a small changing spatial envelope around the light.

### closer
- metabolite title + Compression and/or invariant;
- layout can react continuously to neighboring bodies, light radius, camera scale and available negative space.

### focused / deep inquiry
- full raw metabolite body may unfold:
  minimal earning body → invariant → CREATE / COPY / CONTROL / CULTIVATE → Compression.

At no level should Display author a replacement summary.

The same text body should become progressively legible as scale earns resolution.

## dimensional text hypothesis

Text should not necessarily behave like a fixed HUD plane.

Possible earned directions to challenge later:

- text as a local 2D/2.5D tissue plane spatially anchored to a metabolight;
- line widths changing continuously as tetrahedral bodies / metabolights move through its exclusion field;
- different metabolite layers appearing/disappearing by camera scale rather than UI toggle;
- glyph/line opacity, spacing or local displacement responding subtly to metabolic motion;
- text remaining readable while its layout breathes;
- multiple nearby metabolite texts negotiating bounded readable space rather than simply overlapping;
- the previous-scale body continuing behind the text so typography participates in scale depth.

Pretext-derived arithmetic makes this plausible because prepared text can be reused while cheap layout is recomputed against changing widths.

## important design boundary

Dynamic does **not** mean illegible.

The text may move and reflow, but:
- the raw metabolite wording must remain exact;
- reading order must remain deterministic/recoverable;
- motion must settle enough for actual reading;
- no character-level animation may change token order or imply semantic recombination;
- accessibility/readability remains a constraint on the animation, not an optional afterthought.

## interaction with extreme Source scale

Making Sources much smaller is compatible with this text direction.

The knowledge a visitor first understands need not come from reading Source labels at overview distance.

Instead:
- Sources establish minimum material scale;
- Holon mass makes recursive structure perceptible;
- metabolite lights provide visible knowledge loci;
- metabolite text reveals organism-owned knowledge at the scale where it becomes legible.

This allows Sources to remain truly tiny without making Papers informationally empty.

## bounded questions for future metabolism

1. What exact screen-space scale thresholds should expose light / Compression / invariant / full metabolite?
2. Should metabolite text live in one camera-facing plane, several layered planes, or another bounded local geometry?
3. How should several metabolite texts share nearby space without becoming a dashboard?
4. How much text motion improves organismic feeling before reading cost rises?
5. Can the pinned Pretext-derived subset support the needed per-frame layout cheaply enough, or is one further small primitive required?
6. Which parts of current static selected-Wisdom layout should remain because they already work?
7. How should typography inherit future recursive Cambium splits without encoding current rank/depth assumptions?

## boundary

This nutrient authorizes no immediate renderer mutation.

It records a display.papers embodiment pressure:
- preserve extreme recursive scale;
- increase bounded organic motion;
- use the existing pinned Pretext-derived text-layout physiology more dynamically/dimensionally;
- let metabolite knowledge become progressively readable through scale;
- keep source-owned raw wording untouched.

Compression: keep Sources tiny, let Holons become mass, let bodies drift within truthful chambers, and let exact metabolite text become living spatial tissue as scale earns readability.
