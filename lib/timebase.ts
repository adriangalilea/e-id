// A timebase: the one clock an instant is read from, and the contract everything that
// shows or moves time speaks. It is the clock and nothing else: how the medium is cut
// (lib/clip `Outline`) and what happens in it (claims) live beside it, never in it. Exactly one thing OWNS a timebase (a synthetic clock
// walking a clip, ui/playback; a video's decoder, ui/video); everything else FOLLOWS
// it: content drawn at its moment, a video seeking to it, a still fetched for it, the
// bar and keys that move it. Owners differ in how time passes; followers never know
// which owner they follow. What an owner can do beyond play, pause and seek is stated,
// never assumed: `fps` is set only when the timebase knows its frames (stepping,
// a frame readout), `volume` only when there is sound, `setRate` only when speed can
// change. A control shows what the timebase can do instead of every control being
// the weakest kind. Time is whole ms everywhere, the unit a clip is written in: an
// instant is an integer, a frame is named by the first whole ms inside it. Seconds
// exist only at a media element's door, converted by the four helpers below and
// nothing else.
// Framework-free: the store, the contract and the frame arithmetic.

import type { Span } from "@/lib/clip"

// ── the door to seconds ──────────────────────────────────────────────────────────

/** Seconds from a media element (`currentTime`, `duration`) or a person, as whole ms,
 *  rounded to nearest. */
export const msOf = (seconds: number) => Math.round(seconds * 1000)

/** A decoder's presented frame (`requestVideoFrameCallback`'s `mediaTime`) as its
 *  name: the first whole ms inside it. The tolerance keeps 480.0000001, a float's
 *  480, from becoming 481. */
export const frameMs = (seconds: number) => Math.ceil(seconds * 1000 - 1e-6)

/** ms as seconds, for an API that takes seconds and is not a seek. */
export const secondsOf = (ms: number) => ms / 1000

/** Where a media element seeks to show `ms`: the middle of that millisecond, so a
 *  seek to a frame's name lands inside the frame, never on the one before it. */
export const seekSeconds = (ms: number) => (ms + 0.5) / 1000

export interface TimebaseState {
  /** The moment on screen, whole ms: for a video, the frame the browser presented
   *  (its name, `frameMs`). */
  at: number
  /** Whole ms. */
  duration: number
  /** Time is running forward at `rate`. */
  playing: boolean
  /** Frames per second, when the timebase knows its frames; null when it does not. */
  fps: number | null
  rate: number
  /** A moment shown without committing (a pointer over the bar), ms, or null. While
   *  set, the timebase holds: nothing plays underneath a preview. */
  preview: number | null
  /** The span it loops in, ms. */
  range: Span | null
  /** 0..1, or null when the timebase has no sound. */
  volume: number | null
  muted: boolean
  /** The duration and the first moment are known. */
  ready: boolean
}

export interface TimebaseControls {
  play(): void
  pause(): void
  toggle(): void
  /** Show `ms`; `play` starts it there (a seek from the bar is an intent to watch). */
  seek(ms: number, options?: { play?: boolean }): void
  /** Move `n` frames and hold. Only a timebase with `fps` steps; others throw. */
  step(n: number): void
  /** Move by `ms`, keeping the play state. */
  jump(ms: number): void
  /** Show `ms` without committing; the first call remembers where it was and holds. */
  preview(ms: number): void
  /** Back to where it was, playing again if it played. */
  endPreview(): void
  setRange(range: Span | null): void
  /** Present only where speed can change: `RATE_MIN` to `RATE_MAX`. A person's choice
   *  is remembered with the volume (where the owner remembers); a speed the page sets
   *  as it plays (slowing into a moment) passes `remember: false`. `pitch: "follows"`
   *  lets the sound's pitch fall and rise with the speed (a tape slowed down) instead
   *  of being held: what a speed that keeps changing needs, since re-holding the pitch
   *  on every change stops WebKit's clock for a moment each time (a slow-mo easing
   *  four times a second stood still); `"held"`, the default, is a person's choice. */
  setRate?(
    rate: number,
    options?: { remember?: boolean; pitch?: "held" | "follows" },
  ): void
  /** Present only where there is sound. */
  setVolume?(volume: number): void
  toggleMute?(): void
}

export interface Timebase {
  get(): TimebaseState
  subscribe(listener: () => void): () => void
  controls: TimebaseControls
  /** The element the owner draws in: what fullscreen fills and gestures attach
   *  to. Null when the owner draws nothing of its own (a timebase the page holds). */
  root(): HTMLElement | null
}

/** The speeds a timebase plays at: what browsers' media elements take (Chromium,
 *  WebKit and Gecko all play from a sixteenth to sixteen times). */
export const RATE_MIN = 0.0625
export const RATE_MAX = 16

/** A speed held to what a timebase plays at. */
export const clampRate = (rate: number) =>
  Math.min(RATE_MAX, Math.max(RATE_MIN, rate))

/** The moment content draws: a preview when one is showing, else where it is. */
export function shownAt(s: TimebaseState): number {
  return s.preview ?? s.at
}

/** The observable state an owner writes and its followers read. Every write that
 *  changes nothing notifies no one, so a follower re-renders only on a real move. */
