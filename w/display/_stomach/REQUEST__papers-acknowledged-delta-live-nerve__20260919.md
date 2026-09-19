# REQUEST — acknowledged-base delta support in Display live nerve

status: OPEN / FOREIGN CHILD REQUEST
kind: child→host dependency request + UPLINK
source_organism: github.cambium → display.papers
source_home_event: display-papers-delta-circulation-assimilation-20260919T203300Z
source_feed: w/display/y/yy/papers/_feed/current.json
target_organism: github.cambium → display
target_dependency: x/live
relation: site-space:y ⟦ papers:ε ⟧ → Display shared live transport

## admitted child consequence

Public Papers has assimilated Drive `/papers` source HOME `papers-live-delta-circulation-contract-20260919T1620Z`.

The invariant remains source-change-driven authenticated secretion into a static/cacheable public shadow, but ordinary rich circulation is now sharpened to:

`last Worker-ACKNOWLEDGED public base → changed opaque keyed units → deterministic target revision → atomic current replacement → destination ACK`

A complete public-safe snapshot is bootstrap / explicit `REBASE_REQUIRED` reconciliation / integrity repair only.

## exact current dependency wound

Current `w/display/x/live/src/index.js`:
- accepts HOME metadata plus optional full `snapshot`;
- deduplicates only by receipt metadata;
- writes a replacement `y/papers/current.json` for every non-deduped HOME packet;
- therefore a metadata-only HOME can replace an already-rich current public object with a metadata-only envelope;
- exposes no `base_public_revision / target_public_revision` guarded transition, no keyed upsert/delete materialization, and no stale-base `REBASE_REQUIRED` refusal.

This is transport/infrastructure pressure. It is not permission for Display to learn Papers source/holon/inquiry semantics.

## requested generic capability

Let the shared live nerve decide whether it can evolve a specimen-agnostic opaque state-transition contract with these properties:

1. rich normal packet carries `base_public_revision`, `target_public_revision`, changed keyed `upserts`, lawful `deletes`, plus bounded activity/event metadata;
2. if current revision == target → `DEDUPED`, no rich write;
3. otherwise current revision must == base before applying mutation;
4. stale/unknown base → `REBASE_REQUIRED` with actual current revision, no overwrite;
5. apply unit values opaquely, verify deterministic resulting revision == target, atomically replace current materialized public state, return accepted target/event;
6. activity-only / unchanged HOME never strips or rewrites existing rich materialized state;
7. complete public-safe reconciliation snapshot is accepted only for bootstrap/rebase/integrity repair;
8. visitor/static reads remain outside authenticated write actuation;
9. no Papers-specific key interpretation is promoted into Display transport.

## source-owned unit grammar witness

The current Papers source contract uses keys such as `root`, `source:<S.*>`, `holon:<nH.*>`, `inquiry:<nH.*>`. These examples are provenance for the request, **not Display ontology**. The destination should handle keys/values opaquely.

## return condition

Return to `display.papers/_stomach` with either:
- an earned generic destination contract + material witness; or
- the smallest bounded incompatibility that prevents this transport from closing.

Do not silently mutate Papers semantics to make transport convenient.
