"use client"

// A media element as the owner of a timebase (lib/timebase): the one implementation
// behind ui/video's VideoPlayback and ui/audio's AudioPlayback, so a video and a sound
// seek, step, preview, loop, remember and start the same way, and every player part
// (PlayerBar, PlayerKeys, PlayerSpeed, PlayerSound, a playlist) drives either unchanged.
// What differs by medium is only the CLOCK, read off the element itself:
//
// - a video reports the frame the browser PRESENTED (requestVideoFrameCallback), so a
//   follower that says "frame 112" means the frame on screen, and the frame rate is
//   measured from those frames when nobody states it;
// - a sound has no frames: `currentTime` read once a display frame while it plays, and
//   on pause and on every landed seek. Its `fps` stays null, so nothing offers to step.
//
// Seeks coalesce (a sweep never queues stale positions behind the pointer) and a step
// or jump counts from where it is HEADING, so three fast presses move three. A preview
// pauses and shows its instant; ending it returns where it was and plays again if it
// played. `range` loops a span. A refused autoplay plays muted and the first press
// anywhere brings the sound back. Volume, mute and speed are remembered under one key
// for every medium: a person's volume is theirs, not a video's or a sound's.

import * as React from "react"
import type { Span } from "@/lib/clip"
import {
  between,
  fields,
  isBoolean,
  setting,
} from "@/lib/remembered-core"
import {
  clampRate,
  frameAt,
  frameMs,
  frameTime,
  initialState,
  measureRate,
  msOf,
  seekSeconds,
  type Timebase,
  TimebaseStore,
} from "@/lib/timebase"
import { toggleFullscreen, useTimebase } from "@/components/ui/playback"
import { recall, remember } from "@/components/ui/remembered"

/** Volume, mute and speed, kept across visits for every player (ui/remembered). */
export const PLAYBACK = setting("media:playback", {
  initial: { volume: 1, muted: false, rate: 1 },
  keep: "always",
  parse: fields<{ volume: number; muted: boolean; rate: number }>({
    volume: between(0, 1),
    muted: isBoolean,
    rate: between(0.0625, 16),
  }),
})

export interface MediaTimebaseOptions {
  /** Frames per second when known (a video); otherwise a video measures it from the
   *  frames presented while it plays at 1×. Ignored for a sound, which has no frames. */
  fps?: number
  /** Loop this span, ms. */
  range?: Span
  /** Where it starts, ms. */
  start?: number
  autoPlay?: boolean
  /** Remember volume, mute and speed across visits. */
  remember: boolean
  /** It reached its end (not under `loop`): a playlist's `advance`. */
  onEnded?: () => void
  /** Runs inside `play`, before the element is asked: within the person's press when a
   *  press asked for it, which is where an AudioContext may start (ui/audio taps its
   *  spectrum here). */
  beforePlay?: () => void
}

/** The timebase an element owns (`el` once attached, null before), and the root its
 *  owner draws in (what fullscreen fills). */
