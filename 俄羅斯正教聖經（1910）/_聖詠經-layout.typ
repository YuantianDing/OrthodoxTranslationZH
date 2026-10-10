#let make-volume(
  first: 1,
  last: 5,
  volume: "第一冊",
  division-range: "第一分至第五分",
  psalm-range: "第1詠至第36詠",
  body-size: 9pt,
  body-leading: 0.34em,
  verse-spacing: 0.34em,
) = {
  set document(
    title: "聖詠經 · " + volume,
    author: "俄羅斯正教聖經（1910）",
  )

  set page(
    width: 5.5in,
    height: 8.5in,
    binding: left,
    margin: (inside: 0.62in, outside: 0.48in, top: 0.54in, bottom: 0.54in),
    header: context {
      let number = counter(page).get().first()
      if number > 1 {
        align(center, text(size: 7pt, fill: luma(48%))[
          #if calc.rem(number, 2) == 0 { "聖詠經" } else { volume }
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

  set par(justify: true, leading: body-leading)

  show heading.where(level: 1): it => block(
    width: 100%,
    above: 0em,
    below: 1.05em,
    breakable: false,
    sticky: true,
  )[
    #align(center)[
      #text(size: 15pt, weight: "semibold", tracking: 0.12em)[#it.body]
    ]
  ]

  show heading.where(level: 2): it => block(
    width: 100%,
    above: 1.05em,
    below: 0.55em,
    breakable: false,
    sticky: true,
  )[
    #align(center)[
      #text(size: 10.8pt, weight: "semibold", tracking: 0.035em)[#it.body]
    ]
  ]

  let render-inline(value) = {
    let open-parts = value.split("<u>")
    for (index, part) in open-parts.enumerate() {
      if index == 0 {
        part
      } else {
        let close-parts = part.split("</u>")
        if close-parts.len() == 1 {
          "<u>" + part
        } else {
          underline(close-parts.first())
          close-parts.slice(1).join("</u>")
        }
      }
    }
  }

  let render-verse(line) = {
    let pieces = line.split(".")
    let number = pieces.first()
    let body = pieces.slice(1).join(".").trim()
    if body != "" {
      block(width: 100%, above: 0em, below: verse-spacing)[
        #grid(
          columns: (1.54em, 1fr),
          column-gutter: 0.44em,
          align(right, text(size: 6.7pt, fill: luma(44%))[#number.]),
          block[#render-inline(body)],
        )
      ]
    }
  }

  let render-line(line) = {
    if line.starts-with("## ") {
      heading(level: 2, outlined: true, line.slice(3))
    } else if line == "聖詠經終" {
      block(width: 100%, above: 2em)[
        #align(center, text(size: 10.5pt, weight: "semibold")[聖詠經終])
      ]
    } else {
      render-verse(line)
    }
  }

  let source = read("聖詠.md")
  let source-divisions = source.split("\n# ").slice(1)
  let selected = source-divisions.slice(first - 1, last)

  align(center + horizon)[
    #block(width: 100%)[
      #text(size: 25pt, weight: "semibold", tracking: 0.16em)[聖詠經]
      #v(0.85em)
      #text(size: 17pt, weight: "semibold", tracking: 0.14em)[#volume]
      #v(1.15em)
      #line(length: 30%, stroke: 0.45pt + luma(52%))
      #v(1.2em)
      #text(size: 10.5pt, tracking: 0.08em)[#division-range]
      #v(0.7em)
      #text(size: 9.2pt, fill: luma(35%))[#psalm-range]
      #v(3.2em)
      #text(size: 10pt, tracking: 0.04em)[俄羅斯正教聖經（1910）譯本]
    ]
  ]

  pagebreak()

  for (division-index, division) in selected.enumerate() {
    if division-index > 0 {
      pagebreak()
    }
    let lines = division.split("\n").map(line => line.trim()).filter(line => line != "")
    heading(level: 1, outlined: true, lines.first())
    for line in lines.slice(1) {
      render-line(line)
    }
  }
}
