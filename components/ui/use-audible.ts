"use client"

// The hook over lib/audible: a component's claim on the page's one voice, released when
// it unmounts, and who holds the floor now. And `handVoice`, the voice of many videos
// that sound one at a time, under the hand.

import * as React from "react"
import {
  claim,
  holding,
  type Silence,
  subscribe,
  type VoiceKey,
} from "@/lib/audible"
import type { Setting } from "@/lib/remembered-core"
import { recall, remember } from "@/components/ui/remembered"

// ── THE HAND'S VOICE: many videos playing muted (a gallery's cells, a wall's tiles), of
// which at most ONE is ever audible: the one under the hand, and only while the group's
// sound is on. The sound is a setting of the group, never of a video ("sound on" stays on
// from one to the next, remembered: `on`). Taking moves the sound (the old one ramps
// down and mutes, the new one ramps up), leaving silences it, and the audible one holds
// the page's one floor (lib/audible): whatever else sounded is silenced, and a voice
// taking the floor from elsewhere ramps it down. Unmuting inside the click that turns
// sound on is allowed by the browser, and that click is a sticky activation, so later
// takes sound with no further click; an unmuted play the browser still refuses falls
// back to muted, and the sound is off until turned on again.

/** The volume ramp across a handover, so a move between videos never clicks. */
const RAMP_MS = 80

export interface HandVoice {
  /** The video under the hand: audible if the sound is on. */
  take: (el: HTMLVideoElement) => void
  /** The hand left it (or it stops playing): muted, the floor given back. */
  leave: (el: HTMLVideoElement) => void
  /** Turn the group's sound on or off: remembered, and applied to the one under the
   *  hand now. */
  set: (on: boolean) => void
}

/** One group's voice, its sound kept in `on`. */
export function handVoice(on: Setting<boolean>): HandVoice {
  let owner: HTMLVideoElement | null = null
  let floor: (() => void) | null = null
  const ramps = new WeakMap<HTMLVideoElement, number>()

  const ramp = (el: HTMLVideoElement, to: number, done?: () => void) => {
    cancelAnimationFrame(ramps.get(el) ?? 0)
    const from = el.volume
    const start = performance.now()
    const step = () => {
      const p = Math.min(1, (performance.now() - start) / RAMP_MS)
      el.volume = from + (to - from) * p
      if (p < 1) ramps.set(el, requestAnimationFrame(step))
      else done?.()
    }
    ramps.set(el, requestAnimationFrame(step))
  }
  /** The owner takes the page's floor, unless it holds it already. Losing it to another
   *  voice ramps it down and mutes it, and it is no longer the owner. */
  const takeFloor = (el: HTMLVideoElement) => {
    if (floor) return
    floor = claim(el, () => {
      floor = null
      ramp(el, 0, () => {
        el.muted = true
      })
      if (owner === el) owner = null
    })
  }
  const leaveFloor = () => {
    floor?.()
    floor = null
  }
  /** The owner sounds if the sound is on (taking the floor), else it is muted (and
   *  holds no floor: a muted video silences nothing). */
  const voice = () => {
    const el = owner
    if (!el) return
    if (!recall(on)) {
      el.muted = true
      leaveFloor()
      return
    }
    takeFloor(el)
    const wasPlaying = !el.paused
    el.volume = 0
    el.muted = false
    ramp(el, 1)
    // A browser that refuses unmuted playback pauses the element (or rejects play):
    // fall back to muted, keep it playing, and say so.
    const refused = () => {
      if (owner !== el) return
      el.muted = true
      el.play().catch(() => {})
      remember(on, false)
    }
    if (el.paused && !wasPlaying) el.play().catch(refused)
    else window.setTimeout(() => wasPlaying && el.paused && refused(), 60)
  }
  return {
    take: (el) => {
      const old = owner
      if (old === el) return voice()
      // The old owner hands over: ramped down and muted, its floor given back for the
      // new owner to take (a handover inside the group silences nothing else).
      if (old) ramp(old, 0, () => (old.muted = true))
      leaveFloor()
      owner = el
      voice()
    },
    leave: (el) => {
      el.muted = true
      if (owner !== el) return
      owner = null
      leaveFloor()
    },
    set: (value) => {
      remember(on, value)
      voice()
    },
  }
}

/** This component's voice under `key`: `speak()` claims the floor (silencing whoever
 *  held it), `hush()` gives the claim back, and an unmount gives it back too. `silence`
 *  is what it does when another voice takes the floor; the latest one is called. */
export function useAudible(
  key: VoiceKey,
  silence: Silence,
): { speak: () => void; hush: () => void } {
  const latest = React.useRef(silence)
  React.useLayoutEffect(() => {
    latest.current = silence
  })
  const releaseRef = React.useRef<(() => void) | null>(null)
  const hush = React.useCallback(() => {
    releaseRef.current?.()
    releaseRef.current = null
  }, [])
  const speak = React.useCallback(() => {
    hush()
    releaseRef.current = claim(key, () => {
      releaseRef.current = null
      latest.current()
    })
  }, [key, hush])
  React.useEffect(() => hush, [hush])
  return React.useMemo(() => ({ speak, hush }), [speak, hush])
}

/** The voice holding the floor now, or null: re-renders when it changes. */
export function useHolding(): VoiceKey | null {
  return React.useSyncExternalStore(subscribe, holding, () => null)
}
