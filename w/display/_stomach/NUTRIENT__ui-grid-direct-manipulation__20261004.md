# NUTRIENT — anti-ADHD direct manipulation for UI-grid lab — 2026-10-04

status: OPEN / UNRESOLVED
source: Philipp, chat 2026-10-04
target: `self-similar-systems/cambium → w/display`
carrier: `QuantumCephalopod/cambium → staging/display-ui-grid-named-fields-20261004`

## source-faithful pressure

Philipp's correction:

> das mockup is seeeehr CS coded xD i hate it... mein brain sieht nur "lots of text and options aaaaaah" anti ADHD xD...

> soviel extra stuff den niemand braucht Oo warum will ich via ner command zeile was veschieben? warum nicht drag n drop? eifnfach reinclicken?

> und miiiinimal info und buttons... alles hinter recursive menues verstecken wenns muss :D das is eh der move... das ganze selbst so anzuordnen...

The supplied layout state is the concrete specimen to preserve:

```json
{
  "schema": "sss.display.ui-grid.v2",
  "meta": {"name": "site-holon-layout"},
  "splits": ["","w","x","y","z","ww","wx","xw","xx","xz","zx","zz"],
  "fields": {
    "Viewport": {"cells":["wy","wz","xy","yw","yx","yy","yz","zw","zy"],"label":"view"},
    "extended_select": {"cells":["wwy","wwz","wxy","wxz","xwy","xwz"],"label":"header"},
    "properties": {"cells":["xxy","xxz","xzw","xzx","xzy","xzz","zxw","zxx","zxy","zxz","zzw","zzx","zzy","zzz"],"label":"sidebar"},
    "tool_select": {"cells":["www","wwx","wxw","wxx","xww","xwx","xxw","xxx"],"label":"header"}
  },
  "elements": {}
}
```

## unresolved pressure

The grid/state law is not challenged. The interaction surface is.

Desired practical surface:
- the supplied field layout is the default visible specimen;
- direct manipulation first: click, drag, drop, inline rename;
- dragging a named field snaps it to a lawful same-rank rectangle of the same cell dimensions;
- double-clicking a current leaf refines it recursively;
- coalescence/refinement/destructive actions live behind tiny contextual menus rather than persistent controls;
- field address details appear only on hover/selection;
- no permanent command line, JSON textarea, property inspector, help wall or large toolbar;
- export is one small action; import/reset/additional tools may hide behind one recursive menu;
- exported JSON remains the same portable canonical state.

## challenge boundary

Do not change the canonical recursive address/state invariant merely to simplify interaction. This is an editor-surface correction, not a new Cambium invariant. Preserve v2 portability and field bindings. No root backpropagation is expected.