export class TimebaseStore {
  private state: TimebaseState
  private listeners = new Set<() => void>()
  constructor(initial: TimebaseState) {
    this.state = initial
  }
  get = (): TimebaseState => this.state
  set(patch: Partial<TimebaseState>) {
    let changed = false
    for (const k in patch) {
      const key = k as keyof TimebaseState
      if (!Object.is(this.state[key], patch[key])) {
        changed = true
        break
      }
    }
    if (!changed) return
    this.state = { ...this.state, ...patch }
    for (const l of this.listeners) l()
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}

export function initialState(
  patch: Partial<TimebaseState> = {},
): TimebaseState {
  return {
    at: 0,
    duration: 0,
    playing: false,
    fps: null,
    rate: 1,
    preview: null,
    range: null,
    volume: null,
    muted: false,
    ready: false,
    ...patch,
  }
}

// ── frames ───────────────────────────────────────────────────────────────────────

/** The frame rates video is actually made at. A measured rate within 1% of one of
 *  these is that rate: 25.02 from a jittery clock is 25, 23.98 is 24000/1001. */
export const STANDARD_RATES = [
  24000 / 1001,
  24,
  25,
  30000 / 1001,
  30,
  48,
  50,
  60000 / 1001,
  60,
] as const

function assertRate(fps: number) {
  if (!(fps > 0 && fps < 1000))
    throw new Error(`timebase: ${fps} is not a frame rate`)
}

/** The frame shown at `ms`: the one presenting at the middle of that millisecond,
 *  `ms + 0.5`, the same instant `seekSeconds` seeks to. A frame's name
 *  (`frameTime`) always reads back as that frame, with no tolerance. */
export function frameAt(ms: number, fps: number): number {
  assertRate(fps)
  return Math.max(0, Math.floor(((ms + 0.5) * fps) / 1000))
}

/** A frame's name: the first whole ms inside it (frame 1 at 30000/1001 starts at
 *  33.37 ms and is named 34). What a step lands on and what a cut stores; a seek to
 *  it goes through `seekSeconds`, which lands inside the frame. */
export function frameTime(frame: number, fps: number): number {
  assertRate(fps)
  return Math.ceil((Math.max(0, frame) * 1000) / fps - 1e-6)
}

/** How many frames a duration holds. */
export function frameCount(durationMs: number, fps: number): number {
  assertRate(fps)
  return Math.max(0, Math.round((durationMs * fps) / 1000))
}

/** The editors' timecode (SMPTE): `00:01:04:12`, hours, minutes, seconds and the frame
 *  within that second, always all four, so it never reads as a decimal or a clock. How
 *  a person names one exact frame (a cut, a label); a display form, never data: time
 *  is ms everywhere else. */
export function timecode(ms: number, fps: number): string {
  assertRate(fps)
  const whole = Math.floor(Math.max(0, ms) / 1000)
  const frame = frameAt(ms, fps) - frameAt(whole * 1000, fps)
  const two = (n: number) => String(n).padStart(2, "0")
  return `${two(Math.floor(whole / 3600))}:${two(Math.floor((whole % 3600) / 60))}:${two(whole % 60)}:${two(frame)}`
}

/** The instant as a person reads it, in one of three forms: `clock` (`0:02`), `frame`
 *  (the frame number beside the clock, `54 · 0:02`), `timecode` (`00:00:02:04`). The
 *  last two need the frame rate; without it every form is the clock. */
export type TimeForm = "clock" | "frame" | "timecode"
export function timeLabel(
  ms: number,
  form: TimeForm,
  fps: number | null,
): string {
  if (!fps || form === "clock") return clockTime(ms)
  if (form === "frame") return `${frameAt(ms, fps)} · ${clockTime(ms)}`
  return timecode(ms, fps)
}

/** `1:04`, `1:02:04`: a moment to the second, for a clock beside a bar. */
export function clockTime(ms: number): string {
  // Floored, as every player's clock is: 2.6 s is still the third second's start
  // not yet reached, and a clock that rounds disagrees with the frame-exact timecode.
  const whole = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(whole / 3600)
  const m = Math.floor((whole % 3600) / 60)
  const sec = String(whole % 60).padStart(2, "0")
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`
}

/** `3.1 s`, `2 s`: a stretch or a setting in seconds for a person, from ms, at most
 *  `digits` decimals (trailing zeros dropped). Display only; a person's typed seconds
 *  come back through `msOf`. */
export function secondsLabel(ms: number, digits = 1): string {
  return `${Number((ms / 1000).toFixed(digits))} s`
}

/** The widest a changing readout can get, in its own shape: every digit as `0`. Over
 *  tabular figures every digit is as wide as every other, so a readout that reserves
 *  the shape of its largest value (a clock the duration's, a frame number the frame
 *  count's) never changes width as it counts. */
export function widest(text: string): string {
  return text.replace(/\d/g, "0")
}

/** The frame rate from the gaps between presented frames, ms (requestVideoFrameCallback
 *  `mediaTime` deltas while playing at 1×). The median ignores the frames a busy page
 *  dropped; a result near a standard rate snaps to it. Null until there are enough
 *  gaps to say. */
export function measureRate(gapsMs: number[]): number | null {
  const usable = gapsMs.filter((g) => g > 1 && g < 250).sort((a, b) => a - b)
  if (usable.length < 8) return null
  const median = usable[Math.floor(usable.length / 2)] as number
  const raw = 1000 / median
  const standard = STANDARD_RATES.find((r) => Math.abs(r - raw) / r < 0.01)
  return standard ?? raw
}
