> RETIRED PORTIONS / 2026-10-04. Source-faithful preimage for the bounded quotient below. This historical status is not a live task or authority. Surviving unresolved carrier: `../_stomach/NUTRIENT__text-is-tissue-spritesheet__20261001.md`.
> Obligation: keep the unresolved decisions answerable while releasing completed implementation/history. Consumers: this owner and the residual carrier. Surviving owner: Current `w/spritesheet/VERSION.json`, `w/display-type.js`, `w/display-text-tissue.js`, Display law 3.17 and HOMEs `display-type-is-body-20261001T160500Z` / `display-text-tissue-engine-20261001T204500Z` carry the face, folding and letters-as-bodies mechanism. Papers `sierpinski.js` is the consumer. The original `.carrier/` directory remains untouched pending its expressly retained disposition question.
> Reopen only the affected quotient if the cited owner/evidence changes, a retained question needs an extracted distinction, or a countercase defeats the witness. Reacquire the preimage below and the cited living source before rejudging.

# NUTRIENT — text is tissue: Philipp's SpriteSheet face as Display's main type, letters as inflating bodies — 2026-10-01

status: NARROWED — face, folding and letters-as-bodies law metabolized (organism RITUAL 3.11, `w/spritesheet/`, `w/display-type.js`; HOME display-type-is-body-20261001); tissue engine grown with Papers as first consumer (RITUAL 3.13, `w/display-text-tissue.js`; HOME display-text-tissue-engine-20261001T204500Z); open: frame cost at Papers scale and on phones, the relation to `NUTRIENT__text-is-body__20260927.md`, and whether this carrier's original 1.0.0 font bytes and prototype still need keeping (Philipp's call)

narrowed 2026-10-01: Philipp's "anders breaking w v und u" was a defect in the face itself — U V W X carried left bearings of −144/−160 and Z sat 122 units left of its cell. Display hosts 1.0.1 with every glyph re-centred and truthful bearings; this carrier keeps the handed-over 1.0.0 bytes.
kind: display encounter (from Philipp), with a witnessed browser prototype
source: Philipp, session 33Γ, 2026-10-01 (German and English, verbatim below)
target: github.cambium → display (w · Embodiment type and text physiology; Papers as first consumer)
related: `NUTRIENT__text-is-body__20260927.md` (watched invariant candidate), `NUTRIENT__glass-and-goo-lens__20260930.md` (lens), `y/yy/papers` text-being / metabolight text
carrier: `NUTRIENT__text-is-tissue-spritesheet__20261001.carrier/` — font builds exactly as Philipp handed them (`SpriteSheet-font-package.zip`: Regular + Mono, ttf + woff2, preview png, README), and the working prototype page

## source-faithful pressure

On the font:

> ok i made something else as well. its my own font =) could we potentially use *that* for the site?? would you maybe make a mockup as to how it looks? because... i feel like there' potential for awesome pre-text effects with this <333

> yes now that we see it sidebyside its definitvely a monofont 😃 umlauts like ä ü etc could be easily coded as ü=ue.

> i genuinlylove the font 😃 its very neo-runic... cyber shamanisitc

On the effect, as it was asked and then corrected three times:

> lets say we have a block of text in that font... and then we add goo in the font color so everyhting becomes a metaballish mass... unreadable by design... and organic 😛 eg when text moves the metaconnections connect/disconnect... goo yk :D
> then we could have the second effect be a lens of sort that when above the gooey text pushes the goo out, which makes the text readable =)

> not "goo=snot" and not "goo + text" but "goo=text"
> everything is *tissue* everyhing becomes *one mass* and the lens displaces the mass *along the skeleton* which is the text itself... so not an overlay of goo that gets displaced revealing text. but rather text=being and we push away the liquid/fat/tissue like a lens pressing into flesh =)
> and it doesnt need any shiny effects... just monocrome b/w =)

