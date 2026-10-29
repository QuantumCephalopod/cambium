# NUTRIENT — Remove call-stack rank ceilings from build phenotype traversal

status: OPEN / audit counterexample
owner: cambium
priority: LOW / future depth
source: Philipp's current-state/self-similarity audit request, 2026-10-29; executed source inspection and bounded counterexamples
baseline: self-similar-systems/cambium@3920a0e670eb54102391a2e3da566abd34ff01cb

## Encounter and evidence

`y/build.py:63–98` implements recursive `validate_index` and `display_loci` walkers. A complete synthetic 1,100-level quartet phenotype (about 4,400 nodes) raises `RecursionError` in validation. Shared runtime folding already passes a 12,001-rank iterative witness.

## Bounded exit

Use iterative validation/traversal while preserving order, no-residue/refusal behavior and explicit organism boundaries. Exercise deep valid and malformed phenotype independently from carrier filesystem/path limits; state remaining material limits truthfully.

## Evidence boundary

No current shallow phenotype fails. The synthetic validator failure is reproduced; a 1,100-level physical directory tree was not materialized.

This is unresolved intake, not implementation authority. Apply the current shared-root and owner-local receptors before any repair. The audit's positive build, runtime and lifecycle evidence remains valid within its original scope.
