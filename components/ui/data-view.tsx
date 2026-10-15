"use client"

import { Braces, Check, Copy, Link2, Table2, TextQuote } from "lucide-react"
import * as React from "react"
import { RelativeTime } from "@/components/ui/relative-time"
import { Highlight, Search } from "@/components/ui/search"
import { Stepper } from "@/components/ui/stepper"
import { Tree, TreeAction, type TreeHandle } from "@/components/ui/tree"
import { fuzzy } from "@/lib/fuzzy"
import { cn } from "@/lib/utils"
import "./edge-fade"

// DATA VIEW: any nested data as a tree you can read. Feed it a value (an object, an
// array, a Map, a Set, a Date, anything JSON could hold and more) or a text to parse
// (`source`, JSON or XML), and every field is a row: its key, its value drawn by kind
// (strings quoted and green, numbers blue, true and false amber, null faint, a colour
// with its swatch, a link with its arrow, a date with how long ago), a branch closed
// to a preview of what is inside ({ id, name, … } or [3, 7, 9, …]) and its size. On
// the tree component, so it has the tree's keys (arrows walk and open, type to jump)
// and its rendering of only the rows in view, for data of any size.
//
// Around it: a fuzzy search over every key and every value (matches and the way to
// them open, the letters lit), open all, open to a depth, close all, the whole as
// formatted text, and a table for a list of records (rows that share their keys, as
// an SQL result, a GraphQL list, a CSV). Each row copies its value or its path
// ($.tags["a/b"].yes[0], or /root/item[2]/@id for XML). A consumer explains what the
// data means where only it knows (`annotate`: "1.2 s" beside a value in ms).
//
// A branch with more than 100 children is cut into ranges of 100 ([0 … 99]), as a
// browser's devtools do, so a list of 50,000 opens at once.

/** What a value is, as drawn. */
export type DataKind =
  | "object"
  | "array"
  | "map"
  | "set"
  | "range"
  | "element"
  | "string"
  | "number"
  | "bigint"
  | "boolean"
  | "null"
  | "undefined"
  | "date"
  | "function"
  | "symbol"

export interface DataNode {
  /** its path, unique: `$.a[0]`, `/root/b[2]/@id` */
  id: string
  /** its name in its parent: a key, an index, a tag, or null for the root */
  key: string | number | null
  kind: DataKind
  /** the value itself (a leaf's; a branch keeps its whole) */
  value: unknown
  /** how many inside, for a branch */
  size?: number
  children?: DataNode[]
}

export interface DataViewerProps {
  /** the data */
  value?: unknown
  /** or a text holding it */
  source?: string
  /** how to read `source`; auto tries JSON, then XML */
  format?: "json" | "xml" | "auto"
  /** the root's name */
  name?: string
  /** open this many levels to begin with */
  depth?: number
  /** a word about a value only the consumer can give ("1.2 s", "a tag's colour") */
  annotate?: (node: DataNode) => React.ReactNode
  /** what an array's item is, named beside its index (a record's own name or kind:
   *  "github" for `{ platform: "github", … }`), so a list reads as what it holds
   *  and not as 0, 1, 2; found by the search too. Undefined keeps the index alone. */
  itemName?: (node: DataNode) => string | undefined
  /** the search and the buttons above the tree (explore only) */
  toolbar?: boolean
  /** `explore` (default): a tool, searched, opened by levels, each row's size and
   *  its copies. `show`: data presented to be read (a format on a landing page, a
   *  response in a doc), the keys and values alone: no toolbar, no sizes, no row
   *  actions, branches still opening. */
  variant?: "explore" | "show"
  className?: string
}

// ── the model: a value to nodes.

const IDENT = /^[A-Za-z_$][\w$]*$/
const keyPath = (parent: string, key: string) =>
  IDENT.test(key) ? `${parent}.${key}` : `${parent}[${JSON.stringify(key)}]`
const CHUNK = 100

function kindOf(v: unknown): DataKind {
  if (v === null) return "null"
  if (Array.isArray(v)) return "array"
  if (v instanceof Map) return "map"
  if (v instanceof Set) return "set"
  if (v instanceof Date) return "date"
  const t = typeof v
  if (t === "object") return "object"
  return t as DataKind
}

