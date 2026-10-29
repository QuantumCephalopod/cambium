"""Accountability publishes the operator facts carried by the existing 4V."""
import html
import json
from pathlib import Path


def derive(body, common):
    def read(member):
        return json.loads((body / member).read_text(encoding='utf-8'))
    identity, address = read('w/identity.json'), read('x/address.json')
    publication = read('y/publication.json')
    return {
        'version': publication['version'],
        'title': identity['title'],
        'publication': publication['publication'],
        'operator': {'name': identity['name'], **address},
        'contact': read('z/contact.json'),
    }


def validate(data, body, common):
    if data != derive(body, common):
        raise ValueError('Impressum projection disagrees with its owned operator facts')
    operator, contact = data['operator'], data['contact']
    if (data['version'] != 1 or data['publication'] != 'READY_FOR_PUBLICATION'
            or contact['status'] != 'live'):
        raise ValueError('Impressum publication/contact is not ready')
    manifest = json.loads((body / 'site.json').read_text(encoding='utf-8'))
    public = body / Path(manifest['projection']).parent / 'public' / 'impressum'
    for language, member in (('de', 'index.html'), ('en', 'en/index.html')):
        notice = html.unescape((public / member).read_text(encoding='utf-8'))
        address = operator['address_locales'].get(language, operator['address'])
        facts = [data['title'][language], operator['name'], contact['email'], *address]
        if not address or any(not isinstance(fact, str) or not fact.strip() or fact not in notice for fact in facts):
            raise ValueError('Impressum notice disagrees with its operator facts')
    return data
