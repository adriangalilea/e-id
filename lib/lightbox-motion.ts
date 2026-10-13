export type View = { x: number; y: number; s: number }
/** The view plus `p`, how far the room is lit: 0 at the source, 1 at rest. */
export type Pose = View & { p: number }
export type Size = { w: number; h: number }
export type Rect = {
  x: number
  y: number
  w: number
  h: number
  radius: number
}
export type Band = { top: number; left: number; w: number; h: number }
export type Point = { x: number; y: number }
export type Tuning = { zeta: number; f: number }
/** One tuning for every axis, or one per axis: a flick that coasts on x while y
 *  bounces off a wall runs COAST and MACHINE side by side. */
export type Tunings<K extends string> = Tuning | Readonly<Record<K, Tuning>>

export function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`lightbox: ${msg}`)
}

/** Machine moves: enter, exit, zoom, pan recovery, step. */
export const MACHINE: Tuning = { zeta: 1, f: 4.5 }
/** Hand releases: dismiss cancel, slide commit. A little weight. */
export const HAND: Tuning = { zeta: 0.82, f: 4.5 }
/** Reduced motion: the target is assumed at once. */
export const STILL: Tuning = { zeta: 1, f: Infinity }

export const FIT: View = { x: 0, y: 0, s: 1 }
/** Exit target when the trigger left the page: a cut, never an abort. */
export const GONE: View = { x: 0, y: 0, s: 0.92 }

export const SLIDE_GAP = 32
export const MOMENTUM = 199
/** A free coast after a flick: the projected rest is `v · MOMENTUM` away, and a
 *  critically damped spring whose ω = 1/MOMENTUM is the exact exponential decay that
 *  projection assumes, so the hand's velocity is never exceeded. A stiffer spring
 *  aimed that far away accelerates first (2.1x the release speed with MACHINE). */
export const COAST: Tuning = { zeta: 1, f: 1000 / (2 * Math.PI * MOMENTUM) }
export const INTENT = 6
export const RELOCK = 12
export const OVERSHOOT = 0.35
export const TAP_TRAVEL = 4
export const DISMISS_COMMIT = 0.4
/** How far the room must have gone before the page takes the rest of the momentum:
 *  `p` is how lit the room still is, so this is the page being half revealed.
 *
 *  BOTH OR NEITHER. Deciding to leave is not the same instant as being able to see
 *  where you are going, and the decision comes early — a dismiss commits from a
 *  projection, with the picture barely moved and the backdrop still up. Scrolling
 *  there means the page moves behind a curtain, which is exactly the loss of control
 *  the handoff was meant to fix. Waiting for the whole flight to land is the other
 *  failure and reads as a delay. This is the moment they become one motion. */
export const EXIT_HANDOFF = 0.5
export const PINCH_CLOSE = 0.75
export const PINCH_PASSED = 1.067
/** How long a slide takes to arrive, for one slide's worth of distance, scaled by the
 *  square root of how far it actually has to go, and bounded. A move ARRIVES, which a
 *  spring never does: the tail of an approach is a crawl a few px short of home. This
 *  is what the arrow keys feel like, and the swipe uses it too, because the platform's
 *  own snap settle is ~950 ms across a slide in Chromium (deltas decaying 0.92 a frame
 *  until the last one is under a pixel) and no faster on macOS WebKit. */
export const GLIDE = 165
export const GLIDE_MIN = 100
export const GLIDE_MAX = 225
/** A move LEAVES, and the entry tangent says how hard, as a multiple of the average
 *  speed the move needs. Both ends matter.
 *
 *  The floor is why: handed a slow hand's speed, the cubic below is a smoothstep, and
 *  a smoothstep starts at a standstill. Measured on a real swipe, the handover speed
 *  was 6% of the move's own average, so the pictures hung for a beat and then bolted.
 *  Never slower than a quadratic ease-out: out at twice the average, easing in.
 *
 *  The cap is the monotonicity bound. m0 = 3d is exactly cubic ease-out; past it the
 *  cubic turns back on itself before it arrives, and the pictures would visibly
 *  retreat at the end of every fast throw. */
export const GLIDE_ENTRY_MIN = 2
export const GLIDE_ENTRY = 3

