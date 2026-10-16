// Code's colours, character by character: the same highlighter `code` renders with
// (Shiki, VS Code's own grammars), read as one style per character instead of as
// markup, for a view that draws text which is not all there yet (an editor whose
// file is being typed: each character keeps the colour it has in the finished file,
// so a half-typed attribute already reads as one). Framework-free; Shiki loads on the
// first call, so the page ships none of it until something asks, and then only its
// core, the JavaScript regex engine and the one grammar and two themes asked for.

/** The two themes every code view here wears, light and dark, picked by the scheme
 *  it stands in. `code` and `markdown` render with them. */
export const CODE_THEMES = {
  light: "github-light",
  dark: "github-dark",
} as const

/** VS Code's default themes' token colours, which `ide` wears: Dark Modern and
 *  Light Modern are built on Dark+ and Light+. */
export const VSCODE_THEMES = {
  light: "light-plus",
  dark: "dark-plus",
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

type Core = import("shiki/core").HighlighterCore

/** One highlighter for the page, made on the first call: Shiki's core with its
 *  JavaScript regex engine, never the WebAssembly one (Oniguruma, 600 KB a browser
 *  would download to colour a few lines), each language and theme loaded the first
 *  time it is asked for, alone. */
let core: Promise<Core> | undefined
async function highlighter(lang: string, themes: CodeThemes): Promise<Core> {
  core ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] =
      await Promise.all([
        import("shiki/core"),
        import("shiki/engine/javascript"),
      ])
    return createHighlighterCore({
      engine: createJavaScriptRegexEngine(),
      themes: [],
      langs: [],
    })
  })()
  const h = await core
  const [{ bundledLanguages }, { bundledThemes }] = await Promise.all([
    import("shiki/langs"),
    import("shiki/themes"),
  ])
  const loading: Promise<void>[] = []
  if (lang !== "text" && !h.getLoadedLanguages().includes(lang)) {
    const grammar = bundledLanguages[lang as keyof typeof bundledLanguages]
    if (grammar) loading.push(h.loadLanguage(grammar))
  }
  for (const name of [themes.light, themes.dark])
    if (!h.getLoadedThemes().includes(name)) {
      const theme = bundledThemes[name as keyof typeof bundledThemes]
      if (!theme) throw new Error(`code-tokens: no Shiki theme ${name}`)
      loading.push(h.loadTheme(theme))
    }
  await Promise.all(loading)
  return h
}

/** Every character of `text` coloured by `lang`'s grammar in both `themes`. A
 *  language Shiki does not know is `text`: one ink, the theme's foreground. Runs
 *  where it is called: on the server for a still (passed to a view as its
 *  `colours`), or in the browser for text that changes. */
export async function codeColours(
  text: string,
  lang: string,
  themes: CodeThemes = CODE_THEMES,
): Promise<CodeColours> {
  const h = await highlighter(lang, themes)
  const lines = h.codeToTokensWithThemes(text, {
    lang: h.getLoadedLanguages().includes(lang) ? lang : "text",
    themes: { light: themes.light, dark: themes.dark },
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
