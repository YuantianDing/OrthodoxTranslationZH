

import re
import sys

import yaml

from fix_yaml import YAMLSync
from yaml_type import Book


if __name__ == "__main__":

    path = sys.argv[1]
    regex = sys.argv[2]
    with YAMLSync(path) as data:
        book = Book.convert_dict(data)
        lang = book['languages'][0]

        def helper(blocks):
            i = 0
            while i < len(blocks):
                block = blocks[i]
                if block['type'] == 'paragraph' and 'initial' in block:
                    if any(re.match(regex, lang) for lang in block['initial'].values()):
                        initial = block['initial']
                        del block['initial']
                        blocks.insert(i, {
                            'type': 'h4',
                            'initial': initial,
                            'text': {lang: "!!![To Be Retitled]"},
                            'label': ['initial_header'],
                        })
                if 'children' in block:
                    helper(block['children'])
                i += 1
        
        helper(book['document'])
        book = Book.convert_dict(book)
