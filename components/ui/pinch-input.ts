// THE HAND ON A SURFACE, read once for every viewer that zooms: a pinch (a trackpad's,
// which arrives as a ctrl-wheel in Chrome and Firefox and as gesture events in Safari;
// two fingers on a screen), a wheel that is not a pinch, and one pointer's drag. The
// readers (VideoPicture's zoom, film-wall) say what each means; how a pinch is told
// from a rest, where it is centred and how far it has stretched is decided here, so a
// pinch is the same distance of the hand in every one of them.
//
// A pinch's STRETCH is the fingers' spread over where they began (a trackpad's alike,
// `exp(-deltaY × PINCH_PER_WHEEL)` per wheel step): above 1 a spread, below a close.
// It has a direction once it has moved PINCH_SLOP from 1 (two fingers resting are not
// a pinch yet); `begin` says which, then `pinch` follows it to `end`. A wheel's
// gesture ends when no event has come for WHEEL_END_MS: browsers report no phases.

import { wheelPx, wheelTick } from "@/lib/lightbox-motion"
import { PINCH_PER_WHEEL, PINCH_SLOP } from "@/lib/picture-zoom"

/** A point on the screen, client px. */
export interface Client {
  x: number
  y: number
}

/** Quiet that ends a wheel's pinch or pan: browsers report no wheel phases. */
export const WHEEL_END_MS = 150
/** px a press travels before it is a drag, not a click. */
export const DRAG_SLOP = 4

export interface PinchHandlers {
  /** Whether the hand starting on `target` is the surface's: false on its controls. */
  accepts?: (target: EventTarget | null) => boolean
  /** A pinch has its direction: a spread (`out`) or a close, centred at `at`. */
  begin: (out: boolean, at: Client) => void
  /** Where it has stretched to since it began, centred at `at`; `start` on its first. */
  pinch: (stretch: number, at: Client, start: boolean) => void
  /** The pinch let go. */
  end: () => void
  /** A wheel that is no pinch: the reader's (a pan, a swipe), or not. True takes it
   *  (the page does not scroll) and `wheelEnd` follows the quiet after it. */
  wheel?: (e: WheelEvent) => boolean
  wheelEnd?: () => void
  /** A press of one pointer: whether its drag is the reader's (a mouse's or a pen's is
   *  not tracked otherwise; a finger is, a second one may join it for a pinch). */
  press?: (e: PointerEvent) => boolean
  /** The pressed pointer moved past DRAG_SLOP, and on after it: by `dx`, `dy` px. */
  drag?: (dx: number, dy: number, e: PointerEvent) => void
  /** The last pointer let go after a drag. */
  release?: () => void
}

/** Safari's pinch: a scale since it began, at a point. */
type GestureEvent = UIEvent & {
  scale: number
  clientX: number
  clientY: number
}

