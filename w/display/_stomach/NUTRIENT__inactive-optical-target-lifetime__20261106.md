# Retire inactive optical attachments while preserving encounter continuity

status: OPEN
owner: display
source_intake: https://github.com/QuantumCephalopod/cambium/blob/5be32202af99f0146a7f882bf3bafa3c40d45b89/_stomach/NUTRIENT__visitor-runtime-performance-audit__20261106.md
source_revision: d84196fe4486ee1db5b84687ce3416409ee98984

The audit of Philipp's lag report found persistent full-surface graphics storage. `w/wy/locus-shader.js` allocates scene targets at line 641 and preview/foreground targets at lines 583/618. Hidden handling at line 761 stops GL drawing but does not delete those targets; `x/display-runtime-v2.js:132–149` retains the field across visits.

The production native transport at 1280×800 CSS pixels and DPR 1.5 records a 1920×1200 buffer, multisampled color/depth and resolved color. Sixty hidden frames issue zero GL calls and zero target deletions. Scene storage is nominally 70.31 MiB with packed 24-bit depth, or 79.10 MiB if depth occupies 32 bits. With preview and foreground allocated, the respective totals are 101.07 MiB and 114.26 MiB per retained field. These are format-based allocation estimates, excluding default framebuffer/driver overhead; actual device memory and lag attribution remain unmeasured.

Trace the true deactivation boundary, including the prior encounter held during preparation/refusal, split encounters and prepared return. Release disposable optical attachments when their field is genuinely inactive; retain semantic source, identity, camera and child-owned state. Recreate the required targets and a complete frame before exposure on return. Distinct WebGL contexts cannot share the same target objects merely because their allocation law is common.

Witness repeated visits and an allocation plateau, resize/context-loss, return readiness, cancellation/refusal restoring the prior scene, transparent/depth state and actual pixel equivalence. Preserve the chosen resolution, antialiasing and optical appearance. Revoke release if the encounter exposes incomplete content or loses continuity. Exact preimage is this revision and the named renderer/runtime paths; the audit HOME carries the allocation probe. Close only the bounded implemented portion through Display HOME/clearance/feed.
