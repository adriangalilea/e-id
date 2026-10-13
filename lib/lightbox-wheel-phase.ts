import type { Point } from "@/lib/lightbox-motion"

/** A decaying velocity ratio inside this band is a physics model coasting. Outside
 *  it, something is pushing. */
export const ACC_MIN = 0.6
export const ACC_MAX = 0.96
/** Events are averaged in pairs before velocity: one raw wheel event is too noisy to
 *  take a ratio of. */
export const MERGE = 2
/** How many consecutive merged points must agree before we believe it is momentum.
 *  Every one of them is two wheel events, so this is the LATENCY of knowing the hand
 *  has let go, and that latency is felt directly: until it fires the device is still
 *  coasting and the reader cannot tell where they will land. Three, not five. A hand
 *  that decelerates evenly enough to be mistaken for a model over six events was
 *  stopping anyway, and if it pushes again `interrupted` hands the stream straight
 *  back. */
export const ANALYZE = 3
/** No single event moves more than this; a device reporting more is lying. */
export const DELTA_MAX = 700
/** Before the first two events time the stream, assume a slow mouse: a long window,
 *  so an old device emitting rarely still reads as one continuous gesture. */
export const ENDS_IN_DEFAULT = 400
export const ENDS_IN_MAX = 1000
/** Momentum is cut short by a delta this many times the last one: the hand is back. */
export const HAND_RETURN = 2

export type Wheel = { dx: number; dy: number; t: number }

export type Phase = {
  live: boolean
  opened: boolean
  momentum: boolean
  lastAbs: number
  movement: Point
  velocity: Point
  accelerations: readonly Point[]
  points: readonly { sum: Point; t: number }[]
  merging: readonly Wheel[]
  endsIn: number
}

/** What this event says about the stream. */
export type PhaseRead = {
  /** A stream opened here: the first event, or the hand cutting momentum short. */
  start: boolean
  /** The device is coasting: this delta is not a person and must move nothing. */
  momentum: boolean
  /** Momentum was interrupted by the hand coming back. */
  interrupted: boolean
  /** px per ms, per axis. */
  velocity: Point
  /** Total travel since the stream opened. */
  movement: Point
  /** Call the stream over after this long with no event. Adapts to the device's own
   *  rate, so a 120 Hz trackpad is not held to a slow mouse's window. */
  endsIn: number
}

const clamp = (v: number) => Math.min(DELTA_MAX, Math.max(-DELTA_MAX, v))
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y })
const absMax = (p: Point) => Math.max(Math.abs(p.x), Math.abs(p.y))

export function phaseStart(): Phase {
  return {
    live: false,
    opened: false,
    momentum: false,
    lastAbs: Number.POSITIVE_INFINITY,
    movement: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    accelerations: [],
    points: [],
    merging: [],
    endsIn: ENDS_IN_DEFAULT,
  }
}

/** Every acceleration factor of the last ANALYZE merged points reads as a model
 *  coasting: both axes inside the decay band (a still axis reads 0 and abstains), or
 *  both decaying at exactly the same rate, which a hand does not do. */
function coasting(accelerations: readonly Point[]): boolean {
  if (accelerations.length < ANALYZE) return false
  return accelerations.slice(-ANALYZE).every((a) => {
    const inBand = (v: number) => v === 0 || (v >= ACC_MIN && v <= ACC_MAX)
    const locked = a.x === a.y && a.x < 1 && a.x !== 0
    return locked || (inBand(a.x) && inBand(a.y))
  })
}

/** The window to wait before calling the stream over, from the device's own event
 *  rate. Doubled while the hand may still be on the glass: ending a live gesture
 *  early is far worse than ending a coast late. */
function endsIn(deltaTime: number, momentum: boolean): number {
  const base = Math.ceil(deltaTime / 10) * 10 * 1.2
  return Math.min(
    ENDS_IN_MAX,
    Math.round(momentum ? base : Math.max(100, base * 2)),
  )
}

/** One wheel event. Deltas arrive in px (the caller resolves deltaMode). */
export function phaseFeed(
  p: Phase,
  e: Wheel,
): { phase: Phase; read: PhaseRead } {
  const delta = { x: clamp(e.dx), y: clamp(e.dy) }
  const reach = absMax(delta)
  // The hand came back mid-coast: this event opens a new stream, and the old one is
  // reported interrupted so its decision is not taken twice.
  const interrupted =
    p.live && p.momentum && reach > Math.max(2, p.lastAbs * HAND_RETURN)
  let s = !p.live || interrupted ? { ...phaseStart(), live: true } : p

  s = {
    ...s,
    lastAbs: reach,
    movement: add(s.movement, delta),
    merging: [...s.merging, { dx: delta.x, dy: delta.y, t: e.t }],
  }

  if (s.merging.length === MERGE) {
    // A merged point: the pair's total travel at the pair's mean time.
    const sum = s.merging.reduce<Point>(
      (acc, w) => add(acc, { x: w.dx, y: w.dy }),
      { x: 0, y: 0 },
    )
    const t = s.merging.reduce((acc, w) => acc + w.t, 0) / s.merging.length
    const prev = s.points[0]
    let next = s
    if (prev && t > prev.t) {
      const dt = t - prev.t
      const velocity = { x: sum.x / dt, y: sum.y / dt }
      // The ratio to the previous velocity IS the signal. A zero previous velocity
      // divides by one so a still axis reads 0 and abstains rather than exploding.
      const acceleration = {
        x: velocity.x / (s.velocity.x || 1),
        y: velocity.y / (s.velocity.y || 1),
      }
      const accelerations = [...s.accelerations, acceleration].slice(-ANALYZE)
      const momentum = s.momentum || coasting(accelerations)
      next = {
        ...s,
        velocity,
        accelerations,
        momentum,
        endsIn: endsIn(dt, momentum),
      }
    }
    s = { ...next, points: [{ sum, t }], merging: [] }
  } else if (!s.opened) {
    // Before a pair exists there is no ratio to take: velocity is this event's travel
    // over the window we would have waited anyway, which is the right order.
    const w = s.merging[s.merging.length - 1] as Wheel
    s = { ...s, velocity: { x: w.dx / s.endsIn, y: w.dy / s.endsIn } }
  }

  const start = !s.opened
  s = { ...s, opened: true }
  return {
    phase: s,
    read: {
      start,
      momentum: s.momentum,
      interrupted,
      velocity: s.velocity,
      movement: s.movement,
      endsIn: s.endsIn,
    },
  }
}
