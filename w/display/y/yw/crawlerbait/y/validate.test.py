"""Independent source/refusal evidence and existing Crawlerbait-local suites."""
from pathlib import Path
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile


def _load(body):
    path = body / 'z/validate.py'
    namespace = {'__file__': str(path), '__name__': 'crawlerbait_validation_witness'}
    exec(compile(path.read_bytes(), str(path), 'exec'), namespace)
    return namespace


def _write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value), encoding='utf-8')


def _fixture(source, body):
    # One complete small generation, independently constructed from the existing
    # carrier law. No production capture, source state or Bait is mutated.
    for role in ('_stomach', '_feed', '_root', '_waste', 'w', 'x', 'z', 'y'):
        (body / role).mkdir(parents=True)
    for member in ('INDEX.yaml', '_cambium.yaml', 'site.json',
                   'z/policy.json', 'z/path-policy.json', 'z/style.css',
                   'y/path_membrane.py', 'RITUALS/organism/RITUAL.md'):
        target = body / member
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source / member, target)
    for member in ('y/capture.py', 'y/migrate_owned_path_membrane.py', 'y/tide.py', 'y/replay.py'):
        (body / member).touch()
    _write(body / 'w/ww/bait.json', {})
    _write(body / 'x/captures/manifest.json', {})
    _write(body / 'z/public/crawlerbait/index.html', {})
    _write(body / 'z/public/crawlerbait/state.json', {})
    _write(body / 'z/public/crawlerbait/traffic.json', {})
    start, end = '2026-10-01T00:00:00Z', '2026-10-01T01:00:00Z'
    _write(body / 'x/checkpoint.json', {
        'last_complete_end': start, 'routes': {},
        'privacy_migration': {'exact_user_agents_removed': True}})
    _write(body / 'x/cursor.json', {
        'version': 2, 'source': 'cloudflare:httpRequestsAdaptive',
        'legacy_404_last_capture_end': start, 'raw_last_capture_end': end,
        'identity': {'key_fingerprint': '1' * 16},
        'path_privacy': {'domain': 'crawlerbait:path:v1',
                         'offered_resolution': 'crawlerbait-owned-public-surface-v1'}})
    _write(body / 'x/state.json', {'version': 6, 'raw_capture_end': end})
    _write(body / 'x/captures/a.traffic.json', {
        'version': 5, 'source': 'cloudflare:httpRequestsAdaptive', 'semantic_filters': [],
        'window': {'start': start, 'end': end},
        'publication_transform': {'beingId': {
            'network_pseudonym_persisted': False, 'exact_user_agent_persisted': False,
            'literal_client_ip_persisted': False, 'key_fingerprint': '1' * 16}},
        'never_captured_fields': ['clientRequestQuery'],
        'published_response': {'data': {'viewer': {'zones': [{'records': [{
            'datetime': '2026-10-01T00:30:00Z', 'beingId': 'a' * 24,
            'clientRequestPath': '/~/' + 'b' * 24,
            'clientRequestHTTPMethodName': 'GET', 'edgeResponseStatus': 200}]}]}}}})
    _write(body / 'x/retained-bootstrap/seal.json', {
        'sealed': True, 'raw_carriers_retired': True, 'current_evidence': '../checkpoint.json'})
    _write(body / 'x/retained-bootstrap/provider-settings.json', {})


def _refusal_cases(body, common, validate_body):
    cases = (
        ('z/policy.json', lambda d: d['query'].update(captured=True), 'query exclusion'),
        ('z/policy.json', lambda d: d['recognition'].update(exact_user_agent_persisted=True), 'private-recognition'),
        ('z/path-policy.json', lambda d: d.update(host_public_artifact_traversed=True), 'public path policy'),
        ('site.json', lambda d: d.update(projection='foreign.json'), 'site membrane'),
        ('x/cursor.json', lambda d: d.update(raw_last_capture_end='wrong'), 'cursor is not exactly covered'),
        ('x/cursor.json', lambda d: d['identity'].update(key_fingerprint='2' * 16), 'cursor identity key'),
        ('x/state.json', lambda d: d.update(raw_capture_end='wrong'), 'state is stale'),
        ('x/checkpoint.json', lambda d: d.update(routes={'/private': {'signatures': {}}}), 'UA signature maps'),
        ('x/captures/a.traffic.json', lambda d: d.update(semantic_filters=['filtered']), 'invalid whole-traffic'),
        ('x/captures/a.traffic.json', lambda d: d['publication_transform']['beingId'].update(literal_client_ip_persisted=True), 'private recognition'),
        ('x/captures/a.traffic.json', lambda d: d.update(never_captured_fields=[]), 'query exclusion/removal'),
        ('x/captures/a.traffic.json', lambda d: d['published_response']['data']['viewer']['zones'][0]['records'][0].update(clientIP='192.0.2.1'), 'non-metabolized public fields'),
        ('x/captures/a.traffic.json', lambda d: d['published_response']['data']['viewer']['zones'][0]['records'][0].update(beingId=''), 'opaque beingId'),
        ('x/captures/a.traffic.json', lambda d: d['published_response']['data']['viewer']['zones'][0]['records'][0].update(clientRequestPath='/private@example.invalid/token'), 'unmediated request path'),
        ('x/retained-bootstrap/seal.json', lambda d: d.update(sealed=False), 'not sealed'),
    )
    for member, change, message in cases:
        path = body / member
        original = path.read_bytes()
        changed = json.loads(original); change(changed); _write(path, changed)
        try:
            validate_body(body, common)
        except AssertionError as exc:
            assert message in str(exc), (member, str(exc))
        else:
            raise AssertionError(f'Crawlerbait accepted changed {member}: {message}')
        finally:
            path.write_bytes(original)
    for member, message in (
        ('w/not-an-address/bait.json', 'raw tetrahedral address'),
        ('w/ww/extra.json', 'non-bait tissue'),
        ('x/retained-bootstrap/unretired.raw.json', 'readable raw files'),
    ):
        path = body / member; _write(path, {})
        try:
            validate_body(body, common)
        except AssertionError as exc:
            assert message in str(exc), (member, str(exc))
        else:
            raise AssertionError(f'Crawlerbait accepted {member}')
        finally:
            path.unlink()
            if member.startswith('w/not-an-address/'):
                path.parent.rmdir()
    capture = json.loads((body / 'x/captures/a.traffic.json').read_text())
    capture['window'] = {'start': 'gap', 'end': '2026-10-01T02:00:00Z'}
    path = body / 'x/captures/b.traffic.json'; _write(path, capture)
    try:
        validate_body(body, common)
    except AssertionError as exc:
        assert 'raw traffic gap' in str(exc)
    else:
        raise AssertionError('Crawlerbait accepted a capture gap')
    finally:
        path.unlink()
    validate_body(body, common)
    return len(cases) + 4


