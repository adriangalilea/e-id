export type Worn = "light" | "dark"

/** A frame as lightness and colour, one value per cell, rows top to bottom. */
export interface Grid {
  cols: number
  rows: number
  /** L* per cell, 0..100. */
  l: Float32Array
  /** Linear-light RGB per cell, 0..1, three values each: colours are averaged in
   *  light, as the eye mixes them, never in sRGB's encoded numbers (which darken a
   *  mix). */
  rgb: Float32Array
}

/** A colour, sRGB 0..255. */
export type Rgb = readonly [number, number, number]

/** A part of the frame, in shares of its width and height (0..1, may run past). */
export interface Area {
  x: number
  y: number
  w: number
  h: number
}

/** What an area of the frame is like: its mean lightness, the band most of it lies
 *  in, and its mean colour (what an edge of glass over it picks up). */
export interface Reading {
  mean: number
  low: number
  high: number
  color: Rgb
}

export const BACKDROP = {
  /** The grid a frame is sampled into: enough for a control's area to span cells,
   *  little enough to read every frame. */
  cols: 32,
  rows: 18,
  /** Over this the light scheme; under `darkBelow` the dark one; between, kept. */
  lightAbove: 62,
  darkBelow: 48,
  /** How long a frame must hold a new scheme before a visible surface takes it:
   *  longer than a flash or a strobe's half period (each turn back resets it), short
   *  enough that a cut is answered while it is still the cut. The change itself then
   *  eases (the glass's own transition), so the hold is the only lag. A second felt
   *  "very slow and too lagged" (Adrian, 2026-10-11). */
  holdMs: 180,
} as const

/** One sRGB channel, 0..255, to linear light, 0..1. */
const linear = (c: number) => {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}
/** Linear light, 0..1, to an sRGB channel, 0..255. */
const encoded = (v: number) =>
  255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)

/** Luminance (linear) to CIE L*. */
const lOf = (y: number) =>
  y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : (24389 / 27) * y
/** CIE L* to luminance (linear): the grey of that lightness. */
const yOf = (l: number) => (l > 8 ? ((l + 16) / 116) ** 3 : l / (24389 / 27))

/** sRGB 0..255 to CIE L*. */
export function lightness(r: number, g: number, b: number): number {
  return lOf(0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b))
}

/** sRGB 0..255 to OKLCH: lightness 0..1, chroma, hue in degrees (0 for a grey). */
export function oklchOf([r, g, b]: Rgb): { l: number; c: number; h: number } {
  const [lr, lg, lb] = [linear(r), linear(g), linear(b)]
  const l_ = Math.cbrt(
    0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb,
  )
  const m_ = Math.cbrt(
    0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb,
  )
  const s_ = Math.cbrt(
    0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb,
  )
  const l = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  const c = Math.hypot(a, bb)
  const h = c === 0 ? 0 : ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360
  return { l, c, h }
}

/** A colour at the grain the eye tells apart, as CSS: OKLCH in steps of one
 *  just-noticeable difference (about 0.02 in OKLab) in lightness and chroma, and of
 *  10° in hue (at the most vivid ground a picture gives, about 0.2 chroma, a
 *  difference of 0.035, which the rim's light, 35% the ground's, carries as less
 *  than one). A colour gliding under a glass then changes the written value a few
 *  times a second, not on every frame. */
export const OKLCH_GRAIN = { l: 0.02, c: 0.02, h: 10 } as const
export function oklchGrain(rgb: Rgb): string {
  const { l, c, h } = oklchOf(rgb)
  const step = (v: number, s: number) => Math.round(v / s) * s
  const sc = step(c, OKLCH_GRAIN.c)
  return `oklch(${step(l, OKLCH_GRAIN.l).toFixed(2)} ${sc.toFixed(2)} ${sc === 0 ? 0 : step(h, OKLCH_GRAIN.h) % 360})`
}

/** A frame's pixels (RGBA, `cols` × `rows`, as a canvas hands them) as a grid. */
export function gridOf(
  rgba: ArrayLike<number>,
  cols: number,
  rows: number,
): Grid {
  if (rgba.length !== cols * rows * 4)
    throw new Error(
      `backdrop: ${rgba.length} values for a ${cols}×${rows} frame, expected ${cols * rows * 4}`,
    )
  const l = new Float32Array(cols * rows)
  const rgb = new Float32Array(cols * rows * 3)
  for (let i = 0; i < l.length; i++) {
    const r = linear(rgba[i * 4] as number)
    const g = linear(rgba[i * 4 + 1] as number)
    const b = linear(rgba[i * 4 + 2] as number)
    rgb.set([r, g, b], i * 3)
    l[i] = lOf(0.2126 * r + 0.7152 * g + 0.0722 * b)
  }
  return { cols, rows, l, rgb }
}

