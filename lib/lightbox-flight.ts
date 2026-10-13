import {
  type Axes,
  assert,
  type Frame,
  frameAt,
  sampleFlight,
  TIME_EPS,
  type Tunings,
} from "@/lib/lightbox-motion"

/** What a Web Animation looks like from here: a clock in ms. */
type Clock = { readonly currentTime: unknown }

export type Flight<K extends string> = {
  frames: Frame<K>[]
  target: Axes<K>
  /** Reaching `target` is the pending checkpoint (settle the enter, close, clear
   *  pending); a flight that merely returns the image to a grab is not. */
  settles: boolean
  clock: Clock
}

/** The table and its duration: the two things the animation is built from. */
export function planFlight<K extends string>(
  value: Axes<K>,
  vel: Axes<K>,
  target: Axes<K>,
  tuning: Tunings<K>,
  eps: Axes<K>,
): { frames: Frame<K>[]; duration: number } {
  const frames = sampleFlight(value, vel, target, tuning, eps)
  return { frames, duration: lastFrame(frames).t }
}

const lastFrame = <K extends string>(frames: readonly Frame<K>[]): Frame<K> => {
  assert(frames.length >= 2, "a flight has at least two frames")
  return frames[frames.length - 1] as Frame<K>
}

/** The animation's clock in ms. Screams on anything that is not a finite number: a
 *  null clock is a flight whose animation was never started or already cancelled. */
export function flightTime<K extends string>(f: Flight<K>): number {
  const t = f.clock.currentTime
  assert(
    typeof t === "number" && Number.isFinite(t),
    `flight without a clock: ${String(t)}`,
  )
  return t
}

/** Landed: the clock reached the last frame. WebKit hands the duration back a hair
 *  short (seconds in, milliseconds out), so "reached" is within TIME_EPS. */
export function flightDone<K extends string>(
  f: Flight<K>,
  now: number,
): boolean {
  return now >= lastFrame(f.frames).t - TIME_EPS
}

/** The frame under the clock (pose and velocity, for a takeover or a tick) and
 *  whether the flight has landed. */
export function readFlight<K extends string>(
  f: Flight<K>,
): { frame: Frame<K>; done: boolean } {
  const now = flightTime(f)
  return { frame: frameAt(f.frames, now), done: flightDone(f, now) }
}
