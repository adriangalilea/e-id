import {
  type Band,
  clampPan,
  DOUBLE_MOUSE,
  DOUBLE_TOUCH,
  DOUBLE_TRAVEL,
  dismissCommit,
  dragProgress,
  dragScale,
  INTENT,
  overshoot,
  PINCH_CLOSE,
  PINCH_PASSED,
  type Point,
  type Pose,
  panBounds,
  pinchProgress,
  project,
  RELOCK,
  rawPan,
  rubber,
  SAMPLES,
  type Sample,
  type Size,
  TAP_TRAVEL,
  type View,
  velocity,
  zoomAt,
} from "@/lib/lightbox-motion"

export type Gesture = {
  /** Live pointers, by id, in client px. */
  pts: ReadonlyMap<number, Point>
  start: Sample
  samples: readonly Sample[]
  prev: Point
  grab: Pose
  raw0: Point
  axis: "x" | "y" | null
  mode: "pan" | "fit"
  pinch: { s0: number; p0: number; d0: number; mid0: Point; view0: View } | null
  pinched: boolean
  pinchMax: number
  anchor: Point
  /** One run per axis, each restarting when ITS OWN axis turns and counting the other
   *  from that instant. A relock is a RUN of consistent motion, never one event: at
   *  120 Hz a finger sends 2-4 px per move, so a threshold tested per event can only
   *  be crossed by a jump no hand makes. And the window has to restart on the turn,
   *  or the ratio is measured against a whole swipe's worth of the other axis and can
   *  never be beaten either. `runY.x` is unsigned travel, `runY.y` is signed. */
  runY: Point
  runX: Point
  onMedia: boolean
  type: string
}

/** One pointer event, with the band-relative point the binder computed. */
export type PointerInput = {
  id: number
  /** Client px. */
  x: number
  y: number
  /** `at` relative to the band center. */
  at: Point
  t: number
  type: string
  onMedia: boolean
  /** Coalesced positions of this move, oldest first; the move itself when empty. */
  hand?: readonly Sample[]
  /** The pinch midpoint relative to the band center; the binder measures it because
   *  only it knows where the band sits on screen. */
  mid?: Point
}

export type GestureCtx = {
  pose: Pose
  fitted: Size
  band: Band
  zoomMax: number
  vh: number
  /** The media cannot be zoomed or pinched (a frame). */
  frame: boolean
}

export type GestureEffect =
  /** Read the flight at its clock and drop it: the pinch or the relock starts live. */
  | { kind: "sync" }
  | { kind: "pose"; pose: Pose }
  /** Drag the scroll container by this many px (a mouse only; see gestureMove). */
  | { kind: "scroll"; dx: number }
  /** The image flies back to the grab while the track takes the hand; settles nothing. */
  | { kind: "unpose"; target: Pose }
  | { kind: "trace"; text: string }

const push = (samples: readonly Sample[], s: Sample): Sample[] => {
  const next = [...samples, s]
  return next.length > SAMPLES ? next.slice(next.length - SAMPLES) : next
}

