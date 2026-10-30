# NUTRIENT — Protect living anatomy from artifact replacement

status: OPEN / audit counterexample
owner: cambium
priority: HIGH
source: Philipp's current-state/self-similarity audit request, 2026-10-29; executed source inspection and bounded counterexamples
baseline: self-similar-systems/cambium@3920a0e670eb54102391a2e3da566abd34ff01cb

## Encounter and evidence

`y/build.py:635–641` and `y/site-public.py:63–69` duplicate the same writer guard. Only the exact repository root and Display root are refused. Both accept `ROOT / 'y'`, then call `shutil.rmtree(target)` before source/artifact validation.

Safe executed witness: replace each module's `shutil.rmtree` with a recorder that raises before mutation, then call `write_artifact(ROOT / 'y')`. Both writers attempted removal of the living `y` directory. No deletion was performed.

## Bounded exit

Earn one shared ancestry-aware destination/replacement operation. Refuse source files/directories, relevant ancestors and symlink-resolved equivalents before destructive work; retain ordinary disposable `_site` and separate external artifact destinations. Acquire/validate the new artifact before replacing a prior valid artifact. Witness both writers through their actual call paths.

## Evidence boundary

The normal CI `_site` path passed. This is a destructive CLI/API destination counterexample, not an observed loss of repository data or a failed current deployment.

This is unresolved intake, not implementation authority. Apply the current shared-root and owner-local receptors before any repair. The audit's positive build, runtime and lifecycle evidence remains valid within its original scope.
