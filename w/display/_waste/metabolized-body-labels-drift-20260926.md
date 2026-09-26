# NUTRIENT — body labels + bounded drift — 2026-09-26

status: OPEN
kind: display encounter (Philipp, after living with #113)
target: github.cambium → display; philosophy (local markers)

- Bug: after selecting a subtet, Philosophy's site labels keep their own orientation and stay
  put while the field zooms around them.
- Labels should be invariant, since the same mechanic is used everywhere: a body can be
  selected either by pressing a face of its body or by pressing the label attached to it.
- Organisms should not be locked to their container's centroid; they float around inside the
  space the container bounds.
