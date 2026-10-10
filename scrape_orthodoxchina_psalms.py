#!/usr/bin/env python3
"""Download the 1910 Russian Orthodox Chinese Psalter from orthodoxchina.cn."""

from __future__ import annotations

import argparse
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo


API_URL = "https://orthodoxchina.cn/api/bible/verses/"
SOURCE_URL = "https://orthodoxchina.cn/bible/reading/?v=ps.1&t=7"
TRANSLATION_ID = 7
TRANSLATION_TITLE = "俄羅斯正教聖經（1910）"
USER_AGENT = "personal-text-archiver/1.0 (single respectful download)"
RETRIEVED_DATE = datetime.now(
    ZoneInfo("America/Indiana/Indianapolis")
).date().isoformat()


def fetch_psalm(number: int, retries: int = 3) -> list[dict[str, Any]]:
    query = urlencode(
        {"bookCt": "ps", "query": str(number), "translations": TRANSLATION_ID}
    )
    request = Request(f"{API_URL}?{query}", headers={"User-Agent": USER_AGENT})

    for attempt in range(1, retries + 1):
        try:
            with urlopen(request, timeout=30) as response:
                payload = json.load(response)
            verses = payload.get("list")
            if not isinstance(verses, list):
                raise ValueError(f"第 {number} 咏响应中没有 list 数组")
            return verses
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
            if attempt == retries:
                raise RuntimeError(f"第 {number} 咏下载失败：{error}") from error
            time.sleep(2**attempt)

    raise AssertionError("unreachable")


def validate(chapters: dict[int, list[dict[str, Any]]]) -> None:
    for chapter, verses in chapters.items():
        for expected_verse, verse in enumerate(verses, start=1):
            if verse.get("chapterNum") != chapter:
                raise ValueError(
                    f"篇号不一致：请求 {chapter}，响应 {verse.get('chapterNum')}"
                )
            if verse.get("translationId") != TRANSLATION_ID:
                raise ValueError(
                    f"译本不一致：第 {chapter} 咏返回 {verse.get('translationId')}"
                )
            if verse.get("num") != expected_verse:
                raise ValueError(
                    f"节号不连续：第 {chapter} 咏应为 {expected_verse}，"
                    f"实际为 {verse.get('num')}"
                )
            # The source contains a few deliberately empty verse records. Keep
            # them so that all following source verse numbers remain unchanged.
            if not isinstance(verse.get("text"), str):
                raise ValueError(f"经文不是字符串：第 {chapter} 咏第 {expected_verse} 节")


def render_verse(text: str) -> str:
    """Keep source wording while making its underline markup portable Markdown."""
    return text.replace("<span class = 'underlineText'>", "<u>").replace(
        "</span>", "</u>"
    )


def render_markdown(chapters: dict[int, list[dict[str, Any]]]) -> str:
    lines = [
        "# 聖詠",
        "",
        f"- 译本：{TRANSLATION_TITLE}",
        f"- 来源：[{SOURCE_URL}]({SOURCE_URL})",
        f"- 抓取日期：{RETRIEVED_DATE}",
        "- 说明：原站使用繁体字与原有标点；本文逐字保留经文内容，并将原站专名下划线标签转换为通用 `<u>` 标签。",
        "",
    ]

    for chapter in range(1, 152):
        lines.extend((f"## 第{chapter}詠", ""))
        verses = chapters[chapter]
        if verses:
            lines.extend(
                f"{verse['num']}. {render_verse(verse['text'])}" for verse in verses
            )
        else:
            lines.append("> 原站接口未返回本篇经文。")
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("俄羅斯正教聖經（1910）/聖詠.md"),
        help="Markdown output path",
    )
    parser.add_argument(
        "--raw-output",
        type=Path,
        default=Path("俄羅斯正教聖經（1910）/聖詠.raw.json"),
        help="Raw JSON output path",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.25,
        help="Seconds to wait between requests",
    )
    args = parser.parse_args()

    chapters: dict[int, list[dict[str, Any]]] = {}
    for chapter in range(1, 152):
        chapters[chapter] = fetch_psalm(chapter)
        print(f"{chapter:3d}/151: {len(chapters[chapter]):3d} 节", flush=True)
        if chapter < 151:
            time.sleep(args.delay)

    validate(chapters)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.raw_output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(render_markdown(chapters), encoding="utf-8")
    args.raw_output.write_text(
        json.dumps(
            {
                "source": SOURCE_URL,
                "translationId": TRANSLATION_ID,
                "translationTitle": TRANSLATION_TITLE,
                "retrieved": RETRIEVED_DATE,
                "chapters": {str(number): verses for number, verses in chapters.items()},
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
