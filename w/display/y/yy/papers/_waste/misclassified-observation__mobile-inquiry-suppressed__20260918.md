# OBSERVATION — mobile Papers inquiry is suppressed by shared Display CSS

status: OPEN / UNRESOLVED
source: isolated Papers observation pass, exact staging artifact at 390×844 + generated CSS/DOM witness
date: 2026-09-18
target: display.papers

## observation
At viewport width <=520px, the generated shared Display stylesheet contains:

`@media(max-width:520px){.interlocutor-content{display:none}...}`

In the exact staging artifact at 390×844:
- Papers itself is active and its tetrahedral field remains visible;
- the Papers HUD exists in the DOM but its ancestor `.interlocutor-content` computes to `display:none`;
- selecting `1H.9gYl` still creates the Papers detail DOM, but the entire Papers content surface remains invisible.

Thus the narrow-screen visitor can see the Papers field but cannot access the local function “selection opens inquiry.”

## evidence boundary
The suppressing rule is Display-owned shared tissue, not Papers-local CSS. This nutrient is a Papers-observed dependency pressure, not authorization for Papers to rewrite Display directly.

## pressure
Papers needs a lawful narrow-screen way to preserve inquiry or an explicit alternate access contract. Determine whether this requires a specimen-agnostic Display change, a Papers-local embodiment that survives the shared rule, or a deliberately different mobile relation.

## exit condition
On an accepted narrow viewport, a visitor can access Papers inquiry without hijacking global navigation/orientation; the solution is browser-witnessed with touch/pointer behavior and ownership remains on the correct side of the Display/Papers membrane.
