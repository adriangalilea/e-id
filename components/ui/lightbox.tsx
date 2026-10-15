"use client"

// The lightbox: one interruptible spring over a View, a three-layer track, a fly
// that passes under the page's chrome. The trigger element IS the source rect; its
// `src` is the page's pixels and paints frame one, `full` cross-fades in on decode.
// Every move of the pose is a FLIGHT: the spring is sampled ahead (sampleFlight) and
// played by the compositor as Web Animations keyframes on the active layer's
// transform, its crop window and corner, so a main thread busy decoding never drops
// a frame of the image. Per frame the engine writes only --lb-p on its three readers (scrim,
// chrome, active layer); chrome reads --lb-p in CSS. A hand landing mid-flight reads
// the pose and velocity off the same table at the animation's currentTime, cancels
// it and takes over without a jump. React changes only at checkpoints (open, settle,
// step, release). Base UI Dialog supplies portal,
// inert, focus trap, focus return and the scroll lock (its gutter included: no token
// rule duplicates it); every key and pointer verb dispatches an id from
// lightbox-actions.
//
// Keys are captured on the dialog root and stopped, so a host page owning arrows is
// silent while open. The rail is the one boundary: keys pressed inside `renderRail`
// belong to the consumer's widgets and BUBBLE TO THE HOST, the only way React
// handlers stay alive inside a portal whose React root sits at the same node as the
// host's document listeners. A host that owns arrows guards its handler on
// `useLightbox().id === null`. Escape walks the ladder from anywhere.

import { Dialog } from "@base-ui/react/dialog"
import { useRender } from "@base-ui/react/use-render"
import * as React from "react"
import { Copy } from "@/components/ui/copy"
import { EdgeArrow } from "@/components/ui/edge-arrows"
import { ownedHere, registerKeys } from "@/components/ui/key-router"
import {
  INSET_Y,
  measureBand,
  RAIL_H,
  RAIL_W,
  rectOf,
  sameBand,
} from "@/components/ui/lightbox-viewport"
import { createSlideTrack } from "@/components/ui/slide-track"
import { ThumbStrip, type ThumbStripItem } from "@/components/ui/thumb-strip"
import { Video } from "@/components/ui/video"
import {
  type Action,
  type ActionId,
  type Layer as ActionLayer,
  action,
  escRung,
  KEYS,
  keycap,
  keyOf,
  keyshortcuts,
  resolve,
  sheet as sheetOf,
} from "@/lib/lightbox-actions"
import {
  type Flight as MotionFlight,
  planFlight,
  readFlight,
} from "@/lib/lightbox-flight"
import {
  type Gesture,
  type GestureCtx,
  type GestureEffect,
  type GestureRelease,
  gestureDown,
  gestureMove,
  gestureUp,
  midOf,
  type PointerInput,
  tapIntent,
} from "@/lib/lightbox-gesture"
import { applyHold, type HoldVerb, holdDelta } from "@/lib/lightbox-hold"
import {
  assert,
  assertSize,
  type Band,
  COAST,
  clampPan,
  EXIT_HANDOFF,
  FIT,
  fit,
  GONE,
  HAND,
  MACHINE,
  neighbours,
  type Point,
  type Pose,
  project,
  type Sample,
  type Size,
  type SourceView,
  STILL,
  sharpScale,
  sourceView,
  type Tunings,
  type View,
  WHEEL_GUARD,
  wheelPx,
  zoomAt,
  zoomMax as zoomCeiling,
} from "@/lib/lightbox-motion"
import {
  type WheelCtx,
  type WheelSession,
  wheelAxisOf,
  wheelIsTrackable,
  wheelRelease,
  wheelTick,
} from "@/lib/lightbox-wheel"
import { phaseFeed, phaseStart } from "@/lib/lightbox-wheel-phase"
import "./lightbox.css"

export type Source = {
  /** The rendition the page painted, cache-hot: frame one. */
  src: string
  /** The original; decoded in parallel, cross-fades in. Same as `src` when there is no better file. */
  full: string
  /** Candidates of `full` by width; `sizes` is owned by the lightbox. */
  srcset?: string
  /** Natural px of `full`. */
  width: number
  height: number
  /** A CSS `background` value under the image: `url(data:...)` or a color. */
  blur?: string
}
export type Media =
  | { kind: "image"; source: Source; alt: string }
  | { kind: "gif"; source: Source; alt: string }
  | {
      kind: "video"
      src: string
      poster: Source
      /** The accessible name: the slide, the `<video>`, the poster and the trigger. */
      title: string
      start?: number
      muted?: boolean
      loop?: boolean
    }
  | { kind: "frame"; src: string; width: number; height: number; title: string }
export type Entry = { id: string; media: Media; caption?: React.ReactNode }
export type Facts = {
  index: number
  count: number
  natural: Size | null
  rendered: Size
  zoom: number
  zoomMax: number
  sourceLimited: boolean
}
export interface LightboxProps {
  /** Explicit order; else triggers in document order at open. */
  entries?: Entry[]
  loop?: boolean
  /** `#lb=<id>` deep links: the hash is REPLACED on open and on every step, and
   *  on close the page's own hash comes back (a section anchor the visitor arrived
   *  on), so a reload lands on the entry and Back leaves the page the way it does on
   *  any hash-less page. Nothing is pushed: an edge swipe on iOS runs
   *  the browser's own page transition, and a lightbox that then flew home on top of
   *  it was a double motion. Android Back still closes, through CloseWatcher. */
  history?: boolean
  /** Controlled, consumer-owned. */
  rail?: boolean
  onRailChange?: (open: boolean) => void
  renderRail?: (entry: Entry, facts: Facts) => React.ReactNode
  onOpenChange?: (id: string | null) => void
  /** A mono trace of pointer, gesture and dispatch decisions on the stage, for
   *  device sign-off: what the engine saw and decided, as it happened. A string is a
   *  BUILD ID and is printed as the first line: a trace is worthless as evidence if
   *  nobody can tell which build produced it, and a stale buffer looks exactly like a
   *  fresh one. Pass a commit SHA. */
  debug?: boolean | string
  /** What the dialog is announced as, after the count. */
  label?: string
  children: React.ReactNode
}
export interface LightboxTriggerProps {
  ref?: React.Ref<HTMLElement>
  entry: Entry
  /** Default `<a href={full}>`; must be focusable. */
  render?: React.ReactElement
  /** Rendered untouched: next/image, a poster, a card. */
  children: React.ReactNode
}

type Trigger = { entry: Entry; el: HTMLElement }
type Session = { ids: string[]; index: number; rest: boolean }
type Phase = "enter" | "idle" | "exit"
/** What the pose spring is flying toward; the settle action is a function of it. */
type Aim = "enter" | "exit" | "free"
type Dispatch = (id: ActionId | "escape" | "zoom.toggle", at?: Point) => void
type VideoMedia = Extract<Media, { kind: "video" }>
/** Fixed for the provider's lifetime: triggers subscribe here and never re-render
 *  on a checkpoint. */
type Registry = {
  triggers: React.RefObject<Map<string, Trigger>>
  entries: React.RefObject<Entry[] | undefined>
  open: (id: string, rest?: boolean) => void
  close: () => void
  step: (d: 1 | -1) => void
  prime: (entry: Entry) => void
}
/** Changes on every checkpoint; only `useLightbox()` reads it. */
type State = { id: string | null; facts: Facts | null }

const RegistryContext = React.createContext<Registry | null>(null)
const StateContext = React.createContext<State | null>(null)

/** Reserved for the bar and the caption; consumer chrome is declared via data-obstructs. */
const INSET_X = 16
/** Slides each side of the one on screen that hold decoded media. Two, not one: a
 *  throw crosses its neighbour and is already looking at the next one by the time
 *  anything commits. */
const LOADED = 2
/** Trace entries kept. An entry can be a whole trajectory table, so this is far fewer
 *  screens than it looks, and a debug buffer that discards the interesting part while
 *  the reader scrolls to it is worse than none. */
const TRACE_LINES = 60
/** Module scope on purpose: the trace survives the dialog it came from. */
let TRACE: string[] = []
const FRAME_GUTTER = 32
/** The two elements the browser activates from the keyboard: a `render` that is
 *  merely focusable opens by pointer only. */
const ACTIVATABLE = "a[href], button"
/** The bottom strip of a `<video>` where the native controls live (css px): Chrome,
 *  Safari and iOS inline controls all sit in the bottom 40 to 50 px. */
const CONTROLS_H = 56
/** The lightbox's own parts (its keys sheet, a slide), whose keys it answers. */
const OWN_ROLES = ["dialog", "group"]
/** What Tab can land on; hidden chrome and inert siblings are filtered live. */
const TABBABLE =
  "a[href], button, input, select, textarea, summary, iframe, [tabindex]:not([tabindex='-1'])"

/** The platform's close-request hook (Android Back, Chrome 120+); absent from lib.dom. */
declare class CloseWatcher {
  onclose: (() => void) | null
  destroy(): void
}
/** Registry keys that scroll the `?` sheet while it has focus. */
const SHEET_SCROLLS: ReadonlySet<string> = new Set([
  " ",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
])

const boxOf = (m: Media): Size =>
  m.kind === "video"
    ? { w: m.poster.width, h: m.poster.height }
    : m.kind === "frame"
      ? { w: m.width, h: m.height }
      : { w: m.source.width, h: m.source.height }
const naturalOf = (m: Media): Size | null =>
  m.kind === "frame" ? null : boxOf(m)
const fullOf = (m: Media): string =>
  m.kind === "video" || m.kind === "frame" ? m.src : m.source.full
const altOf = (m: Media): string =>
  m.kind === "frame" || m.kind === "video" ? m.title : m.alt
/** Every kind names itself; a nameless video or frame is a lie to the reader. */
function assertMedia(m: Media): void {
  assertSize(boxOf(m))
  if (m.kind === "video" || m.kind === "frame")
    assert(m.title, `${m.kind} "${m.src}" has no title`)
}
const gutterOf = (m: Media): number => (m.kind === "frame" ? FRAME_GUTTER : 0)

function fitOf(m: Media, band: Band, floor?: Size): Size {
  return fit(boxOf(m), band, m.kind === "frame" ? FRAME_GUTTER : INSET_X, floor)
}

/** Decode of `full` starts on pointerdown, at the size the stage will ask for: the
 *  same band the Still measures, rail included, so both pick one candidate. A
 *  video's poster is the shared element, so it primes like an image. */
function prime(entry: Entry, rail: boolean) {
  const m = entry.media
  const source =
    m.kind === "image" ? m.source : m.kind === "video" ? m.poster : null
  if (!source) return
  if (source.full === source.src && !source.srcset) return
  const img = new Image()
  if (source.srcset) {
    img.srcset = source.srcset
    img.sizes = `${Math.round(fitOf(m, measureBand(rail)).w)}px`
  }
  img.src = source.full
  // The live element reports a broken original; a primer has nothing to add.
  img.decode().catch(() => {})
}

export function useLightbox(): Pick<Registry, "open" | "close" | "step"> &
  State {
  const registry = React.useContext(RegistryContext)
  const state = React.useContext(StateContext)
  assert(registry && state, "useLightbox() outside <Lightbox>")
  const { open, close, step } = registry
  return { open, close, step, id: state.id, facts: state.facts }
}