/** Children over 100 in ranges of 100, each a branch of its own. */
function chunked(id: string, kids: DataNode[]): DataNode[] {
  if (kids.length <= CHUNK) return kids
  const out: DataNode[] = []
  for (let i = 0; i < kids.length; i += CHUNK) {
    const part = kids.slice(i, i + CHUNK)
    out.push({
      id: `${id}#${i}`,
      key: `${i} … ${i + part.length - 1}`,
      kind: "range",
      value: null,
      size: part.length,
      children: part,
    })
  }
  return out
}

/** A value as nodes. A value met again inside itself (a cycle) is named, not walked;
 *  one shared by two branches is drawn in both. */
export function dataOf(value: unknown, root = "$"): DataNode {
  const above = new Set<object>()
  const build = (
    v: unknown,
    id: string,
    key: string | number | null,
  ): DataNode => {
    const kind = kindOf(v)
    if (typeof v === "object" && v !== null && above.has(v))
      return { id, key, kind: "symbol", value: "[circular]" }
    const node = (entries: [string | number, unknown, string][]): DataNode => {
      above.add(v as object)
      const kids = entries.map(([k, x, p]) => build(x, p, k))
      above.delete(v as object)
      return {
        id,
        key,
        kind,
        value: v,
        size: kids.length,
        children: chunked(id, kids),
      }
    }
    if (kind === "array")
      return node((v as unknown[]).map((x, i) => [i, x, `${id}[${i}]`]))
    if (kind === "object")
      return node(
        Object.entries(v as object).map(([k, x]) => [k, x, keyPath(id, k)]),
      )
    if (kind === "map")
      return node(
        [...(v as Map<unknown, unknown>)].map(([k, x], i) => [
          String(k),
          x,
          `${id}.get(${JSON.stringify(String(k))})#${i}`,
        ]),
      )
    if (kind === "set")
      return node([...(v as Set<unknown>)].map((x, i) => [i, x, `${id}[${i}]`]))
    return { id, key, kind, value: v }
  }
  return build(value, root, null)
}

/** An XML document as nodes: an element's attributes (@name), its elements, its text
 *  (#text), in order. */
export function dataOfXml(doc: Document): DataNode {
  const build = (el: Element, id: string): DataNode => {
    const kids: DataNode[] = []
    for (const a of [...el.attributes])
      kids.push({
        id: `${id}/@${a.name}`,
        key: `@${a.name}`,
        kind: "string",
        value: a.value,
      })
    const count = new Map<string, number>()
    for (const c of [...el.childNodes]) {
      if (c.nodeType === 1) {
        const e = c as Element
        const n = (count.get(e.tagName) ?? 0) + 1
        count.set(e.tagName, n)
        kids.push(build(e, `${id}/${e.tagName}[${n}]`))
      } else if (
        (c.nodeType === 3 || c.nodeType === 4) &&
        c.textContent?.trim()
      )
        kids.push({
          id: `${id}/#text${kids.length}`,
          key: "#text",
          kind: "string",
          value: c.textContent.trim(),
        })
    }
    // An element holding only its text is that text, as a leaf.
    if (kids.length === 1 && kids[0]?.key === "#text")
      return { id, key: el.tagName, kind: "string", value: kids[0].value }
    return {
      id,
      key: el.tagName,
      kind: "element",
      value: el,
      size: kids.length,
      children: chunked(id, kids),
    }
  }
  const root = doc.documentElement
  return build(root, `/${root.tagName}`)
}

/** A branch with something inside: an empty `[]` or `{}` has nothing to open, so it
 *  never counts as a level closed. */
const opens = (n: DataNode) => (n.children?.length ?? 0) > 0

/** Nothing to subscribe to: the server's snapshot and the browser's differ once. */
const subscribeNothing = () => () => {}

