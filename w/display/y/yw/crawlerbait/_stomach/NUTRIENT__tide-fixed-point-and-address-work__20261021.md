# NUTRIENT — Tide fixed point and generation-local address work

status: OPEN / admitted for bounded implementation
owner: crawlerbait
source: Philipp's authorized performance audit and implementation request, 2026-10-21 Europe/Berlin
baseline: abb9f01290e9427b527ceb0380c7b054d2539032

The audit at7c8b1e889535aa6a1084221930a208d145c28f97 found two avoidable Tide costs. Capture and the owned-path migration alternate `path_privacy.scheme` wording for the same state; the next migration then dirties the cursor and triggers a full pre-acquisition rebuild. Run39502400476 spent493 seconds in that step despite zero migrated capture/checkpoint paths. An isolated production-writer fixture reproduces the cursor-only change.

`bait_addresses` scans the full path population for each shortest unique prefix. Measurements on that frozen generation:1000 paths0.529s;4000 paths7.893s;13336 paths107.392s. `write_outputs` indirectly computes the same address map three times from one unchanged state.

Small exit: one source-owned cursor description across actual writers; independent full-cycle idempotence and real migration/refusal evidence; iterative prefix-group differentiation with unchanged shortest addresses, deterministic ordering, lazy identity-stream extension and no depth cap; one generation-local map/projection through output consumers. Witness full real-body/public byte equality, meaningful operation/scaling evidence and exact staging CI. Preserve Bait folders, paths, Being identity, encounter truth, source/privacy and publication boundaries. No dataset pruning, presentation payload, Display lookup or global publication optimization is part of this bite.
