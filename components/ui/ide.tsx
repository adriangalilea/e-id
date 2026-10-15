"use client"

// A CODE EDITOR WINDOW, Visual Studio Code's: the title bar with the window buttons
// and the command centre, the activity bar, the explorer's tree of the project, the
// tabs, the editor with its line numbers, the caret and the code highlighted, and the
// status bar. Display-only: a depiction, one picture to assistive tech, zero
// focusables.
//
// `Ide` draws one instant by hand (a file open, the caret somewhere). `IdeSession`
// plays an edit on the playhead (lib/code-session: open a file, type at a place, save),
// the way `BrowserSession` plays a visit and `Terminal` a session, so it can be
// recorded alone or set on a Mac's desktop beside the browser that shows the result.
//
// The code is coloured by `code`'s highlighter (Shiki, lib/code-tokens), read in the
// browser: plain at once, coloured once it has loaded. While a file is typed each
// character wears the colour it has in the finished file, read once, so nothing is
// highlighted again as keys land.
//
// THE LOOK is VS Code's default themes, Dark Modern and Light Modern, picked by the
// scheme it stands in (the page's, or its own `scheme`), and their token colours
// (Dark+ and Light+). Every length is VS Code's own on a Mac, in CSS px: a window
// laid in `macos`'s stage keeps its proportions with the rest of the desktop. Plain
// only: VS Code draws no glass of its own, and a face it does not have would be ours.

import {
  Blocks,
  Bug,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  CircleX,
  CodeXml,
  File,
  Files,
  GitBranch,
  Hash,
  Search,
  Settings,
  TriangleAlert,
  X,
} from "lucide-react"
import * as React from "react"
import { cn } from "@/lib/utils"
import {
  type CodeFile,
  type CodeFrame,
  type CodeStep,
  codeFrameAt,
  codeTimeline,
  placeOf,
} from "@/lib/code-session"
import {
  type CodeColours,
  type CodeThemes,
  langOf,
  linesOf,
  runsOf,
} from "@/lib/code-tokens"
import { type Scheme, useSurfaceScheme } from "@/components/ui/material"
import { schemeOf } from "@/components/ui/material-glass"
import { usePlayhead } from "@/components/ui/playback"
import { useCodeColours } from "@/components/ui/use-code-colours"
import "./ide.css"

/** VS Code's default themes' token colours: Dark Modern and Light Modern are built
 *  on Dark+ and Light+. */
export const IDE_THEMES: CodeThemes = { light: "light-plus", dark: "dark-plus" }

/** The editor's face on a Mac, as VS Code ships it. */
const MONO = "Menlo, Monaco, 'Courier New', monospace"
/** The OS's face, which VS Code's chrome speaks in. */
const SYSTEM = "-apple-system, BlinkMacSystemFont, system-ui, sans-serif"
/** VS Code's editor type on a Mac: 12 px on an 18 px line. */
const LINE_PX = 18

// The two themes' colours, the light half bare and the dark under `scheme-dark:`
// (the scheme the window stands in). One constant per surface.
const BORDER = "border-[#e5e5e5] scheme-dark:border-[#2b2b2b]"
const CHROME = cn(
  "bg-[#f8f8f8] text-[#3b3b3b] scheme-dark:bg-[#181818] scheme-dark:text-[#cccccc]",
  BORDER,
)
const EDITOR =
  "bg-white text-[#3b3b3b] scheme-dark:bg-[#1f1f1f] scheme-dark:text-[#cccccc]"
/** A row's selection where the editor holds the focus (the explorer's file). */
const SELECTED = "bg-[#e4e6f1] scheme-dark:bg-[#37373d]"
/** The accent: the active tab's top edge, the activity bar's, the remote corner. */
const ACCENT = "bg-[#005fb8] scheme-dark:bg-[#0078d4]"
const ICON_ON = "text-[#1f1f1f] scheme-dark:text-[#d7d7d7]"
const ICON_OFF = "text-[#616161] scheme-dark:text-[#868686]"

/** A file's glyph, as VS Code's Seti icons colour them by kind. Solid colours, so
 *  a stroke crossing itself never darkens. */
const FILE_GLYPHS: Record<
  string,
  { Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; colour: string }
