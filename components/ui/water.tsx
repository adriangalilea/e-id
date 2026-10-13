"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// LOADING IS WATER. What has not come yet lies under it; what has come surfaces.
// `calm`: still water, for something waiting (its turn has not come, it is queued):
// the content softened, a little of its colour drained, a dark grey over it. `falling`:
// a drop falls in that water, for something on its way (loading): broad swells travel
// out from the middle, bending the content as they pass and settling as they widen,
// then the next drop. No state: the content stands clear, and whatever replaces it
// (the video, the loaded page) comes in sharp. Nothing is laid over the content: it is
// an SVG filter on the content itself, so the water reads through the content's own
// pixels, and the tint falls only where something is drawn. One drawing for every
// loading state in the registry; the values are set by eye on a gallery's videos
// waiting and loading (Adrian, 2026-10-11: a dimmed or blurred still read as
// unavailable, a breathing one and a pane of frost with a light passing as cheap; the
// pond he loved). No drop falls under reduced motion; the water stays calm.

export type WaterState = "calm" | "falling"

/** One drop: its swells reach past the content's corners in this long, slowing as
 *  water does, and the next falls. */
const DROP_MS = 2600
/** How far the content is pushed at the swells' crest when the drop falls, px, fading
 *  to nothing as they widen. */
const DROP_DEPTH = 34
/** How soft the content is under the water, px. */
const WATER_BLUR = 5
/** How much of its colour the content keeps under the water, and how much of a dark
 *  grey (zinc-900, the dark glass's own ground) lies over it: a hint. Darker, the
 *  content coming clear jumped in brightness, a flash on a bright picture (Adrian,
 *  2026-10-11); the water is told by its swells, not by a shade. */
const WATER_SATURATION = 0.92
const WATER_TINT = 0.1

/** The swells as a displacement map, made once: red and green push the content along
 *  x and y (128 is still), each pixel pushed outward or inward from the middle by
 *  broad crests two fifths of the radius apart, rising toward the front and falling
 *  off at it, so the disc's edge meets still water. */
let swellMap: string | null = null
function swellsOf(): string {
  if (swellMap) return swellMap
  const size = 256
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D
  const image = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / (size / 2) - 1
      const dy = (y + 0.5) / (size / 2) - 1
      const r = Math.hypot(dx, dy)
      const wave =
        r > 1 || r === 0
          ? 0
          : Math.sin((r / 0.4) * Math.PI * 2) * r ** 1.2 * (1 - r ** 6)
      const at = (y * size + x) * 4
      image.data[at] = 128 + Math.round(127 * wave * (r ? dx / r : 0))
      image.data[at + 1] = 128 + Math.round(127 * wave * (r ? dy / r : 0))
      image.data[at + 2] = 128
      image.data[at + 3] = 255
    }
  ctx.putImageData(image, 0, 0)
  swellMap = canvas.toDataURL()
  return swellMap
}

type Size = { width: number; height: number }

/** How long the water takes to rise over content going under, and to ebb from content
 *  coming clear: as long as a video takes to surface over it, so the two cross. Cut
 *  in one frame, the water landed and lifted as a jump. */
const RISE_MS = 500

/** Linear progress to an even ease, slow at both ends. */
const ease = (p: number) => p * p * (3 - 2 * p)

/** The water's filter, drawn in the content's own pixels (`size`) so the swells stay
 *  round on content of any shape. `state` is where it is going: the water rises to it
 *  and ebbs from it, every part at once (the softness, the shade, the drained colour,
 *  the drops), and once it has ebbed to nothing `onGone` lets the filter go. */
