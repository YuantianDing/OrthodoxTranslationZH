import json
import os
import re
import sys
import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup
from dataclasses import dataclass

import yaml

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
                    assert footnote_start not in footnote, footnote[footnote_start]
                    footnote[footnote_start] = text
                else:
                    m = re.match(r"^[\w§]*\s*\d+[\.,\)]", text)
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
    print(footnote)
    print(initial_words)
    if document[0]['type'] == 'paragraph':
        document = document[1:]
    title = os.path.basename(path).replace('.epub', '')
    authors = [title.split(' - ')[-1]] if ' - ' in title else []
    title = ' - '.join(title.split(' - ', maxsplit=1)[:-1])
    with open(path.replace('.epub', '.yaml'), 'w', encoding='utf-8') as f:
        yaml.dump({
            'title': { 'ru': title },
            'authors': authors,
            'document': document,
            'footnotes': footnote,
        }, f, allow_unicode=True, width=893172, sort_keys=False)
