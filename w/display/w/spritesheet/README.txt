SpriteSheet font reconstruction
================================

Current hosted package: @sss/spritesheet 3.0.1.

Mono source: Philipp Bartholomäus, supplied SpriteSheet-Mono-v3 TTF/WOFF2 and CSS, admitted 2026-10-20.
Glyphs: A-Z, lowercase aliases, 0-9, ÄÖÜ with lowercase aliases, space and non-breaking space.
Mono metrics: 1200 units per em; all glyphs have fixed 1200-unit advances and centred outlines.
The supplied Unicode cmap was shifted against the original sprite grid. The hosted build corrects that assignment only, with updated name/head version metadata. Glyph outlines and glyf/hmtx/hhea/maxp/post tables remain byte-identical; no glyphs were rebuilt.
Source order: AÄBCDEFGHIJKLMNOÖPQRSTUÜVWXYZ1234567890
The original complete v3 package is preserved in ../../_waste/SOURCE__SpriteSheet-Mono-v3-package__20261020.zip.
Unsupported sharp-s is presented as ss/SS; punctuation uses ordinary family fallback.

Members:
  SpriteSheet-Mono.ttf / .woff2: supplied Mono v3, package 3.0.1.
  SpriteSheet-Regular.ttf / .woff2: natural widths, original A-Z face unchanged at 1.0.1.
Regular source: SpriteSheet-font-package.zip, handed over 2026-10-01.
Superseded Mono v2/provenance: ../../_waste/spritesheet-mono-v2-20261020.carrier/.
Supplied CSS: ../../_waste/SOURCE__SpriteSheet-Mono-v3__20261020.css.

Mono TTF SHA-256: ee5ff3747cc127f8b63e3fc1f82cd443fa42592d20695c537f9f04dc8bbb7810
Mono WOFF2 SHA-256: 476ed7f3053e33c76418b3d60a0c006e507265a5ee6533863185701d98622827
