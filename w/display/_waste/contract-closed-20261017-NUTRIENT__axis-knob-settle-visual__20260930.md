# NUTRIENT — the axis knob shows its settle — 2026-09-30

status: RESIDUAL / OPEN — achieved portions catabolized 2026-10-04
kind: display encounter (from Philipp)
source: Philipp 2026-09-30 (English, verbatim): "the hold to lock works =) but i would like to fine-tune it better eg give it a visual. the knob could slowly blow up and then change to a triangle when its locked. picking it up again makes it a circle again that slowly morphs back to a triangle as soon as you keep it still =)"
target: github.cambium → display (z/world-view.js axis knob; w/root-view.css)

## surviving owner and return address

Current `z/world-view.js` knobShape/KNOB_SWELL and `w/root-view.css` and `_root/display-axis-knob-settle-visual-20260930T201201Z.json` witness the implemented mechanism. Display organism law 3.17 retains it. The remaining questions below stay open; material/geometry refinement and the Oct3 custom-body regression remain in their separate live nutrients.

## open

- how it feels by hand on the live site: the swell size, the morph curve (smoothstep), the fall-back speed are named constants, first drafts, Philipp's to judge by eye;
- "slowly": the picture can only take as long as the lock does (520 ms); a slower morph means a slower lock, which changes a gesture that works, so it is left to Philipp's word;
- the keyboard path has no latch and therefore no picture;
- touch devices were not witnessed.

The extracted preimage is at `../_waste/catabolized-NUTRIENT__axis-knob-settle-visual__20260930-20261004.md`. Reopen only if its cited owner changes, a retained question requires an extracted distinction, or a countercase defeats the witness.
