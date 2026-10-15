"use client"

import { useRender } from "@base-ui/react/use-render"
import * as React from "react"
import { NO_SCROLLBAR, ScrollThumbs } from "@/components/ui/scroll-thumb"
import { cn } from "@/lib/utils"
import "./edge-fade"

// THE CAPPED SCROLLER, the one everything that scrolls inside the page scrolls with
// (a list in a popover, a kanban's column, a panel of a set height): give it a
// height cap and it scrolls inside itself, the browser's bar never shown. Its ends:
//
//   fade   (the default) what it holds fades itself out at an end with more to
//          show (scrims' `ag-edge-fade-y`, as deep as `CAPPED_FADE`), nothing
//          painted over it, so it sits on any surface, glass included.
//   none   `fade={false}`: the body of a glass panel, whose glass spills what nears
//          its edge round it (material-glass, `GlassSpill`), the glass ending it.
//          A fade there and a spill over it ended it twice.
//
// `thumb` adds overlay thumbs (scroll-thumb): a long scroller, where you need to know
// where in it you are, asks for them; a short one ends in its fade alone.
// `cover` and `coverEnd` are what is laid OVER its top and its foot (a panel's head
// and foot, never in its flow): what it holds starts below the one and ends above
// the other and passes beneath both, a focused row stops clear of them, the thumbs
// run between them, and a fade starts where the rows come out from under them. A
// front lies over it, never inside it: its fade is a mask, which makes it a backdrop
// root, and a glass front inside it would blur nothing.
// It takes its surface's corners (`rounded-[inherit]`): put it straight inside the
// surface and what it holds runs into the surface's own edge. No padding of its own:
// the caller's `className` holds it, with the height cap (a cover is its end's
// padding). At its top and foot the scroll goes on into the page (no
// `overscroll-*`).
//
//   <ScrollArea className="max-h-80 space-y-2 px-4 py-5">{rows}</ScrollArea>
//   <ScrollArea thumb cover="3rem" className="max-h-[40rem]">{long}</ScrollArea>
//
// A panel that scrolls (`Panel` `maxHeight`, `height`) is one already: reach for this
// inside a panel only for a part of it that scrolls on its own (a board's columns).

/** How deep a capped scroller's end fades: one length for every container that
 *  scrolls, so their ends read the same. */
export const CAPPED_FADE = "[--edge-fade:1rem]"

export interface ScrollAreaProps extends useRender.ComponentProps<"div"> {
  /** Overlay thumbs while it scrolls (scroll-thumb). Off: a short scroller ends in
   *  its fade alone. */
  thumb?: boolean
  /** Its ends fade out. Off only where a glass panel's spill ends it. Default on. */
  fade?: boolean
  /** The length of what is laid over its top (a head), a CSS length: what it
   *  holds starts below it and passes beneath it. */
  cover?: string
  /** The same for what is laid over its foot (a panel's foot). */
  coverEnd?: string
}

export function ScrollArea({
  thumb = false,
  fade = true,
  cover,
  coverEnd,
  render,
  className,
  style,
  ref,
  ...props
}: ScrollAreaProps) {
  const own = React.useRef<HTMLDivElement | null>(null)
  const both = React.useCallback(
    (node: HTMLDivElement | null) => {
      own.current = node
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )
  const covers = {
    ...(cover === undefined ? {} : { "--scroll-area-cover": cover }),
    ...(coverEnd === undefined ? {} : { "--scroll-area-cover-end": coverEnd }),
  }
  // `render`: the scroller is another element (Base UI's list in a select or a
  // combobox, a `<ul>`), which takes these props.
  const scroller = useRender({
    defaultTagName: "div",
    render,
    ref: both,
    props: {
      // Its slot unless the caller names it (a dialog's body, a panel's scroller).
      "data-slot": "scroll-area",
      ...props,
      className: cn(
        "relative min-h-0 rounded-[inherit]",
        fade
          ? ["ag-edge-fade-y", CAPPED_FADE]
          : ["overflow-y-auto", NO_SCROLLBAR],
        className,
        // After the caller's: a cover IS its end's padding, so pad what it holds
        // inside it (a panel's body) rather than the scroller.
        cover !== undefined && [
          "scroll-pt-(--scroll-area-cover) pt-(--scroll-area-cover)",
          fade && "[--edge-cover:var(--scroll-area-cover)]",
        ],
        coverEnd !== undefined && [
          "scroll-pb-(--scroll-area-cover-end) pb-(--scroll-area-cover-end)",
          fade && "[--edge-cover-end:var(--scroll-area-cover-end)]",
        ],
      ),
      style: { ...covers, ...style } as React.CSSProperties,
    },
  })
  if (!thumb) return scroller
  return (
    <>
      {scroller}
      {/* Beside the scroller, laid over it: inside, its fade would fade them too. */}
      <ScrollThumbs scroller={own} />
    </>
  )
}
