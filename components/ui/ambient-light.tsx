"use client"

// Broad soft light behind a page, without banding. A CSS gradient on a dark
// ground has only a handful of 8-bit levels to fall through, and the browser
// rounds each pixel to the nearest one, so every level shows as a ring.
// Noise laid over it afterwards cannot help: the rings are already in the
// pixels, and a grain's average leaves them where they were. The fix is to
// round each pixel only after adding a little noise to it (dithering), which
// needs the light computed here, in floating point: the ground and every
// glow mixed per pixel, a triangular noise of one level added, then rounded.
// The steps scatter into a grain finer than the eye resolves and the fall
// reads smooth.
//
// It paints its own ground (`ground`, the page's background by default):
// light composited over the page afterwards in 8 bits would band again in
// its alpha. It fills its positioned parent (`absolute inset-0`); place and
// size that box (a fixed layer, a section). The canvas is drawn at half the
// box's CSS pixels, then smoothed up: light this broad has no detail to
// lose, and the dither survives the upscale. Colours may be any CSS colour,
// `var()` included, resolved where the canvas stands.
//
// It is there in the page's first paint. An inline script right after the
// canvas paints it while the page is still being parsed: the stylesheets
// have loaded by then (a script waits for them) and the box has its real
// size, so the light is computed for this window, in this hue, before
// anything shows (some 10 to 20 ms for a window's worth at half scale). A
// light painted after hydration faded in over a bare ground on every page.
// Mounted by the client (a script React inserts never runs), resized, or
// re-themed, it is painted again by the component.

import * as React from "react"
import { cn } from "@/lib/utils"

export interface Glow {
  /** Any CSS colour, read where the light stands (`var(--accent)` works). */
  color: string
  /** The centre, as fractions of the box (0 left/top, 1 right/bottom). */
  x: number
  y: number
  /** How far the light reaches, as fractions of the box's width and height:
   *  it fades to nothing there, on a smooth fall. */
  rx: number
  ry: number
  /** The colour's share at the centre, 0 to 1. */
  strength: number
}

export interface AmbientLightProps {
  glows: Glow[]
  /** The colour under the light (default: the page's background), or "none" for
   *  the light alone over whatever lies under it (behind a page's subject, in
   *  the middle of the page, where a ground would cover what is round it). */
  ground?: string
  className?: string
}

type Light = { glows: Glow[]; ground: string }

/** The size a canvas was painted for, so a repaint happens only when the box
 *  changed (or nothing painted it yet). */
const sizeOf = (canvas: HTMLCanvasElement) =>
  `${canvas.clientWidth}x${canvas.clientHeight}`

/** Paints the light into `canvas` at half its box, dithered. Self-contained
 *  (no imports, no outer names): it is also serialized into the inline
 *  script that paints the canvas before the first paint. */
