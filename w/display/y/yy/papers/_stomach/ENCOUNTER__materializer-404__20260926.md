# ENCOUNTER — materializer probe 404 — 2026-09-26

source: Philipp screenshot of canonical GitHub Actions run

Observed:
- workflow: papers static shadow materialization
- setup: success
- checkout: success
- coalescing: success
- Fetch current accepted Papers state: failure
- curl exit 22
- HTTP status: 404

Meaning:
The GitHub materializer ran, but its state-fetch request did not reach the admitted Worker membrane. The worker would return 401 on that path if the request reached it without valid authorization.

Staged repair:
Use dedicated authenticated Worker transport host live.sss.saarland while keeping sss.saarland as the public GitHub Pages surface.

Exit:
Witness the materializer reading current private state through live.sss.saarland and advancing the same-origin static shadow.
