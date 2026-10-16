// How hot a machine runs, over time: the data a thermal view draws, framework-free.
// A driver (a scene timeline, a page's own story, a live app) keys readings and view
// depths at moments; `thermalAt` folds them into the one moment a frame draws. Pure,
// so a scrubbed frame, a played one and a filmed one are the same frame.
// device-frame draws a moment; macos-session sequences them in a scene.

/** A part of the machine with its own temperature sensor, as the machine names them
 *  (chill's badge reads the same five). */
export type ThermalPart = "cpu" | "gpu" | "memory" | "ssd" | "battery"

/** What the machine reports at one moment. Temperatures in °C, any part it has.
 *  Parts move at their own pace and that is the picture: the chip in seconds, the
 *  battery under the palm rest in minutes (a chip at 90 °C over a cool palm rest is
 *  the normal first minute of load, not a contradiction). */
export interface ThermalReading {
  parts: Partial<Record<ThermalPart, number>>
  /** The case's skin, °C: what a palm feels. No sensor reports it; the reporter
   *  models it from the parts' heat, the case's thermal mass (it trails the chip by
   *  minutes) and the fans' airflow (moving air holds it down). */
  surface?: number
  /** Each fan's speed as a share of its range, 0 (off) to 1 (flat out), left to
   *  right as the machine sits facing you. One reported fan drives both. */
  fans: number[]
}

/** How deep a thermal view goes: 0 the plain machine, 1 its skin, 2 the insides
 *  (parts, fans, the air). Fractions are the fade between two levels. */
export type ThermalDepth = number

/** How fast a fan at `share` of its range turns as drawn, turns per second. A fan
 *  that runs at all runs at least its minimum, so even the slowest reads as
 *  spinning; off is still. */
export function fanTurnRate(share: number): number {
  return share <= 0 ? 0 : 1.25 + 1.6 * Math.min(1, share)
}

/** One key on a thermal track, at `at` ms: a reading, a depth for the view, or
 *  both. */
export interface ThermalKey {
  at: number
  reading?: ThermalReading
  depth?: ThermalDepth
}

/** What a frame draws at an instant: the reading, the view's depth, and each fan's
 *  turns so far (its position: everything it has turned, never its speed now times
 *  the clock, which jumps whenever the speed does). */
export interface ThermalState extends ThermalReading {
  depth: ThermalDepth
  turns: number[]
}

/** How long the view takes to go from one depth to the next. */
export const DEPTH_MS = 900

const ease = (x: number) => {
  const k = Math.min(1, Math.max(0, x))
  return k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2
}

const fanOf = (r: ThermalReading, i: number) =>
  Math.min(1, Math.max(0, r.fans[i] ?? r.fans[0] ?? 0))

/** The reading at `ms`: straight from one key to the next over the time between
 *  them (readings are samples; easing would stall the heat at every one), held
 *  before the first and after the last. */
function readingAt(keys: ThermalKey[], ms: number): ThermalReading | null {
  const readings = keys.filter(
    (k): k is ThermalKey & { reading: ThermalReading } => !!k.reading,
  )
  const next = readings.findIndex((k) => k.at > ms)
  const a = next === -1 ? readings.at(-1) : readings[next - 1]
  const b = next === -1 ? undefined : readings[next]
  if (!a) return b?.reading ?? null
  if (!b) return a.reading
  const e = Math.min(1, Math.max(0, (ms - a.at) / (b.at - a.at)))
  const mix = (x: number | undefined, y: number | undefined) =>
    x === undefined ? y : y === undefined ? x : x + (y - x) * e
  const parts: ThermalReading["parts"] = {}
  for (const p of new Set([
    ...Object.keys(a.reading.parts),
    ...Object.keys(b.reading.parts),
  ]) as Set<ThermalPart>)
    parts[p] = mix(a.reading.parts[p], b.reading.parts[p])
  return {
    parts,
    surface: mix(a.reading.surface, b.reading.surface),
    fans: [0, 1].map((i) => mix(fanOf(a.reading, i), fanOf(b.reading, i)) ?? 0),
  }
}

