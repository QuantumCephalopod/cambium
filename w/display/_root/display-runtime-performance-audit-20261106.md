# Visitor runtime audit — 6 November 2026

Baseline: `d84196fe4486ee1db5b84687ce3416409ee98984`. Live bundle observed: `701e151a88b93f0e`.
Encounter: `5be32202af99f0146a7f882bf3bafa3c40d45b89`. Scheduler repair: `1951538e197fa452ee28200e6311eab9cae2ab9c`.

One scheduling defect is repaired. Three follow-up scopes remain open. The audit establishes actual repeated work and retained allocations; it does not establish a single measured cause of Philipp's device lag.

| State / priority | Finding | Next act |
|---|---|---|
| Repaired | Pending safe-area observers caused immediate repeated measurement | Existing pending frame reads the latest geometry |
| Open / P1 | Lens and fields independently measure the same HUD | One Glass-owned observation per explicit frame phase |
| Open / P1 | Inactive fields retain full-size optical attachments | Retire disposable targets; recreate before visible return |
| Open / P2 | Cold Crawlerbait entry acquires its complete generation | Resolve initial buffers, atomic preparation and transport scheduling |
| Profile before changing | Repeated grid validation, label ranges and cached media lookups | Establish actual frequency and cost before adding reuse |

Priorities are evidence-based work choices, not measured end-user speedups.

## Repaired observer scheduling

The old `z/zz/display-safe-area.js:75` refreshed immediately when a frame was already pending. Display's existing delivery now owns that measurement.

Production module, four synthetic HUDs:

| Delivered callbacks before one frame | Refreshes, old → repaired | Rectangle reads, old → repaired |
|---:|---:|---:|
| 2 | 2 → 1 | 8 → 4 |
| 10 | 10 → 1 | 40 → 4 |
| 100 | 100 → 1 | 400 → 4 |

Final geometry is equal. Later-frame resize, transition completion/cancellation, explicit immediate refresh and no-RAF operation pass. The existing owner test carries the regression. MutationObserver batches records; callback counts do not mean one callback per DOM mutation. Actual event frequency and FPS gain are unmeasured.

Catabolism return: baseline revision + the named source branch and native test reacquire the released intermediate observer measurements. Revoke if a consumer needs an intermediate snapshot before delivery; explicit immediate acquisition remains available.

## Shared HUD observation

Lens calls `Glass.collect()` at `z/zz/display-lens.js:267,341`. Field optics calls `Glass.rects()` at `w/wy/locus-shader.js:667`; its independent six-millisecond cache is in `z/zz/display-glass.js:143–148`.

Actual Glass/Lens modules, three synthetic HUDs, 60 simulated frames:

| Consumers | DOM scans | Style reads | Rectangle reads |
|---|---:|---:|---:|
| Lens + one field | 120 | 480 | 360 |
| Lens + two fields within 6 ms | 120 | 480 | 360 |
| Second field 7 ms later in the same frame | 180 | 720 | 540 |

A Glass-owned geometry generation can serve Lens and per-field projection. Actual geometry/style changes between phases must revoke reuse. This measures invocations, not browser layout duration.

Open intake: `../_stomach/NUTRIENT__frame-owned-hud-measurement__20261106.md`.

## Optical target lifetime

`w/wy/locus-shader.js:583,618,641` allocates preview, foreground and scene targets. Hidden handling at line 761 stops GL drawing; `x/display-runtime-v2.js:132–149` retains the cached field.

The production renderer's native transport creates a 1920 × 1200 buffer at 1280 × 800 CSS pixels, DPR 1.5. Scene storage comprises four-sample RGBA8 color, four-sample DEPTH24 and resolved RGBA8. Sixty hidden frames issue zero GL calls and zero target deletions.

| Attachments | Packed 24-bit depth estimate | 32-bit depth-storage estimate |
|---|---:|---:|
| Scene | 70.31 MiB | 79.10 MiB |
| Scene + preview + foreground | 101.07 MiB | 114.26 MiB |

