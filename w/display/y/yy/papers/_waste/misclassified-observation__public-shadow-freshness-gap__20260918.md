# OBSERVATION — public Papers shadow freshness is unresolved

status: OPEN / UNRESOLVED
source: isolated Papers observation pass, current repo projection + live Drive Papers _feed
date: 2026-09-18
target: display.papers

## observation
The current repository public projection identifies its source snapshot as:
- event: `papers-accumulation-20260916T181233Z-adaptive-challenger-identity`
- observed: `2026-09-16T19:08:53.307Z`

The live private Drive Papers `_feed` currently identifies its latest HOME as:
- `papers-chaperone-20260918T190107Z-authorship-5al0`

Papers' receptor explicitly describes the intended transport relation:
`Drive Papers HOME → authenticated write actuator → mirrored static shadow → visitor read`.

## evidence boundary
Different HOME identities establish a freshness gap, not necessarily a semantically different public body. This pass did not diff every public-relevant field between the two source states.

## pressure
Determine whether the static public shadow is materially stale or merely older-but-equivalent. If public-relevant truth changed, reacquire the bounded source-owned projection and advance the shadow through the authenticated transport path; if not, establish a truthful freshness/equivalence witness instead of assuming drift.

## exit condition
The public shadow can state which current Drive Papers state it reflects, and any required advancement is causally witnessed without making visitor reads actuate the private source.
