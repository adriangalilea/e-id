import type { Clip } from "@/lib/clip"

export type SessionLine = (
  | { kind: "command"; text: string }
  | { kind: "output"; text: string }
  | { kind: "muted"; text: string }
  | { kind: "blank" }
) & {
  /** Milliseconds the emitter waits before this line lands. 0 when unset. */
  delay: number
}

const DELAY = /^@(\d+)\s?(.*)$/

/** Parse a session script. Comments drop, trailing blanks collapse (the cursor line
 *  supplies the ending in both emitters). */
export function parseSession(source: string): SessionLine[] {
  const lines = source.split("\n").filter((l) => !l.startsWith("#"))
  while (lines.at(-1)?.trim() === "") lines.pop()
  return lines.map((raw) => {
    const m = DELAY.exec(raw)
    const delay = m ? Number(m[1]) : 0
    const line = m ? (m[2] as string) : raw
    if (line.trim() === "") return { kind: "blank", delay }
    if (line.startsWith("$ "))
      return { kind: "command", text: line.slice(2), delay }
    if (line.startsWith("~ "))
      return { kind: "muted", text: line.slice(2), delay }
    return { kind: "output", text: line, delay }
  })
}

/** One accent, tiers by mixing: one hue, intensity is the only variable. */
function mix(
  hex: string,
  toward: readonly [number, number, number],
  t: number,
): string {
  const n = hex.replace("#", "")
  const r = Number.parseInt(n.slice(0, 2), 16)
  const g = Number.parseInt(n.slice(2, 4), 16)
  const b = Number.parseInt(n.slice(4, 6), 16)
  const c = (a: number, z: number) => Math.round(a + (z - a) * t)
  return `#${[c(r, toward[0]), c(g, toward[1]), c(b, toward[2])]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`
}

const BLACK = [0, 0, 0] as const
const WHITE = [255, 255, 255] as const

export interface TerminalPalette {
  accent: string
  bg: string
  bar: string
  dot: string
  edge: string
  prompt: string
  muted: string
  command: string
}

/** The phosphor palette every terminal wears (default accent: phosphor green).
 *  Mix ratios are LOAD-BEARING: committed stills were rendered with them, so a
 *  change here re-colors published media on next render. */
export function terminalPalette(accent = "#38ff6e"): TerminalPalette {
  return {
    accent,
    bg: mix(accent, BLACK, 0.955),
    bar: mix(accent, BLACK, 0.925),
    dot: mix(accent, BLACK, 0.8),
    // The window's hairline: the accent at low alpha, so the frame parts from any
    // page (its near-black melts into a dark one) without a second colour. CSS only.
    edge: `color-mix(in oklab, ${accent} 16%, transparent)`,
    prompt: mix(accent, BLACK, 0.55),
    muted: mix(accent, WHITE, 0.4),
    command: mix(accent, WHITE, 0.82),
  }
}

/** Line pitch shared by both emitters, in em. */
export const LINE_HEIGHT = 1.68

// ── the timeline: lines → milliseconds ──
//
// Commands type char by char; output lines land whole after a beat; blanks are a
// short breath; `@ms` adds a pause before the line. The unit is milliseconds, so a
// script's natural duration is the sum, and `progress` (0..1) scrubs it.

export const TYPE_MS = 28
const LAND_MS = 140
const BLANK_MS = 90

export interface SessionTimeline {
  lines: SessionLine[]
  /** Time (ms) at which each line STARTS landing (after its delay). */
  starts: number[]
  /** Time (ms) at which each line is complete. */
  ends: number[]
  total: number
  /** The session as a clip, for any driver: one chapter per command, titled with
   *  it, starting as it starts to type (the first at 0). */
  clip: Clip
}

export function sessionTimeline(lines: SessionLine[]): SessionTimeline {
  let at = 0
  const starts: number[] = []
  const ends: number[] = []
  for (const l of lines) {
    at += l.delay
    starts.push(at)
    at +=
      l.kind === "command"
        ? l.text.length * TYPE_MS + LAND_MS
        : l.kind === "blank"
          ? BLANK_MS
          : LAND_MS
    ends.push(at)
  }
  const total = Math.max(1, at)
  const chapters = lines
    .flatMap((l, i) =>
      l.kind === "command"
        ? [
            {
              start: (starts[i] as number) - l.delay,
              title: l.text,
              code: true,
            },
          ]
        : [],
    )
    .map((c, k) => (k === 0 ? { ...c, start: 0 } : c))
  return {
    lines,
    starts,
    ends,
    total,
    clip: { duration: total, chapters },
  }
}

// ── the still: a session as one SVG frame ──

export interface StillOptions {
  accent?: string
  fontSize?: number
  width?: number
  height?: number
}

/** The still's frame and type, in px. */
export const STILL = { fontSize: 38, width: 1920, height: 1200 } as const

/** The type size at which the live terminal fills its box the way a still fills its
 *  frame: the still's type as a share of its width, in the box's own width. The box
 *  must be an inline-size container. */
export function stillSize(): string {
  return `${(STILL.fontSize / STILL.width) * 100}cqw`
}

const esc = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")

/** Render a session as a phosphor terminal frame (title bar, three dots, the lines,
 *  a block-cursor prompt at the end). Throws when the session overflows the frame:
 *  cut lines or shrink the font, never clip silently. */
export function renderSessionSvg(
  lines: SessionLine[],
  {
    accent = "#38ff6e",
    fontSize = STILL.fontSize,
    width = STILL.width,
    height = STILL.height,
  }: StillOptions = {},
): string {
  const { bg, bar, dot, prompt, muted, command } = terminalPalette(accent)
  const step = Math.round(fontSize * LINE_HEIGHT)
  const x = 96
  let y = 96 + Math.round(fontSize * 3.2)
  const rows: string[] = []
  for (const line of lines) {
    if (line.kind === "blank") {
      y += step
      continue
    }
    if (line.kind === "command") {
      rows.push(
        `<text x="${x}" y="${y}" fill="${prompt}">$ <tspan fill="${command}">${esc(line.text)}</tspan></text>`,
      )
    } else {
      const fill = line.kind === "muted" ? muted : accent
      rows.push(
        `<text x="${x}" y="${y}" fill="${fill}">${esc(line.text)}</text>`,
      )
    }
    y += step
  }
  y += step
  rows.push(
    `<text x="${x}" y="${y}" fill="${prompt}">$ <tspan fill="${dot}">█</tspan></text>`,
  )
  if (y > height - 64) {
    throw new Error(
      `session overflows the frame (${y} > ${height - 64}): cut lines or shrink fontSize`,
    )
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="${bg}"/>
  <rect width="${width}" height="96" fill="${bar}"/>
  <circle cx="64" cy="48" r="13" fill="${dot}"/>
  <circle cx="108" cy="48" r="13" fill="${dot}"/>
  <circle cx="152" cy="48" r="13" fill="${dot}"/>
  <g font-family="Menlo, Monaco, monospace" font-size="${fontSize}" xml:space="preserve">
    ${rows.join("\n    ")}
  </g>
</svg>
`
}

// Runnable example: scripts/examples/session-still.ts (the lib carries no runtime).
