# NUTRIENT — Distinguish textual address order from geometric vertices

status: OPEN / reproduced serialization drift
owner: cambium
source: user-authorized read-only codebase audit at085076f7ebc5a5cd12f84a937f5c126b870d9d64

`z/address.js`11–13,28–44 reuses geometric w,x,z,y for textual comparison/witness representatives. Executed baseline: sorting w,x,y,z gives w,x,z,y; witnesses(yz) gives zy,yz; key(yz) is junction:zy. Current receptor law explicitly distinguishes text w,x,y,z from geometric vertex order. Quotient equality and exact coordinates remain correct.

Small exit: separate textual comparator from geometric indexing; inspect persisted locus-key compatibility before changing representatives. Prove address equivalence/coordinates and history/registry continuity rather than merely rewriting fixtures.