export function Lightbox({
  entries,
  loop = false,
  history = false,
  rail = false,
  onRailChange,
  renderRail,
  onOpenChange,
  label = "media",
  debug = false,
  children,
}: LightboxProps) {
  assert(
    !renderRail === !onRailChange,
    "rail: renderRail and onRailChange come together",
  )
  const triggers = React.useRef(new Map<string, Trigger>())
  const renditions = React.useRef(
    new Map<string, { original: Entry; src: string; entry: Entry }>(),
  )
  const [session, setSession] = React.useState<Session | null>(null)
  const [facts, setFacts] = React.useState<Facts | null>(null)
  const dispatchRef = React.useRef<Dispatch | null>(null)
  const openChange = React.useRef(onOpenChange)
  openChange.current = onOpenChange
  // Read through a ref so `open`, `registry` and `entryOf` are created once per
  // provider: an inline `entries` array must never rebuild the session.
  const entriesRef = React.useRef(entries)
  entriesRef.current = entries
  const railRef = React.useRef(rail)
  railRef.current = rail

  const open = React.useCallback((id: string, rest = false) => {
    const entries = entriesRef.current
    const ids = entries
      ? entries.map((e) => e.id)
      : [...triggers.current.values()]
          .sort((a, b) =>
            a.el.compareDocumentPosition(b.el) &
            Node.DOCUMENT_POSITION_FOLLOWING
              ? -1
              : 1,
          )
          .map((t) => t.entry.id)
    const index = ids.indexOf(id)
    assert(index >= 0, `open("${id}"): no such entry`)
    setSession({ ids, index, rest })
    openChange.current?.(id)
  }, [])

  const registry = React.useMemo<Registry>(
    () => ({
      triggers,
      entries: entriesRef,
      open,
      close: () => dispatchRef.current?.("close"),
      step: (d) => dispatchRef.current?.(d === 1 ? "step.next" : "step.prev"),
      prime: (entry) => prime(entry, railRef.current),
    }),
    [open],
  )
  const state = React.useMemo<State>(
    () => ({
      id: session ? (session.ids[session.index] as string) : null,
      facts,
    }),
    [session, facts],
  )
  const bind = React.useCallback((d: Dispatch) => {
    dispatchRef.current = d
  }, [])
  const onIndex = React.useCallback((index: number) => {
    setSession((s) => (s ? { ...s, index } : s))
  }, [])
  const onClosed = React.useCallback(() => {
    dispatchRef.current = null
    renditions.current.clear()
    setSession(null)
    setFacts(null)
    openChange.current?.(null)
  }, [])

  // A deep link opens once, at mount; a session already open is never re-opened.
  React.useEffect(() => {
    if (!history || dispatchRef.current) return
    const m = /^#lb=(.+)$/.exec(window.location.hash)
    if (!m) return
    const id = decodeURIComponent(m[1] as string)
    if (triggers.current.has(id)) open(id, true)
  }, [history, open])

  const entryOf = React.useCallback((id: string): Entry => {
    const e =
      entriesRef.current?.find((x) => x.id === id) ??
      triggers.current.get(id)?.entry
    assert(e, `no entry "${id}"`)
    // A responsive image's actual pixels can differ from its fallback src.
    // Start with that cache-hot rendition, without making Lightbox depend on Next.
    const trigger = triggers.current.get(id)?.el
    const img = trigger?.querySelector("img")
    const src = img?.complete && img.naturalWidth ? img.currentSrc : undefined
    if (src && e.media.kind !== "frame") {
      const previous = renditions.current.get(id)
      if (previous?.original === e && previous.src === src)
        return previous.entry
      const entry: Entry = {
        ...e,
        media:
          e.media.kind === "video"
            ? { ...e.media, poster: { ...e.media.poster, src } }
            : { ...e.media, source: { ...e.media.source, src } },
      }
      renditions.current.set(id, { original: e, src, entry })
      return entry
    }
    return e
  }, [])

  return (
    <RegistryContext.Provider value={registry}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
      <Dialog.Root
        open={session !== null}
        modal
        disablePointerDismissal
        // Every close request is ours: Escape walks the ladder (the capture handler
        // owns it; the platform key is routed here when it reaches Base UI, and with
        // no rung left the dispatch is a no-op), Back from the engine's
        // CloseWatcher, the button from dispatch.
        onOpenChange={(next, details) => {
          if (next) return
          details.cancel()
          if (details.reason === "escape-key") dispatchRef.current?.("escape")
        }}
      >
        <Dialog.Portal>
          {session && (
            <Stage
              ids={session.ids}
              index={session.index}
              rest={session.rest}
              entryOf={entryOf}
              triggers={triggers}
              loop={loop}
              history={history}
              rail={rail}
              onRailChange={onRailChange}
              renderRail={renderRail}
              label={label}
              bind={bind}
              onIndex={onIndex}
              onFacts={setFacts}
              onClosed={onClosed}
              debug={debug}
            />
          )}
        </Dialog.Portal>
      </Dialog.Root>
    </RegistryContext.Provider>
  )
}

export function LightboxTrigger({
  entry,
  render,
  children,
  ref: externalRef,
}: LightboxTriggerProps) {
  const ctx = React.useContext(RegistryContext)
  assert(ctx, "<LightboxTrigger> outside <Lightbox>")
  const ref = React.useRef<HTMLElement>(null)
  const { triggers, entries } = ctx
  assertMedia(entry.media)
  if (entries.current)
    assert(
      entries.current.some((e) => e.id === entry.id),
      `trigger "${entry.id}" is not in entries`,
    )

  React.useLayoutEffect(() => {
    const el = ref.current
    assert(el, "trigger rendered nothing")
    if (process.env.NODE_ENV !== "production") {
      assert(
        el.matches(ACTIVATABLE),
        `trigger "${entry.id}" is not a link or a button`,
      )
      assert(
        el.getAttribute("aria-label") ||
          el.textContent?.trim() ||
          el.querySelector("img[alt]:not([alt=''])"),
        `trigger "${entry.id}" has no accessible name`,
      )
    }
    triggers.current.set(entry.id, { entry, el })
    return () => {
      triggers.current.delete(entry.id)
    }
  }, [entry, triggers])

  return useRender({
    defaultTagName: "a",
    render,
    ref: [ref, externalRef ?? null],
    props: {
      href: render ? undefined : fullOf(entry.media),
      children,
      "data-lightbox": entry.id,
      "data-lightbox-kind": entry.media.kind,
      "aria-label": altOf(entry.media) || undefined,
      onPointerDown: (e: React.PointerEvent) => {
        if (!e.defaultPrevented) ctx.prime(entry)
      },
      onClick: (e: React.MouseEvent) => {
        if (
          e.defaultPrevented ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey
        )
          return
        e.preventDefault()
        ctx.open(entry.id)
      },
    },
  })
}

/** A picture that opens ALONE: its own provider around its own trigger, so it is never
 *  a slide in whatever reel surrounds it. The grouping model has no prop for this on
 *  purpose (the reel IS the provider); this is that model applied to one figure, and it
 *  is exported because an avatar in an attribution, an inline image in prose and a
 *  cover on a card all want exactly it. Arrows, strip and counter stand down on their
 *  own: the count is 1. The nearest provider wins, so it nests inside a page reel
 *  without joining it. `label` is what the dialog is announced as. */
export function LightboxSolo({
  label,
  ...trigger
}: LightboxTriggerProps & { label?: string }) {
  return (
    <Lightbox label={label}>
      <LightboxTrigger {...trigger} />
    </Lightbox>
  )
}

type StageProps = {
  ids: string[]
  index: number
  rest: boolean
  entryOf: (id: string) => Entry
  triggers: React.RefObject<Map<string, Trigger>>
  loop: boolean
  history: boolean
  rail: boolean
  onRailChange?: (open: boolean) => void
  renderRail?: (entry: Entry, facts: Facts) => React.ReactNode
  label: string
  bind: (d: Dispatch) => void
  onIndex: (index: number) => void
  onFacts: (f: Facts) => void
  onClosed: () => void
  debug: boolean | string
}

const POSE_EPS: Pose = { x: 0.5, y: 0.5, s: 0.001, p: 0.002 }
/** A zoom within this share of the sharp scale IS the original. */
const SHARP_EPS = 0.01