/** Reads the hand on `el` for `h` until the returned function is called. */
export function pinchInput(el: HTMLElement, h: PinchHandlers): () => void {
  const accepts = (target: EventTarget | null) => h.accepts?.(target) ?? true

  // ── a wheel: a pinch with ctrl, else the reader's ──
  let wheel: "pinch" | "other" | null = null
  let stretch = 1
  let wheelEnd = 0
  const quiet = () => {
    const was = wheel
    wheel = null
    if (was === "pinch") h.end()
    else if (was === "other") h.wheelEnd?.()
  }
  // Safari's gesture events carry the pinch there; a ctrl-wheel during one is ignored.
  let gesture = false
  const onWheel = (e: WheelEvent) => {
    if (!accepts(e.target)) return
    if (e.ctrlKey) {
      e.preventDefault()
      if (gesture) return
      if (wheel === "other") quiet()
      const start = wheel !== "pinch"
      if (start) stretch = 1
      wheel = "pinch"
      // In px, one event bounded (the lightbox's tick): a mouse notch with ctrl is a
      // nudge, never a whole rung.
      const dy = wheelTick(wheelPx(e.deltaY, e.deltaMode, window.innerHeight))
      stretch *= Math.exp(-dy * PINCH_PER_WHEEL)
      const at = { x: e.clientX, y: e.clientY }
      // A spread is a negative deltaY.
      if (start) h.begin(dy < 0, at)
      h.pinch(stretch, at, start)
    } else {
      // A pinch under way keeps the wheel: none of it scrolls the page.
      if (wheel === "pinch") {
        e.preventDefault()
        return
      }
      if (!h.wheel?.(e)) return
      e.preventDefault()
      wheel = "other"
    }
    window.clearTimeout(wheelEnd)
    wheelEnd = window.setTimeout(quiet, WHEEL_END_MS)
  }
  let gestureBegun = false
  const onGestureStart = (e: Event) => {
    if (!accepts(e.target)) return
    e.preventDefault()
    // A pinch already read as a ctrl-wheel, or as fingers (iOS sends both), keeps its
    // reader: one pinch is never begun twice.
    if (wheel === "pinch" || points.size > 0) return
    gesture = true
    gestureBegun = false
  }
  const onGestureChange = (e: Event) => {
    if (!gesture) {
      e.preventDefault()
      return
    }
    e.preventDefault()
    const g = e as GestureEvent
    const at = { x: g.clientX, y: g.clientY }
    if (!gestureBegun) {
      if (Math.abs(g.scale - 1) < PINCH_SLOP) return
      gestureBegun = true
      h.begin(g.scale > 1, at)
      h.pinch(g.scale, at, true)
      return
    }
    h.pinch(g.scale, at, false)
  }
  const onGestureEnd = (e: Event) => {
    e.preventDefault()
    if (!gesture) return
    gesture = false
    if (gestureBegun) h.end()
  }

  // ── pointers: two fingers pinch, one (or a mouse the reader takes) drags ──
  const points = new Map<number, Client>()
  let spread = 0
  let pinching = false
  let pressed: Client | null = null
  let dragging = false
  let drags = false
  const two = () => {
    const [a, b] = [...points.values()]
    if (!a || !b) return null
    return {
      d: Math.hypot(a.x - b.x, a.y - b.y),
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    }
  }
  const onDown = (e: PointerEvent) => {
    if (!accepts(e.target)) return
    const finger = e.pointerType === "touch"
    // One hand at a time (the lightbox's rule): a finger landing ends a wheel's run.
    if (finger && wheel !== null) {
      window.clearTimeout(wheelEnd)
      quiet()
    }
    if (points.size === 0) {
      drags = h.press?.(e) ?? false
      if (!finger && (!drags || e.button !== 0)) return
      pressed = { x: e.clientX, y: e.clientY }
      dragging = false
    }
    if (!finger) return points.set(e.pointerId, { x: e.clientX, y: e.clientY })
    points.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const both = two()
    if (both) {
      spread = both.d
      pinching = false
    }
  }
  const onMove = (e: PointerEvent) => {
    const prev = points.get(e.pointerId)
    if (!prev) return
    points.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const both = two()
    if (both) {
      if (!(spread > 0)) return
      const ratio = both.d / spread
      if (!pinching) {
        if (Math.abs(ratio - 1) < PINCH_SLOP) return
        pinching = true
        h.begin(ratio > 1, both.mid)
        h.pinch(ratio, both.mid, true)
        return
      }
      h.pinch(ratio, both.mid, false)
      return
    }
    if (!drags) return
    if (
      !dragging &&
      pressed &&
      Math.hypot(e.clientX - pressed.x, e.clientY - pressed.y) < DRAG_SLOP
    )
      return
    dragging = true
    h.drag?.(e.clientX - prev.x, e.clientY - prev.y, e)
  }
  const onUp = (e: PointerEvent) => {
    if (!points.delete(e.pointerId)) return
    if (points.size === 1) {
      // From two fingers to one: the pinch is over, a drag goes on from here.
      if (pinching) h.end()
      pinching = false
      spread = 0
      dragging = true
      return
    }
    if (points.size === 0) {
      pressed = null
      if (dragging && drags) h.release?.()
      dragging = false
    }
  }

  el.addEventListener("wheel", onWheel, { passive: false })
  el.addEventListener("gesturestart", onGestureStart)
  el.addEventListener("gesturechange", onGestureChange)
  el.addEventListener("gestureend", onGestureEnd)
  el.addEventListener("pointerdown", onDown)
  window.addEventListener("pointermove", onMove)
  window.addEventListener("pointerup", onUp)
  window.addEventListener("pointercancel", onUp)
  return () => {
    window.clearTimeout(wheelEnd)
    el.removeEventListener("wheel", onWheel)
    el.removeEventListener("gesturestart", onGestureStart)
    el.removeEventListener("gesturechange", onGestureChange)
    el.removeEventListener("gestureend", onGestureEnd)
    el.removeEventListener("pointerdown", onDown)
    window.removeEventListener("pointermove", onMove)
    window.removeEventListener("pointerup", onUp)
    window.removeEventListener("pointercancel", onUp)
  }
}