/** Share of a slide a wheel gesture must travel to buy the next one, with the hand
 *  still on the glass. Embla's number: it commits past `clamp(20% of the viewport,
 *  50, 225)` px, which on a wide screen is about this. Swiper's 0.5 is not
 *  comparable, being applied at release; a threshold crossed mid-gesture has to be
 *  lower, because the reader sees the answer at once instead of finding out after
 *  they let go. Nothing detects a release, so nothing has to.
 *
 *  It is the price of EVERY slide, because the gesture re-anchors on each one: the
 *  first, the fifth and the one straight back the other way all cost exactly this
 *  much finger. The alternative, a slide read off the TOTAL travel from a fixed
 *  origin, is not a threshold at all but an absolute map, and it is asymmetric in a
 *  way a hand feels immediately: measured, the second slide cost a full slide of
 *  finger while undoing the first cost 7 px. */
export const SWIPE_COMMIT = 0.18

/** A swipe PROJECTS NOTHING. There was a `THROW` constant here, the distance a release
 *  would coast per px/ms, and every version of it was wrong for the same reason: on a
 *  wheel there is nothing to project. A trackpad's momentum arrives as deltas, all of
 *  it, and the binder spends it as it comes. Exact beats estimated, it costs one fewer
 *  constant, and a flick delivers about as much again as the hand did, so speed buys
 *  distance without a coefficient existing anywhere. Do not reintroduce it.
 *
 *  (A POINTER release is different and still projects: `project` above, off `MOMENTUM`,
 *  because a finger that lifts really does stop sending and the coast is ours to run.) */

/** ONE GESTURE BUYS ONE SLIDE. Cross the line and the pictures go there and stay
 *  there; everything the device sends afterwards is ignored until the stream is over.
 *
 *  Skipping several on a hard flick was tried twice, flat-priced and then on a
 *  doubling ladder, and both are a slot machine. The boundary between one and two sits
 *  at some number of pixels of finger, and a reader cannot feel pixels of finger:
 *  measured, 0.46 slides of travel took one picture and 0.63 took two, which is
 *  correct arithmetic and indistinguishable to the hand that did it. Worse, the same
 *  rule is what let a gesture keep leaning toward a slide it had not bought, which is
 *  the drift past the snap point that made the whole thing feel alive.
 *
 *  Every native pager decided this the same way: UIScrollView's `isPagingEnabled`,
 *  Android's `PagerSnapHelper`, Embla with `skipSnaps` off. Three pictures is three
 *  flicks, and three flicks is a second's work and never a surprise. */

/** The pictures LEAN toward the next slide, by this share of the line, and the lean is
 *  the only thing that says how close it is. It is QUADRATIC in the progress, and that
 *  is the whole design.
 *
 *  A trackpad's tail is why. It emits 1-3 px events for HALF A SECOND after a gesture
 *  is over, and they are indistinguishable from a slow deliberate drag — same
 *  magnitude, same cadence — so no rule can tell them apart. Three attempts tried:
 *  a phase detector guessing the release, a magnitude floor, an asymptoting band.
 *
 *  They differ in exactly one thing, DISTANCE. A deliberate drag goes the whole line;
 *  a tail goes a fraction of it. So the lean is squared, and the fraction is squared
 *  with it. Measured on a swipe that had already arrived, its tail then crept 56 px
 *  past the slide over 520 ms and yanked back: the same tail leans 12 px here, under
 *  1% of a wide slide, which is nothing to see and nothing to wind back. It reads
 *  better at the other end too, where the neighbour ACCELERATES in as the line comes
 *  up instead of creeping the whole way. */
export const SWIPE_LEAN = 0.85
export function swipeGive(travel: number, line: number): number {
  assert(line > 0, `a swipe line of ${line}`)
  const t = Math.min(1, Math.abs(travel) / line)
  return Math.sign(travel) * SWIPE_LEAN * line * t * t
}

/** A swipe is over after this long without a wheel event. Shorter than the wheel
 *  session's own window, which is doubled while a hand may still be down because
 *  ending a zoom early is bad. Ending a swipe early is nearly free: the give winds
 *  back, the slides it bought are already bought, and a hand that comes back starts
 *  from scratch, which is what it should do anyway. */
export const SWIPE_END = 110

/** A gesture that has already bought its slide is over, but the device keeps sending
 *  for most of a second. A tail only ever DECAYS, so a delta this many times the
 *  envelope of the ones before it is a hand back on the glass and a new gesture — the
 *  one thing about a wheel stream that can be read without guessing, unlike the
 *  release, which cannot. Without it a second flick inside the first one's tail does
 *  nothing at all. */
