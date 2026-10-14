"use client"

import * as React from "react"
import { useScrollStage } from "@/components/ui/scroll-stage"

export interface ScrollBeat {
  /** Relative scroll distance. A short finale might use .5. */
  span: number
  /** Fraction at which content finishes. Default .6. */
  play?: number
  /** Fraction at which the reading beat ends and transition starts. Default .85. */
  hold?: number
}

/** Pure choreography: content, reading dwell and movement share one position. */
export function scrollBeatFrame(
  position: number,
  beats: readonly ScrollBeat[],
) {
  let start = 0
  let active = beats.length - 1
  let offset = active
  const progress = beats.map((beat, i) => {
    const local = (position - start) / beat.span
    if (local >= 0 && local < 1) {
      active = i
      const hold = beat.hold ?? 0.85
      offset = Math.min(
        beats.length - 1,
        i + Math.max(0, (local - hold) / (1 - hold)),
      )
    }
    start += beat.span
    return Math.max(0, Math.min(1, local / (beat.play ?? 0.6)))
  })
  if (position <= 0) active = offset = 0
  return { active, offset, progress }
}

/** Opt-in JS driver for renderers such as transcripts that need exact content
 * progress. CSS-only scenes can keep using Act. No autoplay, no timed exit gates.
 * Keep beats stable (declare them outside the component). */
export function useScrollStageTimeline(
  beats: readonly ScrollBeat[],
  {
    top = 0,
    bottom = 0,
  }: { top?: number | string; bottom?: number | string } = {},
) {
  if (
    !beats.length ||
    beats.some(
      (b) =>
        !(b.span > 0) ||
        (b.play ?? 0.6) <= 0 ||
        (b.play ?? 0.6) > (b.hold ?? 0.85) ||
        (b.hold ?? 0.85) >= 1,
    )
  )
    throw new Error(
      "Scroll beats require positive spans and 0 < play <= hold < 1",
    )
  const { track, pinnedQuery } = useScrollStage()
  const span = beats.reduce((sum, beat) => sum + beat.span, 0)
  const [position, setPosition] = React.useState(0)
  const [ambient, setAmbient] = React.useState(0)

  React.useEffect(() => {
    const el = track.current
    const stage = el?.querySelector<HTMLElement>(".ag-stage")
    if (!el || !stage) return
    const media = matchMedia(pinnedQuery)
    let frame = 0
    const bounds = () => {
      if (!media.matches) return null
      const rect = el.getBoundingClientRect()
      return {
        start: scrollY + rect.top,
        travel: Math.max(1, rect.height - innerHeight),
      }
    }
    const fit = () => {
      // Resolve CSS lengths in the scene's own inherited shell, including rem and
      // custom properties, instead of making consumers repeat pixel offsets.
      el.style.setProperty(
        "--stage-clear-top",
        typeof top === "number" ? `${top}px` : top,
      )
      el.style.setProperty(
        "--stage-clear-bottom",
        typeof bottom === "number" ? `${bottom}px` : bottom,
      )
      el.style.setProperty("--stage-min-height", "0px")
      el.style.setProperty(
        "--stage-top",
        `max(var(--stage-clear-top), calc((100dvh - ${stage.offsetHeight}px + var(--stage-clear-top) - var(--stage-clear-bottom)) / 2))`,
      )
    }
    const sample = () => {
      const range = bounds()
      if (!range) {
        setPosition(span)
        return
      }
      setPosition(
        Math.max(
          0,
          Math.min(span, ((scrollY - range.start) / range.travel) * span),
        ),
      )
      // Keep decoration moving through the scene's complete departure.
      const exit = scrollY + stage.getBoundingClientRect().bottom
      setAmbient(
        Math.max(
          0,
          ((Math.min(scrollY, exit) - range.start) / range.travel) * span,
        ),
      )
    }
    const schedule = () => {
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0
          sample()
        })
    }
    const resize = new ResizeObserver(fit)
    resize.observe(stage)
    const refresh = () => {
      fit()
      sample()
    }
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", refresh)
    media.addEventListener("change", refresh)
    refresh()
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", refresh)
      media.removeEventListener("change", refresh)
      el.style.removeProperty("--stage-top")
      el.style.removeProperty("--stage-min-height")
      el.style.removeProperty("--stage-clear-top")
      el.style.removeProperty("--stage-clear-bottom")
    }
  }, [track, span, top, bottom, pinnedQuery])

  const seek = React.useCallback(
    (index: number) => {
      const beat = beats[index]
      if (!beat) throw new Error(`Unknown scroll beat: ${index}`)
      const el = track.current
      if (!el || !matchMedia(pinnedQuery).matches) return false
      const rect = el.getBoundingClientRect()
      const start = beats.slice(0, index).reduce((sum, b) => sum + b.span, 0)
      const reading = ((beat.play ?? 0.6) + (beat.hold ?? 0.85)) / 2
      window.scrollTo({
        top:
          scrollY +
          rect.top +
          ((rect.height - innerHeight) * (start + beat.span * reading)) / span,
        behavior: "smooth",
      })
      return true
    },
    [beats, track, span, pinnedQuery],
  )

  return { ...scrollBeatFrame(position, beats), position, ambient, seek }
}
