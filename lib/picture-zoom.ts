// Zooming into a moving picture on a stage, as data. Framework-free; ui/video-playback
// holds the view, ui/player's gestures, keys and finder move it.
//
// THE LADDER. A picture fitted whole in a stage of another shape leaves bars on two
// sides. Zooming in, the first stop is FILL, the picture just covering the stage (the
// bars gone, the least of it cut); past it the zoom is free up to `max`. Zooming out
// comes back down the same way: free until fill, which catches, then FIT. A stop is a
// DETENT under a pinch: a stretch of the hand that does not change the scale, so a stop
// is felt and has to be pushed through rather than flown past. Keys and buttons step
// to the stops exactly. A picture of the stage's own shape has no fill: fit covers.
//
// THE VIEW is the lightbox's: { x, y, s }, a translation in px of the stage from its
// centre and a scale over the fitted picture, transform-origin at the centre
// (lib/lightbox-motion's `zoomAt` keeps a point under the hand). Panned, the picture
// never uncovers the stage on an axis it overflows; on an axis it does not overflow it
// stays centred.

import {
  PINCH_CLOSE,
  type Point,
  type Size,
  type View,
  zoomAt,
} from "@/lib/lightbox-motion"

export type { Point, Size, View }

/** What one pinch does: fill the screen, leave it, zoom the picture, or nothing. */
export type PinchRung = "fullscreen" | "leave" | "zoom" | "none"

/** THE PINCH'S LADDER, every player's: in the page → fullscreen → zoomed, and down
 *  the same way. Decided where the pinch STARTS and kept to its end, so one gesture
 *  climbs at most one rung: a spread that fills the screen does not also zoom, and a
 *  close that zooms down to fit does not also leave (the lightbox's rule for its pinch
 *  to close: a pinch that began zoomed is a zoom being undone). The screen is always
 *  there to take: where the browser refuses its fullscreen (a pinch is no press), the
 *  player fills the window (ui/playback's toggleFullscreen). */
export function pinchRung(at: {
  /** The fingers spread (true) or close. */
  out: boolean
  /** The player holds the screen now. */
  full: boolean
  /** The picture zooms (VideoPlayback's `zoom`). */
  zooms: boolean
  /** The picture is past its fit. */
  zoomed: boolean
}): PinchRung {
  if (at.zooms && at.zoomed) return "zoom"
  if (at.full) return at.out ? (at.zooms ? "zoom" : "none") : "leave"
  return at.out ? "fullscreen" : "none"
}

/** A trackpad's pinch arrives as a ctrl-wheel: the stretch each px of its deltaY is
 *  (`stretch *= exp(-deltaY × this)`, a spread being a negative deltaY). */
export const PINCH_PER_WHEEL = 0.01

/** How far a pinch spreads or closes (a share of where it began) before it has a
 *  direction: under it, two fingers resting are not a pinch yet. */
export const PINCH_SLOP = 0.04

/** Whether a pinch's `stretch` (the fingers' spread over where they began, a
 *  trackpad's alike) has taken its rung: closed to the lightbox's pinch to close it
 *  leaves the screen, spread to its inverse it fills it. One distance for one hand,
 *  whichever viewer it is in. */
export function rungTaken(rung: PinchRung, stretch: number): boolean {
  if (rung === "fullscreen") return stretch >= 1 / PINCH_CLOSE
  if (rung === "leave") return stretch <= PINCH_CLOSE
  return false
}

/** The fitted view: the whole picture, centred. */
export const FIT_VIEW: View = { x: 0, y: 0, s: 1 }

/** How far a detent holds the hand, as a factor of scale each side of its stop: a
 *  pinch has to travel 15% past a stop before the scale moves on. */
const DETENT = Math.log(1.15)
/** A key or button press multiplies the scale by this past fill. */
const STEP = 1.5
/** How far past fill the zoom goes: a picture is soft long before this. */
const MAX_OVER_FILL = 6
/** Scales this close are the same stop. */
const EPS = 1e-3

/** The picture's box fitted whole in the stage: its natural shape at the largest size
 *  that fits (what `object-fit: contain` draws). */
export function fitted(natural: Size, stage: Size): Size {
  if (!(natural.w > 0 && natural.h > 0 && stage.w > 0 && stage.h > 0))
    throw new Error(
      `picture-zoom: sizes must be positive (natural ${natural.w}×${natural.h}, stage ${stage.w}×${stage.h})`,
    )
  const k = Math.min(stage.w / natural.w, stage.h / natural.h)
  return { w: natural.w * k, h: natural.h * k }
}

/** The stops for a fitted picture on a stage: fit (1), fill (the scale at which it
 *  covers the stage; 1 when it already does), and the most it zooms. */
export function stopsOf(
  box: Size,
  stage: Size,
): {
  fill: number
  max: number
} {
  const fill = Math.max(stage.w / box.w, stage.h / box.h)
  return { fill, max: fill * MAX_OVER_FILL }
}

/** The stops a detent catches at, in log scale, ascending: fit, and fill when it is
 *  far enough above fit for two detents not to overlap. */
function detentStops(fill: number): number[] {
  const f = Math.log(fill)
  return f > 2 * DETENT ? [0, f] : [0]
}