export const SWIPE_SURGE = 2
export const SWIPE_SURGE_MIN = 4
/** How fast the envelope forgets, per event. */
export const SWIPE_SURGE_DECAY = 0.9
export const swipeEnvelope = (dx: number, env: number): number =>
  Math.max(Math.abs(dx), env * SWIPE_SURGE_DECAY)

/** THE TWO THINGS A WHEEL STREAM SAYS PLAINLY, and there are only two. It never says
 *  when the fingers left, so nothing may ask.
 *
 *  A tail only DECAYS: a delta over `SWIPE_SURGE` times the envelope of the ones
 *  before it is a hand back on the glass. And momentum never REVERSES: a delta
 *  against the direction the gesture just bought is a hand, with certainty rather than
 *  by inference. Either ends the spent gesture and opens the next one.
 *
 *  Both are needed. Magnitude alone cannot see a reversal — measured, a reader swiped
 *  forward, the slide committed, and they swiped straight back 170% of a slide with
 *  every delta of it smaller than the flick before, and the whole thing was swallowed
 *  as tail. `dir` is 0 before anything is bought, when nothing needs interrupting. */
export function swipeBreak(
  dx: number,
  env: number,
  dir: number,
): "surge" | "turned" | null {
  if (dir !== 0 && Math.sign(dx) === -dir) return "turned"
  if (Math.abs(dx) > Math.max(SWIPE_SURGE_MIN, SWIPE_SURGE * env))
    return "surge"
  return null
}

/** Embla's numbers, all three of them. A SHARE of the slide, but clamped in absolute
 *  px, because a share alone stops being a gesture on a wide screen: 18% of a 1560px
 *  slide is 280px of finger, and a reader making small deliberate trackpad movements
 *  never gets there. Measured: 766 ms of hand, 0.123 slides, release at 0.17 px/ms,
 *  projected to 277px against a 281px line, and the pictures did not move.
 *
 *  The floor matters on a phone for the same reason in reverse: 18% of a narrow slide
 *  is a few px, and a tap with a tremor in it should not page. */
export const SWIPE_COMMIT_MIN = 50
export const SWIPE_COMMIT_MAX = 225
export function swipeCommitPx(slideW: number): number {
  return clamp(SWIPE_COMMIT * slideW, SWIPE_COMMIT_MIN, SWIPE_COMMIT_MAX)
}

/** A held arrow pans at this speed (px per ms); two arrows add up to a diagonal. */
export const KEY_PAN_SPEED = 0.9
/** A held + or - doubles (halves) the zoom every this many ms. */
export const KEY_ZOOM_MS = 700
export const WHEEL_GUARD = 400
export const WHEEL_ZOOM = 0.01
/** One wheel event moves at most this many px: a mouse notch (100 px in Chrome) is a
 *  nudge, a trackpad tick (1-30 px) is untouched. Bounds ctrl+wheel zoom to 1.35x. */
export const WHEEL_TICK_MAX = 30
/** A finger still for this long before lifting has no momentum. */
export const STOP_GAP = 50
/** Release velocity is the mean over this span; a gesture keeps SAMPLES points,
 *  enough to cover it at 120 Hz. */
export const VELOCITY_WINDOW = 100
export const SAMPLES = 12
/** Flights are sampled ahead at this period; a compositor plays the table. */
export const FLIGHT_DT = 1000 / 60
export const DOUBLE_TOUCH = 300
export const DOUBLE_MOUSE = 500
export const DOUBLE_TRAVEL = 24
export const SETTLE_LIMIT = 2000
export const MAX_DT = 32

export const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v))

/** A media box is finite and positive on both axes; anything else is a lie. */
export function assertSize(size: Size): void {
  assert(
    Number.isFinite(size.w) && size.w > 0,
    `width must be finite > 0, got ${size.w}`,
  )
  assert(
    Number.isFinite(size.h) && size.h > 0,
    `height must be finite > 0, got ${size.h}`,
  )
}

/** Contain `natural` inside `band` less `inset` on every side, never upscaled past its
 *  pixels — EXCEPT to where the page already showed it. `floor` is the trigger's box: a
 *  320 px gif that a post renders 1300 px wide has already been accepted at that scale,
 *  and a lightbox that opened it at 320 px shrank the thing it was asked to enlarge. The
 *  band still caps it, and a floor smaller than the pixels (a 40 px avatar of a 256 px
 *  portrait) changes nothing. */
