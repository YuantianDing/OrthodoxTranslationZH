#import "_聖詠經-booklet-layout.typ": make-booklet

// US Letter 双面打印，短边翻转；按中线对折后骑马钉装订。
#make-booklet(
  source: "../output/pdf/圣咏经-第三册-half-letter.pdf",
  total-pages: int(sys.inputs.at("total-pages", default: "0")),
  volume: "第三冊",
)
