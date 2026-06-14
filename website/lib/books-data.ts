import type { Book } from "./types"
import yaml from "js-yaml"
import * as yaml2 from "yaml"
import fs from "node:fs"
import path from "node:path"
import { BookMeta, get_book_id } from "./book-ids"

const DATA_ROOT = fs.existsSync(path.join(process.cwd(), "..", "metadata.yaml"))
  ? path.resolve(process.cwd(), "..")
  : process.cwd()

const RAW_BASE_URL = "https://raw.githubusercontent.com/YuantianDing/OrthodoxTranslationZH/refs/heads/master"

let metadataCache: Promise<BookMeta[]> | null = null
const bookCache = new Map<string, Promise<Book | null>>()

function transform(data: any) : any {
  if (Array.isArray(data)) {
    return data.map(transform);
  } else if (data && typeof data === 'object') {
    if ('ru' in data && 'cn' in data || 'en' in data && 'cn' in data) {
      return [data['ru'] || data['en'], data['cn']];
    }
    const result: any = {};
    for (const key in data) {
      result[key] = transform(data[key]);
    }
    return result;
  } else {
    return data;
  }
}

export async function retrieve_book(id: string): Promise<Book | null> {
  const metadata = await retrieve_book_metadata()
  const book = metadata.find((b) => get_book_id(b) == id)
  if (!book) {
    return null
  }

  const cacheKey = book.filepath
  const cached = bookCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const result = loadBook(book.filepath)
  bookCache.set(cacheKey, result)
  return result
}

export async function retrieve_book_metadata(): Promise<BookMeta[]> {
  if (metadataCache) {
    return metadataCache
  }

  metadataCache = loadMetadata()
  return metadataCache
}

async function loadMetadata(): Promise<BookMeta[]> {
  const remote = await fetchText(`${RAW_BASE_URL}/metadata.yaml`)
  if (remote !== null) {
    return transform(yaml.load(remote)) as BookMeta[]
  }

  const metadataPath = path.join(DATA_ROOT, "metadata.yaml")
  return transform(yaml.load(fs.readFileSync(metadataPath, "utf8"))) as BookMeta[]
}

async function loadBook(filepath: string): Promise<Book | null> {
  const remote = await fetchText(`${RAW_BASE_URL}/${encodeURI(filepath)}`)
  if (remote !== null) {
    return transform(yaml2.parse(remote)) as Book
  }

  const filePath = path.join(DATA_ROOT, filepath)
  if (!fs.existsSync(filePath)) {
    return null
  }
  return transform(yaml2.parse(fs.readFileSync(filePath, "utf8"))) as Book
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { cache: "no-store" })
    if (!response.ok) {
      return null
    }
    return await response.text()
  } catch {
    return null
  }
}