export function fit(natural: Size, band: Band, inset = 0, floor?: Size): Size {
  assertSize(natural)
  const contain = Math.min(
    (band.w - 2 * inset) / natural.w,
    (band.h - 2 * inset) / natural.h,
  )
  const shown = floor ? Math.min(floor.w / natural.w, floor.h / natural.h) : 0
  const k = Math.min(contain, Math.max(1, shown))
  return { w: natural.w * k, h: natural.h * k }
}

export type SourceView = {
  view: View
  /** Local-px inset that turns the fit box into the trigger's cover crop. */
  clip: Size
  /** Local-px corner radius matching the trigger's. */
  radius: number
}

/** The view that lays the fit box over the trigger's live rect, cover-fashion. `view`
 *  is relative to the band center; clip and radius are in the layer's own px (before
 *  scale). Identity when the aspects match: clip is zero. */
export function sourceView(rect: Rect, fitted: Size, band: Band): SourceView {
  assert(rect.w > 0 && rect.h > 0, "trigger has a zero rect")
  const cover = Math.max(rect.w / fitted.w, rect.h / fitted.h)
  return {
    view: {
      x: rect.x + rect.w / 2 - (band.left + band.w / 2),
      y: rect.y + rect.h / 2 - (band.top + band.h / 2),
      s: cover,
    },
    clip: {
      w: (fitted.w * cover - rect.w) / 2 / cover,
      h: (fitted.h * cover - rect.h) / 2 / cover,
    },
    radius: rect.radius / cover,
  }
}

/** Rescale so the point `at` (relative to the band center) stays under the finger. */
export function zoomAt(view: View, s: number, at: Point): View {
  const k = s / view.s
  return { x: at.x - (at.x - view.x) * k, y: at.y - (at.y - view.y) * k, s }
}

/** Zoom rubber: soft under `min`, stiff over `max`. */
export function rubber(raw: number, min: number, max: number): number {
  if (raw < min) return min - 0.15 * (min - raw)
  if (raw > max) return max + 0.05 * (raw - max)
  return raw
}

/** Pan bound per axis: half the overflow of the scaled fit past the band. */
/** How far past its own edge a zoomed image may be pushed, so that panning to an edge
 *  leaves a margin instead of stopping dead against the viewport. The SAME on all four
 *  sides, so the whitespace reads as deliberate wherever the reader lands, and it is
 *  the reason an edge is reachable at all: stopping exactly where the picture ends
 *  gives no sign that it ended, only a picture that will not move. */
export const PAN_INSET = 64

export function panBounds(view: View, fitted: Size, band: Band): Point {
  const x = (fitted.w * view.s - band.w) / 2
  const y = (fitted.h * view.s - band.h) / 2
  // An axis that does not overflow stays centred: there is no edge to reach, and an
  // inset there would let a fitted image drift off centre.
  return { x: x > 0 ? x + PAN_INSET : 0, y: y > 0 ? y + PAN_INSET : 0 }
}

/** A rubber band ASYMPTOTES. Resistance that is merely proportional (excess × 0.35)
 *  keeps giving forever, so a long trackpad pan walks the image hundreds of px off
 *  its own edge and the edge stops meaning anything. Past the bound the give shrinks
 *  toward nothing and the offset can never exceed OVERSHOOT_MAX, so pulling harder
 *  is felt as the edge pulling back. The slope at the bound is still OVERSHOOT, so
 *  the first px past it feels exactly as it did. */
export const OVERSHOOT_MAX = 96

const band_ = (excess: number) =>
  (1 - 1 / ((excess * OVERSHOOT) / OVERSHOOT_MAX + 1)) * OVERSHOOT_MAX

export function overshoot(value: number, bound: number): number {
  const excess = Math.abs(value) - bound
  if (excess <= 0) return value
  return Math.sign(value) * (bound + band_(excess))
}
/** The exact inverse: a grab taken past the bound (mid-bounce, or a rubbered wheel
 *  pan) is read back to the raw offset it rubbered from, so a drag that offsets the
 *  raw grab and rubbers the sum is continuous at dx = 0.
 *
 *  `overshoot` maps every excess into [0, OVERSHOOT_MAX), so past that the value did
 *  NOT come from a band and there is nothing to undo: a dismiss pinch carries the
 *  picture wherever the fingers go, under bounds that mean nothing below fit. It IS
 *  the raw offset. Asserting instead threw out of `gestureDown`, which wedged every
 *  touch after it. */
