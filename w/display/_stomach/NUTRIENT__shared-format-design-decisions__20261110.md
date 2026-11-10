# Open — shared-format design decisions

## Origin

Philipp asked for a plan for one invariant, self-similar format across Display. The bounded source audit is `../_root/display-format-audit-witness-20261109.json`; the provisional plan is `../_root/display-fractal-format-plan-witness-20261110.json`.

## Decided direction

On 2026-11-10 Philipp explicitly chose to bind the typographic origin to a grid cell so that type scales with the display format. This is an accepted design direction; the live runtime and receptor still use `1rem`, and have not yet been changed. The exact encounter is preserved in `../_waste/NUTRIENT__grid-derived-type-origin__20261110.md`; the bounded follow-up is `../_root/display-grid-type-decision-witness-20261110.json`.

## Remaining decisions

The exact grid reference, typographic ranks assigned to actual roles, and treatment of user-controlled enlargement are not specified. A change in reference depth is numerically interchangeable with a uniform two-step shift in all font ranks, so these choices must be considered together rather than presented as separate independent invariants. Relative scaling alone does not determine readable absolute sizes.

The plan does not select new screen cell assignments. Before an implementation can truthfully claim the stronger invariant, establish the relevant authored assignments and intentional open/layered areas; the existing audit discrepancy remains open. State a global overflow policy instead of allowing measured content silently to resize fields. Preserve the distinction between screen formatting and existing tetrahedral world geometry unless their relationship is explicitly resolved.

Any implementation requires its own source-grounded act and browser witness. The present decision changes no site behavior.
