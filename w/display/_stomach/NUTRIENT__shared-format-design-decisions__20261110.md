# Open — shared-format design decisions

## Origin

Philipp asks for a plan for one invariant, self-similar format across Display. The bounded source audit is `../_root/display-format-audit-witness-20261109.json`; the proposed, unadopted plan is `../_root/display-fractal-format-plan-witness-20261110.json`.

## Remaining decisions

The proposal does not select new cell assignments or establish a new global rule. Before an implementation can truthfully claim the stronger invariant, the relevant authored assignments and intentional open/layered areas must be established; the existing audit discrepancy remains open.

The common reference for type needs a deliberate decision: keeping the current browser-rem origin preserves its independent scaling, whereas deriving a reference unit from a selected grid cell ties it to the screen format. A global overflow policy must likewise be stated instead of allowing measured content to silently resize fields. Preserve the distinction between screen formatting and existing tetrahedral world geometry unless their relationship is explicitly resolved.

Any implementation requires its own source-grounded act and browser witness. The present plan changes no site behavior.
