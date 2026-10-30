#!/usr/bin/env python3
"""Compare four real legal HTML documents with the text-surface paginator.

Run from the repository root: python3 /path/to/legal-source-review.py
This checks source text and link preservation, not visual paint/accessibility.
"""
from html.parser import HTMLParser
from pathlib import Path
import json
import subprocess


class Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.body = None
        self.stack = []

    def handle_starttag(self, tag, attrs):
        node = {'tag': tag.upper(), 'attrs': dict(attrs), 'nodes': []}
        if tag == 'body':
            self.body = node
            self.stack = [node]
            return
        if self.stack:
            self.stack[-1]['nodes'].append(node)
        if self.stack and tag not in {'br', 'img', 'link', 'meta', 'input', 'hr'}:
            self.stack.append(node)

    def handle_endtag(self, tag):
        if self.stack and self.stack[-1]['tag'] == tag.upper():
            self.stack.pop()

    def handle_data(self, data):
        if self.stack:
            self.stack[-1]['nodes'].append(data)


JS = r'''const fs=require('fs'),A=require('./w/display/w/orthogonal-text.js');
const input=JSON.parse(fs.readFileSync(0,'utf8'));
function node(n){
  const children=n.nodes.filter(x=>typeof x==='object').map(node);
  const m={tagName:n.tag,children,classList:{contains(k){return (n.attrs.class||'').split(/\s+/).includes(k)}},getAttribute(k){return n.attrs[k]||null},
    querySelectorAll(tag){return children.flatMap(c=>[...(c.tagName===tag.toUpperCase()?[c]:[]),...c.querySelectorAll(tag)])}};
  let ix=0;m.textContent=n.nodes.map(x=>typeof x==='string'?x:children[ix++].textContent).join('');return m;
}
const body=node(input.body),blocks=A.sourceBlocks({body},input.base);
const pages=A.paginate(blocks,s=>Array.from(s).length,20,3);
const compact=s=>s.replace(/\s/gu,'');
const content=body.children.filter(e=>e.tagName!=='NAV'&&!e.classList.contains('home'));
const source=compact(content.map(e=>e.textContent).join('')),extracted=compact(blocks.map(b=>b.text).join(''));
const output=compact(pages.flatMap(p=>p.plainLines).join(''));
if(source!==extracted||extracted!==output)throw Error('lost or reordered source text');
const sourceLinks=content.flatMap(e=>[...(e.tagName==='A'?[e]:[]),...e.querySelectorAll('a')]).map(a=>new URL(a.getAttribute('href'),input.base).href);
const pageLinks=pages.flatMap(p=>p.links.map(l=>l.href));
for(const href of sourceLinks)if(!pageLinks.includes(href))throw Error('lost link '+href);
if(!pages.every(p=>p.lines.length<=3&&p.lines.every(l=>Array.from(l).length<=20)))throw Error('page does not fit');
console.log(input.path,blocks.length,'blocks',pages.length,'pages',sourceLinks.length,'links');'''

files = [
    ('w/display/y/yz/datenschutz/z/public/privacy/index.html', 'https://sss.saarland/privacy/'),
    ('w/display/y/yz/datenschutz/z/public/privacy/en/index.html', 'https://sss.saarland/privacy/en/'),
    ('w/display/y/yxz/impressum/y/public/impressum/index.html', 'https://sss.saarland/impressum/'),
    ('w/display/y/yxz/impressum/y/public/impressum/en/index.html', 'https://sss.saarland/impressum/en/'),
]
for name, base in files:
    parser = Parser()
    parser.feed(Path(name).read_text(encoding='utf-8'))
    assert parser.body is not None, name
    result = subprocess.run(['node', '-e', JS], input=json.dumps({'body': parser.body, 'base': base, 'path': name}), text=True, capture_output=True)
    print(result.stdout, end='')
    if result.returncode:
        raise AssertionError(result.stderr)
