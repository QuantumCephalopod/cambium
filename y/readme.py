#!/usr/bin/env python3
"""Project GitHub's README from the current repository anatomy."""
import argparse
import build

ROOT = build.ROOT
DISPLAY = build.DISPLAY
README = ROOT / 'README.md'
GENE_NAMES = {'w': 'CREATE', 'x': 'COPY', 'z': 'CONTROL', 'y': 'CULTIVATE'}


def _phenotype_rows(index):
    return '\n'.join(
        f"| `{gene}` | {GENE_NAMES[gene]} | `{index[gene]['noun']}` |"
        for gene in build.GENES
    )


def render():
    root_index = build.load_yaml(ROOT / 'INDEX.yaml')
    root_cambium = build.load_yaml(ROOT / '_cambium.yaml')
    display_index = build.load_yaml(DISPLAY / 'INDEX.yaml')
    display_cambium = build.load_yaml(DISPLAY / '_cambium.yaml')
    build.validate_index(root_index)
    build.validate_cambium(root_cambium)
    build.validate_index(display_index)
    build.validate_cambium(display_cambium, 'w/display/_cambium.yaml')

    cname = (ROOT / 'CNAME').read_text(encoding='utf-8').strip()
    if not cname:
        raise ValueError('CNAME is empty')

    sites = build.discover_sites()
    site_rows = '\n'.join(
        f"| `{site['address'] or 'ε'}` | {site['title']} | `{site['id']}` |"
        for site in sites
    )

    return f"""<!-- GENERATED REPOSITORY PROJECTION — DO NOT EDIT README.md DIRECTLY -->
# cambium

This README is a derived GitHub-facing projection of the living repository anatomy. Change the organism; regenerate the projection.

**Public membrane:** [https://{cname}](https://{cname})

## current organism

| address | CCCC | whole |
|---|---|---|
{_phenotype_rows(root_index)}

**1T** — {root_cambium['1T']}

## Display organ

`cambium:w ⟦ display:root ⟧`

| address | CCCC | whole |
|---|---|---|
{_phenotype_rows(display_index)}

**1T** — {display_cambium['1T']}

## public population

`display:y ⟦ site-space:ε ⟧`

| site-space | interlocutor | identity |
|---|---|---|
{site_rows}

The physical `w/display/y/` population anatomy is mount truth. Each site-holon remains independently rooted behind the Display membrane.

## build + witness

```sh
python3 y/build.py --artifact _site
python3 y/check.py --artifact _site
SITE_DIR=_site node y/test-address.cjs
node w/display/z/site-fold.test.cjs
python3 y/build.py --artifact _site --check
```

`_site/` is disposable generated output and is not living anatomy.

## projection sources

This file is compiled from current repository-owned surfaces: `INDEX.yaml`, `_cambium.yaml`, `w/display/INDEX.yaml`, `w/display/_cambium.yaml`, physical `w/display/y/**/site.json`, and `CNAME`.

Regenerate with `python3 y/readme.py`. Verify with `python3 y/readme.py --check`.
"""


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--check', action='store_true')
    args = ap.parse_args()
    expected = render()

    if args.check:
        if not README.is_file() or README.read_text(encoding='utf-8') != expected:
            raise SystemExit('README.md is stale; run python3 y/readme.py')
        print('README.md exactly matches current repository projection')
        return

    if README.is_file() and README.read_text(encoding='utf-8') == expected:
        print('README.md already current')
        return

    README.write_text(expected, encoding='utf-8')
    print('projected README.md from current repository anatomy')


if __name__ == '__main__':
    main()
