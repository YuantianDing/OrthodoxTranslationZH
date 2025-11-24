
import sys

from fix_yaml import YAMLSync, translate_block
from yaml_type import Book


if __name__ == "__main__":
    with YAMLSync(sys.argv[1]) as data:
        book = Book.convert_dict(data)
        for block in book["document"]:
            translate_block(block, languages=book['languages'], force_update=True)
