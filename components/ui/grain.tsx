"use client"

// GRAIN: a screen of fine white noise over whatever it covers, alive, the way a
// screen's static is and a print's grain is not: specks of light, one pixel each,
// most of them faint and a few bright, jumping to new places a dozen times a
// second. Analog in how it moves (a signal's snow), digital in what it is made of
// (square pixels, white, sharp). Over a page it binds the layers into one
// material, so a translucent surface, a light's falloff and glass read as one
// thing and never as smooth bands.
//
// It costs nothing per frame: one tile of noise is made once (seeded, on a canvas,
// at the screen's own pixels so a speck is one pixel and stays sharp), laid as a
// pattern on a layer larger than the box, and the layer jumps between places by a
// transform the compositor runs (Web Animations, `steps`), never a repaint.
// Under reduced motion it stands still. Added to the light (`plus-lighter`), so it
// only ever lightens.
//
// It fills its positioned parent (`absolute inset-0`); a page wears it as a fixed
// layer over everything (`fixed inset-0 z-50`). It takes no pointer.

import * as React from "react"
import { cn } from "@/lib/utils"

export interface GrainProps {
  /** How much it shows, 0 to 1: its layer's opacity. */
  strength?: number
  /** The share of pixels that are a bright speck rather than the faint snow. */
  sparkle?: number
  /** New places a second. */
  rate?: number
  /** A speck's size in CSS pixels: 1 is the finest the screen draws (a device
   *  pixel at 1x), 2 a coarser, more retro grain. */
  cell?: number
  className?: string
}

/** The tile's side, in specks: large enough that its repeat is never seen. */
const TILE = 256

/** A seeded random, the same tile on every load (mulberry32). */
function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The tile: white everywhere, its alpha the noise. Every pixel a faint snow
 *  (up to a fifth), `sparkle` of them a bright speck (a half to all). */
function tile(sparkle: number): string {
  const canvas = document.createElement("canvas")
  canvas.width = TILE
  canvas.height = TILE
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Grain: no 2d canvas")
  const image = ctx.createImageData(TILE, TILE)
  const px = image.data
  const random = seeded(7)
  for (let i = 0; i < px.length; i += 4) {
    const bright = random() < sparkle
    const a = bright ? 0.5 + random() * 0.5 : random() * random() * 0.2
    px[i] = 255
    px[i + 1] = 255
    px[i + 2] = 255
    px[i + 3] = Math.round(a * 255)
  }
  ctx.putImageData(image, 0, 0)
  return canvas.toDataURL()
}

export function Grain({
  strength = 0.07,
  sparkle = 0.04,
  rate = 12,
  cell,
  className,
}: GrainProps) {
  const layer = React.useRef<HTMLDivElement>(null)
  // The tile and a speck's size in CSS pixels, both the screen's to know: a speck
  // is one device pixel unless `cell` says otherwise.
  const [made, setMade] = React.useState<{ url: string; speck: number }>()

  React.useEffect(() => {
    setMade({ url: tile(sparkle), speck: cell ?? 1 / window.devicePixelRatio })
  }, [sparkle, cell])

  React.useEffect(() => {
    const el = layer.current
    if (!el || !made) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    // A second's worth of places, each a whole number of specks into the tile
    // (so a speck lands on a pixel), each shown for one step: with `jump-none`
    // the steps land exactly on the places, and none is passed through.
    const random = seeded(11)
    const places = Array.from({ length: rate }, () => ({
      transform: `translate(${-Math.floor(random() * TILE) * made.speck}px, ${-Math.floor(random() * TILE) * made.speck}px)`,
    }))
    const animation = el.animate(places, {
      duration: 1000,
      iterations: Number.POSITIVE_INFINITY,
      easing: `steps(${rate}, jump-none)`,
    })
    return () => animation.cancel()
  }, [made, rate])

  const span = made ? TILE * made.speck : 0
  return (
    <div
      aria-hidden
      data-slot="grain"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden mix-blend-plus-lighter",
        className,
      )}
      style={{ opacity: strength }}
    >
      {made && (
        <div
          ref={layer}
          className="absolute -inset-(--grain-span) [image-rendering:pixelated] will-change-transform"
          style={
            {
              "--grain-span": `${span}px`,
              backgroundImage: `url(${made.url})`,
              backgroundSize: `${span}px ${span}px`,
            } as React.CSSProperties
          }
        />
      )}
    </div>
  )
}
