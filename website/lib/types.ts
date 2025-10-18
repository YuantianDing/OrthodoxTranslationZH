export interface Paragraph {
  type: "paragraph"
  initial: [string, string]
  text: [string, string]
  label?: string[]
}

export interface Heading {
  type: "heading1" | "heading2" | "heading3" | "heading4"
  initial: [string, string]
  text: [string, string]
  children: Block[]
  label?: string[]
}

export type Block = Paragraph | Heading

export interface Book {
  title: [string, string]
  document: Block[]
  footnotes: { [key: string]: [string, string] }
  authors: [string, string][]
}
