// A code block's frame, given its markup: the bar (its name, the copy), the scroller
// with its fading edges, the material's face. What `Code` draws on the server and
// markdown draws anywhere (a prepared block, or one coloured in the browser), so a
// block reads the same wherever it is. No highlighter here: `html` is Shiki's markup
// (lib/code-highlight), or null for the plain text until it is.

import { Copy } from "@/components/ui/copy"
import { Glass } from "@/components/ui/material-glass"
import "./code.css"
import "./edge-fade"

export interface CodeFrameProps {
  /** The source, as the clipboard gets it. */
  source: string
  /** Shiki's markup of it (lib/code-highlight `codeHtml`); null draws it plain. */
  html: string | null
  /** The language, the bar's name when there is no filename. */
  lang: string
  /** A path or a name for the bar. */
  filename?: string
  /** A highlighted command row without a bar; copy stays on the right. */
  compact?: boolean
  /** The copy control. */
  copy?: boolean
  /** Number the lines. */
  lines?: boolean
  /** Its face: the page's frame, or the one glass material. */
  material?: "plain" | "glass"
  /** No frame, bar or copy of its own: for a frame that holds it. */
  bare?: boolean
  className?: string
}

export function CodeFrame({
  source,
  html,
  lang,
  filename,
  compact = false,
  copy = true,
  lines = false,
  material = "plain",
  bare = false,
  className,
}: CodeFrameProps) {
  // Shiki's own <pre><code>, styled by code.css. A long line scrolls sideways, and a
  // block given less height than it needs scrolls down, inside the frame, with the
  // scrims' edge fade: never a scrollbar drawn over the code, never a hard cut.
  const scroll = html ? (
    <div
      className="ag-code-scroll ag-edge-fade-xy"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki's own escaped markup of the source (lib/code-highlight)
      dangerouslySetInnerHTML={{ __html: html }}
    />
  ) : (
    <div className="ag-code-scroll ag-edge-fade-xy">
      <pre>
        <code>{source}</code>
      </pre>
    </div>
  )
  const frame = `ag-code${lines ? " ag-code-numbered" : ""}${className ? ` ${className}` : ""}`
  if (bare)
    return (
      <div data-slot="code" data-bare className={frame}>
        {scroll}
      </div>
    )
  const body = (
    <>
      {!compact && (
        <div className="ag-code-bar">
          <span className="ag-code-name">{filename ?? lang}</span>
          {copy && <Copy value={source} label />}
        </div>
      )}
      {scroll}
      {compact && copy && <Copy value={source} className="mr-2" />}
    </>
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