export function unovershoot(value: number, bound: number): number {
  const given = Math.abs(value) - bound
  if (given <= 0 || given >= OVERSHOOT_MAX) return value
  const excess = (given * OVERSHOOT_MAX) / (OVERSHOOT * (OVERSHOOT_MAX - given))
  return Math.sign(value) * (bound + excess)
}

export function clampPan(view: View, fitted: Size, band: Band): View {
  const b = panBounds(view, fitted, band)
  return { x: clamp(view.x, -b.x, b.x), y: clamp(view.y, -b.y, b.y), s: view.s }
}

/** A grab's pan read back through the rubber: the raw offset a session adds its
 *  deltas to before rubbering the sum (see `unovershoot`). */
export function rawPan(view: View, fitted: Size, band: Band): Point {
  const b = panBounds(view, fitted, band)
  return { x: unovershoot(view.x, b.x), y: unovershoot(view.y, b.y) }
}

/** Where a flick comes to rest on its own. */
export function project(position: number, velocity: number): number {
  return position + velocity * MOMENTUM
}

/** A wheel event's delta in px: lines and pages become px. Unbounded, so the inertia
 *  guard sees the tick the device sent. */
export function wheelPx(
  delta: number,
  deltaMode: number,
  pageH: number,
): number {
  const k = deltaMode === 1 ? 16 : deltaMode === 2 ? pageH : 1
  return delta * k
}
/** One tick's motion: bounded, so a mouse notch is a nudge. */
export function wheelTick(px: number): number {
  return clamp(px, -WHEEL_TICK_MAX, WHEEL_TICK_MAX)
}

/** Vertical dismiss drag at fit: the room re-lights over a third of the viewport. */
export function dragScale(y: number, vh: number): number {
  return 1 - 0.2 * Math.min(1, Math.abs(y) / (vh / 3))
}
export function dragProgress(y: number, vh: number): number {
  return 1 - Math.min(1, Math.abs(y) / (vh / 3))
}
/** Pinch under fit: the room is fully out at s = 1/1.2. */
export function pinchProgress(s: number): number {
  return clamp(1 - (1 - s) * 1.2, 0, 1)
}

export function dismissCommit(y: number, vy: number, vh: number): boolean {
  return Math.abs(project(y, vy)) / (vh / 3) > DISMISS_COMMIT
}

/** Which neighbours exist around `index`: every wrap rule in one place. */
export function neighbours(
  index: number,
  count: number,
  loop: boolean,
): { prev: boolean; next: boolean } {
  assert(index >= 0 && index < count, `index ${index} of ${count}`)
  return { prev: loop || index > 0, next: loop || index < count - 1 }
}

export type Sample = Point & { t: number }

/** Mean velocity (px/ms) over the samples inside VELOCITY_WINDOW, measured against
 *  the release instant `now`. The release is NOT a sample: a mouse button lifts tens
 *  of ms after the hand's last motion, and a release point duplicating the last
 *  move would halve the speed. A hand that rested longer than STOP_GAP before `now`,
 *  or before its own last sample, has stopped and carries nothing. */
export function velocity(samples: readonly Sample[], now: number): Point {
  const recent = samples.filter((s) => now - s.t <= VELOCITY_WINDOW)
  if (recent.length < 2) return { x: 0, y: 0 }
  const a = recent[0] as Sample
  const b = recent[recent.length - 1] as Sample
  const before = recent[recent.length - 2] as Sample
  if (now - b.t > STOP_GAP || b.t - before.t > STOP_GAP) return { x: 0, y: 0 }
  const dt = Math.max(1, b.t - a.t)
  return { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt }
}

/** The zoom ceiling: never under 2, otherwise the source's native pixels at this DPR. */
export function zoomMax(naturalW: number, fitW: number, dpr: number): number {
  return Math.max(2, naturalW / (fitW * dpr))
}

/** The scale at which the source runs out of pixels. Under 2 means source-limited. */
export function sharpScale(
  naturalW: number,
  fitW: number,
  dpr: number,
): number {
  return naturalW / (fitW * dpr)
}