export function useMediaTimebase(
  el: HTMLMediaElement | null,
  {
    fps,
    range,
    start = 0,
    autoPlay = false,
    remember: rememberSettings,
    onEnded,
    beforePlay,
  }: MediaTimebaseOptions,
): { timebase: Timebase; root: React.RefObject<HTMLDivElement | null> } {
  const ended = React.useEffectEvent(() => onEnded?.())
  const before = React.useRef(beforePlay)
  React.useLayoutEffect(() => {
    before.current = beforePlay
  })
  const root = React.useRef<HTMLDivElement>(null)
  const media = React.useRef<HTMLMediaElement | null>(null)
  media.current = el
  const [store] = React.useState(
    () =>
      new TimebaseStore(
        initialState({ at: start, fps: fps ?? null, range: range ?? null }),
      ),
  )
  // Seeks coalesce: while one is in flight only the newest target is kept. `target` is
  // where it is heading, which is where the next step or jump counts from.
  const seeking = React.useRef({
    busy: false,
    next: null as number | null,
    target: start,
  })
  // Where a preview found it, and whether it played.
  const held = React.useRef<{ at: number; playing: boolean } | null>(null)
  // Muted by the player because the browser refused sound, not by the person.
  const autoMuted = React.useRef(false)
  // The last speed the page set as it plays (setRate's `remember: false`): a ratechange
  // to it is not the person's speed, however many events the element sends for it.
  const passing = React.useRef<number | null>(null)

  const rawSeek = React.useCallback((ms: number) => {
    const m = media.current
    if (!m) return
    const end = Number.isFinite(m.duration)
      ? msOf(m.duration)
      : Number.POSITIVE_INFINITY
    const t = Math.round(Math.min(Math.max(0, ms), Math.max(0, end - 1)))
    seeking.current.target = t
    if (seeking.current.busy) {
      seeking.current.next = t
      return
    }
    seeking.current.busy = true
    m.currentTime = seekSeconds(t)
  }, [])
  const here = React.useCallback(
    () => (seeking.current.busy ? seeking.current.target : store.get().at),
    [store],
  )
  const play = React.useCallback(() => {
    const m = media.current
    if (!m) return
    before.current?.()
    m.play().catch((e: unknown) => {
      if (e instanceof DOMException && e.name === "AbortError") return
      if (
        e instanceof DOMException &&
        e.name === "NotAllowedError" &&
        !m.muted
      ) {
        autoMuted.current = true
        m.muted = true
        m.play().catch(() => {})
        return
      }
      throw e
    })
  }, [])

  const timebase = React.useMemo<Timebase>(
    () => ({
      get: store.get,
      subscribe: store.subscribe,
      root: () => root.current,
      controls: {
        setVolume: (volume) => {
          const m = media.current
          if (!m) return
          m.volume = Math.min(1, Math.max(0, volume))
          if (m.volume > 0) m.muted = false
        },
        toggleMute: () => {
          const m = media.current
          if (!m) return
          autoMuted.current = false
          m.muted = !m.muted
        },
        play,
        pause: () => media.current?.pause(),
        toggle: () => {
          if (media.current?.paused) play()
          else media.current?.pause()
        },
        seek: (ms, options) => {
          held.current = null
          store.set({ preview: null })
          rawSeek(ms)
          if (options?.play) play()
        },
        step: (n) => {
          const rate = store.get().fps
          if (!rate)
            throw new Error(
              "media timebase: no frame rate (a sound has none; a video's is measured once it plays, or pass `fps`)",
            )
          media.current?.pause()
          rawSeek(frameTime(frameAt(here(), rate) + n, rate))
        },
        jump: (ms) => rawSeek(here() + ms),
        preview: (ms) => {
          const m = media.current
          if (!m) return
          if (!held.current) {
            held.current = { at: store.get().at, playing: !m.paused }
            m.pause()
          }
          store.set({ preview: Math.round(ms) })
          rawSeek(ms)
        },
        endPreview: () => {
          const h = held.current
          held.current = null
          store.set({ preview: null })
          if (!h) return
          rawSeek(h.at)
          if (h.playing) play()
        },
        setRange: (r) => store.set({ range: r }),
        setRate: (rate, options) => {
          const m = media.current
          if (!m) return
          const r = clampRate(rate)
          // The ratechange this causes is the page's, not a choice to remember.
          passing.current = options?.remember === false ? r : null
          m.preservesPitch = options?.pitch !== "follows"
          m.playbackRate = r
        },
      },
    }),
    [store, rawSeek, here, play],
  )

  React.useEffect(() => {
    store.set({ range: range ?? null })
  }, [store, range])
  React.useEffect(() => {
    if (fps) store.set({ fps })
  }, [store, fps])

  // The clock: the instant every follower reads, by medium.
  React.useEffect(() => {
    if (!el) return
    // Past the loop's end while playing: back to its start.
    const loop = (at: number) => {
      const s = store.get()
      const r = s.range
      if (r && !el.paused && s.preview === null && at >= r.to) rawSeek(r.from)
    }
    if (el instanceof HTMLVideoElement && "requestVideoFrameCallback" in el) {
      const gaps: number[] = []
      let handle = 0
      let last: number | null = null
      let lastExact: number | null = null
      // Time passes between two frames too. A still over a soundtrack (a podcast's
      // cover, a 1 fps slide) presents a frame a second, and a clock that moved only
      // on frames told a transcript the time once a second: every word in between went
      // by unlit. So between frames the clock runs on from the last one presented, at
      // the element's speed, and stops short of the next frame's time: a frame count
      // read off it never names a frame that is not on screen yet, and a stalled video
      // runs ahead by less than one frame.
      let anchor: { at: number; wall: number; gap: number | null } | null = null
      let tickHandle = 0
      const tick = () => {
        tickHandle = 0
        if (el.paused || !anchor) return
        if (!seeking.current.busy) {
          let at = Math.floor(
            anchor.at + (performance.now() - anchor.wall) * el.playbackRate,
          )
          if (anchor.gap !== null) at = Math.min(at, anchor.at + anchor.gap - 1)
          if (at > store.get().at) {
            store.set({ at })
            loop(at)
          }
        }
        tickHandle = requestAnimationFrame(tick)
      }
      const onFrame = (now: number, meta: VideoFrameCallbackMetadata) => {
        const at = frameMs(meta.mediaTime)
        const gap = !el.paused && last !== null && at > last ? at - last : null
        // The rate is measured from the decoder's own times, never from the names:
        // NTSC names alternate 33 and 34 ms apart, and their median is no rate.
        const exact = meta.mediaTime * 1000
        if (gap !== null && lastExact !== null && el.playbackRate === 1)
          gaps.push(exact - lastExact)
        if (gaps.length > 60) gaps.shift()
        last = el.paused ? null : at
        lastExact = el.paused ? null : exact
        anchor = el.paused
          ? null
          : { at, wall: now, gap: gap ?? anchor?.gap ?? null }
        const s = store.get()
        store.set({ at, fps: fps ?? s.fps ?? measureRate(gaps) })
        loop(at)
        if (!el.paused && !tickHandle) tickHandle = requestAnimationFrame(tick)
        handle = el.requestVideoFrameCallback(onFrame)
      }
      // A new speed or a new source: the gaps measured before say nothing now.
      const forget = () => {
        gaps.length = 0
        anchor = null
      }
      el.addEventListener("ratechange", forget)
      el.addEventListener("emptied", forget)
      el.addEventListener("pause", forget)
      handle = el.requestVideoFrameCallback(onFrame)
      return () => {
        el.cancelVideoFrameCallback(handle)
        cancelAnimationFrame(tickHandle)
        el.removeEventListener("ratechange", forget)
        el.removeEventListener("emptied", forget)
        el.removeEventListener("pause", forget)
      }
    }
    // No frames: the element's time, once a display frame, only while it plays.
    let frame = 0
    const tick = () => {
      const at = msOf(el.currentTime)
      store.set({ at })
      loop(at)
      frame = el.paused ? 0 : requestAnimationFrame(tick)
    }
    const run = () => {
      if (!frame) frame = requestAnimationFrame(tick)
    }
    const read = () => store.set({ at: msOf(el.currentTime) })
    el.addEventListener("playing", run)
    el.addEventListener("pause", read)
    if (!el.paused) run()
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener("playing", run)
      el.removeEventListener("pause", read)
    }
  }, [el, store, fps, rawSeek])

  // The element's events into the store.
  React.useEffect(() => {
    if (!el) return
    if (rememberSettings) {
      const saved = recall(PLAYBACK)
      el.volume = saved.volume
      el.muted = saved.muted
      el.playbackRate = saved.rate
    }
    // A medium with sound has a volume from the start: state like the rest.
    store.set({ volume: el.volume, muted: el.muted, rate: el.playbackRate })
    const on: Record<string, () => void> = {
      loadedmetadata: () => {
        if (Number.isFinite(el.duration))
          store.set({ duration: msOf(el.duration), ready: true })
        if (start > 0) rawSeek(start)
        if (autoPlay) play()
      },
      play: () => store.set({ playing: true }),
      pause: () => store.set({ playing: false }),
      ended: () => {
        store.set({ playing: false })
        ended()
      },
      seeked: () => {
        const ours = seeking.current.busy
        seeking.current.busy = false
        const next = seeking.current.next
        seeking.current.next = null
        if (next !== null) rawSeek(next)
        // Our own seek landed where it was sent: the instant asked for, not the half
        // millisecond past it the seek aimed at (a video's presented frame follows on
        // its own). A seek from elsewhere reads the element.
        else if (el.paused)
          store.set({
            at: ours ? seeking.current.target : msOf(el.currentTime),
          })
      },
      ratechange: () => {
        store.set({ rate: el.playbackRate })
        if (rememberSettings && el.playbackRate !== passing.current)
          remember(PLAYBACK, { ...recall(PLAYBACK), rate: el.playbackRate })
      },
      volumechange: () => {
        store.set({ volume: el.volume, muted: el.muted })
        if (rememberSettings && !autoMuted.current)
          remember(PLAYBACK, {
            ...recall(PLAYBACK),
            volume: el.volume,
            muted: el.muted,
          })
      },
      emptied: () => {
        seeking.current = { busy: false, next: null, target: 0 }
      },
    }
    for (const [name, handler] of Object.entries(on))
      el.addEventListener(name, handler)
    // An element rendered on the server starts loading before hydration: its metadata
    // may have arrived before anyone listened (an <audio>'s length read 0:00).
    if (el.readyState >= HTMLMediaElement.HAVE_METADATA) on.loadedmetadata?.()
    return () => {
      for (const [name, handler] of Object.entries(on))
        el.removeEventListener(name, handler)
    }
  }, [el, store, rawSeek, play, start, autoPlay, rememberSettings])

  // The first press anywhere after an autoplay the browser muted brings the sound
  // back. It runs after the press's own handlers, so a press on the mute button is the
  // person's choice and wins.
  React.useEffect(() => {
    if (!autoPlay) return
    const unmute = () =>
      window.setTimeout(() => {
        const m = media.current
        if (!m || !autoMuted.current) return
        autoMuted.current = false
        m.muted = false
      }, 0)
    window.addEventListener("pointerdown", unmute, {
      once: true,
      capture: true,
    })
    window.addEventListener("keydown", unmute, { once: true, capture: true })
    return () => {
      window.removeEventListener("pointerdown", unmute, { capture: true })
      window.removeEventListener("keydown", unmute, { capture: true })
    }
  }, [autoPlay])

  return { timebase, root }
}

