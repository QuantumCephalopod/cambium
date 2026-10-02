SpriteSheet font reconstruction
================================

Source mapping: 6 columns x 5 rows, read left-to-right / top-to-bottom.
Rows: A-F / G-L / M-R / S-X / Y-Z.
Glyphs included: A-Z, lowercase a-z aliases, space.
No numerals or punctuation were invented because they are not present in the supplied artwork.
Builds:
  SpriteSheet-Regular.ttf / .woff2 (natural widths; unchanged 1.0.1)
  SpriteSheet-Mono.ttf / .woff2 (supplied Mono v2, 2.0.0; fixed 1024-unit advances)

Current hosted package: @sss/spritesheet 2.0.0.
Mono source: Philipp Bartholomäus, SpriteSheet-Mono-v2-package.zip, handed over 2026-10-02 (session 33Η).
Mono metrics: 1024 units per em; A-Z centred in fixed 1024-unit cells; lowercase aliases.
The supplied Mono bytes are hosted unchanged; no outlines or glyphs were rebuilt.
Regular source: SpriteSheet-font-package.zip, handed over 2026-10-01; existing 1.0.1 bytes retained.
Mono TTF SHA-256: 7f8e7c9368d935dcbc6e6d9cb5d91668b9505f9738a6f0ac360f222f4c3ca5df
Mono WOFF2 SHA-256: 15cbc02ad7315f4caa27e867b468573c2f2b854402425f4beb0a79cc6426b9b7
