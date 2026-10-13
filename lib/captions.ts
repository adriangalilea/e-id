import type { Span } from "@/lib/clip"

/** One language's captions for a medium: a WebVTT file. `lang` is BCP 47 (`en`,
 *  `es-ES`); `label` is what the menu says (`English`); `default` shows it to a person
 *  who never chose. */
export interface Captions {
  src: string
  lang: string
  label: string
  default?: boolean
}

/** What is shown over a span: the words, the file's own line breaks kept, and who says
 *  them when the file names a voice (`<v Kennedy>`). */
export interface CaptionLine {
  span: Span
  text: string
  voice?: string
}

/** A person's choice, as kept: captions on, off, or never chosen (null: the medium's
 *  default decides), and the language last picked. */
export interface CaptionsChoice {
  on: boolean | null
  lang: string | null
}

export const NEVER_CHOSEN: CaptionsChoice = { on: null, lang: null }

/** The captions offered, checked: each with a file, a language and a label, no
 *  language twice, at most one default. A list that breaks these screams, naming it. */
export function checkCaptions(
  offered: readonly Captions[],
): readonly Captions[] {
  const langs = new Set<string>()
  for (const c of offered) {
    if (!c.src || !c.lang.trim() || !c.label.trim())
      throw new Error(
        `captions: every file needs a src, a lang and a label (${JSON.stringify(c)})`,
      )
    const lang = c.lang.toLowerCase()
    if (langs.has(lang))
      throw new Error(`captions: "${c.lang}" is offered twice`)
    langs.add(lang)
  }
  if (offered.filter((c) => c.default).length > 1)
    throw new Error("captions: more than one is the default")
  return offered
}

/** The captions a choice shows: none when turned off; when turned on, the language
 *  last picked (or one of its family: `en-US` for `en`), else the default, else the
 *  first; never chosen, the default or none. */
export function shownOf(
  offered: readonly Captions[],
  choice: CaptionsChoice,
): Captions | null {
  const fallback = offered.find((c) => c.default) ?? null
  if (choice.on === false) return null
  if (choice.on === null) return fallback
  return languageOf(offered, choice.lang) ?? fallback ?? offered[0] ?? null
}

/** A choice turned the other way: off when it shows any, else on, in the language
 *  last picked where offered, else the default, else the first. */
export function toggledChoice(
  offered: readonly Captions[],
  was: CaptionsChoice,
): CaptionsChoice {
  if (shownOf(offered, was)) return { ...was, on: false }
  return {
    on: true,
    lang:
      languageOf(offered, was.lang)?.lang ??
      (offered.find((c) => c.default) ?? offered[0])?.lang ??
      null,
  }
}

/** The captions in `lang`, exactly, else of its family (the same primary subtag). */
export function languageOf(
  offered: readonly Captions[],
  lang: string | null,
): Captions | null {
  if (!lang) return null
  const want = lang.toLowerCase()
  const family = want.split("-")[0]
  return (
    offered.find((c) => c.lang.toLowerCase() === want) ??
    offered.find((c) => c.lang.toLowerCase().split("-")[0] === family) ??
    null
  )
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  lrm: "‎",
  rlm: "‏",
}

/** The lines a WebVTT file holds, as the browser parsed it (a TextTrack's entries:
 *  times in seconds, the text with its markup): times in ms, sorted, the voice taken
 *  out of `<v Name>`, every other tag dropped (`<i>`, `<b>`, `<c.x>`, the karaoke
 *  timestamps), entities read. An entry ending before it starts screams. */
export function linesOf(
  parsed: readonly { startTime: number; endTime: number; text: string }[],
): CaptionLine[] {
  return parsed
    .map((p) => {
      const from = Math.round(p.startTime * 1000)
      const to = Math.round(p.endTime * 1000)
      if (!(to >= from))
        throw new Error(
          `captions: a line ends (${to} ms) before it starts (${from} ms): "${p.text}"`,
        )
      const voice = /<v(?:\.[^\s>]*)?\s+([^>]+)>/.exec(p.text)?.[1]?.trim()
      const text = p.text
        .replace(/<[^>]*>/g, "")
        .replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (all, name: string) => {
          if (name[0] === "#")
            return String.fromCodePoint(
              name[1] === "x" || name[1] === "X"
                ? Number.parseInt(name.slice(2), 16)
                : Number.parseInt(name.slice(1), 10),
            )
          return ENTITIES[name.toLowerCase()] ?? all
        })
        .trim()
      return { span: { from, to }, text, ...(voice ? { voice } : {}) }
    })
    .sort((a, b) => a.span.from - b.span.from)
}

/** The lines showing at `ms`: every one whose span holds it (from inclusive, to
 *  exclusive), in order; two speakers at once are two lines. */
export function linesAt(
  lines: readonly CaptionLine[],
  ms: number,
): CaptionLine[] {
  return lines.filter((l) => l.span.from <= ms && ms < l.span.to)
}
