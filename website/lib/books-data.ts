import { globSync } from "glob"
import type { Book } from "./types"
import {transliterate} from "./utils"
import yaml from "js-yaml"
import * as fs from "fs"
import { encode } from "punycode"


export interface BookMeta {
  filepath: string
  title: [string, string]
  author: [string, string][]
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
  const data = await fetch(`https://raw.githubusercontent.com/YuantianDing/OrthodoxTranslationZH/refs/heads/master/${encodeURI(id)}`)
  if (!data.ok) {
    return null;
  }
  return transform(yaml.load(await data.text())) as Book;
}
export async function retrieve_book_metadata(): Promise<BookMeta[]> {
  const data = await fetch("https://raw.githubusercontent.com/YuantianDing/OrthodoxTranslationZH/refs/heads/master/metadata.yaml")
  return transform(yaml.load(await data.text())) as BookMeta[];
}