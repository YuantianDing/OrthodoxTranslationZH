# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

**Orthodox Translation Hub (Chinese)** - A multilingual digital library that collects Eastern Orthodox spiritual texts and provides Chinese translations of Russian Orthodox literature. Uses AI (Google Gemini) for translation assistance and hosts content at https://orthodox-translation-zh.vercel.app/

## Repository Structure

```
OrthodoxTranslationZH/
├── [19 Author Directories]     # Chinese-named dirs (圣约翰托博尔斯基, 隐居者圣西奥凡, etc.)
│   └── [Work Subdirs]/book.yaml   # Individual book content with bilingual text
├── website/                    # Next.js frontend (Vercel deployment)
├── book-ed/                    # Rust project for book editing UI
├── .cache/                     # Translation and processing cache
├── *.py                        # Python processing scripts
├── metadata.yaml               # Central index of all 31 books
└── bible_books.yaml            # Bible book name mappings
```

## Key Technologies

- **Data Processing:** Python (google-genai, pydantic, pyparsing, yaml)
- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, Radix UI
- **Data Format:** YAML (primary), JSON (caching)
- **Deployment:** Vercel (static export)
- **AI Translation:** Google Gemini Flash

## Common Commands

### Website Development
```bash
cd website
npm install          # Install dependencies
npm run dev          # Development server
npm run build        # Production build (static export)
```

### Python Scripts
```bash
python gen_metadata.py        # Generate metadata.yaml from all book.yaml files
python fix_yaml.py            # Validate and sync YAML files
python make_typst.py          # Generate Typst documents for PDF
python gemini.py              # AI translation with caching
```

## Key Python Scripts

| Script | Purpose |
|--------|---------|
| `gemini.py` | AI translation using Gemini Flash with caching and validation |
| `cache.py` | MD5-based caching system for Gemini API calls |
| `yaml_type.py` | Custom YAML types: Block, Heading, Paragraph, Note, Book |
| `parsing.py` | Bible reference parsing and standardization |
| `fix_yaml.py` | YAML validation and file synchronization |
| `gen_metadata.py` | Generate metadata.yaml from all book.yaml files |
| `make_typst.py` | Typst document generation for PDF output |
| `langsync.py` | Language synchronization for bilingual editing |

## Data Flow

```
Russian Source (azbyka.ru) → Gemini Translation → Cached YAML Files
     → metadata.yaml → GitHub → Next.js Website → Vercel
```

## YAML Data Structure

Books use a hierarchical structure:
- **Headings (h1-h4):** Section headers with children blocks
- **Paragraphs:** Bilingual text content (ru/cn fields)
- **Notes:** Footnotes with bilingual support

Example in `yaml_type.py`:
```python
class Paragraph(Block):
    ru: str      # Russian text
    cn: str      # Chinese translation
    notes: list  # Optional footnotes
```

## Website Architecture

- `app/page.tsx` - Home page with book selection
- `app/compare/[book]/page.tsx` - Bilingual reader view
- `lib/books-data.ts` - Fetches from GitHub raw content
- `lib/types.ts` - TypeScript interfaces matching YAML structure
- `components/orthodox-comparison.tsx` - Main bilingual comparison reader

## Important Notes

- Content is fetched from GitHub raw content in production
- All translations are cached to minimize Gemini API costs
- Bible references use standardized format (see `parsing.py`)
- The website is statically exported for Vercel deployment
- Supports 19 Orthodox authors with 31+ works
