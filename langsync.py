import os
import sys

from yaml_type import load_yaml, dump_yaml
import marko
import re
from fix_yaml import YAMLSync
from yaml_type import dump_yaml

file = sys.argv[1]
lang = sys.argv[2]

lang_file = f"{lang}-{file}.md"

if not os.path.exists(lang_file):
    with YAMLSync(file) as data:
        def helper(block) -> list[dict]:
            if 'children' in block:
                return sum((helper(c) for c in block['children']), [block])
            return [block]
        all_blocks = sum((helper(b) for b in data['document']), [])

        with open(lang_file, 'w') as f:
            for block in all_blocks:
                initial_text = block.get('initial', {}).get(lang, '')
                if initial_text != '':
                    initial_text = " " + initial_text
                if block['type'] in ['heading1', 'heading2', 'heading3', 'heading4']:
                    level = int(block['type'][-1])
                    f.write(f"{'#' * level}{initial_text} {block['text'].get(lang, '')}\n\n")
                else:
                    text = block['text'].get(lang, '')
                    f.write(f"✞{initial_text} {text}\n\n")
                    block['text'][lang] = block['text'][lang].strip()
else:
    with open(lang_file, 'r') as f:
        blocks = []
        for line in f:
            if " " in line:
                blocks.append(line.split(" ", 1)[1])
            else:
                blocks[-1] += line

    with YAMLSync(file) as data:
        def helper(block) -> list[dict]:
            if 'children' in block:
                return sum((helper(c) for c in block['children']), [block])
            return [block]
        all_blocks = sum((helper(b) for b in data['document']), [])

        assert len(blocks) == len(all_blocks)

        for a, b in zip(all_blocks, blocks):
            a['text'][lang] = b.strip()

    resp = input("Delete Sync File (y/n): ")
    if resp.lower() == 'y':
        os.remove(lang_file)