> = {
  html: { Icon: CodeXml, colour: "#e37933" },
  css: { Icon: Hash, colour: "#519aba" },
  md: { Icon: File, colour: "#519aba" },
}
/** How the status bar names a language. */
const LANG_NAMES: Record<string, string> = {
  html: "HTML",
  css: "CSS",
  js: "JavaScript",
  mjs: "JavaScript",
  ts: "TypeScript",
  tsx: "TypeScript JSX",
  jsx: "JavaScript JSX",
  json: "JSON",
  md: "Markdown",
  py: "Python",
  rs: "Rust",
  go: "Go",
  sh: "Shell Script",
  text: "Plain Text",
}

const nameOf = (path: string) => path.split("/").at(-1) as string

function FileGlyph({ path }: { path: string }) {
  const ext = langOf(path)
  const glyph = FILE_GLYPHS[ext]
  if (!glyph)
    return (
      <span
        data-slot="ide-file-glyph"
        className="w-4 shrink-0 text-center font-bold text-[8.5px] leading-none tracking-tight"
        style={{
          color:
            ext === "js" || ext === "json" || ext === "mjs"
              ? "#cbcb41"
              : "#519aba",
          fontFamily: SYSTEM,
        }}
      >
        {ext === "json" ? "{}" : ext.slice(0, 3).toUpperCase()}
      </span>
    )
  return (
    <glyph.Icon
      data-slot="ide-file-glyph"
      aria-hidden
      className="size-4 shrink-0"
      style={{ color: glyph.colour }}
      strokeWidth={2.25}
    />
  )
}

export interface IdeProps
  extends Omit<React.ComponentProps<"div">, "children"> {
  /** The project's name: the command centre's and the explorer's. */
  project: string
  /** The project's files (`/` between folders): the explorer's tree, and what the
   *  tabs hold. */
  files: CodeFile[]
  /** The file in front, a path of `files`. Absent: the empty editor. */
  active?: string
  /** The tabs, in order. Default: the file in front, alone. */
  open?: string[]
  /** Files with unsaved changes: their tabs show the dot. */
  dirty?: string[]
  /** The caret, in the file in front (both from 1). Absent: the file's start. */
  caret?: { line: number; column: number }
  /** Lines of the file in front to mark, as `code` spells them: `"2"` or
   *  `"1,4-6"`, from 1. What a still points at (the lines a reader pastes). */
  highlight?: string
  /** The caret blinks, as VS Code's does in a focused editor: for a still, where
   *  a caret held on reads as a stuck frame. Off while an edit plays (VS Code
   *  holds it on as keys land). */
  blink?: boolean
  /** The explorer beside the editor. Off, the editor takes the room (a narrow
   *  window); the activity bar stays. */
  explorer?: boolean
  scheme?: Scheme
}

/** VS Code at one instant: a file open, the caret where `caret` says. */
export function Ide({
  project,
  files,
  active,
  open,
  dirty = [],
  caret,
  highlight,
  blink = false,
  explorer = true,
  ...rest
}: IdeProps) {
  const file = active ? files.find((f) => f.path === active) : undefined
  if (active && !file)
    throw new Error(`ide: active ${active} is not one of files`)
  const text = file?.text ?? ""
  const marked = highlight ? linesOf(highlight) : undefined
  const count = text.split("\n").length
  for (const n of marked ?? [])
    if (n < 1 || n > count)
      throw new Error(`ide: highlight ${n} is outside ${active ?? "no file"}`)
  let offset = 0
  if (caret) {
    const lines = text.split("\n")
    const line = lines[caret.line - 1]
    if (
      line === undefined ||
      caret.column < 1 ||
      caret.column > line.length + 1
    )
      throw new Error(
        `ide: caret ${caret.line}:${caret.column} is outside ${active}`,
      )
    offset =
      lines.slice(0, caret.line - 1).reduce((n, l) => n + l.length + 1, 0) +
      caret.column -
      1
  }
  return (
    <IdeWindow
      project={project}
      paths={files.map((f) => f.path)}
      open={open ?? (active ? [active] : [])}
      active={active ?? null}
      text={text}
      source={text}
      origin={undefined}
      caret={offset}
      marked={marked}
      blink={blink}
      dirty={dirty}
      explorer={explorer}
      {...rest}
    />
  )
}

