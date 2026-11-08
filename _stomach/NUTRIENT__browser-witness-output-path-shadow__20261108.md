# Browser witness output-path shadowing

status: OPEN
owner: cambium
source: implementation review of y/test-membrane-grid.py after the explicit-ascent HOME, 2026-11-08
source_revision: cae81a93927e176204ee02599ee61e64e6c139cc

The staging browser witness stores parsed command-line options in `a`, then reuses `a` for measured rectangle dictionaries. Its screenshot and final result writes later access `a.out`, so the browser run can fail even when the observed interface passes. Correct the witness without changing product behavior, verify its output path remains the parsed argument, and return the separately discovered counterexample through Display and cambium HOME. Earlier HOME evidence remains bounded and unchanged.
