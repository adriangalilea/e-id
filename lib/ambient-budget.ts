export const ambientStart = (cores: number) =>
  Math.max(2, Math.floor(cores / 2))
/** How often a playing video reads its frame counters. */
export const AMBIENT_SAMPLE_MS = 500
/** One verdict on a video: at least two seconds of its play holding at least thirty
 *  presented frames, so one late frame is a few percent of it and never a verdict. */
const WINDOW_MS = 2000
const WINDOW_FRAMES = 30
/** Kept up: at most one frame in fifty dropped over a window, a stutter no eye
 *  catches. */
const KEEPS_UP = 0.02
/** Fell behind: more than one frame in ten dropped over a window, a stutter anyone
 *  sees. Between the two the budget holds. */
const FALLS_BEHIND = 0.1
/** A size the machine fell behind at waits this long before it is tried again, so a
 *  budget at its edge does not grow and cut a video every few seconds. */
const RETRY_MS = 30_000

/** A video's own counters since its source was set (getVideoPlaybackQuality): the
 *  frames it was handed and those it could not draw in time. */
export interface FrameCount {
  total: number
  dropped: number
}

/** How loaded the machine says it is: the Compute Pressure API's states, lightest
 *  first. */
export type AmbientPressure = "nominal" | "fair" | "serious" | "critical"

/** A page's decoders for ambient motion, granted in turns. */
export interface AmbientBudget {
  /** A video wants a turn: `turn(true)` when it is granted (at once if a slot is
   *  free), `turn(false)` when it gives the slot back and waits again (its pass ended
   *  while others waited, or the budget shrank under it). */
  request: (id: symbol, turn: (granted: boolean) => void) => void
  /** A granted video played one pass: it yields to the longest waiting, if any. */
  passed: (id: symbol) => void
  /** A granted video's counters at `at` ms, every `AMBIENT_SAMPLE_MS` while it shows. */
  measure: (id: symbol, at: number, frames: FrameCount) => void
  /** The machine's load changed, at `at` ms on the clock `measure` reads. */
  pressure: (state: AmbientPressure, at: number) => void
  /** The video no longer wants a turn (off screen, motion off, gone). */
  release: (id: symbol) => void
  /** How it stands now: its size, who plays (in grant order) and who waits (longest
   *  first). */
  view: () => {
    size: number
    granted: readonly symbol[]
    waiting: readonly symbol[]
  }
  /** Called after any change of who plays and who waits (a waiting video's place in
   *  line moves); returns the unsubscribe. */
  subscribe: (listener: () => void) => () => void
}

/** One budget, `cap` decoders at most (none by default: the machine's verdicts alone
 *  bound it), `start` of them at first (`ambientStart`). */
export function ambientBudget(
  cap = Number.POSITIVE_INFINITY,
  start = 2,
): AmbientBudget {
  if (!(cap >= 1)) throw new Error(`ambient-budget: a cap of ${cap}`)
  if (!(start >= 1)) throw new Error(`ambient-budget: a start of ${start}`)
  type Turn = (granted: boolean) => void
  type Since = FrameCount & { at: number }
  let size = Math.min(start, cap)
  const listeners = new Set<() => void>()
  const changed = () => {
    for (const listener of listeners) listener()
  }
  /** The playing, in grant order, each with where its current window began. */
  const granted = new Map<symbol, { turn: Turn; since: Since | null }>()
  let waiting: { id: symbol; turn: Turn }[] = []
  /** Videos that kept up over a whole window since the size last changed. */
  const kept = new Set<symbol>()
  /** The size the machine last fell behind at, and until when it is not tried. */
  let behind = { size: Number.POSITIVE_INFINITY, until: 0 }
  /** The machine's load as last said; `nominal` until something says otherwise. */
  let strain: AmbientPressure = "nominal"

  const fill = () => {
    while (granted.size < size && waiting.length > 0) {
      const next = waiting.shift() as (typeof waiting)[number]
      granted.set(next.id, { turn: next.turn, since: null })
      next.turn(true)
    }
  }
  /** A granted video to the back of the queue. */
  const yieldTurn = (id: symbol) => {
    const g = granted.get(id) as { turn: Turn }
    granted.delete(id)
    waiting.push({ id, turn: g.turn })
    g.turn(false)
  }
  /** The size changed: every verdict so far was about the old one. */
  const anew = () => {
    kept.clear()
    for (const g of granted.values()) g.since = null
  }
  /** Too many for the machine: one fewer than are playing (never below one), the
   *  longest playing giving way first (it has had the most of its turn), and the size
   *  it was at not tried again for `RETRY_MS`. */
  const shrink = (at: number) => {
    const playing = Math.min(size, granted.size)
    size = Math.max(1, playing - 1)
    behind = { size: playing, until: at + RETRY_MS }
    while (granted.size > size) yieldTurn(granted.keys().next().value as symbol)
    anew()
    changed()
  }

  return {
    request(id, turn) {
      if (granted.has(id) || waiting.some((w) => w.id === id))
        throw new Error("ambient-budget: a turn asked for twice")
      waiting.push({ id, turn })
      fill()
      changed()
    },
    // A pass or a count from a video whose turn was just taken back (the budget shrank
    // while its frame was in flight) is about a turn that is over: ignored.
    passed(id) {
      if (!granted.has(id) || waiting.length === 0) return
      yieldTurn(id)
      fill()
      changed()
    },
    measure(id, at, frames) {
      const g = granted.get(id)
      if (!g) return
      const since = g.since
      if (since === null || frames.total < since.total) {
        g.since = { at, ...frames }
        return
      }
      const seen = frames.total - since.total
      if (at - since.at < WINDOW_MS || seen < WINDOW_FRAMES) return
      const share = (frames.dropped - since.dropped) / seen
      g.since = { at, ...frames }
      // A machine still critical a whole window after it gave a decoder up gives up
      // another, however smoothly the videos play.
      if (share > FALLS_BEHIND || strain === "critical") {
        shrink(at)
        return
      }
      if (share > KEEPS_UP) return
      kept.add(id)
      const grow =
        (strain === "nominal" || strain === "fair") &&
        waiting.length > 0 &&
        size < cap &&
        kept.size >= size &&
        (size + 1 < behind.size || at >= behind.until)
      if (!grow) return
      size += 1
      fill()
      anew()
      changed()
    },
    pressure(state, at) {
      const was = strain
      strain = state
      if (state === "critical" && was !== "critical" && granted.size > 1)
        shrink(at)
    },
    release(id) {
      granted.delete(id)
      waiting = waiting.filter((w) => w.id !== id)
      fill()
      changed()
    },
    view: () => ({
      size,
      granted: [...granted.keys()],
      waiting: waiting.map((w) => w.id),
    }),
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
