# NUTRIENT — Papers local body visually collapsed / recursive scale suspect

status: OPEN / UNRESOLVED
kind: user visual encounter + implementation diagnosis request
admitted_at: 2026-09-20
target: github.cambium → display.papers
source: user-supplied browser screenshot + explicit observation in chat

## source-faithful encounter

The supplied production screenshot shows the Papers local view with the visible tetrahedral population occupying only a small, dim region of the available viewport. The user reports that:
- Papers is "basically invisible";
- its tetrahedral body appears materially smaller than the bodies of the other site-holons;
- the previously earned scale rule — Source `S.*` is the smallest entity/primitive and higher `nH` bodies are built recursively from it — does not appear to be actually adapted by the current view.

## unresolved question

Determine whether the current production/staging Papers renderer actually implements the local scale law:
- fixed `S.*` quantum;
- rank `nH` intrinsic linear scale `2^n` relative to `S`;
- recursive parent/ancestor geometry revealed from that same scale relation rather than independent packed points;
- root/local framing large enough that Papers inhabits the same encounter scale class as other site-holons.

Distinguish:
1. global Display framing/camera scale;
2. Papers-local root packing / bounding radius;
3. per-specimen intrinsic scale;
4. rank-recursive scale;
5. shader/light visibility.

Do not treat darkness alone as the explanation if geometry itself is underscaled.

## boundary

This nutrient requests diagnosis first. It does not yet authorize a guessed visual retune or arbitrary multiplier. Compare current code and actual site-holon scale contracts, then identify the smallest violated relation before mutation.


## diagnostic pass — 2026-09-20 · scale relation located

### PASS / EARNED — root body is underscaled relative to the shared site-holon field

The Papers custom renderer hides the generic shared field surface and draws its own full-screen WebGL stage. CSS is not shrinking the canvas: `.papers-sierpinski-stage` is absolute `inset:0; width:100%; height:100%`.

The scale mismatch is inside the renderer.

Generic Display field rendering uses the same camera depth and essentially the same FOV as Papers, but applies a root model scale of approximately `1.75 * target.scale`.

Papers instead draws its custom outer Sierpiński shell at intrinsic overall scale `1.0`:
- each corner cell is centered at `V0[i] * .5`;
- each corner tetrahedron has `scale: .5`;
- together they reconstruct one canonical tetrahedron of overall linear scale 1.

At root view, with the same `camZ = 3.2` / `FAR_Z = 3.2` and same FOV family, Papers therefore occupies only about `1 / 1.75 = 57%` of the generic site-holon linear encounter scale before any shader-opacity effect.

This directly explains why the Papers tetrahedral field appears materially smaller than the other site-holons.

### PASS / EARNED — the S-quantum recursive rank law is implemented only after selection, not in the overview population

The local receptor already contains the intended rule:
- `S` is the minimum Papers organism quantum;
- rank `nH` has linear scale `2^n` in S-units.

The renderer contains the matching intrinsic function:

`bodyScaleFor(entity) = S_QUANTUM_SCALE * 2^rank`

with `S_QUANTUM_SCALE = .0045`.

But this intrinsic scale is used only when an organism is opened/selected.

In the overview field, every Source and every Holon is instead rendered through one fixed proxy:

`NODE_SCALE = .032`

`populationInstances(...) → scale: NODE_SCALE`

Rank affects only the tiny glow size/intensity there, not the tetrahedral body scale.

So the overview collapses the intended scale ratios completely:
- `S`: intrinsic .0045
- `1H`: .009
- `2H`: .018
- `3H`: .036
- `4H`: .072
- `5H`: .144

but every overview body is .032.

The intended `S → 5H` linear ratio is 32×; the current overview renders it as 1×.

This is not merely a shader problem. The recursive scale law is genuinely absent from the overview embodiment.

### CONDITIONAL / CURRENTLY CORRECT — selected-body recursion exists

Once an organism is selected, the renderer does use the earned recursive geometry:
- selected rank uses `bodyScaleFor(...)`;
- its four direct parents occupy the four tetrahedral corners at half the parent's linear scale;
- recursive descent repeats the same half-scale relation;
- `collectBody(...)` reveals the true ancestry until source ground / LOD cutoff.

So the recursive law is not missing everywhere. It is currently confined to inquiry mode.

### CHALLENGE — selected camera also hides absolute rank scale perceptually

The selected camera is chosen approximately as:

`cameraZ = bodyScale / MACRO_FILL`

so larger intrinsic ranks are moved proportionally farther from the camera.

This preserves internal geometry but makes opened organisms fill roughly the same screen fraction. Therefore absolute rank size is deliberately normalized away in macro inquiry.

That can remain a lawful inquiry-camera choice, but it means the overview is the only place where the cross-rank size relation could currently be perceived — and the overview is exactly where fixed `NODE_SCALE` erases it.

### PASS / SEPARATE WOUND — screenshot is also showing an older static population

The screenshot says `154 tetrahedral organisms`.

