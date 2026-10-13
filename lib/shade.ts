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
