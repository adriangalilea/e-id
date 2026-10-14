"use client"

// Progressive arrival for sections, headings, media, lists. Wrap a region and it
// fades up as it enters the viewport (or at once, if any of it is on screen when the
// page loads); `stagger` lets its direct children take turns.
// The default mode is one-shot (data-in via IntersectionObserver, then the observer
// is gone); mode="scroll" is pure CSS and reversible. Reduced motion: inert.

import * as React from "react"
import "./reveal.css"

type Tag =
  | "div"
  | "section"
  | "article"
  | "header"
  | "ul"
  | "ol"
  | "figure"
  | "li"

export interface RevealProps extends React.HTMLAttributes<HTMLElement> {
  as?: Tag
  /** "once": arrive and stay (default). "scroll": tied to the scroll position. */
  mode?: "once" | "scroll"
  /** "up": fade + 16px rise (default). "fade": opacity only. */
  from?: "up" | "fade"
  /** Direct children arrive one after another, this many ms apart. Once mode only. */
  stagger?: number
  /** Fraction of the element that must be visible before it arrives. Default 0.2. */
  threshold?: number
  /** Ms after the page's navigation before something on screen at load may
   *  arrive: its moment in the page's arrival, on the document's clock, so
   *  several pieces keep their order however long each took to hydrate. Past
   *  that moment, or for what scrolls in later, it arrives at once. */
  at?: number
}

export function Reveal({
  as = "div",
  mode = "once",
  from = "up",
  stagger,
  threshold = 0.2,
  at,
  className,
  style,
  children,
  ...rest
}: RevealProps) {
  const ref = React.useRef<HTMLElement>(null)
  React.useEffect(() => {
    if (mode !== "once") return
    const el = ref.current
    if (!el) return
    // Already on screen when the page arrives, even by a sliver: it arrives now.
    // Reveal is for what scrolls INTO view; holding back what the reader can
    // already see leaves a blank where a card should be until they scroll.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.dataset.in = ""
      return
    }
    if (el.getBoundingClientRect().top < window.innerHeight) {
      const now = Number(document.timeline.currentTime ?? performance.now())
      const wait = Math.max(0, (at ?? 0) - now)
      if (wait === 0) {
        el.dataset.in = ""
        return
      }
      const timer = setTimeout(() => {
        el.dataset.in = ""
      }, wait)
      return () => clearTimeout(timer)
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        el.dataset.in = ""
        io.disconnect()
      },
      // Tall elements may never reach a 20% ratio on a short viewport; a top-edge
      // root margin lets them arrive once their head is well inside.
      { threshold, rootMargin: "0px 0px -10% 0px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [mode, threshold, at])
  return React.createElement(
    as,
    {
      ref,
      className: `ag-reveal${className ? ` ${className}` : ""}`,
      "data-mode": mode,
      "data-from": from,
      "data-stagger": stagger !== undefined ? "" : undefined,
      style:
        stagger !== undefined
          ? ({ "--stagger": `${stagger}ms`, ...style } as React.CSSProperties)
          : style,
      ...rest,
    },
    children,
  )
}
