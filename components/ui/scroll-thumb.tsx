"use client"

// THE SCROLLBAR of a long scroller (a gallery, a table, a long list): overlay thumbs,
// never the browser's bar. The native bar is hidden (`NO_SCROLLBAR`: it takes a gutter
// beside the content and draws a thick track on systems set to always show
// scrollbars); the thumbs take no room, show while the scroller scrolls and for a
// moment after, or while the pointer comes near the edge they sit on, and they drag.
// A long scroller has to say where in it you are, which an edge fade alone does not.
// A short, capped one ends in a fade instead and wears no thumb. `ScrollArea`
// (scroll-area) is the scroller that wears them (`thumb`); place them by hand only
// in a scroller that cannot be one. In either material: plain, or a sliver of glass
// (`material`, or a MaterialProvider round it).
//
// It measures its own scroller, so a consumer only places it: right AFTER the
// scroller, its sibling, where it lays itself over the scroller's box (outside it,
// so a fade on the scroller, a mask, never fades the thumbs); or, in a scroller with
// no fade, as its first child, a box of no height pinned to the view's top-left
// corner. The thumbs hang at the right edge (rows) and the bottom (columns),
// whichever way it overflows.
// A scroller whose top or foot is covered (a head or a foot laid over what scrolls)
// says so the CSS way, `scroll-padding-top` and `-bottom`, which also keep a focused
// row out from under them; the vertical thumb's track runs between them.

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  type Material,
  type Scheme,
  useMaterial,
  useSurfaceScheme,
} from "@/components/ui/material"
import { glassVariants, schemeOf } from "@/components/ui/material-glass"

/** What a scroller wearing thumbs adds to hide the browser's own bar. */
export const NO_SCROLLBAR =
  "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"

/** How long the thumbs linger after the scroll stops, ms. */
const LINGER_MS = 900
/** How close to an edge the pointer must come to call its thumb, px. */
const REACH_PX = 24
/** The thumb's inset from the view's edges, and its shortest length, px. */
const INSET_PX = 4
const MIN_PX = 32

interface Measure {
  top: number
  left: number
  height: number
  width: number
  scrollHeight: number
  scrollWidth: number
  /** The view's top and foot the scroller says are covered (its
   *  `scroll-padding-top` and `-bottom`: a head or a foot laid over what scrolls),
   *  where the vertical thumb never goes. */
  covered: { top: number; bottom: number }
  /** The scroller's own corners, px (its border radius, along each axis): a track
   *  ends where a corner's curve begins, never runs through it and out past the
   *  rounded edge. */
  corners: { topRight: number; bottomRight: number; bottomLeft: number }
  /** Where the box the thumbs hang in really is, px from the view's top and
   *  start edge: a padded scroller (content under a head laid over it) rests it
   *  below its padding, and the thumbs are placed from the view's edge, so this is
   *  taken back. Measured, never moved: a negative margin on the box pulled the
   *  content up under the head with it. */
  hang: { top: number; left: number }
  /** The scroller stands on glass (a glass body says so, `--glass-body`): its
   *  thumbs take the plain face, a quiet line, by default, since glass on glass
   *  nearly always looks bad (Adrian, 2026-10-14). A `material` given by the
   *  caller still wins: the deliberate exception, made with care. */
  onGlass: boolean
}

/** Where `box` (the thumbs' own) lies inside `view`'s visible area, px from its
 *  top and start edge (its border taken off): zero when it hangs at the view's
 *  edge, the padding when a padded view rests it below. */
function hangOf(
  view: HTMLElement,
  box: HTMLElement | null,
): { top: number; left: number } {
  if (!box) return { top: 0, left: 0 }
  const v = view.getBoundingClientRect()
  const b = box.getBoundingClientRect()
  return {
    top: b.top - v.top - view.clientTop,
    left: b.left - v.left - view.clientLeft,
  }
}

/** A corner's radius along one axis, px, from a computed `border-*-radius` ("24px",
 *  or "24px 12px" when the corner is an ellipse: horizontal, then vertical); a
 *  percentage is a share of the box along that axis. */