const dist = (pts: ReadonlyMap<number, Point>) => {
  const [a, b] = [...pts.values()] as [Point, Point]
  return Math.hypot(a.x - b.x, a.y - b.y)
}
export const midOf = (pts: ReadonlyMap<number, Point>): Point => {
  const [a, b] = [...pts.values()] as [Point, Point]
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** A pointer went down: a new gesture, or another finger on the live one. A second
 *  finger opens the pinch, computed FROM the pose, so the binder syncs first. */
export function gestureDown(
  g: Gesture | null,
  input: PointerInput,
  ctx: GestureCtx,
): { gesture: Gesture; effects: GestureEffect[] } {
  const effects: GestureEffect[] = []
  let next: Gesture
  if (g) {
    next = {
      ...g,
      pts: new Map(g.pts).set(input.id, { x: input.x, y: input.y }),
    }
    effects.push({
      kind: "trace",
      text: `down ${input.type} #${input.id} +finger`,
    })
  } else {
    const mode: Gesture["mode"] = ctx.pose.s > 1.01 ? "pan" : "fit"
    next = {
      pts: new Map([[input.id, { x: input.x, y: input.y }]]),
      start: { x: input.x, y: input.y, t: input.t },
      samples: [],
      prev: { x: input.x, y: input.y },
      grab: ctx.pose,
      raw0: rawPan(ctx.pose, ctx.fitted, ctx.band),
      axis: null,
      mode,
      pinch: null,
      pinched: false,
      pinchMax: ctx.pose.s,
      anchor: input.at,
      runY: { x: 0, y: 0 },
      runX: { x: 0, y: 0 },
      onMedia: input.onMedia,
      type: input.type,
    }
    effects.push({
      kind: "trace",
      text: `down ${input.type} #${input.id} ${mode} ${input.onMedia ? "media" : "backdrop"}`,
    })
  }
  if (next.pts.size === 2 && !ctx.frame) {
    // The pinch is computed FROM the pose: a flight in progress (the y-to-x relock)
    // is read and dropped first, so s0 and view0 are the live pose.
    effects.push({ kind: "sync" })
    next = {
      ...next,
      pinch: {
        s0: ctx.pose.s,
        p0: ctx.pose.p,
        d0: dist(next.pts),
        mid0: input.mid ?? { x: 0, y: 0 },
        view0: ctx.pose,
      },
      pinched: true,
      axis: null,
      samples: [],
    }
    effects.push({ kind: "trace", text: "pinch start" })
  }
  return { gesture: next, effects }
}

/** A move: the pinch follows the fingers, a pan offsets the rubbered grab, and a
 *  single finger at fit locks an axis at INTENT and relocks at RELOCK. */
export function gestureMove(
  g: Gesture,
  input: PointerInput,
  ctx: GestureCtx,
): { gesture: Gesture; effects: GestureEffect[] } {
  const effects: GestureEffect[] = []
  let next: Gesture = {
    ...g,
    pts: new Map(g.pts).set(input.id, { x: input.x, y: input.y }),
  }
  const pinch = next.pinch
  if (pinch && next.pts.size >= 2) {
    const ms = midOf(next.pts)
    next = {
      ...next,
      samples: push(next.samples, { x: ms.x, y: ms.y, t: input.t }),
    }
    const raw = (pinch.s0 * dist(next.pts)) / pinch.d0
    next = { ...next, pinchMax: Math.max(next.pinchMax, raw) }
    // From fit, pinching in is the dismiss gesture and follows the fingers, lighting
    // the room, the same rule the release closes by; a pinch that went past the
    // ceiling first, or one from a zoom, rubbers under 1 and springs back, the room
    // untouched.
    const dismissing =
      pinch.s0 <= 1.01 && raw < 1 && next.pinchMax < PINCH_PASSED
    const s = dismissing ? raw : rubber(raw, 1, ctx.zoomMax)
    const m = input.mid ?? next.anchor
    next = { ...next, anchor: m }
    const v = zoomAt(pinch.view0, s, pinch.mid0)
    const px = v.x + m.x - pinch.mid0.x
    const py = v.y + m.y - pinch.mid0.y
    // The pinch's pan wears the same band the drag does, against the bounds of the
    // scale it is CURRENTLY at. Unbounded, pinching out left the image hundreds of px
    // outside a bound that had just shrunk under it, which is a pose no rubber could
    // have produced: the next finger down asked `rawPan` to undo a rubbering that
    // never happened, and it threw, and a thrown `gestureDown` wedges every touch
    // after it. Dismissing is the exception, being a pinch whose whole point is to
    // carry the picture away, and its bounds are meaningless because it is under fit.
    const b = panBounds({ x: 0, y: 0, s }, ctx.fitted, ctx.band)
    // A pinch that starts mid-drag carries the drag's darkness: p never jumps.
    effects.push({
      kind: "pose",
      pose: {
        x: dismissing ? px : overshoot(px, b.x),
        y: dismissing ? py : overshoot(py, b.y),
        s,
        p: dismissing ? Math.min(pinch.p0, pinchProgress(s)) : pinch.p0,
      },
    })
    return { gesture: next, effects }
  }
  if (next.pts.size !== 1) return { gesture: next, effects }
  for (const s of input.hand ?? [{ x: input.x, y: input.y, t: input.t }])
    next = { ...next, samples: push(next.samples, s) }
  next = { ...next, anchor: input.at }
  const dx = input.x - next.start.x
  const dy = input.y - next.start.y
  const mx = input.x - next.prev.x
  const my = input.y - next.prev.y
  // Each run restarts when its own axis turns, so a wobble cannot accumulate into an
  // intent and a steady push is never diluted by the travel that came before it.
  const turnedY = my !== 0 && Math.sign(my) !== Math.sign(next.runY.y)
  const turnedX = mx !== 0 && Math.sign(mx) !== Math.sign(next.runX.x)
  next = {
    ...next,
    prev: { x: input.x, y: input.y },
    runY: turnedY
      ? { x: Math.abs(mx), y: my }
      : { x: next.runY.x + Math.abs(mx), y: next.runY.y + my },
    runX: turnedX
      ? { x: mx, y: Math.abs(my) }
      : { x: next.runX.x + mx, y: next.runX.y + Math.abs(my) },
  }
  if (next.mode === "pan") {
    const b = panBounds(next.grab, ctx.fitted, ctx.band)
    effects.push({
      kind: "pose",
      pose: {
        ...next.grab,
        x: overshoot(next.raw0.x + dx, b.x),
        y: overshoot(next.raw0.y + dy, b.y),
      },
    })
    return { gesture: next, effects }
  }
  // The finger left after a pinch drifts a few px: that is never a drag.
  if (next.axis === null) {
    if (Math.abs(dx) + Math.abs(dy) < INTENT) return { gesture: next, effects }
    const axis = next.pinched || Math.abs(dx) <= Math.abs(dy) ? "y" : "x"
    next = { ...next, axis }
    if (axis === "y") effects.push({ kind: "trace", text: "axis y" })
  } else if (
    // A RUN, not an event. Measured on a phone: this is what turns a swipe through
    // the pictures into a dismiss without lifting, and it never fired, because at
    // 120 Hz a finger sends 2-4 px per move and `|my| > 12` in ONE of them is a jump
    // no hand makes. A headless rig stepping 30 px at a time passed it happily, which
    // is the whole reason a rig does not grant sign-off.
    next.axis === "x" &&
    Math.abs(next.runY.y) > RELOCK &&
    Math.abs(next.runY.y) > 2 * next.runY.x
  ) {
    next = { ...next, axis: "y" }
    effects.push({ kind: "trace", text: "axis y" }, { kind: "sync" })
  } else if (
    // The mirror, on its own run for the same reason.
    next.axis === "y" &&
    !next.pinched &&
    Math.abs(next.runX.x) > RELOCK &&
    Math.abs(next.runX.x) > 2 * next.runX.y
  ) {
    next = { ...next, axis: "x" }
    effects.push(
      { kind: "trace", text: "axis x (relock)" },
      { kind: "unpose", target: next.grab },
    )
  }
  if (next.axis === "y") {
    effects.push({
      kind: "pose",
      pose: {
        x: next.grab.x,
        y: next.grab.y + dy,
        s: next.grab.s * dragScale(dy, ctx.vh),
        p: next.grab.p * dragProgress(dy, ctx.vh),
      },
    })
  } else {
    // Sideways is the track's, and the ENGINE carries it, for every pointer. The
    // slot is `touch-action: none`, so the browser never claims the pan and there is
    // never a second mover — which is the only reason this is safe. It was a bug
    // once under `pan-x`: the axis locks at INTENT (6px) several moves before the
    // compositor commits, so those moves wrote `scrollLeft` on a scroller the
    // compositor was also moving, then the platform took the pan and the magnets
    // came back on between two slides.
    //
    // Handing the pan to the browser fixed that and cost something worse. Once it
    // claims the touch, `pointercancel` ends OUR gesture with the finger still down,
    // so the rest of that touch can never become anything else: a reader swiping
    // through pictures who then swipes UP to dismiss is refused, with no way to know
    // why, until they lift and start again. A dismiss that clear is not an accident,
    // and nobody moves in a perfectly straight line.
    effects.push({ kind: "scroll", dx: mx })
  }
  return { gesture: next, effects }
}

export type GestureRelease =
  /** Fingers remain: the gesture regrabs around the one left. */
  | { kind: "hold"; gesture: Gesture }
  /** A pinch let go under the close rule: leave, with the hand's velocity. */
  | { kind: "exit"; vel: Point }
  /** A pinch or a dismiss that did not commit: home under the hand's spring.
   *  `zoomed` when a pinch let go under fit, the one case React still reads 1. */
  | { kind: "cancel"; vel: Point; zoomed: boolean }
  /** A pinch over fit: undo the rubber at the anchor, then momentum and clamp. */
  | { kind: "zoom"; vel: Point; at: Point }
  /** Nothing moved far enough to be a drag. */
  | { kind: "tap"; at: Point; x: number; y: number; t: number }
  /** A pan flick: coast, and bounce off whichever wall cuts it short. */
  | { kind: "coast"; coast: View; target: View; vel: Point }
  /** An axis was locked but the release decides nothing: resume what was flying. */
  | { kind: "resume" }
  /** A mouse let the track go: hand it back to the platform's snap. */
  | { kind: "snap" }

/** A pointer lifted (or cancelled). The release instant is the clock, not a sample:
 *  a hand held still before lifting reads as stopped, a mouse button lifting late
 *  keeps the hand's speed. */
export function gestureUp(
  g: Gesture,
  input: PointerInput,
  ctx: GestureCtx,
): GestureRelease {
  const pts = new Map(g.pts)
  pts.delete(input.id)
  if (pts.size === 1) {
    const [p] = [...pts.values()] as [Point]
    return {
      kind: "hold",
      gesture: {
        ...g,
        pts,
        pinch: null,
        samples: [],
        grab: ctx.pose,
        raw0: rawPan(ctx.pose, ctx.fitted, ctx.band),
        start: { x: p.x, y: p.y, t: input.t },
        prev: p,
        runY: { x: 0, y: 0 },
        runX: { x: 0, y: 0 },
        axis: null,
        mode: ctx.pose.s > 1.01 ? "pan" : "fit",
      },
    }
  }
  if (pts.size > 0) return { kind: "hold", gesture: { ...g, pts } }
  const v = velocity(g.samples, input.t)
  if (g.pinched) {
    const s = ctx.pose.s
    if (s < PINCH_CLOSE && g.pinchMax < PINCH_PASSED)
      return { kind: "exit", vel: v }
    if (s < 1) return { kind: "cancel", vel: v, zoomed: true }
    return { kind: "zoom", vel: v, at: g.anchor }
  }
  const travel = Math.hypot(input.x - g.start.x, input.y - g.start.y)
  if (g.axis === null && travel < TAP_TRAVEL)
    return { kind: "tap", at: input.at, x: input.x, y: input.y, t: input.t }
  // A pan has no axis (it moves on both): its release is the coast, before the axis
  // test, or a flick would resume a stale aim and stop dead past the bound.
  if (g.mode === "pan") {
    const coast = {
      x: project(ctx.pose.x, v.x),
      y: project(ctx.pose.y, v.y),
      s: ctx.pose.s,
    }
    return {
      kind: "coast",
      coast,
      target: clampPan(coast, ctx.fitted, ctx.band),
      vel: v,
    }
  }
  if (g.axis === null) return { kind: "resume" }
  if (g.axis === "y") {
    // The rule is about drag distance: mid-fly the absolute y still holds the source
    // offset, so the delta from the grab is what is tested. The axis is locked:
    // lateral hand speed never reaches the spring.
    const vy = { x: 0, y: v.y }
    return dismissCommit(ctx.pose.y - g.grab.y, v.y, ctx.vh)
      ? { kind: "exit", vel: vy }
      : { kind: "cancel", vel: vy, zoomed: false }
  }
  // The hand dragged the scroller and the engine has to land it, whatever the hand
  // was. A pointer SAYS when it let go, which is the one thing a wheel never does,
  // so this needs no threshold, no silence and no guessing.
  return { kind: "snap" }
}

export type TapIntent =
  /** Nothing but settle what was flying. */
  | { kind: "settle" }
  | { kind: "escape" }
  | { kind: "zoom"; at: Point }
  | { kind: "chrome" }
  /** A finger's first tap at fit: the chrome toggles unless a second tap lands. */
  | { kind: "wait"; ms: number }

/** The tap ladder. `last` is the previous tap of this session (the binder holds it,
 *  and clears it when the wait fires). A pointer with a cursor is told what a click
 *  does (zoom-in, zoom-out): one click toggles the zoom at the point, and the second
 *  click of a double click is the same intent, already served. A finger has no
 *  cursor: one tap toggles the chrome, two toggle the zoom. */
export function tapIntent(
  last: Sample | null,
  tap: { at: Point; x: number; y: number; t: number; type: string },
  g: Pick<Gesture, "onMedia">,
  ctx: Pick<GestureCtx, "pose"> & { kind: string },
): { last: Sample | null; intents: TapIntent[] } {
  const keep = { x: tap.x, y: tap.y, t: tap.t }
  if (!g.onMedia)
    return {
      last: null,
      intents: [ctx.pose.s <= 1.01 ? { kind: "escape" } : { kind: "settle" }],
    }
  // A tap on a video is the video's (its controls, the platform's play toggle); a
  // tap on a frame is the frame's.
  if (ctx.kind === "video" || ctx.kind === "frame")
    return { last: null, intents: [{ kind: "settle" }] }
  const span = tap.type === "touch" ? DOUBLE_TOUCH : DOUBLE_MOUSE
  const again =
    last !== null &&
    tap.t - last.t < span &&
    Math.hypot(tap.x - last.x, tap.y - last.y) < DOUBLE_TRAVEL
  if (tap.type !== "touch") {
    if (again) return { last: null, intents: [{ kind: "settle" }] }
    return { last: keep, intents: [{ kind: "zoom", at: tap.at }] }
  }
  if (again) return { last: null, intents: [{ kind: "zoom", at: tap.at }] }
  return {
    last: keep,
    intents:
      ctx.pose.s <= 1.01
        ? [{ kind: "wait", ms: DOUBLE_TOUCH }, { kind: "settle" }]
        : [{ kind: "settle" }],
  }
}
