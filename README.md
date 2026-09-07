# cambium

**self-similar-systems saar**  
an independent lab for artistic and scientific inquiry.

> we give questions form—and let those forms question us.

cambium is the living website organism, not a mirror of the entire research body.
Its visitor-facing surface is now carried by an intact `display` organ instead of by
a generated file committed at the host root.

canonical organization repository: `self-similar-systems/cambium`  
writable connector staging fork: `QuantumCephalopod/cambium`  
current Pages surface: https://self-similar-systems.github.io/cambium/

## enter the body

Start every re-entry at the canonical Drive `/SKILLS/START_HERE.md`, then read
[`SKILLS/START_HERE.md`](SKILLS/START_HERE.md) in this repository.

Host structural truth is split cleanly:

- [`INDEX.yaml`](INDEX.yaml) = minimal recursive phenotype only;
- [`_cambium.yaml`](_cambium.yaml) = the closed root `4V/6E/4F/1T` only.

Living occupants, source files, stomach matter, organs and work state remain in their
actual tissue/receptors rather than being copied into INDEX.

## current host body

The root phenotype remains:

| host address | noun |
|---|---|
| `w` | expression |
| `x` | continuity |
| `z` | orientation |
| `y` | renewal |

This fourfold was earned from website/code pressure. It is host physiology, not a
visitor-facing content taxonomy, and filesystem folders are not required to mirror it.

## display — visitor-facing organ

`display/` is now one intact organ participating at host `w / expression`.

The boundary is explicit:

`cambium:w ⟦ display:root ⟧`

Display is internally **unsplit**. Its [`INDEX.yaml`](display/INDEX.yaml) is the empty
mapping `{}` and there is deliberately no `display/_cambium.yaml` yet. Future
`w/x/z/y` anatomy inside display must be earned from actual display pressure rather
than copied from the host.

Current living display tissue:

- `display/content.json` — public wording/encounter copy;
- `display/template.html` — outward document membrane;
- `display/style.css` — visual expression;
- `display/view.js` — display-local rendering/camera behavior;
- `display/favicon.svg` — outward mark.

Its visitor-facing nutrients now enter `display/_stomach`. The becoming narrative and
actual interaction observations were routed there from the host stomach without being
silently digested.

Host `z/` remains orientation physiology; host `y/` remains renewal/witness
physiology. Display consumes those through an interface instead of swallowing them as
its own internal branches.

## Pages artifact — secreted membrane

There is intentionally **no committed root `index.html`** anymore.

Build the public membrane with:

```sh
python3 y/build.py --artifact _site
```

That produces only the static bytes GitHub Pages needs:

```text
_site/
  index.html
  .nojekyll
  assets/
```

`_site/` is disposable generated output and is gitignored. It is not an organism,
organ, archive or second anatomy.

Run the bounded witnesses with:

```sh
python3 y/build.py --artifact _site
python3 y/check.py --artifact _site
SITE_DIR=_site node y/test-address.cjs
python3 y/build.py --artifact _site --check
```

Optional browser checks require Playwright/Chromium:

```sh
python3 y/browser-check.py --out ../cambium-review
```

## GitHub Actions — dumb Pages pump

[`.github/workflows/pages.yml`](.github/workflows/pages.yml) runs on `main` pushes and
manual dispatch.

The build/witness heartbeat runs in both the staging fork and organization repository.
Actual Pages setup/upload/deployment is gated to the exact repository identity
`self-similar-systems/cambium`, so staging can test the vascular machinery without
trying to become the public site.

The workflow follows GitHub's Pages artifact route: checkout → build/witness →
configure Pages → upload `_site` → deploy to the `github-pages` environment.
Scheduling/transport remains substrate machinery; nutrient ontology and organ anatomy
remain organism law.

## intake and publication boundary

Host `_stomach/_waste` and display `_stomach/_waste` remain separate local metabolic
shells. Material crosses only through explicit routing/admission; one folder never
becomes another organism's metabolic role by naming convention.

The repository itself is public. No private research, credentials or unpublished
third-party carriers belong here.

`CNAME` records the intended `sss.saarland` address, but GitHub Pages custom-domain
configuration remains authoritative in repository Settings. DNS/HTTPS, public
contact, legal information and licensing remain explicit launch boundaries. The
public membrane retains `noindex, nofollow` until indexing is deliberately approved.
