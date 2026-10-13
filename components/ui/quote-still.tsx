"use client"

// A still from `renderQuoteSvg`, inlined in a page, with its noise on the page's pixels.
//
// The markup is right for the raster it was drawn for, one still unit to one pixel. On a
// page the still is shown at whatever width its column gives it, and the grain and the
// dissolve's dither are speckles one DEVICE pixel wide: drawn at any other scale they
// are resampled, averaged away, and the glow and the dissolve band. Only the page knows
// the width and the pixel ratio, so this is where the tile is put on them (`GRAIN_FIT`
// in quote-card is the contract), again on every resize.

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { assert, GRAIN_FIT } from "@/lib/quote-card"

/** One device pixel per tile pixel, the tile's origin on a device pixel. Setting an
 *  attribute on two patterns per resize: the browser re-rasterizes one tile per scale,
 *  which it does on a resize anyway, and composites the bitmap on every other paint. */
function fitGrain(still: SVGSVGElement): void {
  const box = still.getBoundingClientRect()
  // A still that is not laid out (display: none, a closed panel) has no pixels to fit.
  if (box.width === 0) return
  const dpr = window.devicePixelRatio
  const scale =
    (GRAIN_FIT.fine * still.viewBox.baseVal.width) / (box.width * dpr)
  assert(
    scale >= 1,
    `a still ${Math.round(box.width * dpr)} device pixels wide is finer than its noise's user space carries (${GRAIN_FIT.fine}x): WebKit would stretch the tile and the grain would average away. Raise GRAIN_FIT.fine`,
  )
  const dx = -((box.left * dpr) % 1)
  const dy = -((box.top * dpr) % 1)
  for (const pattern of still.querySelectorAll(GRAIN_FIT.selector))
    pattern.setAttribute(
      "patternTransform",
      `scale(${scale}) translate(${dx} ${dy})`,
    )
}

export function QuoteStill({
  svg,
  className,
}: {
  /** `renderQuoteSvg`'s output. */
  svg: string
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new `svg` replaces the <svg> element the observer watches, so the effect must follow it
  useEffect(() => {
    const still = ref.current?.querySelector("svg")
    assert(still, "QuoteStill was given no <svg>: pass renderQuoteSvg's output")
    const observer = new ResizeObserver(() => fitGrain(still))
    observer.observe(still)
    return () => observer.disconnect()
  }, [svg])
  return (
    <div
      ref={ref}
      data-slot="quote-still"
      className={cn("[&>svg]:block [&>svg]:h-auto [&>svg]:w-full", className)}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: renderQuoteSvg escapes every value it interpolates
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
