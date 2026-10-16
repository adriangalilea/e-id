// A FILE'S SIZE AS e-ID SAYS IT, everywhere one is shown: "12B", "2.4MB" (a send's
// page, its share image, the CLI).

const BYTES = new Intl.NumberFormat("en", {
  notation: "compact",
  style: "unit",
  unit: "byte",
  unitDisplay: "narrow",
})

export const bytes = (n: number) => BYTES.format(n)
