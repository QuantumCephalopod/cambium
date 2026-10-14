#!/usr/bin/env python3
"""Gate the materializer's completion wake against committed publication state.

Only current, unpublished Papers shadow bytes need another Pages deployment.
This reads GitHub's successful deployment witness; it keeps no parallel ledger.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import re
import subprocess
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
REPOSITORY = "self-similar-systems/cambium"
MATERIALIZER = ".github/workflows/papers-shadow-materialize.yml"
SHADOW = "w/display/y/yy/papers/public/papers-shadow/current.json"


def trusted_completion(event: dict, repository: str) -> bool:
    run = event.get("workflow_run") or {}
    return (
        repository == REPOSITORY
        and run.get("conclusion") == "success"
        and run.get("event") == "workflow_dispatch"
        and run.get("head_branch") == "main"
        and (run.get("head_repository") or {}).get("full_name") == REPOSITORY
        and run.get("path") == MATERIALIZER
    )


def publication_needed(candidate: str | None, current: str | None,
                       deployed: str | None) -> tuple[bool, str]:
    if candidate is None or current is None:
        raise RuntimeError("The committed Papers shadow is missing")
    if candidate != current:
        return False, "superseded shadow; the current completion owns publication"
    if candidate == deployed:
        return False, "Papers shadow already has a successful Pages deployment"
    return True, "current Papers shadow needs its Pages deployment"


def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True).strip()


def shadow_blob(revision: str) -> str | None:
    # Resolve the tree entry only; no historical shadow bytes are downloaded.
    git("rev-parse", "--verify", f"{revision}^{{commit}}")
    result = subprocess.run(
        ["git", "rev-parse", "--verify", f"{revision}:{SHADOW}"],
        cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    return result.stdout.strip() if result.returncode == 0 else None


def github(path: str) -> list:
    request = urllib.request.Request(
        f"https://api.github.com/repos/{REPOSITORY}/{path}",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {os.environ['GH_TOKEN']}",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        value = json.load(response)
    if not isinstance(value, list):
        raise RuntimeError("GitHub did not return a publication witness list")
    return value


def last_successful_deployment(api=github) -> str | None:
    query = urllib.parse.urlencode({"environment": "github-pages", "per_page": 20})
    deployments = api(f"deployments?{query}")
    if not deployments:
        return None
    for deployment in sorted(deployments, key=lambda d: d["created_at"], reverse=True):
        deployment_id = deployment["id"]
        if not isinstance(deployment_id, int) or deployment_id <= 0:
            raise RuntimeError("Invalid GitHub deployment identity")
        statuses = api(f"deployments/{deployment_id}/statuses?per_page=20")
        # Older successful deployments can have a later 'inactive' status.
        if any(status.get("state") == "success" for status in statuses):
            revision = deployment["sha"]
            if not re.fullmatch(r"[0-9a-f]{40}", revision):
                raise RuntimeError("Invalid deployed commit identity")
            return revision
    raise RuntimeError("No successful Pages baseline in the bounded deployment window")


def main() -> None:
    needed, reason = True, "ordinary push or deliberate dispatch"
    if os.environ["GITHUB_EVENT_NAME"] == "workflow_run":
        event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text(encoding="utf-8"))
        if not trusted_completion(event, os.environ["GITHUB_REPOSITORY"]):
            needed, reason = False, "not a successful canonical-main materializer completion"
        else:
            # checkout is pinned to this Pages event's SHA, never the upstream run's
            # pre-materialization head SHA. Compare with the live canonical tree.
            git("fetch", "origin", "refs/heads/main:refs/remotes/origin/main")
            candidate = shadow_blob("HEAD")
            current = shadow_blob("refs/remotes/origin/main")
            if candidate != current:
                needed, reason = publication_needed(candidate, current, None)
            else:
                deployed_sha = last_successful_deployment()
                deployed = shadow_blob(deployed_sha) if deployed_sha else None
                # Source state can advance while deployment history is read.
                # Recheck before selecting this event's fixed checkout to publish.
                git("fetch", "origin", "refs/heads/main:refs/remotes/origin/main")
                current = shadow_blob("refs/remotes/origin/main")
                needed, reason = publication_needed(candidate, current, deployed)
    print(reason)
    with Path(os.environ["GITHUB_OUTPUT"]).open("a", encoding="utf-8") as output:
        output.write(f"publish={'true' if needed else 'false'}\n")


if __name__ == "__main__":
    main()