/** How long a still hand keeps a stage awake, ms: the chrome fades this long after the
 *  pointer stops, as players do. */
const AWAKE_MS = 1500

/** Whether a stage (VideoPicture, AudioPicture) is AWAKE: a pointer has moved over it
 *  within `AWAKE_MS`, or rests on one of its controls or popups. Hover alone is not
 *  enough: fullscreen, the pointer never leaves the stage, and the chrome over it
 *  never went. A touch wakes it the same way; leaving sleeps it at once. The stage
 *  wears it as `data-awake`, and what shows "on hover" over it reads that
 *  (`group-data-[awake]/picture:`). */
export function useStageAwake(
  stage: React.RefObject<HTMLElement | null>,
): boolean {
  const [awake, setAwake] = React.useState(false)
  React.useEffect(() => {
    const box = stage.current
    if (!box) return
    let sleep = 0
    const wake = (e: PointerEvent) => {
      setAwake(true)
      window.clearTimeout(sleep)
      // On a control (the bar, a button, the finder) or a popup open over the stage, it
      // stays awake until the hand moves off it.
      if (
        e.target instanceof Element &&
        e.target.closest(
          "[data-slot=player-chrome] button, [data-slot=player-chrome] [role=slider], [data-slot=player-bar], [data-slot=player-zoom-finder], [data-slot=player-layer]",
        )
      )
        return
      sleep = window.setTimeout(() => setAwake(false), AWAKE_MS)
    }
    const leave = () => {
      window.clearTimeout(sleep)
      setAwake(false)
    }
    box.addEventListener("pointermove", wake)
    box.addEventListener("pointerdown", wake)
    box.addEventListener("pointerleave", leave)
    return () => {
      window.clearTimeout(sleep)
      box.removeEventListener("pointermove", wake)
      box.removeEventListener("pointerdown", wake)
      box.removeEventListener("pointerleave", leave)
    }
  }, [stage])
  return awake
}

/** A stage's click and double click (VideoPicture, AudioPicture): a click plays and
 *  pauses, a double click is fullscreen on the timebase's root. A double click must
 *  not also toggle twice, so the single click waits a beat. A click on a control or on
 *  the chrome is the control's, never a toggle, and neither is the release of a drag
 *  that `panned`. */
export function useStageClicks(panned?: React.RefObject<boolean>): {
  onClick: (e: React.MouseEvent) => void
  onDoubleClick: (e: React.MouseEvent) => void
} {
  const { controls, root } = useTimebase()
  const click = React.useRef(0)
  return {
    onClick: (e) => {
      if (panned?.current) {
        panned.current = false
        return
      }
      if (
        (e.target as Element).closest(
          "button, a, input, [role=slider], [data-slot=player-chrome], [data-slot=player-zoom-finder]",
        )
      )
        return
      window.clearTimeout(click.current)
      click.current = window.setTimeout(controls.toggle, 220)
    },
    onDoubleClick: (e) => {
      if (
        (e.target as Element).closest(
          "[data-slot=player-chrome], [data-slot=player-zoom-finder]",
        )
      )
        return
      window.clearTimeout(click.current)
      toggleFullscreen(root())
    },
  }
}
