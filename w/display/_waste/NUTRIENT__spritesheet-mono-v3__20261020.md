# NUTRIENT — Supplied Mono v3, numerals and umlauts — 2026-10-20

status: OPEN / admitted before implementation
owner: display
source: Philipp, 2026-10-20; SpriteSheet-Mono-v3.css plus its supplied TTF/WOFF2

> Oh und die font können wir mit der neuen version updaten! Gibt jetzt auch zahlen und umlaute :D

Use the supplied Mono under the existing @sss/spritesheet identity and member paths. The CSS confirms the same SpriteSheet Mono family. v3 supplies digits and Ä/Ö/Ü with lowercase aliases; it does not supply ß/ẞ. Independent source readback gives 1200 units per em and one centred 1200-unit advance cell.

Preserve supported umlauts at the presentation boundary, including normalized decomposed spelling; retain ss/SS for unsupported sharp-s and ordinary fallback for punctuation. Keep source identities and authored wording, Regular, the shared rem/rank scale, local site layout and the liquid instrument owned as before. Do not reverse authored ae/oe/ue blindly.

The actual raster probe exposed shifted Unicode assignment in the supplied package. Its original image physically orders A/Ä, O/Ö, U/Ü together and zero after9. Correct only cmap and name/head version metadata against those source cells; preserve glyf/hmtx/hhea/maxp/post byte-for-byte and archive the original complete package source-exact.

Witness original source and corrected hosted hashes, all39 source glyph assignments, glyph coverage and fixed-centred metrics; real-font rasterization and existing Canvas/Pretext/liquid consumers at narrow/wide carriers; type-fold regression, complete public build and exact artifact bytes. Update current package/receptor provenance and the superseded font-dependent portion of the language nutrient. Proper-name/localization work remains its own open residual. Return Display HOME before a separate feed projection; retire this original admission unchanged only after its bounded exit passes.