These are nominal format-based allocations per field, excluding default framebuffer/driver overhead. Actual device memory is unmeasured. Deactivation must preserve source/camera state, prepared crossing and prior-scene restoration. Identical allocation law does not make objects transferable between WebGL contexts.

Open intake: `../_stomach/NUTRIENT__inactive-optical-target-lifetime__20261106.md`.

## Cold source acquisition

Overview HTML is 91,209 bytes; all 27 eagerly loaded repository-owned runtime scripts total 547,880 bytes. Crawlerbait contributes a 260-byte preview. Its complete bait publication directory is not an initial-page download.

First entry acquires 16,342 Baits, 6,301 Beings and 57,436 encounters in 24,349,517 decoded bytes. Independent gzip gives 3,412,743 bytes, not an observed HTTP transfer size.

Actual production source under Node 24.22.1:

| Operation | Observation |
|---|---|
| JSON parse, five runs | 67.7–114.2 ms |
| Cooperative preparation | 258.8 ms / 47 yields |
| Largest uninterrupted slice | 24.7 ms; sort/GC not separately attributed |
| Preparation heap change | +72.2 MB before collection; not retained memory |
| Install prepared field | 5.98 ms |
| Same-generation preparation reuse | 0.006 ms |
| Structured clone + microtask-ACK transport | 112,751 records / 2,482 batches; one in flight; 490.8 ms |
| Cloning / receiving within that harness | 218.6 / 81.7 ms; largest receiver batch 0.92 ms |

Exact source equality passes. Network and real Worker scheduling are excluded. Existing source/preparation caches already avoid cold work on warm revisits. This path alone does not explain settled Philosophy lag.

Separately, Crawlerbait module evaluation allocates two 90,000 × 7 float buffers: 5,040,000 bytes before entry. Demand-owned allocation can preserve eventual capacity while removing this initial cost.

Open intake: `../y/yw/crawlerbait/_stomach/NUTRIENT__cold-acquisition-cost__20261106.md`.

## Lower-priority observations

- `UI.fieldInfo` reclones/revalidates normalized grids: 25,000 actual-grid queries yielded 25,000 JSON parses, roughly 0.05–0.07 ms/query here. Stable field-camera presentation already caches by dimensions, so this is mainly event/binding work.
- `display-label-ink.js:74–108` recollects text geometry; wrapped runs query per-character ranges. Atlas reuse saves glyph paint/upload, not collection. Font, text, opacity, wrapping and scroll prevent an unconditional permanent cache.
- Schattenseiten's draw reoffers two media tiers across 55 slots: 110 cached lookups/frame. This does not imply repeated network requests; newly decoded upload readiness still changes.
- Full-surface optical rendering contains intentional visible work. No reduction in resolution, antialiasing, motion or source population was made.

## Validation, limits and recovery

The complete check passed 191 checks; address integration passed 12,335 assertions. The public build and exact artifact check passed 16,409 files / 92,086,589 bytes, bundle `18753e0911babdc4`. The scheduler's native equivalence/refusal witnesses pass.

The live public browser showed the baseline bundle, quiet header and successful Philosophy → Crawlerbait → Philosophy navigation. Its DOM reports `fieldRenderer=canvas2d`; the available read-only browser API does not expose Performance entries. This is interaction evidence, not WebGL/FPS measurement or a post-repair local browser test.

Exact probes and measurement JSON are retired audit fiber at `../_waste/performance-audit-20261106/` after durable HOME. Headers/arguments carry baseline recovery conditions. The scheduler probe reads its old source by immutable Git revision; other probed renderer sources are unchanged. The acquisition probe consumes a built artifact and checks complete source equality. Runtime timings vary; deterministic counts and retained obligations remain repeatable.

Display HOME owns this audit. Root HOME consumes its bounded claims. Two Display nutrients and one Crawlerbait nutrient retain genuinely unfinished work; no shared-root law change is earned.
