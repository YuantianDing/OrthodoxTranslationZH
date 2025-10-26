from copy import deepcopy
import os.path
import os
from pathlib import Path
import re
import sys
import time
import yaml
import zhconv
from gemini import test_translated_result, translate
from google.genai.errors import ServerError
import subprocess

from gen_metadata import generate_metadata
from parsing import standardize_bible_names
from yaml_type import Book
import traceback


def lastly_map(text: str):
    text = text.replace(r"\[", "[").replace(r"\]", "]").replace("#", "").replace("**", "").replace("天主", "上帝").replace("耶和华", "上主").replace("“", "「").replace("”", "」").replace("‘", "『").replace("’", "』")
    text = text.replace(" ", " ").replace(" ", " ").replace("\u200b", "").replace("\u200e", "").replace("\u200f", "").replace("\ufeff", "")
    return text

class YAMLSync:
    def __init__(self, path: str | Path):
        self.path = str(path)

    def __enter__(self):
        with open(self.path, 'r', encoding='utf-8') as f:
            print("[YAML::Loading] ", self.path, file=sys.stderr)
            self.yaml_data = yaml.safe_load(f)
        self.yaml_data_old = deepcopy(self.yaml_data)
        return self.yaml_data
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.yaml_data_old != self.yaml_data:
            if exc_type is not None:
                traceback.print_exception(exc_type, exc_val, exc_tb)
                print(f"File {self.path} has been modified. Save changes? (Y/n): ", end='', file=sys.stderr)
                choice = input().strip().lower()
                if choice not in ('y', 'yes', ''):
                    print(f"Changes to {self.path} will not be saved.", file=sys.stderr)
                    return True
            print("[YAML::Saving] ", self.path, file=sys.stderr)
            with open(self.path, 'w', encoding='utf-8') as f:
                yaml.dump(self.yaml_data, f, allow_unicode=True, sort_keys=False, indent=2)
            return True


def check_git_status():
    """Checks if the git working directory is clean. Exits if not."""
    try:
        result = subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True, check=True)
        return not result.stdout
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Could not check git status. Make sure you are in a git repository and git is installed.", file=sys.stderr)
        sys.exit(1)

AI_PERMISSION = None
def ask_ai_permission():
    global AI_PERMISSION
    if AI_PERMISSION is not None:
        return AI_PERMISSION
    print(f"Enable AI Translation? (y/N): ", end='', file=sys.stderr)
    choice = input().strip().lower()
    if choice in ('y', 'yes'):
        AI_PERMISSION = True
        return True
    AI_PERMISSION = False
    return False

def translate_lang_text(text: dict[str, str], languages: list[str]) -> bool:
    translated = False
    for lang in languages[1:]:
        text_retranslate = lang in text and not test_translated_result(lang, text[languages[0]], text[lang])
        if lang not in text or text_retranslate:
            if not re.search(r'[^\d\W]', text[languages[0]]):
                text[lang] = text[languages[0]]
            elif m := re.search(r'^Глава (\d+)\.?$', text[languages[0]]):
                text[lang] = f"第 {m.group(1)} 章"
            elif ask_ai_permission():
                while True:
                    try:
                        text[lang] = translate(text[languages[0]], lang=lang, no_cache=text_retranslate)
                    except ServerError as e:
                        if e.code == 503:
                            print("[Translate] Rate limit exceeded. Waiting 10 seconds...", file=sys.stderr)
                            time.sleep(10)
                            continue
                        else:
                            raise e
                    break
                translated = True
    if 'cn' in text:
        text['cn'] = standardize_bible_names(lastly_map(zhconv.convert(text['cn'], 'zh-hans')))
    if translated:
        for lang in languages:
            if lang in text:
                print(f"[Translate] {lang}: {text[lang]}", file=sys.stderr)
    return translated

def translate_block(block, languages: list[str]):
    if block['type'] in ['heading1', 'heading2', 'heading3', 'heading4']:
        for k, v in block['text'].items():
            block['text'][k] = v.replace("\n\n", "").strip()
        translate_lang_text(block['text'], languages)
        if 'initial' in block:
            translate_lang_text(block['initial'], languages)
        for child in block['children']:
            translate_block(child, languages)
    elif block['type'] in ['paragraph', 'h1', 'h2', 'h3', 'h4']:
        translate_lang_text(block['text'], languages)
        if 'initial' in block:
            translate_lang_text(block['initial'], languages)

if __name__ == "__main__":
    for workdir in sys.argv[1:]:
        workdir = Path(workdir)

        if not check_git_status():
            print("Git working directory is not clean. Continue? (Y/n): ", end='', file=sys.stderr)
            choice = input().strip().lower()
            if choice not in ('y', 'yes', ''):
                print("Aborting.", file=sys.stderr)
                sys.exit(1)

        for path in workdir.glob("**/book*.yaml"):
            with YAMLSync(path) as data:
                book = Book.convert_dict(data)
                translate_lang_text(book['title'], languages=book['languages'])
                if 'authors' in book:
                    authors = []
                    for author in book['authors']:
                        if type(author) is str:
                            author = {book['languages'][0]: author}
                        translate_lang_text(author, languages=book['languages'])
                        authors.append(author)
                    book['authors'] = authors

                for block in book["document"]:
                    translate_block(block, languages=book['languages'])

                for footnote in book['footnotes'].values():
                    translate_lang_text(footnote, languages=book['languages'])
        if os.path.abspath(workdir) == os.path.dirname(os.path.abspath(__file__)):
            generate_metadata()
