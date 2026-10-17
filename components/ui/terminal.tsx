"use client"

// A phosphor terminal that draws a session script (lib/terminal-session) at a moment:
// commands type char by char, output lands whole, `@ms` pauses. It draws; something
// else moves time: inside `<Player clip={sessionTimeline(…).clip}>` it plays, inside
// a scroll stage it scrolls, with a fixed `progress` it is a still. The still renderer in the same lib draws
// the identical frame as SVG, so a CLI's media and its live demo cannot drift.
// Display-only: role="img", zero focusables.
//
// A full-screen program (an editor, `terminal-editor`) is `children` instead of a
// session: the window draws it on its screen, and hands it its palette
// (`useTerminalPalette`), so the program wears the window's phosphor.

import * as React from "react"
import { usePlayhead } from "@/components/ui/playback"
import {
  ansiColor,
  DIM_OPACITY,
  LINE_HEIGHT,
  parseSession,
  type SessionLine,
  sessionTimeline,
  spansOf,
  type TerminalPalette,
  TYPE_MS,
  terminalPalette,
} from "@/lib/terminal-session"

export type TerminalProps = TerminalWindowProps &
  (
    | ScriptProps
    | {
        /** A program that takes the whole screen (an editor, `terminal-editor`),
         *  drawn in the window in place of a session: the alternate screen a
         *  full-screen program runs in. It draws its own rows from the top-left
         *  corner, in the window's type and its palette (`useTerminalPalette`). */
        children: React.ReactNode
        session?: never
        progress?: never
        rows?: never
      }
  )

interface ScriptProps {
  /** A session script (`$ cmd` · `~ muted` · plain · `# comment` · `@ms` pause). */
  session: string
  children?: never
  /** The moment drawn, 0..1 of the session, for a still. Inside a driver (a Player)
   *  omit it: the driver provides the moment. */
  progress?: number
  /** Minimum rows the frame reserves, so a short session still gets a window that
   *  feels like one (a hero). The script's own length always wins when longer. */
  rows?: number
}

interface TerminalWindowProps {
  /** One accent drives the whole palette (default: phosphor green). */
  accent?: string
  /** The type size, any CSS length; the whole frame scales with it. A frame that
   *  must fill its box, as a still fills its image, passes a share of the box's width
   *  (`cqw`, lib/terminal-session `stillSize()`). */
  size?: string
  /** Accessible description (the terminal is one picture). */
  alt: string
  className?: string
}

/** The chrome is drawn at 13px type and kept in em, so it scales with `size`. */
const em = (px: number) => `${px / 13}em`

/** The palette a program in the window draws with (`children`): the window's own,
 *  from its accent. */
const PaletteContext = React.createContext<TerminalPalette | null>(null)

/** The palette of the terminal around: what a full-screen program inside it
 *  (`children`) draws with, so it wears the window's phosphor. Screams outside one. */
export function useTerminalPalette(): TerminalPalette {
  const palette = React.useContext(PaletteContext)
  if (!palette)
    throw new Error(
      "useTerminalPalette: no terminal around; place the program inside <Terminal>",
    )
  return palette
}

export function Terminal(props: TerminalProps) {
  if (props.session === undefined) {
    const { children, accent, size, alt, className } = props
    return (
      <TerminalWindow
        accent={accent}
        size={size}
        alt={alt}
        className={className}
      >
        {children}
      </TerminalWindow>
    )
  }
  return <TerminalScript {...props} />
}