function Stage(props: StageProps) {
  const {
    ids,
    index,
    rest,
    entryOf,
    triggers,
    loop,
    history,
    rail,
    onRailChange,
    renderRail,
    label,
    bind,
    onIndex,
    onFacts,
    onClosed,
    debug,
  } = props
  const count = ids.length
  const id = ids[index] as string
  const entry = entryOf(id)
  const media = entry.media

  const root = React.useRef<HTMLDivElement>(null)
  const scrim = React.useRef<HTMLDivElement>(null)
  const chromeEl = React.useRef<HTMLDivElement>(null)
  const stage = React.useRef<HTMLDivElement>(null)
  const track = React.useRef<HTMLDivElement>(null)
  const layers = React.useRef(new Map<string, HTMLDivElement>())
  /** The layer the engine last wrote a pose to, for the debug flush to read back. */
  const activeLayer = React.useRef<HTMLDivElement | null>(null)
  const video = React.useRef<HTMLVideoElement | null>(null)

  // The strip shows when there is somewhere to go; `t` folds it.
  const [strip, setStrip] = React.useState(count > 1)
  const stripOn = strip && count > 1
  // Every slide as a thumbnail: the page's own rendition, a video's poster; a frame
  // has neither and shows its title.
  const thumbs = React.useMemo<ThumbStripItem[]>(
    () =>
      ids.map((tid) => {
        const m = entryOf(tid).media
        const box = boxOf(m)
        return {
          id: tid,
          src:
            m.kind === "image" || m.kind === "gif"
              ? m.source.src
              : m.kind === "video"
                ? m.poster.src
                : undefined,
          width: box.w,
          height: box.h,
          label: altOf(m),
          video: m.kind === "video",
        }
      }),
    [ids, entryOf],
  )
  const [band, setBand] = React.useState<Band>(() => measureBand(rail))
  /** The engine's own `S.ph` decides everything; this React copy exists to publish it
   *  as `data-phase`, a declared TEST HOOK. The browser rig waits on
   *  `.ag-lb[data-phase="idle"]` to know a flight has landed. No CSS reads it. */
  const [phase, setPhase] = React.useState<Phase>(rest ? "idle" : "enter")
  const [zoom, setZoom] = React.useState(1)
  const [chrome, setChrome] = React.useState(true)
  const [sheet, setSheet] = React.useState(false)
  const [fullscreen, setFullscreen] = React.useState(false)
  const [warm, setWarm] = React.useState(rest)
  // The slide under the reader's eyes RIGHT NOW, which runs ahead of `index`: the
  // index commits only once the track has landed. Media loads around this.
  const [passing, setPassing] = React.useState(index)
  // Where the hand pointed, ahead of the stage: the slide takes ~200 ms and queued
  // steps chain, so a strip and a counter that waited for `index` would trail a
  // fast reader by slides. They are an INDEX, not the content, and must read as
  // already there.
  const [aim, setAim] = React.useState<number | null>(null)
  const shown = aim ?? index
  // Keyed by a counter so a repeated status is a fresh DOM mutation, announced again.
  const [announce, setAnnounce] = React.useState({ text: "", n: 0 })
  const [caption, setCaption] = React.useState<React.ReactNode>(null)
  // The debug trace: the engine pushes lines, React sees them once per frame.
  const [log, setLog] = React.useState<string[]>(TRACE)
  const logRef = React.useRef<string[]>(TRACE)
  const logRaf = React.useRef(0)
  const pushTrace = React.useCallback((m: string) => {
    logRef.current = [
      ...logRef.current.slice(-TRACE_LINES),
      `${(performance.now() / 1000).toFixed(2)} ${m}`,
    ]
    // The buffer OUTLIVES the stage, module-scoped: a bug is reproduced, the
    // lightbox closes, and the evidence has to still be there.
    TRACE = logRef.current
    if (logRaf.current === 0)
      logRaf.current = requestAnimationFrame(() => {
        logRaf.current = 0
        // The screen's truth beside the engine's: the active layer's computed matrix
        // and how many animations still hold it. ONE reading per frame, taken after
        // the pose was written, and stamped on the last line: there is only one
        // painted state per frame, so every line in a frame shares this one anyway.
        const el = activeLayer.current
        const seen = el
          ? `${getComputedStyle(el)
              .transform.replace(/^matrix\(/, "m(")
              .replace(/, /g, ",")
              .slice(
                0,
                40,
              )} anims ${el.getAnimations({ subtree: true }).length}`
          : "no layer"
        const lines = logRef.current.slice()
        lines[lines.length - 1] = `${lines[lines.length - 1]} · ${seen}`
        setLog(lines)
      })
  }, [])

  // How big each picture already WAS on the page, read once at open from its trigger:
  // the fit never opens a picture smaller than that (`fit`'s floor), so a lightbox can
  // never shrink the picture it was asked to enlarge.
  const floors = React.useMemo(() => {
    const m = new Map<string, Size>()
    for (const lid of ids) {
      const el = triggers.current.get(lid)?.el
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) m.set(lid, { w: r.width, h: r.height })
    }
    return m
  }, [ids, triggers])
  const fitted = fitOf(media, band, floors.get(id))
  const natural = React.useMemo(() => naturalOf(media), [media])
  const dpr = window.devicePixelRatio
  const zoomMax =
    media.kind === "frame"
      ? 1
      : media.kind === "gif"
        ? 2
        : zoomCeiling((natural as Size).w, fitted.w, dpr)
  const sharp = natural ? sharpScale(natural.w, fitted.w, dpr) : 1
  const sourceLimited = media.kind !== "frame" && sharp < zoomMax
  const zoomed = zoom > 1.01
  // What the bar says about the pixels once the user asks for more: past the sharp
  // scale (a fit that already outgrew a small original included) the image is
  // larger than its file; at it, within a percent, it is the file. Quiet at fit: on
  // a dense display most fits exceed their file, and that is the norm.
  const status =
    natural === null || media.kind === "gif" || !zoomed
      ? null
      : zoom > sharp * (1 + SHARP_EPS)
        ? `shown larger than its ${natural.w} px original`
        : zoom >= sharp * (1 - SHARP_EPS)
          ? `at its ${natural.w} px original`
          : null
  const facts = React.useMemo<Facts>(
    () => ({
      index,
      count,
      natural,
      rendered: { w: fitted.w * zoom, h: fitted.h * zoom },
      zoom,
      zoomMax,
      sourceLimited,
    }),
    [index, count, natural, fitted.w, fitted.h, zoom, zoomMax, sourceLimited],
  )
  React.useEffect(() => onFacts(facts), [facts, onFacts])
  React.useEffect(() => {
    if (status) setAnnounce((a) => ({ text: status, n: a.n + 1 }))
  }, [status])

  const layerSet = React.useMemo(() => {
    const s = new Set<ActionLayer>(["always"])
    s.add(zoomed ? "zoomed" : "fit")
    if (media.kind === "video") s.add("video")
    if (sheet) s.add("sheet")
    if (fullscreen) s.add("fullscreen")
    return s
  }, [zoomed, media.kind, sheet, fullscreen])
  // ABSENT is not UNAVAILABLE. Unavailable is a STATE — prev at the first slide, zoom on
  // a frame — and its control shows dimmed, because it says where you are and it comes
  // back. Absent can never happen in this session: a rail nobody provided, arrows and a
  // strip on a reel of one, fullscreen where the browser has none. A control with nothing
  // behind it does not appear, in the bar or in the `?` sheet: a lightbox around one
  // portrait must draw no arrows and no "i" at all.
  const absent = React.useMemo(() => {
    const u = new Set<ActionId>()
    if (!renderRail) u.add("rail")
    if (count < 2)
      for (const a of [
        "prev",
        "next",
        "step.prev",
        "step.next",
        "first",
        "last",
        "strip",
      ] as const)
        u.add(a)
    if (!document.fullscreenEnabled) u.add("fullscreen")
    return u
  }, [count, renderRail])
  const unavailable = React.useMemo(() => {
    const u = new Set<ActionId>(absent)
    if (media.kind === "frame")
      for (const a of ["zoom.in", "zoom.out", "zoom.fit"] as const) u.add(a)
    const can = neighbours(index, count, loop)
    if (!can.prev) for (const a of ["prev", "step.prev"] as const) u.add(a)
    if (!can.next) for (const a of ["next", "step.next"] as const) u.add(a)
    return u
  }, [absent, media.kind, loop, index, count])

  // Everything the engine reads, one frame fresh, never a stale closure.
  const live = React.useRef({
    ids,
    index,
    entry,
    fitted,
    band,
    zoomMax,
    layerSet,
    unavailable,
    rail,
    loop,
    history,
    onRailChange,
    onIndex,
    onClosed,
    debug,
    trace: pushTrace,
  })
  live.current = {
    ids,
    index,
    entry,
    fitted,
    band,
    zoomMax,
    layerSet,
    unavailable,
    rail,
    loop,
    history,
    onRailChange,
    onIndex,
    onClosed,
    debug,
    trace: pushTrace,
  }

  // The engine: one object of mutable clocks and gesture state, owned by this effect.
  const engine = React.useRef<{
    dispatch: Dispatch
    settleIndex: () => void
    refit: (prev: { band: Band; fitted: Size }) => void
    /** A thumbnail picked: cut to that slide. */
    jump: (to: number) => void
  } | null>(null)

  // The engine mounts once per open; everything live is read through `live`.
  // biome-ignore lint/correctness/useExhaustiveDependencies: one engine per open
  React.useLayoutEffect(() => {
    const rootEl = root.current
    const trackEl = track.current
    const scrimEl = scrim.current
    const barEl = chromeEl.current
    assert(rootEl && trackEl && scrimEl && barEl, "stage without a root")
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
    const tune = (t: Tunings<keyof Pose>): Tunings<keyof Pose> =>
      reduced ? STILL : t
    const L = live
    const ZERO: Pose = { x: 0, y: 0, s: 0, p: 0 }
    // The pose: its value and velocity, live. Between checkpoints a flight owns it
    // (the tick copies the table's frame in); a hand writes it directly.
    const pose = {
      value: (rest ? { ...FIT, p: 1 } : { x: 0, y: 0, s: 1, p: 0 }) as Pose,
      vel: ZERO,
    }
    /** A flight on the compositor: the table and its clock (lightbox-flight) plus
     *  the animations that play it, kept to cancel them. */
    type Flight = MotionFlight<keyof Pose> & { anims: Animation[] }
    const S = {
      raf: 0,
      flight: null as Flight | null,
      aim: "free" as Aim,
      pending: null as { target: Pose; tuning: Tunings<keyof Pose> } | null,
      heldVel: ZERO,
      ph: (rest ? "idle" : "enter") as Phase,
      z: rest ? "own" : "fly",
      gesture: false,
      enterAt: performance.now(),
      /** The source crop (layer px) and its corner (screen px); zero when none. */
      clip: { w: 0, h: 0 } as Size,
      corner: 0,
      /** What last drove the lightbox: a pointer-driven close leaves no focus ring. */
      input: "pointer" as "pointer" | "key",
      /** The page's own hash at open, restored on close; a `#lb=` hash is ours. */
      hash0: /^#lb=/.test(window.location.hash) ? "" : window.location.hash,
    }
    // The debug trace: a decision, stamped with the live pose. Nothing when off, and
    // NOTHING read from the DOM: the screen's truth is read once a frame, by the
    // flush. Reading it here cost a forced style recalc per event, against the very
    // element the pan was writing a transform to, a hundred times a second, and the
    // instrumentation became the thing it was measuring.
    const trace = (m: string) => {
      if (!L.current.debug) return
      const { x, y, s, p } = pose.value
      L.current.trace(
        `${m} · s ${s.toFixed(2)} x ${Math.round(x)} y ${Math.round(y)} p ${p.toFixed(2)}`,
      )
    }

    const layerEl = () => {
      const el = layers.current.get(L.current.ids[L.current.index] as string)
      activeLayer.current = el ?? null
      assert(el, "active layer missing")
      return el
    }
    // The layer's two children: the crop window (overflow hidden, the corner) and
    // the media box inside it, sized to the layer.
    const cropEl = (layer: HTMLDivElement) => {
      const el = layer.firstElementChild
      assert(el instanceof HTMLDivElement, "layer without a crop")
      return el
    }
    const mediaEl = (layer: HTMLDivElement) => {
      const el = cropEl(layer).firstElementChild
      assert(el instanceof HTMLDivElement, "crop without media")
      return el
    }
    const layerBox = (): Size => {
      const { fitted, entry } = L.current
      const g = gutterOf(entry.media)
      return { w: fitted.w + 2 * g, h: fitted.h + 2 * g }
    }
    const center = (): Point => {
      const b = L.current.band
      return { x: b.left + b.w / 2, y: b.top + b.h / 2 }
    }
    const rel = (x: number, y: number): Point => {
      const c = center()
      return { x: x - c.x, y: y - c.y }
    }
    const vh = () => {
      const vv = window.visualViewport
      assert(vv, "visualViewport")
      return vv.height
    }

    const transformOf = ({ x, y, s }: Pose) =>
      `translate3d(${x}px, ${y}px, 0) scale(${s})`
    // The corner reads in SCREEN px, linear in p, so it neither balloons under the
    // scale nor snaps at the end.
    const cornerOf = ({ s, p }: Pose) => (S.corner * (1 - p)) / s
    const cropped = () => S.clip.w > 0.5 || S.clip.h > 0.5
    // A cover crop is two transforms, both on the compositor (a clip-path inset is a
    // main-thread effect that races the transform under a busy decode): the crop
    // window is laid out at its p = 0 size (the layer minus 2·clip) and scales by k
    // toward the whole layer, the media inside scales by 1/k, so the media holds its
    // fit size and only the window grows. k is 1 at the source, box/(box − 2·clip)
    // at rest. The window's corner is an ellipse mid-flight (rx = r·kx, ry = r·ky)
    // but cornerOf is proportional to (1 − p), near zero exactly where kx and ky
    // diverge.
    const cropScale = (v: Pose): Point => {
      const b = layerBox()
      const w0 = b.w - 2 * S.clip.w
      const h0 = b.h - 2 * S.clip.h
      assert(w0 > 0 && h0 > 0, `crop ${S.clip.w}×${S.clip.h} eats the layer`)
      return {
        x: (b.w - 2 * S.clip.w * (1 - v.p)) / w0,
        y: (b.h - 2 * S.clip.h * (1 - v.p)) / h0,
      }
    }
    const cropOf = (v: Pose) => {
      const k = cropScale(v)
      return `scale(${k.x}, ${k.y})`
    }
    const mediaOf = (v: Pose) => {
      const k = cropScale(v)
      return `scale(${1 / k.x}, ${1 / k.y})`
    }
    const writePose = () => {
      const v = pose.value
      const el = layerEl()
      const crop = cropEl(el)
      const media = mediaEl(el)
      el.style.transform = transformOf(v)
      if (cropped()) {
        crop.style.transform = cropOf(v)
        media.style.transform = mediaOf(v)
      } else {
        crop.style.transform = ""
        media.style.transform = ""
      }
      const corner = cornerOf(v)
      crop.style.borderRadius = corner > 0.05 ? `${corner}px` : ""
    }
    // --lb-p is registered `inherits: false` and lands on its three readers only,
    // so the rail's subtree and the sheet never see a per-frame style change.
    const writeP = () => {
      const p = pose.value.p
      const pv = String(p)
      layerEl().style.setProperty("--lb-p", pv)
      scrimEl.style.setProperty("--lb-p", pv)
      barEl.style.setProperty("--lb-p", pv)
      if (S.ph === "enter" && S.z === "fly" && p >= 0.85) {
        S.z = "own"
        rootEl.dataset.z = "own"
      } else if (S.ph === "exit" && S.z === "own" && p <= 0.6) {
        S.z = "fly"
        rootEl.dataset.z = "fly"
      }
    }
    const write = () => {
      writePose()
      writeP()
    }
    // ---- the track: a real scroll container the ENGINE drives, for every input
    // (ui/slide-track, the one engine tabs swipe on too). Every slide is mounted and
    // one fills the screen, so the scroll offset IS the index. A key, a button or a
    // thumbnail glides it on the same curve a swipe ends on.
    const slides = createSlideTrack({
      el: trackEl,
      count: () => L.current.ids.length,
      current: () => L.current.index,
      reduced: () => reduced,
      onAim: setAim,
      onArrive: (i) => L.current.onIndex(i),
      trace: (line) => trace(line),
      report: (table) => L.current.trace(table),
      debug: () => Boolean(L.current.debug),
    })
    // The flight ends: the pose IS the target, inline, and the animations go. The
    // inline write lands in the same frame the fill-forwards effect is cancelled, so
    // nothing flashes.
    const land = () => {
      const f = S.flight
      assert(f, "landing without a flight")
      S.flight = null
      pose.value = f.target
      pose.vel = ZERO
      write()
      for (const a of f.anims) a.cancel()
      if (!f.settles) return
      S.pending = null
      upgradeSizes()
      if (S.aim === "enter") settleEnter()
      else if (S.aim === "exit") closed()
    }
    // A hand or a new aim takes over mid-flight: the live pose and velocity come off
    // the table at the animation's own clock, written inline before the effect is
    // cancelled, so the takeover is seamless.
    const sync = () => {
      const f = S.flight
      if (!f) return
      const { frame } = readFlight(f)
      pose.value = frame.value
      pose.vel = frame.vel
      S.flight = null
      writePose()
      for (const a of f.anims) a.cancel()
    }
    const tick = () => {
      if (S.flight) {
        const { frame, done } = readFlight(S.flight)
        pose.value = frame.value
        pose.vel = frame.vel
        writeP()
        if (done) land()
      }
      if (S.flight) S.raf = requestAnimationFrame(tick)
      else {
        S.raf = 0
        if (!S.gesture) layerEl().style.willChange = ""
      }
    }
    const start = () => {
      if (S.raf) return
      S.raf = requestAnimationFrame(tick)
    }
    // One flight at a time: a running one is read and cancelled first, so the new
    // table starts from the live pose and carries its velocity unless handed one.
    // The transform plays on the compositor, the crop's pair of transforms beside
    // it; the corner (border-radius) is one more effect on the same clock.
    const fly = (
      target: Pose,
      tuning: Tunings<keyof Pose>,
      vel: Pose | undefined,
      settles: boolean,
    ) => {
      sync()
      const { frames, duration } = planFlight(
        pose.value,
        vel ?? pose.vel,
        target,
        tune(tuning),
        POSE_EPS,
      )
      const el = layerEl()
      const timing: KeyframeAnimationOptions = {
        duration,
        easing: "linear",
        fill: "forwards",
      }
      const crop = cropEl(el)
      // The layer's transform is the clock every other effect (and the engine) reads.
      const clock = el.animate(
        frames.map((f) => ({ transform: transformOf(f.value) })),
        timing,
      )
      const anims = [clock]
      if (cropped())
        anims.push(
          crop.animate(
            frames.map((f) => ({ transform: cropOf(f.value) })),
            timing,
          ),
          mediaEl(el).animate(
            frames.map((f) => ({ transform: mediaOf(f.value) })),
            timing,
          ),
        )
      if (S.corner > 0)
        anims.push(
          crop.animate(
            frames.map((f) => ({ borderRadius: `${cornerOf(f.value)}px` })),
            timing,
          ),
        )
      S.flight = { frames, anims, target, settles, clock }
      el.style.willChange = "transform"
      start()
    }
    // The settle action is a function of the aim, never of who last called: a free
    // spring during an enter completes the enter; one during an exit cancels it and
    // re-enters, so phase, z and the neighbours all recover on settle.
    const animate = (
      view: View,
      p: number,
      tuning: Tunings<keyof Pose>,
      vel?: Point,
      aim: Aim = "free",
    ) => {
      const target = { ...view, p }
      S.pending = { target, tuning }
      if (aim === "free" && S.ph !== "idle") {
        if (S.ph === "exit") {
          S.ph = "enter"
          setPhase("enter")
        }
        S.aim = "enter"
      } else S.aim = aim
      fly(
        target,
        tuning,
        vel ? { x: vel.x, y: vel.y, s: 0, p: 0 } : undefined,
        true,
      )
    }
    // A hand took over: the flight is read and dropped, its velocity remembered for
    // resume. The pose holds at its live value (the drag offsets from there).
    const pause = () => {
      sync()
      S.heldVel = pose.vel
      pose.vel = ZERO
      if (S.raf) cancelAnimationFrame(S.raf)
      S.raf = 0
    }
    const resume = () => {
      if (S.pending) fly(S.pending.target, S.pending.tuning, S.heldVel, true)
    }

    // A larger candidate is decoded off-DOM first, so the live element's reselection
    // hits the decode cache and paints in the same frame: the sharp image never
    // blinks to the base. A later settle supersedes an in-flight decode.
    let sizesToken = 0
    const upgradeSizes = () => {
      const up = layerEl().querySelector<HTMLImageElement>("img.ag-lb-up")
      if (!up?.srcset) return
      const next = `${Math.round(L.current.fitted.w * pose.value.s)}px`
      if (up.sizes === next) return
      const token = ++sizesToken
      const probe = new Image()
      probe.sizes = next
      probe.srcset = up.srcset
      probe.src = up.src
      probe.decode().then(
        () => {
          if (token === sizesToken && up.isConnected) up.sizes = next
        },
        // The live element reports a broken candidate; the probe has nothing to add.
        () => {},
      )
    }
    const say = (text: string) => setAnnounce((a) => ({ text, n: a.n + 1 }))
    const announceSlide = () => {
      const { index, ids, entry } = L.current
      const alt = altOf(entry.media)
      say(ids.length > 1 ? `${index + 1} of ${ids.length} · ${alt}` : alt)
    }
    const settleEnter = () => {
      S.ph = "idle"
      setPhase("idle")
      if (S.z !== "own") {
        S.z = "own"
        rootEl.dataset.z = "own"
      }
      clipToSource()
      writePose()
      setWarm(true)
      announceSlide()
    }
    // The one point where the hash goes, after the fly has landed.
    const closed = () => {
      const { history, ids, index } = L.current
      // Focus returns to the trigger. After a pointer or a finger the ring stays
      // quiet until the next key; after a key it shows, the keyboard is the user.
      const t = triggers.current.get(ids[index] as string)?.el
      if (t && S.input === "pointer") {
        t.dataset.focusQuiet = ""
        document.addEventListener(
          "keydown",
          () => {
            delete t.dataset.focusQuiet
          },
          { once: true, capture: true },
        )
      }
      if (history)
        window.history.replaceState(
          window.history.state,
          "",
          window.location.pathname + window.location.search + S.hash0,
        )
      L.current.onClosed()
    }
    // sourceView's radius is in layer px at the source scale; write() wants it in
    // screen px, which is that times the source scale. The clip lays out the crop
    // window (--lb-clip-w/h, read by the css) on the active layer.
    const clipVars = (sv: SourceView | null) => {
      S.clip = sv ? sv.clip : { w: 0, h: 0 }
      S.corner = sv ? sv.radius * sv.view.s : 0
      const el = layerEl()
      el.style.setProperty("--lb-clip-w", `${S.clip.w}px`)
      el.style.setProperty("--lb-clip-h", `${S.clip.h}px`)
    }
    const source = () => {
      const { ids, index, fitted, band } = L.current
      const t = triggers.current.get(ids[index] as string)
      if (!t?.el.isConnected) return null
      const r = rectOf(t.el)
      if (r.w <= 0 || r.h <= 0) return null
      return sourceView(r, fitted, band)
    }
    // The active layer always wears its own source clip, so --lb-p maps to the same
    // crop whether the entry was opened or stepped to: a drag re-crops toward the
    // card from the first frame, never at release.
    const clipToSource = () => {
      const sv = source()
      clipVars(sv)
      return sv
    }
    // A neighbour has no inline transform: whatever a spring left on a layer that
    // stopped being active is cleared before the new one takes the pose.
    const clearLayer = (el: HTMLDivElement) => {
      for (const a of el.getAnimations({ subtree: true })) a.cancel()
      el.style.transform = ""
      el.style.willChange = ""
      el.style.removeProperty("--lb-p")
      el.style.removeProperty("--lb-clip-w")
      el.style.removeProperty("--lb-clip-h")
      const crop = cropEl(el)
      crop.style.transform = ""
      crop.style.borderRadius = ""
      mediaEl(el).style.transform = ""
    }
    // A committing slide is dropped by any gesture that takes the stage vertically:
    // the track springs home, the index never changes. One rule for pinch, exit and
    // the x-to-y relock.
    // Idempotent: a second call mid-fly re-aims the running exit from the live rect.
    const beginExit = (vel?: Point) => {
      if (S.ph !== "exit") {
        S.ph = "exit"
        setPhase("exit")
      }
      const sv = clipToSource()
      slides.stop()
      animate(sv ? sv.view : GONE, 0, MACHINE, vel, "exit")
    }
    /** The picture is flying home to a trigger that the page is SCROLLING away, so it
     *  re-aims at wherever that trigger now is. Without this the exit is pinned to the
     *  viewport while the content moves under it, and the picture lands confidently on
     *  a patch of page where its trigger used to be. Following also gives the honest
     *  answer when the trigger scrolls off: the picture goes with it, out of view,
     *  which is where it belongs.
     *
     *  Once a FRAME, never once an event. Re-aiming reads the trigger's rect, and a
     *  layout read per wheel event while the page scrolls is the shape of a stall.
     *  Velocity is not passed, so the flight keeps the speed it already had. */
    let exitRaf = 0
    let exitY = 0
    const followOut = () => {
      if (S.ph !== "exit") {
        exitRaf = 0
        return
      }
      exitRaf = requestAnimationFrame(followOut)
      const y = window.scrollY
      const dy = y - exitY
      if (!dy) return
      exitY = y
      // The PICTURE moves with the content too, not just its target. Re-aiming alone
      // leaves a critically damped spring chasing a point that keeps fleeing, and a
      // spring tracking a constant velocity has a standing error of v/ω — it trails
      // the trigger by more the longer the reader keeps scrolling, and the move takes
      // longer the further the ground has run. Shifting BOTH ends by the same scroll
      // leaves the remaining flight identical in shape and in duration: the exit is a
      // move through the DOCUMENT, and how fast the ground goes by is not its
      // business.
      sync()
      pose.value = { ...pose.value, y: pose.value.y - dy }
      beginExit()
    }
    const followScroll = () => {
      if (exitRaf) return
      exitY = window.scrollY
      exitRaf = requestAnimationFrame(followOut)
    }

    // A step glides the track to the slide asked for. Presses chain: each one re-aims
    // the glide in flight from where it already is, so a held arrow is one motion and
    // no press is ever lost. A wrap under `loop` is the one cut, because the slide it
    // wants sits at the far end of the scroller.
    const stepTo = (to: number) => {
      const { ids, loop, index } = L.current
      const n = ids.length
      const d = to - index
      if (d === 0) return
      // A key is a hand too, and it takes the track off the wheel's.
      slides.release()
      const step = Math.abs(d) === 1
      // A press chains onto the step already in flight: where the track is HEADING is
      // what the next one counts from. Counting from the committed index instead, which
      // does not move until a step arrives, made every press in a fast run ask for the
      // same slide, so five presses moved one.
      const from = step ? (slides.aim() ?? index) : index
      if (step) {
        const can = neighbours(from, n, loop)
        if (!(d === 1 ? can.next : can.prev)) return
      }
      const wrapped = step ? (from + d + n) % n : to
      assert(wrapped >= 0 && wrapped < n, `step to ${to} of ${n}`)
      // The chrome's index, moved the moment a step is accepted.
      slides.aimAt(wrapped)
      if (
        pose.value.s !== 1 ||
        pose.value.p !== 1 ||
        pose.value.x ||
        pose.value.y
      )
        animate(FIT, 1, MACHINE)
      setZoom(1)
      if (step && Math.abs(wrapped - from) !== 1) {
        // A wrapped step: cut, there is nothing between here and there.
        slides.jumpTo(wrapped)
        L.current.onIndex(wrapped)
        return
      }
      slides.glideTo(wrapped)
    }

    // A move computed FROM the pose reads it live: a flight in progress is read and
    // dropped first, so the next flight starts where the eye sees the image.
    const zoomTo = (s: number, at: Point, tuning = MACHINE) => {
      const { fitted, band, zoomMax } = L.current
      sync()
      const target = Math.min(zoomMax, Math.max(1, s))
      const v = clampPan(zoomAt(pose.value, target, at), fitted, band)
      animate(target <= 1 ? FIT : v, 1, tuning)
      setZoom(target)
    }
    // Per axis: a flick that comes to rest on its own coasts; one the bounds cut
    // short bounces off the wall under the stiff spring. The free axis never shares
    // the wall's kick.
    const coastOrWall = (coast: View, target: View): Tunings<keyof Pose> => ({
      x: coast.x === target.x ? COAST : MACHINE,
      y: coast.y === target.y ? COAST : MACHINE,
      s: MACHINE,
      p: MACHINE,
    })
    // A zoom session released: the rubber past the ceiling is undone at the anchor,
    // then momentum projects and the pan clamps. One path for pinch and wheel.
    const releaseZoom = (vel: Point, at: Point) => {
      const { fitted, band, zoomMax } = L.current
      const s = Math.min(pose.value.s, zoomMax)
      const v = s === pose.value.s ? pose.value : zoomAt(pose.value, s, at)
      const coast = { x: project(v.x, vel.x), y: project(v.y, vel.y), s }
      const target = clampPan(coast, fitted, band)
      animate(
        target,
        1,
        s === pose.value.s ? coastOrWall(coast, target) : MACHINE,
        vel,
      )
      setZoom(s)
    }

    const dispatch: Dispatch = (id, at = { x: 0, y: 0 }) => {
      trace(`dispatch ${id}`)
      const { layerSet, unavailable, entry, ids, index } = L.current
      const v = video.current
      switch (id) {
        case "close":
          beginExit()
          return
        case "escape": {
          const rung = escRung(layerSet)
          if (rung) dispatch(rung)
          return
        }
        case "sheet":
          setSheet((s) => !s)
          return
        case "sheet.close":
          setSheet(false)
          return
        case "zoom.fit":
          if (unavailable.has(id)) return
          zoomTo(1, at)
          return
        case "zoom.in":
        case "zoom.out": {
          if (unavailable.has(id)) return
          // Steps compound on where the image is GOING: a held key or two quick
          // presses climb 1.5x each, not 1.5x of a flight a few ms in.
          const base = S.pending ? S.pending.target.s : pose.value.s
          zoomTo(id === "zoom.in" ? base * 1.5 : base / 1.5, at)
          return
        }
        case "zoom.toggle":
          if (entry.media.kind === "frame") return
          zoomTo(pose.value.s > 1.01 ? 1 : Math.min(2, L.current.zoomMax), at)
          return
        case "prev":
        case "step.prev":
          stepTo(index - 1)
          return
        case "next":
        case "step.next":
          stepTo(index + 1)
          return
        case "first":
          stepTo(0)
          return
        case "last":
          stepTo(ids.length - 1)
          return
        case "strip":
          if (unavailable.has(id)) return
          setStrip((s) => !s)
          return
        case "pan.left":
        case "pan.right":
        case "pan.up":
        case "pan.down":
          // A pan key is a HELD verb: it enters the pan loop and leaves on keyup;
          // the buttons and the sheet dispatch it as one 200 ms press.
          holdPan(id, `dispatch:${id}`)
          window.setTimeout(() => releasePan(`dispatch:${id}`), 200)
          return
        case "rail": {
          if (unavailable.has(id)) return
          const { onRailChange, rail } = L.current
          assert(onRailChange, "rail without onRailChange")
          onRailChange(!rail)
          return
        }
        case "chrome": {
          // Hiding the chrome hides its tab stops; focus goes back to the stage first.
          if (
            rootEl.dataset.chrome === "on" &&
            barEl.contains(document.activeElement)
          ) {
            assert(stage.current, "stage unmounted")
            stage.current.focus()
          }
          setChrome((c) => !c)
          return
        }
        case "fullscreen":
          if (unavailable.has(id)) return
          if (document.fullscreenElement) void document.exitFullscreen()
          else void rootEl.requestFullscreen()
          return
        case "open":
          window.open(fullOf(entry.media), "_blank", "noopener")
          return
        case "play":
          if (!v) return
          if (v.paused)
            // Stepping off mid-buffer pauses under a pending play(): the media API
            // rejects that with AbortError, which is the one rejection that is not a bug.
            v.play().catch((e: DOMException) => {
              if (e.name !== "AbortError") throw e
            })
          else v.pause()
          return
        case "seek.back":
          if (v) v.currentTime = Math.max(0, v.currentTime - 10)
          return
        case "seek.fwd":
          if (v)
            v.currentTime = Math.min(v.duration || Infinity, v.currentTime + 10)
          return
        case "mute":
          if (v) v.muted = !v.muted
          return
        default: {
          const never: never = id
          throw new Error(`lightbox: unknown action ${String(never)}`)
        }
      }
    }

    // ---- pointer (lightbox-gesture): the state machine is data, the binder owns
    // capture, the DOM and the clock, and applies the effects it returns.
    let G: Gesture | null = null
    let lastTap: Sample | null = null
    let tapTimer = 0
    const chromeTarget = (t: EventTarget | null) =>
      t instanceof Element &&
      !!t.closest("[data-lb-chrome], input, textarea, [contenteditable]")
    // The hand, not the dispatch: a frame the main thread dropped still delivered
    // its 8 ms samples, coalesced into the one move that got through, each with its
    // own position and time, so the release velocity measures the hand across a
    // stall. A move with nothing coalesced (an engine without the method, an
    // untrusted event) is its own sample.
    const handOf = (e: PointerEvent): readonly Sample[] => {
      const list = "getCoalescedEvents" in e ? e.getCoalescedEvents() : []
      const events = list.length > 0 ? list : [e]
      return events.map((c) => ({ x: c.clientX, y: c.clientY, t: c.timeStamp }))
    }
    const gestureCtx = (): GestureCtx => {
      const { fitted, band, zoomMax, entry } = L.current
      return {
        pose: pose.value,
        fitted,
        band,
        zoomMax,
        vh: vh(),
        frame: entry.media.kind === "frame",
      }
    }
    const inputOf = (e: PointerEvent, extra: Partial<PointerInput> = {}) => {
      const pts = G ? new Map(G.pts) : new Map<number, Point>()
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const m = pts.size >= 2 ? midOf(pts) : null
      return {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        at: rel(e.clientX, e.clientY),
        t: e.timeStamp,
        type: e.pointerType,
        onMedia:
          e.target instanceof Element && !!e.target.closest(".ag-lb-layer"),
        ...(m ? { mid: rel(m.x, m.y) } : {}),
        ...extra,
      } satisfies PointerInput
    }
    const applyGesture = (effects: GestureEffect[]) => {
      for (const f of effects) {
        switch (f.kind) {
          case "sync":
            sync()
            break
          case "pose":
            pose.value = f.pose
            write()
            break
          case "scroll":
            // A hand on the track, feeding the SAME swipe the wheel feeds: one line,
            // one lean, one slide per gesture, whatever is pushing. The finger moves
            // right, the pictures come from the left, so the travel is its negative.
            slides.finger(-f.dx)
            break
          case "unpose":
            fly(f.target, MACHINE, undefined, false)
            break
          case "trace":
            trace(f.text)
            break
          default: {
            const never: never = f
            throw new Error(`lightbox: gesture effect ${String(never)}`)
          }
        }
      }
    }
    // A gesture that takes the stage off the x axis (a pan, a pinch, a vertical
    // drag, a zoom or pan wheel) drops any committing slide first; only an x-axis
    // gesture keeps it frozen, to re-aim it on release.
    const beginGesture = () => {
      pause()
      S.gesture = true
      rootEl.dataset.gesture = ""
      layerEl().style.willChange = "transform"
    }
    const endGesture = () => {
      S.gesture = false
      delete rootEl.dataset.gesture
      // The engine has stopped driving the scroller, whichever way the gesture ended.
      // A landing sets it straight back, in the same turn, so nothing can snap between.
      delete trackEl.dataset.stepping
    }
    const onDown = (e: PointerEvent) => {
      S.input = "pointer"
      // A hand on the track always wins over a glide it started itself, and over a
      // wheel gesture still holding an offset: one hand at a time.
      slides.drop()
      if (chromeTarget(e.target)) return
      // The native control strip owns its pointers: a scrub is not a drag; the rest
      // of the video is media.
      if (e.target instanceof Element) {
        const v = e.target.closest("video")
        if (v && e.clientY > v.getBoundingClientRect().bottom - CONTROLS_H)
          return
      }
      if (e.pointerType === "mouse" && e.button !== 0) return
      // The stage owns this pointer: no selection (iOS selects an image on a double
      // tap and then hands every drag to the selection handles), no image drag.
      e.preventDefault()
      if (!G) {
        // A finger landing ends any wheel session: one hand at a time. The session
        // is released, not dropped: its zoom reaches React, its rubber is undone,
        // and the grab below takes the release flight at frame 0.
        if (W) {
          clearTimeout(wheelTimer)
          endWheel()
        }
        beginGesture()
      }
      const next = gestureDown(G, inputOf(e), gestureCtx())
      G = next.gesture
      applyGesture(next.effects)
    }
    const onMove = (e: PointerEvent) => {
      if (!G?.pts.has(e.pointerId)) return
      // Capture is implicit for touch and pen, and taking it while the compositor is
      // still deciding whether the pan is the scroller's is a way to be cancelled.
      if (G.samples.length === 0 && e.pointerType === "mouse")
        rootEl.setPointerCapture(e.pointerId)
      const next = gestureMove(G, inputOf(e, { hand: handOf(e) }), gestureCtx())
      G = next.gesture
      applyGesture(next.effects)
      // The hand relocked off the track mid-touch: it is dismissing now, so the swipe
      // hands the pictures back to their slide instead of holding an offset the
      // reader has stopped steering.
      if (G.axis === "y") slides.release()
    }
    // What a tap leaves behind. A hand on a coasting image stops it: a pan flight
    // (coast, wall bounce, key pan: the pending target keeps the scale) settles
    // where the finger found it. Every other flight resumes with the velocity it
    // held; finishing a zoom or the enter is what the tap wanted.
    const afterTap = () => {
      const { fitted, band } = L.current
      if (
        pose.value.s > 1.01 &&
        S.pending &&
        S.pending.target.s === pose.value.s
      )
        animate(clampPan(pose.value, fitted, band), 1, MACHINE)
      else resume()
    }
    // A tap: the ladder is lightbox-gesture's, the timer and the dispatches are the
    // binder's. The pending single-tap wait is always cleared first: whatever this
    // tap decided supersedes it.
    const tap = (g: Gesture, r: Extract<GestureRelease, { kind: "tap" }>) => {
      clearTimeout(tapTimer)
      const next = tapIntent(
        lastTap,
        { at: r.at, x: r.x, y: r.y, t: r.t, type: g.type },
        g,
        { pose: pose.value, kind: L.current.entry.media.kind },
      )
      trace(
        `tap ${lastTap ? `${Math.round(r.t - lastTap.t)}ms late` : "first"} → ${next.intents
          .map((i) => i.kind)
          .join("+")}`,
      )
      lastTap = next.last
      for (const i of next.intents) {
        switch (i.kind) {
          case "settle":
            afterTap()
            break
          case "escape":
            dispatch("escape")
            break
          case "zoom":
            dispatch("zoom.toggle", i.at)
            break
          case "chrome":
            dispatch("chrome")
            break
          case "wait":
            tapTimer = window.setTimeout(() => {
              lastTap = null
              dispatch("chrome")
            }, i.ms)
            break
          default: {
            const never: never = i
            throw new Error(`lightbox: tap intent ${String(never)}`)
          }
        }
      }
    }
    /** `pointercancel` is a real interruption, and always ends the gesture: a system
     *  edge swipe, a call, a palm. With `touch-action: none` the scroller never claims
     *  a pan, so there is nothing else it can mean and nothing to special-case. */
    const onCancel = (e: PointerEvent) => {
      trace(`cancel ${e.pointerType} #${e.pointerId}`)
      onUp(e)
    }
    const onUp = (e: PointerEvent) => {
      if (!G?.pts.has(e.pointerId)) return
      const g = G
      const r = gestureUp(g, inputOf(e), gestureCtx())
      if (r.kind === "hold") {
        G = r.gesture
        return
      }
      G = null
      endGesture()
      trace(
        `up ${e.type} ${g.mode} axis ${g.axis ?? "-"} pinched ${g.pinched} samples ${g.samples.length} travel ${Math.round(
          Math.hypot(e.clientX - g.start.x, e.clientY - g.start.y),
        )} → ${r.kind}`,
      )
      switch (r.kind) {
        case "exit":
          beginExit(r.vel)
          return
        case "cancel":
          animate(FIT, 1, HAND, r.vel)
          if (r.zoomed) setZoom(1)
          return
        case "zoom":
          releaseZoom(r.vel, r.at)
          return
        case "tap":
          tap(g, r)
          return
        case "coast":
          animate(r.target, 1, coastOrWall(r.coast, r.target), r.vel)
          return
        case "resume":
          resume()
          return
        case "snap":
          // The hand let the track go. A pointer SAYS when that happened, so there is
          // nothing to infer and nothing to wait for: the swipe ends on the event.
          slides.release()
          resume()
          return
        default: {
          const never: never = r
          throw new Error(`lightbox: gesture release ${String(never)}`)
        }
      }
    }

    // ---- wheel (lightbox-wheel): the session is data, the binder owns the silence
    // timer and applies the effects. The pose handed to the reducer is the one the
    // eye sees: a flight in progress is read at its clock, not the last tick's copy.
    let W: WheelSession | null = null
    let wheelTimer = 0
    // The whole wheel stream's phase, kept across sessions: hand or device coast tells
    // a deliberate pull down from the tail of one, and tells a NEW swipe from the
    // coast of the one just answered. It is never asked where a swipe lands.
    let wheelPhase = phaseStart()
    /** The axis this wheel stream belongs to, once its travel has said. */
    let streamAxis: "x" | "y" | null = null
    const wheelCtx = (): WheelCtx => {
      const { fitted, band, zoomMax, entry } = L.current
      return {
        pose: S.flight
          ? (readFlight(S.flight).frame.value as Pose)
          : pose.value,
        fitted,
        band,
        zoomMax,
        vh: vh(),
        frame: entry.media.kind === "frame",
      }
    }
    const fedRead = (w: WheelSession) => (w.phase.momentum ? " coast" : " hand")
    const endWheel = () => {
      const w = W
      W = null
      if (!w) return
      endGesture()
      const r = wheelRelease(w, wheelCtx())
      trace(`wheel end ${w.axis}${fedRead(w)} → ${r.kind}`)
      switch (r.kind) {
        case "none":
          return
        case "fit":
          animate(FIT, 1, MACHINE)
          setZoom(1)
          return
        case "zoom":
          releaseZoom({ x: 0, y: 0 }, r.at)
          return
        case "pan":
          animate(r.target, 1, MACHINE)
          return
        case "cancel":
          animate(FIT, 1, HAND, r.vel)
          return
        case "exit":
          beginExit()
          return
        default: {
          const never: never = r
          throw new Error(`lightbox: wheel release ${String(never)}`)
        }
      }
    }
    const onWheel = (e: WheelEvent) => {
      // The dialog owns every wheel while open. Browser zoom (ctrl+wheel, a trackpad
      // pinch) never reaches the page behind it, not even over the chrome, inside
      // the enter guard, under a finger or in an inertia tail; a plain wheel over
      // the chrome scrolls the chrome (rail, sheet). The returns below skip the
      // motion, never the ownership.
      if (e.ctrlKey) e.preventDefault()
      // LEAVING: the momentum still arriving is the reader's, and it belongs to the
      // page they are going back to. It has to be HANDED over, not merely released:
      // a scroll stream latches to the scroller it started on, so every remaining
      // delta keeps being delivered here whatever this handler does with them, and
      // ignoring them is why the page sat still and then moved on its own once a new
      // stream began. Applying them to the page directly is the only way the dismiss
      // and the scroll under it are one motion instead of two.
      if (S.ph === "exit") {
        e.preventDefault()
        // Not yet: the exit is DECIDED but the room is still up. Scrolling here moves
        // the page behind a curtain, which is the loss of control this was meant to
        // cure, not a cure for it.
        const live = S.flight
          ? (readFlight(S.flight).frame.value as Pose)
          : pose.value
        if (live.p > EXIT_HANDOFF) return
        window.scrollBy(
          wheelPx(e.deltaX, e.deltaMode, window.innerHeight),
          wheelPx(e.deltaY, e.deltaMode, window.innerHeight),
        )
        followScroll()
        return
      }
      if (chromeTarget(e.target)) return
      const ctx = wheelCtx()
      const input = {
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        deltaMode: e.deltaMode,
        ctrl: e.ctrlKey,
        at: rel(e.clientX, e.clientY),
        now: performance.now(),
      }
      // Hand or coast, for EVERY wheel event, the track's included: the answer
      // decides who owns the rest of this stream.
      const fed = phaseFeed(wheelPhase, {
        dx: wheelPx(e.deltaX, e.deltaMode, ctx.band.h),
        dy: wheelPx(e.deltaY, e.deltaMode, ctx.band.h),
        t: input.now,
      })
      wheelPhase = fed.phase
      if (fed.read.start) streamAxis = null
      // One axis for the whole stream, read off the travel and then LOCKED. Deciding
      // per event handed the same gesture to the track and to the dismiss by turns,
      // which is why it stopped feeling attached to the hand at all.
      if (wheelIsTrackable(input, ctx) && streamAxis === null) {
        streamAxis = wheelAxisOf(fed.read.movement)
        e.preventDefault()
        if (!streamAxis) return
        trace(`wheel axis ${streamAxis}`)
      }
      const guarded = performance.now() - S.enterAt < WHEEL_GUARD
      if (
        !guarded &&
        !G &&
        wheelIsTrackable(input, ctx) &&
        streamAxis === "x"
      ) {
        e.preventDefault()
        const dx = wheelPx(e.deltaX, e.deltaMode, ctx.band.h)
        // Only ever a hint, to hand the glide a speed. It decides nothing.
        const vx = fed.read.velocity.x
        // EVERY DELTA IS TRAVEL, the hand's and the device's alike, and nothing asks
        // which is which. The web does not report a release, so the phase would have
        // to be inferred from the shape of the decay, and that inference lands
        // wherever it lands: measured on two swipes of the same speed, one was called
        // coasting at 142 ms while its deltas were still GROWING, the other at 674 ms
        // in the middle of a 1 px dribble. The track (ui/slide-track) breaks a spent
        // gesture on a surge or a turn and ends it on silence.
        slides.wheel(dx, vx)
        return
      }
      e.preventDefault()
      if (guarded || G) return
      clearTimeout(wheelTimer)
      const next = wheelTick(W, input, ctx)
      W = next.session
      if (!W) return
      // The gesture, on screen: which axis owns it, whether the hand or the device
      // is driving, and what it decided.
      trace(
        `wheel ${W.axis}${fedRead(W)} ends ${W.phase.endsIn}${
          next.effects.length
            ? ` → ${next.effects.map((f) => f.kind).join(",")}`
            : ""
        }`,
      )
      // How long silence must last to mean the stream is over is the device's own
      // answer, not a constant: the phase detector sizes it from the rate this
      // device is actually emitting at, and tightens it once the hand has let go.
      wheelTimer = window.setTimeout(endWheel, W.phase.endsIn)
      for (const f of next.effects) {
        switch (f.kind) {
          case "grab":
            beginGesture()
            break
          case "release":
            endGesture()
            break
          case "pose":
            pose.value = f.pose
            write()
            break
          case "exit":
            beginExit({ x: 0, y: f.vy })
            break
          default: {
            const never: never = f
            throw new Error(`lightbox: wheel effect ${String(never)}`)
          }
        }
      }
    }

    // ---- keys, captured on the document for the engine's lifetime: the host page
    // never sees a key while the dialog is open, and a focus that strays to body
    // (a rail unmounting under it) never silences the registry. Escape walks the
    // ladder from anywhere, the rail included; every other key inside the rail
    // belongs to the consumer's widgets and is not touched; keys typed into a field
    // elsewhere stay with the field; Space and Enter on a focused control activate
    // it; the default is prevented only for keys the registry dispatches. Tab is
    // walked by hand over the dialog's own tabbables: Safari's Tab visits only
    // fields by default and would leave for the address bar, so the browser never
    // gets it. A key that is part of an IME composition belongs to the composition.
    // ---- the hold loop (lightbox-hold): a key held while zoomed drives the image at
    // a constant rate until keyup, one glide per frame. Keys are tracked by the
    // physical key that went down, so a layer change mid-hold still releases; the
    // zoom state (chrome, layers) is written once, when the LAST held key lifts.
    // Only a hold settles: the keyup of a tapped + or - arrives while its spring is
    // a few frames in, and reading the pose there would record a mid-flight zoom
    // (or, within the first frames, cancel the step back to fit).
    const held = new Map<string, HoldVerb>()
    let panRaf = 0
    let panLast = 0
    const holdTick = (t: number) => {
      const delta = holdDelta(held.values(), t - panLast)
      panLast = t
      sync()
      const { fitted, band, zoomMax } = L.current
      pose.value = {
        ...applyHold(pose.value, delta, fitted, band, zoomMax),
        p: pose.value.p,
      }
      pose.vel = ZERO
      write()
      panRaf = held.size > 0 ? requestAnimationFrame(holdTick) : 0
    }
    const holdPan = (id: HoldVerb, key: string) => {
      if (held.has(key)) return
      held.set(key, id)
      if (panRaf === 0) {
        panLast = performance.now()
        panRaf = requestAnimationFrame(holdTick)
      }
    }
    const settleHold = () => {
      if (held.size > 0) return
      const s = pose.value.s
      setZoom(s <= 1.01 ? 1 : s)
      if (s <= 1.01) animate(FIT, 1, MACHINE)
    }
    const releasePan = (key: string) => {
      if (held.delete(key)) settleHold()
    }
    const releaseAllPan = () => {
      if (held.size === 0) return
      held.clear()
      settleHold()
    }
    const onKeyUp = (e: KeyboardEvent) => releasePan(e.key)

    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229) return
      S.input = "key"
      const key = keyOf(e)
      const { layerSet, unavailable } = L.current
      const target = e.target instanceof Element ? e.target : null
      if (key === "Escape") {
        const rung = escRung(layerSet)
        if (rung) {
          e.preventDefault()
          dispatch(rung)
        }
        return
      }
      if (e.key === "Tab") {
        e.preventDefault()
        const list = tabbables()
        if (list.length === 0) return
        const i = list.indexOf(document.activeElement as HTMLElement)
        const last = list.length - 1
        const next = e.shiftKey
          ? i <= 0
            ? last
            : i - 1
          : i < 0 || i === last
            ? 0
            : i + 1
        ;(list[next] as HTMLElement).focus()
        return
      }
      // The rail is the consumer's: its keys are its own. A field, a control's Space
      // and Enter, a popup's arrows never reach here at all: `ownedHere` is asked
      // before a press is offered to the lightbox.
      if (target?.closest(".ag-lb-rail")) return
      if (key === null) return
      if (layerSet.has("sheet")) {
        // The sheet owns the keyboard: registry keys are inert behind it, and the
        // keys that scroll or tab through the sheet itself keep their default.
        if (key === "?") {
          e.preventDefault()
          dispatch("sheet")
        } else if (KEYS.has(key) && !SHEET_SCROLLS.has(key)) e.preventDefault()
        return
      }
      const a = resolve(key, layerSet)
      if (!a) {
        if (KEYS.has(key)) e.preventDefault()
        return
      }
      e.preventDefault()
      if (e.repeat && a.repeat === false) return
      if (unavailable.has(a.id as ActionId)) return
      if (a.id.startsWith("pan.")) {
        holdPan(a.id as HoldVerb, e.key)
        return
      }
      // A zoom key: the first press is one step (a spring), the hold that follows
      // is the loop, continuing from wherever that spring is.
      if ((a.id === "zoom.in" || a.id === "zoom.out") && e.repeat) {
        holdPan(a.id, e.key)
        return
      }
      dispatch(a.id as ActionId)
    }

    const tabbables = () =>
      [...rootEl.querySelectorAll<HTMLElement>(TABBABLE)].filter(
        (el) =>
          !el.closest("[inert]") &&
          el.checkVisibility({ visibilityProperty: true }),
      )

    // Back on Android (and any platform close request) walks the ladder, one rung
    // per request; a watcher is consumed by its close, so the next rung re-arms.
    let watcher: CloseWatcher | null = null
    const arm = () => {
      if (!("CloseWatcher" in window)) return
      watcher = new CloseWatcher()
      watcher.onclose = () => {
        dispatch("escape")
        arm()
      }
    }
    arm()

    const onFullscreen = () =>
      setFullscreen(document.fullscreenElement === rootEl)
    let bandRaf = 0
    const onViewport = () => {
      if (bandRaf) return
      bandRaf = requestAnimationFrame(() => {
        bandRaf = 0
        const next = measureBand(L.current.rail)
        if (!sameBand(next, L.current.band)) setBand(next)
      })
    }

    // ---- the track landed. The browser carried the momentum and chose the snap
    // point; all that is left is to read which slide it chose and make it the current
    // one. There is nothing to decide here and nothing that can race: the container
    // is `mandatory`, so where it comes to rest IS a slide.
    const onScrollSettled = () => {
      // Nothing of ours may be moving the track: a `scrollend` fires in any lull, and
      // a swipe still under the fingers has not finished choosing (`settle` asks).
      if (S.ph !== "idle") return
      slides.settle()
    }
    // The browser says which slide it picked the moment it picks it, mid-flight,
    // rather than when the scrolling stops: the thumbnail lights on the slide that is
    // arriving instead of trailing it. Chrome 129 / Safari 18.2; where it is missing,
    // `scrollend` says the same thing a little later, and `scroll` a little later
    // still. All three are the same commit, so having all three costs nothing.
    const hasSnapEvents = "onscrollsnapchange" in trackEl
    const hasScrollEnd = "onscrollend" in window
    let scrollTimer = 0
    // Every scroll frame, cheaply: which slide is under the reader, so its
    // neighbours are decoded before the throw arrives. React sees a change only
    // when the answer actually changes.
    let passRaf = 0
    const onScroll = () => {
      if (!passRaf)
        passRaf = requestAnimationFrame(() => {
          passRaf = 0
          setPassing(slides.landed())
        })
      if (hasScrollEnd) return
      clearTimeout(scrollTimer)
      scrollTimer = window.setTimeout(onScrollSettled, 120)
    }
    if (hasSnapEvents)
      trackEl.addEventListener("scrollsnapchange", onScrollSettled)
    trackEl.addEventListener("scrollend", onScrollSettled)
    trackEl.addEventListener("scroll", onScroll, { passive: true })
    rootEl.addEventListener("pointerdown", onDown)
    rootEl.addEventListener("pointermove", onMove)
    rootEl.addEventListener("pointerup", onUp)
    rootEl.addEventListener("pointercancel", onCancel)
    rootEl.addEventListener("wheel", onWheel, { passive: false })
    // ITS KEYS, in the bubble phase on its own element: a press a control inside it
    // owns (a field in the rail, a button's Space) is that control's (key-router's
    // `ownedHere`), and a consumer's popup over a slide, portalled outside it, gets
    // its keys without the lightbox ever seeing them. On the element and not the
    // document, because Base UI's dialog popup stops the arrows' propagation on its way
    // up. And on the page's key router as a MODAL: while it is open nothing behind it
    // hears a key (a press from outside it, focus having strayed, is still its).
    const onOwnKey = (e: KeyboardEvent) => {
      if (ownedHere(e, rootEl, OWN_ROLES)) return
      onKey(e)
    }
    rootEl.addEventListener("keydown", onOwnKey)
    const offKeys = registerKeys({
      root: () => rootEl,
      modal: true,
      own: OWN_ROLES,
      onKey: (e) => {
        if (rootEl.contains(e.target as Node)) return false
        onKey(e)
        return e.defaultPrevented
      },
    })
    document.addEventListener("keyup", onKeyUp)
    window.addEventListener("blur", releaseAllPan)
    document.addEventListener("fullscreenchange", onFullscreen)
    const vv = window.visualViewport
    assert(vv, "visualViewport")
    vv.addEventListener("resize", onViewport)
    vv.addEventListener("scroll", onViewport)
    window.addEventListener("resize", onViewport)

    engine.current = {
      dispatch,
      settleIndex: () => {
        slides.aimAt(null)
        // A flight still running on the layer that just stopped being active (the
        // zoom-to-fit under a step) goes with it: the new layer starts at rest.
        if (S.flight) {
          for (const a of S.flight.anims) a.cancel()
          S.flight = null
          S.pending = null
        }
        // Nothing to put back: the reader is already on this slide, which is the
        // whole reason every slide is mounted.
        pose.value = { ...FIT, p: 1 }
        pose.vel = ZERO
        const activeEl = layerEl()
        for (const el of layers.current.values())
          if (el !== activeEl) clearLayer(el)
        clipToSource()
        write()
        upgradeSizes()
        announceSlide()
      },
      jump: (to) => stepTo(to),
      refit: (prev) => {
        if (S.ph !== "idle" || S.gesture) return
        const { band, fitted, index } = L.current
        sync()
        // The slides are viewport-wide, so a resize moves every snap point.
        slides.measure()
        slides.jumpTo(index)
        // The crop is in layer px and the trigger moved with the page: re-measured
        // in the new fit before the pose is written.
        clipToSource()
        const { x, y, s, p } = pose.value
        const dx = prev.band.left + prev.band.w / 2 - (band.left + band.w / 2)
        const dy = prev.band.top + prev.band.h / 2 - (band.top + band.h / 2)
        const k = prev.fitted.w / fitted.w
        pose.value = { x: x + dx, y: y + dy, s: s * k, p }
        write()
        animate(
          s > 1.01 ? clampPan({ x: x + dx, y: y + dy, s }, fitted, band) : FIT,
          1,
          MACHINE,
        )
      },
    }
    bind(dispatch)

    // Frame one: the source pose, written before paint. The engine is the only
    // writer of data-z and --lb-p.
    rootEl.dataset.z = S.z
    // The scroller starts under the opened slide, before anything paints.
    slides.measure()
    slides.jumpTo(L.current.index)
    if (!rest) {
      const sv = source()
      assert(sv, "open without a trigger rect")
      clipVars(sv)
      pose.value = { ...sv.view, p: 0 }
      write()
      animate(FIT, 1, MACHINE, undefined, "enter")
    } else {
      write()
      announceSlide()
    }

    return () => {
      if (S.raf) cancelAnimationFrame(S.raf)
      if (bandRaf) cancelAnimationFrame(bandRaf)
      clearTimeout(tapTimer)
      clearTimeout(wheelTimer)
      clearTimeout(scrollTimer)
      slides.dispose()
      if (exitRaf) cancelAnimationFrame(exitRaf)
      if (passRaf) cancelAnimationFrame(passRaf)
      if (hasSnapEvents)
        trackEl.removeEventListener("scrollsnapchange", onScrollSettled)
      trackEl.removeEventListener("scrollend", onScrollSettled)
      trackEl.removeEventListener("scroll", onScroll)
      rootEl.removeEventListener("pointerdown", onDown)
      rootEl.removeEventListener("pointermove", onMove)
      rootEl.removeEventListener("pointerup", onUp)
      rootEl.removeEventListener("pointercancel", onCancel)
      rootEl.removeEventListener("wheel", onWheel)
      rootEl.removeEventListener("keydown", onOwnKey)
      offKeys()
      document.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("blur", releaseAllPan)
      if (panRaf) cancelAnimationFrame(panRaf)
      watcher?.destroy()
      document.removeEventListener("fullscreenchange", onFullscreen)
      vv.removeEventListener("resize", onViewport)
      vv.removeEventListener("scroll", onViewport)
      window.removeEventListener("resize", onViewport)
      engine.current = null
    }
  }, [])

  // The trigger is the source: hidden for the open lifetime, restored in the unmount
  // paint. On every step (and on a deep-link open) the new trigger scrolls into
  // view so close has a target; the trigger the user just clicked is on screen
  // already, and its rect was measured before this effect, so it never scrolls.
  const opened = React.useRef(!rest)
  // biome-ignore lint/correctness/useExhaustiveDependencies: per entry
  React.useLayoutEffect(() => {
    const t = triggers.current.get(id)
    const el = t?.el
    if (el) {
      if (!opened.current)
        el.scrollIntoView({
          block: "nearest",
          inline: "nearest",
          behavior: "instant",
        })
      el.style.visibility = "hidden"
    }
    opened.current = false
    setCaption(
      entry.caption ??
        el?.closest("figure")?.querySelector("figcaption")?.textContent ??
        altOf(entry.media),
    )
    // The hash is replaced, never pushed: a deep link, not a history entry. The
    // router's own state rides along untouched.
    if (history)
      window.history.replaceState(
        window.history.state,
        "",
        `#lb=${encodeURIComponent(id)}`,
      )
    return () => {
      if (el) el.style.visibility = ""
    }
  }, [id])

  // After a step commits the track resets and the new active layer takes the pose.
  const settledIndex = React.useRef(index)
  React.useLayoutEffect(() => {
    if (settledIndex.current === index) return
    settledIndex.current = index
    engine.current?.settleIndex()
  }, [index])

  // The band moved (rail, viewport): the media re-fits beside it through the spring.
  const geo = React.useRef({ band, fitted })
  // biome-ignore lint/correctness/useExhaustiveDependencies: band is the trigger
  React.useLayoutEffect(() => {
    const prev = geo.current
    geo.current = { band, fitted }
    if (sameBand(prev.band, band)) return
    engine.current?.refit(prev)
  }, [band])
  // biome-ignore lint/correctness/useExhaustiveDependencies: rail flips the band
  React.useLayoutEffect(() => {
    const next = measureBand(rail)
    if (!sameBand(next, band)) setBand(next)
  }, [rail])

  const dispatch = (a: ActionId) => engine.current?.dispatch(a)
  // The sheet owns the keyboard while up: its siblings are inert, so Tab has
  // nothing to reach outside it and assistive tech sees only the sheet. Focus goes
  // to it on mount and back to the stage once the siblings are live again.
  const sheetEl = React.useRef<HTMLDivElement>(null)
  React.useLayoutEffect(() => {
    if (!sheet) return
    assert(sheetEl.current, "sheet rendered nothing")
    sheetEl.current.focus()
    return () => {
      stage.current?.focus()
    }
  }, [sheet])
  return (
    <Dialog.Popup
      ref={root}
      className="ag-lb"
      // Portal clicks must not activate a card containing the trigger.
      onClick={(event) => event.stopPropagation()}
      data-phase={phase}
      data-chrome={chrome ? "on" : "off"}
      data-zoomed={zoomed ? "" : undefined}
      data-kind={media.kind}
      // A position is only worth announcing when there is more than one place
      // to be; "1 of 1" is noise in a screen reader for the same reason it is on
      // screen.
      aria-label={count > 1 ? `${index + 1} of ${count} · ${label}` : label}
      initialFocus={stage}
      finalFocus={() => triggers.current.get(ids[index] as string)?.el ?? true}
      style={
        {
          "--lb-rail-w": `${RAIL_W}px`,
          "--lb-rail-h": `${RAIL_H * 100}%`,
        } as React.CSSProperties
      }
    >
      <div ref={scrim} className="ag-lb-scrim" />
      {/* The stage spans the viewport because the scroller inside it does: a scroll
          container clips, and the enter flight comes from a trigger anywhere on the
          page. The media still lives in the band; each slide places it there. */}
      <div
        ref={stage}
        className="ag-lb-stage"
        tabIndex={-1}
        inert={sheet || undefined}
        style={{ inset: 0 }}
      >
        {/* Every slide, in order: the scroll offset IS the index. Media is decoded
            around where the reader ACTUALLY is, not where the index has committed
            to: a throw crosses slides long before it lands, and a slide with no
            pixels is a grey hole. */}
        <div ref={track} className="ag-lb-track">
          {ids.map((lid, i) => (
            <div key={lid} className="ag-lb-slot">
              <Layer
                entry={entryOf(lid)}
                band={band}
                floor={floors.get(lid)}
                active={i === index}
                near={warm && Math.abs(i - passing) <= LOADED}
                layers={layers}
                video={video}
              />
            </div>
          ))}
        </div>
      </div>
      {/* The chrome lives in the media lane, the band the stage measures, so it is
          never under the rail. */}
      <div
        ref={chromeEl}
        className="ag-lb-chrome"
        data-lb-chrome
        inert={sheet || undefined}
        style={{
          top: band.top - INSET_Y,
          left: band.left,
          width: band.w,
          height: band.h + 2 * INSET_Y,
        }}
      >
        <div className="ag-lb-bar">
          {/* A reel of ONE has no position to report, and "1 / 1" is the decorative
              text the brand rules forbid. A lightbox around a single prose figure is
              a normal, deliberate use: the provider is the reel, so a post puts one
              around a gallery and one around each standalone image. */}
          {count > 1 && (
            <span className="ag-lb-counter">
              {shown + 1} / {count}
            </span>
          )}
          {status && <span className="ag-lb-status">{status}</span>}
          {stripOn ? (
            <ThumbStrip
              items={thumbs}
              index={shown}
              onJump={(to) => engine.current?.jump(to)}
            />
          ) : (
            <span className="ag-lb-spacer" />
          )}
          <Button
            id="rail"
            dispatch={dispatch}
            unavailable={unavailable}
            absent={absent}
            pressed={rail}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 7v5M8 4.5v.5" />
            </svg>
          </Button>
          <Button id="close" dispatch={dispatch} unavailable={unavailable}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </Button>
        </div>
        {!absent.has("prev") && (
          <EdgeArrow
            side="left"
            enabled={!unavailable.has("prev")}
            onClick={() => dispatch("prev")}
            {...actionAria("prev")}
          />
        )}
        {!absent.has("next") && (
          <EdgeArrow
            side="right"
            enabled={!unavailable.has("next")}
            onClick={() => dispatch("next")}
            {...actionAria("next")}
          />
        )}
        <div className="ag-lb-caption">{caption}</div>
      </div>
      <div className="ag-lb-live" aria-live="polite">
        <span key={announce.n}>{announce.text}</span>
      </div>
      {debug && (
        <Debug
          lines={log}
          build={typeof debug === "string" ? debug : undefined}
          onClear={() => {
            TRACE = []
            logRef.current = []
            setLog([])
          }}
        />
      )}
      {rail && renderRail && (
        <Rail inert={sheet} stage={stage}>
          <div className="ag-lb-facts">{factsLine(facts)}</div>
          {renderRail(entry, facts)}
        </Rail>
      )}
      {sheet && (
        <div
          ref={sheetEl}
          className="ag-lb-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="keys"
          tabIndex={-1}
          data-lb-chrome
        >
          {sheetOf(layerSet, unavailable).map((section) => (
            <React.Fragment key={section.section}>
              <div className="ag-lb-sheet-head">{section.section}</div>
              <dl>
                {section.rows.map((row) => (
                  <div key={row.label}>
                    <dt>
                      {row.keys.map((k) => (
                        <kbd key={k}>{keycap(k)}</kbd>
                      ))}
                    </dt>
                    <dd>{row.label}</dd>
                  </div>
                ))}
              </dl>
            </React.Fragment>
          ))}
        </div>
      )}
    </Dialog.Popup>
  )
}

