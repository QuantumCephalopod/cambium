#!/usr/bin/env python3
"""Witness publication replay, no-change, supersession and source boundaries."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

MODULE = Path(__file__).with_name("pages-actuation.py")
spec = importlib.util.spec_from_file_location("pages_actuation", MODULE)
actuation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(actuation)


def completion():
    return {"workflow_run": {
        "conclusion": "success", "event": "workflow_dispatch", "head_branch": "main",
        "head_repository": {"full_name": actuation.REPOSITORY}, "path": actuation.MATERIALIZER,
    }}


class PublicationTest(unittest.TestCase):
    def test_changed_shadow_and_failed_push_tail_retry_need_publication(self):
        self.assertTrue(actuation.publication_needed("new", "new", "old")[0])

    def test_no_change_and_successful_replay_do_not_deploy(self):
        self.assertFalse(actuation.publication_needed("new", "new", "new")[0])

    def test_superseded_materialization_coalesces(self):
        self.assertFalse(actuation.publication_needed("old", "new", "old")[0])

    def test_first_shadow_needs_publication(self):
        self.assertTrue(actuation.publication_needed("new", "new", None)[0])

    def test_missing_current_state_is_not_a_no_change(self):
        with self.assertRaises(RuntimeError):
            actuation.publication_needed(None, "new", None)
        with self.assertRaises(RuntimeError):
            actuation.publication_needed("new", None, None)

    def test_only_canonical_successful_main_materializer_is_trusted(self):
        self.assertTrue(actuation.trusted_completion(completion(), actuation.REPOSITORY))
        for key, value in [("conclusion", "failure"), ("conclusion", "cancelled"),
                           ("event", "pull_request"), ("head_branch", "staging/untrusted"),
                           ("path", ".github/workflows/lookalike.yml")]:
            event = copy.deepcopy(completion())
            event["workflow_run"][key] = value
            self.assertFalse(actuation.trusted_completion(event, actuation.REPOSITORY))
        event = completion()
        event["workflow_run"]["head_repository"]["full_name"] = "foreign/cambium"
        self.assertFalse(actuation.trusted_completion(event, actuation.REPOSITORY))
        self.assertFalse(actuation.trusted_completion(completion(), "QuantumCephalopod/cambium"))
        self.assertFalse(actuation.trusted_completion({"workflow_run": None}, actuation.REPOSITORY))

    def test_latest_success_is_found_even_after_inactivation(self):
        sha = "a" * 40
        calls = []
        def api(path):
            calls.append(path)
            if path.startswith("deployments?"):
                return [{"id": 1, "created_at": "2026-09-29", "sha": "b" * 40},
                        {"id": 2, "created_at": "2026-09-30", "sha": sha}]
            return [{"state": "inactive"}, {"state": "success"}]
        self.assertEqual(actuation.last_successful_deployment(api), sha)
        self.assertIn("deployments/2/statuses?per_page=20", calls)
        self.assertEqual(len(calls), 2)

    def test_failed_latest_deployment_does_not_erase_previous_success(self):
        def api(path):
            if path.startswith("deployments?"):
                return [{"id": 2, "created_at": "2026-09-30", "sha": "b" * 40},
                        {"id": 1, "created_at": "2026-09-29", "sha": "a" * 40}]
            return [{"state": "failure" if "/2/" in path else "success"}]
        self.assertEqual(actuation.last_successful_deployment(api), "a" * 40)

    def test_unknown_baseline_is_failure_not_silent_publication(self):
        def api(path):
            return ([{"id": 1, "created_at": "2026-09-30", "sha": "a" * 40}]
                    if path.startswith("deployments?") else [{"state": "failure"}])
        with self.assertRaises(RuntimeError):
            actuation.last_successful_deployment(api)

    def test_empty_deployment_history_is_a_first_publication(self):
        self.assertIsNone(actuation.last_successful_deployment(lambda path: []))

    def test_push_and_dispatch_keep_the_existing_publication_path(self):
        for event_name in ("push", "workflow_dispatch"):
            with tempfile.TemporaryDirectory() as directory:
                output = Path(directory) / "output"
                with patch.dict("os.environ", {"GITHUB_EVENT_NAME": event_name, "GITHUB_OUTPUT": str(output)}):
                    actuation.main()
                self.assertEqual(output.read_text(), "publish=true\n")

    def run_completion(self, blobs, expected, event=None, baseline_error=None):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "output"
            source = Path(directory) / "event.json"
            source.write_text(json.dumps(event or completion()))
            environment = {"GITHUB_EVENT_NAME": "workflow_run", "GITHUB_EVENT_PATH": str(source),
                           "GITHUB_REPOSITORY": actuation.REPOSITORY, "GITHUB_OUTPUT": str(output)}
            with patch.dict("os.environ", environment), patch.object(actuation, "git"), \
                 patch.object(actuation, "shadow_blob", side_effect=blobs), \
                 patch.object(actuation, "last_successful_deployment", return_value="a" * 40,
                              side_effect=baseline_error) as baseline:
                if baseline_error:
                    with self.assertRaises(RuntimeError):
                        actuation.main()
                    self.assertFalse(output.exists())
                else:
                    actuation.main()
                    self.assertEqual(output.read_text(), f"publish={expected}\n")
                return baseline.call_count

    def test_completion_retries_a_committed_but_unpublished_shadow(self):
        self.run_completion(["new", "new", "old", "new"], "true")

    def test_completion_replay_emits_no_publication(self):
        self.run_completion(["new", "new", "new", "new"], "false")

    def test_source_advancing_during_baseline_lookup_coalesces(self):
        self.run_completion(["old", "old", "older", "new"], "false")

    def test_obsolete_completion_needs_no_deployment_api_lookup(self):
        self.assertEqual(self.run_completion(["old", "new"], "false"), 0)

    def test_failed_upstream_cannot_reach_publication_or_api(self):
        event = completion()
        event["workflow_run"]["conclusion"] = "failure"
        self.assertEqual(self.run_completion([], "false", event), 0)

    def test_api_failure_does_not_manufacture_publish_output(self):
        self.run_completion(["new", "new"], None,
                            baseline_error=RuntimeError("provider unavailable"))


if __name__ == "__main__":
    unittest.main()
