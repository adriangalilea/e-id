"use client"

// THE PICTURE BEHIND THE SURFACES, READ: what holds pixels (a video, a picture) answers
// `scheme="backdrop"` for every surface over it, each by the part of the picture under
// it (lib/backdrop: a frame sampled into a small grid of lightness, a verdict per
// surface with memory, so a cut is held before a visible surface flips and a strobe
// flips nothing).
//
//   <Backdrop src="/peaks.jpg">            a picture behind a section
//     <Button material="glass">go</Button>   light glass over the sky, dark over rock
//   </Backdrop>
//
// VideoPicture makes its own (a player's chrome adapts with nothing said). A source
// samples only while it is on screen and its document visible: a playing video on its
// own frames (about every one), a picture once it has loaded, a canvas when its owner
// says it redrew (`refresh`). Where the surfaces stand is looked at the frame anything
// moves (a sample, a scroll anywhere, a resize) and when a held change's hold ends;
// the change itself eases (the glass's transition), so it follows the picture rather
// than jumping after it. Reading the pixels needs them readable: same origin, or
// served with CORS and `crossOrigin` set; a picture that is neither screams at its
// first sample.

import * as React from "react"
import {
  BackdropScope,
  type BackdropSource,
  MaterialProvider,
  type Scheme,
  useSurfaceScheme,
} from "@/components/ui/material"
import {
  Glass,
  type GlassProps,
  type GlassStyle,
  glassShapes,
  glassStyle,
  glassVariants,
} from "@/components/ui/material-glass"
import {
  BACKDROP,
  type Cell,
  cellsUnder,
  contentBox,
  type Grid,
  gridOf,
  judge,
  oklchGrain,
  reading,
  sheenOf,
  tintFor,
  underRim,
  type Verdict,
} from "@/lib/backdrop-core"
import { cn } from "@/lib/utils"

/** What can be read: a video, a picture, or a canvas something draws into (a
 *  comparison stage, a chart). A canvas says nothing when it redraws, so its owner
 *  calls the source's `refresh` after drawing. */
type Media = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
export type BackdropFit = "contain" | "cover" | "fill"

/** A playing video's frames, read at most this often (ms): about every frame of a
 *  film, so the glass answers a cut while it is the cut. */
const SAMPLE_MS = 33

interface Watcher {
  element: HTMLElement | null
  onChange: (scheme: "light" | "dark") => void
  verdict: Verdict | null
}

const naturalOf = (m: Media) =>
  m instanceof HTMLVideoElement
    ? { width: m.videoWidth, height: m.videoHeight }
    : m instanceof HTMLCanvasElement
      ? { width: m.width, height: m.height }
      : { width: m.naturalWidth, height: m.naturalHeight }

const ready = (m: Media) =>
  m instanceof HTMLVideoElement
    ? m.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
    : m instanceof HTMLCanvasElement
      ? m.width > 0 && m.height > 0
      : m.complete && m.naturalWidth > 0

/** A rectangle on the screen, px. */
interface Box {
  left: number
  top: number
  width: number
  height: number
}

/** Where a medium's picture stands on the screen: its element's box, cut to its
 *  content as `object-fit` places it. */
const pictureBox = (m: Media, fit: BackdropFit): Box => {
  const box = m.getBoundingClientRect()
  const c = contentBox(box, naturalOf(m), fit)
  return {
    left: box.left + c.x,
    top: box.top + c.y,
    width: c.width,
    height: c.height,
  }
}

/** Sets a surface's custom property only when its value changed: the source looks
 *  every frame anything moves (a glide, a drag), and each write restyles the glass
 *  and restarts what it eases, though most frames move a value by less than the eye
 *  could see. Values are written at the grain they are seen at (`grain`). */
const write = (element: HTMLElement | null, name: string, value: string) => {
  if (element && element.style.getPropertyValue(name) !== value)
    element.style.setProperty(name, value)
}
/** Two decimals for a multiple (a thickness, a sheen); a colour in perceptual steps
 *  (`oklchGrain`): steps of 4 of 255 in sRGB were far finer than the eye in the
 *  light and changed on nearly every frame of a glide. */
const grain = {
  multiple: (v: number) => v.toFixed(2),
  color: oklchGrain,
}

/** The box round every picture: what a surface with no element of its own stands
 *  over. */
