"use client"

// The one pinned-stage primitive. A tall track, a sticky stage, and a number:
// --stage-p, 0..1 over the sticky dwell, driven by CSS (animation-timeline: view())
// so scrolling never touches React. `acts` divides the travel into checkpoints; the
// active act is the only React state, and it changes once per checkpoint, never per
// frame. <Act> exposes --act-p (0..1 within its own window) and --act-on (1 while on
// stage) as CSS, for opacity, transform, clip. State-shaped consumers (mount a phone
// when its act begins) read useAct().
// Renderers needing continuous JS progress opt into useScrollStageTimeline from
// scroll-stage-timeline. Its weighted beats replace these equal checkpoints.
//
// Desktop pinning is the default. `pin="all"` also enables phone-sized scenes;
// short landscape windows and reduced motion use the natural-height alternative.

import * as React from "react"
import "./scroll-stage.css"

const StageContext = React.createContext<{
  acts: number
  active: number
  seek: (index: number) => boolean
  track: React.RefObject<HTMLElement | null>
  pinnedQuery: string
} | null>(null)

/** Navigate the pinned story using the same act boundaries as useAct().
 * Returns false in stacked layouts, where the page provides its own navigation. */
export function useScrollStage() {
  const ctx = React.useContext(StageContext)
  if (!ctx) throw new Error("useScrollStage() outside <ScrollStage>")
  return ctx
}

/** The act on stage (0-based). Only valid inside <ScrollStage>. */
export function useAct(): number {
  const ctx = React.useContext(StageContext)
  if (!ctx) throw new Error("useAct() outside <ScrollStage>")
  return ctx.active
}

export interface ScrollStageProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /** Checkpoints along the track. Act i is on stage past i/acts of the travel. */
  acts: number
  /** Scroll per act, a CSS length. Default 100svh. */
  pace?: string
  /** Extra travel after the last act, so it dwells. Default 40svh. */
  tail?: string
  /** Enable phone-sized scenes too; windows shorter than 36rem remain unpinned. */
  pin?: "desktop" | "all"
  /** Fires once per checkpoint change, never per frame. */
  onAct?: (act: number) => void
  /** The alternative layout below lg / under reduced motion (the acts stacked). */
  stacked?: React.ReactNode
  /** The stage: what stays pinned. */
  children: React.ReactNode
  as?: "section" | "article" | "div"
}

const PINNED = "(min-width: 64rem) and (prefers-reduced-motion: no-preference)"

