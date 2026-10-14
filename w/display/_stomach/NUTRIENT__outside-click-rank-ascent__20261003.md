# NUTRIENT — outside click is structural rank ascent, never encounter-history return — 2026-10-03

status: OPEN / ADMITTED
source: Philipp, clarification chat 2026-10-03
target: github.cambium → display → navigation
related: `RITUALS/navigation/RITUAL.md`

## encounter

The intended navigation invariant is simpler than browser/page history:

> click in → one structural descent
>
> click out → one structural ascent

This relation should repeat at every rank until the current root is reached.

At the root / top-level overview, an outside click is a no-op.

## current wound

A global-navigator jump can currently leave prior encounter history acting like ancestry.

Observed example:

1. witness is in Papers;
2. global navigator jumps directly to Crawlerbait;
3. outside click from Crawlerbait returns to Papers.

That is the wrong topology. Papers is a previously visited sibling, not Crawlerbait's parent.

## invariant

Outside-click ascent is determined only by the **current structural containment path**.

It must not be derived from:

- previously visited site-holon;
- browser history order;
- last global-navigator destination;
- a sibling encounter stack.

A direct global jump to a site must establish that site's truthful structural path. Subsequent ascent pops exactly one rank of that path.

Therefore, for the current top-level site population:

`Papers → global jump → Crawlerbait → outside`

must yield:

`Philosophy / global root`

not Papers.

At the global root:

`outside → no change`.

## self-similar interaction grammar

The visitor should learn one repeated relation rather than separate page-navigation rules:

- select content/body → descend inward;
- select outside current content → ascend outward;
- repeat at every rank;
- no hidden "back" semantic is attached to the gesture.

Browser back/forward may remain browser history, but it must not define the meaning of spatial outside-click ascent.

## acceptance

1. outside click ascends exactly one structural rank;
2. global sibling jumps do not become parent-child history;
3. ascent after a global jump follows the destination's ancestry;
4. root outside-click is a no-op;
5. repeated descent/ascent is inverse and rank-local;
6. site-holon identity and global orientation survive ascent;
7. no special-case rule names Papers, Crawlerbait, Philosophy, Impressum, Datenschutz or Schattenseiten;
8. desktop and touch witnesses exercise the same topology.

This is a navigation-law correction, not a request for browser-history emulation.