> the fat shoudlt leave radially when the body is a formatted on a square =) eg the body *is* the tissue where the fat gets squashed around. that means the fat itself is a local propertiy of a every local letter. not a seperate "fat-layer" know what i mean?
> (genuinly this looks fucking amazing and i want this as a design invariant for display as a whole asap 😃 <3333

> the letters are literal bodies... TEHY expand eg become fatter... not "a second layer ontop of the static text body is deforming itself along the text"
> the literal letters as svgs are blowing up and when they have a certain proximity they connect like metaballs to one mass =)

> jaaaaaa schon besser 😃 nur dass du die position nicht verschieben dafst sonst ist nichts lesbar das man anvisiert xDDD

> yessss, jetzt ham wirs 😛 <333 kannst du das erst in den display _stomach tun damits wirs danach ordentlich als invaraint metabolisieren?
> d.h. die main-font wird die hier... als mono-spacing font (anders breaking w v und u etc.) mit automatischem umschreiben von ä zu ae ü zu ue etc =)
> ich will das wir längerfrsiting alles was grade über particle->blowup-text läuft (mostly papers) als particle-goo->blowup-readable-text funktioniert <33...

## what the asks are

1. **Main face.** SpriteSheet Mono becomes Display's main type. Fixed cell; Philipp notes the mono build breaks W, V, U differently from Regular.
2. **Folding.** Text set in the face is rewritten automatically: Ä→AE, Ö→OE, Ü→UE, ß→SS (case-folded to the A–Z alphabet).
3. **Text is tissue.** Long term, what now runs as particle → blown-up text (mostly Papers) becomes particle-goo → blown-up readable text: letters are bodies that inflate and fuse into one mass, and a press makes them readable.

## accepted shape (Philipp: "jetzt ham wirs")

Witnessed in the prototype's "TEXT IS TISSUE" chamber, after three corrections that each removed a hidden second layer:

- **The letter is the body.** Each glyph is its own signed distance field of its own outline. There is no overlay, no shared blur field, no separate fat layer.
- **Fat is a local property of each letter.** Inflation offsets that letter's own outline by its own amount.
- **Fusion is proximity.** Letter bodies join through an exponential smooth union (metaballs); close letters merge into one mass, bridges form and break as letters drift.
- **The body is formatted on a square block** laid out by Pretext in the mono face.
- **The press changes fat, never position.** Letters under the lens deflate to their bare glyph where they stand; drift is stilled under the press so the aimed text holds; the squeezed volume swells the letters around the press. ("position nicht verschieben … sonst ist nichts lesbar")
- **Monochrome.** Bone on near-black, no gloss, no colour, no ring.

Prototype realization (implementation, not law): per-glyph SDF atlas built once by exact Euclidean distance transform of the rasterized face; instanced glyph quads add `exp(-(d - r)/s)` into a float field; the surface is `log(Σ) = 0`, antialiased by its own derivative. Per letter `r` = fat × tissue, `s` softness narrows as fat falls so bare letters stay crisp. Pretext 0.0.9 from the CDN laid out the block; Display already hosts the same body at `w · Embodiment`.

## rejected on the way (load-bearing negatives)

- goo as a coloured, glossy overlay on top of text ("goo=snot", "goo + text");
- a blurred field of the text thresholded into goo and pushed radially by the lens (still a second layer);
- per-letter fat painted into a shared blurred buffer (still a field deforming along static text);
- moving letters away from the press (makes the aimed text unreadable).

## known gaps

- The face carries A–Z and space only. Digits, punctuation, middot, holon ids (`6H.dNMx`), counts (`79S · 66H`) have no glyphs; which surfaces stay in another face is undecided.
- "anders breaking w v und u" is recorded verbatim; what exactly should differ was not specified further.
- The lens here is the prototype's own; how it relates to Display's existing glass goo lens is open.
- Performance on Papers-scale text and on phones is unmeasured.

## relation to the watched invariant

`NUTRIENT__text-is-body__20260927.md` waits for a second body to earn "text is body" before it is lifted into Display law. This nutrient is Philipp's direct ask to make it Display-wide, with an accepted concrete physiology. Whether that closes the watched condition, and what stays site-local in Papers, is for Display's metabolism to decide.

## exit

Closes when Display metabolizes the face, the folding, and text-as-tissue into its own law and tissue (or narrows/refuses parts with reasons), and the carrier is retired after reference closure.
