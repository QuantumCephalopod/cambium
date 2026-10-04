# NUTRIENT — named UI fields + portable layout JSON — 2026-10-04

status: ASSIMILATED / DISPLAY HOME EARNED
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


## assimilation — 2026-10-04

**PASS / EARNED.**

The communication layer can now name canonical spans without creating a second coordinate ontology:

`@field → canonical same-rank address span → derived carrier geometry`

An element may bind to `@field`; redefining the field changes the bound element's resolved cells deterministically. Direct address binding remains available when no alias is useful.

The portable state advanced from `sss.display.ui-grid.v1` to `sss.display.ui-grid.v2`:
- `meta.name` gives the layout an export identity;
- `fields` maps stable human IDs to canonical address spans and optional display labels;
- `elements[*].field` binds an element to that field while `cells` remains its resolved address witness;
- command grammar resolves aliases such as `move title @header -> @body`;
- JSON can be copied, downloaded, loaded and imported;
- v1 JSON remains importable with an empty field map;
- localStorage autosave is best-effort editor convenience only.

### witness

- GitHub Actions run `37200594851`: full Display build, organism witness, address algebra, tetrahedral closure, byte verification and staging artifact upload PASS;
- native `ui-grid.test.cjs`: v2 schema, named-field definition, duplicate-span refusal, bound-element following, alias move commands, JSON roundtrip and v1 migration PASS;
- Chromium harness on exact standalone HTML/model bytes: blank → `split ε` produced `w,x,y,z`; `@header = w+x`; `@body = y+z`; `title` bound to `@header`; `move title @header -> @body`; exported JSON witnessed the named fields and resolved element cells; zero UI error records;
- 1400×900 and 760×980 rendering witnessed. Container policy blocks local HTTP/file navigation, so exact bytes were injected into an about:blank witness document; browser storage itself was not used as evidence;
- Display `INDEX.yaml` and `_cambium.yaml` remain unchanged.

No Cambium backpropagation is required: root Cambium 1.6 already owns canonical address state, deterministic carrier projection and replayable address-native deltas. Named UI fields are a Display communication alias over that existing invariant.