/** The view's depth at `ms`: each depth key eases from wherever the view was at
 *  that moment (even mid-fade) to its own over DEPTH_MS, like a lid. Before any,
 *  0. */
function depthAt(keys: ThermalKey[], ms: number): ThermalDepth {
  let fade = { from: 0, to: 0, at: Number.NEGATIVE_INFINITY }
  const at = (t: number) =>
    fade.from + (fade.to - fade.from) * ease((t - fade.at) / DEPTH_MS)
  for (const k of keys) {
    if (k.depth === undefined || k.at > ms) continue
    fade = { from: at(k.at), to: k.depth, at: k.at }
  }
  return at(ms)
}

/** How far each fan has turned by `ms`: its rate added up from the track's first
 *  key, in steps of a frame. Past the last key the reading holds, so the fans
 *  run on at its rate, added in one step: a stage that keeps running past its
 *  story's end costs the same every frame. */
function turnsAt(keys: ThermalKey[], ms: number): number[] {
  const from = keys[0]?.at ?? 0
  const last = keys.at(-1)?.at ?? from
  const until = Math.min(ms, last)
  const step = 1000 / 60
  const turns = [0, 0]
  for (let t = from; t < until; t += step) {
    const r = readingAt(keys, t)
    if (!r) continue
    const dt = Math.min(step, until - t) / 1000
    for (const i of [0, 1])
      turns[i] = (turns[i] as number) + fanTurnRate(fanOf(r, i)) * dt
  }
  const held = ms > last ? readingAt(keys, last) : null
  if (held)
    for (const i of [0, 1])
      turns[i] =
        (turns[i] as number) +
        (fanTurnRate(fanOf(held, i)) * (ms - last)) / 1000
  return turns
}

/** How far a sensor drifts around its reading, °C: none reads perfectly still,
 *  so a held reading still lives on screen. Smooth, and the same at every ms. */
const DRIFT = 0.8

const drift = (ms: number, seed: number, amplitude: number) =>
  amplitude *
  (0.6 * Math.sin(ms / 700 + seed * 1.7) +
    0.4 * Math.sin(ms / 1900 + seed * 4.1))

/** The track at `ms`, or null before it has a reading. Keys in time order. */
export function thermalAt(keys: ThermalKey[], ms: number): ThermalState | null {
  for (let i = 1; i < keys.length; i++)
    if ((keys[i] as ThermalKey).at < (keys[i - 1] as ThermalKey).at)
      throw new Error("thermalAt: keys must be in time order")
  const reading = readingAt(keys, ms)
  if (!reading) return null
  const parts: ThermalReading["parts"] = {}
  for (const [i, [part, c]] of Object.entries(reading.parts).entries())
    parts[part as ThermalPart] = (c as number) + drift(ms, i + 1, DRIFT)
  return {
    ...reading,
    parts,
    surface:
      reading.surface === undefined
        ? undefined
        : reading.surface + drift(ms, 0, DRIFT / 3),
    depth: depthAt(keys, ms),
    turns: turnsAt(keys, ms),
  }
}

/** Where the view is up (depth above 0): the spans, ms, from the key that raises
 *  it to the key that lowers it back to 0, so a camera holds the whole machine in
 *  shot exactly while it shows. */
export function thermalShown(keys: ThermalKey[]): [number, number][] {
  const spans: [number, number][] = []
  let since: number | null = null
  for (const k of keys) {
    if (k.depth === undefined) continue
    if (k.depth > 0 && since === null) since = k.at
    else if (k.depth === 0 && since !== null) {
      spans.push([since, k.at])
      since = null
    }
  }
  if (since !== null) spans.push([since, Number.POSITIVE_INFINITY])
  return spans
}
