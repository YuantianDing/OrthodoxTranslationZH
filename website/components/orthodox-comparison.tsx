"use client"

import { JSX, useEffect, useRef, useState } from "react"
import { cn, regexReplaceAll } from "@/lib/utils"
import { ChevronDown, ChevronRight, Search, ArrowLeft, Menu } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type React from "react"
import type { Block, Book, Heading } from "@/lib/types"
import { retrieve_book } from "@/lib/books-data"
import { set } from "react-hook-form"

function FootnoteMarker({
  id,
  footnote,
  language,
}: {
  id: string
  footnote: [string, string]
  language: "russian" | "chinese"
}) {
  const [isHovered, setIsHovered] = useState(false)
  const text = language === "russian" ? footnote[0] : footnote[1]

  return (
    <span className="relative inline-block">
      <sup
        className="cursor-help text-accent transition-colors hover:text-accent/80"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        [{id}]
      </sup>
      {isHovered && (
        <span className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-md border border-border bg-card p-3 text-sm leading-relaxed text-foreground shadow-lg">
          {text}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-card" />
        </span>
      )}
    </span>
  )
}

function parseTextWithFootnotes(
  text: string,
  footnotes: { [key: string]: [string, string] },
  language: "russian" | "chinese",
): React.ReactNode {
  if (!footnotes || Object.keys(footnotes).length === 0) {
    return text
  }
  return regexReplaceAll(text, /\[([авaв]?\d+)\]/g, match => {
    const footnoteId = match[1].replace("a", "а").replace("в", "в")
    const footnote = footnotes[footnoteId]; 
    if (footnote) {
      return <FootnoteMarker key={`${footnoteId}-${match.index}`} id={footnoteId} footnote={footnote} language={language} />;
    }
  })
}

