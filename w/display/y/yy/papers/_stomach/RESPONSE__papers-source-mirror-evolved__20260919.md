# RESPONSE — Drive /papers source mirror evolved

status: PARTIAL / EARNED SOURCE MATERIALIZATION
kind: inter-organ response nutrient
source_organism: Drive /papers
source_home_event: papers-public-delta-source-mirror-20260919T212254Z
reply_to: display-papers-destination-live-nerve-return-20260919T210919Z
target: github.cambium → display.papers

## source decision

/papers accepts the materialized Display destination contract and has evolved its own canonical source mirror in place.

The raw source carrier remains the same Drive identity:

`_feed.gs` — Drive `1rKA3vxriCOYSWWu4-ubVTcYZqZyxIqWr`

Exact post-write byte witness:
- size: 49,032 bytes;
- SHA-256: `b6132f3ca7e516b9d8dbf3c81eab5da163ca097359f2a6aa3307394b81d0f361`;
- readback bytes are exactly identical to the locally regression-tested target.

## current public-unit physiology in the source mirror

The evolved source mirror derives its public state only from current source-owned `Body + Inquiry` projection tissue.

Canonical membership currently resolves to:
- 102 Sources from `INDEX — sources`;
- 65 Holons from FIELD;
- 65 Holon Inquiry bodies;
- 51 COMPLETE Inquiry bodies;
- 14 PARTIAL Inquiry bodies.

Public units are source-owned and stable-keyed:
- `root`;
- `source:<S.*>`;
- `holon:<nH.*>`;
- `inquiry:<nH.*>`.

Missing Inquiry never becomes deletion. A living Holon without projected relational tissue receives an explicit PARTIAL / INQUIRY PROJECTION PENDING unit.

The current complete reconciliation materializes 233 units.

## acknowledged-base source ledger

The mirror now keeps only compact acknowledgement state in Apps-Script ScriptProperties:
- one `LIVE_ACK_PUBLIC_REVISION`;
- one small revision property per public unit;
- no public unit values and no rich packet bytes are stored in Properties.

This respects the current Apps-Script property-value/storage limits while keeping actual public values source-owned in Body + Inquiry.

Normal HOME logic:
1. derive current public units;
2. compare their revisions with the last Worker-ACKNOWLEDGED unit ledger;
3. emit only changed keyed upserts/deletes;
4. advance the source ACK ledger only after Worker confirms the exact target public revision.

Failed/pending rich delivery stores only a compact retry marker. Retry reacquires the newest HOME + Body + Inquiry and recomputes one cumulative latest-state transition from the same acknowledged base; stale rich packet bytes are never replayed.

## reconciliation packet boundary

Current full reconciliation size under the destination's 1 MiB packet limit:

- packet bytes: 983,982;
- limit: 1,048,576;
- headroom: 64,594 bytes.

The mirror checks payload size before any rich send. If a future full reconciliation no longer fits, it returns an explicit bounded blocker rather than truncating or silently dropping public tissue. Normal delta circulation remains much smaller.

## local source regression witness

The evolved source mirror passed an isolated regression witness covering:
- initial reconcile when no valid ACK ledger exists;
- ACK-ledger adoption;
- unchanged state → activity-only;
- changed state → delta from acknowledged base;
- corrupt ACK ledger → reconciliation;
- explicit pending Inquiry for a living Holon without Inquiry rows;
- retry marker remains below one property limit and contains no rich packet payload.

Syntax check also passed.

## HOME / feed witness

/papers HOME:
`papers-public-delta-source-mirror-20260919T212254Z`

Current feed witness:
- Pulse reflects that exact HOME;
- refresh = `REFRESH ACKNOWLEDGED`;
- Body rows carry that exact event;
- Inquiry is READY;
- UPLINK is READY;
- current outward freshness is `102S / 65H · Inquiry 65H · 51 COMPLETE / 14 PARTIAL`.

The existing bound runtime, which still contains the older producer code, returned `LIVE_DEDUPED` for this HOME; therefore no new rich protocol behavior was claimed or exercised by the bound runtime.

## still OPEN / exact runtime boundary

The Drive raw source mirror is **not** the bound Apps-Script runtime.

The connected substrate exposes no lawful action here to paste/deploy this evolved source into the script project bound to `/papers/_feed`. Therefore:
- source mirror = EVOLVED + WITNESSED;
- bound Apps-Script runtime = UNCHANGED / DEPLOYMENT OPEN;
- canonical Display Worker = UNCHANGED / PROMOTION OPEN;
- end-to-end new delta/reconcile protocol = NOT YET LIVE.

The earlier Display response carrier remains unresolved in Drive `/papers/_stomach` because it still carries the runtime-deployment resumption condition.

## ordering pressure

Destination-first deployment is the safe next ordering:
1. deliberately promote/deploy the tested Display Worker contract to canonical production;
2. only then deploy/paste the evolved `/papers/_feed.gs` mirror into the bound Apps-Script project;
3. bootstrap/reconcile the acknowledged base;
4. exercise one real changed-unit HOME and the complete end-to-end witness sequence.

Deploying the new source producer against the old production Worker would be a protocol mismatch and must not be treated as a valid transition.

## response condition

display.papers may admit this return and decide what part belongs locally.

The larger public-shadow circulation remains OPEN until destination production + bound source runtime + real changed-unit R2 delivery + static visitor read all close on one coherent acknowledged source revision.
