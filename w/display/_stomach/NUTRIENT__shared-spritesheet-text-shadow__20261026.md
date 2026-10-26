# NUTRIENT — Light shared shadow for SpriteSheet text

status: OPEN / ADMITTED — implementation and actual-raster witness pending
owner: display
source: Philipp, 2026-10-26 (Europe/Berlin), direct owner correction with screenshot grafik(20261026-205342).png
baseline: f3928c83f16fcaa10905e5307b40be9cf5c8eab4

## Owner observation — verbatim

> und n2 wäre eine klare invariant was den text angeht. diese font braucht nen leichten schlagschatten damit sie gut lesbar ist =)

## Admitted target invariant

SpriteSheet text carries a light contrasting drop shadow as shared Display reading support, including DOM labels, derived glyph atlases and source-owned Canvas/WebGL text. The same authored text retains comparable support when crossing a representation or entering the drop. Keep the shadow light and subordinate to the glyph; no large luminous halo, opaque panel or per-site workaround.

## Ownership and implementation pressure

Display owns the reusable type/material default and rank/root-rem relation. Text owners keep wording, layout, continuation, source authority and type overrides. CSS alone cannot close this for Canvas/WebGL text. Reuse the existing computed-shadow/atlas pathway where present; review source-owned text consumers for equivalent support. One site's existing text-shadow does not prove the shared invariant.

## Exit witness

- Real SpriteSheet glyphs over dark, light and busy backgrounds, wide/narrow viewports and multiple pixel densities, inside/outside liquid.
- Compare DOM and derived Canvas/GPU representations with actual wording/font.
- Small shadow improves contrast without swallowing glyph features, clipping, becoming a halo or accumulating duplicate paint.
- Record implementation/witness in owner HOME, derive feed separately, and retire this same intake only after its outcome is earned.
