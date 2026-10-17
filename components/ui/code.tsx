// A code block, highlighted on the SERVER. Shiki is the highlighter VS Code uses, so
// the grammars and themes are the ones the reader already knows, and running it at
// build time means the page ships the markup and none of the highlighter: only the
// copy control is client code.
//
// Two themes are baked into one render (`--shiki-light` / `--shiki-dark` on every
// token) and code.css picks with the theme, so switching does not re-highlight and
// cannot flash.
//
// Two parts anyone can use alone: the markup is lib/code-highlight's `codeHtml`, the
// frame is code-frame's `CodeFrame`, which markdown draws its blocks with too, so a
// block in a page of markdown and one written here are the same block.

import "server-only"
import type { BundledLanguage } from "shiki"
import { CodeFrame } from "@/components/ui/code-frame"
import { codeHtml } from "@/lib/code-highlight"

export interface CodeProps {
  /** The source. Common leading indentation is removed, so a snippet can be written
   *  indented inside the code that renders it and still read flush. */
  children: string
  /** A highlighted command row without a filename bar. Copy stays on the right;
   *  a command too long for the row scrolls on one line, its hidden side fading. */
  compact?: boolean
  /** A Shiki language id. `text` when it is not code, which skips the grammar. */
  lang?: BundledLanguage | "text"
  /** A path or a name for the tab. Without one the bar names the language. */
  filename?: string
  /** Hide the copy control, for a snippet nobody would want in their clipboard. */
  copy?: boolean
  /** Lines to mark, `"2"` or `"1,4-6"`, counted from 1. For source you do NOT own:
   *  a file rendered verbatim cannot carry `[!code highlight]` comments without them
   *  becoming part of the file. Where you do own it, prefer the comments, which move
   *  with the lines when the code is edited. */
  highlight?: string
  /** Number the lines. Off by default: most snippets are short enough that numbers
   *  are furniture, and they are only worth their width when something refers to one. */
  lines?: boolean
  /** Read `[!code ...]` comments. ON, except where the source is being shown AS
   *  ITSELF: a file that writes those comments inside a string would have them eaten
   *  out of its own listing, and a block promising verbatim would be quietly lying. */
  notations?: boolean
  /** Its face: `plain`, the page's frame (default), or `glass`, the one glass
   *  material (`material-glass`), its own border and ground dropped for it. Set
   *  here rather than read from a provider: the block renders on the server. */
  material?: "plain" | "glass"
  /** No frame, no bar and no copy of its own: for a frame that holds it (a
   *  tab of a `Panel` with an example's code, its copy in the panel's head), so a
   *  block in a frame is never a frame in a frame. `material` is then the
   *  holder's. */
  bare?: boolean
  className?: string
}

/** Strip the shortest indentation any non-blank line has, and the blank first and
 *  last lines a template literal always brings. */
function dedent(src: string): string {
  const lines = src.replace(/\t/g, "  ").split("\n")
  while (lines.length && !lines[0]?.trim()) lines.shift()
  while (lines.length && !lines[lines.length - 1]?.trim()) lines.pop()
  const pad = Math.min(
    ...lines
      .filter((l) => l.trim())
      .map((l) => l.length - l.trimStart().length),
  )
  return lines.map((l) => l.slice(pad)).join("\n")
}

export async function Code({
  children,
  lang = "tsx",
  highlight,
  notations = true,
  ...frame
}: CodeProps) {
  const source = dedent(children)
  const html = await codeHtml(source, { lang, highlight, notations })
  return <CodeFrame source={source} html={html} lang={lang} {...frame} />
}
