# NUTRIENT — Discriminate residue after full artifact replacement

status: OPEN / observed replacement counterexample
owner: cambium
source: self-similarity digestion, local full-artifact witness, 2026-10-29

After successive full publication builds to `/workspace/scratch/bc73126ec025/digest-site`, exact verification observed both the current `c53bf85ed455ba00` bundle and residual files under prior `d5ebae89f145a051`. A subsequent rebuild of the same target still showed the residue. Earlier operations included overlapping build/check activity and a source update, so the responsible operation and filesystem behavior are not established.

A fresh output built and compared byte-exactly. A small sequential `artifact.replace` counterexample in both `/tmp` and the same workspace parent retained only its new generation. Those bounded passes do not explain the full-artifact observation or establish concurrency safety.

Exit: reproduce or rule out the residue with two distinct complete immutable generations and isolated, non-overlapping real writer invocations on the affected substrate; distinguish other writers, workspace synchronization and replacement itself. Preserve prior outputs and source; repair the smallest witnessed cause and verify exact file-set equality. Do not treat this observation as proof of data loss or claim a cause without evidence.
