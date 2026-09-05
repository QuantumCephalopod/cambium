# unresolved nutrient — first public launch

state: open. scope: website only. source: the founding conversation and first implementation attempt.

this is genuine unfinished work, not a permanent launch diary. absorb decisions into the live page, receptor or index; remove this intake record when its final function is finished.

## unresolved questions and exit conditions

### repository write

the organization-owned repository remained unreadable for write operations through the active app token even though repository metadata reported push/admin on the authenticated user. the bounded workaround is now witnessed: `self-similar-systems/cambium` was forked to `QuantumCephalopod/cambium`, and the first file write to that personal fork succeeded through the same connector.

current state: the personal fork is a staging carrier. this does **not** witness an upstream merge. the organization repository remains authoritative for the eventual public source.

exit: finish writing and read back the complete staging fork, open a pull request from `QuantumCephalopod/cambium` to `self-similar-systems/cambium`, merge it by explicit owner action, then read back the upstream commit. after that, compact this transport diagnostic to whatever live dependency remains; do not retain it as permanent organism law.

no credentials are to be pasted into chat or repository files.

### display and public contact

the page is a first design proposal using the selected lowercase wording. the administrative Gmail address has deliberately not been made a public contact. a public contact remains an explicit open choice.

exit: owner reviews desktop/mobile appearance and chooses whether an email address should be public. never infer permission to expose a recovery/admin mailbox from possession of its address. no `@sss.saarland` mailbox has been configured by this implementation.

### legal and privacy information

do not invent a legal person, postal address, registration, VAT number or accreditation. this seed has no completed legal notice and is not represented as launch-ready. obtain the owner's approved public operator/contact information and determine applicable German information obligations before public launch. privacy information must match the actual hosting, request logging and contact setup. absence of client-side tracking is not a blanket exemption.

exit: applicable information and the public address are reviewed, supplied deliberately and reachable on the site. a robots tag is not a legal substitute or privacy boundary.

starting legal reference, not a complete review: https://www.gesetze-im-internet.de/ddg/__5.html

### rights

exit: the owner deliberately selects the licensing/reuse treatment for the site text, code and artwork. future public research objects carry their own permissions/version status. no license is chosen by default.

### hosting and domain

`CNAME` contains `sss.saarland`. this is intent only. no Pages setting, nameserver, DNS entry or HTTPS configuration has been changed.

exit: verify the domain at the organization level; configure the repository's Pages source and custom domain; change only the required web DNS records; check the build result and the actual HTTPS site. preserve mail DNS records. review what files the chosen deployment exposes. remove the preview's `noindex, nofollow` once launch has been approved.

references:

- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https

## closure

after resolution, the actual approved information lives in the page, its necessary supporting files and the current index. no new semantic folder is warranted just because launch work was required.

## local update — first split and named address navigation

the flat seed has grown and its first split is materialized. current code lives at
w/x/z/y; `index.html` and `INDEX.md` are generated root projections. the former
public address-study/demo surface has been retired: the public navigator now exposes
only realized website anatomy, using each full-prefix noun from `INDEX.json`. deeper
reciprocal paths remain an isolated renewal test fixture until the website actually
earns such descendants.

free horizontal, vertical and roll rotation are presentation only; they never alter
symbolic address identity. after further edits rerun `python3 y/build.py`,
`python3 y/check.py`, `node y/test-address.cjs` and the optional browser check.

remaining acceptance for this staging pass: verify the complete fork readback, open
and merge the upstream pull request, then verify the upstream source. this queue
entry is not permission to create deeper body nodes or to launch Pages.