const union = (pictures: { box: Box }[]): Box => {
  const left = Math.min(...pictures.map((p) => p.box.left))
  const top = Math.min(...pictures.map((p) => p.box.top))
  const right = Math.max(...pictures.map((p) => p.box.left + p.box.width))
  const bottom = Math.max(...pictures.map((p) => p.box.top + p.box.height))
  return { left, top, width: right - left, height: bottom - top }
}

/** The same media, in the same order: a list handed in anew each render is not a
 *  change. */
const sameMedia = (a: readonly Media[], b: readonly Media[]) =>
  a.length === b.length && a.every((m, i) => m === b[i])

/** The source over `media` (one picture or video, or several: photographs gliding
 *  under the same controls): hand it to <BackdropScope>. `fit` is how each fills its
 *  element (`object-fit`); `outside` the lightness of what shows where none does
 *  (L*, 0: a black stage). A surface over two of them is read across both.
 *  `read` is whether the pictures have been read yet: until then the glass over
 *  them wears its unread scheme, so a picture its owner draws should show only from
 *  then, fading in while the glass eases to it (<Backdrop> does), never be seen
 *  first with the glass catching up a beat later. */
export function useBackdropSource(
  media: Media | readonly Media[] | null,
  { fit, outside = 0 }: { fit: BackdropFit; outside?: number },
): BackdropSource & { refresh(): void; read: boolean } {
  const [read, setRead] = React.useState(false)
  const [state] = React.useState(() => ({
    fit,
    outside,
    grids: new Map<Media, Grid>(),
    watchers: new Set<Watcher>(),
    canvas: null as CanvasRenderingContext2D | null,
    /** The look asked for on the next frame, and the one a hold's end waits for. */
    asked: 0,
    held: 0,
  }))
  state.fit = fit
  state.outside = outside
  const given: readonly Media[] =
    media === null ? [] : "length" in media ? media : [media]
  const kept = React.useRef<readonly Media[]>(given)
  if (!sameMedia(kept.current, given)) kept.current = given
  const list = kept.current

  const look = React.useCallback(() => {
    window.clearTimeout(state.held)
    if (state.grids.size === 0) return
    const pictures = [...state.grids].map(([m, grid]) => ({
      grid,
      box: pictureBox(m, state.fit),
    }))
    // A box on the screen read across every picture under it.
    const readBox = (r: Box) => {
      const cells: Cell[] = []
      for (const { grid, box } of pictures) {
        if (box.width === 0 || box.height === 0) continue
        const area = {
          x: (r.left - box.left) / box.width,
          y: (r.top - box.top) / box.height,
          w: r.width / box.width,
          h: r.height / box.height,
        }
        const px = box.width * box.height
        for (const c of cellsUnder(grid, area))
          cells.push({ ...c, weight: c.weight * px })
      }
      return reading(cells, r.width * r.height, state.outside)
    }
    const now = performance.now()
    let wake = Number.POSITIVE_INFINITY
    for (const w of state.watchers) {
      // Unset, the surface is the whole of what is shown: the pictures' union.
      const r: Box = w.element?.getBoundingClientRect() ?? union(pictures)
      if (r.width === 0 || r.height === 0) continue
      const read = readBox(r)
      const visible =
        !w.element ||
        w.element.checkVisibility({
          opacityProperty: true,
          visibilityProperty: true,
        })
      const next = judge(w.verdict, read, now, visible)
      const thickness = tintFor(next.worn, read)
      // The rim reads against what is right under it, the picture seen through the
      // glass's face: less light over dark, more over light (inherited by what is
      // inside a group). Continuous; it eases.
      write(
        w.element,
        "--glass-ground-sheen",
        grain.multiple(sheenOf(underRim(next.worn, read, thickness))),
      )
      // And picks up the picture's colour under it (`glassLight` leans the rim's
      // light toward it).
      write(w.element, "--glass-ground", grain.color(read.color))
      // As thick as its words need over what is under it, no thicker (eased by the
      // glass's own transition): the face's tint at this opacity.
      write(w.element, "--glass-thickness", grain.multiple(thickness))
      if (!w.verdict || next.worn !== w.verdict.worn) w.onChange(next.worn)
      w.verdict = next
      if (next.pending)
        wake = Math.min(wake, next.since + BACKDROP.holdMs - now)
    }
    // A change waiting out its hold is looked at again the moment the hold ends, a
    // still picture sending nothing else.
    if (wake < Number.POSITIVE_INFINITY)
      state.held = window.setTimeout(look, Math.max(0, wake) + 1)
  }, [state])

  // Asked for by whatever moved (a frame, a scroll, a redraw), at most once a frame.
  const soon = React.useCallback(() => {
    if (state.asked) return
    state.asked = requestAnimationFrame(() => {
      state.asked = 0
      look()
    })
  }, [state, look])

  const sample = React.useCallback(
    (m: Media) => {
      if (!ready(m)) return
      if (!state.canvas) {
        const canvas = document.createElement("canvas")
        canvas.width = BACKDROP.cols
        canvas.height = BACKDROP.rows
        // The frame is scaled down where it lives (the GPU) and only the grid's few
        // hundred pixels come back: read every frame, it costs a fraction of a ms.
        state.canvas = canvas.getContext("2d")
        if (!state.canvas)
          throw new Error("backdrop: no 2d canvas to sample into")
      }
      const ctx = state.canvas
      ctx.drawImage(m, 0, 0, BACKDROP.cols, BACKDROP.rows)
      let pixels: ImageData
      try {
        pixels = ctx.getImageData(0, 0, BACKDROP.cols, BACKDROP.rows)
      } catch (e) {
        throw new Error(
          `backdrop: the pixels of ${m instanceof HTMLCanvasElement ? "a canvas holding another origin's picture" : m.currentSrc || "the picture"} cannot be read (another origin without CORS: serve it with Access-Control-Allow-Origin and set crossOrigin, or name a scheme)`,
          { cause: e },
        )
      }
      state.grids.set(m, gridOf(pixels.data, BACKDROP.cols, BACKDROP.rows))
      // Read now: told in the same pass as the surfaces' first verdicts (looked at
      // right here, not a frame later), so a picture shown from `read` and the
      // glass easing to its reading start on one frame.
      setRead(true)
      look()
    },
    [state, look],
  )

  React.useEffect(() => {
    state.grids.clear()
    if (list.length === 0) return
    const onScreen = new Set<Media>()
    const lastSample = new Map<Media, number>()
    const frames = new Map<HTMLVideoElement, number>()
    const awake = () =>
      onScreen.size > 0 && document.visibilityState === "visible"
    // A playing video is read on its own frames, at most every SAMPLE_MS.
    const onFrame = (v: HTMLVideoElement) => () => {
      const now = performance.now()
      if (awake() && now - (lastSample.get(v) ?? 0) >= SAMPLE_MS) {
        lastSample.set(v, now)
        sample(v)
      }
      if (!v.paused) frames.set(v, v.requestVideoFrameCallback(onFrame(v)))
    }
    // Looked at only when something can have changed: a scroll anywhere
    // (photographs gliding under the controls, the page moving them), a hand moving a
    // surface, a resize, and a transition or an animation starting or ending (chrome
    // rising on a transform says so by no other event). A still picture under still
    // controls costs nothing.
    const onMove = () => {
      if (awake()) soon()
    }
    const MOVES = [
      "scroll",
      "transitionstart",
      "transitionend",
      "animationstart",
      "animationend",
    ] as const
    const start = () => {
      if (!awake()) return
      for (const m of list) {
        if (m instanceof HTMLVideoElement && !m.paused) {
          m.cancelVideoFrameCallback(frames.get(m) ?? 0)
          frames.set(m, m.requestVideoFrameCallback(onFrame(m)))
        }
        sample(m)
      }
    }
    const seen = new IntersectionObserver((entries) => {
      for (const e of entries)
        e.isIntersecting
          ? onScreen.add(e.target as Media)
          : onScreen.delete(e.target as Media)
      start()
    })
    const events = (m: Media) =>
      m instanceof HTMLVideoElement
        ? ["loadeddata", "seeked", "play", "pause"]
        : m instanceof HTMLCanvasElement
          ? []
          : ["load"]
    for (const m of list) {
      seen.observe(m)
      for (const e of events(m)) m.addEventListener(e, start)
    }
    document.addEventListener("visibilitychange", start)
    for (const e of MOVES)
      document.addEventListener(e, onMove, { capture: true, passive: true })
    // A hand moving a surface (a panel dragged over the picture, chrome rising under
    // the pointer) is looked at the frame it moves.
    document.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("resize", soon)
    return () => {
      seen.disconnect()
      for (const m of list) {
        for (const e of events(m)) m.removeEventListener(e, start)
        if (m instanceof HTMLVideoElement)
          m.cancelVideoFrameCallback(frames.get(m) ?? 0)
      }
      document.removeEventListener("visibilitychange", start)
      for (const e of MOVES)
        document.removeEventListener(e, onMove, { capture: true })
      document.removeEventListener("pointermove", onMove)
      window.removeEventListener("resize", soon)
      window.clearTimeout(state.held)
      cancelAnimationFrame(state.asked)
      state.asked = 0
    }
  }, [list, state, sample, soon])

  return React.useMemo(
    () => ({
      watch(element, onChange) {
        const w: Watcher = { element, onChange, verdict: null }
        state.watchers.add(w)
        look()
        return () => {
          state.watchers.delete(w)
          element?.style.removeProperty("--glass-thickness")
          element?.style.removeProperty("--glass-ground-sheen")
          element?.style.removeProperty("--glass-ground")
        }
      },
      // A canvas's owner says it redrew: it is read again, and its surfaces looked at.
      refresh() {
        for (const m of kept.current)
          if (m instanceof HTMLCanvasElement) sample(m)
      },
      read,
    }),
    [state, look, sample, read],
  )
}

