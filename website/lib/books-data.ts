import { globSync } from "glob"
import type { Book } from "./types"
import {transliterate} from "./utils"
import yaml from "js-yaml"
import * as yaml2 from "yaml"
import * as fs from "fs"
import { encode } from "punycode"


export interface BookMeta {
  filepath: string
  title: [string, string]
  authors: [string, string][]
  languages: string[]
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

export async function retrieve_book(id: string): Promise<Book | null> {
  const metadata = await retrieve_book_metadata();
  console.log(id);
  const book = metadata.find(b => get_book_id(b) === id);
  console.log(book);
  if (!book) {
    return null;
  }
  const data = await fetch(`https://raw.githubusercontent.com/YuantianDing/OrthodoxTranslationZH/refs/heads/master/${encodeURI(book?.filepath)}`)
  if (!data.ok) {
    return null;
  }
  return transform(yaml2.parse(await data.text())) as Book;
}
export async function retrieve_book_metadata(): Promise<BookMeta[]> {
  const data = await fetch("https://raw.githubusercontent.com/YuantianDing/OrthodoxTranslationZH/refs/heads/master/metadata.yaml")
  const result =  transform(yaml.load(await data.text())) as BookMeta[];
  return result;
}

export function get_book_id(bookmeta: BookMeta): string {
  const id = transliterate(bookmeta.title[0] + "." + bookmeta.authors.map(a => a[0]).join("."));
  return id;
}