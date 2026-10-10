#!/usr/bin/env python3.11
"""Replace Theophylact commentary lemma translations with Chinese KJV text.

Only a `cn` field immediately paired with a Russian lemma for the book being
commented on is changed.  Commentary prose and all YAML structure are left
untouched.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent
BIBLE = ROOT / "中文英王钦定本" / "text"
COMMENTARIES = ROOT / "圣奥赫里德的狄奥菲拉克"

# Commentary directory: (Russian lemma abbreviation, KJV source abbreviation,
# Chinese reference label)
BOOKS = {
    "使徒行传注释": ("Деян", "徒", "使徒行传"),
    "雅各书注释": ("Иак", "雅", "雅各书"),
    "彼得前书注释": ("1Пет", "彼前", "彼得前书"),
    "彼得后书注释": ("2Пет", "彼後", "彼得后书"),
    "约翰一书注释": ("1Ин", "約一", "约翰一书"),
    "约翰二书注释": ("2Ин", "約二", "约翰二书"),
    "约翰三书注释": ("3Ин", "約三", "约翰三书"),
}


def load_bible() -> dict[tuple[str, int, int], str]:
    verses: dict[tuple[str, int, int], str] = {}
    for line in BIBLE.read_text(encoding="utf-8-sig").splitlines():
        match = re.fullmatch(r"([^0-9]+)(\d+):(\d+) (.*)", line)
        if match:
            book, chapter, verse, text = match.groups()
            verses[book, int(chapter), int(verse)] = text
    return verses


def replacement_text(
    bible: dict[tuple[str, int, int], str],
    source_book: str,
    label: str,
    chapter: int,
    first_verse: int,
    last_verse: int,
) -> str:
    # The Russian Synodal numbering used by this commentary has 3 John 1:15;
    # the Chinese KJV contains the same closing verse as 3 John 1:14.
    if source_book == "約三" and chapter == 1 and first_verse == last_verse == 15:
        first_verse = last_verse = 14
    parts = []
    for verse in range(first_verse, last_verse + 1):
        try:
            parts.append(bible[source_book, chapter, verse])
        except KeyError as exc:
            raise ValueError(f"Missing source verse: {source_book}{chapter}:{verse}") from exc
    reference = f"{chapter}:{first_verse}" if first_verse == last_verse else f"{chapter}:{first_verse}-{last_verse}"
    return f"({label} {reference}) {' '.join(parts)}"


def update_book(path: Path, russian_book: str, source_book: str, label: str, bible: dict[tuple[str, int, int], str], apply: bool) -> tuple[int, int]:
    lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
    lemma = re.compile(
        rf"^(?P<indent>\s*)ru: [\"']?{re.escape(russian_book)}\.(?P<chapter>\d+)[:.](?P<first>\d+)(?:[–-](?P<last>\d+))?\."
    )
    found = changed = 0
    for index, line in enumerate(lines):
        match = lemma.match(line)
        if not match:
            continue
        found += 1
        indent = match["indent"]
        cn_prefix = f"{indent}cn: "
        if index + 1 >= len(lines) or not lines[index + 1].startswith(cn_prefix):
            raise ValueError(f"{path}:{index + 1}: lemma is not immediately followed by cn field")
        chapter = int(match["chapter"])
        first = int(match["first"])
        last = int(match["last"] or first)
        expected = replacement_text(bible, source_book, label, chapter, first, last)
        newline = "\r\n" if lines[index + 1].endswith("\r\n") else "\n"
        proposed = f"{cn_prefix}{expected}{newline}"
        if lines[index + 1] != proposed:
            changed += 1
            if apply:
                lines[index + 1] = proposed
    if apply and changed:
        path.write_text("".join(lines), encoding="utf-8")
    return found, changed


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="write replacements; default is a dry run")
    args = parser.parse_args()
    bible = load_bible()
    total_found = total_changed = 0
    for directory, (russian_book, source_book, label) in BOOKS.items():
        found, changed = update_book(
            COMMENTARIES / directory / "book.yaml",
            russian_book,
            source_book,
            label,
            bible,
            args.apply,
        )
        print(f"{directory}: {found} lemma passages; {changed} {'updated' if args.apply else 'would update'}")
        total_found += found
        total_changed += changed
    print(f"Total: {total_found} lemma passages; {total_changed} {'updated' if args.apply else 'would update'}")


if __name__ == "__main__":
    main()