function cornerOf(el: HTMLElement, value: string, axis: "x" | "y"): number {
  const [h = "0px", v = h] = value.split(" ")
  const part = axis === "x" ? h : v
  const n = Number.parseFloat(part)
  if (Number.isNaN(n))
    throw new Error(`scroll-thumb: border radius "${value}" is no length`)
  return part.endsWith("%")
    ? (n / 100) * (axis === "x" ? el.clientWidth : el.clientHeight)
    : n
}

/** A scroller's `scroll-padding-top` or `-bottom` in px; `auto` (the default)
 *  covers nothing. Its computed value keeps a percentage as one, a share of the
 *  scrollport's height. */
function covered(el: HTMLElement, side: "top" | "bottom"): number {
  const style = getComputedStyle(el)
  const value =
    side === "top" ? style.scrollPaddingTop : style.scrollPaddingBottom
  if (value === "auto") return 0
  const n = Number.parseFloat(value)
  if (Number.isNaN(n))
    throw new Error(
      `scroll-thumb: scroll-padding-${side} "${value}" is no length`,
    )
  return value.endsWith("%") ? (n / 100) * el.clientHeight : n
}

export function ScrollThumbs({
  scroller,
  material,
  scheme,
  className,
}: {
  scroller: React.RefObject<HTMLElement | null>
  /** Plain, the text's colour at a low alpha; glass, a sliver of the material's
   *  glass whose rim lights under the hand. */
  material?: Material
  /** The colour scheme it stands in (material): default the nearest provider's. */
  scheme?: Scheme
  className?: string
}) {
  const look = useMaterial(material)
  // The box the thumbs hang in, measured where it really lies (`hangOf`).
  const own = React.useRef<HTMLDivElement>(null)
  const [m, setM] = React.useState<Measure>({
    top: 0,
    left: 0,
    height: 0,
    width: 0,
    scrollHeight: 0,
    scrollWidth: 0,
    covered: { top: 0, bottom: 0 },
    corners: { topRight: 0, bottomRight: 0, bottomLeft: 0 },
    hang: { top: 0, left: 0 },
    onGlass: false,
  })
  const [scrolling, setScrolling] = React.useState(false)
  const [near, setNear] = React.useState({ y: false, x: false })
  // Beside the scroller (its sibling), where it lies over it: the scroller's box in
  // the parent they share, null while inside it.
  const [over, setOver] = React.useState<{
    top: number
    left: number
    width: number
  } | null>(null)
  React.useEffect(() => {
    const el = scroller.current
    if (!el) return
    const beside = own.current?.parentElement !== el
    let frame = 0
    let still = 0
    const measure = () => {
      const style = getComputedStyle(el)
      if (beside)
        setOver((o) =>
          o &&
          o.top === el.offsetTop &&
          o.left === el.offsetLeft &&
          o.width === el.offsetWidth
            ? o
            : { top: el.offsetTop, left: el.offsetLeft, width: el.offsetWidth },
        )
      setM({
        top: el.scrollTop,
        left: el.scrollLeft,
        height: el.clientHeight,
        width: el.clientWidth,
        scrollHeight: el.scrollHeight,
        scrollWidth: el.scrollWidth,
        covered: { top: covered(el, "top"), bottom: covered(el, "bottom") },
        corners: {
          topRight: cornerOf(el, style.borderTopRightRadius, "y"),
          bottomRight: cornerOf(el, style.borderBottomRightRadius, "y"),
          bottomLeft: cornerOf(el, style.borderBottomLeftRadius, "x"),
        },
        // Beside it the box lies at the scroller's border edge, by construction.
        hang: beside
          ? { top: -el.clientTop, left: -el.clientLeft }
          : hangOf(el, own.current),
        onGlass: style.getPropertyValue("--glass-body").trim() === "1",
      })
    }
    const onScroll = () => {
      setScrolling(true)
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0
          measure()
        })
      window.clearTimeout(still)
      still = window.setTimeout(() => setScrolling(false), LINGER_MS)
    }
    const onMove = (event: PointerEvent) => {
      const box = el.getBoundingClientRect()
      const y = box.right - event.clientX < REACH_PX
      const x = box.bottom - event.clientY < REACH_PX
      setNear((n) => (n.y === y && n.x === x ? n : { y, x }))
    }
    const onLeave = () => setNear({ y: false, x: false })
    // The content's size moves the thumbs as much as the view's: every child of the
    // scroller is watched, and the children as they come and go.
    const sizes = new ResizeObserver(measure)
    const watch = () => {
      sizes.disconnect()
      sizes.observe(el)
      for (const child of el.children) sizes.observe(child)
      // Beside it, the parent's size moves where the scroller lies.
      if (beside && el.parentElement) sizes.observe(el.parentElement)
    }
    const children = new MutationObserver(watch)
    watch()
    children.observe(el, { childList: true })
    measure()
    el.addEventListener("scroll", onScroll, { passive: true })
    el.addEventListener("pointermove", onMove)
    el.addEventListener("pointerleave", onLeave)
    return () => {
      sizes.disconnect()
      children.disconnect()
      el.removeEventListener("scroll", onScroll)
      el.removeEventListener("pointermove", onMove)
      el.removeEventListener("pointerleave", onLeave)
      cancelAnimationFrame(frame)
      window.clearTimeout(still)
    }
  }, [scroller])
  return (
    <div
      aria-hidden="true"
      data-slot="scroll-thumbs"
      className={cn(
        "pointer-events-none z-40 h-0 w-(--ag-thumbs-w) shrink-0",
        // Inside the scroller, pinned to its view's corner; beside it, laid over
        // it where it lies, outside its fade (a mask fades everything inside).
        over === null
          ? "sticky top-0 left-0"
          : "absolute top-(--ag-thumbs-top) left-(--ag-thumbs-left)",
        className,
      )}
      ref={own}
      style={
        {
          "--ag-thumbs-w": `${m.width}px`,
          ...(over === null
            ? {}
            : {
                "--ag-thumbs-top": `${over.top}px`,
                "--ag-thumbs-left": `${over.left}px`,
              }),
        } as React.CSSProperties
      }
    >
      <Thumb
        axis="y"
        scroller={scroller}
        at={m.top}
        view={m.height}
        start={Math.max(m.covered.top, m.corners.topRight)}
        end={Math.max(m.covered.bottom, m.corners.bottomRight)}
        hang={m.hang}
        content={m.scrollHeight}
        across={m.width}
        shown={scrolling || near.y}
        material={m.onGlass && material === undefined ? "plain" : look}
        scheme={scheme}
      />
      <Thumb
        axis="x"
        scroller={scroller}
        at={m.left}
        view={m.width}
        start={m.corners.bottomLeft}
        end={m.corners.bottomRight}
        hang={m.hang}
        content={m.scrollWidth}
        across={m.height}
        shown={scrolling || near.x}
        material={m.onGlass && material === undefined ? "plain" : look}
        scheme={scheme}
      />
    </div>
  )
}

