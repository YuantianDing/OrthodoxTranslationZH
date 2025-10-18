"use client"

import { useState, useRef, useEffect } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { BookMeta, retrieve_book_metadata } from "@/lib/books-data"

const truncateText = (text: string, maxLength = 30) => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + "..."
}

export default async function BookSelection() {
  const [searchQuery, setSearchQuery] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/") {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  const filteredBooks = (await retrieve_book_metadata()).filter(
    (book) =>
      book.title[0].toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.title[1].includes(searchQuery) ||
      book.author[0][0].toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author[0][1].includes(searchQuery),
  )

  const booksByAuthor = filteredBooks.reduce(
    (acc, book) => {
      const authorKey = `${book.author[0][0]}|${book.author[0][1]}`
      if (!acc[authorKey]) {
        acc[authorKey] = []
      }
      acc[authorKey].push(book)
      return acc
    },
    {} as Record<string, BookMeta[]>,
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="flex-1 text-left font-serif text-4xl font-bold text-foreground">
              {"Православная Литература"}
            </h1>
            <div className="mx-8 h-12 w-px bg-border" />
            <h1 className="flex-1 text-right font-serif text-4xl font-bold text-foreground">{"东正教文献"}</h1>
          </div>

          {/* Search Bar */}
          <div className="relative mx-auto max-w-2xl">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Поиск книг или авторов / 搜索书籍或作者..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-base"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-12">
        {Object.keys(booksByAuthor).length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg text-muted-foreground">{"Книги не найдены / 未找到书籍"}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(booksByAuthor).map(([authorKey, authorBooks]) => {
              const [author, authorChinese] = authorKey.split("|")
              return (
                <div key={authorKey} className="rounded-lg border border-border bg-card shadow-sm">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-1 border-border">
                        <th className="w-1/2 border-border pt-4 pb-3 pr-3 text-right font-serif text-2xl font-semibold text-foreground">
                          {author}
                        </th>
                        <th className="w-1/2 pt-4 pb-3 pl-3 text-left font-serif text-2xl font-semibold text-foreground">
                          {authorChinese}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {authorBooks.map((book) => (
                        <tr key={encodeURI(book.filepath)} className="group border-border transition-colors hover:bg-accent/5">
                          <td className="w-1/2 border-border py-3 pr-3 text-right">
                            <Link
                              href={`/compare/${encodeURI(book.filepath)}`}
                              className="inline-block font-serif text-lg text-foreground transition-colors hover:text-accent"
                              title={book.title[0]}
                            >
                              {truncateText(book.title[0])}
                            </Link>
                          </td>
                          <td className="w-1/2 py-3 pl-3 text-left">
                            <Link
                              href={`/compare/${encodeURI(book.filepath)}`}
                              className="inline-block font-serif text-lg text-foreground transition-colors hover:text-accent"
                              title={book.title[1]}
                            >
                              {truncateText(book.title[1])}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
