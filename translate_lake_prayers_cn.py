#!/usr/bin/env python3.11
"""Translate Prayers by the Lake one numbered prayer per Gemini request.

The source has 100 prayers headed by bare Roman numerals.  Each successful
translation is checkpointed independently so a later run can resume safely.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path

from google import genai
from google.genai.types import GenerateContentConfig
from pydantic import BaseModel, Field


ROOT = Path(__file__).resolve().parent
BOOK_DIR = ROOT / "日查与奥赫里德的圣尼古拉" / "湖畔祈祷"
SOURCE_PATH = BOOK_DIR / "book.md"
OUTPUT_PATH = BOOK_DIR / "book_cn.md"
CACHE_DIR = BOOK_DIR / ".cache" / "lake_prayers_cn_sections"
MODEL = "gemini-3.8-flash"
ROMAN_HEADING = re.compile(r"(?=[IVXLCDM]+\Z)[IVXLCDM]+")
CYRILLIC = re.compile(r"[\u0400-\u052f]")
TERM_NORMALIZATIONS = {
    "三位一体": "三一",
    "天主之母": "诞神女",
    "上帝之母": "诞神女",
    "圣神": "圣灵",
    "有福了": "福哉",
    "有祸了": "祸哉",
    "安戈洛": "天使",
}

SYSTEM_PROMPT = """\
你是一位精通塞尔维亚文、中文及东方正教神学传统的忠实译者。请把用户给出的一篇《湖畔祈祷》译成简体中文。

硬性要求：
1. 忠实翻译，不删减、不增补、不解释；只返回指定 JSON，不要标题、按语或 Markdown 代码围栏。
2. 输入是一篇独立祷文。输出 paragraphs 数组必须与输入段落一一对应，数量、次序完全相同；每个输入段落只可对应一个输出段落，不可合并、拆分或留空。
3. 保持祷文的诗性、反复、对偶、排比、呼告和意象。相同句式与关键词应尽量采用相同中文，不要把刻意反复改写成近义句。
4. 使用庄重、可诵读的东正教中文，但不要写成艰深文言，也不要采用基督新教《和合本》腔调。
5. 固定用词：Бог/Боже 译为“上帝”；Богородица 译为“诞神女”；Тројица 及表示三位一体的称谓译为“三一”；Дух Свети 译为“圣灵”；анђео 译为“天使”。表达“有福的是……”的句式用“福哉，……的人”；表达“有祸的是……”用“祸哉，……的人”。Радуј се 一类圣母赞词用“庆哉”，若出现固定副歌则用“庆哉，永贞之净配”。“如今、永远、世世代代”一类礼仪结语用“自今至永远，及于万世”。
6. 对上帝、圣父、圣子、圣灵或三一：第二人称用“祢/祢的”，第三人称用“祂/祂的”。对诞神女：第二人称用“祢/祢的”，第三人称用“她/她的”。普通人使用“你/他/她”。必须依据所指对象区分，不可机械混用。
7. Господ/Господе 依语境译为“主/上主”；祷告中的呼格可用“主啊”。不要把神学上的位格误译为泛神论意义的“神明”。
8. 原文虽以塞尔维亚语西里尔字母书写，不可残留未翻译的西里尔文字；专名也应音译为中文。