/** One thumb, along `axis`: `at` how far the view is scrolled, `view` its length,
 *  `content` the content's, `across` the view's other dimension (where the bottom
 *  edge is, for the thumb along x). Each thumb is a surface of its own: over a
 *  picture it is read by the part of it under the thumb (the box both hang in has
 *  no height, nothing to read). */
function Thumb({
  axis,
  scroller,
  at,
  view,
  start,
  end,
  hang,
  content,
  across,
  shown,
  material,
  scheme,
}: {
  axis: "x" | "y"
  scroller: React.RefObject<HTMLElement | null>
  at: number
  view: number
  /** Where along the view its track begins (past what covers the view's top, and
   *  past the corner's curve). */
  start: number
  /** How far before the view's end its track stops (before the corner's curve). */
  end: number
  /** Where the box it hangs in lies from the view's top and start edge: every
   *  place, measured from the view, is taken back by it. */
  hang: { top: number; left: number }
  content: number
  across: number
  shown: boolean
  material: Material
  scheme: Scheme | undefined
}) {
  const [s, here] = useSurfaceScheme<HTMLDivElement>(scheme)
  const [held, setHeld] = React.useState(false)
  const drag = React.useRef({ from: 0, at: 0 })
  if (content <= view + 1 || view === 0) return null
  const track = view - start - end - 2 * INSET_PX
  const size = Math.max(MIN_PX, (track * view) / content)
  const travel = track - size
  // A view too short for a thumb past what covers its top (a box shorter than its
  // head, a window dragged small) has no thumb: one drawn there would sit on the
  // cover and run backwards.
  if (travel <= 0) return null
  const y = axis === "y"
  // Placed from the view's edges, then taken back by where the box hangs.
  const offset =
    start +
    INSET_PX +
    (travel * Math.min(at, content - view)) / (content - view) -
    (y ? hang.top : hang.left)
  return (
    <div
      ref={here}
      data-slot="scroll-thumb"
      data-axis={axis}
      data-shown={shown || held || undefined}
      data-held={held || undefined}
      onPointerDown={(event) => {
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        const el = scroller.current
        drag.current = {
          from: y ? event.clientY : event.clientX,
          at: (y ? el?.scrollTop : el?.scrollLeft) ?? 0,
        }
        setHeld(true)
      }}
      onPointerMove={(event) => {
        const el = scroller.current
        if (!held || !el || travel <= 0) return
        const moved =
          ((y ? event.clientY : event.clientX) - drag.current.from) *
          ((content - view) / travel)
        if (y) el.scrollTop = drag.current.at + moved
        else el.scrollLeft = drag.current.at + moved
      }}
      onPointerUp={() => setHeld(false)}
      onPointerCancel={() => setHeld(false)}
      className={cn(
        schemeOf(s),
        "group/thumb pointer-events-auto absolute flex cursor-default opacity-0 transition-opacity duration-300 hover:opacity-100 data-shown:opacity-100 data-shown:duration-100 motion-reduce:transition-none",
        y
          ? "top-0 right-(--ag-thumb-edge) h-(--ag-thumb-size) w-3 translate-y-(--ag-thumb-at) justify-center"
          : "top-(--ag-thumb-edge) left-0 h-3 w-(--ag-thumb-size) translate-x-(--ag-thumb-at) items-center",
      )}
      style={
        {
          "--ag-thumb-at": `${offset}px`,
          "--ag-thumb-size": `${size}px`,
          // Across: 2 px in from the view's right edge (along y), 14 up from its
          // foot (along x), from the box's own edge less where it hangs.
          "--ag-thumb-edge": y
            ? `${2 + hang.left}px`
            : `${across - 14 - hang.top}px`,
        } as React.CSSProperties
      }
    >
      <span
        className={cn(
          material === "glass"
            ? [
                glassVariants({ shape: "surface" }),
                // A pill as thick as the thumb: its radius half of 6 px, of 8 under
                // the hand.
                "[--glass-radius:3px] group-hover/thumb:[--glass-radius:4px] group-data-held/thumb:[--glass-radius:4px]",
                "[--glass-moves:width_150ms,height_150ms] [--glass-change-duration:150ms] [--glass-tint:rgb(255_255_255/0.4)] scheme-dark:[--glass-tint:rgb(255_255_255/0.3)] group-hover/thumb:[--glass-rim:1.8]! group-data-held/thumb:[--glass-rim:1.8]!",
              ]
            : "rounded-full bg-foreground/35 transition-[width,height,background-color] duration-150 group-hover/thumb:bg-foreground/55 group-data-held/thumb:bg-foreground/55 motion-reduce:transition-none",
          y
            ? "h-full w-1.5 group-hover/thumb:w-2 group-data-held/thumb:w-2"
            : "h-1.5 w-full group-hover/thumb:h-2 group-data-held/thumb:h-2",
        )}
      />
    </div>
  )
}
