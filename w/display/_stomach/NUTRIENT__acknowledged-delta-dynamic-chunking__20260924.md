# NUTRIENT — acknowledged delta with dynamic recursive chunking — 2026-09-24

status: OPEN / GENERIC DISPLAY CONTINUITY PRESSURE
kind: display-live transport encounter
target: github.cambium → display.x/live
source: Philipp, 2026-09-24

## pressure

Public organism state is monotonic in potential size. The live transport must therefore never depend on resending one complete snapshot as ordinary growth physiology.

Current acknowledged-base delta is the correct invariant:
- source owns a keyed public unit map;
- Worker stores the current materialized map and deterministic public revision;
- ordinary circulation sends only unit revisions/values that differ from the last acknowledged base.

Observed failure:
- after source-side projector evolution, the Apps Script lost a trustworthy local ACK ledger;
- its recovery path attempted one complete reconcile;
- current Papers public state exceeded the 1 MiB request bound;
- a synthetic baseline that suppressed only newly exposed Source Inquiry was insufficient because the actual Worker state was older in additional units.

## earned direction

1. Worker exposes an authenticated **revision ledger only**: current public revision + key→unit-revision hashes, never a second semantic projection and never full values.
2. A producer with absent/corrupt local ACK state reacquires that remote revision ledger and resumes from the actual Worker baseline.
3. Source derives only the delta between remote ACK ledger and current source-owned state.
4. If that delta fits the request bound, send it unchanged.
5. If too large, subdivide the same delta deterministically into smaller ordinary deltas.
6. Each chunk computes an intermediate public revision from the acknowledged ledger plus that chunk, is conditionally applied by the existing Worker delta path, and is ACKed before the next chunk.
7. Chunking adds no new semantic protocol: **a chunk is recursively the same delta law at smaller transport scale**.
8. A single public unit larger than the packet bound is an explicit unit-granularity wound; do not silently split semantic unit values.
9. First-ever empty Worker state may use the deterministic empty-ledger public revision as delta base so even a huge first publication can grow in bounded chunks.
10. Full reconcile remains bounded integrity/repair physiology only, never the growth path for an indefinitely growing organism.

## acceptance

- normal small change remains one delta;
- missing local ACK ledger reacquires remote key→revision ledger without transferring public values;
- stale local ACK can recover from remote ledger and continue;
- a >1 MiB cumulative change is carried as N <=1 MiB ordinary deltas, ACKed sequentially;
- every intermediate target revision is deterministic and accepted by Worker base matching;
- first materialization can begin from empty-ledger revision;
- retry of an already-ACKed chunk dedupes;
- R2 ETag race remains non-last-write-wins;
- no browser polling or public read endpoint is introduced;
- source semantics remain opaque to Display transport.