export interface IdeSessionProps
  extends Omit<
    IdeProps,
    | "active"
    | "open"
    | "dirty"
    | "caret"
    | "highlight"
    | "blink"
    | "role"
    | "aria-label"
  > {
  steps: CodeStep[]
  /** The instant drawn, 0..1 of the edit, for a still. Inside a driver (a Player)
   *  omit it: the driver provides it. */
  progress?: number
  /** The clock's length when the edit shares it with something longer (a browser
   *  that loads the result after the save), ms: the last frame holds to it. The
   *  driver's clip is then that longer one's. */
  duration?: number
  /** Accessible description (a recording is one picture). */
  alt: string
}

/** An edit played on the playhead: the frame at the instant (lib/code-session)
 *  drawn as VS Code. Its clip, for the driver: `codeTimeline(files, steps).clip`. */
export function IdeSession({
  project,
  files,
  steps,
  progress,
  duration,
  alt,
  explorer = true,
  ...rest
}: IdeSessionProps) {
  const timeline = React.useMemo(
    () => codeTimeline(files, steps, duration),
    [files, steps, duration],
  )
  const f: CodeFrame = codeFrameAt(
    timeline,
    usePlayhead(progress).at * timeline.total,
  )
  return (
    <IdeWindow
      project={project}
      paths={files.map((x) => x.path)}
      open={f.open}
      active={f.active}
      text={f.text}
      source={f.active ? (timeline.final[f.active] as string) : ""}
      origin={f.origin}
      caret={f.caret}
      marked={undefined}
      blink={false}
      dirty={f.dirty}
      explorer={explorer}
      role="img"
      aria-label={alt}
      {...rest}
    />
  )
}

interface WindowProps extends Omit<React.ComponentProps<"div">, "children"> {
  project: string
  paths: string[]
  open: string[]
  active: string | null
  /** The front file's text as drawn. */
  text: string
  /** The text its colours are read from (the file as it will be). */
  source: string
  /** Each drawn character's offset in `source`; absent, its own. */
  origin: number[] | undefined
  caret: number
  /** The lines marked, from 1. */
  marked: Set<number> | undefined
  blink: boolean
  dirty: string[]
  explorer: boolean
  scheme?: Scheme
}

function IdeWindow({
  project,
  paths,
  open,
  active,
  text,
  source,
  origin,
  caret,
  marked,
  blink,
  dirty,
  explorer,
  scheme,
  className,
  style,
  ref,
  ...props
}: WindowProps) {
  const [worn, root] = useSurfaceScheme<HTMLDivElement>(scheme, ref)
  const lang = active ? langOf(active) : "text"
  const colours = useCodeColours(source, lang, IDE_THEMES)
  const place = placeOf(text, caret)
  return (
    <div
      ref={root}
      data-slot="ide"
      className={cn(
        "relative isolate flex aspect-[16/10] w-full select-none flex-col overflow-hidden rounded-[16px] text-[13px]",
        "shadow-[0_0_0_0.5px_rgb(0_0_0/0.22),0_24px_60px_-16px_rgb(0_0_0/0.45)] scheme-dark:shadow-[0_0_0_0.5px_rgb(255_255_255/0.16)]",
        EDITOR,
        schemeOf(worn),
        className,
      )}
      style={{ fontFamily: SYSTEM, ...style }}
      {...props}
    >
      <TitleBar project={project} />
      <div className="flex min-h-0 flex-1">
        <ActivityBar />
        {explorer && (
          <Explorer project={project} paths={paths} active={active} />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          {active ? (
            <>
              <Tabs open={open} active={active} dirty={dirty} />
              <Breadcrumbs path={active} />
              <Editor
                text={text}
                origin={origin}
                colours={colours}
                caret={place}
                marked={marked}
                blink={blink}
              />
            </>
          ) : (
            <Empty />
          )}
        </div>
      </div>
      <StatusBar
        place={active ? place : null}
        lang={LANG_NAMES[lang] ?? lang.toUpperCase()}
      />
    </div>
  )
}

/** The three window buttons, in their own colours (active window). */
function WindowButtons() {
  return (
    <span data-slot="ide-window-buttons" className="flex shrink-0 gap-2">
      {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
        <span
          key={c}
          className="size-3 rounded-full shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.18)]"
          style={{ background: c }}
        />
      ))}
    </span>
  )
}

