# Privacy cleanup publication test regression — 2026-10-17

Source: Philipp, current work chat, 17 October 2026. Canonical source: a5626a8400e299d0225436441746693804c50e9c (PR #188).

## Encounter and bounded ask

Philipp reports a failed redeploy after a separate privacy addendum merge. The supplied traceback ends in render.test.cjs: assert(en.includes('Until GitHub confirms this cleanup')). He asks to fix the failure. Current DE/EN notices and projection describe the GitHub Support cleanup as completed; the old pending-status test is stale.

Repair the owner-local test against the current publication source. Retain full translation structure, external/contact references, retention wording, language switching and meaningful provider-status/date continuity. Preserve the merged notice bytes. Reproduce the old failure, run the focused test and complete publication checks, then append local HOME and refresh the feed separately.

Exit: corrected source test and validation are witnessed and durable in local HOME; spent intake may then move to _waste. Canonical merge and redeploy remain owner promotion.
