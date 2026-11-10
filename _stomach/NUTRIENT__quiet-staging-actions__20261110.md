# Open — stop fork workflow notification noise

## Source encounter

Philipp, 2026-11-10:

> Ich bekomm alle paar kinuten ne email xD... daa quantum cepha repo brauch doch keine actions?

Repeated runs created by the staging and test branches are sending failure emails. Stop automatic GitHub Actions jobs in the `QuantumCephalopod/cambium` staging carrier while preserving the canonical `self-similar-systems/cambium` build and deployment behavior. Already-running jobs and repository-wide Actions settings must be reported according to what can actually be controlled and witnessed.

## Exit

Witness that the relevant staging/test branches no longer start real workflow jobs, retain the canonical behavior, and return this bounded change through the repository root. Do not claim that repository-wide settings or already-started runs were changed unless actually observed.
