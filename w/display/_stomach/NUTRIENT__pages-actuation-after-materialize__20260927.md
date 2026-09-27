# NUTRIENT — Pages deploy does not follow a materializer commit — 2026-09-27

status: OPEN / CIRCULATION RESIDUE
kind: display publication-membrane mechanics
source: Papers digest 2026-09-27 (closure of the Papers public-shadow circulation nutrient)
target: github.cambium → display (Pages pump)

## witnessed

On 2026-09-27 the Papers live chain ran end-to-end for real: `/papers/_feed` HOME → `LIVE_READY` →
Worker-dispatched `papers static shadow materialization` (runs 09:32–09:36Z, SUCCESS) → canonical
commits `papers shadow: materialize sha256:…` → visitor read of `/papers-shadow/current.json`.
The one edge that did not actuate: the `display membrane` Pages workflow does not run after those
commits; the visitor surface advanced only after Philipp dispatched Pages by hand.

## likely mechanism (inference until witnessed)

Commits pushed by a workflow using the repository `GITHUB_TOKEN` do not trigger `push` workflows.
A `workflow_run` trigger on the materializer's successful completion (or an explicit dispatch step
from the materializer) would close the edge without new credentials.

## exit

A materializer commit on canonical `main` is followed by exactly one Pages deploy of that tree with
no human dispatch; superseded materializations may coalesce; visitor reads stay static.
