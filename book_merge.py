import re
import sys
import yaml

from fix_yaml import YAMLSync
from gemini import make_russian_title
from yaml_type import Block, Book

DOCUMENT = []
FOOTNOTE = {}
AUTHORS = set()
LENGTH = len(str(len(sys.argv[1:]) - 1))
for i, path in enumerate(sys.argv[1:]):
    id = f"{i:0{LENGTH}d}"
    with open(path, 'r') as f:
        data = yaml.safe_load(f)
        for k, v in data['footnotes'].items():
            FOOTNOTE[id + k] = v

        def process_block(block: Block):
            if block['type'] in ['heading1', 'heading2', 'heading3', 'heading4']:
                for child in block['children']:
                    process_block(child)
                block['type'] = "heading" + str(max(int(block['type'][-1]) + 1, 4))

            for k in block['text']:
                block['text'][k] = re.sub(r"\[(\S+)\]", lambda a: f"[{id}{a.group(1)}]" if a.group(1) in data['footnotes'] else a[0], block['text'][k])
        for block in data['document']:
            process_block(block)

        DOCUMENT.append({
            'type': 'heading1',
            'text': data['title'],
            'children': data['document'],
            'label': ['merged_book'],
        })

        AUTHORS |= set(data.get('authors', []))

with open('merged_book.yaml', 'w') as f:
    yaml.safe_dump({
        'document': DOCUMENT,
        'footnotes': FOOTNOTE,
        'authors': list(AUTHORS),
    }, f, allow_unicode=True, indent=2, sort_keys=False, width=91820347)
