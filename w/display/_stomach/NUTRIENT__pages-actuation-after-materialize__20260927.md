# NUTRIENT — Pages deploy does not follow a materializer commit — 2026-09-27

status: CANONICAL IMPLEMENTATION + AUTOMATIC NO-CHANGE WITNESSED / CHANGED-SHADOW → DEPLOY → VISITOR EDGE OPEN
kind: display publication-membrane mechanics
source: Papers digest 2026-09-27 (closure of the Papers public-shadow circulation nutrient)
target: github.cambium → display (Pages pump)

## witnessed

On 2026-09-27 the Papers live chain ran end-to-end for real: `/papers/_feed` HOME → `LIVE_READY` →
Worker-dispatched `papers static shadow materialization` (runs 09:32–09:36Z, SUCCESS) → canonical
commits `papers shadow: materialize sha256:…` → visitor read of `/papers-shadow/current.json`.
The one edge that did not actuate: the `display membrane` Pages workflow does not run after those
commits; the visitor surface advanced only after Philipp dispatched Pages by hand.

## mechanism and staged continuation — 2026-10-01

GitHub's current documentation confirms that commits pushed with `GITHUB_TOKEN` do not trigger
the ordinary push workflow. Source: https://docs.github.com/en/actions/concepts/security/github_token.

The `staging/display-pages-actuation` branch adds a completion wake to the existing Pages workflow.
Only successful canonical-main materializer dispatches qualify. `y/pages-actuation.py` compares
the event's committed shadow with current main and with the last successful Pages deployment:
unchanged/replayed publication stops, superseded source coalesces, and committed-but-unpublished
state remains eligible after an interrupted tail is retried. No additional credential is introduced.

Seventeen tests witness replay, no-change, source advancement, retry, foreign/failed source rejection,
and unavailable-baseline failure. The existing materializer regression witness passes. The real
materializer event fields match the guard; the last successful Pages deployment and current main
currently carry the identical shadow blob `e41a9d95601ce47adbe064f5bb77a42d45d76c1c`, so this state
would correctly require no catch-up deployment.

These are implementation and source witnesses. Canonical activation and the first automatic
materializer → Pages → visitor result remain unwitnessed; this carrier stays in `_stomach`.

## exit

A materializer commit on canonical `main` is followed by exactly one Pages deploy of that tree with
no human dispatch; superseded materializations may coalesce; visitor reads stay static.

## Current source and provider reconciliation — 2026-10-17

The completion wake and bounded publication-pressure guard are canonical through PR #145 (`93ce4c1b5`) and remain in current `.github/workflows/pages.yml` / `y/pages-actuation.py`. Automatic source-event reception is independently witnessed: materializer run 38652613873 completed successfully, then Pages run [38652674001](https://github.com/self-similar-systems/cambium/actions/runs/38652674001) was created with event `workflow_run` on 2026-10-14T23:12:50Z. The guard job succeeded; build/publication steps and the deploy job were skipped. This is a truthful no-change wake, not a deploy witness.

Release the stale “canonical activation unwitnessed” claim. Keep the actual exit open: a changed committed shadow must earn automatic publication, the deployed artifact must contain that revision, and the visitor must read it without human dispatch. Existing workflow success, unrelated Tide-triggered deployment and unchanged-shadow skips cannot prove that edge. Original implementation HOME `display-pages-actuation-staged-20260930T235929Z` remains immutable.
