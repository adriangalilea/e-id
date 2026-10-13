"use client"

// A PICTURE THAT ARRIVES: a plain `<img>` held until it has really loaded, then
// faded in, for a picture the optimizer should not touch (an avatar, a poster, a
// thumbnail, a favicon: any origin, any size). Part of `image` (whose Image arrives
// the same way) but free of next/image, so an item that must not assume Next (an
// avatar, a quote) can use it. Every `<img>` in this registry is this or Image.

import type * as React from "react"
import { type Ref, useState } from "react"
import { cn } from "@/lib/utils"

/** How a picture arrives, said once for Image and Img: held clear and a little
 *  blurred until it is decoded, then it fades and sharpens in, never under reduced
 *  motion's blur. A picture that never arrives stays clear: the browser's broken
 *  glyph and its alt text drawn over the frame are not a picture, and what stands
 *  behind (the frame's tone, the host's stand-in) is the honest face; the alt stays
 *  for a screen reader. Keyed on the element's own data-state. */
const ARRIVAL =
  "transition-[opacity,filter] duration-300 ease-out motion-reduce:transition-none data-[state=loading]:opacity-0 motion-safe:data-[state=loading]:blur-sm data-[state=error]:opacity-0"

/** Where a picture stands in its arrival. None until the page is live: only React
 *  can mark a picture ready, so a picture held from the server's HTML waited for
 *  hydration however early it landed (a cached poster, there in 0.4 s, stayed
 *  blank for seconds on a heavy page). The first paint holds nothing and the
 *  browser paints each picture as it lands; once live, one still on its way is
 *  held and fades in, one already there is ready. Read from the element, since a
 *  load that finished before hydration fired before React was listening. */
export type Arrival = "loading" | "ready" | "error" | undefined

export type ImgProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src"
> & {
  src: string
  /** Where else the picture is, tried in order when one fails or comes back too
   *  small (`minWidth`): a host's sizes, largest first (YouTube's maxres, then
   *  hq). The picture is held until one arrives; none arriving is the error face. */
  fallbacks?: string[]
  /** The narrowest a picture may be, in its natural pixels, to count as arrived.
   *  A host that answers a missing size with a stand-in (YouTube's 120 px grey for
   *  a maxres it never made) is told apart by this, and the next source is tried. */
  minWidth?: number
  ref?: Ref<HTMLImageElement>
}

/** The picture. A new `src` is a new arrival. */
export function Img(props: ImgProps) {
  return <ImgSources key={props.src} {...props} />
}

/** What a loaded picture is: arrived, or not this source after all (a stand-in too
 *  narrow, or nothing), judged the same whether it landed before React was
 *  listening (read in the ref) or after (the load event). */
function judge(el: HTMLImageElement, minWidth: number): "arrived" | "missing" {
  return el.naturalWidth > 0 && el.naturalWidth >= minWidth
    ? "arrived"
    : "missing"
}

function ImgSources({
  src,
  fallbacks = [],
  minWidth = 0,
  className,
  onLoad,
  onError,
  ref,
  ...props
}: ImgProps) {
  const sources = [src, ...fallbacks]
  const [at, setAt] = useState(0)
  const [state, setState] = useState<Arrival>()
  const last = at === sources.length - 1
  // Settles the source shown: arrived, or on to the next, or the error face.
  const settle = (verdict: "arrived" | "missing") => {
    if (verdict === "arrived") return setState("ready")
    if (last) return setState("error")
    setAt(at + 1)
    setState("loading")
  }
  const attach = (el: HTMLImageElement | null) => {
    if (el) {
      if (!el.complete) setState("loading")
      else settle(judge(el, minWidth))
    }
    if (typeof ref === "function") ref(el)
    else if (ref) ref.current = el
  }
  return (
    // biome-ignore lint/performance/noImgElement: the unoptimized picture, by design
    // biome-ignore lint/a11y/useAltText: alt passes through with the rest of the props
    <img
      {...props}
      src={sources[at]}
      ref={attach}
      data-state={state}
      onLoad={(event) => {
        settle(judge(event.currentTarget, minWidth))
        onLoad?.(event)
      }}
      onError={(event) => {
        settle("missing")
        onError?.(event)
      }}
      className={cn(ARRIVAL, className)}
    />
  )
}
