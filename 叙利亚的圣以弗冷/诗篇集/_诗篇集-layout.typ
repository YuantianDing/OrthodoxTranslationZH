#let make-volume(
  first: 1,
  last: 5,
  volume: "第一册",
  section-range: "第一部至第五部",
  body-size: 9.4pt,
  body-leading: 0.74em,
  body-spacing: 0.78em,
) = {
  set document(
    title: "诗篇集 · " + volume,
    author: "圣叙利亚的以弗冷",
  )

  set page(
    width: 5.5in,
    height: 8.5in,
    binding: left,
    margin: (inside: 0.62in, outside: 0.48in, top: 0.56in, bottom: 0.56in),
    header: context {
      let number = counter(page).get().first()
      if number > 1 {
        align(center, text(size: 7pt, fill: luma(48%))[
          #if calc.rem(number, 2) == 0 { "诗篇集" } else { volume }
        ])
      }
    },
    footer: context {
      let number = counter(page).get().first()
      if number > 1 {
        align(center, text(size: 7.5pt, fill: luma(42%))[#number])
      }
    },
  )

  set text(
    font: "Songti SC",
    size: body-size,
    lang: "zh",
    region: "CN",
    fill: luma(10%),
  )

  set par(
    justify: true,
    leading: body-leading,
    spacing: body-spacing,
    first-line-indent: 2em,
  )

  show heading.where(level: 1): it => block(
    width: 100%,
    above: 0em,
    below: 1.5em,
    breakable: false,
    sticky: true,
  )[
    #align(center)[
      #text(size: 16pt, weight: "semibold", tracking: 0.12em)[#it.body]
    ]
  ]

  show heading.where(level: 2): it => block(
    width: 100%,
    above: 1.45em,
    below: 0.8em,
    breakable: false,
    sticky: true,
  )[
    #align(center)[
      #text(size: 11.2pt, weight: "semibold", tracking: 0.035em)[#it.body]
    ]
  ]

  let source = read("book_cn.md")
  let source-sections = source.split("\n# ").slice(1)
  let selected = source-sections.slice(first - 1, last)

  let render-item(item) = {
    let lines = item.split("\n")
    let first-line = lines.first()
    if first-line.starts-with("## ") {
      heading(level: 2, outlined: true, first-line.slice(3))
    } else {
      par(first-line-indent: 2em)[#lines.join("")]
    }
  }

  align(center + horizon)[
    #block(width: 100%)[
      #text(size: 25pt, weight: "semibold", tracking: 0.16em)[诗篇集]
      #v(0.85em)
      #text(size: 17pt, weight: "semibold", tracking: 0.14em)[#volume]
      #v(1.15em)
      #line(length: 30%, stroke: 0.45pt + luma(52%))
      #v(1.25em)
      #text(size: 10.5pt, tracking: 0.08em)[#section-range]
      #v(3.4em)
      #text(size: 10pt, tracking: 0.06em)[圣叙利亚的以弗冷]
    ]
  ]

  pagebreak()

  for (section-index, section) in selected.enumerate() {
    if section-index > 0 {
      pagebreak()
    }
    let normalized = section.replace("\n## ", "\n\n## ")
    let items = normalized.split("\n\n").map(item => item.trim()).filter(item => item != "")
    heading(level: 1, outlined: true, items.first())
    for item in items.slice(1) {
      render-item(item)
    }
  }
}
