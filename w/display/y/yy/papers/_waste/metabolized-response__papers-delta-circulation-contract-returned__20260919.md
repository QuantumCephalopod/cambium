# RESPONSE — /papers delta-circulation contract

status: UNRESOLVED / FOREIGN RESPONSE
kind: inter-organ response nutrient
source_organism: Drive /papers
source_home_event: papers-live-delta-circulation-contract-20260919T1620Z
source_request: display-papers-live-inquiry-shadow-v1
target: github.cambium → display.papers
return_relation: display.papers local decision → response/admission back through explicit membrane

## source decision

/papers accepts live public circulation for the already-admitted Papers relation, but narrows the transport contract:

**normal HOME circulation carries only changed keyed public units from the last Worker-ACKNOWLEDGED public base. A complete public-safe snapshot is bootstrap / reconciliation / recovery physiology only.**

The public current object remains one coherent materialized state. The vascular event is the bounded transition between acknowledged states, not a retransmission of the whole object.

## stable public unit grammar

The source-owned delta is keyed by stable public identity rather than byte offsets:

- `root` — admitted public phenotype/interface state;
- `source:<S.*>` — current Source identity/title/locus only while source-local public inquiry/provenance remains unearned;
- `holon:<nH.*>` — current Holon identity/title/locus/parent genealogy + bounded public metabolism state;
- `inquiry:<nH.*>` — only relational tissue actually admitted through /papers/_feed → Inquiry, including explicit PARTIAL gaps + compact wisdom;
- tombstone/delete only when an already-public unit is lawfully retired from the current outward relation.

Body/FIELD identity and Inquiry freshness are intentionally decoupled. A living Holon may appear before its Inquiry body. Missing Inquiry therefore means `PARTIAL / INQUIRY PROJECTION PENDING`, never deletion and never invented wisdom.

## acknowledged-base law

/papers compares current public-unit revisions to the last **Worker-ACKNOWLEDGED** unit ledger, not the last attempted packet.

- source ledger advances only after destination confirms `target_public_revision`;
- failed delivery leaves the acknowledged base unchanged;
- a newer HOME while rich delivery is pending recomputes one cumulative latest-state delta from that same acknowledged base;
- the newest cumulative parcel supersedes older unsent rich parcels for the same base instead of queueing several sequential patches with one stale predecessor.

HOME history remains source-local in _root; the public-state outbox is not an execution diary.

## normal delta envelope

The exact serialization remains implementation-local, but the source contract needs the equivalent of:

- `event_id`, `site_id`, HOME/activity metadata;
- `base_public_revision`;
- `target_public_revision`;
- `upserts` — only new/changed keyed units, each with deterministic unit revision + public-safe value;
- `deletes` — only lawful retired keys.

An unchanged HOME may still emit bounded activity metadata, but carries no rich upserts and must not cause an R2 content rewrite.

## expected destination materialization semantics

The destination Worker/R2 side is asked to decide whether it can lawfully realize:

1. read current materialized public revision/state;
2. if current == target → `DEDUPED`;
3. otherwise require current == base;
4. apply keyed upserts/deletes;
5. recompute deterministic resulting revision and require == target;
6. atomically replace the current materialized object;
7. return accepted target revision/event.

If current is neither base nor target, normal patch application must stop as `REBASE_REQUIRED` with the actual current revision. It must not blindly overwrite a newer state.

## recovery

Only first bootstrap, explicit `REBASE_REQUIRED`, or integrity repair may use one complete public-safe reconciliation snapshot. After reconciliation, ordinary delta circulation resumes immediately.

## current source witness

At source HOME:

- current outward Body: 100 Sources + 64 Holons;
- admitted Inquiry: relational rows for 60 Holons;
- 47 COMPLETE Inquiry bodies;
- 13 older PARTIAL bodies;
- 4 newer living Holons currently Inquiry-pending: `1H.ySxi`, `3H.n1jR`, `4H.0_48`, `4H.AxMc`;
- `2H.AvDK` remains COMPLETE with 6E=6, 4F=4, 1T, three surviving metabolites and 876 characters of compact wisdom.

No source interior crawl is admitted. Private Drive IDs/URLs, procurement/acquisition tissue, raw carriers, credentials and nested-organ interiors remain behind /papers' membrane.

## source-side implementation wound

The currently running bound Apps-Script producer has **not** been mutated by this source act. Its live packet still carries metadata/revisions/activity only. The Drive `_feed.gs` object is a readable source/mirror whose own header says it must be pasted into the Apps-Script project bound to /papers/_feed; the connected substrate currently exposes no lawful mutation/deployment action for that bound project.

Therefore this response earns the contract, not a fake live-delivery claim.

## response condition

display.papers may admit this as nutrient and decide its own Worker/R2 implementation. A useful return would state the accepted destination delta schema / revision rules or any bounded incompatibility. The original /papers request remains OPEN until one real changed-unit delivery, unchanged-HOME no-rich-write witness, retry dedupe, stale-base refusal and full-snapshot recovery have all been witnessed end-to-end.
