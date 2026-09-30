# NUTRIENT — a site may give its floating body a material of its own — 2026-09-30

status: NARROWED — hook metabolized into w/locus-shader.js + x/display-runtime-v2.js + RITUALS 3.10/3.1 (HOME display-site-body-material-20260930T184500Z); the material of each body stays each site's own
kind: display encounter (from Philipp)
source: Philipp 2026-09-30 (German, verbatim): "wär das in philosophy (main overview) schattenseiten UND papers tatsächlich ihren canonical body haben und nicht nur floating labels sind" — earlier the same day: "in philosophy ist der body noch nicht existent (gleiches gilt aber auch für papers) das müsste mal nachgeholt werden"
target: github.cambium → display (floating bodies)
related: site-holon RITUAL ("A site whose generic identity shader draws nothing … is not yet visible as a floating body")

## source-faithful pressure

In the overview a site is meant to be seen as a floating body: its own realized geometry at full resolution, drawn in its own material. Crawlerbait's field shader happens to double as a body material. Papers' field shader draws nothing on purpose (its own environment embodies the host), and Schattenseiten' is a near-invisible ink meant for its own field. In the overview they were labels only.

## what the site cannot do alone

Display draws a floating body with the site's field `shader.fragment`. A site cannot change the material of its body without changing what its own field draws, and for Papers that would put geometry into its own environment.

## candidate (specimen-agnostic)

An optional identity-owned `shader.body = {fragment, state?}`, used for the floating body in place of `shader.fragment`/`shader.state`. Same attributes and uniforms as the field fragment. Absent, nothing changes. Display names no site and prescribes no look.

## open

- the materials themselves are first drafts by each site's author and are Philipp's to judge by eye;
- Philosophy is the overview interlocutor (the host), so it has no floating body of its own; whether it should is not decided here.
