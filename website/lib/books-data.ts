import { globSync } from "glob"
import type { Book } from "./types"
import {transliterate} from "./utils"
import yaml from "js-yaml"
import * as fs from "fs"


export interface BookMeta {
  id: string
  title: [string, string]
  author: [string, string]
}

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

function retrieve_book_data(): {[id: string]: Book} {
  let books: [string, Book][] = [];
  for (const path of globSync("../**/book.yaml")) {
    const book = transform(yaml.load(fs.readFileSync(path, 'utf8'))) as Book;
    const id = transliterate(book.title[0] + "." + book.authors.map(a => a[0]).join("."));
    books.push([id, {...book}]);
  }
  return Object.fromEntries(books);
}

export function retrieve_book(id: string): Book | null {
  fetch("")
  return books[id] || null
}

export const books: {[id: string]: Book } = retrieve_book_data();

export const booksMeta: BookMeta[] = Object.entries(books).map(([id, book]) => ({
  id, title: book.title, author: book.authors[0]}));