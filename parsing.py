import itertools
import os
from google import genai
from google.genai.types import GenerateContentConfig, ThinkingConfig
import re
import pyparsing
import yaml
from pycnnum import cn2num

def roman_to_int(s: str) -> int:
    roman_map = {
        'I': 1, 'V': 5, 'X': 10, 'L': 50,
        'C': 100, 'D': 500, 'M': 1000
    }
    
    result = 0
    
    for i in range(len(s)):
        if s[i] not in roman_map:
            continue
        current_value = roman_map[s[i]]
        
        # Check for subtractive cases
        if i + 1 < len(s) and current_value < roman_map[s[i+1]]:
            result -= current_value
        else:
            result += current_value
            
    return result


CN_NUM = pyparsing.Word('一二三四五六七八九十百千〇零').set_parse_action(lambda t: cn2num((t[0])))
ARABIC_NUM = pyparsing.Word(pyparsing.nums).set_parse_action(lambda t: int(t[0]))
ROMAN_NUM = ((pyparsing.Word('MDCLXVI') | pyparsing.Word('mdclxvi')) + pyparsing.Optional('.')).set_parse_action(lambda t: roman_to_int(t[0].upper()))
SEP = pyparsing.oneOf("- – ～ 至")



CHAPTER = (
    (pyparsing.Opt("第") + (CN_NUM | ARABIC_NUM)("c") + "章") |
    CN_NUM("c") |
    ROMAN_NUM("c") |
    (ARABIC_NUM("c") + pyparsing.oneOf(": ："))
).set_parse_action(lambda t: str(t["c"]) + ":")

EXTEND_TO_RANGE = pyparsing.Opt(pyparsing.Opt(pyparsing.oneOf("節节")) + SEP + pyparsing.Opt("第") + (CN_NUM | ARABIC_NUM)("v2"))
DELIM = pyparsing.Suppress(pyparsing.one_of("， ； , ;"))

VERSE = (
    (pyparsing.Opt("第") + (CN_NUM | ARABIC_NUM)("v1") + EXTEND_TO_RANGE + pyparsing.one_of("節 节")) |
    (ARABIC_NUM("v1") + pyparsing.Opt(SEP + ARABIC_NUM("v2")))
).set_parse_action(lambda t: str(t["v1"]) if "v2" not in t else str(t["v1"]) + "-" + str(t["v2"]))



with open(os.path.dirname(__file__) + '/bible_books.yaml', 'r', encoding='utf-8') as f:
    BIBLE_BOOKS = yaml.safe_load(f)

BOOK_NAMES = [a for book in BIBLE_BOOKS for a in book['zh'] + book['zh-abbv']]
def get_book(t):
    for b in BIBLE_BOOKS:
        if t in (b['en'] + b['en-abbv'] + b['zh'] + b['zh-abbv']):
            return b
    raise ValueError(f"Unknown book name: {t[0]}")
BIBLE_BOOK = (pyparsing.Opt("《") + pyparsing.oneOf(BOOK_NAMES)("b") + pyparsing.Opt("》")).set_parse_action(lambda t: get_book(t['b'])['zh'][0] + " ")
CHAPTER_VERSE = CHAPTER + pyparsing.Opt(DELIM) + VERSE + pyparsing.ZeroOrMore(DELIM + pyparsing.Opt(CHAPTER + pyparsing.Opt(DELIM)) + VERSE)
BIBLE_REFS = BIBLE_BOOK + CHAPTER + pyparsing.Opt(DELIM) + VERSE + pyparsing.ZeroOrMore(DELIM + pyparsing.Opt(pyparsing.Opt(BIBLE_BOOK) + CHAPTER + pyparsing.Opt(DELIM)) + VERSE)

def standardize_bible_names(text: str) -> str:
    result = ""
    last_pos = 0
    for parse, start, end in BIBLE_REFS.scan_string(text):
        result += text[last_pos:start]
        l = []
        temp = ""
        for p in parse.as_list():
            if p.endswith(":") or p.endswith(" "):
                temp += p
            else:
                l.append(temp + p)
                temp = ""
        result += "，".join(l)
        last_pos = end
    result += text[last_pos:]
    return result