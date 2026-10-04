# NUTRIENT — named UI fields + portable layout JSON — 2026-10-04

status: OPEN / UNRESOLVED
source: Philipp, chat 2026-10-04
target: `self-similar-systems/cambium → w/display`
carrier: `QuantumCephalopod/cambium → staging/display-ui-grid-named-fields-20261004`

## source-faithful pressure

> ok das is so sick O_O kannst du mir das live-mockup grade fertig machen? ideally kann ich danach ne json exportieren mit benannten feldern und wir ham endlich perfekte klare kommunikation :D <333

## unresolved pressure

The canonical UI-grid prototype is already live law in Display 3.18. The next pressure is communication ergonomics without creating a second layout ontology:

- selected lawful spans should receive stable human names such as `header`, `nav`, `body`, `footer`;
- exported JSON must preserve both the human field identity and the canonical recursive addresses that realize it;
- elements should be able to bind to a named field so field edits deterministically move bound elements;
- command language should resolve field aliases, e.g. `move title @header -> @body`;
- element IDs should be human-chosen when desired;
- JSON should download/upload as a portable file suitable for Philipp↔Mnemos handoff;
- the editor should autosave locally without making browser storage canonical;
- prior `sss.display.ui-grid.v1` exports should remain importable.

## challenge boundary

Named fields are aliases/bindings over canonical address spans. They must not become a second coordinate system. Canonical geometry remains derived from recursive address state. LocalStorage, editor controls, filenames and visual field labels are tooling only.

No root Cambium backpropagation is expected unless this act reveals a carrier-independent distinction not already covered by Cambium 1.6.
