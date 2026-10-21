#!/usr/bin/env python3
"""Independent Tide evidence: writer fixed points and portable address derivation."""
from contextlib import ExitStack, redirect_stdout
from pathlib import Path
import importlib.util
import io
import json
import sys
import tempfile
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import tide as T

spec = importlib.util.spec_from_file_location('owned_path_migration', HERE / 'migrate_owned_path_membrane.py')
M = importlib.util.module_from_spec(spec)
spec.loader.exec_module(M)
C = M.C


def prior_addresses(paths):
    """Frozen pre-optimization law, used only on small independent populations."""
    paths = sorted(set(paths))
    out = {}
    for path in paths:
        depth = 1
        while any(other != path and T.identity_prefix(other, depth) == T.identity_prefix(path, depth)
                  for other in paths):
            depth += 1
        out[path] = T.identity_prefix(path, depth)
    return out


class AddressWork(unittest.TestCase):
    def test_empty_singleton_duplicates_and_input_order(self):
        for paths in [[], ['/one'], ['/one', '/one'], ['/b', '/a', '/b']]:
            self.assertEqual(list(T.bait_addresses(paths).items()), list(prior_addresses(paths).items()))
        paths = [f'/fixture/{i}' for i in range(120)]
        self.assertEqual(T.bait_addresses(iter(reversed(paths))), prior_addresses(paths))

    def test_real_generation_keeps_every_admitted_address(self):
        projection = json.loads((T.ROOT / 'z/projection.json').read_text(encoding='utf-8'))
        expected = {r['path']: r['address'] for r in projection['routes']}
        self.assertEqual(T.bait_addresses(expected), expected)

    def test_extension_beyond_python_recursion_depth_has_no_internal_cap(self):
        calls = []
        def block(path, index):
            calls.append((path, index))
            if path == '/c':
                return 'z' * 128
            if index < 10:
                return 'w' * 128
            return ('x' if path == '/a' else 'y') + 'w' * 127
        with patch.object(T, 'identity_block', side_effect=block):
            result = T.bait_addresses(['/c', '/b', '/a'])
        self.assertEqual(result, {'/a': 'w' * 1280 + 'x', '/b': 'w' * 1280 + 'y', '/c': 'z'})
        self.assertEqual(len(calls), 23)
        self.assertEqual(len(calls), len(set(calls)))

    def test_each_real_identity_block_is_computed_once(self):
        paths = [f'/operation-count/{i}' for i in range(1000)]
        with patch.object(T, 'identity_block', wraps=T.identity_block) as blocks:
            result = T.bait_addresses(paths)
        self.assertLess(max(map(len, result.values())), 128)
        self.assertEqual(blocks.call_count, len(paths))

    def test_one_output_generation_reuses_work_and_next_generation_reacquires(self):
        state = {'routes': {p: T.empty_route(p) for p in ['/fixture/a', '/fixture/b']},
                 'crawlers': {}, 'encounters': [], 'raw_requests': 0,
                 'raw_capture_start': None, 'raw_capture_end': None, 'legacy_404_through': None}
        with tempfile.TemporaryDirectory(prefix='tide-generation-') as temporary, ExitStack() as stack:
            root = Path(temporary)
            for name, value in {'BAIT_ROOT': root / 'baits', 'PUBLIC_ROOT': root / 'public',
                                'STATE_PATH': root / 'state.json', 'PROJECTION_PATH': root / 'projection.json'}.items():
                stack.enter_context(patch.object(T, name, value))
            stack.enter_context(patch.object(T, 'raw_public_manifest', return_value={'files': []}))
            addresses = stack.enter_context(patch.object(T, 'bait_addresses', wraps=T.bait_addresses))
            projections = stack.enter_context(patch.object(T, 'projection_from', wraps=T.projection_from))
            for count in (2, 3):
                if count == 3:
                    state['routes']['/fixture/c'] = T.empty_route('/fixture/c')
                T.write_outputs(state)
                self.assertEqual(addresses.call_count, count - 1)
                self.assertEqual(projections.call_count, count - 1)
                self.assertEqual((root / 'projection.json').read_bytes(), (root / 'public/crawlerbait/state.json').read_bytes())
                self.assertEqual(len(list((root / 'baits').glob('*/bait.json'))), count)