export function ScrollStage({
  acts,
  pace,
  tail,
  pin = "desktop",
  onAct,
  stacked,
  children,
  as = "section",
  className,
  style,
  ...rest
}: ScrollStageProps) {
  if (!Number.isInteger(acts) || acts < 1)
    throw new Error(`ScrollStage: acts must be a positive integer, got ${acts}`)
  const track = React.useRef<HTMLElement>(null)
  const pinnedQuery =
    pin === "all"
      ? "(min-height: 36rem) and (prefers-reduced-motion: no-preference)"
      : PINNED
  const paceEl = React.useRef<HTMLDivElement>(null)
  const [active, setActive] = React.useState(0)
  const [engine, setEngine] = React.useState<"css" | "js">("css")
  // The server cannot know the viewport, so it renders the stage AND the stacked
  // alternative and CSS shows one. Once mounted, only the live one stays mounted: a
  // hidden stage's phones, observers and timers cost as much as the visible one's.
  const [layout, setLayout] = React.useState<"both" | "pinned" | "stacked">(
    "both",
  )
  const onActRef = React.useRef(onAct)
  onActRef.current = onAct

  React.useEffect(() => {
    const el = track.current
    const paceNode = paceEl.current
    if (!el || !paceNode) return
    const css = CSS.supports("animation-timeline: view()")
    setEngine(css ? "css" : "js")
    const pinned = window.matchMedia(pinnedQuery)
    let frame = 0
    let current = -1

    const sample = () => {
      frame = 0
      const rect = el.getBoundingClientRect()
      const pacePx = paceNode.offsetHeight
      let act: number
      if (!pinned.matches || pacePx === 0) {
        // Unpinned, or a collapsed track (pace 0): the completed state.
        act = acts - 1
        if (!css) el.style.removeProperty("--stage-p")
      } else {
        // ONE RULE for JS and CSS: act i is on stage past i/acts of the TRAVEL (the
        // track less one viewport), the same number `--stage-p` reports. Counting
        // paces here while the CSS counted travel lit an act's words before the stage
        // switched to it whenever a tail lengthened the track.
        const travel = rect.height - window.innerHeight
        const p = travel > 0 ? -rect.top / travel : rect.top < 0 ? 1 : 0
        const clamped = Math.min(1, Math.max(0, p))
        act = Math.min(acts - 1, Math.max(0, Math.floor(clamped * acts)))
        if (!css) el.style.setProperty("--stage-p", String(clamped))
      }
      if (act !== current) {
        current = act
        setActive(act)
        onActRef.current?.(act)
      }
    }
    const queue = () => {
      if (frame === 0) frame = requestAnimationFrame(sample)
    }
    let listening = false
    const listen = (on: boolean) => {
      if (on === listening) return
      listening = on
      if (on) {
        window.addEventListener("scroll", queue, { passive: true })
        window.addEventListener("resize", queue, { passive: true })
      } else {
        window.removeEventListener("scroll", queue)
        window.removeEventListener("resize", queue)
      }
    }
    // The listener exists only while the track is on screen.
    const io = new IntersectionObserver(([entry]) => {
      listen(entry?.isIntersecting ?? false)
      queue()
    })
    io.observe(el)
    pinned.addEventListener("change", queue)
    const settle = () => setLayout(pinned.matches ? "pinned" : "stacked")
    pinned.addEventListener("change", settle)
    settle()
    sample()
    return () => {
      io.disconnect()
      listen(false)
      pinned.removeEventListener("change", queue)
      pinned.removeEventListener("change", settle)
      cancelAnimationFrame(frame)
    }
  }, [acts, pinnedQuery])

  const seek = React.useCallback(
    (index: number) => {
      if (!Number.isInteger(index) || index < 0 || index >= acts)
        throw new Error(`ScrollStage: act ${index} outside 0..${acts - 1}`)
      const el = track.current
      if (!el || !window.matchMedia(pinnedQuery).matches) return false
      const rect = el.getBoundingClientRect()
      const travel = Math.max(0, rect.height - window.innerHeight)
      // Aim inside the act, not at a rounding-sensitive boundary. rect + scrollY
      // works in positioned wrappers where offsetTop is not a document coordinate.
      window.scrollTo({
        top: window.scrollY + rect.top + (travel * (index + 0.5)) / acts,
        behavior: "smooth",
      })
      return true
    },
    [acts, pinnedQuery],
  )
  const ctx = React.useMemo(
    () => ({ acts, active, seek, track, pinnedQuery }),
    [acts, active, seek, pinnedQuery],
  )
  return (
    <StageContext.Provider value={ctx}>
      {React.createElement(
        as,
        {
          ref: track,
          className: `ag-stage-track${className ? ` ${className}` : ""}`,
          "data-engine": engine,
          "data-pin": pin,
          "data-stacked": stacked !== undefined ? "" : undefined,
          style: {
            "--acts": acts,
            ...(pace && { "--pace": pace }),
            ...(tail && { "--tail": tail }),
            ...style,
          } as React.CSSProperties,
          ...rest,
        },
        <div ref={paceEl} className="ag-stage-pace" aria-hidden />,
        (stacked === undefined || layout !== "stacked") && (
          <div className="ag-stage">{children}</div>
        ),
        stacked !== undefined && layout !== "pinned" && (
          <div className="ag-stage-stacked">{stacked}</div>
        ),
      )}
    </StageContext.Provider>
  )
}

export interface ActProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0-based checkpoint this element belongs to. */
  index: number
  as?: "div" | "section" | "article" | "figure"
}

/** A stage element bound to one act. Exposes two CSS numbers to its subtree:
 *  --act-p (0..1 across the act's own window of travel) and --act-on (1 while the act
 *  is on stage, 0 otherwise; the last act stays on through the tail). Drive opacity,
 *  transform, clip-path from them; do not read them in JS. */
export function Act({
  index,
  as = "div",
  className,
  style,
  ...rest
}: ActProps) {
  const ctx = React.useContext(StageContext)
  if (!ctx) throw new Error("<Act> outside <ScrollStage>")
  if (index < 0 || index >= ctx.acts)
    throw new Error(`<Act index={${index}}> outside 0..${ctx.acts - 1}`)
  const at = `(var(--stage-p) * var(--acts) - ${index})`
  const first = index === 0
  const last = index === ctx.acts - 1
  // The first act is on from the top of the track (it has no act before it to hand
  // over from), the last stays on through the tail; the ones between hold one window.
  const on =
    first && last
      ? "1"
      : first
        ? `clamp(0, (1 - ${at}) * 1000, 1)`
        : last
          ? `clamp(0, ${at} * 1000, 1)`
          : `min(clamp(0, ${at} * 1000, 1), clamp(0, (1 - ${at}) * 1000, 1))`
  return React.createElement(as, {
    className,
    "data-act": index,
    "data-on": ctx.active === index ? "" : undefined,
    style: {
      "--act-p": `clamp(0, ${at}, 1)`,
      "--act-on": on,
      ...style,
    } as React.CSSProperties,
    ...rest,
  })
}