function paint(canvas: HTMLCanvasElement, { glows, ground }: Light) {
  const scale = 0.5
  // A CSS colour as sRGB 0..255, read through a 1px canvas, which accepts
  // every colour syntax the browser does; custom properties resolved as the
  // canvas sees them first.
  const probe = document
    .createElement("canvas")
    .getContext("2d", { willReadFrequently: true })
  const ctx = canvas.getContext("2d")
  if (!ctx || !probe) throw new Error("AmbientLight: no 2d canvas")
  const rgb = (css: string): [number, number, number] => {
    canvas.style.color = css
    const resolved = getComputedStyle(canvas).color
    canvas.style.color = ""
    probe.clearRect(0, 0, 1, 1)
    probe.fillStyle = "#000"
    probe.fillStyle = resolved
    probe.fillRect(0, 0, 1, 1)
    const [r, g, b] = probe.getImageData(0, 0, 1, 1).data
    return [r as number, g as number, b as number]
  }
  const w = Math.max(1, Math.round(canvas.clientWidth * scale))
  const h = Math.max(1, Math.round(canvas.clientHeight * scale))
  canvas.width = w
  canvas.height = h
  canvas.dataset.painted = `${canvas.clientWidth}x${canvas.clientHeight}`
  // No ground: the light alone, as a colour and how much of it there is (its
  // alpha), the alpha dithered as the colour would be, so it falls without rings
  // over whatever it lies on.
  const bare = ground === "none"
  const base = bare ? ([0, 0, 0] as const) : rgb(ground)
  const lights = glows.map((g) => ({
    ...g,
    rgb: rgb(g.color),
    cx: g.x * w,
    cy: g.y * h,
    sx: 1 / Math.max(1e-6, g.rx * w),
    sy: 1 / Math.max(1e-6, g.ry * h),
  }))
  const image = ctx.createImageData(w, h)
  const px = image.data
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r: number = base[0]
      let g: number = base[1]
      let b: number = base[2]
      // How much light there is, with no ground: each glow laid over the others.
      let cover = 0
      for (const l of lights) {
        const dx = (x - l.cx) * l.sx
        const dy = (y - l.cy) * l.sy
        const d2 = dx * dx + dy * dy
        if (d2 >= 1) continue
        // A smoothstep on the squared distance: a broad, flat shoulder that
        // eases out only toward the reach, with no crease at either end. On
        // the plain distance the light fell from a small bright core and read
        // as a hotspot, not a wash.
        const t = 1 - d2
        const a = l.strength * t * t * (3 - 2 * t)
        r += (l.rgb[0] - r) * a
        g += (l.rgb[1] - g) * a
        b += (l.rgb[2] - b) * a
        cover += (1 - cover) * a
      }
      // Triangular noise of one level (two uniforms summed), then round.
      const i = (y * w + x) * 4
      if (bare) {
        // The colour accumulated premultiplied by the light's own cover: back
        // to the colour itself, and the cover as the alpha, dithered.
        const c = Math.max(cover, 1e-6)
        px[i] = r / c
        px[i + 1] = g / c
        px[i + 2] = b / c
        px[i + 3] = cover * 255 + Math.random() + Math.random() - 1
        continue
      }
      px[i] = r + Math.random() + Math.random() - 1
      px[i + 1] = g + Math.random() + Math.random() - 1
      px[i + 2] = b + Math.random() + Math.random() - 1
      px[i + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
}

export function AmbientLight({
  glows,
  ground = "var(--background)",
  className,
}: AmbientLightProps) {
  const ref = React.useRef<HTMLCanvasElement>(null)
  const spec = JSON.stringify({ glows, ground } satisfies Light)

  React.useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const light = JSON.parse(spec) as Light
    // Painted already by the inline script, for this size, when the page
    // arrived from the server; painted here when the client mounted it. A
    // resize repaints on the next frame, a theme change always.
    let frame = 0
    const draw = (force: boolean) => {
      if (!force && canvas.dataset.painted === sizeOf(canvas)) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => paint(canvas, light))
    }
    if (canvas.dataset.painted !== sizeOf(canvas)) paint(canvas, light)
    const resized = new ResizeObserver(() => draw(false))
    resized.observe(canvas)
    const theme = new MutationObserver(() => draw(true))
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    })
    return () => {
      cancelAnimationFrame(frame)
      resized.disconnect()
      theme.disconnect()
    }
  }, [spec])

  return (
    <>
      <canvas
        ref={ref}
        aria-hidden
        data-slot="ambient-light"
        // The inline script below sets its pixel size and `data-painted`
        // before React hydrates it.
        suppressHydrationWarning
        className={cn(
          "pointer-events-none absolute inset-0 size-full",
          className,
        )}
      />
      <script
        // It runs in the server's HTML, before hydration. Mounted on the client the
        // effect above paints, and React 19 warns about rendering any executable
        // <script>, so there it is inert JSON (the difference is not a mismatch).
        type={typeof window === "undefined" ? undefined : "application/json"}
        suppressHydrationWarning
        // biome-ignore lint/security/noDangerouslySetInnerHtml: this module's own paint function, serialized
        dangerouslySetInnerHTML={{
          __html: `(${paint})(document.currentScript.previousElementSibling,${spec})`,
        }}
      />
    </>
  )
}