function WaterFilter({
  id,
  size,
  state,
  onGone,
}: {
  id: string
  size: Size
  state: WaterState | null
  onGone: () => void
}) {
  const swells = React.useRef<SVGFEImageElement>(null)
  const soft = React.useRef<SVGFEGaussianBlurElement>(null)
  const push = React.useRef<SVGFEDisplacementMapElement>(null)
  const drain = React.useRef<SVGFEColorMatrixElement>(null)
  const grey = React.useRef<SVGFEFloodElement>(null)
  // Read each frame, so a change of state steers the water already moving.
  const live = React.useRef({ state, size, onGone })
  live.current = { state, size, onGone }
  React.useEffect(() => {
    const image = swells.current
    const blur = soft.current
    const map = push.current
    const colour = drain.current
    const shade = grey.current
    if (!image || !blur || !map || !colour || !shade) return
    image.setAttribute("href", swellsOf())
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches
    // How far the water has risen, and how much of a drop is falling, 0 to 1.
    let water = 0
    let drops = 0
    let dropFrom = 0
    let last = performance.now()
    let frame = 0
    const toward = (from: number, to: number, step: number) =>
      from < to ? Math.min(to, from + step) : Math.max(to, from - step)
    const tick = (now: number) => {
      const { state, size } = live.current
      const step = (now - last) / RISE_MS
      last = now
      water = toward(water, state ? 1 : 0, step)
      const falling = state === "falling" && !still
      if (falling && drops === 0) dropFrom = now
      drops = toward(drops, falling ? 1 : 0, step)
      const w = ease(water)
      blur.setAttribute("stdDeviation", String(WATER_BLUR * w))
      colour.setAttribute("values", String(1 - (1 - WATER_SATURATION) * w))
      shade.setAttribute("flood-opacity", String(WATER_TINT * w))
      const t = ((now - dropFrom) % DROP_MS) / DROP_MS
      // The front slows as it widens (ease-out), far enough to pass the farthest
      // corner; the swells fade evenly as they widen, so a drop is seen across the
      // whole content, not only where it fell.
      const corner = Math.hypot(size.width, size.height) / 2
      const reach = corner * (0.05 + 1.1 * (1 - (1 - t) ** 2.2))
      image.setAttribute("x", String(size.width / 2 - reach))
      image.setAttribute("y", String(size.height / 2 - reach))
      image.setAttribute("width", String(reach * 2))
      image.setAttribute("height", String(reach * 2))
      map.setAttribute("scale", String(DROP_DEPTH * (1 - t) * ease(drops) * w))
      if (!state && water === 0) {
        live.current.onGone()
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])
  return (
    <svg
      aria-hidden="true"
      data-slot="water-filter"
      className="absolute size-0"
    >
      <filter
        id={id}
        x="0"
        y="0"
        width="1"
        height="1"
        colorInterpolationFilters="sRGB"
      >
        {/* Still where no swell is: the map lies over a flat middle grey. */}
        <feFlood floodColor="rgb(128 128 128)" result="still" />
        <feImage ref={swells} preserveAspectRatio="none" result="swells" />
        <feComposite in="swells" in2="still" operator="over" result="map" />
        <feGaussianBlur
          ref={soft}
          in="SourceGraphic"
          stdDeviation="0"
          edgeMode="duplicate"
          result="soft"
        />
        <feDisplacementMap
          ref={push}
          in="soft"
          in2="map"
          scale="0"
          xChannelSelector="R"
          yChannelSelector="G"
          result="moved"
        />
        <feColorMatrix
          ref={drain}
          in="moved"
          type="saturate"
          values="1"
          result="drained"
        />
        {/* The dark grey only where something is drawn: a card's rounded corners and
            the ground between words stay clear. */}
        <feFlood
          ref={grey}
          floodColor="rgb(24 24 27)"
          floodOpacity="0"
          result="grey"
        />
        <feComposite in="grey" in2="drained" operator="in" result="tint" />
        <feComposite in="tint" in2="drained" operator="over" />
      </filter>
    </svg>
  )
}

/** Water on an element you cannot wrap (an `<img>` sized by its own classes): put
 *  `ref` and `style` on it and render `filter` beside it. `state` null: the element
 *  comes clear (the water ebbs, then no filter is drawn). */
export function useWater<E extends HTMLElement>(
  state: WaterState | null,
): {
  ref: React.RefCallback<E>
  style: React.CSSProperties | undefined
  filter: React.ReactNode
} {
  const id = `ag-water-${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`
  const [el, setEl] = React.useState<E | null>(null)
  const [size, setSize] = React.useState<Size | null>(null)
  // The element's own corners: a filter is drawn after the element's clip, so the
  // blur spreads past rounded corners into soft square ones; clipping the filtered
  // result to the same corners (clip-path comes after filter) keeps the shape.
  const [corners, setCorners] = React.useState("0px")
  // Under water from the moment a state is asked until the water has ebbed after it.
  const [wet, setWet] = React.useState(false)
  React.useEffect(() => {
    if (state) setWet(true)
  }, [state])
  React.useEffect(() => {
    if (!wet || !el) return
    const read = () => {
      setSize({ width: el.clientWidth, height: el.clientHeight })
      setCorners(getComputedStyle(el).borderRadius)
    }
    read()
    const observer = new ResizeObserver(read)
    observer.observe(el)
    return () => observer.disconnect()
  }, [wet, el])
  const dry = React.useCallback(() => setWet(false), [])
  const under = wet && size !== null
  return {
    ref: setEl,
    style: under
      ? { filter: `url(#${id})`, clipPath: `inset(0 round ${corners})` }
      : undefined,
    filter: under ? (
      <WaterFilter id={id} size={size} state={state} onGone={dry} />
    ) : null,
  }
}

/** Anything under water: a picture, a card, a panel, a list. `state` null stands it
 *  clear. Sized and laid out as a plain `div` (`className`). */
export function Water({
  state,
  className,
  children,
}: {
  state: WaterState | null
  className?: string
  children: React.ReactNode
}) {
  const water = useWater<HTMLDivElement>(state)
  return (
    <div
      ref={water.ref}
      data-slot="water"
      data-state={state ?? undefined}
      className={cn("relative", className)}
      style={water.style}
    >
      {children}
      {water.filter}
    </div>
  )
}
