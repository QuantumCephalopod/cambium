# One long-axis orientation for Display's recursive layout

status: OPEN
owner: display
source: Philipp and Mnemos, chat encounter on 2026-11-08
baseline_revision: aaa965093d18dea5df5004eddfe3e5bcb591541e

## Encounter

Philipp: “eine ähnlich elegante lösung wie dark/light mode für unterschiedliche displayformate ... wir orientieren das format immer an der längsten achse, also wenn der kompass im horizontal mode unten rechts ist, wär er im senkrecht mode unten links, weil sich das gesamete format um 90° dreht.” He confirmed one “elegante super simple globale invariant um die sich der rest weben und orientieren kann” and asked to admit and digest it.

We clarified the intended relation: the same canonical screen-space layout and its fields turn a quarter-turn clockwise in portrait, while text and controls remain upright and reflow in their actual fields. For normalized point coordinates with screen y increasing downward, landscape is `(u,v)` and portrait is `(1-v,u)`; a landscape bottom-right compass becomes portrait bottom-left. The longer physical screen axis selects the orientation. An exactly square viewport needs one stable deterministic tie. The transform is presentation-local: preserve the underlying recursive field addresses, source meaning, identity and current encounter.

## Question and exit

Discover the actual shared recursive-grid and membrane consumers. Earn one Display-owned geometry projection used consistently by every participating site-holon and the shared header, navigator, lens/glass contact and camera framing. Source-owned UI declarations and actual field relationships remain intact; distinguish a field's rotated geometry from upright readable content. Reconcile current portrait/compact exceptions only as far as this new invariant actually supersedes them, without inventing unaddressed field expansion or flattening independent site semantics.

Witness wide, tall, near-square and square carriers, a live orientation change, recursive/address identity, the full compass and controls, hit/optical alignment, visible camera context and real bounded content access for the participating site-holons. State native, software and browser evidence at their actual scope. If a concrete content-fit or interaction obligation remains unresolved, retain only that precise remainder. Return the result through Display-local HOME, exact intake retirement and source-owned feed; propagate only an actually changed admitted host dependency.
