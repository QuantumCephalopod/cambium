#!/usr/bin/env python3
from pathlib import Path
import importlib.util

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("papers_shadow",HERE/"materialize-shadow.py")
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

def unit(revision,value):
    return {"revision":revision,"value":value}

units={
    "root":unit("sha256:"+"1"*64,{
        "phenotype":"w:\n  noun: Genesis\nx:\n  noun: Continuity\nz:\n  noun: Governance\ny:\n  noun: Evolution\n",
        "source_count":1,
        "holon_count":0
    }),
    "source:S.test":unit("sha256:"+"2"*64,{
        "rank":"S","locus":"z","title":"Source","state":"COMPLETE"
    }),
    "inquiry:S.test":unit("sha256:"+"3"*64,{
        "state":"COMPLETE",
        "boundary":"bounded",
        "sections":[[
            "metabolite","INV-S.test-01","Keep boundary",
            "Minimal source body: S.test:w.\nCompression: Keep the boundary."
        ]]
    })
}
state={
    "version":2,
    "site_id":"organism:papers",
    "units":units,
    "last_event":{"event_id":"test-home"},
    "materialized_at":"2026-09-25T00:00:00Z"
}
state["public_revision"]=m.ledger_revision(units)
out=m.materialize(state,{})
body=out["snapshot"]["inquiry"]["bodies"]["S.test"]
assert out["public_revision"]==state["public_revision"]
assert out["snapshot"]["public_revision"]==state["public_revision"]
assert out["snapshot"]["projection"]["groups"]["z"]==[{"id":"S.test","title":"Source"}]
assert body["metabolites"][0]["compression"]=="Keep the boundary."
assert body["metabolites"][0]["earning"]=="w"
print("Papers static-shadow materializer regression witness: PASS")
