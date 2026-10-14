export type PlayerAction =
  | "toggle"
  | "back"
  | "forward"
  | "back-far"
  | "forward-far"
  | "frame-back"
  | "frame-forward"
  | "start"
  | "end"
  | "fullscreen"
  | "mute"
  | "captions"
  | "previous"
  | "next"
  | "zoom-in"
  | "zoom-out"
  | "zoom-fit"

/** The keys of a watching player: ← → step a frame on a paused picture (it is being
 *  studied) and jump while it plays; J and L jump the same way, playing or not; with
 *  shift, all four jump further; , and . step a frame always; Home and End go to the
 *  ends; P and N go to the previous and next video of a playlist, or chapter of a
 *  medium cut in chapters; + (or =) and - step a zooming picture's ladder and 0 shows
 *  it whole; C turns captions on and off. An editing view (J K L as a shuttle) is a different table, not a different
 *  meaning of this one. */
export const PLAYER_KEYS: {
  key: string
  action: PlayerAction
  label: string
}[] = [
  { key: " ", action: "toggle", label: "play / pause" },
  { key: "k", action: "toggle", label: "play / pause" },
  { key: "j", action: "back", label: "back (shift: further)" },
  { key: "l", action: "forward", label: "forward (shift: further)" },
  {
    key: "arrowleft",
    action: "frame-back",
    label: "frame back (paused) / back",
  },
  {
    key: "arrowright",
    action: "frame-forward",
    label: "frame forward (paused) / forward",
  },
  { key: ",", action: "frame-back", label: "frame back" },
  { key: ".", action: "frame-forward", label: "frame forward" },
  { key: "home", action: "start", label: "to the start" },
  { key: "end", action: "end", label: "to the end" },
  { key: "f", action: "fullscreen", label: "fullscreen" },
  { key: "m", action: "mute", label: "mute" },
  { key: "c", action: "captions", label: "captions on, off" },
  { key: "p", action: "previous", label: "previous video or chapter" },
  { key: "n", action: "next", label: "next video or chapter" },
  { key: "=", action: "zoom-in", label: "zoom in" },
  { key: "+", action: "zoom-in", label: "zoom in" },
  { key: "-", action: "zoom-out", label: "zoom out" },
  { key: "0", action: "zoom-fit", label: "the whole picture" },
]

/** The action a key asks for. With shift, the arrows and J and L jump further; without,
 *  the arrows step a frame only on a paused picture whose timebase knows its frames,
 *  and jump otherwise. */
export function resolveKey(
  key: string,
  {
    playing,
    frames,
    shift = false,
  }: { playing: boolean; frames: boolean; shift?: boolean },
  table = PLAYER_KEYS,
): PlayerAction | null {
  const k = key.toLowerCase()
  const hit = table.find((row) => row.key === k)
  if (!hit) return null
  const arrow = k === "arrowleft" || k === "arrowright"
  if (shift && (arrow || k === "j" || k === "l"))
    return k === "arrowleft" || k === "j" ? "back-far" : "forward-far"
  if (arrow && (playing || !frames))
    return k === "arrowleft" ? "back" : "forward"
  if (
    !frames &&
    (hit.action === "frame-back" || hit.action === "frame-forward")
  )
    return null
  return hit.action
}

/** What one slice of a swipe asks the player to do. */
export type SwipeEffect =
  | { kind: "seek"; ms: number }
  | { kind: "volume"; delta: number }
  | { kind: "speed"; steps: number }

export interface SwipeOptions {
  /** ms of the medium per px of horizontal travel. */
  seekPerPx?: number
  /** Volume (0..1) per px of vertical travel. */
  volumePerPx?: number
  /** Vertical px per 0.1× speed step. */
  speedNotchPx?: number
  /** Travel before a swipe means anything: a wheel's few px, a finger's tap slop. */
  slop?: number
}

/** The swipe grammar every player here shares: horizontal travel scrubs; vertical travel
 *  is volume on the picture's left half and speed on its right. A swipe locks to its
 *  dominant axis once it has travelled `slop`, so drift during a scrub never leaks into
 *  volume; a sharp perpendicular flick (over 12 px and three times the other axis)
 *  re-locks, so one motion can flow from scrubbing into the other; the half is decided
 *  when vertical locks and stays, so crossing the middle mid-swipe changes nothing.
 *  Deltas follow the content: positive `dx` is forward, positive `dy` is louder or
 *  faster. The caller converts its events (a wheel's deltaX is the inverse; a finger's
 *  dy is screen-down) and calls `end` when the swipe stops. */
export function createSwipe(options: SwipeOptions = {}) {
  const seekPerPx = options.seekPerPx ?? 250
  const volumePerPx = options.volumePerPx ?? 0.005
  const notch = options.speedNotchPx ?? 45
  const slop = options.slop ?? 6
  let axis: "h" | "v" | null = null
  let left = false
  let intentX = 0
  let intentY = 0
  let speedAcc = 0
  return {
    feed(dx: number, dy: number, leftHalf: boolean): SwipeEffect | null {
      if (axis === null) {
        intentX += Math.abs(dx)
        intentY += Math.abs(dy)
        if (intentX + intentY < slop) return null
        axis = intentX > intentY ? "h" : "v"
        left = leftHalf
      } else if (
        axis === "h" &&
        Math.abs(dy) > 12 &&
        Math.abs(dy) > 3 * Math.abs(dx)
      ) {
        axis = "v"
        left = leftHalf
        speedAcc = 0
      } else if (
        axis === "v" &&
        Math.abs(dx) > 12 &&
        Math.abs(dx) > 3 * Math.abs(dy)
      ) {
        axis = "h"
      }
      if (axis === "h")
        return dx === 0 ? null : { kind: "seek", ms: dx * seekPerPx }
      if (dy === 0) return null
      if (left) return { kind: "volume", delta: dy * volumePerPx }
      speedAcc += dy
      const steps = Math.trunc(speedAcc / notch)
      speedAcc -= steps * notch
      return steps === 0 ? null : { kind: "speed", steps }
    },
    end() {
      axis = null
      intentX = intentY = speedAcc = 0
    },
  }
}