def witness(body, common, operations):
    body = Path(body)
    assert not re.search(r'font(?:-size)?\s*:[^;}]*?(?:\d+(?:\.\d+)?(?:px|rem)|clamp\()', (body / 'y/tide.py').read_text()), 'Crawlerbait static secretion contains an arbitrary font size'
    assert json.loads((body / 'site.json').read_text())['manifestation'].get('background_drag', True) is True, 'Crawlerbait background drag is not true'
    data = json.loads((body / 'z/projection.json').read_text(encoding='utf-8'))
    operations['validate'](data, body, common)
    for key, value in (('source', 'foreign'), ('routes', {}), ('crawlers', {}), ('encounters', {})):
        wrong = {**data, key: value}
        try:
            operations['validate'](wrong, body, common)
        except ValueError:
            continue
        raise AssertionError(f'Crawlerbait accepted changed projection {key}')
    module = _load(body)
    report = module['validate_body'](body, common)
    with tempfile.TemporaryDirectory(prefix='crawlerbait-source-witness-') as temporary:
        copied = Path(temporary) / 'body'
        _fixture(body, copied)
        module['validate_body'](copied, common)
        report['refusal_cases'] = _refusal_cases(copied, common, module['validate_body']) + 4
    local_suites = 0
    for member, args in (
        ('y/capture.py', ['--self-test']), ('y/tide.py', ['--self-test']),
        ('y/tide.test.py', []), ('y/replay.py', ['--self-test']),
    ):
        result = subprocess.run([sys.executable, str(body / member), *args],
                                cwd=body, env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'},
                                capture_output=True, text=True)
        if result.returncode:
            raise AssertionError(result.stderr or f'Crawlerbait local witness failed: {member}')
        local_suites += 1
    report['local_suites'] = local_suites
    print('Crawlerbait owner witness: ' + json.dumps(report, sort_keys=True))
    return report


def integration(body, capabilities):
    for route in ('crawlerbait/index.html', 'crawlerbait/state.json'):
        assert route in capabilities['public_files'], 'Crawlerbait machine-facing static hub missing'
        assert (capabilities['artifact'] / route).is_file(), 'Crawlerbait static reef was not secreted into artifact'
    commands = [
        [sys.executable, str(body / 'y/path_privacy.py')],
        [sys.executable, str(body / 'y/migrate_path_privacy.py'), '--self-test'],
        ['node', str(body / 'z/render.test.cjs'), str(capabilities['recursive_fold']),
         str(capabilities['navigation']), str(capabilities['ui_grid'])],
    ]
    grid_test = """const assert=require('node:assert/strict'),fs=require('node:fs'),G=require(process.argv[1]);
const manifest=JSON.parse(fs.readFileSync(process.argv[2]+'/site.json'));
const raw=JSON.parse(fs.readFileSync(process.argv[2]+'/'+manifest.ui_grid));
const s=G.normalizeState(raw),box=id=>G.fieldInfo(s,id).bounds;
assert.deepEqual(box('timeline'),{x:.25,y:.875,w:.5,h:.125});
assert.deepEqual(box('compass'),{x:.75,y:.5,w:.25,h:.5});
assert.deepEqual(box('description'),{x:0,y:.25,w:.25,h:.75});
assert.deepEqual(box('viewport'),{x:.25,y:.25,w:.625,h:.625});
assert.equal(s.fields.viewport.cells.length,25);
assert.deepEqual(s.fields.viewport.cells.filter(c=>s.fields.compass.cells.includes(c)),['zxw','zxy','zzw']);"""
    commands.append(['node', '-e', grid_test, str(capabilities['ui_grid']), str(body)])
    for command in commands:
        result = subprocess.run(command, cwd=body,
                                env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1',
                                     'CRAWLERBAIT_SITE_PUBLIC': str(capabilities['site_public'])},
                                capture_output=True, text=True)
        if result.returncode:
            raise AssertionError(result.stderr or result.stdout or 'Crawlerbait integration witness failed')
