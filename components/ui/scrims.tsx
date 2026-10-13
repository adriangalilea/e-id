"use client"

// Top and bottom viewport scrims, scroll-linked (see scrims.css for why they are never
// transitioned). Pure CSS where animation-timeline: scroll() exists; a passive scroll
// listener measures opacity elsewhere. Place it inside the element that scrolls
// (the document, or a scrolling inset): the timeline is scroll(nearest).

import * as React from "react"
import { cn } from "@/lib/utils"
import "./scrims.css"

export interface ScrimsProps {
  /** A sticky blurred header IS a top scrim; such a page opts out of this one. */
  top?: boolean
  bottom?: boolean
  /** Absolute overlays stay inside a positioned container, such as a phone. */
  position?: "fixed" | "absolute"
  /** Static scrims protect floating chrome even at the end of a conversation. */
  mode?: "scroll" | "static"
  className?: string
  /** Explicit scroll owner, independent of where the overlays are painted. */
  scrollRef?: React.RefObject<HTMLElement | null>
}

export function Scrims({
  top = true,
  bottom = true,
  position = "fixed",
  mode = "scroll",
  className,
  scrollRef,
}: ScrimsProps) {
  const topRef = React.useRef<HTMLDivElement>(null)
  const bottomRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (mode === "static" || (!top && !bottom)) return
    if (!scrollRef && CSS.supports("animation-timeline: scroll()")) return
    let ancestor = (topRef.current ?? bottomRef.current)?.parentElement
    while (
      ancestor &&
      !/(auto|scroll|hidden)/.test(getComputedStyle(ancestor).overflowY)
    )
      ancestor = ancestor.parentElement
    const target =
      scrollRef?.current ??
      ancestor ??
      (document.scrollingElement as HTMLElement)
    const measure = () => {
      const y = target.scrollTop
      const remaining = target.scrollHeight - target.clientHeight - y
      if (topRef.current)
        topRef.current.style.opacity = String(Math.max(0, Math.min(1, y / 160)))
      if (bottomRef.current)
        bottomRef.current.style.opacity = String(
          Math.max(0, Math.min(1, remaining / 140)),
        )
    }
    const source = target === document.scrollingElement ? window : target
    source.addEventListener("scroll", measure, { passive: true })
    window.addEventListener("resize", measure)
    const resize = new ResizeObserver(measure)
    const observe = () => {
      resize.disconnect()
      resize.observe(target)
      for (const child of target.children) resize.observe(child)
      measure()
    }
    const mutation = new MutationObserver(observe)
    mutation.observe(target, {
      childList: true,
      subtree: true,
      characterData: true,
    })
    observe()
    measure()
    return () => {
      source.removeEventListener("scroll", measure)
      window.removeEventListener("resize", measure)
      resize.disconnect()
      mutation.disconnect()
    }
  }, [mode, top, bottom, scrollRef])

  return (
    <>
      {bottom && (
        <div
          ref={bottomRef}
          data-slot="scrim-bottom"
          style={{ margin: 0, animation: scrollRef ? "none" : undefined }}
          aria-hidden
          data-position={position}
          data-mode={mode}
          className={cn("ag-scrim", className)}
          data-edge="bottom"
        />
      )}
      {top && (
        <div
          ref={topRef}
          data-slot="scrim-top"
          style={{ margin: 0, animation: scrollRef ? "none" : undefined }}
          aria-hidden
          data-position={position}
          data-mode={mode}
          className={cn("ag-scrim", className)}
          data-edge="top"
        />
      )}
    </>
  )
}
