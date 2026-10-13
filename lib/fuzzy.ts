export type Range = readonly [from: number, to: number]

export interface Match {
  score: number
  ranges: Range[]
}

/** A character as compared: lower case, without its accent. */
function fold(c: string): string {
  return (c.normalize("NFD")[0] ?? c).toLowerCase()
}

/** A text as compared, one unit per UTF-16 unit of the text, so an index into the
 *  folded text is an index into the text (`slice` agrees). */
function foldText(text: string): string {
  let out = ""
  for (let i = 0; i < text.length; i++) out += fold(text[i] as string)
  return out
}

const SEPARATOR = /[\s/\\\-_.:,;|()[\]{}]/

/** Whether a word starts at i. */
function boundary(text: string, i: number): boolean {
  if (i === 0) return true
  const prev = text[i - 1] as string
  const here = text[i] as string
  if (SEPARATOR.test(prev)) return true
  return (
    prev === prev.toLowerCase() &&
    here !== here.toLowerCase() &&
    /\p{L}/u.test(prev)
  )
}

const BASE = 16
const RUN = 10
const WORD_START = 12
const FIRST_CHAR = 6
const GAP_OPEN = 4
const GAP_EXTEND = 1

/** One query word in the text: the tightest, best-placed run of its letters. */
function word(q: string, text: string, folded: string): Match | null {
  if (q.length === 0) return { score: 0, ranges: [] }
  // Every place the word could start, scored as a whole, the best kept: a later start
  // can be tighter or sit on a word's start.
  let best: Match | null = null
  for (
    let start = folded.indexOf(q[0] as string);
    start !== -1;
    start = folded.indexOf(q[0] as string, start + 1)
  ) {
    const at: number[] = []
    let j = 0
    for (let i = start; i < folded.length && j < q.length; i++)
      if (folded[i] === q[j]) {
        at.push(i)
        j++
      }
    if (j < q.length) break
    // Tighten from the end backward: the last letters as late, the first as close
    // behind them as they can be (fzf's second pass).
    const end = at[at.length - 1] as number
    const tight: number[] = []
    let k = q.length - 1
    for (let i = end; i >= start && k >= 0; i--)
      if (folded[i] === q[k]) {
        tight.unshift(i)
        k--
      }
    const score = scoreOf(tight, text)
    if (!best || score > best.score) best = { score, ranges: rangesOf(tight) }
  }
  return best
}

function scoreOf(at: readonly number[], text: string): number {
  let score = 0
  for (const [n, i] of at.entries()) {
    score += BASE
    if (boundary(text, i)) score += WORD_START
    if (n > 0) {
      const gap = i - (at[n - 1] as number) - 1
      if (gap === 0) score += RUN
      else score -= GAP_OPEN + GAP_EXTEND * (gap - 1)
    }
  }
  if (at[0] === 0) score += FIRST_CHAR
  // Earlier and shorter win ties.
  return score - (at[0] as number) * 0.1 - text.length * 0.01
}

function rangesOf(at: readonly number[]): Range[] {
  const out: [number, number][] = []
  for (const i of at) {
    const last = out[out.length - 1]
    if (last && last[1] === i) last[1] = i + 1
    else out.push([i, i + 1])
  }
  return out
}

/** Merge ranges that touch or overlap, in order. */
function merged(ranges: readonly Range[]): Range[] {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0])
  const out: [number, number][] = []
  for (const [a, b] of sorted) {
    const last = out[out.length - 1]
    if (last && a <= last[1]) last[1] = Math.max(last[1], b)
    else out.push([a, b])
  }
  return out
}

/** The query's words, folded. */
export function queryWords(query: string): string[] {
  return foldText(query).split(/\s+/).filter(Boolean)
}

/** Every word of the query found in the text, or null. An empty query matches
 *  everything with score 0. */
export function fuzzy(query: string, text: string): Match | null {
  const words = queryWords(query)
  if (words.length === 0) return { score: 0, ranges: [] }
  const folded = foldText(text)
  let score = 0
  const ranges: Range[] = []
  for (const w of words) {
    const m = word(w, text, folded)
    if (!m) return null
    score += m.score
    ranges.push(...m.ranges)
  }
  return { score, ranges: merged(ranges) }
}

export interface Found<T> {
  item: T
  score: number
  /** The lit ranges per text the item was searched by, in `keys`' order. */
  ranges: Range[][]
}

/** The items the query finds, best first. An item is searched by one text or several
 *  (a name, a path, aliases): its words may be found across them, its score is the
 *  best spread of them. An empty query keeps every item in its order. */
export function fuzzyFilter<T>(
  items: readonly T[],
  query: string,
  keys: (item: T) => string | readonly string[],
): Found<T>[] {
  const words = queryWords(query)
  const texts = (item: T) => {
    const k = keys(item)
    return typeof k === "string" ? [k] : k
  }
  if (words.length === 0)
    return items.map((item) => ({
      item,
      score: 0,
      ranges: texts(item).map(() => []),
    }))
  const out: Found<T>[] = []
  for (const item of items) {
    const ts = texts(item)
    const folded = ts.map(foldText)
    const ranges: Range[][] = ts.map(() => [])
    let score = 0
    let ok = true
    for (const w of words) {
      let best: { m: Match; k: number } | null = null
      for (const [k, t] of ts.entries()) {
        const m = word(w, t, folded[k] as string)
        if (m && (!best || m.score > best.m.score)) best = { m, k }
      }
      if (!best) {
        ok = false
        break
      }
      score += best.m.score
      ;(ranges[best.k] as Range[]).push(...best.m.ranges)
    }
    if (ok) out.push({ item, score, ranges: ranges.map(merged) })
  }
  return out.sort((a, b) => b.score - a.score)
}

/** A text split into its lit and unlit runs, for drawing a match. */
export function segments(
  text: string,
  ranges: readonly Range[],
): { text: string; hit: boolean }[] {
  const out: { text: string; hit: boolean }[] = []
  let at = 0
  for (const [a, b] of ranges) {
    if (a > at) out.push({ text: text.slice(at, a), hit: false })
    out.push({ text: text.slice(a, b), hit: true })
    at = b
  }
  if (at < text.length) out.push({ text: text.slice(at), hit: false })
  return out
}