/** A FLUID glass, which chooses no scheme: the glass is the picture under it, read
 *  by the compositor pixel by pixel (`backdrop-filter`), blurred into frost, its
 *  colour mostly drained and its contrast pushed, so it is light where the picture
 *  is light and dark where it is dark, following the picture's own shapes (a sky,
 *  a river, a face) rather than any band of them; the words are white blended by
 *  `difference` against it, dark on the light parts and light on the dark, inside
 *  one word. Nothing is sampled: it follows anything, a playing video and the page
 *  itself included, on the frame it moves.
 *
 *  The frost is a LAYER of its own and the words its siblings, never its children:
 *  a backdrop-filter makes its element an isolated group, and words inside it
 *  blended against the glass's own (transparent) background, not the frosted
 *  picture, so they stayed white on white glass. Beside it, they blend against
 *  what is painted under them: the picture and the frost. So the host draws no
 *  glass and makes no stacking context. Its words must be elements (a span, an
 *  icon): a blend applies to an element, not to bare text. And nothing between it
 *  and the picture may isolate (a transform, opacity, a filter): the blending words
 *  make the nearest such ancestor a layer of its own, and the frost then sees only
 *  what is inside that layer, not the picture (a card dragged by `translate` lost
 *  its frost; by its margin it keeps it). The host is glass's shape alone
 *  (`glassShapes`); its light (`rim`, `tint`) is set on it and the frost inherits it. */