function parseText(
  text: string,
  footnotes: { [key: string]: [string, string] },
  language: "russian" | "chinese",
) : React.ReactNode {
  let key_id = 0;
  return regexReplaceAll(text, /「.*?」|«.*?»|（.*?）|\(.*?\)|《.*?》/g, match => {
    if (match[0][0] === '「' || match[0][0] === '«') {
      return <span key={key_id++} className="text-content-quote">{parseTextWithFootnotes(match[0], footnotes, language)}</span>
    } else if (match[0][0] === '（' || match[0][0] === '(' || match[0][0] === '《') {
      return <span key={key_id++} className="text-content-ref">{parseTextWithFootnotes(match[0], footnotes, language)}</span>
    }
  }).map(p => typeof p === 'string' ? parseTextWithFootnotes(p, footnotes, language) : p);
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
  const parts = text.split(regex)

  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className="bg-accent/30 text-foreground">
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

export default function OrthodoxComparison({ book }: { book: Book | null }) {

  const [activeSection, setActiveSection] = useState("")
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const contentRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const [displayMode, setDisplayMode] = useState<'both' | 'ru' | 'cn'>('both')

  const generateBlockId = (block: Block, index: number, parentId = ""): string => {
    const prefix = parentId ? `${parentId}-` : ""
    return `${prefix}block-${index}`
  }

  const flattenBlocks = (blocks: Block[], parentId = ""): Array<{ id: string; block: Block; level: number }> => {
    const result: Array<{ id: string; block: Block; level: number }> = []
    blocks.forEach((block, index) => {
      const id = generateBlockId(block, index, parentId)
      if (block.type !== "paragraph") {
        const level = Number.parseInt(block.type.replace("heading", ""))
        result.push({ id, block, level })
        if (block.children) {
          result.push(...flattenBlocks(block.children, id))
        }
      }
    })
    return result
  }

  const allHeadings = flattenBlocks(book?.document ?? [])

  useEffect(() => {
    if(window.screen.width < 1024) {
      setDisplayMode('cn');
    }
  }, [])
  useEffect(() => {
    if (allHeadings.length > 0) {
      setActiveSection(allHeadings[0].id)
      setExpandedSections(new Set(allHeadings.map((h) => h.id)))
    }
  }, [book])

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      {
        rootMargin: "-20% 0px -70% 0px",
      },
    )

    const sectionElements = document.querySelectorAll("[data-section]")
    sectionElements.forEach((el) => observerRef.current?.observe(el))

    return () => {
      observerRef.current?.disconnect()
    }
  }, [searchQuery])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log("Current Book Data:", displayMode);
      // if (e.key === "z") {
      //   if (displayMode !== 'cn') {
      //     setDisplayMode('cn')
      //   } else {
      //     setDisplayMode('both')
      //   }
      // }
      // if (e.key === "r") {
      //   if (displayMode !== 'cn') {
      //     setDisplayMode('cn')
      //   } else {
      //     setDisplayMode('both')
      //   }
      // }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [displayMode, setDisplayMode])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "instant", block: "start" })
    }
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  const matchesSearch = (block: Block): boolean => {
    if (!searchQuery.trim()) return true

    const query = searchQuery.toLowerCase()
    const [russian, chinese] = block.text

    return russian.toLowerCase().includes(query) || chinese.includes(searchQuery)
  }

  const renderBlock = (block: Block, index: number, parentId = "", displayMode: 'both' | 'cn' | 'ru'): React.ReactNode => {
    const id = generateBlockId(block, index, parentId)

    if (!block.hasOwnProperty("children")) {
      const [russian, chinese] = block.text
      if(!russian || !chinese) return null
      if (!matchesSearch(block)) return null

      return (
        <div key={id} className={`grid gap-8 ${ (displayMode === 'both' ? 'md:grid-cols-2' : 'grid-cols-1') }`}>
          <div className="space-y-2" style={(displayMode === 'both' || displayMode === 'ru') ? {} : { display: 'none'}}>
            <p className="leading-relaxed text-foreground">
              {block.initial? <strong className="mr-1">{block.initial[0]}</strong> : null}
              {searchQuery
                ? highlightText(russian, searchQuery)
                : (block.label ?? []).includes("original_title")
                ? <span key="1" className="text-muted-foreground">{russian}</span>
                : parseText(russian, book?.footnotes ?? {}, "russian")}
            </p>
          </div>
          <div className="space-y-2" style={(displayMode === 'both' || displayMode === 'cn') ? {} : { display: 'none'}}>
            <p className="leading-relaxed text-foreground">
              {block.initial? <strong className="mr-1">{block.initial[1]}</strong> : null}
              {searchQuery
                ? highlightText(chinese, searchQuery)
                : (block.label ?? []).includes("original_title")
                ? <span key="1" className="text-muted-foreground">{chinese}</span>
                : parseText(chinese, book?.footnotes ?? {}, "chinese")}
            </p>
          </div>
        </div>
      )
    }

    const heading = block as Heading
    const [russian, chinese] = heading.text
    const level = Number.parseInt(heading.type.replace("heading", ""))
    const headingSize = level === 1 ? "text-3xl" : level === 2 ? "text-2xl" : level === 3 ? "text-xl" : "text-lg"

    const hasVisibleChildren = heading.children.some((child) => matchesSearch(child))
    if (!matchesSearch(heading) && !hasVisibleChildren) return null

    const headingClasses = cn("flex-1 font-serif font-bold text-foreground", headingSize)
    const HeaderTag = `h${level}` as keyof JSX.IntrinsicElements

    return (
      <div key={index} className="border-b border-border pb-12 last:border-b-0">
        <div key={id} className={level > 2 ? "mt-8" : ""}>
          <section id={id} data-section className="scroll-mt-8">
            <div className="mb-6 flex items-start justify-between gap-8">
              <HeaderTag className={cn(headingClasses, "text-left")} style={(displayMode === 'both' || displayMode === 'ru') ? {} : { display: 'none'}}>
                {block.initial? <strong className="pr-1">{block.initial[0]}</strong> : null}
                {searchQuery ? highlightText(russian, searchQuery) : russian}
              </HeaderTag>
              {/* <div className="h-8 w-px" /> */}
              <HeaderTag className={cn(headingClasses, "text-left")} style={(displayMode === 'both' || displayMode === 'cn') ? {} : { display: 'none'}}>
                {block.initial? <strong className="pr-1">{block.initial[1]}</strong> : null}
                {searchQuery ? highlightText(chinese, searchQuery) : chinese}
              </HeaderTag>
            </div>
            <div className="space-y-6">
              {heading.children.map((child, childIndex) => renderBlock(child, childIndex, id, displayMode))}
            </div>
          </section>
        </div>
      </div>
    )
  }

  const renderTocItem = (
    item: { id: string; block: Block; level: number },
    language: "russian" | "chinese",
  ): React.ReactNode => {
    if (!item.block.hasOwnProperty("children"))
        return null

    const heading = item.block as unknown as Heading

    const title = language === "russian" ? heading.text[0] : heading.text[1]
    const hasChildren = heading.children.some((child) => child.type !== "paragraph")
    const isExpanded = expandedSections.has(item.id)
    const indent = (item.level - 2) * 16

    return (
      <li key={item.id} style={{ marginLeft: `${indent}px` }}>
        <div className="flex items-center gap-1">
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleSection(item.id)
              }}
              className="flex-shrink-0 p-0.5 text-muted-foreground hover:text-foreground"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <button
            onClick={() => {
              if(window.screen.width < 1024) {
                const main = document.querySelector('main');
                const tocRu = document.querySelector('aside:nth-of-type(1)');
                const tocCn = document.querySelector('aside:nth-of-type(2)');
                const title = document.querySelector('header:nth-of-type(2)');
                if (main) main.classList.remove('hidden');
                if (tocRu) tocRu.classList.add('hidden');
                if (tocCn) tocCn.classList.add('hidden');
                if (title) title.classList.remove('hidden');
                setTimeout(() => { scrollToSection(item.id); }, 0);
              } else {
                scrollToSection(item.id);
              }
            }}
            className={cn(
              "flex-1 text-left text-sm transition-colors hover:text-accent",
              activeSection === item.id ? "font-semibold text-accent" : "text-muted-foreground",
            )}
          >
            {title}
          </button>
        </div>
      </li>
    )
  }
  if (!book) {
    return (
      <div className="flex flex-col items-center justify-center">
        <p className="font-serif text-[30vh] text-muted-foreground">?</p>
        <p className="text-2xl text-muted-foreground">{"Книга не найдена / 未找到书籍"}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen max-w-screen bg-background w-full">
      <header className="bg-card w-full sticky top-0 z-50">
        <div className="mx-auto max-w-[150vh] px-4 pb-4 pt-6 ">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden lg:inline">{"Назад / 返回"}</span>
                <span className="inline lg:hidden">{"返回"}</span>
              </Button>
            </Link>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Поиск в тексте / 搜索文本..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setDisplayMode((prev) => {
                    if (prev === "both") return "cn"
                    if (prev === "cn") return "ru"
                    return "both"
                  })
                }
                className="w-20 h-9"
              >
                {displayMode === "both" && "Ру | 中"}
                {displayMode === "ru" && "Русский"}
                {displayMode === "cn" && "中文"}
              </Button>
            </div>
            <div className="lg:hidden">
              <Button
              variant="outline"
              size="icon"
              onClick={() => {
                  const main = document.querySelector('main');
                  const tocRu = document.querySelector('aside:nth-of-type(1)');
                  const tocCn = document.querySelector('aside:nth-of-type(2)');
                  const title = document.querySelector('header:nth-of-type(2)');
                  if (main) main.classList.toggle('hidden');
                  if (tocRu) tocRu.classList.toggle('hidden');
                  if (tocCn) tocCn.classList.toggle('hidden');
                  if (title) title.classList.toggle('hidden');
              }}
              className="h-9 w-9"
              >
              <Menu className="h-4 w-4"/>
              </Button>
            </div>
          </div>
        </div>
      </header>
      <header className="bg-card w-full">
        <div className="mx-auto max-w-[150vh] px-4 pb-6">
          <div className="flex items-center justify-between h-12">
            { (displayMode == 'both' || displayMode == 'ru') &&
              <h1 className={`flex-1 text-${displayMode == 'both' ? 'left' : 'center'} font-serif text-3xl font-bold text-foreground `}>{book.title[0]}</h1>
            }
            {/* <div className="mx-8  w-px" /> */}
            { (displayMode == 'both' || displayMode == 'cn') &&
              <h1 className={`flex-1 text-${displayMode == 'both' ? 'right' : 'center'} font-serif text-3xl font-bold text-foreground`}>{book.title[1]}</h1>
            }
          </div>
        </div>
      </header>
      <div className="w-full bg-border h-[1px] sticky top-[71.25px]"/>

      <div className="mx-auto flex max-w-[150vh] font-serif">
        <aside className="sticky top-[71.25px] hidden h-screen-no-search min-w-1/6 overflow-y-auto scrollbar_hidden p-6 lg:block" style={(displayMode === 'both' || displayMode === 'ru') ? {} : { display: 'none'}}>
          <nav>
            <h2 className="mb-4 font-serif text-lg font-semibold text-foreground">{"Содержание"}</h2>
            <ul className="space-y-2">{allHeadings.map((item) => renderTocItem(item, "russian"))}</ul>
          </nav>
        </aside>

        <main className="flex-1 px-4 py-8 md:px-8 bg-card min-w-2/3 border-x border-border" ref={contentRef}>
          <div className="mx-auto space-y-12">
            {book.document.map((block, index) => renderBlock(block, index, undefined, displayMode))}
          </div>
        </main>

        <aside className="sticky top-[71.25px] hidden h-screen-no-search min-w-1/6 overflow-y-auto scrollbar_hidden p-6 lg:block" style={(displayMode === 'both' || displayMode === 'cn') ? {} : { display: 'none'}}>
          <nav>
            <h2 className="mb-4 font-serif text-lg font-semibold text-foreground">{"目录"}</h2>
            <ul className="space-y-2">{allHeadings.map((item) => renderTocItem(item, "chinese"))}</ul>
          </nav>
        </aside>
      </div>
    </div>
  )
}
