# OBSERVATION — Papers HUD collides with global membrane text

status: OPEN / UNRESOLVED
source: isolated Papers observation pass, exact staging artifact at 1440×1000
date: 2026-09-18
target: display.papers

## observation
In the exact staging artifact, Papers' local HUD occupies the same top-left band as global Display status tissue.

Measured boxes at 1440×1000:
- `#status`: x=28, y=75, w≈190.4, h=8
- `#site-state`: x=28, y=92, w≈336.8, h≈11.6
- `.papers-hud`: x=28, y=82, w≈241.3, h≈41.6

The Papers HUD intersects both `#status` and `#site-state`, visibly stacking “Papers / 95 sources · 49 holons / legend” through global route/state text.

## evidence boundary
This is a current visual collision, not evidence that Display's global text or Papers' HUD should be removed.

## pressure
Find the smallest ownership-correct layout relation that lets Papers present its local identity/count/legend without overwriting the persistent global membrane. Prefer Papers-local accommodation unless a genuinely generic safe-area contract is required.

## exit condition
At accepted desktop widths, Papers-local HUD and global Display route/status surfaces remain simultaneously legible with no bounding-box overlap, without changing the semantic ownership of either surface.
