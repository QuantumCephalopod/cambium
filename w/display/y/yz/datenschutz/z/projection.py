"""Rights publishes the factual source and reachable remedy of this notice."""
import html
import json
from pathlib import Path


def derive(body, common):
    def read(member):
        return json.loads((body / member).read_text(encoding='utf-8'))
    provenance, publication = read('x/provenance.json'), read('z/publication.json')
    return {
        'version': publication['version'],
        'title': read('w/title.json'),
        'publication': publication['publication'],
        'controller': provenance['controller'],
        'contact': read('y/remedy.json'),
        'draft': provenance['draft'],
    }


def validate(data, body, common):
    if data != derive(body, common):
        raise ValueError('Datenschutz projection disagrees with its owned source and remedy')
    controller, contact = data['controller'], data['contact']
    if (data['version'] != 1 or data['publication'] != 'READY_FOR_PUBLICATION'
            or contact['status'] != 'live'
            or data['draft']['status'] != 'final-source-ready; provider-gc-closed-described'
            or not data['draft']['drive_id']):
        raise ValueError('Datenschutz publication/source/contact is not ready')
    manifest = json.loads((body / 'site.json').read_text(encoding='utf-8'))
    public = body / Path(manifest['projection']).parent / 'public' / 'privacy'
    for language, member in (('de', 'index.html'), ('en', 'en/index.html')):
        notice = html.unescape((public / member).read_text(encoding='utf-8'))
        address = controller['address_locales'].get(language, controller['address'])
        facts = [data['title'][language], controller['name'], contact['email'], *address]
        if not address or any(not isinstance(fact, str) or not fact.strip() or fact not in notice for fact in facts):
            raise ValueError('Datenschutz notice disagrees with its source and remedy')
    return data