/** A cell's lightness and colour (linear RGB) and how much of an area it covers (in
 *  any one unit per reading). */
export interface Cell {
  l: number
  rgb: readonly [number, number, number]
  weight: number
}

/** The cells of a frame an area covers, each weighted by how much of it the area
 *  covers, in shares of the frame; the part of the area off the frame is not here. */
export function cellsUnder(grid: Grid, area: Area): Cell[] {
  const cells: Cell[] = []
  const x0 = Math.max(0, area.x)
  const x1 = Math.min(1, area.x + area.w)
  const y0 = Math.max(0, area.y)
  const y1 = Math.min(1, area.y + area.h)
  if (!(x1 > x0 && y1 > y0)) return cells
  const c0 = Math.floor(x0 * grid.cols)
  const c1 = Math.min(grid.cols - 1, Math.ceil(x1 * grid.cols) - 1)
  const r0 = Math.floor(y0 * grid.rows)
  const r1 = Math.min(grid.rows - 1, Math.ceil(y1 * grid.rows) - 1)
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) {
      const ox = Math.min(x1, (c + 1) / grid.cols) - Math.max(x0, c / grid.cols)
      const oy = Math.min(y1, (r + 1) / grid.rows) - Math.max(y0, r / grid.rows)
      const weight = ox * oy
      const i = r * grid.cols + c
      if (weight > 0)
        cells.push({
          l: grid.l[i] as number,
          rgb: [
            grid.rgb[i * 3] as number,
            grid.rgb[i * 3 + 1] as number,
            grid.rgb[i * 3 + 2] as number,
          ],
          weight,
        })
    }
  return cells
}

/** What a set of weighted cells is like, `total` being the whole area's weight: the
 *  part no cell covers is read as `outside`, a grey of that lightness (the stage
 *  round a letterboxed picture, black, is 0). Cells may come from several pictures:
 *  an area over two photographs gliding past is read across both. */
export function reading(
  cells: Cell[],
  total: number,
  outside: number,
): Reading {
  if (!(total > 0)) throw new Error(`backdrop: an area with no size (${total})`)
  const covered = cells.reduce((s, c) => s + c.weight, 0)
  if (covered > total * (1 + 1e-6))
    throw new Error(
      `backdrop: cells cover ${covered} of an area of ${total}: two pictures of one source overlap, and only one of them shows`,
    )
  const grey = yOf(outside)
  const all =
    total - covered > total * 1e-9
      ? [
          ...cells,
          {
            l: outside,
            rgb: [grey, grey, grey] as const,
            weight: total - covered,
          },
        ]
      : [...cells]
  const mean = all.reduce((s, c) => s + c.l * c.weight, 0) / total
  const channel = (k: 0 | 1 | 2) =>
    Math.round(
      encoded(all.reduce((s, c) => s + c.rgb[k] * c.weight, 0) / total),
    )
  const color: Rgb = [channel(0), channel(1), channel(2)]
  all.sort((a, b) => a.l - b.l)
  const at = (q: number) => {
    let acc = 0
    for (const c of all) {
      acc += c.weight
      if (acc >= q * total) return c.l
    }
    return (all.at(-1) as Cell).l
  }
  return { mean, low: at(0.1), high: at(0.9), color }
}

/** One frame's area read, off-frame as `outside`. */
export function readArea(grid: Grid, area: Area, outside: number): Reading {
  if (!(area.w > 0 && area.h > 0))
    throw new Error(`backdrop: an area with no size (${area.w}×${area.h})`)
  return reading(cellsUnder(grid, area), area.w * area.h, outside)
}

/** A surface's standing: the scheme it wears, and a change waiting to be held long
 *  enough. */
export interface Verdict {
  worn: Worn
  pending: Worn | null
  since: number
}

/** The next verdict, from the last (none: the first reading decides at once), a
 *  reading, the time, and whether the surface can be seen. */
export function judge(
  prev: Verdict | null,
  read: Reading,
  now: number,
  visible: boolean,
): Verdict {
  const want: Worn =
    read.mean > BACKDROP.lightAbove
      ? "light"
      : read.mean < BACKDROP.darkBelow
        ? "dark"
        : (prev?.worn ?? (read.mean >= 55 ? "light" : "dark"))
  if (!prev || !visible || want === prev.worn)
    return { worn: want, pending: null, since: now }
  if (prev.pending !== want) return { ...prev, pending: want, since: now }
  if (now - prev.since >= BACKDROP.holdMs)
    return { worn: want, pending: null, since: now }
  return prev
}