/** A text read as JSON or XML, or why it could not be. */
export function parseSource(
  source: string,
  format: "json" | "xml" | "auto" = "auto",
): { node: DataNode } | { error: string } {
  const text = source.trim()
  const json = () => ({ node: dataOf(JSON.parse(text)) })
  const xml = () => {
    const doc = new DOMParser().parseFromString(text, "application/xml")
    const bad = doc.querySelector("parsererror")
    if (bad) throw new Error(bad.textContent?.split("\n")[0] ?? "not XML")
    return { node: dataOfXml(doc) }
  }
  try {
    if (format === "json") return json()
    if (format === "xml") return xml()
    return text.startsWith("<") ? xml() : json()
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ── drawing a value.

const COLOUR =
  /^(#[0-9a-f]{3,8}|(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\(.+\))$/i
const URL_LIKE = /^(https?:\/\/|\/)[^\s]*$/
const ISO_DATE =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/

const TONE: Partial<Record<DataKind, string>> = {
  string: "text-emerald-300/90",
  number: "text-sky-300",
  bigint: "text-sky-300",
  boolean: "text-amber-300",
  null: "italic text-foreground/40",
  undefined: "italic text-foreground/40",
  date: "text-violet-300",
  function: "text-foreground/50",
  symbol: "text-foreground/50",
}

/** A leaf's value as text, as searched and copied. */
function leafText(n: DataNode): string {
  const v = n.value
  if (n.kind === "string") return v as string
  if (n.kind === "date") return (v as Date).toISOString()
  if (n.kind === "bigint") return `${String(v)}n`
  if (n.kind === "function")
    return `ƒ ${(v as { name?: string }).name || "anonymous"}()`
  return String(v)
}

/** What a closed branch holds, in a few words. */
function preview(n: DataNode): string {
  const kids = (n.kind === "range" ? n.children : undefined) ?? n.children ?? []
  if (n.kind === "array" || n.kind === "set" || n.kind === "range") {
    const items = (n.kind === "range" ? kids : kids)
      .slice(0, 6)
      .map((k) =>
        k.children ? (k.kind === "array" ? `[${k.size}]` : "{…}") : short(k),
      )
    return `[${items.join(", ")}${(n.size ?? 0) > 6 ? ", …" : ""}]`
  }
  const keys = kids.slice(0, 5).map((k) => String(k.key))
  return `{ ${keys.join(", ")}${(n.size ?? 0) > 5 ? ", …" : ""} }`
}

function short(n: DataNode): string {
  const t = leafText(n)
  if (n.kind === "string")
    return JSON.stringify(t.length > 16 ? `${t.slice(0, 15)}…` : t)
  return t
}

/** A press on a value that is the reader's, not the row's: selecting its text, or
 *  following its link, never selecting or opening the row. */
const READ_HERE = {
  onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
  onClick: (e: React.MouseEvent) => e.stopPropagation(),
}

function Value({
  node,
  query,
  read = false,
}: {
  node: DataNode
  query: string
  /** Shown to be read (`variant="show"`): the text selects as any text does,
   *  and a link is the words themselves, opened by a press (a new tab). */
  read?: boolean
}) {
  if (node.children) return null
  const text = leafText(node)
  const shown =
    node.kind === "string" && text.length > 160
      ? `${text.slice(0, 160)}…`
      : text
  const colour = node.kind === "string" && COLOUR.test(text)
  const link = node.kind === "string" && URL_LIKE.test(text) && text.length > 1
  const when =
    node.kind === "date"
      ? (node.value as Date).getTime()
      : node.kind === "string" && ISO_DATE.test(text)
        ? Date.parse(text)
        : null
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5",
        TONE[node.kind],
      )}
    >
      {colour && (
        <span
          className="size-2.5 shrink-0 rounded-[3px] ring-1 ring-white/15"
          style={{ background: text }}
        />
      )}
      {read && link ? (
        // Text first, as in an editor: it selects by a drag or a double press
        // (an <a> would start dragging the link instead), and ⌘-press (Ctrl
        // elsewhere) opens it, the convention for a link inside text; the glyph
        // after it opens it with a plain press.
        // biome-ignore lint/a11y/noStaticElementInteractions: the ⌘-press is a pointer shortcut; the link glyph after it is the focusable way to open it
        // biome-ignore lint/a11y/useKeyWithClickEvents: as above, the glyph is the keyboard's
        <span
          {...READ_HERE}
          onClick={(e) => {
            e.stopPropagation()
            if (e.metaKey || e.ctrlKey)
              window.open(text, "_blank", "noreferrer")
          }}
          className="min-w-0 cursor-text select-text truncate"
          title={`${text}\n⌘-click to open`}
        >
          “<Highlight text={shown} query={query} />”
        </span>
      ) : (
        <span
          {...(read ? READ_HERE : {})}
          className={cn("min-w-0 truncate", read && "cursor-text select-text")}
          title={text.length > 160 ? text : undefined}
        >
          {node.kind === "string" ? "“" : ""}
          <Highlight text={shown} query={query} />
          {node.kind === "string" ? "”" : ""}
        </span>
      )}
      {link && (
        <a
          href={text}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="shrink-0 text-foreground/40 hover:text-foreground"
          aria-label="open the link"
        >
          <Link2 className="size-3" />
        </a>
      )}
      {when !== null && !Number.isNaN(when) && (
        // The registry's relative time: the server's words and the reader's
        // agree, then it ticks.
        <RelativeTime
          at={when}
          className="shrink-0 text-[10px] text-foreground/35"
        />
      )}
    </span>
  )
}

