# Encounter: actual empty contact in the mobile browser witness

Status: OPEN. Owner: Cambium. Source: staging run 42547449809, 2026-11-09.

The WebGL navigation browser witness assumed that screen point `(20, 400)` was always uncovered. In the actual moving overview the newly readable native body labels can occupy that point, so the hardcoded precondition failed even though the mobile reading, orientation, membrane, bounded-layout and docked-glass checks passed. Choose and witness a genuinely empty field contact from the actual current surface and hit relation, not a fixed coordinate. Preserve the single-touch-inert and real double-touch return assertions for both Philosophy and Papers and both browser backends.