/** The contrast every glass keeps its words at against the part of the picture
 *  least in their favour, as WCAG measures it: 7:1, its AAA. One number for both
 *  faces, white words on dark glass and dark ones (zinc-950) on light, in the unit
 *  the words are read in. Each face's target lightness was its own number once (L*
 *  46 under white words, 5:1; 66 under dark ones, 7:1), and the dark face's let a
 *  white rock through as a washed mid-grey ("why is it gray", Adrian, 2026-10-11). */
export const WORDS = {
  contrast: 7,
  light: [255, 255, 255],
  dark: [9, 9, 11],
} as const
const luminance = ([r, g, b]: readonly [number, number, number]) =>
  0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
/** The lightest a ground may be under white words, and the darkest under dark
 *  ones, at `WORDS.contrast`. */
const UNDER_WHITE = lOf((luminance(WORDS.light) + 0.05) / WORDS.contrast - 0.05)
const OVER_INK = lOf(WORDS.contrast * (luminance(WORDS.dark) + 0.05) - 0.05)

/** How thick a glass must be for its words, and no thicker: the opacity of its
 *  tint over a picture read as `read`. Dark glass (white words) darkens what is under
 *  it toward black; enough that its BRIGHTEST part (`high`) comes down to `under`.
 *  Light glass (dark words) lightens toward its own pale tint; enough that its
 *  DARKEST part (`low`) comes up to `over`. Both from `WORDS`. Each held between a
 *  floor (the glass always has a body) and a ceiling (it stays glass). Lightness
 *  mixes about linearly in L* at these opacities, so the tint is the share of the
 *  way to go. */
export const TINT = {
  dark: { under: UNDER_WHITE, min: 0.42, max: 0.78, ground: 4 },
  light: { over: OVER_INK, min: 0.5, max: 0.86, ground: 96 },
} as const
export function tintFor(worn: Worn, read: Reading): number {
  const clamp = (a: number, lo: number, hi: number) =>
    Math.min(hi, Math.max(lo, a))
  // A picture already as dark (or light) as the words need takes the floor: past
  // the tint's own lightness the share would divide by a sign that flipped.
  if (worn === "dark") {
    const { under, min, max, ground } = TINT.dark
    if (read.high <= under) return min
    return clamp((read.high - under) / (read.high - ground), min, max)
  }
  const { over, min, max, ground } = TINT.light
  if (read.low >= over) return min
  return clamp((over - read.low) / (ground - read.low), min, max)
}

/** The lightness right under a glass's rim: the picture seen through the glass's
 *  face, the face's own lightness (`TINT`'s ground) at its thickness. The rim is
 *  drawn on the glass, not on the picture: dark glass over a white sky is dark under
 *  its rim, and a rim made stronger for the sky's sake read a hard white line on a
 *  dark face ("too white, too intense for no reason", Adrian, 2026-10-11). */
export function underRim(worn: Worn, read: Reading, thickness: number): number {
  const face = worn === "dark" ? TINT.dark.ground : TINT.light.ground
  return read.mean * (1 - thickness) + face * thickness
}

/** How strongly a glass's rim should read over a ground of lightness `l` (L*; the
 *  ground right under the rim, `underRim`): its `--glass-ground-sheen`. A white
 *  edge's contrast grows as its ground darkens, so over a dark ground the rim
 *  carries less light and over a light one more, the edge reading about the same on
 *  both. Between `SHEEN.dark` (black) and `SHEEN.light` (white), along the
 *  lightness. */
export const SHEEN = { dark: 0.55, light: 1.1 } as const
export function sheenOf(l: number): number {
  const t = Math.min(1, Math.max(0, l / 100))
  return SHEEN.dark + (SHEEN.light - SHEEN.dark) * t
}

/** Where a picture's content stands in its element's box, as `object-fit` puts it: a
 *  box in the element's own px. */
export function contentBox(
  box: { width: number; height: number },
  natural: { width: number; height: number },
  fit: "contain" | "cover" | "fill",
): { x: number; y: number; width: number; height: number } {
  if (fit === "fill" || !(natural.width > 0 && natural.height > 0))
    return { x: 0, y: 0, width: box.width, height: box.height }
  const scale = (fit === "contain" ? Math.min : Math.max)(
    box.width / natural.width,
    box.height / natural.height,
  )
  const width = natural.width * scale
  const height = natural.height * scale
  return {
    x: (box.width - width) / 2,
    y: (box.height - height) / 2,
    width,
    height,
  }
}
