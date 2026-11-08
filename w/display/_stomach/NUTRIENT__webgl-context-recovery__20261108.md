# Restore a Display encounter after actual WebGL context loss

status: OPEN
owner: display
source_intake: Display's inactive optical target lifetime encounter, `NUTRIENT__inactive-optical-target-lifetime__20261106.md`
observed_revision: 32bbf422429eec012a4c2f3ffe93a79f9591ad6e

The prepared-return boundary in `w/wy/locus-shader.js` refuses a field whose WebGL context is lost; `x/display-runtime-v2.js` keeps the previously committed encounter and its navigation history if that preparation fails. The field owns context-local programs and buffers, and mounted sources can also hold resources in that context. The current field does not establish a complete `webglcontextlost` / `webglcontextrestored` reconstitution of those resources. Native refusal and retry witnesses do not demonstrate real context restoration. This finding does not assert that context loss occurred on Philipp's device.

Investigate actual loss and restoration for active and cached fields. Preserve the current encounter, identity, camera, navigation history and source ownership while the affected context is unavailable; rebuild each owner's context-local resources before exposing a restored frame, or leave a truthful, recoverable refusal. Do not assume that rebuilding Display's optical attachments restores a mounted source's own programs or caches.

Resolve with a real browser context-loss/restoration witness, including the prior encounter during refused return, a complete restored frame and the affected source-owned resource boundaries. Record remaining platform or owner limits at their actual scope. Close only the witnessed result through Display HOME and exact intake retirement.
