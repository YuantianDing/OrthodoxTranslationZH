#let make-booklet(source: "", total-pages: 0, volume: "") = {
  assert(total-pages > 0, message: "缺少阅读版页数")
  assert(
    calc.rem(total-pages, 4) == 0,
    message: "阅读版页数必须是四的倍数",
  )

  set document(title: "聖詠經 · " + volume + " · 小冊子打印版")
  set page(
    width: 11in,
    height: 8.5in,
    margin: 0pt,
  )

  let leaf(number) = image(
    source,
    page: number,
    width: 5.5in,
    height: 8.5in,
    fit: "contain",
  )

  let sheet-side(left, right) = grid(
    columns: (5.5in, 5.5in),
    rows: 8.5in,
    gutter: 0pt,
    left,
    right,
  )

  let sheet-count = int(total-pages / 4)

  for sheet in range(sheet-count) {
    let outer-left = total-pages - 2 * sheet
    let outer-right = 1 + 2 * sheet
    let inner-left = 2 + 2 * sheet
    let inner-right = total-pages - 1 - 2 * sheet

    sheet-side(leaf(outer-left), leaf(outer-right))
    pagebreak()
    sheet-side(leaf(inner-left), leaf(inner-right))

    if sheet < sheet-count - 1 {
      pagebreak()
    }
  }
}
