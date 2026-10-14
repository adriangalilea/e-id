import type { Chapter, Clip } from "@/lib/clip"

/** One thing a person does in the browser, after `delay` ms (default none). */
export type BrowserStep = (
  | /** Click the address field, type `text`, press return: it loads. `to`: the
   *  address redirects (a short link), one load that lands there, the field
   *  turning to `to` as the page comes; never a second load. */
  { kind: "type"; text: string; to?: string }
  /** A link followed on the page: the address changes and `url` loads. */
  | { kind: "go"; url: string }
  /** The back button: the page before loads again. */
  | { kind: "back" }
  /** The page scrolled to `to`, 0 (its top) to 1 (its foot), over `ms`. */
  | { kind: "scroll"; to: number; ms?: number }
) & { delay?: number }

/** One character typed into the address field. A person typing a host they know,
 *  slower than the terminal's 28 ms, which reads as a machine. */
export const TYPE_MS = 70
/** The field takes focus and its address is selected before the first key. */
const FOCUS_MS = 380
/** Return pressed after the last key. */
const RETURN_MS = 260
/** A page loading, from the request to the bar's end; a page from the cache (back)
 *  loads in a third of it. */
export const LOAD_MS = 1200
const CACHED_MS = 400
/** The share of a load at which the new page is drawn: the old one stays until the
 *  new one has something to show, as a browser commits a navigation. */
const COMMIT = 0.45
/** The bar fades after it fills. */
const FADE_MS = 220
const SCROLL_MS = 900
/** The last page held on screen after the last step, so it is seen. */
const HOLD_MS = 1400

/** A load in progress: how far the bar has filled, 0..1, and how visible it is
 *  (it fades out once full). */
export interface BrowserLoad {
  progress: number
  opacity: number
}

/** The browser at an instant. */
export interface BrowserFrame {
  /** The page drawn: its URL, as `urlOf` spells it. */
  url: string
  /** What the address field holds: the text being typed while it has focus, else
   *  the address of the page loading or shown. */
  address: string
  /** The field has focus (a person is typing in it). */
  editing: boolean
  /** Focused and not yet typed in: the whole address is selected, so the first key
   *  replaces it. */
  selected: boolean
  load: BrowserLoad | null
  /** How far down the drawn page is, 0..1. */
  scroll: number
  /** Whether back and forward have anywhere to go. */
  back: boolean
  forward: boolean
  /** The step under way or last done, -1 before the first. */
  step: number
}

export interface BrowserTimeline {
  start: string
  steps: BrowserStep[]
  /** When each step begins (after its delay) and ends, ms. */
  starts: number[]
  ends: number[]
  total: number
  /** Every page the visit draws, in the order it reaches them, the start first. */
  pages: string[]
  /** Each page's address as it was written (typed, linked, or the start), by its
   *  URL: what the field shows at rest. Never the URL's own spelling, which turns a
   *  host in other scripts into punycode (👤.to into xn--mq8h.to). */
  spelled: Record<string, string>
  /** The visit as a clip: one chapter per page, titled with its address. */
  clip: Clip
}

/** A URL as the browser keeps it: a bare host typed gets https, the result is
 *  absolute and normalised (a trailing slash on a bare host). The one spelling the
 *  timeline, the pages a visit draws and the address field agree on. */
