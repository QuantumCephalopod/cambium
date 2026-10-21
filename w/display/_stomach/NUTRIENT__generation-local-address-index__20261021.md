# NUTRIENT — Generation-local exact address lookup

status: OPEN / admitted for bounded implementation
owner: display
source: Philipp's accepted next performance bite, 2026-10-21 Europe/Berlin
baseline: b6c00379389c30fcf82ebd8ad22f57a1337efdcc

Display navigation `addressRecord` currently scans `structure.addresses` for every point, label, pool and focus consumer. The prior audit measured about1.9s of point-to-address lookup for13336 points/38792 addresses. The current same-consumer witness measured 1803.557ms for13580 points/39544 addresses. Full replay field rebuilds repeat this work.

Small exit: one private exact raw-address index owned by each collected structure generation; preserve the public arrays/records, object identity, missing/unrealized refusal, raw versus quotient distinction, legacy structure consumers and fresh recollection after source mutation. Avoid site-specific knowledge, cross-generation state, synthetic descendants and new depth caps. Witness source-exact production consumer timing and complete geometry/point equality on the same real projection, independent no-scan and generation/miss/alias tests, full build/address/fold/GL witnesses and exact staging CI. Existing source/body anatomy, source ownership and publication boundary remain intact. Browser/GPU timings are separate from this Node preparation witness.
