"""Accountability publishes the operator facts carried by the existing 4V."""
import html
import html.parser
import json
from pathlib import Path


PUBLIC_MEMBER = 'y/public/impressum'

class NoticeText(html.parser.HTMLParser):
    """Derive material from this owner's approved aperture, never reauthor it."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.started = False
        self.done = False
        self.block = None
        self.link = None
        self.blocks = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'nav' and 'legal-nav' in attrs.get('class', '').split():
            self.done = True
        if self.done:
            return
        if tag == 'h1':
            self.started = True
        if not self.started:
            return
        if tag in {'h1', 'h2', 'h3', 'p', 'address', 'li'}:
            self.block = {'tag': tag, 'raw': '', 'links': []}
        if self.block is not None:
            if tag == 'br':
                self.block['raw'] += '\n'
            if tag == 'a':
                self.link = {'href': attrs['href'], 'raw': ''}

    def handle_data(self, text):
        if self.block is not None and not self.done:
            self.block['raw'] += text
            if self.link is not None:
                self.link['raw'] += text

    def handle_endtag(self, tag):
        if self.done or self.block is None:
            return
        if tag == 'a' and self.link is not None:
            self.block['links'].append({'text': ' '.join(self.link['raw'].split()), 'href': self.link['href']})
            self.link = None
        if tag == self.block['tag']:
            self.blocks.append({'tag': tag, 'text': ' '.join(self.block['raw'].split()), 'links': self.block['links']})
            self.block = None


def notice_material(body):
    public = body / PUBLIC_MEMBER
    notices = {}
    for language, member in (('de', 'index.html'), ('en', 'en/index.html')):
        parser = NoticeText()
        parser.feed((public / member).read_text(encoding='utf-8'))
        if not parser.done or not parser.blocks or parser.blocks[0]['tag'] != 'h1':
            raise ValueError('incomplete approved notice aperture')
        notices[language] = parser.blocks
    return notices


def derive(body, common):
    def read(member):
        return json.loads((body / member).read_text(encoding='utf-8'))
    identity, address = read('w/identity.json'), read('x/address.json')
    publication = read('y/publication.json')
    return {
        'version': publication['version'],
        'notices': notice_material(body),
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
