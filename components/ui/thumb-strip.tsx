"use client"

// A row of thumbnails with the active one lit, for a reel: the lightbox's top bar, a
// media page's set. The active thumb is kept centred INSTANTLY (the cursor law: a
// smooth scroll is a second animation racing the step, and a reader holding an arrow
// key outruns it, so the strip spends the whole run pointing at a slide that already
// left). The edges fade only when the row is longer than the strip: a signal, never
// chrome. A click jumps. Thumbs are sized by their aspect at one height, capped at
// 2:1; an item without an image shows its label. Monochrome: the alpha ladder alone
// tells the active one. Two materials (`material`): plain, on whatever holds it;
// glass, a bar of the material's glass, the active thumb ringed in the rim's light.

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  type Material,
  type Scheme,
  useMaterial,
  useSurfaceScheme,
} from "@/components/ui/material"
import { glassVariants, schemeOf } from "@/components/ui/material-glass"

export type ThumbStripItem = {
  id: string
  /** The thumbnail: the item's own image, or a video's poster. None shows `label`. */
  src?: string
  /** The item's natural size; only the aspect is read. */
  width: number
  height: number
  /** Names the item to a screen reader, and stands in for a missing image. */
  label: string
  /** Marks the thumb as a video. */
  video?: boolean
}

/** Thumb height when none is given; the strip is this plus 8 px above and below. */
const HEIGHT = 32
/** The widest a thumb gets, as a multiple of its height. */
const MAX_ASPECT = 2

// edge: it fades its own sides (the mask below) when the row is longer than it.
const NAV =
  "relative min-w-0 flex-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden data-overflow:[mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]"
const ROW = "flex w-max gap-1.5 px-4 py-2"
const THUMB =
  "relative h-(--ag-thumb-strip-h) w-(--ag-thumb-w) flex-none cursor-pointer overflow-hidden rounded-[4px] border-0 bg-current/5 p-0 text-inherit opacity-(--alpha-meta) transition-opacity duration-(--dur-1) ease-(--ease-out) motion-reduce:transition-none hover:opacity-(--alpha-body) focus-visible:opacity-(--alpha-body) aria-[current=true]:opacity-100"
/** A video thumb says so: one small mark, no second hue. Ink over MEDIA, not over a
 *  surface, so it cannot follow the theme (a photograph is the same in light and
 *  dark); it stays off the screen's ceiling, and the shadow is what makes it legible
 *  on a pale still. The triangle and its shadow are ONE picture (an SVG with 2 px of
 *  room round the 7 x 8 triangle for the shadow): a drop-shadow filter on a clipped
 *  box is drawn round the unclipped box in some renderers, a grey square behind the
 *  triangle. */
const PLAY = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="12" viewBox="0 0 11 12"><filter id="s" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="1" flood-color="#000" flood-opacity="0.6"/></filter><polygon points="2,2 9,6 2,10" fill="#f5f5f5" filter="url(#s)"/></svg>',
)}")`
const VIDEO_MARK =
  "after:absolute after:right-px after:bottom-px after:h-3 after:w-[11px] after:bg-(image:--ag-thumb-play) after:content-['']"
const LABEL =
  "block size-full truncate px-1.5 text-center font-mono text-[0.625rem] lowercase leading-(--ag-thumb-strip-h)"
const COUNTER = "flex-none opacity-(--alpha-meta) tabular-nums"

/** Plain: the strip lies on whatever holds it. Glass: the strip is a bar of the
 *  material's glass (the counter inside it), its thumbs rounder, the active one ringed
 *  in the rim's light. */
const FACE: Record<Material, { root: string; thumb: string }> = {
  plain: { root: "", thumb: "" },
  glass: {
    root: "pl-4 [--glass-radius:18px]",
    thumb:
      "rounded-[6px] aria-[current=true]:ring-1 aria-[current=true]:ring-white/70",
  },
}

export function ThumbStrip({
  items,
  index,
  onJump,
  height = HEIGHT,
  counter = false,
  material,
  scheme,
  className,
}: {
  items: ThumbStripItem[]
  index: number
  onJump: (index: number) => void
  height?: number
  /** "2 / 14" before the strip. */
  counter?: boolean
  material?: Material
  /** The colour scheme it stands in (material): default the nearest provider's;
   *  a reel over pictures stands in a stage that says dark. */
  scheme?: Scheme
  className?: string
}) {
  const m = useMaterial(material)
  // Over a picture it is read by the part of it under the strip.
  const [s, here] = useSurfaceScheme<HTMLDivElement>(scheme)
  const nav = React.useRef<HTMLElement>(null)
  const active = React.useRef<HTMLButtonElement>(null)
  // The strip's own scroll, never scrollIntoView: that moves every scrolling
  // ancestor too, and a page whose bar holds the strip would jump with each step.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the active thumb moves with index
  React.useLayoutEffect(() => {
    const el = nav.current
    const a = active.current
    if (!el || !a) throw new Error("thumb-strip: no active thumb")
    el.scrollLeft = a.offsetLeft + a.offsetWidth / 2 - el.clientWidth / 2
  }, [index, items])
  React.useLayoutEffect(() => {
    const el = nav.current
    if (!el) throw new Error("thumb-strip rendered nothing")
    const measure = () =>
      el.toggleAttribute("data-overflow", el.scrollWidth > el.clientWidth + 1)
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [])
  return (
    <div
      ref={here}
      data-slot="thumb-strip"
      data-material={m}
      className={cn(
        schemeOf(s),
        m === "glass" && glassVariants({ shape: "surface" }),
        "flex min-w-0 items-center gap-4",
        FACE[m].root,
        className,
      )}
      style={
        {
          "--ag-thumb-strip-h": `${height}px`,
          "--ag-thumb-play": PLAY,
        } as React.CSSProperties
      }
    >
      {counter && (
        <span data-slot="thumb-strip-counter" className={COUNTER}>
          {index + 1} / {items.length}
        </span>
      )}
      <nav
        ref={nav}
        data-slot="thumb-strip-nav"
        className={NAV}
        aria-label="thumbnails"
      >
        <div className={ROW}>
          {items.map((item, i) => (
            <button
              key={item.id}
              ref={i === index ? active : undefined}
              type="button"
              data-slot="thumb-strip-thumb"
              className={cn(THUMB, FACE[m].thumb, item.video && VIDEO_MARK)}
              aria-current={i === index ? "true" : undefined}
              aria-label={`${i + 1} of ${items.length} · ${item.label}`}
              style={
                {
                  "--ag-thumb-w": `${Math.min(Math.round((height * item.width) / item.height), height * MAX_ASPECT)}px`,
                } as React.CSSProperties
              }
              onClick={() => onJump(i)}
            >
              {item.src ? (
                // biome-ignore lint/performance/noImgElement: the reel's own rendition
                <img
                  src={item.src}
                  alt=""
                  draggable={false}
                  loading="lazy"
                  className="block size-full object-cover"
                />
              ) : (
                <span className={LABEL}>{item.label}</span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