/** A wheel session is a hand only if its first three ticks are not monotonically
 *  decaying in magnitude; inertia only ever decays. */
export function wheelIsHand(ticks: readonly number[]): boolean {
  assert(ticks.length >= 3, "wheel guard needs three ticks")
  const [a, b, c] = ticks as [number, number, number]
  return !(a > b && b > c)
}

export type Obstruction = { side: "top" | "bottom"; edge: number }

/** The stage: the visual viewport minus declared chrome. `edge` is the obstruction's
 *  inner edge in viewport coordinates (a top bar's bottom, a bottom bar's top). */
export function stageBand(vv: Band, blocks: readonly Obstruction[]): Band {
  let top = vv.top
  let bottom = vv.top + vv.h
  for (const b of blocks) {
    if (b.side === "top") top = Math.max(top, b.edge)
    else bottom = Math.min(bottom, b.edge)
  }
  assert(bottom > top, "obstructions cover the whole viewport")
  return { top, left: vv.left, w: vv.w, h: bottom - top }
}

/** The position along a move, `s` from 0 to 1. A cubic Hermite between where the track
 *  is (moving at the speed it was handed) and where it belongs (at rest).
 *
 *  This is the shape a magnet has and a spring does not: it is exactly home at s = 1,
 *  with no asymptote to crawl down. `m0` is the entry tangent, the speed at s = 0 in
 *  the same units as `d`, and it is what the move feels like leaving. Held between
 *  GLIDE_ENTRY_MIN and GLIDE_ENTRY it always goes at once and eases in; handed more
 *  than a swipe's own speed it simply continues at it, so the handover is invisible. */
export function glide(d: number, m0: number, s: number): number {
  const s2 = s * s
  const s3 = s2 * s
  return (s3 - 2 * s2 + s) * m0 + (3 * s2 - 2 * s3) * d
}

export type Axes<K extends string> = Readonly<Record<K, number>>

const zero = <K extends string>(like: Axes<K>): Axes<K> =>
  Object.fromEntries(Object.keys(like).map((k) => [k, 0])) as Axes<K>

const isTuning = (t: Tunings<string>): t is Tuning => "zeta" in t
const tuningOf = <K extends string>(t: Tunings<K>, k: K): Tuning =>
  isTuning(t) ? t : t[k]

/** One step of a damped spring on every axis, in px and ms: the velocity unit is
 *  the one gestures measure and momentum projects. The closed-form solution of the
 *  oscillator, exact at any frame period, so a device holding 30 fps gets the same
 *  curve as one at 120. MAX_DT is a per-frame progress cap, not a stability limit.
 *  Pure. */
function springStep<K extends string>(
  value: Axes<K>,
  vel: Axes<K>,
  target: Axes<K>,
  tuning: Tunings<K>,
  dtMs: number,
): { value: Axes<K>; vel: Axes<K> } {
  const dt = Math.min(dtMs, MAX_DT)
  const nv: Record<string, number> = {}
  const nx: Record<string, number> = {}
  for (const k of Object.keys(value) as K[]) {
    const tu = tuningOf(tuning, k)
    if (tu.f === Infinity) {
      nx[k] = target[k]
      nv[k] = 0
      continue
    }
    assert(tu.zeta >= 0 && tu.zeta <= 1, `zeta ${tu.zeta} out of [0, 1]`)
    const w = (2 * Math.PI * tu.f) / 1000
    const z = tu.zeta
    const e = Math.exp(-z * w * dt)
    const d0 = value[k] - target[k]
    const v0 = vel[k]
    let d: number
    let v: number
    if (z === 1) {
      const c = v0 + w * d0
      d = (d0 + c * dt) * e
      v = (v0 - c * w * dt) * e
    } else {
      const wd = w * Math.sqrt(1 - z * z)
      const b = (v0 + z * w * d0) / wd
      const cos = Math.cos(wd * dt)
      const sin = Math.sin(wd * dt)
      d = e * (d0 * cos + b * sin)
      v = e * ((wd * b - z * w * d0) * cos - (wd * d0 + z * w * b) * sin)
    }
    nx[k] = target[k] + d
    nv[k] = v
  }
  return { value: nx as Axes<K>, vel: nv as Axes<K> }
}

