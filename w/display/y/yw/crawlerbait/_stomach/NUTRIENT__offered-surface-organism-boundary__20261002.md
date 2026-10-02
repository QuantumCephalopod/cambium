# NUTRIENT — Crawlerbait offered-surface organism boundary — 2026-10-02

status: OPEN / ADMITTED
source: Philipp, chat 2026-10-02
target: github.cambium → display → crawlerbait
kind: organism-membrane correction

## encounter

Philipp challenges the current dependency in which Crawlerbait resolves offered paths by importing the repository-root generated Display artifact and therefore reacts to files/publication changes owned by other site-holons.

Source-faithful pressure:

> warum hat crawlerbait irgendwas mit files zutun die nicht explizit in /crawlerbait created wurden? das ist doch ontologisch unfassbar fuppes sollte das so sein? deswegen isses ja ein geschlossener eigener organismus

## witnessed current coupling

`crawlerbait/y/path_privacy.py` imports repository-root `y/site-public.py` and derives `offered_public_paths()` from the complete generated Display + site artifact.

Consequences already witnessed:
- adding unrelated legal site-holons changes the content-addressed Display asset bundle;
- old globally offered `/assets/<old-bundle>/...` paths can therefore become invalid under Crawlerbait's current `offered()` witness;
- Crawlerbait's privacy/being-kind witness is coupled to publication files outside the Crawlerbait organism.

## unresolved distinction

Crawlerbait may lawfully observe host-wide HTTP traffic through Cloudflare without therefore owning or traversing other organisms' public-file anatomy.

The next act must distinguish:
1. Crawlerbait-owned public path identity / path-publication membrane;
2. host-wide encounter success/failure evidence carried by the observed HTTP event;
3. foreign site-holon publication state, which must not enter Crawlerbait by repository traversal.

Candidate correction: literal path publication should be bounded to Crawlerbait-owned public apertures; Being-kind discrimination for host-wide successful reads vs probes should use encounter-local evidence and/or an explicit source-owned host interface, never a recursive crawl of other holons' files.

Do not mutate current canonical data until this boundary is closed and the authoritative secret-bound migration path is witnessed.
