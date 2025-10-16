from collections import deque
from copy import deepcopy
from typing import Any, Literal, NotRequired, TypedDict
import os
from gemini import translate

def lang_text(text: str | dict[str, str], languages: list[str]) -> dict[str, str]:
    if type(text) == str:
        return {languages[0]: text}
    elif type(text) == dict:
        assert all(lang in languages for lang in text.keys())
        return text
    else:
        raise ValueError("Invalid text type: " + str(text))


class Block(TypedDict):
    type: str
    label: NotRequired[list[str]]

    @staticmethod
    def parse_from_queue(queue: deque[dict], languages: list[str], level: int = 0) -> list['Heading | Paragraph']:
        result = []
        while len(queue) > 0:
            block = queue[0]
            assert 'type' in block
            if block['type'] in ['h1', 'h2', 'h3', 'h4', 'heading1', 'heading2', 'heading3', 'heading4']:
                lvl = int(block['type'][-1])
                if lvl <= level:
                    break

                block = deepcopy(queue.popleft())
                if block['type'] in ['heading1', 'heading2', 'heading3', 'heading4']:
                    assert 'children' in block
                    que = deque(block['children'])
                    block['children'] = Block.parse_from_queue(que, languages, level=0)
                    assert len(que) == 0
                    result.append(Heading.from_dict(block, languages))
                else:
                    block['type'] = 'heading' + block['type'][-1]
                    block['children'] = Block.parse_from_queue(queue, languages, level=lvl)
                    result.append(Heading.from_dict(block, languages))
            else:
                result.append(Paragraph.from_dict(queue.popleft(), languages))

        if level == 0:
            assert len(queue) == 0, "Unprocessed blocks remain in the queue"
        return result


class Heading(Block):
    type: Literal['heading1', 'heading2', 'heading3', 'heading4']
    initial: NotRequired[dict[str, str]]
    text: dict[str, str]
    children: list[Block]

    @staticmethod
    def from_dict(data: dict, languages: list[str]) -> 'Heading':
        assert 'type' in data and data['type'] in ['heading1', 'heading2', 'heading3', 'heading4']
        assert 'text' in data
        data['text'] = lang_text(data['text'], languages)
        if 'initial' in data:
            data['initial'] = lang_text(data['initial'], languages)
            if all(v.strip() == "" for v in data['initial'].values()):
                del data['initial']
        assert 'children' in data
        return data

class Paragraph(Block):
    type: Literal['paragraph']
    initial: NotRequired[dict[str, str]]
    text: dict[str, str]

    @staticmethod
    def from_dict(data: dict, languages: list[str]) -> 'Paragraph':
        assert 'text' in data
        data['text'] = lang_text(data['text'], languages)
        if 'initial' in data:
            data['initial'] = lang_text(data['initial'], languages)
            if all(v.strip() == "" for v in data['initial'].values()):
                del data['initial']
        return data

class Note(Block):
    type: Literal['note']
    initial: NotRequired[dict[str, str]]
    text: dict[str, str]

    @staticmethod
    def from_dict(data: dict, languages: list[str]) -> 'Paragraph':
        assert 'text' in data
        data['text'] = lang_text(data['text'], languages)
        if 'initial' in data:
            data['initial'] = lang_text(data['initial'], languages)
            if all(v.strip() == "" for v in data['initial'].values()):
                del data['initial']
        return data

class Book(TypedDict):
    title: dict[str, str]
    document: list[Block]
    footnotes: dict[str, dict[str, str]]
    languages: list[str]

    @staticmethod
    def convert_dict(data: dict) -> 'Book':
        title = data['title']
        document = data['document']
        footnotes = data['footnotes']

        data['languages'] = data.get('languages', list(data['title'].keys()))
        languages = data['languages']
        assert languages

        for k, v in footnotes.items():
            footnotes[k] = lang_text(v, languages)

        data['document'] = Block.parse_from_queue(deque(document), languages)
        document = data['document']

        return data
