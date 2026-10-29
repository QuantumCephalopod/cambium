# NUTRIENT — Enforce the declared public symlink refusal

status: OPEN / audit counterexample
owner: cambium
priority: LOW
source: Philipp's current-state/self-similarity audit request, 2026-10-29; executed source inspection and bounded counterexamples
baseline: self-similar-systems/cambium@3920a0e670eb54102391a2e3da566abd34ff01cb

## Encounter and evidence

`y/site-public.py:33–37` checks `source.is_dir()` before `source.is_symlink()`. An unrelated temporary public fixture with a link to an outside directory is silently skipped and returns `{}` instead of refusing the invalid carrier.

## Bounded exit

Apply the existing symlink refusal before directory skipping. Witness file links, directory links, broken links and ordinary nested directories without reading or publishing foreign bytes.

## Evidence boundary

No foreign data was exposed in the witness. This is a refusal-contract gap, separate from artifact destination safety.

This is unresolved intake, not implementation authority. Apply the current shared-root and owner-local receptors before any repair. The audit's positive build, runtime and lifecycle evidence remains valid within its original scope.