class WriterCycle(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.root = Path(self.stack.enter_context(tempfile.TemporaryDirectory(prefix='tide-writers-')))
        self.captures = self.root / 'captures'; self.captures.mkdir()
        self.cursor = self.root / 'cursor.json'
        self.checkpoint = self.root / 'checkpoint.json'
        self.manifest = self.captures / 'manifest.json'
        for module, attributes in [(C, {'CURSOR_PATH': self.cursor, 'POLICY_PATH': self.root / 'policy.json'}),
                                   (M, {'CAPTURE_ROOT': self.captures, 'CURSOR_PATH': self.cursor,
                                        'CHECKPOINT_PATH': self.checkpoint, 'MANIFEST_PATH': self.manifest})]:
            for name, value in attributes.items():
                self.stack.enter_context(patch.object(module, name, value))
        self.secret = '01' * 32
        self.stack.enter_context(patch.dict('os.environ', {'CRAWLERBAIT_ID_KEY': self.secret,
            'CLOUDFLARE_ANALYTICS_TOKEN': 'local-provider-fixture', 'CLOUDFLARE_ZONE_TAG': 'local-zone-fixture'}))
        C.write_json(self.cursor, {'version': 2, 'raw_last_capture_end': '2026-10-01T00:00:00Z'})
        C.write_json(C.POLICY_PATH, {'settle_delay_minutes': 0, 'max_window_hours': 6})
        M.write_json(self.checkpoint, {'routes': {}, 'privacy_migration': {
            'path_domain': M.P.PATH_DOMAIN, 'offered_resolution': M.P.OFFERED_RESOLUTION,
            'raw_unoffered_paths_removed': True, 'exact_user_agents_removed': True}})
        M.write_json(self.manifest, {'path_law': {'domain': M.P.PATH_DOMAIN,
            'offered_resolution': M.P.OFFERED_RESOLUTION, 'foreign_site_holon_paths_literal': False,
            'already_opaque_identity_preserved': True}})
        # Only the provider boundary is substituted. Both actual CLI writers,
        # their policy construction and filesystem writes remain production code.
        self.provider = self.stack.enter_context(patch.object(C, 'graphql', return_value={}))
        self.stack.enter_context(patch.object(C, 'zone_settings', return_value={
            'availableFields': list(C.CORE_FIELDS), 'maxNumberOfFields': 70,
            'maxDuration': 86400, 'maxPageSize': 10000, 'notOlderThan': 2678400}))
        self.stack.enter_context(patch.object(C, 'dataset_record_type', return_value=({}, 'Record')))
        self.stack.enter_context(patch.object(C, 'resolve_available_field', side_effect=lambda types, record, field: (field,)))
        self.stack.enter_context(patch.object(C, 'freeze_window', return_value=[]))

    def capture(self, now):
        with patch.object(sys, 'argv', ['capture.py', '--write', '--now', now]), redirect_stdout(io.StringIO()):
            C.main()

    def migrate(self):
        output = io.StringIO()
        with patch.object(sys, 'argv', ['migration.py', '--write']), redirect_stdout(output):
            M.main()
        return json.loads(output.getvalue())

    def snapshot(self):
        return {p.relative_to(self.root).as_posix(): p.read_bytes() for p in self.root.rglob('*') if p.is_file()}

    def test_current_capture_migration_cycle_is_byte_idempotent(self):
        for now in ['2026-10-01T06:00:00Z', '2026-10-01T12:00:00Z']:
            self.capture(now)
            before = self.snapshot()
            report = self.migrate()
            self.assertEqual(report['traffic_capture_files_changed'], 0)
            self.assertEqual(report['checkpoint_paths_changed'], 0)
            self.assertEqual(self.snapshot(), before)
            self.migrate()
            self.assertEqual(self.snapshot(), before)

    def test_stale_description_repairs_once_without_rewriting_evidence(self):
        self.capture('2026-10-01T06:00:00Z')
        cursor = C.read_json(self.cursor)
        cursor['path_privacy']['scheme'] = 'prior migration wording'
        C.write_json(self.cursor, cursor)
        before = self.snapshot(); self.migrate(); after = self.snapshot()
        self.assertEqual([p for p in before if before[p] != after[p]], ['cursor.json'])
        self.migrate(); self.assertEqual(self.snapshot(), after)

    def test_actual_old_path_evidence_still_migrates_then_stabilizes(self):
        self.capture('2026-10-01T06:00:00Z')
        path = self.captures / 'legacy.traffic.json'
        M.write_json(path, {'version': 5, 'publication_transform': {'clientRequestPath': {
            'domain': M.P.PATH_DOMAIN, 'raw_unoffered_path_persisted': False,
            'offered_resolution': 'earlier-membrane'}},
            'published_response': {'data': {'viewer': {'zones': [{'records': [
                {'clientRequestPath': '/foreign-fixture-path'}]}]}}}})
        report = self.migrate(); self.assertEqual(report['traffic_capture_files_changed'], 1)
        self.assertEqual(report['traffic_paths_changed'], 1)
        self.assertTrue(M.records(M.read_json(path))[0]['clientRequestPath'].startswith('/~/'))
        before = self.snapshot(); self.migrate(); self.assertEqual(self.snapshot(), before)

    def test_capture_still_refuses_key_rotation_before_provider_access(self):
        self.capture('2026-10-01T06:00:00Z'); self.provider.reset_mock(); before = self.snapshot()
        with patch.dict('os.environ', {'CRAWLERBAIT_ID_KEY': '02' * 32}):
            with self.assertRaisesRegex(SystemExit, 'refusing to sever'):
                self.capture('2026-10-01T12:00:00Z')
        self.provider.assert_not_called(); self.assertEqual(self.snapshot(), before)


if __name__ == '__main__':
    unittest.main()