const FLUID_HOST =
  "relative rounded-(--glass-radius) text-white [&>*:not([data-slot=glass-frost])]:relative [&>*:not([data-slot=glass-frost])]:mix-blend-difference"
// Over the frost, a veil of white: the contrast leaves the dark parts black and heavy
// ("too dark and too much contrast", Adrian, 2026-10-11), and a filter cannot lift
// black (brightness multiplies it); a veil adds light to every pixel, black becoming
// a deep grey and white staying white, so the words keep their contrast.
const FLUID_FROST = cn(
  glassVariants({ shape: "surface" }),
  // The host's glass, drawn on a layer of its own: its rim is the host's.
  "pointer-events-none absolute inset-0 [--glass-radius:inherit] [--glass-rim:inherit] [--glass-tint:rgb(255_255_255/0.14)]",
)
/** The frost, in the order it needs: blurred, then its colour drained, THEN its
 *  contrast pushed, so contrast acts on lightness alone. Tailwind's composed filter
 *  pushes contrast before saturation, and a blue sky's channels clipped to cyan (the
 *  words, white minus cyan, turned red): "burned" (Adrian, 2026-10-11). Neutral, the
 *  words blended against it are neutral too, black on the light glass, white on the
 *  dark. It is the frost's `--glass-backdrop`, the glass's one backdrop channel (a
 *  whole filter in its order), set on its style so it holds on either face. */
// Contrast high enough that the frost is nearly black or nearly white, the mid grey
// (where the words, inverted against it, turned the same grey and read as disabled)
// left to the soft edge between them; drained first, it never burns.
const FLUID_FILTER = "blur(16px) grayscale(1) contrast(3.4)"
const FROST_STYLE: GlassStyle = { "--glass-backdrop": FLUID_FILTER }