/** A pinch's raw scale (the hand's stretch carried over from where it began) to the
 *  scale shown: every stop holds still for DETENT each side of it. Continuous and
 *  monotonic; `pinchRaw` is its inverse. */
export function pinchScale(raw: number, fill: number): number {
  const stops = detentStops(fill)
  const u = Math.log(raw)
  let shown = u + DETENT
  stops.forEach((stop, i) => {
    const r = stop + 2 * DETENT * i
    shown -= Math.min(Math.max(u - r, -DETENT), DETENT) + DETENT
  })
  return Math.exp(shown)
}

/** The raw stretch that shows `scale`: where a pinch that begins at `scale` starts, so
 *  its first px moves from there. At a stop, the middle of its detent. */
export function pinchRaw(scale: number, fill: number): number {
  const stops = detentStops(fill)
  const e = Math.log(scale)
  const at = stops.findIndex((s) => Math.abs(s - e) < EPS)
  if (at >= 0) return Math.exp((stops[at] as number) + 2 * DETENT * at)
  const below = stops.filter((s) => s < e).length
  return Math.exp(e + DETENT * (2 * below - 1))
}

/** Where a scale comes to rest when the hand lets go: under fit back to fit, over the
 *  most back to the most, anywhere between where it is (the stops already caught it). */
export function settle(scale: number, max: number): number {
  return Math.min(Math.max(scale, 1), max)
}

/** One step in: to fill when below it, then by STEP up to the most. */
export function stepIn(scale: number, fill: number, max: number): number {
  if (scale < fill - EPS) return fill
  return Math.min(max, scale * STEP)
}

/** One step out: by STEP down to fill, then to fit. */
export function stepOut(scale: number, fill: number): number {
  if (scale > fill + EPS) return Math.max(fill, scale / STEP)
  return 1
}

/** The view kept inside its bounds: on an axis the scaled picture overflows the stage,
 *  never so far that the stage shows past its edge; on one it does not, centred. */
export function clampView(view: View, box: Size, stage: Size): View {
  const bx = Math.max(0, (box.w * view.s - stage.w) / 2)
  const by = Math.max(0, (box.h * view.s - stage.h) / 2)
  return {
    x: Math.min(Math.max(view.x, -bx), bx),
    y: Math.min(Math.max(view.y, -by), by),
    s: view.s,
  }
}

/** A new scale with the point `at` (px from the stage's centre) staying where it is,
 *  then kept inside its bounds. */
export function zoomView(
  view: View,
  scale: number,
  at: Point,
  box: Size,
  stage: Size,
): View {
  return clampView(zoomAt(view, scale, at), box, stage)
}

/** What a scale is called when it changes: the two stops by name, else the zoom over
 *  the fitted picture. */
export function zoomLabel(scale: number, fill: number): string {
  if (Math.abs(scale - 1) < EPS) return "fit"
  if (Math.abs(scale - fill) < EPS) return "fill"
  return `${scale.toFixed(1)}×`
}

/** The part of the fitted picture the stage shows, in the fitted picture's own px from
 *  its top-left: what a finder draws its rectangle around. */
export function visibleRect(
  view: View,
  box: Size,
  stage: Size,
): { x: number; y: number; w: number; h: number } {
  const w = Math.min(box.w, stage.w / view.s)
  const h = Math.min(box.h, stage.h / view.s)
  const cx = box.w / 2 - view.x / view.s
  const cy = box.h / 2 - view.y / view.s
  return { x: cx - w / 2, y: cy - h / 2, w, h }
}

/** The view that frames a rectangle of the picture (shares of it, 0..1: x, y from its
 *  top-left, w, h) in the stage, a margin of the stage left around it, never past the
 *  most it zooms nor under fit: a found thing brought close. */
export function frameView(
  rect: { x: number; y: number; w: number; h: number },
  box: Size,
  stage: Size,
  max: number,
  margin = 0.2,
): View {
  if (!(rect.w > 0 && rect.h > 0))
    throw new Error(
      `picture-zoom: a rectangle to frame has a size, not ${rect.w}×${rect.h}`,
    )
  const room = 1 - margin
  const s = Math.min(
    max,
    Math.max(
      1,
      Math.min(
        (stage.w * room) / (rect.w * box.w),
        (stage.h * room) / (rect.h * box.h),
      ),
    ),
  )
  // Its centre, from the fitted picture's centre, in its px: the view moves it to the
  // stage's centre at scale s.
  const cx = (rect.x + rect.w / 2 - 0.5) * box.w
  const cy = (rect.y + rect.h / 2 - 0.5) * box.h
  return clampView({ x: -cx * s, y: -cy * s, s }, box, stage)
}

/** The view that centres the stage on a point of the fitted picture (its own px from
 *  its top-left), at the same scale: a finder's drag. */
export function centreOn(
  point: Point,
  view: View,
  box: Size,
  stage: Size,
): View {
  return clampView(
    {
      x: (box.w / 2 - point.x) * view.s,
      y: (box.h / 2 - point.y) * view.s,
      s: view.s,
    },
    box,
    stage,
  )
}
