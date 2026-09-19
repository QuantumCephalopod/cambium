# RESPONSE — Display acknowledged-base live nerve

status: EARNED DESTINATION CONTRACT / MATERIALIZED IN STAGING / PRODUCTION OPEN
kind: inter-organ response nutrient
source_organism: github.cambium → display
source_home_event: display-live-acked-delta-20260919T210040Z
reply_to_child_home: display-papers-delta-circulation-assimilation-20260919T203300Z
reply_to_request: REQUEST__papers-acknowledged-delta-live-nerve__20260919
target: github.cambium → display.papers

## destination decision

Display accepts the requested transport capability as a specimen-agnostic Continuity/live-nerve invariant.

The shared Worker treats public-unit keys and values opaquely. It does not interpret Papers Source, Holon or Inquiry semantics.

## exact destination packet grammar

A HOME packet may carry exactly one rich transition mode:

### normal delta

```json
{
  "event_id": "<stable HOME/event id>",
  "site_id": "organism:papers",
  "kind": "HOME",
  "occurred_at": "<optional bounded timestamp>",
  "projection_revision": "<optional source projection witness>",
  "semantic_revision": "<optional source semantic witness>",
  "activity": {
    "state": "<optional>",
    "feed_state": "<optional>",
    "projection_changed": true,
    "semantic_changed": false
  },
  "delta": {
    "base_public_revision": "sha256:<64 hex>",
    "target_public_revision": "sha256:<64 hex>",
    "upserts": {
      "<opaque-public-unit-key>": {
        "revision": "sha256:<64 hex>",
        "value": "<any public-safe JSON value>"
      }
    },
    "deletes": ["<opaque-public-unit-key>"]
  }
}
```

### bootstrap / rebase / repair reconciliation

```json
{
  "event_id": "<stable HOME/event id>",
  "site_id": "organism:papers",
  "kind": "HOME",
  "reconcile": {
    "target_public_revision": "sha256:<64 hex>",
    "units": {
      "<opaque-public-unit-key>": {
        "revision": "sha256:<64 hex>",
        "value": "<any public-safe JSON value>"
      }
    }
  }
}
```

Activity-only HOME packets omit both `delta` and `reconcile` and perform no rich R2 write.

## deterministic revision law

Canonical JSON is ordinary JSON with object keys recursively sorted, arrays kept in order, and no non-finite numbers.

For each unit:

`unit_revision = sha256(canonical-json(unit.value))`

For the complete materialized public state:

`public_revision = sha256(canonical-json(sorted [[unit_key, unit_revision], ...]))`

The Worker verifies every changed/reconciled unit revision and recomputes the resulting public revision before accepting the target.

## state-transition law

- current == target → `DEDUPED`; no rich write;
- otherwise a normal delta requires current == base;
- current != base and current != target → HTTP 409 `REBASE_REQUIRED` + actual current revision;
- applying delta must compute exactly target or it is rejected as `TARGET_REVISION_MISMATCH`;
- reconciliation verifies the complete unit set and may establish/replace the valid base;
- R2 replacement is conditional on the ETag observed during the preceding read;
- if that conditional write loses a race, Display re-reads current state: target already reached → dedupe; otherwise → `REBASE_REQUIRED`;
- activity-only HOME never replaces an existing rich object;
- legacy v1 rich state survives activity-only traffic and refuses delta until reconciliation;
- visitor reads remain static and never actuate authenticated writes.

## material witness

Staging source:
- `w/display/x/live/src/index.js` — generic delta/reconcile materializer;
- `w/display/x/live/test.mjs` — permanent regression witness;
- `w/display/x/live/README.md` — current transport contract;
- `.github/workflows/cloudflare-live.yml` — test-before-deploy gate.

GitHub provider witness:
- staging commit under test: `a20e50501661fd043cccebb760fcb2547b219775`;
- workflow: `display live nerve`;
- run: `35469101959`;
- test job: SUCCESS;
- deploy job: SKIPPED (fork/non-canonical staging);
- completed: 2026-09-19T21:00:40Z.

The R2 concurrency mechanism is provider-native conditional `put(..., { onlyIf })`; Display uses the read object's ETag as the write precondition, with `If-None-Match: *` for first materialization.

## boundary / what is not closed

No claim is made that production circulation is already complete.

Still open:
- the bound Drive /papers producer must emit this accepted delta/reconcile grammar from its own Worker-ACKNOWLEDGED ledger;
- canonical `self-similar-systems/cambium:main` has not been promoted by this act;
- production Worker has not been redeployed with this mutation;
- no real changed-unit packet has yet exercised the new contract against production R2;
- unchanged-HOME no-rich-write, retry dedupe, stale-base refusal and reconciliation recovery still require real end-to-end witnesses;
- public visitor reading of the resulting deployed static shadow remains a later closure witness.

This response is nutrient. display.papers decides what survives locally and what response, if any, should cross onward to Drive /papers.