/** `Glass` (server-safe, told its scheme) as a surface that reads its own: the
 *  scheme it is given or its provider's, `backdrop` answered by the picture under
 *  this element. For a piece of glass of your own over a picture (a header pill, an
 *  avatar's ring); every base control already does this itself.
 *
 *  `fluid` (EXPERIMENTAL) chooses no scheme at all and needs no source: see FLUID. */
export function AdaptiveGlass<T extends React.ElementType = "div">({
  scheme,
  fluid = false,
  ref,
  className,
  ...props
}: Omit<GlassProps<T>, "scheme"> & { scheme?: Scheme; fluid?: boolean }) {
  const [s, here] = useSurfaceScheme<HTMLElement>(
    fluid ? "auto" : scheme,
    ref as React.Ref<HTMLElement> | undefined,
  )
  if (!fluid)
    return (
      <Glass
        {...(props as GlassProps<T>)}
        ref={here}
        scheme={s}
        className={className}
      />
    )
  const {
    as,
    shape = "card",
    rim,
    rimWidth,
    rimColor,
    tint,
    tintAmount,
    style,
    children,
    ...rest
  } = props as Omit<GlassProps<"div">, "as" | "scheme"> & {
    as?: React.ElementType
  }
  return React.createElement(
    as ?? "div",
    {
      ...(as === "button" ? { type: "button" } : {}),
      ...rest,
      ref: here,
      "data-slot": "glass",
      "data-material": "glass",
      "data-shape": shape,
      "data-scheme": s,
      "data-fluid": true,
      style: {
        ...glassStyle({ rim, rimWidth, rimColor, tint, tintAmount }),
        ...style,
      },
      className: cn(glassShapes[shape], FLUID_HOST, className),
    },
    <span
      aria-hidden
      data-slot="glass-frost"
      className={FLUID_FROST}
      style={FROST_STYLE}
    />,
    children,
  )
}

/** Controls that read as ONE (a row of a gallery's buttons, a player's transport)
 *  read the picture as one: the band under the group decides one scheme for every
 *  piece in it. Read one by one, a pill over the sky turned light beside circles over
 *  rock that stayed dark, and the row looked broken. Its glass's thickness and rim
 *  are the band's too (set on the group, inherited by every glass in it). */
export function BackdropGroup({
  scheme,
  ref,
  children,
  ...props
}: React.ComponentProps<"div"> & { scheme?: Scheme }) {
  const [s, here] = useSurfaceScheme<HTMLDivElement>(scheme, ref)
  return (
    <div ref={here} data-slot="backdrop-group" {...props}>
      <MaterialProvider scheme={s}>{children}</MaterialProvider>
    </div>
  )
}

/** A picture behind a section, read: every control inside wears the scheme the
 *  picture under it asks for (`scheme="backdrop"`), glass over the sky light, over
 *  the rock dark. The picture fills the box (`fit`, `cover` by default); it is
 *  decoration, hidden from assistive technology. It shows once it has been read,
 *  fading in over the glass's own 300 ms while the glass eases to its reading, one
 *  movement: shown on load, it stood a beat under glass still wearing the scheme of
 *  the empty page, which then snapped ("abrupt and too lagged", Adrian,
 *  2026-10-11). */
export function Backdrop({
  src,
  fit = "cover",
  crossOrigin,
  className,
  children,
}: {
  src: string
  fit?: BackdropFit
  /** For a picture on another origin, served with CORS. */
  crossOrigin?: "anonymous" | "use-credentials"
  className?: string
  children?: React.ReactNode
}) {
  const [picture, setPicture] = React.useState<HTMLImageElement | null>(null)
  const source = useBackdropSource(picture, { fit })
  return (
    <div
      data-slot="backdrop"
      className={cn("relative isolate overflow-hidden", className)}
    >
      {/* biome-ignore lint/performance/noImgElement: the picture is read pixel by pixel, a plain element any React app has */}
      <img
        ref={setPicture}
        src={src}
        alt=""
        aria-hidden
        crossOrigin={crossOrigin}
        decoding="async"
        className={cn(
          "-z-10 pointer-events-none absolute inset-0 size-full transition-opacity duration-300 ease-out motion-reduce:transition-none",
          source.read ? "opacity-100" : "opacity-0",
          fit === "cover"
            ? "object-cover"
            : fit === "contain"
              ? "object-contain"
              : "object-fill",
        )}
      />
      <BackdropScope source={source}>
        <MaterialProvider scheme="backdrop">{children}</MaterialProvider>
      </BackdropScope>
    </div>
  )
}