function TitleBar({ project }: { project: string }) {
  return (
    <div
      data-slot="ide-title-bar"
      className={cn(
        "grid h-[35px] shrink-0 grid-cols-[1fr_minmax(0,320px)_1fr] items-center gap-2 border-b px-3",
        CHROME,
      )}
    >
      <div className="flex items-center gap-4">
        <WindowButtons />
        <span className={cn("flex items-center gap-1", ICON_OFF)}>
          <ChevronLeft aria-hidden className="size-4" />
          <ChevronRight aria-hidden className="size-4" />
        </span>
      </div>
      <div
        data-slot="ide-command-centre"
        className={cn(
          "flex h-[22px] min-w-0 items-center justify-center gap-1.5 rounded-[6px] border bg-[#ffffff] px-2 text-[12px] scheme-dark:bg-[#222222]",
          BORDER,
        )}
      >
        <Search aria-hidden className={cn("size-3.5 shrink-0", ICON_OFF)} />
        <span className="truncate">{project}</span>
      </div>
      <div />
    </div>
  )
}

function ActivityBar() {
  const item = "flex h-12 w-12 items-center justify-center [&_svg]:size-6"
  return (
    <div
      data-slot="ide-activity-bar"
      className={cn("flex w-12 shrink-0 flex-col border-r", CHROME)}
    >
      <span
        className={cn(item, ICON_ON, "relative")}
        data-slot="ide-activity-active"
      >
        <span className={cn("absolute inset-y-0 left-0 w-[2px]", ACCENT)} />
        <Files aria-hidden strokeWidth={1.5} />
      </span>
      {[Search, GitBranch, Bug, Blocks].map((Icon) => (
        <span key={Icon.displayName} className={cn(item, ICON_OFF)}>
          <Icon aria-hidden strokeWidth={1.5} />
        </span>
      ))}
      <span className="flex-1" />
      {[CircleUserRound, Settings].map((Icon) => (
        <span key={Icon.displayName} className={cn(item, ICON_OFF)}>
          <Icon aria-hidden strokeWidth={1.5} />
        </span>
      ))}
    </div>
  )
}

/** A node of the explorer's tree: a folder and what it holds, or a file. */
interface TreeNode {
  name: string
  path: string
  children: TreeNode[] | null
}

/** The paths as VS Code's explorer lists them: folders first, then files, each by
 *  name. */
function treeOf(paths: string[]): TreeNode[] {
  const root: TreeNode[] = []
  for (const path of paths) {
    const parts = path.split("/")
    let level = root
    for (const [i, name] of parts.entries()) {
      const last = i === parts.length - 1
      let node = level.find((n) => n.name === name)
      if (!node) {
        node = {
          name,
          path: parts.slice(0, i + 1).join("/"),
          children: last ? null : [],
        }
        level.push(node)
      }
      if (!last) {
        if (!node.children)
          throw new Error(`ide: ${node.path} is both a file and a folder`)
        level = node.children
      }
    }
  }
  const sort = (nodes: TreeNode[]): TreeNode[] =>
    nodes
      .map((n) => (n.children ? { ...n, children: sort(n.children) } : n))
      .sort(
        (a, b) =>
          Number(!a.children) - Number(!b.children) ||
          a.name.localeCompare(b.name),
      )
  return sort(root)
}

function Explorer({
  project,
  paths,
  active,
}: {
  project: string
  paths: string[]
  active: string | null
}) {
  const tree = React.useMemo(() => treeOf(paths), [paths])
  const rows: React.ReactNode[] = []
  const walk = (nodes: TreeNode[], depth: number) => {
    for (const n of nodes) {
      rows.push(
        <div
          key={n.path}
          data-slot="ide-explorer-row"
          className={cn(
            "flex h-[22px] items-center gap-1.5 pr-2 whitespace-nowrap",
            n.path === active && SELECTED,
          )}
          style={{ paddingLeft: 8 + depth * 8 }}
        >
          {n.children ? (
            <ChevronDown aria-hidden className="size-4 shrink-0" />
          ) : (
            <span className="w-4 shrink-0" />
          )}
          {!n.children && <FileGlyph path={n.path} />}
          <span className="truncate">{n.name}</span>
        </div>,
      )
      if (n.children) walk(n.children, depth + 1)
    }
  }
  walk(tree, 0)
  return (
    <div
      data-slot="ide-explorer"
      className={cn("flex w-[200px] shrink-0 flex-col border-r", CHROME)}
    >
      <div className="flex h-[35px] shrink-0 items-center px-5 text-[11px] tracking-[0.02em]">
        EXPLORER
      </div>
      <div className="flex h-[22px] shrink-0 items-center gap-0.5 px-1 font-bold text-[11px]">
        <ChevronDown aria-hidden className="size-4 shrink-0" />
        <span className="truncate">{project.toUpperCase()}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{rows}</div>
    </div>
  )
}

