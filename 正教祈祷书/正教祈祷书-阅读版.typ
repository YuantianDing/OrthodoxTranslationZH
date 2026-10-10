#set document(title: "正教祈祷书")

#set page(
  width: 5.5in,
  height: 8.5in,
  binding: left,
  margin: (inside: 0.62in, outside: 0.48in, top: 0.56in, bottom: 0.56in),
  header: context {
    let number = counter(page).get().first()
    if number > 1 {
      align(center, text(size: 7pt, fill: luma(48%))[正教祈祷书])
    }
  },
  footer: context {
    let number = counter(page).get().first()
    if number > 1 {
      align(center, text(size: 7.5pt, fill: luma(42%))[#number])
    }
  },
)

#set text(font: "Songti SC", size: 9.4pt, lang: "zh", region: "CN", fill: luma(10%))
#set par(justify: true, leading: 0.78em, spacing: 0.82em, first-line-indent: 2em)

#show heading.where(level: 1): it => block(
  width: 100%, above: 0em, below: 1.5em, breakable: false, sticky: true,
)[
  #align(center)[#text(size: 20pt, weight: "semibold", tracking: 0.16em)[#it.body]]
]

#show heading.where(level: 2): it => block(
  width: 100%, above: 1.45em, below: 0.8em, breakable: false, sticky: true,
)[
  #align(center)[#text(size: 11.2pt, weight: "semibold", tracking: 0.035em)[#it.body]]
]

#show heading.where(level: 3): it => block(
  width: 100%, above: 1.1em, below: 0.55em, breakable: false, sticky: true,
)[
  #text(size: 9.8pt, weight: "semibold")[#it.body]
]

#let render-paragraph(item) = {
  let clean = item.trim()
  if clean == "" { return }
  if clean.starts-with("# ") {
    heading(level: 1, outlined: true, clean.slice(2))
  } else if clean.starts-with("## ") {
    heading(level: 2, outlined: true, clean.slice(3))
  } else if clean.starts-with("### ") {
    heading(level: 3, outlined: true, clean.slice(4))
  } else {
    par[#clean.replace("\n", " ")]
  }
}

#let source = read("正教祈祷书.md")
#for item in source.split("\n\n") {
  render-paragraph(item)
}