请尤其留意圣尼古拉·维利米罗维奇的神学意象：不要削弱悔罪、复活、恩典、永恒、三一及基督论含义，也不要擅自把诗性隐喻解释成教义注释。
"""


class TranslationResult(BaseModel):
    paragraphs: list[str] = Field(description="逐段对应的中文译文")


@dataclass(frozen=True)
class Section:
    number: int
    heading: str
    paragraphs: tuple[str, ...]

    @property
    def source_hash(self) -> str:
        text = self.heading + "\n\n" + "\n\n".join(self.paragraphs)
        return hashlib.sha256(text.encode("utf-8")).hexdigest()


def parse_source(text: str) -> tuple[str, list[Section], str]:
    lines = text.splitlines()
    if not lines or not lines[0].startswith("# "):
        raise ValueError("源文件缺少一级标题")

    heading_indexes = [
        index for index, line in enumerate(lines) if ROMAN_HEADING.fullmatch(line)
    ]
    if len(heading_indexes) != 100:
        raise ValueError(f"预期 100 篇祷文，实际找到 {len(heading_indexes)} 篇")

    sections: list[Section] = []
    for number, start in enumerate(heading_indexes, 1):
        end = heading_indexes[number] if number < len(heading_indexes) else len(lines)
        chunk = "\n".join(lines[start + 1 : end]).strip()
        paragraphs = tuple(part.strip() for part in re.split(r"\n\s*\n", chunk) if part.strip())
        if not paragraphs:
            raise ValueError(f"第 {number} 篇没有正文")
        sections.append(Section(number, lines[start], paragraphs))

    # The two colophon paragraphs after prayer C are not part of the prayer.
    last = sections[-1]
    if last.paragraphs[-2:] != ("На Охридском језеру", "1921-1922 године."):
        raise ValueError("未识别到原书末尾题记")
    sections[-1] = Section(last.number, last.heading, last.paragraphs[:-2])
    colophon = "于奥赫里德湖畔\n\n1921—1922年。"
    return lines[0], sections, colophon


def cache_path(section: Section) -> Path:
    return CACHE_DIR / f"{section.number:03d}.json"


def clean_paragraph(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text)
    return text.strip()


def validate(section: Section, paragraphs: list[str]) -> list[str]:
    cleaned = [clean_paragraph(paragraph) for paragraph in paragraphs]
    if len(cleaned) != len(section.paragraphs):
        raise ValueError(
            f"段落数不符：原文 {len(section.paragraphs)}，译文 {len(cleaned)}"
        )
    if any(not paragraph for paragraph in cleaned):
        raise ValueError("译文含空段")
    residue = sorted(set(CYRILLIC.findall("\n".join(cleaned))))
    if residue:
        raise ValueError(f"译文残留西里尔字母：{''.join(residue[:20])}")
    if any("```" in paragraph for paragraph in cleaned):
        raise ValueError("译文含 Markdown 代码围栏")
    return cleaned


def read_cache(section: Section) -> list[str] | None:
    path = cache_path(section)
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("model") != MODEL or data.get("source_hash") != section.source_hash:
            return None
        return validate(section, data["paragraphs"])
    except (OSError, KeyError, TypeError, ValueError, json.JSONDecodeError):
        return None


def write_cache(section: Section, paragraphs: list[str]) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = cache_path(section)
    temporary = path.with_suffix(".json.tmp")
    temporary.write_text(
        json.dumps(
            {
                "model": MODEL,
                "source_hash": section.source_hash,
                "heading": section.heading,
                "paragraphs": paragraphs,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    os.replace(temporary, path)


def translate_section(client: genai.Client, section: Section, retries: int) -> list[str]:
    numbered = "\n\n".join(
        f"[{index}] {paragraph}"
        for index, paragraph in enumerate(section.paragraphs, 1)
    )
    prompt = (
        f"这是第 {section.heading} 篇，共 {len(section.paragraphs)} 个段落。"
        "请逐段翻译；方括号编号仅用于对齐，不要写入译文。\n\n"
        + numbered
    )

    error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=prompt,
                config=GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    response_schema=TranslationResult,
                    temperature=0.25,
                ),
            )
            parsed = response.parsed
            if parsed is None:
                if not response.text:
                    raise ValueError("Gemini 没有返回正文")
                parsed = TranslationResult.model_validate_json(response.text)
            paragraphs = validate(section, parsed.paragraphs)
            return paragraphs
        except Exception as exc:  # Retry only the current section.
            error = exc
            print(
                f"  第 {section.heading} 篇第 {attempt}/{retries} 次尝试失败：{exc}",
                file=sys.stderr,
                flush=True,
            )
            if attempt < retries:
                time.sleep(min(2**attempt, 12))
    raise RuntimeError(f"第 {section.heading} 篇翻译失败") from error


def assemble(sections: list[Section], translations: dict[int, list[str]], colophon: str) -> str:
    chunks = ["# 湖畔祈祷"]
    for section in sections:
        paragraphs = translations[section.number]
        for source, preferred in TERM_NORMALIZATIONS.items():
            paragraphs = [paragraph.replace(source, preferred) for paragraph in paragraphs]
        chunks.append(section.heading + "\n\n" + "\n\n".join(paragraphs))
    chunks.append(colophon)
    return "\n\n".join(chunks).rstrip() + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="使用 Gemini 逐篇翻译《湖畔祈祷》，并支持检查点续跑。"
    )
    parser.add_argument("--start", type=int, default=1, help="本次开始篇号（默认 1）")
    parser.add_argument("--end", type=int, default=100, help="本次结束篇号（默认 100）")
    parser.add_argument("--retries", type=int, default=5, help="单篇最大尝试次数")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not 1 <= args.start <= args.end <= 100:
        raise SystemExit("--start/--end 必须满足 1 <= start <= end <= 100")
    if args.retries < 1:
        raise SystemExit("--retries 必须至少为 1")

    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise SystemExit("未找到 GOOGLE_API_KEY 或 GEMINI_API_KEY")

    _, sections, colophon = parse_source(SOURCE_PATH.read_text(encoding="utf-8"))
    client = genai.Client(api_key=api_key)
    translations: dict[int, list[str]] = {}

    print(f"模型：{MODEL}；源文：100 篇；本次范围：{args.start}–{args.end}", flush=True)
    for section in sections:
        cached = read_cache(section)
        if cached is not None:
            translations[section.number] = cached
            print(f"[{section.number:03d}/100] {section.heading}：使用缓存", flush=True)
            continue
        if not args.start <= section.number <= args.end:
            continue
        print(
            f"[{section.number:03d}/100] {section.heading}：翻译 {len(section.paragraphs)} 段",
            flush=True,
        )
        translated = translate_section(client, section, args.retries)
        write_cache(section, translated)
        translations[section.number] = translated

    missing = [section.number for section in sections if section.number not in translations]
    if missing:
        print(
            f"本次范围完成；尚缺 {len(missing)} 篇缓存，未写入正式译本。",
            flush=True,
        )
        return 0

    output = assemble(sections, translations, colophon)
    temporary = OUTPUT_PATH.with_suffix(".md.tmp")
    temporary.write_text(output, encoding="utf-8")
    os.replace(temporary, OUTPUT_PATH)
    print(f"全部完成：{OUTPUT_PATH}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