That exactly matches the current committed static Papers shadow:
- 95 Sources
- 59 Holons
- total 154

The newer Drive Papers source body witnessed during the live-circulation work contains:
- 102 Sources
- 65 Holons
- total 167

Therefore the screenshot is using the static `papers-shadow/current.json` population rather than the newer source body.

This is a freshness/circulation wound, separate from the scale bug. Fixing scale alone will not update the population count.

### visibility amplifier, not primary cause

Papers further suppresses itself visually:
- outer shell alpha ≈ .045;
- overview Source tetra alpha ≈ .12;
- overview Holon tetra alpha ≈ .175;
- Source field lights ≈ .10 alpha.

These values compound the invisibility, but they do not explain the smaller geometry. The root-scale mismatch and fixed-rank proxy are upstream causes.

### smallest violated relations

1. **site-holon encounter scale:** Papers bypasses the generic field and fails to inherit/reproduce the generic root framing scale;
2. **Papers overview embodiment:** all ranks collapse to one fixed tetrahedral proxy instead of preserving S-anchored recursive size through lawful LOD;
3. **freshness:** the current browser population is still the 154-organism static shadow.

### repair pressure — still OPEN

Do not patch opacity first.

A lawful repair should first decide and witness:
- one Papers-local root field scale aligned with the shared site-holon encounter scale;
- a rank-aware overview LOD in which `S` remains the minimum quantum and `nH` derives from `2^n` scale rather than fixed `NODE_SCALE`;
- whether distant high-rank bodies render as scaled collapsed tetrahedra or bounded recursive shells, while preserving GPU-visible-resolution cost;
- whether macro inquiry may keep camera normalization as an inspection affordance without erasing the overview's cross-rank scale truth.

The static-shadow freshness wound remains independent.


## repair pass — 2026-09-20 · recursive overview scale materialized

### ACT / EARNED

The diagnosed scale relation has now been materialized in the Papers renderer without opacity retuning.

#### shared encounter scale restored
The custom Papers root field now uses the same viewport-dependent root scale family as the generic Display field:
- desktop: 1.75
- narrow/mobile: 1.42

The four outer Sierpiński corner bodies are translated and scaled by that same root factor, so Papers no longer enters the local view as a 1.0-scale body beside generic ~1.75-scale site-holons.

#### fixed overview NODE_SCALE removed
The uniform `NODE_SCALE=.032` proxy has been removed.

Overview intrinsic scale is now:

`overview_scale(entity) = root_field_scale × S_QUANTUM_SCALE × 2^rank`

with `S_QUANTUM_SCALE=.0045`.

Therefore Source remains the minimum quantum and each higher Holon rank carries the already-earned 2× linear / 4× quantum-count recurrence.

#### overview itself now uses recursive genealogical LOD
The overview no longer draws one unrelated same-size tetrahedron for every identity.

For every visible Papers organism it now invokes the existing `collectBody(...)` recursion at that organism's truthful overview scale:
- if projected size is below LOD threshold, one collapsed tetrahedral proxy is drawn;
- if projected size earns more resolution, the body resolves into its actual four parents at half scale;
- that recursion continues only while screen resolution earns it, bounded by the existing LOD/depth law;
- Source ground terminates recursion.

Thus the same recursive body law now governs both overview and inquiry; selection no longer switches from a flat point population into a different morphology.

#### transition/hit relation repaired with the same geometry
Overview centers are scaled with the root field.
Hit radius is derived from projected intrinsic body size with bounded minimum/maximum reach.
Opening a body now starts from the exact scaled overview center and overview body scale, so the selected body's transition does not jump from an unrelated proxy geometry.

#### macro inquiry intentionally conserved
The selected-body camera still scales proportionally with body scale.

This keeps macro inquiry readable and preserves the already-working recursive parent geometry. The overview now carries cross-rank absolute scale truth; macro inquiry remains a normalized inspection affordance.

### WITNESS
Exact staged implementation:
- `w/display/y/yy/papers/sierpinski.js`
- `y/check.py` now permanently rejects return of fixed `NODE_SCALE` overview physiology and requires shared root-scale + S-anchored recursive overview LOD.

Provider witness:
- workflow: `display membrane`
- run: `35475404443`
- head: `7db1e23c20f199645c59b3d75e66f4c0814e791f`
- build: SUCCESS
- persistent Display membrane build: SUCCESS
- tree-addressed organism witness: SUCCESS
- address algebra: SUCCESS
- tetrahedral closure: SUCCESS
- exact membrane-byte verification: SUCCESS
- staging artifact upload: SUCCESS

### conserved boundaries
- no opacity/material tuning;
- no Papers receptor semantic change;
- no source/Holon identity or genealogy mutation;
- no macro camera-law change;
- no Drive source-body mutation;
- no public-shadow freshness mutation.

### still OPEN
A real browser image of the repaired artifact remains necessary to close the perceptual acceptance of this nutrient.

The independent live-shadow freshness wound also remains: the currently committed static shadow is still the older 154-organism body and is not repaired by this scale act.
