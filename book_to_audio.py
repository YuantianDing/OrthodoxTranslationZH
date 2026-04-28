#!/usr/bin/env python3
"""
Convert a book.yaml file to audio files in a directory.
Each heading at the specified level becomes a separate MP3 file.
Supports interruption and resumption - skips existing files.

Usage:
    python book_to_audio.py <book.yaml> [output_dir] [--heading 1-4]
"""

import argparse
import asyncio
import os
import re
from pathlib import Path

import yaml
import edge_tts

VOICE = "zh-CN-YunjianNeural"


def load_book(yaml_path: str) -> dict:
    """Load and parse book.yaml file."""
    with open(yaml_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)


def sanitize_filename(name: str) -> str:
    """Sanitize string for use as filename."""
    # Remove or replace invalid characters
    name = re.sub(r'[<>:"/\\|?*]', '', name)
    name = re.sub(r'\s+', '_', name.strip())
    return name[:50]  # Limit length


def extract_text(block: dict, lang: str = 'cn') -> str:
    """Extract text from a block (heading or paragraph)."""
    parts = []

    # Get initial if present
    if 'initial' in block and isinstance(block['initial'], dict) and lang in block['initial']:
        initial = block['initial'][lang].strip()
        if initial:
            parts.append(initial)

    # Get main text
    if 'text' in block:
        text = block['text']
        if isinstance(text, dict) and lang in text:
            parts.append(text[lang].strip())
        elif isinstance(text, str):
            parts.append(text.strip())

    return ' '.join(parts)


def collect_chapter_text(chapter: dict, lang: str = 'cn') -> list[str]:
    """Recursively collect all text from a chapter."""
    texts = []

    # Add chapter heading
    heading_text = extract_text(chapter, lang)
    if heading_text:
        texts.append(heading_text)

    # Process children
    def process_blocks(blocks: list):
        for block in blocks:
            text = extract_text(block, lang)
            if text:
                texts.append(text)
            if 'children' in block:
                process_blocks(block['children'])

    if 'children' in chapter:
        process_blocks(chapter['children'])

    return texts


def get_chapters(book: dict, heading_level: int = 1) -> list[dict]:
    """Extract all headings at the specified level from the book (recursive)."""
    chapters = []
    type_names = [f'heading{heading_level}', f'h{heading_level}']

    def search_blocks(blocks: list):
        for block in blocks:
            if block.get('type') in type_names:
                chapters.append(block)
            if 'children' in block:
                search_blocks(block['children'])

    search_blocks(book.get('document', []))
    return chapters


async def text_to_audio(text: str, output_path: str, voice: str = VOICE):
    """Convert text to audio using Edge TTS."""
    communicate = edge_tts.Communicate(text=text, voice=voice)
    await communicate.save(output_path)


async def generate_chapter_audio(
    chapter: dict,
    output_path: str,
    voice: str = VOICE,
    lang: str = 'cn'
):
    """Generate audio for a single chapter."""
    texts = collect_chapter_text(chapter, lang)

    if not texts:
        raise ValueError("No text found in chapter")

    # Join with pauses
    full_text = "。\n".join(texts)

    await text_to_audio(full_text, output_path, voice)


async def generate_book_audio(
    book: dict,
    output_dir: str,
    voice: str = VOICE,
    lang: str = 'cn',
    force: bool = False,
    heading_level: int = 1
):
    """Generate audio for all chapters in the book."""
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)

    chapters = get_chapters(book, heading_level)

    if not chapters:
        print(f"No chapters (heading{heading_level}) found in book")
        return

    print(f"Found {len(chapters)} chapters")

    # Generate title audio if present
    title = book.get('title', {})
    title_text = title.get(lang, '') if isinstance(title, dict) else str(title)

    if title_text:
        title_file = os.path.join(output_dir, "000_标题.mp3")
        if force or not os.path.exists(title_file):
            print(f"Generating: 000_标题.mp3")
            # Include authors
            authors = book.get('authors', [])
            author_texts = []
            for author in authors:
                if isinstance(author, dict) and lang in author:
                    author_texts.append(author[lang])

            full_title = title_text
            if author_texts:
                full_title += "。作者：" + "，".join(author_texts)

            await text_to_audio(full_title, title_file, voice)
            print(f"  Done: 000_标题.mp3")
        else:
            print(f"Skipping (exists): 000_标题.mp3")

    # Generate each chapter
    for i, chapter in enumerate(chapters, 1):
        # Get chapter title for filename
        chapter_initial = ""
        if 'initial' in chapter and isinstance(chapter['initial'], dict):
            chapter_initial = chapter['initial'].get(lang, '')

        chapter_title = ""
        if 'text' in chapter:
            text = chapter['text']
            if isinstance(text, dict):
                chapter_title = text.get(lang, '')
            else:
                chapter_title = str(text)

        # Create filename
        safe_initial = sanitize_filename(chapter_initial)
        safe_title = sanitize_filename(chapter_title)
        filename = f"{i:03d}_{safe_initial}_{safe_title}.mp3"
        output_path = os.path.join(output_dir, filename)

        # Skip if exists (allows interruption/resumption)
        if not force and os.path.exists(output_path):
            print(f"Skipping (exists): {filename}")
            continue

        print(f"Generating [{i}/{len(chapters)}]: {filename}")

        try:
            await generate_chapter_audio(chapter, output_path, voice, lang)
            print(f"  Done: {filename}")
        except Exception as e:
            print(f"  Error: {e}")
            # Continue with next chapter instead of failing
            continue


def main():
    parser = argparse.ArgumentParser(
        description="Convert book.yaml to audio directory using Edge TTS"
    )
    parser.add_argument(
        "input",
        help="Path to book.yaml file"
    )
    parser.add_argument(
        "output",
        nargs="?",
        default="book.audio",
        help="Output directory (default: book.audio)"
    )
    parser.add_argument(
        "--voice",
        default=VOICE,
        help=f"TTS voice to use (default: {VOICE})"
    )
    parser.add_argument(
        "--lang",
        default="cn",
        choices=["cn", "ru"],
        help="Language to extract (default: cn)"
    )
    parser.add_argument(
        "--force", "-f",
        action="store_true",
        help="Regenerate existing files"
    )
    parser.add_argument(
        "--heading", "-H",
        type=int,
        default=1,
        choices=[1, 2, 3, 4],
        help="Heading level to split chapters (default: 1)"
    )

    args = parser.parse_args()

    # Load book
    print(f"Loading {args.input}...")
    book = load_book(args.input)

    # Generate audio
    print(f"Output directory: {args.output}")
    print(f"Voice: {args.voice}")
    print(f"Language: {args.lang}")
    print(f"Heading level: {args.heading}")
    print()

    asyncio.run(generate_book_audio(
        book,
        args.output,
        args.voice,
        args.lang,
        args.force,
        args.heading
    ))

    print("\nDone!")


if __name__ == "__main__":
    main()
