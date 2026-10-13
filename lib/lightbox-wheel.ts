import {
  type Band,
  wheelTick as boundTick,
  clamp,
  clampPan,
  dismissCommit,
  dragProgress,
  dragScale,
  INTENT,
  PINCH_CLOSE,
  PINCH_PASSED,
  type Point,
  type Pose,
  panBounds,
  pinchProgress,
  rawPan,
  rubber,
  type Sample,
  type Size,
  type View,
  velocity,
  WHEEL_ZOOM,
  wheelIsHand,
  wheelPx,
  zoomAt,
} from "@/lib/lightbox-motion"
import {
  type Phase,
  phaseFeed,
  phaseStart,
} from "@/lib/lightbox-wheel-phase"

/** `pass`: the guard rejected this stream (it opened on a coast), so it is ignored
 *  whole. `dead`: the lightbox is leaving, nothing that follows can mean anything. */
export type WheelAxis = "zoom" | "pan" | "y" | "pass" | "dead"

export type WheelSession = {
  axis: WheelAxis
  live: boolean
  /** The first raw vertical ticks, for the inertia guard. */
  ticks: readonly number[]
  x: number
  y: number
  grab: Pose
  /** The grab read back through the pan rubber. */
  raw0: Point
  /** The raw scale the ticks accumulated; the pose wears it rubbered. */
  zoom: number
  /** The highest scale this pinch reached: a pinch that went past the ceiling first
   *  is a zoom being undone, not a dismiss. */
  pinchMax: number
  samples: readonly Sample[]
  last: number
  at: Point
  /** Hand or coast, carried across the session's ticks. The binder reads `endsIn` off
   *  it to time the silence that ends a session; no landing is decided on it. */
  phase: Phase
}

/** One wheel event, in the band's frame. */
export type WheelInput = {
  deltaX: number
  deltaY: number
  deltaMode: number
  ctrl: boolean
  /** The cursor relative to the band center. */
  at: Point
  now: number
}

/** What the engine knows at this tick. */
export type WheelCtx = {
  pose: Pose
  fitted: Size
  band: Band
  zoomMax: number
  /** The visual viewport's height: the dismiss drag's scale. */
  vh: number
  /** The media is a frame: nothing to zoom. */
  frame: boolean
}

export type WheelEffect =
  /** The hand took the image: the engine pauses flights and marks the gesture. */
  | { kind: "grab" }
  /** The hand is done and what follows is only decay: the chrome comes back NOW,
   *  not when the tail finally dies. */
  | { kind: "release" }
  | { kind: "pose"; pose: Pose }
  | { kind: "exit"; vy: number }

/** At fit, with no ctrl held, a wheel is the TRACK's or the dismiss drag's, and
 *  which one is decided from the travel so far, not from one event: the first event
 *  of a two-finger swipe carries whatever the fingers happened to be doing, so
 *  reading the axis off it hands horizontal swipes to the dismiss and back again at
 *  random. Vertical must also WIN clearly, because sideways is the common verb here
 *  and a swipe that drifts a little must not become a dismiss. */
export function wheelIsTrackable(input: WheelInput, ctx: WheelCtx): boolean {
  return !input.ctrl && ctx.pose.s <= 1.01
}

/** Undecided until the travel is worth reading. `null` while the stream is still
 *  too small to have a direction. */
export function wheelAxisOf(travel: Point): "x" | "y" | null {
  if (Math.max(Math.abs(travel.x), Math.abs(travel.y)) < INTENT) return null
  return Math.abs(travel.y) > 1.5 * Math.abs(travel.x) ? "y" : "x"
}

const begin = (input: WheelInput, ctx: WheelCtx, phase: Phase) => {
  const axis: WheelAxis = input.ctrl ? "zoom" : ctx.pose.s > 1.01 ? "pan" : "y"
  if (axis === "zoom" && ctx.frame) return null
  const session: WheelSession = {
    axis,
    live: axis !== "y",
    ticks: [],
    x: 0,
    y: 0,
    grab: ctx.pose,
    raw0: rawPan(ctx.pose, ctx.fitted, ctx.band),
    zoom: ctx.pose.s,
    pinchMax: ctx.pose.s,
    samples: [],
    last: 0,
    at: input.at,
    phase,
  }
  // A vertical session grabs only once the inertia guard has let it through.
  const effects: WheelEffect[] = axis === "y" ? [] : [{ kind: "grab" }]
  return { session, effects }
}

/** A tick: a null session starts one (or refuses: a zoom on a frame), a decided one
 *  ignores the coast that follows, a live one moves the content. Lines and pages
 *  become px here; the guard reads the tick the device sent, motion reads it
 *  bounded. Every event is fed to the phase detector first, session or no session,
 *  because the hand returning mid-coast is what opens the next one. */
