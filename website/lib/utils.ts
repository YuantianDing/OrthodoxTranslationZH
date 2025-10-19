import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


const translitMap: { [key: string]: string } = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
}

export function transliterate(str: string): string {
  return str
    .toLowerCase()
    .split("")
    .map((char) => translitMap[char] || char)
    .join("")
    .replace(",", "_")
    .replace(/[^a-z0-9 -\.~]/g, "")
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_")
}

export function regexReplaceAll<T>(
  text: string,
  regex: RegExp,
  replacement: (match: RegExpExecArray) => T | undefined
): (string | T)[] {
  let match;
  let result = [];
  let lastIndex = 0;
  while ((match = regex.exec(text)) !== null) {
    const t = replacement(match);
    if (t !== undefined) {
      result.push(text.slice(lastIndex, match.index));
      result.push(t);
      lastIndex = match.index + match[0].length
    }
  }
  result.push(text.slice(lastIndex));
  return result;
}