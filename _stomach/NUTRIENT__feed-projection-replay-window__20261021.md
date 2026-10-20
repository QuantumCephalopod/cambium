---
kind: bounded-replay-countercase
status: OPEN
source: "Cross-substrate feed equivalence audit, 2026-10-21"
owner: cambium
affected_substrate: github-actions
---

# Repository source-owned feed replay boundary

This is a witnessed mechanical countercase, NOT a claim that the current published repository feed is broken. The active self-presentation projectors for all eight current Main organisms were read back with the matching local HOME event on 2026-10-21.

## Exact currently observed mechanism

- `y/feed.py` projects newly added local `_root/*.json` HOME events found exclusively in a specified Git revision difference (`changed_home_paths(before,after)`).
- `.github/workflows/pages.yml` runs it on canonical Main push and retries the projection commit up to three times before failing.
- `y/pages-actuation.py` selects publish=true for ordinary push; that is not the missing edge.

## Controlled failure replay

1. An organism's new HOME is durably committed to Main.
2. The downstream Pages projection step fails all bounded attempts before publishing the new `current.json` commit.
3. A later unrelated Main commit has no added local HOME in its own before/after difference.
4. Under the current projector's explicit filter, step 3 sees no new HOME and leaves the earlier source-owned `current.json` stale.
5. A separate explicit rerun of the original event window could recover; no ordinary subsequent non-HOME-push catch-up is established by this source flow.

This countercase was reproduced with a temporary local Git repository using the same added-file difference primitive: the original diff contained `_root/new.json`; the subsequent unrelated diff did not, while the feed still reflected the older event.

## What needs earning

Find the smallest lawful event-/owner-bounded retry or reconciliation path that can recover from an already-durable HOME's failed feed projection without manufacturing a new semantic HOME, scanning unrelated organism histories, creating a polling pump, or altering publication/Worker transport. Preserve the existing three-attempt bounded checkout/push-recompute protocol and exact owner/source identities.

Acceptance: after injected projection persistence failure, a later lawful retry can make exactly the affected owner feed reflect its already-durable latest HOME; non-HOME changes alone never make an unrelated organism mutate or create fake HOME. Failures remain observable until closure. Do not edit `y/feed.py` solely from this audit without the owner-local countercase and native test.
