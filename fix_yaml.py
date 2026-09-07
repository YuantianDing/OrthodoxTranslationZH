from copy import deepcopy
from concurrent.futures import ThreadPoolExecutor
from threading import Lock
import os.path
import os
from pathlib import Path
import re
import sys
import time
from yaml_type import load_yaml, dump_yaml
import zhconv
from gemini import test_translated_result, translate
from google.genai.errors import ServerError, ClientError
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
            self.yaml_data = load_yaml(f)
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
                dump_yaml(self.yaml_data, f)
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
POSTPROCESS_LOCK = Lock()
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

def translate_lang_text(text: dict[str, str], languages: list[str], force_update=False) -> bool:
    translated = False
    for lang in languages[1:]:
        text_retranslate = lang in text and not test_translated_result(lang, text[languages[0]], text[lang])
        if lang not in text or text_retranslate or force_update:
            if not re.search(r'[^\d\W]', text[languages[0]]):
                text[lang] = text[languages[0]]
            elif m := re.search(r'^Стр\.[^\n]+$', text[languages[0]]):
                text[lang] = text[languages[0]]
            elif m := re.search(r'^Глава (\d+)\.?$', text[languages[0]]):
                text[lang] = f"第 {m.group(1)} 章"
            elif m := re.search(r'^Слово (\d+)\.?$', text[languages[0]]):
                text[lang] = f"第 {m.group(1)} 言"
            elif m := re.search(r'^Письмо (\d+)\.?$', text[languages[0]]):
                text[lang] = f"书信 {m.group(1)}"
            else:
                while True:
                    try:
                        text[lang] = translate(text[languages[0]], lang=lang, no_cache=text_retranslate)
                    except Exception as e:
                        # if isinstance(e, ServerError) or isinstance(e, AttributeError) or isinstance(e, ClientError):
                        #     print("[Translate] Translation Failed. :{e}\nWaiting 10 seconds...", file=sys.stderr)
                        #     time.sleep(10)
                        #     continue
                        # else:
                            raise e
                    break
                translated = True
    if 'cn' in text:
        # pyparsing grammars used by standardize_bible_names are shared module
        # objects and are not safe to scan concurrently.
        with POSTPROCESS_LOCK:
            text['cn'] = standardize_bible_names(lastly_map(zhconv.convert(text['cn'], 'zh-hans')))
            text['cn'] = text['cn'].replace("宗徒", "使徒").replace("阿门", "阿们").replace("圣金口约翰", "圣约翰金口")
            if m := re.fullmatch(r'Беседа\s+(\d+)(?:-я)?\.?', text[languages[0]].strip()):
                text['cn'] = f"第 {m.group(1)} 讲"
    if translated:
        for lang in languages:
            if lang in text:
                print(f"[Translate] {lang}: {text[lang]}", file=sys.stderr)
    return translated

def translate_block(block, languages: list[str], force_update=False):
    if block['type'] in ['heading1', 'heading2', 'heading3', 'heading4']:
        for k, v in block['text'].items():
            block['text'][k] = v.replace("\n\n", "").strip()
        translate_lang_text(block['text'], languages, force_update)
        if 'initial' in block:
            translate_lang_text(block['initial'], languages, force_update)
        for child in block['children']:
            translate_block(child, languages, force_update)
    elif block['type'] in ['paragraph', 'h1', 'h2', 'h3', 'h4']:
        translate_lang_text(block['text'], languages, force_update)
        if 'initial' in block:
            translate_lang_text(block['initial'], languages, force_update)

def collect_block_texts(block):
    """Return a block's translatable mappings in document order."""
    texts = []
    if block['type'] in ['heading1', 'heading2', 'heading3', 'heading4']:
        for k, v in block['text'].items():
            block['text'][k] = v.replace("\n\n", "").strip()
        texts.append(block['text'])
        if 'initial' in block:
            texts.append(block['initial'])
        for child in block['children']:
            texts.extend(collect_block_texts(child))
    elif block['type'] in ['paragraph', 'h1', 'h2', 'h3', 'h4']:
        texts.append(block['text'])
        if 'initial' in block:
            texts.append(block['initial'])
    return texts

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
                translation_targets = [book['title']]
                if 'authors' in book:
                    authors = []
                    for author in book['authors']:
                        if type(author) is str:
                            author = {book['languages'][0]: author}
                        translation_targets.append(author)
                        authors.append(author)
                    book['authors'] = authors
                
                book['footnotes'] = {(str(k) if str(k).startswith('[') else f"[{k}]"): v for k, v in book['footnotes'].items()}
                
                for block in book["document"]:
                    translation_targets.extend(collect_block_texts(block))

                for footnote in book['footnotes'].values():
                    translation_targets.append(footnote)

                if os.getenv('TRANSLATION_REVERSE') == '1':
                    translation_targets.reverse()
                workers = max(1, int(os.getenv('TRANSLATION_WORKERS', '1')))
                if workers == 1:
                    for target in translation_targets:
                        translate_lang_text(target, languages=book['languages'])
                else:
                    print(f"[Translate] Using {workers} workers for {len(translation_targets)} fields", file=sys.stderr)
                    with ThreadPoolExecutor(max_workers=workers) as executor:
                        futures = [
                            executor.submit(translate_lang_text, target, book['languages'])
                            for target in translation_targets
                        ]
                        for future in futures:
                            future.result()
        if os.path.abspath(workdir) == os.path.dirname(os.path.abspath(__file__)):
            generate_metadata()
