import { transliterate } from "@/lib/utils"

export interface BookMeta {
  filepath: string
  title: [string, string]
  authors: [string, string][]
  languages: string[]
}

export function get_book_id(bookmeta: BookMeta): string {
  const title = bookmeta.title[0] || bookmeta.title[1] || bookmeta.filepath
  const authors = (bookmeta.authors || [])
    .map((author) => author[0] || author[1])
    .filter(Boolean)
    .join(".")
  return transliterate(title + "." + authors)
}
