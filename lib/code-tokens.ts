export const CODE_THEMES = {
  light: "github-light",
  dark: "github-dark",
} as const

/** Lines to mark, as every code view here spells them: `"2"` or `"1,4-6"`, counted
 *  from 1. Screams at anything else. */
export function linesOf(spec: string): Set<number> {
  const out = new Set<number>()
  for (const part of spec.split(",")) {
    const range = part.trim()
    if (!range) continue
    const [a, b = a] = range.split("-").map((n) => Number(n.trim()))
    if (!Number.isInteger(a) || !Number.isInteger(b) || a === undefined)
      throw new Error(`code: "${range}" is not a line or a range of lines`)
    for (let n = a; n <= (b as number); n++) out.add(n)
  }
  return out
}

/** A pair of Shiki theme ids, light and dark. */
export interface CodeThemes {
  light: string
  dark: string
}

/** One style a character can wear, in both themes. */
export interface CodeInk {
  light: string
  dark: string
  italic: boolean
  bold: boolean
}

/** A text's colours: `inks` the distinct styles, `of[i]` the one character `i` of
 *  the text wears (an index into `inks`). */
export interface CodeColours {
  inks: CodeInk[]
  of: Uint16Array
}

/** The language a path is written in: its extension (`html`, `ts`, `md`), which
 *  Shiki reads as a language or one of its aliases; `text` with none. */
export function langOf(path: string): string {
  return /\.([a-z0-9]+)$/i.exec(path)?.[1]?.toLowerCase() ?? "text"
}

/** Every character of `text` coloured by `lang`'s grammar in both `themes`. A
 *  language Shiki does not know is `text`: one ink, the theme's foreground. */
export async function codeColours(
  text: string,
  lang: string,
  themes: CodeThemes = CODE_THEMES,
): Promise<CodeColours> {
  const { bundledLanguages, codeToTokensWithThemes } = await import("shiki")
  const lines = await codeToTokensWithThemes(text, {
    lang: (lang in bundledLanguages ? lang : "text") as "text",
    themes: themes as { light: "github-light"; dark: "github-dark" },
  })
  const inks: CodeInk[] = []
  const known = new Map<string, number>()
  const of = new Uint16Array(text.length)
  for (const line of lines)
    for (const token of line) {
      const light = token.variants.light
      const dark = token.variants.dark
      if (!light || !dark)
        throw new Error("code-tokens: a token without both themes' colours")
      // Shiki's FontStyle flags: 1 italic, 2 bold.
      const style = light.fontStyle ?? 0
      const ink: CodeInk = {
        light: light.color ?? "inherit",
        dark: dark.color ?? "inherit",
        italic: (style & 1) !== 0,
        bold: (style & 2) !== 0,
      }
      const key = `${ink.light} ${ink.dark} ${style}`
      let n = known.get(key)
      if (n === undefined) {
        n = inks.length
        inks.push(ink)
        known.set(key, n)
      }
      of.fill(n, token.offset, token.offset + token.content.length)
    }
  return { inks, of }
}

/** A stretch of a line in one ink (null: the view's own foreground, before the
 *  colours have loaded). */
export interface CodeRun {
  text: string
  ink: CodeInk | null
}

/** `text` cut into lines of runs, each character inked by `colours` at its offset
 *  in the text they were read from: `origin[i]` for character `i` (a file being
 *  typed, coloured as it will be), or `i` itself without one. */
export function runsOf(
  text: string,
  colours: CodeColours | null,
  origin?: readonly number[],
): CodeRun[][] {
  const lines: CodeRun[][] = [[]]
  let line = lines[0] as CodeRun[]
  let run: CodeRun | null = null
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string
    if (ch === "\n") {
      line = []
      lines.push(line)
      run = null
      continue
    }
    const at = origin ? (origin[i] as number) : i
    const ink = colours
      ? (colours.inks[colours.of[at] as number] ?? null)
      : null
    if (run && run.ink === ink) run.text += ch
    else {
      run = { text: ch, ink }
      line.push(run)
    }
  }
  return lines
}
