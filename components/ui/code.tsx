// A code block, highlighted on the SERVER. Shiki is the highlighter VS Code uses, so
// the grammars and themes are the ones the reader already knows, and running it at
// build time means the page ships the markup and none of the highlighter: only the
// copy control is client code.
//
// Two themes are baked into one render (`--shiki-light` / `--shiki-dark` on every
// token) and code.css picks with the theme, so switching does not re-highlight and
// cannot flash.

import "server-only"
import {
  transformerNotationDiff,
  transformerNotationErrorLevel,
  transformerNotationFocus,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers"
import { type BundledLanguage, codeToHtml, type ShikiTransformer } from "shiki"
import { Copy } from "@/components/ui/copy"
import { Glass } from "@/components/ui/material-glass"
import { CODE_THEMES, linesOf } from "@/lib/code-tokens"
import "./code.css"
import "./edge-fade"

export interface CodeProps {
  /** The source. Common leading indentation is removed, so a snippet can be written
   *  indented inside the code that renders it and still read flush. */
  children: string
  /** A highlighted command row without a filename bar. Copy stays on the right;
   *  a command too long for the row scrolls on one line, its hidden side fading. */
  compact?: boolean
  /** A Shiki language id. `text` when it is not code, which skips the grammar. */
  lang?: BundledLanguage | "text"
  /** A path or a name for the tab. Without one the frame is bare. */
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
  compact = false,
  lang = "tsx",
  filename,
  copy = true,
  highlight,
  lines,
  notations = true,
  material = "plain",
  bare = false,
  className,
}: CodeProps) {
  const source = dedent(children)
  const marked = highlight ? linesOf(highlight) : null
  const html = await codeToHtml(source, {
    lang,
    themes: CODE_THEMES,
    defaultColor: false,
    transformers: [
      // The notations travel INSIDE the source, so they survive an edit that moves a
      // line and they are what a reader copies out of a doc. Shiki strips the comment
      // from the rendered output; the clipboard gets `source`, which still has it.
      ...(notations
        ? [
            transformerNotationDiff({ matchAlgorithm: "v3" }),
            transformerNotationHighlight({ matchAlgorithm: "v3" }),
            transformerNotationWordHighlight({ matchAlgorithm: "v3" }),
            transformerNotationFocus({ matchAlgorithm: "v3" }),
            transformerNotationErrorLevel({ matchAlgorithm: "v3" }),
          ]
        : []),
      // ...and the `highlight` prop for source nobody may write into.
      {
        name: "ag:highlight-prop",
        line(node, line) {
          if (marked?.has(line)) this.addClassToHast(node, "highlighted")
        },
      },
      unwrapPlainTokens,
    ],
  })
  const body = (
    <>
      {!compact && (
        <div className="ag-code-bar">
          <span className="ag-code-name">{filename ?? lang}</span>
          {copy && <Copy value={source} label />}
        </div>
      )}
      {/* Shiki's own <pre><code>, styled by code.css. A long line scrolls sideways,
          and a block given less height than it needs scrolls down, inside the frame,
          with the scrims' edge fade: never a scrollbar drawn over the code, never a
          hard cut. */}
      <div
        className="ag-code-scroll ag-edge-fade-xy"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: shiki's own output, built on the server from a string prop, never from anything a reader can reach
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {compact && copy && <Copy value={source} className="mr-2" />}
    </>
  )
  const frame = `ag-code${lines ? " ag-code-numbered" : ""}${className ? ` ${className}` : ""}`
  if (bare)
    return (
      <div data-slot="code" data-bare className={frame}>
        <div
          className="ag-code-scroll ag-edge-fade-xy"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: shiki's own output, built on the server from a string prop, never from anything a reader can reach
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    )
  if (material === "glass")
    return (
      <Glass
        shape="surface"
        data-slot="code"
        data-compact={compact || undefined}
        className={`${frame} [--glass-radius:0.75rem]`}
      >
        {body}
      </Glass>
    )
  return (
    <div
      data-slot="code"
      data-material="plain"
      data-compact={compact || undefined}
      className={frame}
    >
      {body}
    </div>
  )
}
