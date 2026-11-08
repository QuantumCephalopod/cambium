SpriteSheet font reconstruction
================================

Current hosted package: @sss/spritesheet 4.0.0.

Mono source: Philipp Bartholomäus, supplied SpriteSheet-Mono-v4 package, admitted 2026-11-08.
Glyphs: A-Z, a-z with distinct lowercase shapes, 0-9, ÄÖÜ/äöü, space and non-breaking space.
Mono metrics: 1200 units per em; all glyphs have fixed 1200-unit advances.
The hosted Mono TTF and WOFF2 are the supplied v4 files byte-for-byte. Individual uppercase or digit shapes may differ from the previous hosted v3; they remain the supplied v4 shapes.
Unsupported sharp-s is presented as ss/SS; punctuation uses ordinary family fallback. Explicit uppercase styling remains owned by its existing presentation.

Members:
  SpriteSheet-Mono.ttf / .woff2: supplied Mono v4, package 4.0.0.
  SpriteSheet-Regular.ttf / .woff2: natural widths, original A-Z face unchanged at 1.0.1.
Regular source: SpriteSheet-font-package.zip, handed over 2026-10-01.
The original v4 package is identified by its SHA-256 and Library source in VERSION.json.
The source v3 package and prior v2 body remain in Display _waste; v3's earlier source-grid cmap repair remains recorded in its immutable HOME.

Mono TTF SHA-256: 53a6210ec17bb0faec17f0b7a6b5d8437feea500a8fee80455054745c0daddf3
Mono WOFF2 SHA-256: ad37e39de57589a53989d13607d234e3c6efe37a77deb53b1cca598c72ee4187