export function urlOf(text: string): string {
  return new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`)
    .href
}

/** Where a typed address or a followed link goes. */
const destination = (
  s: Extract<BrowserStep, { kind: "type" } | { kind: "go" }>,
): string => urlOf(s.kind === "type" ? (s.to ?? s.text) : s.url)

function stepMs(s: BrowserStep): number {
  switch (s.kind) {
    case "type":
      return FOCUS_MS + s.text.length * TYPE_MS + RETURN_MS + LOAD_MS
    case "go":
      return LOAD_MS
    case "back":
      return CACHED_MS
    case "scroll":
      return s.ms ?? SCROLL_MS
  }
}

/** Times a visit that opens on `start`. THROWS on a scroll outside 0..1, a delay
 *  below zero, a back with nowhere to go: a script that cannot happen. */
export function browserTimeline(
  start: string,
  steps: BrowserStep[],
): BrowserTimeline {
  const starts: number[] = []
  const ends: number[] = []
  const spelled: Record<string, string> = { [urlOf(start)]: start }
  for (const s of steps)
    if (s.kind === "type" || s.kind === "go")
      spelled[destination(s)] = s.kind === "type" ? (s.to ?? s.text) : s.url
  // A chapter is titled as the address was written (a typed one as it was typed,
  // the short link a redirect starts from), never through `URL`'s punycode.
  const chapters: Chapter[] = [{ start: 0, title: bare(start) }]
  const history = [urlOf(start)]
  const reached = [...history]
  let here = 0
  let at = 0
  for (const s of steps) {
    if ((s.delay ?? 0) < 0)
      throw new Error(`browser-session: delay ${s.delay} is below zero`)
    if (s.kind === "scroll" && (s.to < 0 || s.to > 1))
      throw new Error(`browser-session: scroll to ${s.to} is outside 0..1`)
    at += s.delay ?? 0
    starts.push(at)
    if (s.kind !== "scroll") {
      if (s.kind === "back") {
        if (here === 0)
          throw new Error("browser-session: back with no page before")
        here--
      } else {
        history.splice(here + 1, Infinity, destination(s))
        here++
      }
      reached.push(history[here] as string)
      const page = history[here] as string
      chapters.push({
        start: at,
        title: bare(s.kind === "type" ? s.text : (spelled[page] ?? page)),
        code: s.kind === "type",
      })
    }
    at += stepMs(s)
    ends.push(at)
  }
  const total = at + HOLD_MS
  // A visit that navigates at once never shows its opening page as a chapter.
  const opening = chapters[1]?.start === 0 ? chapters.slice(1) : chapters
  return {
    start: urlOf(start),
    steps,
    starts,
    ends,
    total,
    pages: [...new Set(reached)],
    spelled,
    clip: { duration: total, chapters: opening },
  }
}

/** An address as written, its scheme, `www.` and a trailing slash dropped. */
function bare(address: string): string {
  return address
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2
/** A load's bar: quick at first, slowing toward the end, as a bar that cannot know
 *  how much is left. */
const loadCurve = (t: number) => 1 - (1 - t) ** 2.2

/** The frame at `ms`: every step done so far applied, the one under way partly. */
export function browserFrameAt(
  timeline: BrowserTimeline,
  ms: number,
): BrowserFrame {
  const history = [timeline.start]
  let here = 0
  let url = timeline.start
  let address = timeline.spelled[url] ?? url
  let editing = false
  let selected = false
  let load: BrowserLoad | null = null
  let scroll = 0
  let step = -1
  // A finished load's bar still fading at `ms`.
  const fading = (end: number): BrowserLoad | null =>
    ms < end + FADE_MS
      ? { progress: 1, opacity: 1 - (ms - end) / FADE_MS }
      : null

  for (const [i, s] of timeline.steps.entries()) {
    const from = timeline.starts[i] as number
    const to = timeline.ends[i] as number
    if (ms < from) break
    step = i
    const t = ms >= to ? 1 : (ms - from) / (to - from)
    if (s.kind === "scroll") {
      const was = scroll
      scroll = was + (s.to - was) * easeInOut(t)
      continue
    }
    // A navigation: where it goes, and when its load starts.
    let loadFrom = from
    if (s.kind === "type") {
      const typedFrom = from + FOCUS_MS
      const typedTo = typedFrom + s.text.length * TYPE_MS
      loadFrom = typedTo + RETURN_MS
      if (ms < loadFrom) {
        editing = true
        selected = ms < typedFrom
        if (!selected)
          address = s.text.slice(0, Math.floor((ms - typedFrom) / TYPE_MS) + 1)
        break
      }
    }
    const target =
      s.kind === "back" ? (history[here - 1] as string) : destination(s)
    if (s.kind === "back") here--
    else {
      history.splice(here + 1, Infinity, target)
      here++
    }
    const p = clamp01((ms - loadFrom) / (to - loadFrom))
    // A redirect shows the address typed while it loads, and where it landed once
    // the page comes: one load, the field turning as the page arrives.
    address =
      s.kind === "type" && s.to !== undefined && p < COMMIT
        ? s.text
        : (timeline.spelled[target] ?? target)
    if (p >= COMMIT && url !== target) {
      url = target
      scroll = 0
    }
    load = p < 1 ? { progress: loadCurve(p), opacity: 1 } : fading(to)
  }
  return {
    url,
    address,
    editing,
    selected,
    load,
    scroll,
    back: here > 0,
    forward: here < history.length - 1,
    step,
  }
}
