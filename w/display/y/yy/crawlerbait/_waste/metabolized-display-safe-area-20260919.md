# NUTRIENT — inhabit Display safe-area

status: OPEN / UNRESOLVED
source: explicit user observation with current Crawlerbait screenshot
date: 2026-09-19
target: github.cambium...display.crawlerbait
owner: Crawlerbait

## witnessed difference
Crawlerbait's local left panel is still positioned by its own viewport-relative bottom/max-height rules. In the current rendered encounter its upper content can rise into Display's persistent top membrane/status region, so global Display text and Crawlerbait-local text overlap.

Display already exposes the specimen-agnostic safe-area contract. This is therefore not new Display pressure.

## unresolved pressure
Make Crawlerbait's own panel consume the existing Display safe-area so its local presentation stays below the current global top occupied region across responsive viewports, while preserving the local panel's existing character and scroll behavior.

## boundary
- no Crawlerbait semantic/data/shader change;
- no site-specific mutation in central Display;
- do not duplicate hard-coded Display pixel offsets;
- use the existing Display-owned safe-area variables/contract;
- preserve background drag, bait interaction, inspector and machine-readable reef links.

## exit
In the generated artifact Crawlerbait's panel has zero overlap with the Display top membrane/status region on desktop and narrow viewport witnesses, using the existing safe-area contract; full structural/build witnesses pass before Crawlerbait HOME.
