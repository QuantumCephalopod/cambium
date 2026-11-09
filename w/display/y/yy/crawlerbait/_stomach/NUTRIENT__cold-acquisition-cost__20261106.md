# Cold entry and initial source storage

status: OPEN
owner: crawlerbait
source_intake: https://github.com/QuantumCephalopod/cambium/blob/5be32202af99f0146a7f882bf3bafa3c40d45b89/_stomach/NUTRIENT__visitor-runtime-performance-audit__20261106.md
source_revision: d84196fe4486ee1db5b84687ce3416409ee98984

Philipp reports severe page lag and asks for an optimization check, including shared invariant work. The audit identifies this source-owned cold-entry cost separately from steady animation and the already cached warm revisit.

At this revision the detailed feed contains 16,342 Baits, 6,301 Beings and 57,436 encounters in 24,349,517 decoded bytes. Display correctly defers it until entry; the overview receives a 260-byte preview. The actual sender/receiver carries 112,751 records in 2,482 acknowledged batches with one batch in flight. A Node 24 structured-clone/microtask-ACK probe took 490.8 ms, excluding network and real Worker scheduling; exact source equality passed. Owner preparation took 258.8 ms with 47 yields and a largest uninterrupted slice of 24.7 ms. The 72.2 MB pre-collection heap delta is not retained memory. Same-generation preparation reused its result in 0.006 ms.

A separate small opportunity exists before entry: evaluating `z/render.js` allocates `SIM.sPos` and `FOCUS_SPLATS` at 90,000 × 7 floats each, totaling 5,040,000 bytes. Demand-owned allocation could remove this initial cost while preserving eventual capacity and output.

First resolve the eager buffer lifetime and identify the largest atomic normalization/sort/preparation steps. Trace acknowledged transport separately; a Display transport change requires its own bounded owner offer. Preserve the complete public source, chronology, reverse replay, generation renewal and independent visits/Being meanings. Share a derived fact only where all actual consumers require the same generation and operation. A rank-relative source proposal must bound consumed work and preserve exact temporal/refinement queries; a large hidden preprocessing/index pass does not earn a bounded-work claim.

Witness cold entry, warm revisit and steady animation separately, including preview/full separation, cancellation/late completion, exact source and replay equality. Current evidence does not establish that this cold path causes lag in settled Philosophy. The frozen Display audit HOME and its acquisition probe retain the measurements; reacquire production code at this revision via `z/render.js` and Display's `x/feed-acquisition.js`. Return completed work through this owner's HOME/clearance/feed, leaving only a named functional remainder unresolved.