// ── the table, for a list of records.

/** The columns a list of records shares, when it is one: two or more objects whose
 *  keys mostly agree. */
function columnsOf(n: DataNode): string[] | null {
  if (n.kind !== "array" || (n.size ?? 0) < 2) return null
  const rows = n.value as unknown[]
  if (!rows.every((r) => kindOf(r) === "object")) return null
  const counts = new Map<string, number>()
  for (const r of rows)
    for (const k of Object.keys(r as object))
      counts.set(k, (counts.get(k) ?? 0) + 1)
  const cols = [...counts]
    .filter(([, c]) => c >= rows.length / 2)
    .map(([k]) => k)
  return cols.length ? cols : null
}

function Table({ node, query }: { node: DataNode; query: string }) {
  const cols = columnsOf(node) as string[]
  const rows = node.value as Record<string, unknown>[]
  return (
    // The frame stays whole; the table scrolls inside it both ways, its cut edges
    // fading where there is more, below the pinned header row (scrims'
    // `ag-edge-fade-xy`, the head its cover).
    <div className="flex min-h-0 flex-1 rounded-md ring-1 ring-foreground/10">
      <div className="ag-edge-fade-xy min-h-0 flex-1 [--ag-data-view-head:1.5rem] [--edge-cover:var(--ag-data-view-head)]">
        <table className="w-max min-w-full border-collapse font-mono text-[11px]">
          <thead className="sticky top-0 h-(--ag-data-view-head) bg-[oklch(0.2_0.005_270)]">
            <tr>
              <th className="px-2 py-1 text-left font-normal text-foreground/35">
                #
              </th>
              {cols.map((c) => (
                <th
                  key={c}
                  className="px-2 py-1 text-left font-normal text-foreground/55"
                >
                  <Highlight text={c} query={query} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional
                key={i}
                className="border-foreground/5 border-t hover:bg-foreground/4"
              >
                <td className="px-2 py-0.5 text-foreground/30 tabular-nums">
                  {i}
                </td>
                {cols.map((c) => {
                  const cell = dataOf(r[c], `$[${i}]`)
                  return (
                    <td key={c} className="max-w-72 px-2 py-0.5">
                      {cell.children ? (
                        <span className="text-foreground/45">
                          {cell.kind === "array"
                            ? `[${cell.size}]`
                            : preview(cell)}
                        </span>
                      ) : (
                        <Value node={cell} query={query} />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** A row's size at its end: a branch's kind and count, a string's length. */
function sizeOf(n: DataNode): string | undefined {
  if (n.children) {
    const mark =
      n.kind === "element"
        ? "<>"
        : n.kind === "range"
          ? ""
          : n.kind === "array" || n.kind === "set"
            ? "[]"
            : "{}"
    return `${mark} ${n.size}`
  }
  return n.kind === "string" ? `${(n.value as string).length}` : undefined
}

// ── the whole.

function walk(
  n: DataNode,
  depth: number,
  out: (n: DataNode, depth: number) => void,
) {
  out(n, depth)
  for (const k of n.children ?? []) walk(k, depth + 1, out)
}

/** A node's value as JSON, as copied. */
function asJson(n: DataNode): string {
  if (n.kind === "element")
    return new XMLSerializer().serializeToString(n.value as Element)
  if (n.kind === "range")
    return JSON.stringify(
      (n.children ?? []).map((k) => k.value),
      null,
      2,
    )
  if (n.kind === "string") return n.value as string
  try {
    return JSON.stringify(
      n.value,
      (_, v) =>
        v instanceof Map
          ? Object.fromEntries(v)
          : v instanceof Set
            ? [...v]
            : typeof v === "bigint"
              ? `${v}n`
              : v,
      2,
    )
  } catch {
    return leafText(n)
  }
}

function CopyButton({ label, text }: { label: string; text: () => string }) {
  const [done, setDone] = React.useState(false)
  return (
    <TreeAction
      label={label}
      onClick={() => {
        void navigator.clipboard.writeText(text()).then(() => {
          setDone(true)
          window.setTimeout(() => setDone(false), 900)
        })
      }}
    >
      {done ? <Check /> : label === "copy path" ? <Braces /> : <Copy />}
    </TreeAction>
  )
}

const TOOL =
  "inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-[11px] text-foreground/55 hover:bg-foreground/6 hover:text-foreground aria-pressed:bg-foreground/10 aria-pressed:text-foreground [&_svg]:size-3.5"

export function DataViewer({
  value,
  source,
  format = "auto",
  name,
  depth = 1,
  annotate,
  itemName,
  toolbar: wantsToolbar = true,
  variant = "explore",
  className,
}: DataViewerProps) {
  const shown = variant === "show"
  const toolbar = wantsToolbar && !shown
  // XML is read with the browser's DOMParser, which the server has not: there it
  // is pending (an empty frame), read once the page is live, so the two agree.
  const browser = React.useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  )
  const xml =
    source !== undefined &&
    (format === "xml" || (format === "auto" && source.trim().startsWith("<")))
  const parsed = React.useMemo(
    () =>
      source !== undefined
        ? xml && !browser
          ? { pending: true as const }
          : parseSource(source, format)
        : { node: dataOf(value) },
    [value, source, format, xml, browser],
  )
  const root = "node" in parsed ? parsed.node : null
  const [query, setQuery] = React.useState("")
  const [mode, setMode] = React.useState<"tree" | "text" | "table">("tree")
  const tree = React.useRef<TreeHandle>(null)
  const table = root ? columnsOf(root) : null
  const [open, setOpen] = React.useState<string[]>([])
  // Opened to the depth asked, again whenever the data takes another shape (other
  // branches), never when the same data comes again as a new object: a page that polls
  // closed every branch the reader had opened, and the page jumped under its scroll.
  const shape = React.useMemo(() => {
    const ids: string[] = []
    if (root)
      walk(root, 0, (n) => {
        if (n.children) ids.push(n.id)
      })
    return ids.join("\n")
  }, [root])
  // biome-ignore lint/correctness/useExhaustiveDependencies: `shape` stands for the root's branches; a new root of the same branches keeps what is open
  React.useEffect(() => {
    if (!root) return
    const ids: string[] = []
    walk(root, 0, (n, d) => {
      if (n.children && d < depth) ids.push(n.id)
    })
    setOpen(ids)
  }, [shape, depth])
  const openTo = (d: number) => {
    if (!root) return
    const ids: string[] = []
    walk(root, 0, (n, at) => {
      if (n.children && at < d) ids.push(n.id)
    })
    setOpen(ids)
  }
  const deepest = React.useMemo(() => {
    let m = 0
    if (root)
      walk(root, 0, (n, d) => {
        if (opens(n)) m = Math.max(m, d + 1)
      })
    return m
  }, [root])
  // How deep it IS open, read from the open branches, never a depth once asked:
  // the levels above the shallowest closed branch (a level counts once all of it
  // is open). A branch closed by hand moves the stepper with it.
  const opened = React.useMemo(() => {
    const isOpen = new Set(open)
    let d = deepest
    if (root)
      walk(root, 0, (n, at) => {
        if (opens(n) && !isOpen.has(n.id)) d = Math.min(d, at)
      })
    return d
  }, [root, open, deepest])
  /** A depth in words: none, a number of levels, or all of them. */
  const levels = (d: number) =>
    d === 0 ? "none" : d >= deepest ? "all" : String(d)

  if ("pending" in parsed)
    return (
      <div
        data-slot="data-view"
        aria-busy
        className={cn("flex min-h-0 flex-col gap-2", className)}
      />
    )
  if (!root)
    return (
      <div
        data-slot="data-view"
        className={cn(
          "rounded-md bg-red-500/8 p-3 font-mono text-[12px] text-red-300",
          className,
        )}
      >
        cannot read it: {"error" in parsed ? parsed.error : ""}
      </div>
    )

  const label = (n: DataNode) =>
    n.key === null
      ? (name ?? (n.kind === "element" ? String(n.id.slice(1)) : n.kind))
      : String(n.key)
  /** An array item's name, when the consumer gives one. */
  const named = (n: DataNode) =>
    typeof n.key === "number" ? itemName?.(n) : undefined
  return (
    <div
      data-slot="data-view"
      className={cn("flex min-h-0 flex-col gap-2", className)}
    >
      {toolbar && (
        <div className="flex flex-wrap items-center gap-1">
          <Search
            value={query}
            onChange={setQuery}
            label="search keys and values"
            placeholder="search keys and values"
            className="min-w-40 flex-1"
          />
          <button
            type="button"
            aria-pressed={mode === "tree"}
            className={TOOL}
            onClick={() => setMode("tree")}
          >
            tree
          </button>
          {table && (
            <button
              type="button"
              aria-pressed={mode === "table"}
              className={TOOL}
              onClick={() => setMode("table")}
            >
              <Table2 /> table
            </button>
          )}
          <button
            type="button"
            aria-pressed={mode === "text"}
            className={TOOL}
            onClick={() => setMode("text")}
          >
            <TextQuote /> text
          </button>
          {mode === "tree" && (
            // How deep it is open, stepped level by level from none to all
            // (stepper): ‹ › a level a press, the arrows, Home and End.
            <span className="flex items-center gap-1.5 pl-1 font-mono text-[10px] text-foreground/40">
              open
              <Stepper
                label="levels open"
                size="sm"
                value={opened}
                options={Array.from({ length: deepest + 1 }, (_, d) => d)}
                onValueChange={openTo}
                format={levels}
                className="font-mono text-[11px] text-foreground/70"
              />
            </span>
          )}
        </div>
      )}
      {mode === "text" ? (
        // The frame stays whole; the text scrolls inside it both ways, its cut
        // edges fading where there is more (scrims' `ag-edge-fade-xy`).
        <div className="flex min-h-0 flex-1 rounded-md bg-foreground/4">
          <pre className="ag-edge-fade-xy min-h-0 flex-1 p-3 font-mono text-[11px] text-foreground/80 leading-5">
            {asJson(root)}
          </pre>
        </div>
      ) : mode === "table" && table ? (
        <Table node={root} query={query} />
      ) : (
        <Tree<DataNode>
          ref={tree}
          aria-label={name ?? "data"}
          items={[root]}
          label={label}
          expanded={open}
          onExpandedChange={setOpen}
          filter={query}
          match={(n, q) =>
            fuzzy(q, String(n.key ?? "")) !== null ||
            fuzzy(q, named(n) ?? "") !== null ||
            (!n.children && fuzzy(q, leafText(n)) !== null)
          }
          guides
          density="compact"
          className={cn(
            "min-h-0 flex-1 font-mono text-[12px]",
            // The rows are text: a drag selects across keys and values and from
            // row to row, as it does in any text (Adrian, 2026-10-14: "i cant
            // select text here", on the tree variant).
            "[&_[role=treeitem]]:select-text",
          )}
          content={(n, s) => (
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className={cn(
                  "shrink-0",
                  typeof n.key === "number" || n.kind === "range"
                    ? "text-foreground/40"
                    : "text-foreground/85",
                )}
              >
                <Highlight text={label(n)} query={query} />
              </span>
              {named(n) && (
                <span className="shrink-0 text-foreground/85">
                  <Highlight text={named(n) ?? ""} query={query} />
                </span>
              )}
              {n.key !== null && (
                <span className="shrink-0 text-foreground/30">
                  {n.children ? "" : ":"}
                </span>
              )}
              {n.children ? (
                !s.expanded && (
                  <span className="min-w-0 truncate text-foreground/35">
                    {preview(n)}
                  </span>
                )
              ) : (
                <Value node={n} query={query} read />
              )}
              {annotate && (
                <span className="shrink-0 text-[10px] text-foreground/40">
                  {annotate(n)}
                </span>
              )}
            </span>
          )}
          meta={shown ? undefined : sizeOf}
          actions={
            shown
              ? undefined
              : (n) => (
                  <>
                    <CopyButton label="copy path" text={() => n.id} />
                    <CopyButton label="copy value" text={() => asJson(n)} />
                  </>
                )
          }
        />
      )}
    </div>
  )
}
