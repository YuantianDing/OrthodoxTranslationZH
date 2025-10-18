"use client"

import { JSX, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronRight, Search, ArrowLeft, HelpCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type React from "react"
import type { Block, Heading } from "@/lib/types"
import { retrieve_book } from "@/lib/books-data"

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

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  const regex = /\[(\d+)\]/g
  let match

  while ((match = regex.exec(text)) !== null) {
    const footnoteId = match[1]
    const footnote = footnotes[footnoteId]

    if (footnote) {
      parts.push(text.slice(lastIndex, match.index))
      parts.push(
        <FootnoteMarker key={`${footnoteId}-${match.index}`} id={footnoteId} footnote={footnote} language={language} />,
      )
      lastIndex = match.index + match[0].length
    }
  }

  parts.push(text.slice(lastIndex))
  return parts
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

export default async function OrthodoxComparison({ bookId }: { bookId: string }) {
  const book = await retrieve_book(bookId)
  if (!book) {
    return (
      <div className="flex flex-col items-center justify-center">
        <p className="font-serif text-[30vh] text-muted-foreground">?</p>
        <p className="text-2xl text-muted-foreground">{"Книга не найдена / 未找到书籍"}</p>
      </div>
    )
  }

  const [activeSection, setActiveSection] = useState("")
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const contentRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

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

  const allHeadings = flattenBlocks(book.document)

  useEffect(() => {
    if (allHeadings.length > 0) {
      setActiveSection(allHeadings[0].id)
      setExpandedSections(new Set(allHeadings.map((h) => h.id)))
    }
  }, [bookId])

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

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
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

  const renderBlock = (block: Block, index: number, parentId = ""): React.ReactNode => {
    const id = generateBlockId(block, index, parentId)

    if (block.type === "paragraph") {
      const [russian, chinese] = block.text
      if (!matchesSearch(block)) return null

      return (
        <div key={id} className="grid gap-8 md:grid-cols-2">
          <div className="space-y-2">
            <p className="leading-relaxed text-foreground">
              {searchQuery
                ? highlightText(russian, searchQuery)
                : parseTextWithFootnotes(russian, book.footnotes, "russian")}
            </p>
          </div>
          <div className="space-y-2">
            <p className="leading-relaxed text-foreground">
              {searchQuery
                ? highlightText(chinese, searchQuery)
                : parseTextWithFootnotes(chinese, book.footnotes, "chinese")}
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
            <div className="mb-6 flex items-center justify-between gap-8">
              <HeaderTag className={cn(headingClasses, "text-left")}>
                {searchQuery ? highlightText(russian, searchQuery) : russian}
              </HeaderTag>
              <div className="h-8 w-px" />
              <HeaderTag className={cn(headingClasses, "text-right")}>
                {searchQuery ? highlightText(chinese, searchQuery) : chinese}
              </HeaderTag>
            </div>
            <div className="space-y-6">
              {heading.children.map((child, childIndex) => renderBlock(child, childIndex, id))}
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
    if (item.block.type === "paragraph") return null

    const heading = item.block as Heading
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
            onClick={() => scrollToSection(item.id)}
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-[110vh] px-4 py-6">
          <div className="mb-4 flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                {"Назад / 返回"}
              </Button>
            </Link>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Поиск в тексте / 搜索文本..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="flex-1 text-left font-serif text-3xl font-bold text-foreground">{book.title[0]}</h1>
            <div className="mx-8 h-12 w-px" />
            <h1 className="flex-1 text-right font-serif text-3xl font-bold text-foreground">{book.title[1]}</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[110vh]">
        <aside className="sticky top-0 hidden h-screen w-64 overflow-y-auto border-r border-border p-6 lg:block">
          <nav>
            <h2 className="mb-4 font-serif text-lg font-semibold text-foreground">{"Содержание"}</h2>
            <ul className="space-y-2">{allHeadings.map((item) => renderTocItem(item, "russian"))}</ul>
          </nav>
        </aside>

        <main className="flex-1 px-4 py-8 md:px-8 bg-card" ref={contentRef}>
          <div className="mx-auto max-w-5xl space-y-12">
            {book.document.map((block, index) => renderBlock(block, index))}
          </div>
        </main>

        <aside className="sticky top-0 hidden h-screen w-64 overflow-y-auto border-l border-border p-6 lg:block">
          <nav>
            <h2 className="mb-4 font-serif text-lg font-semibold text-foreground">{"目录"}</h2>
            <ul className="space-y-2">{allHeadings.map((item) => renderTocItem(item, "chinese"))}</ul>
          </nav>
        </aside>
      </div>
    </div>
  )
}
