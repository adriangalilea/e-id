import type { Shade } from "@/lib/shade"

// FOIL: a colour effect (a lib/shade), the spectrum a diffraction foil throws, the
// iridescence of a security laminate, a holographic sticker, a banknote's strip.
//
// A foil is not a rainbow: it is SEEN faint, added to the light it lies in, so what
// it must hold steady is its STRENGTH. Every stop is at one OKLCH lightness and
// chroma and only the hue turns: in sRGB's spectrum the yellow and the green are
// lighter than the rest, and added to light that reads as the effect growing
// stronger wherever the hand brings them, not as the colour changing. Saturated,
// since a pale foil added to the light reads as white.
//
// The order is a foil's, not the wheel's: magenta, blue, green, gold, violet, back to
// magenta, so a band of it passing over a print never runs the whole rainbow at once.
// It is a material, not a person's colour: the base a shade is given is not used.
//
// `FOIL_STOPS` is the list a CSS gradient runs through (`foilGradient`); lib/holo
// lays it under its prints. Framework-free, the colours are CSS.

export const FOIL = {
  /** OKLCH lightness and chroma, the same at every stop. */
  lightness: 0.78,
  chroma: 0.14,
  /** The hues in the order the foil throws them, OKLCH degrees. */
  hues: [350, 250, 165, 90, 300, 350] as readonly number[],
}

const color = (hue: number) =>
  `oklch(${FOIL.lightness} ${FOIL.chroma} ${hue.toFixed(2)})`

/** The foil's stops as a CSS list, for a gradient to run through. */
export const FOIL_STOPS = FOIL.hues.map(color).join(", ")

/** The foil as a CSS gradient across a surface, at `angle` (a foil's diagonal by
 *  default), its hues blended in OKLCH as they are lit. */
export function foilGradient(angle = 115): string {
  return `linear-gradient(${angle}deg in oklch, ${FOIL_STOPS})`
}

/** The signed shortest turn from hue `a` to hue `b`, degrees. */
const turn = (a: number, b: number) => ((b - a + 540) % 360) - 180

/** The foil's hue `x` (0..1) along its stops, between two the short way. */
export function foilHue(x: number): number {
  const hues = FOIL.hues
  const p = Math.min(1, Math.max(0, x)) * (hues.length - 1)
  const i = Math.min(hues.length - 2, Math.floor(p))
  const a = hues[i] as number
  return (a + turn(a, hues[i + 1] as number) * (p - i) + 360) % 360
}

/** The foil as a shade (lib/shade): x along its spectrum, at its one strength. */
export const foil: Shade = {
  name: "foil",
  color: (_base, _baseHue, x) => color(foilHue(x)),
}