function Tabs({
  open,
  active,
  dirty,
}: {
  open: string[]
  active: string
  dirty: string[]
}) {
  return (
    <div
      data-slot="ide-tabs"
      className={cn("flex h-[35px] shrink-0 border-b", CHROME)}
    >
      {open.map((path) => {
        const front = path === active
        return (
          <div
            key={path}
            data-slot="ide-tab"
            data-active={front || undefined}
            className={cn(
              "relative -mb-px flex min-w-0 items-center gap-1.5 border-r pr-2 pl-3",
              BORDER,
              front
                ? "bg-white text-[#3b3b3b] scheme-dark:bg-[#1f1f1f] scheme-dark:text-white"
                : "text-[#868686] scheme-dark:text-[#9d9d9d]",
            )}
          >
            {front && (
              <span className={cn("absolute inset-x-0 top-0 h-px", ACCENT)} />
            )}
            <FileGlyph path={path} />
            <span className="truncate">{nameOf(path)}</span>
            <span className="flex size-5 shrink-0 items-center justify-center">
              {dirty.includes(path) ? (
                <span
                  data-slot="ide-tab-dirty"
                  className="size-2 rounded-full bg-current"
                />
              ) : front ? (
                <X aria-hidden className="size-4" />
              ) : null}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function Breadcrumbs({ path }: { path: string }) {
  const parts = path.split("/")
  return (
    <div
      data-slot="ide-breadcrumbs"
      className="flex h-[22px] shrink-0 items-center gap-1 px-4 text-[12px] text-[#616161] scheme-dark:text-[#a9a9a9]"
    >
      {parts.map((p, i) => (
        <React.Fragment key={parts.slice(0, i + 1).join("/")}>
          {i > 0 && <ChevronRight aria-hidden className="size-3.5" />}
          {i === parts.length - 1 && <FileGlyph path={path} />}
          <span>{p}</span>
        </React.Fragment>
      ))}
    </div>
  )
}

/** A marked line, as `code` marks one (code.css `.line.highlighted`): a wash of the
 *  ink, and a bar of it at the line's left edge. */
const MARKED =
  "bg-[color-mix(in_oklab,var(--brand,var(--foreground))_10%,transparent)] shadow-[inset_2px_0_0_color-mix(in_oklab,var(--brand,var(--foreground))_55%,transparent)]"

/** The editor: the gutter's numbers, each line's runs in their ink, the current
 *  line's frame and the caret. It keeps the caret's line in view as VS Code does,
 *  scrolling by whole lines once the caret would pass the foot. */
function Editor({
  text,
  origin,
  colours,
  caret,
  marked,
  blink,
}: {
  text: string
  origin: number[] | undefined
  colours: CodeColours | null
  caret: { line: number; column: number }
  marked: Set<number> | undefined
  blink: boolean
}) {
  const lines = React.useMemo(
    () => runsOf(text, colours, origin),
    [text, colours, origin],
  )
  const box = React.useRef<HTMLDivElement>(null)
  // How many lines the pane shows: the pane's own height, read from it, the fact
  // the scroll is decided by.
  const [rows, setRows] = React.useState(Number.POSITIVE_INFINITY)
  React.useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const read = () => setRows(Math.floor(el.clientHeight / LINE_PX))
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const top = Math.max(0, caret.line - rows + 2)
  const digits = String(lines.length).length
  return (
    <div
      ref={box}
      data-slot="ide-editor"
      className="relative min-h-0 flex-1 overflow-hidden text-[12px] leading-(--ag-ide-line)"
      style={
        {
          fontFamily: MONO,
          "--ag-ide-line": `${LINE_PX}px`,
          "--ag-ide-gutter": `calc(${Math.max(digits, 2)}ch + 46px)`,
        } as React.CSSProperties
      }
    >
      <div style={{ transform: `translateY(${-top * LINE_PX}px)` }}>
        {lines.map((runs, i) => {
          const n = i + 1
          const here = n === caret.line
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: a line is its number
              key={i}
              data-slot="ide-line"
              data-highlighted={marked?.has(n) || undefined}
              className={cn("flex h-(--ag-ide-line)", marked?.has(n) && MARKED)}
            >
              <span
                data-slot="ide-line-number"
                className={cn(
                  "w-(--ag-ide-gutter) shrink-0 pr-[26px] text-right",
                  here
                    ? "text-[#171184] scheme-dark:text-[#cccccc]"
                    : "text-[#6e7681]",
                )}
              >
                {n}
              </span>
              <span
                className={cn(
                  "relative min-w-0 flex-1 whitespace-pre",
                  here &&
                    "shadow-[inset_0_0_0_2px_#eeeeee] scheme-dark:shadow-[inset_0_0_0_2px_#282828]",
                )}
              >
                {runs.map((r, k) => (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: runs are positional
                    key={k}
                    className={
                      r.ink
                        ? "text-(--ag-ide-ink) scheme-dark:text-(--ag-ide-ink-dark)"
                        : undefined
                    }
                    style={
                      r.ink
                        ? ({
                            "--ag-ide-ink": r.ink.light,
                            "--ag-ide-ink-dark": r.ink.dark,
                            fontStyle: r.ink.italic ? "italic" : undefined,
                            fontWeight: r.ink.bold ? 700 : undefined,
                          } as React.CSSProperties)
                        : undefined
                    }
                  >
                    {r.text}
                  </span>
                ))}
                {here && (
                  <span
                    data-slot="ide-caret"
                    className={cn(
                      "absolute top-0 h-full w-[2px] bg-black scheme-dark:bg-[#aeafad]",
                      blink &&
                        "animate-[ag-ide-blink_1.06s_infinite] motion-reduce:animate-none",
                    )}
                    style={{ left: `${caret.column - 1}ch` }}
                  />
                )}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** No file open: VS Code's empty editor, its shortcuts. */
function Empty() {
  return (
    <div
      data-slot="ide-empty"
      className="flex flex-1 flex-col items-center justify-center gap-2 text-[12px] text-[#868686]"
    >
      {[
        ["Show All Commands", "⇧ ⌘ P"],
        ["Go to File", "⌘ P"],
        ["Find in Files", "⇧ ⌘ F"],
      ].map(([what, keys]) => (
        <div key={what} className="grid w-56 grid-cols-2 gap-4">
          <span className="text-right">{what}</span>
          <span className="tracking-widest">{keys}</span>
        </div>
      ))}
    </div>
  )
}

function StatusBar({
  place,
  lang,
}: {
  place: { line: number; column: number } | null
  lang: string
}) {
  return (
    <div
      data-slot="ide-status-bar"
      className={cn(
        "flex h-[22px] shrink-0 items-center gap-3 border-t pr-3 text-[12px] [&_svg]:size-3.5",
        CHROME,
      )}
    >
      <span
        data-slot="ide-remote"
        className={cn(
          "flex h-full w-9 items-center justify-center text-white",
          ACCENT,
        )}
      >
        <ChevronRight aria-hidden className="-mr-1" strokeWidth={2.5} />
        <ChevronLeft aria-hidden className="-ml-1" strokeWidth={2.5} />
      </span>
      <span className="flex items-center gap-1">
        <GitBranch aria-hidden />
        main
      </span>
      <span className="flex items-center gap-1">
        <CircleX aria-hidden /> 0 <TriangleAlert aria-hidden /> 0
      </span>
      <span className="flex-1" />
      {place && (
        <>
          <span>
            Ln {place.line}, Col {place.column}
          </span>
          <span>Spaces: 2</span>
          <span>UTF-8</span>
          <span>LF</span>
          <span>{lang}</span>
        </>
      )}
    </div>
  )
}