/** The debug trace on the stage: the engine's decisions as they happened, plus any
 *  error the page threw. Mono, read-only, for a device in hand. */
function Debug({
  lines,
  build,
  onClear,
}: {
  lines: string[]
  build?: string
  onClear: () => void
}) {
  const [errors, setErrors] = React.useState<string[]>([])
  React.useEffect(() => {
    const onError = (e: ErrorEvent) => {
      const stack = (e.error as Error | undefined)?.stack
        ?.split("\n")
        .slice(0, 3)
        .map((l) =>
          l
            .trim()
            .replace(/^.*\/_next\//, "")
            .slice(-60),
        )
        .join(" ← ")
      setErrors((x) => [
        ...x.slice(-2),
        `error: ${e.message} @ ${e.lineno}:${e.colno} ${stack ?? ""}`,
      ])
    }
    const onReject = (e: PromiseRejectionEvent) =>
      setErrors((x) => [...x.slice(-3), `rejection: ${String(e.reason)}`])
    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onReject)
    return () => {
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onReject)
    }
  }, [])
  // The build, and the wall clock the buffer was READ at. Together they say which
  // code produced this and whether the reader is looking at a fresh run or the same
  // lines they copied five minutes ago, which is a mistake no amount of care avoids
  // when every trace looks alike.
  const text = [
    ...(build
      ? [`build ${build} · read ${new Date().toLocaleTimeString()}`]
      : []),
    ...errors,
    ...lines,
  ].join("\n")
  return (
    // `data-lb-chrome` is what stops a press here reaching the stage. Without it the
    // press to COPY was a press on the backdrop, so the lightbox closed, the overlay
    // went with it, and the clipboard kept whatever it had from the last attempt. A
    // reader then pastes an old trace believing it is the new one, and no amount of
    // reloading fixes what looks like a stale page.
    <div className="ag-lb-debug" data-lb-chrome>
      <div className="ag-lb-debug-bar">
        {/* The registry's own copy control, not a second one written here: an item
            that hand-rolls what it already ships is how two behaviours diverge. */}
        <Copy value={text} label />
        {/* The buffer is the reader's, and only they say when it goes. */}
        <button type="button" className="ag-lb-debug-btn" onClick={onClear}>
          clear
        </button>
      </div>
      <pre aria-hidden>{text || "debug · waiting for a pointer"}</pre>
    </div>
  )
}

