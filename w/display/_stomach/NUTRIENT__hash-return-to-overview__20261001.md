# NUTRIENT — changing the address hash back to overview did not move the encounter — 2026-10-01

status: OPEN — single observation, cause not investigated
kind: display observation (Mnemos walking the live membrane; Philipp: "yes thats something to potnetially flag")
source: Mnemos, session 33Γ, browsing https://sss.saarland in the in-app browser
target: github.cambium → display (Orientation / browser encounter-history body)

## what was observed

1. On the overview, opened Papers by its marker; the URL became `https://sss.saarland/#main:y` and Papers showed.
2. Navigated the same tab to `https://sss.saarland/#main:overview` (hash change only, no reload).
3. The Papers view stayed on screen. Only a click on the global minimap moved the encounter again.

## not known

- whether a hash-only change is meant to move the encounter at all (the address may be write-only witness rather than an input);
- whether ordinary browser back/forward behaves the same;
- whether the in-app browser's navigate call fires `hashchange` the way a typed address or link does.

## exit

Closes when Display either states that the hash is not an input, or makes a hash change (and back/forward) move the encounter, witnessed in a real browser.
