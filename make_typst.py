import pypandoc
import itertools
import re
import sys

import yaml
import subprocess
import os


FOOTNOTE = None
FOOTNOTE_HIS = None

def typst_template(title: (str, str), blocks: list[(str, str)]):
    if len(title[0] + title[1]) < 30:
        title = f"*{title[0]} {title[1]}*"
    else:
        title = f"*{title[0]}*\n\n*{title[1]}*"
    return f"""
#import "@preview/cjk-unbreak:0.1.1": remove-cjk-break-space
#show: remove-cjk-break-space
#set page(margin: 55pt)
#set text(font: ("EB Garamond", "Songti SC"))

#align(center, text(30pt)[
    {title}
])
#v(20pt)

#grid(columns: 2, gutter: 20pt,
    {
        "\n".join(f"[\n\t{a}\n]," for b in blocks for a in b)
    }
)
"""

def paragraph_typst(ty: str, initial: str | None, text: str, lang_id: int)-> str:
    global FOOTNOTE, FOOTNOTE_HIS
    text = lastly_map(text)
    text = re.sub(r'\[(\S+?)\]|「.*?」|«.*?»|（.*?）|\(.*?\)', lambda a: new_footnote(a) if a[0][0] == '[' else coloring(a), text)
    ending = ""
    if type(FOOTNOTE_HIS) is dict:
        for id, fn in FOOTNOTE_HIS.items():
            fn = lastly_map(fn[lang_id])
            if fn.endswith("\n"):
                fn = fn[:-1]
        FOOTNOTE_HIS = {}
    if ty in ['h1', 'h2', 'h3', 'h4', 'heading1', 'heading2', 'heading3', 'heading4']:
        if initial.endswith('.'):
            initial += " "
        if ty == 'h1' or ty == "heading1":
            return f"= {initial}{text}"
        elif ty == 'h2' or ty == "heading2":
            return f"== {initial}{text}"
        elif ty == 'h3' or ty == "heading3":
            return f"=== {initial}{text}"
        elif ty == 'h4' or ty == "heading4":
            return f"==== {initial}{text}"
    else:
        if initial.strip() != "":
            text = f"*{initial}* {text}"
        if ty == 'note':
            return f"#text(fill: luma(100))[{text}]"
        else:
            return f"{text}"

def new_footnote(id: str | re.Match):
    global FOOTNOTE, FOOTNOTE_HIS
    if isinstance(id, re.Match):
        id = id.group(1)
    if id not in FOOTNOTE:
        if len(id) < 5 and id.isascii():
            return fr"#super[{id}]"
        return f"#text(fill: orange)[{id}]"
    if type(FOOTNOTE_HIS) is set:
        fn1, fn2 = FOOTNOTE[id]
        if id in FOOTNOTE_HIS:
            return " @note" + id + " "
        else:
            FOOTNOTE_HIS.add(id)
            return f" #footnote[{fn1 + "#h(1cm)" + fn2}]#label(\"note{id}\") "
    elif type(FOOTNOTE_HIS) is dict:
        fn = FOOTNOTE[id]
        FOOTNOTE_HIS[id] = list(fn.values())
        return "#super[" + id + "] "

def coloring(id: str | re.Match):
    if isinstance(id, re.Match):
        id = id.group(0)
    if id.startswith("「") or id.startswith("«"):
        return quote_coloring(id)
    else:
        return bible_book(id)

def quote_coloring(id: str | re.Match):
    if isinstance(id, re.Match):
        id = id.group(0)
    return f" #text(fill: rgb(\"#004D80\"))[{id}] "

def bible_book(id: str | re.Match):
    if isinstance(id, re.Match):
        id = id.group(0)
    if re.search(r"\d+:\d+", id):
        return f" #text(fill: maroon)[{id}] "
    else:
        return id

def lastly_map(text: str) -> str:
    text = re.sub(r'\*.{0,20}\*', lambda t: "_" + t[0][1:-1] + "_", text)
    text = text.replace("*", "·").replace("//", r"\//").replace("_", r"\_").replace("=", r"\=").replace("#", r"\#").replace("^", r"\^").replace("~", r"\~").replace("`", r"\`")
    return text

if __name__ == "__main__":
    for path in sys.argv[1:]:
        with open(path, 'r') as f:
            data = yaml.safe_load(f)

        FOOTNOTE = data['footnotes']
        FOOTNOTE_HIS = set() if len(FOOTNOTE) < 50 else dict()

        BLOCKS = []
        def process_block(block):
            if block['type'] in ['heading1', 'heading2', 'heading3', 'heading4']:
                BLOCKS.append((
                    paragraph_typst(block['type'], block.get('initial', {}).get('ru', ''), block['text']['ru'], 0),
                    paragraph_typst(block['type'], block.get('initial', {}).get('cn', ''), block['text']['cn'], 1)
                ))
                for child in block.get('children', []):
                    process_block(child)
            elif block['type'] in ['paragraph', 'h1', 'h2', 'h3', 'h4']:
                if 'original_title' in block.get('label', []) and 'initial' not in block:
                    block['type'] = 'note'
                BLOCKS.append((
                    paragraph_typst(block['type'], block.get('initial', {}).get('ru', ''), block['text']['ru'], 0),
                    paragraph_typst(block['type'], block.get('initial', {}).get('cn', ''), block['text']['cn'], 1)
                ))
        for block in data['document']:
            process_block(block)
        title = (data['title'].get('ru'), data['title'].get('cn'))
        typst_code = typst_template(title, BLOCKS)
        typ_path = "/tmp/yaml_book.typ"
        pdf_path = os.path.dirname(os.path.abspath(path)) + f"/{title[-1]}.pdf"

        with open(typ_path, 'w', encoding='utf-8') as f:
            f.write(typst_code)

        process = subprocess.run(['typst', 'compile', typ_path, pdf_path])
        process.check_returncode()

        if os.path.exists(typ_path):
            os.remove(typ_path)