/** The consumer's rail. Focus inside it goes back to the stage before the aside
 *  is detached: an element removed under focus fires no focusout, and a focus left
 *  on body is a dead keyboard. */
function Rail({
  inert,
  stage,
  children,
}: {
  inert: boolean
  stage: React.RefObject<HTMLDivElement | null>
  children: React.ReactNode
}) {
  const aside = React.useRef<HTMLElement>(null)
  React.useLayoutEffect(() => {
    return () => {
      assert(aside.current, "rail rendered nothing")
      // On a full close the stage ref is already detached (it precedes the rail in
      // the tree) and Base UI returns focus to the trigger.
      if (stage.current && aside.current.contains(document.activeElement))
        stage.current.focus()
    }
  }, [stage])

  return (
    <aside
      ref={aside}
      className="ag-lb-rail"
      data-lb-chrome
      aria-label="details"
      inert={inert || undefined}
    >
      {children}
    </aside>
  )
}

function factsLine(f: Facts): string {
  const on = `${Math.round(f.rendered.w)}px on screen`
  const zoom = `${Math.round(f.zoom * 100)}%`
  const parts = [
    f.natural ? `${f.natural.w} × ${f.natural.h}` : "frame",
    on,
    zoom,
  ]
  if (f.natural && f.rendered.w * window.devicePixelRatio > f.natural.w)
    parts.push("larger than its original")
  return parts.join(" · ")
}

