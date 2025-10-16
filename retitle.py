import sys

from fix_yaml import YAMLSync
from gemini import make_russian_title
from yaml_type import Block, Book


path = sys.argv[1]
level = sys.argv[2]

assert level in ["heading1", "heading2", "heading3", "heading4"]

def list_get(lst, idx, default=None):
    if 0 <= idx < len(lst):
        return lst[idx]
    return default

def process_block(block: Block, lang: str) -> str:
    if block['type'] in ['heading1', 'heading2', 'heading3', 'heading4']:
        inner_text = f"({block['text']})\n\n"+ "\n\n".join(process_block(child, lang) for child in block['children'])

        if block['type'] == level and 'original_title' not in list_get(block['children'], 0, {}).get('label', []):
            assert lang == 'ru'
            new_title = make_russian_title(inner_text)
            print(f"Retitling: {block['text'][lang]} -> {new_title}", file=sys.stderr)
            block['children'].insert(0, {
                'type': 'paragraph',
                'label': ['original_title'],
                'text': block['text'],
            })
            block['text'] = {lang: new_title}
        return "#" * int(block['type'][-1]) + " " + block['text'][lang] + "\n\n" + inner_text
    else:
        return block['text'][lang]
if __name__ == "__main__":
    with YAMLSync(path) as data:
        book = Book.convert_dict(data)
        lang = book['languages'][0]
        for b in book['document']:
            process_block(b, lang)


                    