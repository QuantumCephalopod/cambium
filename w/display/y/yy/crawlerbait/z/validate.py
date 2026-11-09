"""Crawlerbait owns projection acceptance and its explicit full-source witness."""
from pathlib import Path
from types import SimpleNamespace
import json


def _local_module(body, member):
    path = body / member
    namespace = {'__file__': str(path), '__name__': 'crawlerbait_owned_validation'}
    exec(compile(path.read_bytes(), str(path), 'exec'), namespace)
    return namespace


def validate(data, body, common):
    # Ordinary discovery checks the existing public carrier, not all source history.
    # Full-source and independent runtime obligations run once through the witness.
    if not isinstance(data, dict) or data.get('source') != 'crawlerbait/x/state.json':
        raise ValueError('Crawlerbait projection source boundary changed')
    for key in ('routes', 'crawlers', 'encounters'):
        if not isinstance(data.get(key), list):
            raise ValueError(f'Crawlerbait projection {key} is not a population')
    return data


def validate_body(body, common):
    crawler = Path(body)
    manifest = json.loads((crawler / 'site.json').read_text(encoding='utf-8'))
    pathmembrane = SimpleNamespace(**_local_module(crawler, 'y/path_membrane.py'))
    count = 0
    def check(condition, why):
        nonlocal count
        count += 1
        if not condition:
            raise AssertionError(why)

    # Crawlerbait must be an actual independently re-enterable holon, not a loose site module.
    cindex=common['load_yaml'](crawler/'INDEX.yaml'); common['validate_index'](cindex)
    check({g:cindex[g]['noun'] for g in 'wxzy'}=={'w':'Baits','x':'Traces','z':'Membrane','y':'Tide'},'Crawlerbait local phenotype changed')
    common['validate_cambium'](common['load_yaml'](crawler/'_cambium.yaml'),'crawlerbait/_cambium.yaml')
    check((crawler/'RITUALS'/'organism'/'RITUAL.md').is_file(),'Crawlerbait local ritual receptor missing')
    for shell in ('_stomach','_feed','_root','_waste'):
        check((crawler/shell).is_dir(),f'Crawlerbait lifecycle shell missing {shell}')
    for gene in 'wxzy':
        check((crawler/gene).is_dir(),f'Crawlerbait realized child missing {gene}')
    forbidden_loose={'bait','projection.json','render.js','style.css','tide.py'}
    check(not ({p.name for p in crawler.iterdir()} & forbidden_loose),'Crawlerbait active tissue leaked into differentiated root')
    check(manifest['projection']=='z/projection.json' and manifest['renderer']=='z/render.js' and manifest['style']=='z/style.css','Crawlerbait site membrane does not point into Membrane tissue')
    check((crawler/'x'/'state.json').is_file(),'Crawlerbait derived trace state missing')
    check((crawler/'x'/'checkpoint.json').is_file(),'Crawlerbait trace checkpoint missing')
    check((crawler/'x'/'cursor.json').is_file(),'Crawlerbait capture cursor missing')
    check((crawler/'x'/'captures'/'manifest.json').is_file(),'Crawlerbait capture manifest missing')
    check((crawler/'z'/'policy.json').is_file(),'Crawlerbait membrane policy missing')
    crawler_style=(crawler/'z'/'style.css').read_text(encoding='utf-8')
    check('top:calc(var(--display-safe-top)' not in crawler_style and 'bottom:calc(var(--display-safe-bottom)' not in crawler_style,'Crawlerbait retained direct safe-area pixel authority instead of canonical UI fields')
    policy=json.loads((crawler/'z'/'policy.json').read_text(encoding='utf-8'))
    recognition=policy.get('recognition') or {}
    phenotype=policy.get('phenotype') or {}
    query_policy=policy.get('query') or {}
    check((crawler/'z'/'path-policy.json').is_file(),'Crawlerbait organism-local path policy missing')
    path_policy=json.loads((crawler/'z'/'path-policy.json').read_text(encoding='utf-8'))
    check(
        policy.get('version')==6
        and recognition.get('scheme')=='hmac-sha256'
        and recognition.get('domain')=='crawlerbait:clientIP:v1'
        and recognition.get('key_epoch')=='v1'
        and recognition.get('literal_client_ip_persisted') is False
        and recognition.get('network_pseudonym_persisted') is False
        and recognition.get('exact_user_agent_persisted') is False
        and recognition.get('public_identity')=='opaque artwork-local beingId',
        'Crawlerbait private-recognition policy drifted'
    )
    check(
        query_policy.get('captured') is False
        and query_policy.get('field')=='clientRequestQuery',
        'Crawlerbait query exclusion policy drifted'
    )
    check(
        phenotype.get('raw_provider_values_persisted') is False
        and phenotype.get('exact_event_join_claimed') is False,
        'Crawlerbait phenotype publication policy drifted'
    )
    check(
        path_policy.get('domain')=='crawlerbait:path:v1'
        and path_policy.get('raw_unoffered_path_persisted') is False
        and path_policy.get('crawlerbait_owned_public_paths_literal') is True
        and path_policy.get('offered_resolution')=='crawlerbait-owned-public-surface-v1'
        and path_policy.get('foreign_site_holon_paths_literal') is False
        and path_policy.get('host_public_artifact_traversed') is False,
        'Crawlerbait public path policy drifted'
    )
    check((crawler/'y'/'capture.py').is_file(),'Crawlerbait provider capture missing')
    check((crawler/'y'/'path_membrane.py').is_file(),'Crawlerbait organism-local path membrane missing')
    check((crawler/'y'/'migrate_owned_path_membrane.py').is_file(),'Crawlerbait organism-boundary migration enzyme missing')
    check((crawler/'y'/'tide.py').is_file(),'Crawlerbait local tide missing')
    check((crawler/'y'/'replay.py').is_file(),'Crawlerbait local replay missing')
    check(not (crawler/'y'/'provider_raw_once.py').exists(),'obsolete one-time provider-raw freezer still exists')
    check(not (crawler/'z'/'provider-raw-public.pem').exists(),'obsolete provider-raw encryption key still exists')
    check(not (crawler/'y'/'backfill.py').exists(),'Crawlerbait historical backfill remains active physiology')
    check((crawler/'z'/'public'/'crawlerbait'/'index.html').is_file(),'Crawlerbait membrane public reef missing')

    checkpoint=json.loads((crawler/'x'/'checkpoint.json').read_text(encoding='utf-8'))
    cursor=json.loads((crawler/'x'/'cursor.json').read_text(encoding='utf-8'))
    trace_state=json.loads((crawler/'x'/'state.json').read_text(encoding='utf-8'))
    checkpoint_end=checkpoint.get('last_complete_end')
    check(isinstance(checkpoint_end,str),'Crawlerbait legacy checkpoint has no explicit end')
    check(cursor.get('version')==2 and cursor.get('source')=='cloudflare:httpRequestsAdaptive','Crawlerbait cursor is not canonical raw-traffic generation 2')
    path_state=cursor.get('path_privacy') or {}
    legacy_path_migrated=path_state.get('domain')=='crawlerbait:path:v1'
    path_migrated=(
        legacy_path_migrated
        and path_state.get('offered_resolution')==pathmembrane.OFFERED_RESOLUTION
    )
    if legacy_path_migrated:
        check((checkpoint.get('privacy_migration') or {}).get('exact_user_agents_removed') is True,'Crawlerbait legacy checkpoint still carries readable User-Agent law')
        check(all('signatures' not in route for route in (checkpoint.get('routes') or {}).values()),'Crawlerbait legacy checkpoint still contains UA signature maps')
        check(all(pathmembrane.public_path_shape_valid(path) for path in (checkpoint.get('routes') or {})),'Crawlerbait legacy checkpoint contains an unmediated public path')

    legacy=sorted((crawler/'x'/'captures').glob('*.capture.json'))
    expected=checkpoint_end
    for capture in legacy:
        value=json.loads(capture.read_text(encoding='utf-8'))
        window=value.get('window') or {}
        provider=(value.get('provider_response') or {})
        zones=provider.get('data',{}).get('viewer',{}).get('zones',[])
        groups=value.get('groups') if value.get('version')==1 else (zones[0].get('groups') if len(zones)==1 else None)
        check(value.get('source')=='cloudflare:httpRequestsAdaptiveGroups' and isinstance(groups,list),f'invalid legacy 404 capture {capture.name}')
        check(window.get('start')==expected,f'Crawlerbait legacy 404 gap before {capture.name}')
        expected=window.get('end')
    check(cursor.get('legacy_404_last_capture_end')==expected,'legacy 404 cursor diverged from preserved captures')
    if legacy_path_migrated:
        check(not legacy,'privacy-migrated legacy checkpoint still depends on raw capture carriers')

    raw_captures=sorted((crawler/'x'/'captures').glob('*.traffic.json'))
    raw_expected=None
    identity_fingerprints=set()
    for capture in raw_captures:
        value=json.loads(capture.read_text(encoding='utf-8'))
        window=value.get('window') or {}
        zones=(value.get('published_response') or {}).get('data',{}).get('viewer',{}).get('zones',[])
        records=zones[0].get('records') if len(zones)==1 else None
        version=value.get('version')
        check(
            version in (4,5)
            and value.get('source')=='cloudflare:httpRequestsAdaptive'
            and value.get('semantic_filters')==[]
            and isinstance(records,list),
            f'invalid whole-traffic capture {capture.name}'
        )
        if version==4:
            transform=(value.get('publication_transform') or {}).get('clientIP') or {}
            check(
                transform.get('scheme')=='hmac-sha256'
                and transform.get('domain')=='crawlerbait:clientIP:v1'
                and transform.get('key_epoch')=='v1'
                and transform.get('published_field')=='clientIPIdentity'
                and transform.get('literal_persisted') is False
                and transform.get('equality_preserved_within_key_epoch') is True,
                f'invalid legacy clientIP identity transform in {capture.name}'
            )
            fingerprint=transform.get('key_fingerprint')
            check(isinstance(fingerprint,str) and len(fingerprint)==16,f'missing identity-key fingerprint in {capture.name}')
            identity_fingerprints.add(fingerprint)
            if 'clientIP' in (value.get('advertised_fields') or []):
                for record_index,record in enumerate(records):
                    check('clientIP' not in record,f'literal clientIP persisted in {capture.name} record {record_index}')
                    check('clientIPIdentity' in record,f'clientIPIdentity missing in legacy {capture.name} record {record_index}')
        else:
            transform=(value.get('publication_transform') or {}).get('beingId') or {}
            check(
                transform.get('network_pseudonym_persisted') is False
                and transform.get('exact_user_agent_persisted') is False
                and transform.get('literal_client_ip_persisted') is False,
                f'private recognition leaked by transform declaration in {capture.name}'
            )
            fingerprint=transform.get('key_fingerprint')
            if isinstance(fingerprint,str):
                check(len(fingerprint)==16,f'invalid identity-key fingerprint in {capture.name}')
                identity_fingerprints.add(fingerprint)
            historical=value.get('historical_migration') or {}
            check(
                'clientRequestQuery' in (value.get('never_captured_fields') or [])
                or historical.get('query_value_removed') is True,
                f'query exclusion/removal is not witnessed in {capture.name}'
            )
            expected_fields={'datetime','beingId','clientRequestPath','clientRequestHTTPMethodName','edgeResponseStatus'}
            for record_index,record in enumerate(records):
                check(set(record)==expected_fields,f'non-metabolized public fields remain in {capture.name} record {record_index}')
                check(isinstance(record.get('beingId'),str) and bool(record.get('beingId')),f'opaque beingId missing in {capture.name} record {record_index}')
                for forbidden in ('clientIP','clientIPIdentity','userAgent','clientRequestQuery'):
                    check(forbidden not in record,f'{forbidden} leaked in {capture.name} record {record_index}')
                if path_migrated:
                    check(pathmembrane.public_path_shape_valid(str(record.get('clientRequestPath') or '')),f'unmediated request path leaked in {capture.name} record {record_index}')
        if raw_expected is not None:
            check(window.get('start')==raw_expected,f'Crawlerbait raw traffic gap before {capture.name}')
        raw_expected=window.get('end')
    if raw_captures:
        check(len(identity_fingerprints)<=1,'multiple HMAC key fingerprints split one raw identity epoch')
        cursor_identity=cursor.get('identity') or {}
        cursor_fingerprint=cursor_identity.get('key_fingerprint') or (cursor_identity.get('clientIP') or {}).get('key_fingerprint')
        if identity_fingerprints:
            check(cursor_fingerprint in identity_fingerprints,'cursor identity key diverged from captured identity epoch')
        check(cursor.get('raw_last_capture_end')==raw_expected,'raw traffic cursor is not exactly covered by immutable captures')
        check(trace_state.get('version') in (5,6) and trace_state.get('raw_capture_end')==raw_expected,'derived whole-traffic state is stale')
        check((crawler/'z'/'public'/'crawlerbait'/'traffic.json').is_file(),'public metabolized traffic manifest missing')
    else:
        check(cursor.get('raw_last_capture_end') is None,'raw cursor advanced without any canonical traffic capture')
        check(trace_state.get('version') in (4,5,6),'transitional trace state has unknown generation')

    retained=crawler/'x'/'retained-bootstrap'
    if (retained/'seal.json').is_file():
        seal=json.loads((retained/'seal.json').read_text(encoding='utf-8'))
        check(seal.get('sealed') is True,'Crawlerbait retained-history archive is not sealed')
        check((retained/'provider-settings.json').is_file(),'Crawlerbait retained-history provider settings missing')
        if legacy_path_migrated:
            check(seal.get('raw_carriers_retired') is True,'Crawlerbait retained raw bootstrap carriers were not retired after privacy migration')
            check(not list(retained.glob('*.raw.json')),'Crawlerbait retained-bootstrap still contains readable raw files')
            check(seal.get('current_evidence')=='../checkpoint.json','Crawlerbait retained-bootstrap seal does not point at coalesced checkpoint evidence')
        else:
            files=seal.get('files')
            check(isinstance(files,list) and files,'Crawlerbait retained-history seal has no raw files')
            for name in files:
                raw=retained/name
                check(raw.is_file(),f'Crawlerbait retained-history raw file missing {name}')
                value=json.loads(raw.read_text(encoding='utf-8'))
                zones=(value.get('provider_response') or {}).get('data',{}).get('viewer',{}).get('zones',[])
                check(value.get('source')=='cloudflare:httpRequestsAdaptiveGroups' and len(zones)==1 and isinstance(zones[0].get('groups'),list),f'invalid retained raw provider payload {name}')
    bait_dirs=[p for p in (crawler/'w').iterdir() if p.is_dir()]
    check(bool(bait_dirs),'Crawlerbait bait-space has no addressed bait body')
    for locus in bait_dirs:
        check(len(locus.name)>1 and locus.name[0]=='w' and set(locus.name[1:])<=set('wxzy'),f'Crawlerbait bait-space carrier is not a raw tetrahedral address: {locus.name}')
        check({p.name for p in locus.iterdir()}=={'bait.json'},f'Crawlerbait bait-space locus {locus.name} contains non-bait tissue')

    return {'checks': count, 'traffic_captures': len(raw_captures)}
