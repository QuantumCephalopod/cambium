# cambium

**self-similar-systems saar**  
an independent lab for artistic and scientific inquiry.

> we give questions form—and let those forms question us.

cambium is the living website organism, not a mirror of the entire research body.
Its visitor-facing surface is carried by an intact `display` organ seated inside the
host's `w / expression` limb, while the deployed Pages site is only an ephemeral
membrane secreted from that relation.

canonical organization repository: `self-similar-systems/cambium`  
writable connector staging fork: `QuantumCephalopod/cambium`  
current Pages surface: https://self-similar-systems.github.io/cambium/

## enter the body

Every entry begins through the shared My Drive root `RITUALS/` receptor. After shared
Dive-in/Metabolism re-establish the target whole, enter this repository root and read
the relevant local ritual under [`RITUALS/`](RITUALS/).

There is no `START_HERE`, `SKILLS`, Diamond compatibility layer, or repository-specific
boot doctrine between the organism and its current receptor.

The root discoverables are the same organism interface used on other substrates:

```text
RITUALS/
INDEX.yaml
_cambium.yaml
_stomach/
_feed/
_root/
_waste/
```

`INDEX.yaml` is the minimal recursive phenotype. `_cambium.yaml` is the closed local
`4V/6E/4F/1T` constitution. `_stomach/_feed/_root/_waste` are the lifecycle shell, not
a second semantic body.

## current host body

| host address | noun | current carrier |
|---|---|---|
| `w` | expression | `w/interface.md` + intact `w/display/` organ |
| `x` | continuity | `x/continuity.md` |
| `z` | orientation | address/navigation tissue in `z/` |
| `y` | renewal | build/witness/feed-actuation tissue in `y/` |

The folder letters are stable raw addresses; mutable semantic names live in
`INDEX.yaml`. The root `expression / continuity / orientation / renewal` split is
host physiology, not automatically visitor-facing taxonomy.

## lifecycle shell

The Git carrier realizes the same semantic dance as Drive:

```text
act
  ↓
witness
  ↓
durable HOME in _root
  ↓
asynchronous local _feed refresh
  ↓
current self-presentation reflects that HOME
```

`_root/` contains immutable organism-local HOME event objects. Git history is only a
substrate witness and is not `_root`.

`_feed/current.json` is a mechanically derived source-owned current presentation. It
states which HOME it reflects. A temporary mismatch between latest HOME and current
feed is ordinary asynchronous lag, not a reason to rerun completed semantic work.

GitHub Actions carries the HOME→feed causal edge when the repository substrate emits
that pressure. Actions do not decide semantic meaning, HOME validity, admission,
care, phenotype or publication.

## display — visitor-facing organ

`w/display/` is one intact independently rooted organ participating at host
`w / expression`.

Boundary:

`cambium:w ⟦ display:root ⟧`

Physical custody is not host `ww`; crossing the membrane restarts address space at
display root.

Display remains internally unsplit. Its [`INDEX.yaml`](w/display/INDEX.yaml) is `{}`,
and there is deliberately no `w/display/_cambium.yaml` yet. It has its own
[`RITUALS/`](w/display/RITUALS/), `_stomach`, `_feed`, `_root` and `_waste`.

Current living display tissue includes:

- `content.json` — current public wording/encounter copy;
- `papers.json` — display-owned admitted projection from `/papers/_feed`;
- `template.html` — outward document membrane;
- `style.css` / `papers.css` — visual expression;
- `view.js` / `papers-view.js` — display-local rendering behavior;
- `favicon.svg` — outward mark.

Visitor-facing nutrients remain unresolved in `w/display/_stomach/`. The shared care
invariant may constrain their metabolism, but it does not automatically select final
copy, collaboration protocol or a display-internal split.

## Pages artifact — secreted membrane

There is intentionally no committed root `index.html`.

Build the public membrane with:

```sh
python3 y/build.py --artifact _site
```

Witness it with:

```sh
python3 y/check.py --artifact _site
SITE_DIR=_site node y/test-address.cjs
python3 y/build.py --artifact _site --check
```

Optional browser checks require Playwright/Chromium:

```sh
python3 y/browser-check.py --out ../cambium-review
```

`_site/` is disposable generated output and is gitignored. It is not an organism,
organ, archive, `_feed`, or second anatomy.

## GitHub Actions — substrate circulation

[`.github/workflows/pages.yml`](.github/workflows/pages.yml) runs on `main` pushes and
manual dispatch.

For push events it first checks whether the mutation added durable HOME objects. If so,
`y/feed.py` projects only the affected whole's local `_feed/current.json`, commits that
mechanical catch-up, and then the same run builds/witnesses the membrane. The
`GITHUB_TOKEN` feed commit does not create a semantic HOME and must not be interpreted
as a second organic act.

The build/witness heartbeat runs in both the staging fork and organization repository.
Actual Pages setup/upload/deployment is gated to the exact repository identity
`self-similar-systems/cambium`.

## intake and publication boundary

Host and display lifecycle shells remain separate. One organism's output becomes
another organism's nutrient only through explicit transport/admission/metabolism.

The repository itself is public. No private research, credentials or unpublished
third-party carriers belong here.

`CNAME` records the intended `sss.saarland` address, while Pages/DNS/HTTPS, public
contact, legal information, licensing and eventual indexing remain explicit launch
pressures in root `_stomach/launch.md`.
