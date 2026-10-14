import type * as React from "react"
import { cn } from "@/lib/utils"
import type { Span } from "@/lib/clip"

// A MEDIUM'S LINE, the one drawing of how far a video or a clip has played: a track,
// what of it has loaded lighter on it, and the played part solid from the start to
// where it is now, its edge the position (no mark of its own: a fill says how far and
// where at once). Every player and every preview draws its progress with this, so a
// line means the same thing everywhere. It draws in the text's colour (`text-*` on it
// or above it: white over a picture, a player's accent), the track and the loaded
// part at fixed shares of it. Size it with `className` (height, rounding); what a
// consumer marks along it (moments, chapters) goes in as children, over the played
// part, each placed with `lineShare`.

/** Where `ms` falls along a line of `duration` ms, as a CSS percentage, held to the
 *  line's ends. */
export const lineShare = (ms: number, duration: number) =>
  `${(Math.min(Math.max(ms, 0), duration) / duration) * 100}%`

export function MediaLine({
  duration,
  at,
  loaded = [],
  className,
  style,
  children,
}: {
  /** The medium's length, ms; more than zero. */
  duration: number
  /** Where it is now, ms, held to the line's ends; null before it has a position
   *  (nothing played). */
  at: number | null
  /** What of it has loaded (a video's buffered ranges), ms. */
  loaded?: readonly Span[]
  className?: string
  /** Where the line is placed (one chapter of a longer bar). */
  style?: React.CSSProperties
  /** Marks along it, over the played part. */
  children?: React.ReactNode
}) {
  if (!(duration > 0)) throw new Error(`media-line: a duration of ${duration}`)
  return (
    <div
      data-slot="media-line"
      className={cn("relative overflow-hidden bg-current/20", className)}
      style={style}
    >
      {loaded.map((s) => (
        <div
          key={s.from}
          data-slot="media-line-loaded"
          className="absolute inset-y-0 left-(--media-line-from) w-(--media-line-span) bg-current/25"
          style={
            {
              "--media-line-from": lineShare(s.from, duration),
              "--media-line-span": lineShare(s.to - s.from, duration),
            } as React.CSSProperties
          }
        />
      ))}
      {at !== null && (
        <div
          data-slot="media-line-played"
          className="absolute inset-y-0 left-0 w-(--media-line-played) bg-current"
          style={
            {
              "--media-line-played": lineShare(at, duration),
            } as React.CSSProperties
          }
        />
      )}
      {children}
    </div>
  )
}
