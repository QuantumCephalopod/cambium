# NUTRIENT — SpriteSheet Mono v2 and the Schattenseiten HUD — 2026-10-02

status: OPEN — source admitted before implementation
kind: Display typography encounter
source: Philipp, session 33Η, with SpriteSheet-Mono-v2-package.zip
target: Display main face (@sss/spritesheet) and Schattenseiten HUD typography

## source-faithful request

> hättest du lust ins repo zu diven? <333... natürlich durch dive ritual erst <333..
>
> und dann könntest du wenn du lust hast die font updated mit der neuen version?
>
> grade schattenseiten hat sogar im HUD noch ganz alte basic font... die am besten auch ersätzen? <333 also wenn du lust hast natürlich =)

Input ZIP SHA-256: `051c6aa3eb101dbd0350bf86aef269814caf563c5896b0f4fc34e08c173c5079`.
The package contains the supplied Mono v2 TTF and WOFF2, a visual preview and an A–Z QA report. The report declares 1024 units per em, fixed 1024-unit advances, centred glyphs and lowercase aliases.

## grounded pressure

Current Display hosts @sss/spritesheet 1.0.1 at unsplit Embodiment. Mono is resolved by stable identity and used by both main font tokens. The current ritual describes 704-unit cells. Schattenseiten explicitly selects a system monospace face in its HUD; the shared minimap also draws system-monospace canvas labels.

## decided implementation boundary

Use the supplied Mono bytes without inventing glyphs or reshaping outlines. Preserve the hosted identity and existing Mono member paths; update current Mono provenance/metrics. Keep the existing A–Z/lowercase/space alphabet, umlaut folding, opt-out and per-glyph fallback. Set Schattenseiten HUD text and the shared minimap labels in the main Mono face. Preserve artwork, spelling/source projection, tetrahedral geometry, traversal, safe areas, glass and site identity. The Regular build is not replaced by a Mono-only package.

## exit

Supplied font bytes and fixed cell metrics are independently verified; the generated artifact uses Mono v2; Schattenseiten HUD and minimap labels visibly use the main face; existing build, address, type and browser witnesses pass. Record the witnessed Display HOME and leave canonical owner promotion explicit before retiring this intake.
