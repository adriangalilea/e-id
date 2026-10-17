// Code as `code` draws it, as markup: Shiki with the two themes every code view here
// wears (CODE_THEMES, both in one render, `--shiki-light` and `--shiki-dark` on each
// token), the `[!code …]` notations read where asked, lines marked, and every token
// in the block's own colours unwrapped. One function, so a block on the server
// (`Code`), one prepared at build (markdown-prepare) and one coloured in the browser
// (markdown-code) are the same markup. Framework-free; Shiki loads on the first call.

import type { BundledLanguage, ShikiTransformer } from "shiki"
import { CODE_THEMES, linesOf } from "@/lib/code-tokens"

export type CodeHtmlOptions = {
  /** A Shiki language id; `text` when it is not code, which skips the grammar.
   *  One Shiki does not know throws (`knownLanguage` asks first). */
  lang: BundledLanguage | "text" | (string & {})
  /** Lines to mark, `"2"` or `"1,4-6"`. */
  highlight?: string
  /** Read `[!code …]` comments: off where the source is shown as itself. */
  notations?: boolean
}

/** One of the two inks a Shiki style names (`--shiki-light`, `--shiki-dark`). */
const inkOf = (style: string, name: string) =>
  new RegExp(`(?:^|;)${name}:([^;]+)`).exec(style)?.[1]?.toLowerCase()

/** A token in the block's own colours says nothing its line does not: the line wears
 *  them already (the `<pre>`'s `--shiki-light` and `--shiki-dark`, inherited, which
 *  code.css colours every span with), so its span is markup alone, two in five of a
 *  page's tokens. It goes, its text left in the line. Run last, once every notation
 *  has read the spans: a word highlight counts characters through them. */
const unwrapPlainTokens: ShikiTransformer = {
  name: "ag:unwrap-plain-tokens",
  root(root) {
    const pre = root.children.find(
      (n) => n.type === "element" && n.tagName === "pre",
    )
    if (pre?.type !== "element") throw new Error("code: Shiki drew no <pre>")
    const own = String(pre.properties.style ?? "")
    const light = inkOf(own, "--shiki-light")
    const dark = inkOf(own, "--shiki-dark")
    if (!light || !dark)
      throw new Error(`code: the <pre> names no inks of its own (${own})`)
    const plain = `--shiki-light:${light};--shiki-dark:${dark}`
    const code = pre.children.find(
      (n) => n.type === "element" && n.tagName === "code",
    )
    if (code?.type !== "element") throw new Error("code: Shiki drew no <code>")
    for (const line of code.children) {
      if (line.type !== "element") continue
      line.children = line.children.flatMap((token) =>
        token.type === "element" &&
        token.tagName === "span" &&
        Object.keys(token.properties).length === 1 &&
        String(token.properties.style).toLowerCase() === plain &&
        token.children.every((c) => c.type === "text")
          ? token.children
          : [token],
      )
    }
  },
}

/** Whether Shiki knows `lang` (or it is `text`): a block in any other is drawn plain. */
export async function knownLanguage(lang: string): Promise<boolean> {
  if (lang === "text") return true
  const { bundledLanguages } = await import("shiki")
  return lang in bundledLanguages
}

/** `source` as Shiki's markup, in code's two themes. */
export async function codeHtml(
  source: string,
  { lang, highlight, notations = false }: CodeHtmlOptions,
): Promise<string> {
  const { codeToHtml } = await import("shiki")
  const marked = highlight ? linesOf(highlight) : null
  const notes = notations
    ? await import("@shikijs/transformers").then((t) => [
        t.transformerNotationDiff({ matchAlgorithm: "v3" }),
        t.transformerNotationHighlight({ matchAlgorithm: "v3" }),
        t.transformerNotationWordHighlight({ matchAlgorithm: "v3" }),
        t.transformerNotationFocus({ matchAlgorithm: "v3" }),
        t.transformerNotationErrorLevel({ matchAlgorithm: "v3" }),
      ])
    : []
  return codeToHtml(source, {
    lang,
    themes: CODE_THEMES,
    defaultColor: false,
    transformers: [
      // The notations travel INSIDE the source, so they survive an edit that moves a
      // line; Shiki strips the comment from the markup, the clipboard keeps it.
      ...notes,
      // ...and `highlight` for source nobody may write into.
      {
        name: "ag:highlight-prop",
        line(node, line) {
          if (marked?.has(line)) this.addClassToHast(node, "highlighted")
        },
      },
      unwrapPlainTokens,
    ],
  })
}