function settled<K extends string>(
  value: Axes<K>,
  vel: Axes<K>,
  target: Axes<K>,
  eps: Axes<K>,
): boolean {
  for (const k of Object.keys(value) as K[]) {
    if (Math.abs(value[k] - target[k]) >= eps[k]) return false
    if (Math.abs(vel[k]) >= eps[k] * 0.02) return false
  }
  return true
}

/** The one clock. Holds the live value, a target and a tuning; `step` advances by a
 *  frame and answers whether it settled. A spring that has not settled within
 *  SETTLE_LIMIT ms screams: a stuck phase is a bug, never a wait. */
export class Spring<K extends string> {
  value: Axes<K>
  vel: Axes<K>
  target: Axes<K>
  tuning: Tunings<K> = MACHINE
  /** Integrated time since the last aim, capped per frame the way the step is. */
  elapsed = 0
  readonly eps: Axes<K>

  constructor(value: Axes<K>, eps: Axes<K>) {
    this.value = value
    this.vel = zero(value)
    this.target = value
    this.eps = eps
  }

  /** Retarget mid-flight; velocity carries over unless handed a new one. */
  aim(target: Axes<K>, tuning: Tunings<K>, vel?: Axes<K>): void {
    this.target = target
    this.tuning = tuning
    if (vel) this.vel = vel
    this.elapsed = 0
  }

  /** Drop the clock at the current value (a hand took over). */
  hold(): void {
    this.target = this.value
    this.vel = zero(this.value)
  }

  step(dtMs: number): boolean {
    const next = springStep(
      this.value,
      this.vel,
      this.target,
      this.tuning,
      dtMs,
    )
    this.value = next.value
    this.vel = next.vel
    this.elapsed += Math.min(dtMs, MAX_DT)

    const done = settled(this.value, this.vel, this.target, this.eps)
    if (done) {
      this.value = this.target
      this.vel = zero(this.value)
    }
    assert(
      done || this.elapsed <= SETTLE_LIMIT,
      `spring stuck: ${this.elapsed.toFixed(0)} ms without settling`,
    )
    return done
  }
}

export type Frame<K extends string> = {
  t: number
  value: Axes<K>
  vel: Axes<K>
}

/** The whole flight ahead of time: the spring is deterministic, so it is sampled at
 *  FLIGHT_DT until it settles and the table is handed to the compositor. Frame 0 is
 *  the start; the last frame is the target exactly. A stuck spring screams here. */
export function sampleFlight<K extends string>(
  value: Axes<K>,
  vel: Axes<K>,
  target: Axes<K>,
  tuning: Tunings<K>,
  eps: Axes<K>,
): Frame<K>[] {
  const s = new Spring<K>(value, eps)
  s.aim(target, tuning, vel)
  const frames: Frame<K>[] = [{ t: 0, value, vel }]
  let t = 0
  for (;;) {
    const done = s.step(FLIGHT_DT)
    t += FLIGHT_DT
    frames.push({ t, value: s.value, vel: s.vel })
    if (done) break
  }
  return frames
}

/** The pose and velocity at `t` ms into a sampled flight, interpolated between
 *  frames; clamped to the table's ends. */
/** WebKit keeps animation time in seconds and converts back to milliseconds, so a
 *  finished animation's currentTime comes back a hair under the duration it was
 *  given (583.33333333333314 for 583.33333333333337). Times within this of the last
 *  frame ARE the last frame. */
export const TIME_EPS = 1e-3

export function frameAt<K extends string>(
  frames: readonly Frame<K>[],
  t: number,
): Frame<K> {
  assert(frames.length >= 2, "a flight has at least two frames")
  assert(Number.isFinite(t), `a flight time that is not a number: ${t}`)
  const last = frames[frames.length - 1] as Frame<K>
  if (t >= last.t - TIME_EPS) return last
  if (t <= 0) return frames[0] as Frame<K>
  const i = Math.min(frames.length - 2, Math.floor(t / FLIGHT_DT))
  const a = frames[i] as Frame<K>
  const b = frames[i + 1] as Frame<K>
  const k = (t - a.t) / (b.t - a.t)
  const lerp = (p: Axes<K>, q: Axes<K>): Axes<K> =>
    Object.fromEntries(
      Object.keys(p).map((key) => [
        key,
        p[key as K] + (q[key as K] - p[key as K]) * k,
      ]),
    ) as Axes<K>
  return { t, value: lerp(a.value, b.value), vel: lerp(a.vel, b.vel) }
}
