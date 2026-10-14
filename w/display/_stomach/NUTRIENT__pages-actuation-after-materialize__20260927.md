# NUTRIENT — Pages deploy does not follow a materializer commit — 2026-09-27

status: NARROWED / IMPLEMENTATION STAGED — LIVE AUTOMATIC EDGE STILL OPEN
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
