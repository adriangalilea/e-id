// SHADE: a colour effect, apart from what is drawn with it. A drawing knows how far
// along a thing is (`x`, 0..1: a peak's energy, the age of a trail, the top of a glow)
// and has one base colour (a person's, the text's); a shade says what colour that is
// there. The same drawing in `solid` is one colour, pure light; in lib/aurora's
// `aurora` it travels an aurora borealis's palette. Any other effect is one more
// Shade.
//
// A shade's colours are CSS (relative colours welcome: `oklch(from <base> …)`), the
// same in a stylesheet, an inline style or a canvas; `shadeTable` makes a travel's
// steps once, for a canvas to resolve through `getComputedStyle`.

export interface Shade {
  /** Its identity: two shades with one name colour the same (a drawing redoes its
   *  colours only when this changes). */
  name: string
  /** The colour `x` (0..1) along the travel from `base` (any CSS colour), whose OKLCH
   *  hue is `baseHue`. */
  color(base: string, baseHue: number, x: number): string
}

/** One colour all the way: the base itself, light without a palette. */
export const solid: Shade = { name: "solid", color: (base) => base }

/** `steps` colours along the travel, from x = 0 to x = 1. */
export function shadeTable(
  shade: Shade,
  base: string,
  baseHue: number,
  steps: number,
): string[] {
  if (!(Number.isInteger(steps) && steps >= 2))
    throw new Error(
      `shade ${shade.name}: ${steps} steps; a travel needs at least 2`,
    )
  return Array.from({ length: steps }, (_, k) =>
    shade.color(base, baseHue, k / (steps - 1)),
  )
}
