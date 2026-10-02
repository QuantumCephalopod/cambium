#!/usr/bin/env python3
"""Stable public path membrane for Crawlerbait.

Offered public site paths remain literal because they are already public surface.
Everything else becomes a keyed opaque Bait path while preserving only the small
structural prefixes required by the existing Being-kind law.
"""
from __future__ import annotations

import hashlib
import hmac
import re

PATH_DOMAIN = "crawlerbait:path:v1"
TOKEN_RE = re.compile(r"^[0-9a-f]{24}$")

OFFERED_EXACT = {
    "/",
    "/index.html",
    "/.nojekyll",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
}
OFFERED_PREFIXES = (
    "/assets/",
    "/papers-shadow/",
    "/crawlerbait/",
)
OWN_APERTURES = (
    "/__live/",
    "/repos/self-similar-systems/",
)
FOREIGN_PORES = (
    "/cdn-cgi/",
)


def canonical_path(value) -> str:
    return value if isinstance(value, str) else str(value or "")


def offered(path: str) -> bool:
    path = canonical_path(path)
    return (
        path in OFFERED_EXACT
        or path.startswith(OFFERED_PREFIXES)
        or (path.startswith("/apple-touch-icon") and "/" not in path[1:])
    )


def own_aperture(path: str) -> bool:
    path = canonical_path(path)
    return path.startswith(OWN_APERTURES)


def foreign_pore(path: str) -> bool:
    path = canonical_path(path)
    return path.startswith(FOREIGN_PORES)


def _token(key: bytes, raw: str) -> str:
    return hmac.new(
        key,
        (PATH_DOMAIN + "\x00" + raw).encode("utf-8", "replace"),
        hashlib.sha256,
    ).hexdigest()[:24]


def public_path(key: bytes, raw) -> str:
    """Return stable public Bait path without publishing arbitrary raw path text."""
    path = canonical_path(raw)
    if offered(path):
        return path
    token = _token(key, path)
    for prefix in OWN_APERTURES:
        if path.startswith(prefix):
            return prefix + "~/" + token
    for prefix in FOREIGN_PORES:
        if path.startswith(prefix):
            return prefix + "~/" + token
    return "/~/" + token


def public_path_shape_valid(path: str) -> bool:
    """Mechanical witness that a public path is either offered or an opaque form."""
    path = canonical_path(path)
    if offered(path):
        return True
    if path.startswith("/~/"):
        return bool(TOKEN_RE.fullmatch(path[3:]))
    for prefix in OWN_APERTURES + FOREIGN_PORES:
        marker = prefix + "~/"
        if path.startswith(marker):
            return bool(TOKEN_RE.fullmatch(path[len(marker):]))
    return False


def self_test() -> None:
    key = bytes.fromhex("01" * 32)
    assert public_path(key, "/") == "/"
    assert public_path(key, "/assets/a.js") == "/assets/a.js"
    a = public_path(key, "/reset/alice@example.org/abc123")
    b = public_path(key, "/reset/alice@example.org/abc123")
    c = public_path(key, "/reset/bob@example.org/abc123")
    assert a == b and a != c and a.startswith("/~/")
    assert "alice" not in a and "example" not in a
    own = public_path(key, "/__live/private/site/123")
    assert own.startswith("/__live/~/")
    foreign = public_path(key, "/cdn-cgi/trace/private")
    assert foreign.startswith("/cdn-cgi/~/")
    assert all(public_path_shape_valid(p) for p in (a, own, foreign, "/", "/assets/a.js"))
    print("PASS · offered paths remain literal; arbitrary/private paths become stable keyed Bait paths")


if __name__ == "__main__":
    self_test()
