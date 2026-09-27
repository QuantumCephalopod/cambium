# ENCOUNTER — syncLiveNerve completed but no materializer run — 2026-09-26

source: Philipp screenshot from bound /papers/_feed Apps Script

Observed:
- selected function: syncLiveNerve
- execution log: Execution started
- execution log: Execution completed
- no exception shown
- canonical GitHub still shows no new papers static shadow materialization run after that execution

Boundary:
Apps Script return values are not automatically printed into the execution log. The screenshot proves successful function completion only; it does not prove LIVE_READY, LIVE_BLOCKED, or dispatch success.

Current discriminator:
Probe the dedicated Worker domain from GitHub network without credentials. Expected:
- live.sss.saarland/__live/home -> 401 when Worker route is reached
- sss.saarland/__live/home -> public-site response, not Worker
