import os
import sys
from yaml_type import load_yaml, dump_yaml
import marko
import re
from fix_yaml import YAMLSync
from yaml_type import dump_yaml

file = sys.argv[1]
lang = sys.argv[2]

lang_file = f"{lang}-{file}"

if not os.path.exists(lang_file):
    with YAMLSync(file) as data:
        def helper(block) -> dict:
            result = dict()
            result['type'] = block['type']
            if 'initial' in block and lang in block['initial']:
                result['initial'] = block['initial'][lang]
            result['text'] = block['text'][lang]
            if 'children' in block:
                result['children'] = [helper(child) for child in block['children']]
            return result
        
        new_data = {
            'document': [helper(block) for block in data['document']]
        }
    with open(lang_file, 'w') as f:
        dump_yaml(new_data, f)

else:
    with open(lang_file, 'r') as f:
        lang_data = load_yaml(f)
    with YAMLSync(file) as data:
        def helper(block, lang_block):
            assert block['type'] == lang_block['type']
            block['text'][lang] = lang_block['text']
            if 'initial' in lang_block:
                assert 'initial' in block
                block['initial'][lang] = lang_block['initial']
            if 'children' in lang_block:
                assert len(block['children']) == len(lang_block['children'])
                for b_child, l_child in zip(block.get('children', []), lang_block['children']):
                    helper(b_child, l_child)
        assert len(data['document']) == len(lang_data['document'])
        for b_block, l_block in zip(data['document'], lang_data['document']):
            helper(b_block, l_block)
    
    resp = input("Delete Sync File (y/n): ")
    if resp.lower() == 'y':
        os.remove(lang_file)
    



