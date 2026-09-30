# NUTRIENT — a site may declare its rest view: orientation, projection, and where its points sit — 2026-09-30

status: NARROWED — hook metabolized into w/locus-shader.js + z/world-view.js + RITUALS 3.9/3.0 (HOME display-site-rest-view-20260930T172500Z); only the questions below stay open
kind: display encounter (from a site-holon's pressure)
source: Schattenseiten — Philipp 2026-09-30 (German, verbatim): "das besondere bei schattenseiten ist aber auch das die images nicht irgendwie rumfloaten sollen, sondern schon das wir den orthogonal view haben in dem alles 2D aussieht. und erst durch das drehen des tetraheders sieht man die tatsächliche shape"
target: github.cambium → display (w/locus-shader.js field, z/world-view.js orientation)
related: w/display/y/yx/schattenseiten/ (first realization)

## source-faithful pressure

Schattenseiten are shadows. Their whole claim is that a tetrahedron seen along its shadow axis, orthogonally, is a flat picture, and that only turning it shows the shape. Display cannot say that today:

- the shared orientation starts at `HOME_ORIENT` (a tilted view, `world-view.js`), which is not any shadow axis;
- the field camera is always a perspective camera (`perspective(π/3.3,…)`), and `project()` for hit-testing likewise;

The first Schattenseiten skin therefore scattered and drifted the works. Philipp: they should not float; they should rest as a flat picture. (A point-placement hook was tried and dropped: a full depth-three address space gives every slot a leaf of its own, so no hook was needed.)

## what the site cannot do alone

Orientation, projection and point placement are Display's shared geometry. A site that drew its own orthographic layer would disagree with the points and hit-tests Display keeps in perspective.

## candidate (specimen-agnostic)

An optional identity-owned `shader.view`:

- `rest: [w,x,y,z]` — a quaternion the shared orientation eases to when the site is shown; if the witness has not turned it since, it eases back to Display's home when another site is shown. Dragging cancels the ease.
- `projection: 'orthographic'` — the field and its hit-testing use a parallel projection matched to the perspective at the centre plane (same scale at the centre).

Absent it, nothing changes. Display names no site.

## open

- whether a rest view should also be offered to the witness as a control ("return to the axis");
- whether the two other axes (Schattenseiten's second and third shadow of the same body) deserve their own rests.
