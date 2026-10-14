#!/usr/bin/env python3
"""Crawlerbait-owned public path membrane.

Cloudflare traffic is environment input. Only public apertures owned by the
Crawlerbait organism may remain literal; every other host path becomes one
stable opaque Bait. Historical opaque shapes stay valid as already-mediated
state so they are never re-HMACed during a membrane revision.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
import hashlib
import hmac
import re

PATH_DOMAIN = "crawlerbait:path:v1"
OFFERED_RESOLUTION = "crawlerbait-owned-public-surface-v1"
TOKEN_RE = re.compile(r"^[0-9a-f]{24}$")
LEGACY_OPAQUE_PREFIXES = (
    "/__live/~/",
    "/repos/self-similar-systems/~/",
    "/cdn-cgi/~/",
)

HERE = Path(__file__).resolve().parent
CRAWLERBAIT_ROOT = HERE.parent
OWN_PUBLIC_ROOT = CRAWLERBAIT_ROOT / "z" / "public" / "crawlerbait"
DERIVED_PREFIXES = ("/crawlerbait/bait/", "/crawlerbait/receipt/")


def canonical_path(value) -> str:
    return value if isinstance(value, str) else str(value or "")


@lru_cache(maxsize=1)
def offered_public_paths() -> frozenset[str]:
    offered = set()
    if not OWN_PUBLIC_ROOT.is_dir():
        return frozenset(offered)
    for source in sorted(OWN_PUBLIC_ROOT.rglob("*")):
        if not source.is_file():
            continue
        rel = source.relative_to(OWN_PUBLIC_ROOT).as_posix()
        public = "/crawlerbait/" + rel
        if public.startswith(DERIVED_PREFIXES):
            continue
        offered.add(public)
        if rel == "index.html":
            offered.add("/crawlerbait/")
        elif rel.endswith("/index.html"):
            offered.add("/crawlerbait/" + rel[:-len("index.html")])
    return frozenset(offered)


def offered(path: str) -> bool:
    return canonical_path(path) in offered_public_paths()


def opaque_path_shape_valid(path: str) -> bool:
    path = canonical_path(path)
    if path.startswith("/~/"):
        return bool(TOKEN_RE.fullmatch(path[3:]))
    for marker in LEGACY_OPAQUE_PREFIXES:
        if path.startswith(marker):
            return bool(TOKEN_RE.fullmatch(path[len(marker):]))
    return False


def _token(key: bytes, raw: str) -> str:
    return hmac.new(
        key,
        (PATH_DOMAIN + "\x00" + raw).encode("utf-8", "replace"),
        hashlib.sha256,
    ).hexdigest()[:24]


def public_path(key: bytes, raw) -> str:
    path = canonical_path(raw)
    if offered(path):
        return path
    return "/~/" + _token(key, path)


def public_path_shape_valid(path: str) -> bool:
    path = canonical_path(path)
    return offered(path) or opaque_path_shape_valid(path)


def self_test() -> None:
    key = bytes.fromhex("01" * 32)
    current = offered_public_paths()
    assert "/crawlerbait/" in current
    assert "/crawlerbait/state.json" in current
    assert "/crawlerbait/traffic.json" in current
    assert "/" not in current
    assert not any(p.startswith("/assets/") for p in current)
    assert not any(p.startswith(DERIVED_PREFIXES) for p in current)

    assert public_path(key, "/crawlerbait/state.json") == "/crawlerbait/state.json"
    for raw in (
        "/",
        "/assets/abcd/site-organism-papers.js",
        "/papers-shadow/private",
        "/reset/alice@example.org/abc123",
        "/crawlerbait/bait/assets/example/",
        "/__live/private/site/123",
        "/cdn-cgi/trace/private",
    ):
        encoded = public_path(key, raw)
        assert encoded.startswith("/~/")
        assert encoded != raw

    a = public_path(key, "/reset/alice@example.org/abc123")
    b = public_path(key, "/reset/alice@example.org/abc123")
    c = public_path(key, "/reset/bob@example.org/abc123")
    assert a == b and a != c
    assert "alice" not in a and "example" not in a

    assert opaque_path_shape_valid("/~/" + "a" * 24)
    assert opaque_path_shape_valid("/__live/~/" + "b" * 24)
    assert opaque_path_shape_valid("/cdn-cgi/~/" + "c" * 24)
    print("PASS · Crawlerbait literal paths are organism-owned; foreign host paths are opaque")


if __name__ == "__main__":
    self_test()
