# ENCOUNTER — PAT provenance correction — 2026-09-26

source: Philipp, chat correction

Correction:
- The fine-grained GitHub PAT was created through the organization owner account prb8.
- It was intentionally scoped to self-similar-systems/cambium.
- Do not diagnose the missing materializer dispatch as an outside-collaborator / wrong-token-class problem.

Current pressure:
The live Worker must expose or retry a failed GitHub workflow dispatch instead of swallowing it as a false boolean while returning ok:true to Papers.
