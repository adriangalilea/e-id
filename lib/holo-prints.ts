export type HoloArt = { width: number; height: number; body: string }

/** A glyph to print: an SVG path and the box it is drawn in. */
export type Emblem = {
  path: string
  box: { x: number; y: number; w: number; h: number }
}

/** A four-pointed spark, on a 24 grid. */
export const SPARK: Emblem = {
  path: "M12 2C12.6 8.4 15.6 11.4 22 12C15.6 12.6 12.6 15.6 12 22C11.4 15.6 8.4 12.6 2 12C8.4 11.4 11.4 8.4 12 2Z",
  box: { x: 2, y: 2, w: 20, h: 20 },
}

const f = (n: number) => n.toFixed(2)

/** The emblem `size` tall, its box's top left at (x, y). */
function place(e: Emblem, x: number, y: number, size: number): string {
  const k = size / e.box.h
  return `<path transform="translate(${f(x - e.box.x * k)} ${f(y - e.box.y * k)}) scale(${f(k)})" d="${e.path}" fill="#fff"/>`
}

/** A seeded random, the same sequence for the same seed everywhere (mulberry32). */
function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** GUILLOCHÉ: five sine waves a fifth of a turn apart, one period every 80 px, in a
 *  band 40 px tall, a tile that repeats seamlessly across and stacks into ribbons. */
export function guilloche(): HoloArt {
  const W = 160
  const H = 40
  const waves = Array.from({ length: 5 }, (_, i) => {
    const phase = (i * 2 * Math.PI) / 5
    const points = Array.from({ length: W / 2 + 1 }, (_, k) => {
      const x = k * 2
      const y = H / 2 + 9 * Math.sin((2 * Math.PI * x) / 80 + phase)
      return `${x},${f(y)}`
    })
    return `<polyline points="${points.join(" ")}" fill="none" stroke="#fff" stroke-width="0.45"/>`
  })
  return { width: W, height: H, body: waves.join("") }
}

/** EMBLEMS: the emblem, 8 px, twice in a 72 px tile, staggered: small enough to read
 *  as texture before it reads as a glyph. */
export function emblems(emblem: Emblem = SPARK): HoloArt {
  return {
    width: 72,
    height: 72,
    body: place(emblem, 8, 8, 8) + place(emblem, 44, 44, 8),
  }
}

/** A SEAL: two rings, a rosette of 48 ticks between them, the emblem at its heart. */
export function seal(emblem: Emblem = SPARK): HoloArt {
  const ticks = Array.from({ length: 48 }, (_, i) => {
    const a = (i * 2 * Math.PI) / 48
    const p = (r: number) =>
      `${f(50 + r * Math.cos(a))} ${f(50 + r * Math.sin(a))}`
    return `M${p(31)}L${p(40)}`
  })
  // The emblem within the inner ring (28 across) with air round it.
  const size = 28
  const w = (size * emblem.box.w) / emblem.box.h
  return {
    width: 100,
    height: 100,
    body:
      `<circle cx="50" cy="50" r="46" fill="none" stroke="#fff" stroke-width="1.2"/>` +
      `<circle cx="50" cy="50" r="28" fill="none" stroke="#fff" stroke-width="0.8"/>` +
      `<path d="${ticks.join("")}" stroke="#fff" stroke-width="0.6"/>` +
      place(emblem, 50 - w / 2, 50 - size / 2 - 1, size),
  }
}

/** THE WEB, people linked: nodes on a jittered grid (so they spread rather than
 *  clump), each joined to its two nearest, a few hubs joined to four and drawn as the
 *  emblem in a ring. Drawn once, `aspect` wide for 1 tall (an ID card's 85.6 by
 *  53.98 by default), and laid over a surface whole, not tiled. */
export function web(
  emblem: Emblem = SPARK,
  { seed = 19, aspect = 85.6 / 53.98 } = {},
): HoloArt {
  const W = 100
  const H = W / aspect
  const random = seeded(seed)
  const COLS = 9
  const ROWS = Math.max(2, Math.round(COLS / aspect))
  const nodes = Array.from({ length: COLS * ROWS }, (_, i) => ({
    x: ((i % COLS) + 0.15 + random() * 0.7) * (W / COLS),
    y: (Math.floor(i / COLS) + 0.15 + random() * 0.7) * (H / ROWS),
    hub: random() < 0.12,
  }))
  const edges = new Set<string>()
  nodes.forEach((a, i) => {
    const nearest = nodes
      .map((b, j) => ({ j, d: Math.hypot(a.x - b.x, a.y - b.y) }))
      .filter(({ j }) => j !== i)
      .sort((p, q) => p.d - q.d)
      .slice(0, a.hub ? 4 : 2)
    for (const { j } of nearest) edges.add(i < j ? `${i}-${j}` : `${j}-${i}`)
  })
  const lines = [...edges].map((key) => {
    const [i, j] = key.split("-").map(Number)
    const a = nodes[i as number]
    const b = nodes[j as number]
    if (!a || !b) throw new Error(`web: edge ${key} names a missing node`)
    return `M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}`
  })
  const dots = nodes.map((n) =>
    n.hub
      ? `<circle cx="${f(n.x)}" cy="${f(n.y)}" r="2.3" fill="none" stroke="#fff" stroke-width="0.14"/>` +
        place(emblem, n.x - 1.5, n.y - 1.6, 3.2)
      : `<circle cx="${f(n.x)}" cy="${f(n.y)}" r="0.35" fill="#fff"/>`,
  )
  return {
    width: W,
    height: H,
    body: `<path d="${lines.join("")}" stroke="#fff" stroke-width="0.12" fill="none"/>${dots.join("")}`,
  }
}

/** A print as a CSS image, `url("data:…")`, for `mask-image`. */
export function printUrl({ width, height, body }: HoloArt): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