export function wheelTick(
  session: WheelSession | null,
  input: WheelInput,
  ctx: WheelCtx,
): { session: WheelSession | null; effects: WheelEffect[] } {
  const rawY = wheelPx(input.deltaY, input.deltaMode, ctx.band.h)
  const dy = boundTick(rawY)
  const fed = phaseFeed(session ? session.phase : phaseStart(), {
    dx: wheelPx(input.deltaX, input.deltaMode, ctx.band.h),
    dy: rawY,
    t: input.now,
  })
  // The hand came back while the device was still coasting: the old session is over
  // and this event opens a new one, from wherever the pose now is.
  const live = session && !fed.read.interrupted ? session : null
  const opened = live
    ? { session: { ...live, phase: fed.phase }, effects: [] }
    : begin(input, ctx, fed.phase)
  if (!opened) return { session: null, effects: [] }
  const effects: WheelEffect[] = opened.effects
  let w = { ...opened.session, phase: fed.phase }
  const axis = w.axis
  if (axis === "dead" || axis === "pass") return { session: w, effects }
  w = { ...w, last: input.now, at: input.at }
  switch (axis) {
    case "zoom": {
      // The raw accumulator rubbers (soft floor under fit, stiff over the ceiling),
      // the way a drag offsets from its grab.
      const raw = w.zoom * Math.exp(-dy * WHEEL_ZOOM)
      w = { ...w, zoom: raw, pinchMax: Math.max(w.pinchMax, raw) }
      // Pinching IN from fit is the dismiss, exactly as it is under two fingers on
      // glass: it follows and lights the room instead of rubbering against a floor.
      // A trackpad pinch is the same gesture as a phone pinch and a reader who has
      // learnt one on one device is owed it on the other. A pinch that went past the
      // ceiling first, or one from a zoom, still springs back untouched.
      const dismissing =
        w.grab.s <= 1.01 && raw < 1 && w.pinchMax < PINCH_PASSED
      const s = dismissing ? raw : rubber(raw, 1, ctx.zoomMax)
      const v = zoomAt(ctx.pose, s, w.at)
      effects.push({
        kind: "pose",
        pose: {
          ...v,
          p: dismissing ? Math.min(ctx.pose.p, pinchProgress(s)) : ctx.pose.p,
        },
      })
      return { session: w, effects }
    }
    case "pan": {
      const b = panBounds(ctx.pose, ctx.fitted, ctx.band)
      const dx = boundTick(wheelPx(input.deltaX, input.deltaMode, ctx.band.h))
      // A wheel pan STOPS at the edge. A rubber band is for direct manipulation,
      // where the image is under a finger and the give is what says "this is the
      // end"; on a trackpad there is nothing under the finger, so all it does is
      // freeze the picture at the cap while the reader keeps pushing, and then owe a
      // long way home. The ACCUMULATOR is clamped along with the pose, so panning
      // back moves on the very first pixel instead of unwinding a debt.
      const x = clamp(w.raw0.x + w.x - dx, -b.x, b.x)
      const y = clamp(w.raw0.y + w.y - dy, -b.y, b.y)
      w = { ...w, x: x - w.raw0.x, y: y - w.raw0.y }
      effects.push({ kind: "pose", pose: { ...ctx.pose, x, y } })
      return { session: w, effects }
    }
    case "y": {
      // Nothing accumulates before the guard decides: a session it rejects is passed
      // through whole, one it accepts starts from its first applied tick, offsetting
      // the pose it finds there.
      if (!w.live) {
        const ticks = [...w.ticks, Math.abs(rawY)]
        w = { ...w, ticks }
        if (ticks.length < 3) return { session: w, effects }
        if (!wheelIsHand(ticks))
          return { session: { ...w, axis: "pass" }, effects }
        effects.push({ kind: "grab" })
        w = { ...w, live: true, grab: ctx.pose }
      }
      w = { ...w, y: w.y - dy }
      const g = w.grab
      effects.push({
        kind: "pose",
        pose: {
          x: g.x,
          y: g.y + w.y,
          s: g.s * dragScale(w.y, ctx.vh),
          p: g.p * dragProgress(w.y, ctx.vh),
        },
      })
      w = { ...w, samples: [...w.samples, { x: 0, y: w.y, t: input.now }] }
      const v = velocity(w.samples, input.now)
      if (dismissCommit(w.y, v.y, ctx.vh)) {
        w = { ...w, axis: "dead" }
        effects.push({ kind: "release" }, { kind: "exit", vy: v.y })
      }
      return { session: w, effects }
    }
    default: {
      const never: never = axis
      throw new Error(`lightbox: wheel axis ${String(never)}`)
    }
  }
}

export type WheelRelease =
  | { kind: "none" }
  /** Zoom let go under fit but not far enough to close: spring back to fit. */
  | { kind: "fit" }
  /** Pinched in past the close line: leave, the way two fingers do. */
  | { kind: "exit" }
  /** Zoom let go: undo the rubber at the cursor, then momentum and clamp. */
  | { kind: "zoom"; at: Point }
  /** Pan let go: back inside the bounds. */
  | { kind: "pan"; target: View }
  /** A dismiss drag that did not commit: home under the hand's spring, with its speed. */
  | { kind: "cancel"; vel: Point }

/** The stream stopped: the session ends and decides where the pose lands. */
export function wheelRelease(
  w: WheelSession,
  ctx: Pick<WheelCtx, "pose" | "fitted" | "band">,
): WheelRelease {
  const v = velocity(w.samples, w.last)
  switch (w.axis) {
    case "pass":
    case "dead":
      return { kind: "none" }
    case "zoom":
      // The same close rule the fingers use, so the two devices agree.
      if (ctx.pose.s < PINCH_CLOSE && w.pinchMax < PINCH_PASSED)
        return { kind: "exit" }
      return ctx.pose.s < 1 ? { kind: "fit" } : { kind: "zoom", at: w.at }
    case "pan":
      return { kind: "pan", target: clampPan(ctx.pose, ctx.fitted, ctx.band) }
    case "y":
      return w.live ? { kind: "cancel", vel: v } : { kind: "none" }
    default: {
      const never: never = w.axis
      throw new Error(`lightbox: wheel axis ${String(never)}`)
    }
  }
}