/** The window: its bar and its dots, the screen under them in the palette. */
function TerminalWindow({
  accent,
  size = "13px",
  alt,
  className,
  children,
}: TerminalWindowProps & { children: React.ReactNode }) {
  const palette = React.useMemo(() => terminalPalette(accent), [accent])
  return (
    <div
      data-slot="terminal"
      className={className}
      role="img"
      aria-label={alt}
      style={{
        // A column: the bar, then the screen taking what is left of a window given
        // a size (a fixed frame), or as much as it holds when it sizes itself.
        display: "flex",
        flexDirection: "column",
        background: palette.bg,
        borderRadius: em(12),
        overflow: "hidden",
        // Parted from the page by a hairline in its own accent and a soft, low
        // shadow: a window resting on it, not a hole in it.
        border: `1px solid ${palette.edge}`,
        boxShadow: `0 ${em(1)} ${em(2)} rgb(0 0 0 / 0.25), 0 ${em(18)} ${em(40)} -${em(12)} rgb(0 0 0 / 0.55)`,
        fontFamily: "var(--font-mono, Menlo, Monaco, monospace)",
        fontSize: size,
        lineHeight: LINE_HEIGHT,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          data-slot="terminal-bar"
          style={{
            display: "flex",
            gap: em(8),
            alignItems: "center",
            background: palette.bar,
            padding: `${em(10)} ${em(16)}`,
          }}
        >
          {[0, 1, 2].map((d) => (
            <span
              key={d}
              style={{
                width: em(10),
                height: em(10),
                borderRadius: "50%",
                background: palette.dot,
              }}
            />
          ))}
        </div>
        <PaletteContext.Provider value={palette}>
          <div
            data-slot="terminal-screen"
            style={{ flex: 1, minHeight: 0, overflow: "hidden" }}
          >
            {children}
          </div>
        </PaletteContext.Provider>
      </div>
    </div>
  )
}

function TerminalScript({
  session,
  progress,
  accent,
  rows = 0,
  size,
  alt,
  className,
}: TerminalWindowProps & ScriptProps) {
  const timeline = React.useMemo(
    () => sessionTimeline(parseSession(session)),
    [session],
  )
  const palette = React.useMemo(() => terminalPalette(accent), [accent])
  const at = usePlayhead(progress).at * timeline.total
  let full = 0
  while (full < timeline.lines.length && (timeline.ends[full] as number) <= at)
    full++
  const current =
    full < timeline.lines.length ? timeline.lines[full] : undefined
  const start =
    full < timeline.lines.length ? (timeline.starts[full] as number) : 0
  const typedChars =
    current && current.kind === "command" && at > start
      ? Math.max(0, Math.floor((at - start) / TYPE_MS))
      : 0
  const done = full >= timeline.lines.length

  // A session taller than its window scrolls as a terminal does: the newest line
  // stays at the screen's foot and the oldest leave at its top. Measured whenever
  // the live lines or the screen change size, never per frame; a window sized by
  // the whole session never overflows, so it never moves.
  const sheet = React.useRef<HTMLDivElement>(null)
  const live = React.useRef<HTMLDivElement>(null)
  React.useLayoutEffect(() => {
    const page = sheet.current
    const layer = live.current
    const screen = page?.parentElement
    if (!page || !layer || !screen)
      throw new Error("terminal: the screen rendered without its sheet")
    const follow = () => {
      const below = Number.parseFloat(getComputedStyle(page).paddingBottom)
      const bottom =
        layer.getBoundingClientRect().bottom -
        page.getBoundingClientRect().top +
        below
      screen.scrollTop = Math.max(0, bottom - screen.clientHeight)
    }
    follow()
    const observer = new ResizeObserver(follow)
    observer.observe(layer)
    observer.observe(screen)
    return () => observer.disconnect()
  }, [])

  const prompt = (key: string, cursor: boolean) => (
    <div key={key}>
      <span style={{ color: palette.prompt }}>$ </span>
      {cursor && <span style={{ color: palette.dot }}>█</span>}
    </div>
  )

  const renderLine = (line: SessionLine, key: number, chars?: number) => {
    if (line.kind === "blank") return <div key={key}>&nbsp;</div>
    if (line.kind === "command")
      return (
        <div key={key}>
          <span style={{ color: palette.prompt }}>$ </span>
          <span style={{ color: palette.command }}>
            {chars === undefined ? line.text : line.text.slice(0, chars)}
          </span>
        </div>
      )
    return (
      <div
        key={key}
        style={{
          color: line.kind === "muted" ? palette.muted : palette.accent,
        }}
      >
        {spansOf(line.text).map((s) =>
          s.color === null && !s.bold && !s.dim ? (
            s.text
          ) : (
            <span
              key={s.at}
              style={{
                color: s.color === null ? undefined : ansiColor(s.color),
                fontWeight: s.bold ? 700 : undefined,
                opacity: s.dim ? DIM_OPACITY : undefined,
              }}
            >
              {s.text}
            </span>
          ),
        )}
      </div>
    )
  }

  return (
    <TerminalWindow accent={accent} size={size} alt={alt} className={className}>
      {/* The box is sized by the FINISHED session (an invisible full copy in the
          same cell), so playback never grows the page: text streams into a fixed
          frame. Both layers share width, so wrapping is identical. */}
      <div
        ref={sheet}
        style={{
          display: "grid",
          padding: `${em(20)} ${em(24)} ${em(24)}`,
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
        }}
      >
        <div
          style={{
            gridArea: "1 / 1",
            visibility: "hidden",
            minHeight: `${rows * LINE_HEIGHT}em`,
          }}
        >
          {timeline.lines.map((l, i) => renderLine(l, i))}
          {prompt("end", true)}
        </div>
        <div ref={live} style={{ gridArea: "1 / 1" }}>
          {timeline.lines.slice(0, full).map((l, i) => renderLine(l, i))}
          {current &&
            current.kind === "command" &&
            typedChars > 0 &&
            renderLine(current, full, typedChars)}
          {prompt("live", done)}
        </div>
      </div>
    </TerminalWindow>
  )
}
