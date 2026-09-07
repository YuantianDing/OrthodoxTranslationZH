import json
import os
import re
import sys
import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup
from dataclasses import dataclass

from yaml_type import load_yaml, dump_yaml

for path in sys.argv[1:]:
    book = epub.read_epub(path)

    def selector_of(item):
        result = item.name
        if result is None:
            return None

        if item.has_attr('class'):
            result += '.' + '.'.join(item['class'])

        if item.has_attr('id'):
            result += '#' + item['id']

        return result

    footnote = {}
    document = []
    initial_words = set()
    footnote_start = None
    for item in book.get_items():
        if item.get_type() == ebooklib.ITEM_DOCUMENT:
            soup = BeautifulSoup(item.get_content(), "html.parser")
            body = list(soup.find('body').children)

            if "#note" in (selector_of(body[0]) or ''):
                print(f"footnote[{body[0].get_text(strip=True)}] = {body[1].get_text(strip=True)}")
                footnote[str(body[0].get_text(strip=True))] = body[1].get_text(strip=True)
                continue

            for c in body:
                if c.get_text(strip=True) == "":
                    continue
                for sup in c.find_all('sup'):
                    text_node = soup.new_string(f"[{sup.get_text(strip=True)}]")
                    sup.replace_with(text_node)

                initial = ""
                ty = "paragraph"
                if c.name in ['h1', 'h2', "h3", 'h4']:
                    ty = c.name;
                text = c.get_text(strip=True)
                if text == "Примечания":
                    footnote_start = ''
                    continue
                elif footnote_start is not None and ty.startswith('h'):
                    footnote_start = text
                elif footnote_start is not None:
                    # assert , footnote[footnote_start]
                    if footnote_start not in footnote:
                        footnote[footnote_start] = text
                    else:
                        footnote[footnote_start] += "\n" + text
                else:
                    m = re.match(r"^[\w§]*\s*\d+[\.\)]", text)
                    if m:
                        initial = m.group(0)
                        text = text[len(initial):].strip()
                    document.append({
                        'type': ty,
                        'initial': { "ru": initial },
                        'text': { "ru": text },
                    })
                    if initial:
                        print(initial)
                        initial_words |= set(a for a in re.findall(r'[а-яА-ЯёЁ]+', initial, re.IGNORECASE))
    for k in footnote:
        footnote[k] = footnote[k].strip()
    print(initial_words)
    if document[0]['type'] == 'paragraph':
        document = document[1:]
    # Azbyka downloads may use a `.gen.epub` filename without the author.  Use
    # the EPUB's Dublin Core metadata when present, while retaining the old
    # filename convention as a fallback for older files in this repository.
    metadata_titles = book.get_metadata('DC', 'title')
    metadata_authors = book.get_metadata('DC', 'creator')
    filename_title = os.path.basename(path).removesuffix('.epub').removesuffix('.gen')
    if ' - ' in filename_title:
        fallback_title, fallback_author = filename_title.split(' - ', maxsplit=1)
    else:
        fallback_title, fallback_author = filename_title, None
    title = metadata_titles[0][0].strip() if metadata_titles else fallback_title
    authors = [
        value.strip().strip('"')
        for value, _attributes in metadata_authors
        if value.strip().strip('"')
    ]
    if not authors and fallback_author:
        authors = [fallback_author]
    with open(path.replace('.epub', '.yaml'), 'w', encoding='utf-8') as f:
        dump_yaml({
            'title': { 'ru': title },
            'authors': authors,
            'document': document,
            'footnotes': footnote,
        }, f)
