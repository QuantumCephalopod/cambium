# NUTRIENT — global default background-drag toggle

status: OPEN / UNRESOLVED
source: explicit user-designed cross-site invariant
date: 2026-09-18
target: github.cambium...display
owner: Display root

## requested invariant
Background tetrahedron drag/orientation should be a Display-global site-holon capability rather than a Philosophy/Papers special case.

Default for a newly admitted site-holon:
`background_drag = true`

Local opt-out:
`background_drag = false`

## scope
- the default belongs to Display/site-holon contract;
- the local value belongs to each site-holon's own membrane declaration;
- existing site-local phenomenology and semantic interaction remain local;
- disabling background drag must not disable global navigator orientation controls or remap site identity/address;
- central runtime must not branch on named site identities.

## current test choice
User explicitly wants Crawlerbait locally set to `background_drag = true` for direct experiential testing. Crawlerbait is therefore not used as the opt-out specimen in this pass; explicit-false behavior is witnessed structurally/unit-wise without sacrificing the user's requested live test.

## exit condition
The generated Display membrane gives any site-holon background drag by default without requiring local enabling code, while a site-local explicit false disables only that site's background-drag interaction. Default-true is browser-witnessed on current site-holons including Crawlerbait; explicit-false is structurally/unit-witnessed as the available local opt-out. Then the act closes through Display HOME/_feed.