/** A control's name, keys and tooltip, from the action table. */
function actionAria(id: ActionId) {
  const a: Action = action(id)
  return {
    "aria-label": a.label,
    "aria-keyshortcuts": keyshortcuts(a),
    title: `${a.label} · ${a.keys.map(keycap).join(" ")}`,
  }
}

function Button({
  id,
  dispatch,
  unavailable,
  absent,
  pressed,
  className,
  children,
  ...rest
}: {
  id: ActionId
  dispatch: (id: ActionId) => void
  unavailable: ReadonlySet<ActionId>
  /** Actions that cannot happen in this session render nothing. */
  absent?: ReadonlySet<ActionId>
  pressed?: boolean
  className?: string
  children: React.ReactNode
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "id" | "children">) {
  if (absent?.has(id)) return null
  return (
    <button
      type="button"
      className={`ag-lb-btn${className ? ` ${className}` : ""}`}
      {...actionAria(id)}
      aria-pressed={pressed}
      aria-disabled={unavailable.has(id) || undefined}
      onClick={() => dispatch(id)}
      {...rest}
    >
      {children}
    </button>
  )
}

const Layer = React.memo(function Layer({
  entry,
  band,
  floor,
  active,
  near,
  layers,
  video,
}: {
  entry: Entry
  band: Band
  /** The trigger's box on the page: the fit never opens smaller than it. */
  floor?: Size
  active: boolean
  /** Next to the current slide: worth decoding ahead, so a step never shows a gap. */
  near: boolean
  layers: React.RefObject<Map<string, HTMLDivElement>>
  video: React.RefObject<HTMLVideoElement | null>
}) {
  const m = entry.media
  const fitted = fitOf(m, band, floor)
  const gutter = gutterOf(m)
  const w = fitted.w + 2 * gutter
  const h = fitted.h + 2 * gutter
  const blur =
    m.kind === "image" || m.kind === "gif"
      ? m.source.blur
      : m.kind === "video"
        ? m.poster.blur
        : undefined
  const mounted = active || near
  const ref = React.useCallback(
    (el: HTMLDivElement | null) => {
      assert(el, "layer rendered nothing")
      layers.current.set(entry.id, el)
      return () => {
        layers.current.delete(entry.id)
      }
    },
    [entry.id, layers],
  )
  // The crop window and the media box inside it are the engine's (cropEl, mediaEl):
  // the source crop is laid out through --lb-clip-w/h on the layer and flown as
  // two transforms.
  return (
    // biome-ignore lint/a11y/useSemanticElements: a slide is a group, not a fieldset
    <div
      ref={ref}
      className="ag-lb-layer"
      role="group"
      aria-roledescription="slide"
      aria-hidden={!active}
      data-active={active ? "" : undefined}
      data-kind={m.kind}
      // The slide fills the viewport; the media sits in the band inside it.
      style={{
        left: band.left + (band.w - w) / 2,
        top: band.top + (band.h - h) / 2,
        width: w,
        height: h,
      }}
    >
      <div className="ag-lb-crop">
        <div
          className="ag-lb-media"
          style={{ padding: gutter, background: blur }}
        >
          {mounted && (
            <Content m={m} active={active} fitted={fitted} video={video} />
          )}
        </div>
      </div>
    </div>
  )
})

/** A still: the page's pixels paint frame one, the original cross-fades over them
 *  once decoded. The active slide asks for its fit; a neighbour asks for its own
 *  fit at low priority, from `srcset` only. */
function Still({
  source: s,
  alt,
  active,
  fitted,
  upgrades,
}: {
  source: Source
  alt: string
  active: boolean
  fitted: Size
  upgrades: boolean
}) {
  // The live element is the one place the resource answers for: a decode superseded
  // by a `sizes` reselection is silent, a broken original throws with its url.
  const ready = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const url = img.currentSrc
    img.decode().then(
      () => img.setAttribute("data-ready", ""),
      (err: unknown) => {
        if (img.currentSrc === url) throw err
      },
    )
  }
  const failed = (e: React.SyntheticEvent<HTMLImageElement>) => {
    throw new Error(`lightbox: failed to load ${e.currentTarget.currentSrc}`)
  }
  // The upgrade is earned once: a slide that was active keeps its decoded original
  // one slot away instead of regressing to its blur and fading up again on the way
  // back. A neighbour never visited stays base-only (the three-bitmap cap holds).
  const seen = React.useRef(false)
  if (active) seen.current = true
  const upgrade = upgrades && (!!s.srcset || (s.full !== s.src && seen.current))
  return (
    <>
      {/* biome-ignore lint/performance/noImgElement: the page's own pixels, frame one */}
      <img
        className="ag-lb-base"
        src={s.src}
        alt={alt}
        draggable={false}
        // Decoded as part of presenting the first frame: the source is cache-hot and
        // cheap, and a blank first frame under a hidden trigger is the failure.
        decoding="sync"
      />
      {upgrade && (
        // biome-ignore lint/performance/noImgElement: the original, cross-fading in
        <img
          className="ag-lb-up"
          src={s.full}
          srcSet={s.srcset}
          sizes={`${Math.round(fitted.w)}px`}
          fetchPriority={active ? "high" : "low"}
          decoding="async"
          alt=""
          draggable={false}
          onLoad={ready}
          onError={failed}
        />
      )}
    </>
  )
}

