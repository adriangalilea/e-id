// How wide each character of a name sets in the card's face (Space Grotesk
// Medium, public/fonts), in ems: read from the font by the renderer that draws
// the card's image (resvg), once, into lib/name-advances.json, so the site's card
// and the drawing fit a name to its line from the same numbers
// (lib/name-fit). Run again when the face changes.
//
//   bun scripts/name-advances.ts
import assert from "node:assert/strict"
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { Resvg } from "@resvg/resvg-js"

const FONT = join(process.cwd(), "public/fonts/SpaceGrotesk-Medium.ttf")
const SIZE = 1000

/** The right edge of `text`'s ink, set at SIZE. */
function right(text: string): number {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE * (text.length + 2) * 2}" height="${SIZE * 2}"><text x="0" y="${SIZE}" font-family="Space Grotesk" font-weight="500" font-size="${SIZE}">${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text></svg>`
  const box = new Resvg(svg, {
    font: {
      fontFiles: [FONT],
      loadSystemFonts: false,
      defaultFontFamily: "Space Grotesk",
    },
  }).getBBox()
  assert.ok(box, `name-advances: nothing drawn for ${text}`)
  return box.x + box.width
}

// A character's advance: how far it pushes the H after it.
const base = right("HH")
const characters = [
  // Printable ASCII and Latin-1's letters: the names people write.
  ...Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)),
  ..."ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ",
]
const advances: Record<string, number> = {}
for (const c of characters)
  advances[c] = Number(((right(`H${c}H`) - base) / SIZE).toFixed(4))
// A character the face does not have, or one not read here: the average.
const values = Object.values(advances)
const average = Number(
  (values.reduce((a, b) => a + b, 0) / values.length).toFixed(4),
)
writeFileSync(
  "lib/name-advances.json",
  `${JSON.stringify({ face: "Space Grotesk Medium", average, advances }, null, 2)}\n`,
)
console.log(
  `lib/name-advances.json: ${values.length} characters, average ${average} em`,
)
