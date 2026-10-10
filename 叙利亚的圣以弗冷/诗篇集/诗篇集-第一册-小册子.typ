#import "_诗篇集-booklet-layout.typ": make-booklet

// US Letter 双面打印，短边翻转；按中线对折后骑马钉装订。
#make-booklet(
  source: "../../output/pdf/诗篇集-第一册-half-letter.pdf",
  total-pages: 24,
)