/** The slide's video (ui/video): mounted on the active slide only, released when it
 *  leaves. No `poster`: the Still under it is the poster, and a video with no
 *  decoded frame is transparent until the first frame arrives. The browser's bar
 *  is the seek bar; the engine leaves the pointers in its strip to it (CONTROLS_H)
 *  and keeps the keys (space, k, j, l, m) through `video`. */
function SlideVideo({
  m,
  video,
}: {
  m: VideoMedia
  video: React.RefObject<HTMLVideoElement | null>
}) {
  return (
    <Video
      ref={video}
      src={m.src}
      label={m.title}
      controls
      preload="metadata"
      muted={m.muted}
      loop={m.loop}
      start={m.start === undefined ? undefined : m.start * 1000}
      className="ag-lb-video"
      videoClassName="object-contain"
    />
  )
}

function Content({
  m,
  active,
  fitted,
  video,
}: {
  m: Media
  active: boolean
  fitted: Size
  video: React.RefObject<HTMLVideoElement | null>
}) {
  if (m.kind === "image" || m.kind === "gif")
    return (
      <Still
        source={m.source}
        alt={m.alt}
        active={active}
        fitted={fitted}
        upgrades={m.kind === "image"}
      />
    )
  if (m.kind === "video")
    return (
      <>
        <Still
          source={m.poster}
          alt={m.title}
          active={active}
          fitted={fitted}
          upgrades
        />
        {active && <SlideVideo m={m} video={video} />}
      </>
    )
  return active ? (
    <iframe className="ag-lb-frame" src={m.src} title={m.title} />
  ) : (
    <div className="ag-lb-frame-ghost">{m.title}</div>
  )
}
