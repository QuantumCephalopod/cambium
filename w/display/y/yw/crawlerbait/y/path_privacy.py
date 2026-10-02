#!/usr/bin/env python3
"""Stable public path membrane for Crawlerbait.

Only paths that are actually present in the current generated Display + site
public artifact remain literal. Namespace membership alone is never enough:
an arbitrary request beneath /assets/, /papers-shadow/ or /crawlerbait/ is
still private sensing unless that exact public path is currently offered.
Everything else becomes a keyed opaque Bait path while preserving only the
small structural prefixes required by the existing Being-kind law.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
import hashlib
import hmac
import importlib.util
import re

PATH_DOMAIN = "crawlerbait:path:v1"
TOKEN_RE = re.compile(r"^[0-9a-f]{24}$")

OWN_APERTURES = (
    "/__live/",
    "/repos/self-similar-systems/",
)
FOREIGN_PORES = (
    "/cdn-cgi/",
)

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[5]
SITE_PUBLIC_PATH = REPO_ROOT / "y" / "site-public.py"


def canonical_path(value) -> str:
    return value if isinstance(value, str) else str(value or "")


@lru_cache(maxsize=1)
def offered_public_paths() -> frozenset[str]:
    """Exact current public artifact paths, including directory index aliases."""
    spec = importlib.util.spec_from_file_location(
        "crawlerbait_display_site_public",
        SITE_PUBLIC_PATH,
    )
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load public membrane builder: {SITE_PUBLIC_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    offered = set()
    for rel in module.artifact_files():
        rel = str(rel).lstrip("/")
        public = "/" + rel
        offered.add(public)
        if rel == "index.html":
            offered.add("/")
        elif rel.endswith("/index.html"):
            offered.add("/" + rel[:-len("index.html")])
    return frozenset(offered)


def offered(path: str) -> bool:
    path = canonical_path(path)
    return path in offered_public_paths()


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
    """Mechanical witness that a public path is either exactly offered or opaque."""
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
    current = offered_public_paths()
    assert "/" in current and offered("/")
    assets = sorted(p for p in current if p.startswith("/assets/"))
    assert assets, "current Display artifact must expose at least one exact asset"
    exact_asset = assets[0]
    assert public_path(key, exact_asset) == exact_asset

    # Namespace membership is not an offer. These must never remain readable
    # merely because they sit beneath a public-looking prefix.
    for raw in (
        "/assets/.env",
        "/assets/alice@example.org/reset-token",
        "/papers-shadow/alice@example.org/private",
        "/crawlerbait/alice@example.org/private",
    ):
        encoded = public_path(key, raw)
        assert encoded.startswith("/~/")
        assert "alice" not in encoded and "example" not in encoded

    a = public_path(key, "/reset/alice@example.org/abc123")
    b = public_path(key, "/reset/alice@example.org/abc123")
    c = public_path(key, "/reset/bob@example.org/abc123")
    assert a == b and a != c and a.startswith("/~/")
    assert "alice" not in a and "example" not in a

    own = public_path(key, "/__live/private/site/123")
    assert own.startswith("/__live/~/")
    foreign = public_path(key, "/cdn-cgi/trace/private")
    assert foreign.startswith("/cdn-cgi/~/")
    assert all(public_path_shape_valid(p) for p in (a, own, foreign, "/", exact_asset))
    print(
        "PASS · only exact current public artifact paths remain literal; "
        "namespace-only and arbitrary/private paths become stable keyed Bait paths"
    )


if __name__ == "__main__":
    self_test()
