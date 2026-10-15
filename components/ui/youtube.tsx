"use client"

// A YOUTUBE VIDEO ON THE PAGE, as a picture until it is asked for: the video's own
// thumbnail, its title and channel, a play mark; pressed (or Enter, Space), YouTube's
// player replaces it in place and plays. Until then nothing of YouTube's loads but one
// image, so a page of ten videos costs ten pictures, not ten players (the facade every
// fast site uses), and nothing tracks a reader who never presses (the player is
// youtube-nocookie's). A Short stands upright.
//
// The facts are data (`lib/youtube-data`: the id from any link YouTube hands out, the
// title and channel from its oEmbed at authoring time); without a title the button is
// named for the video and the picture carries no words.

import { Play } from "lucide-react"
import * as React from "react"
import { Image } from "@/components/ui/image"
import { cn } from "@/lib/utils"
import { type YouTubeRef, youtubeOf } from "@/lib/youtube-data"

export interface YouTubeProps {
  /** the video: a link YouTube hands out, or its facts */
  video: string | (YouTubeRef & { title?: string; channel?: string })
  className?: string
}

/** The largest thumbnail YouTube keeps for every video, then the one it always has. */
const thumbnails = (id: string) => [
  `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
  `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
]

export function YouTube({ video, className }: YouTubeProps) {
  const facts: (YouTubeRef & { title?: string; channel?: string }) | null =
    typeof video === "string" ? youtubeOf(video) : video
  if (!facts) throw new Error(`youtube: ${String(video)} names no video`)
  const { title, channel } = facts
  const [playing, setPlaying] = React.useState(false)
  const [first, ...rest] = thumbnails(facts.id) as [string, ...string[]]
  const params = new URLSearchParams({
    autoplay: "1",
    rel: "0",
    playsinline: "1",
    ...(facts.start !== undefined && { start: String(facts.start) }),
  })
  return (
    <div
      data-slot="youtube"
      data-short={facts.short || undefined}
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-xl bg-black data-short:mx-auto data-short:aspect-[9/16] data-short:max-w-[22rem]",
        className,
      )}
    >
      {playing ? (
        <iframe
          title={title ?? "YouTube video"}
          src={`https://www.youtube-nocookie.com/embed/${facts.id}?${params}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
        />
      ) : (
        <button
          type="button"
          aria-label={title ? `play ${title}` : "play the video"}
          onClick={() => setPlaying(true)}
          className="group/yt absolute inset-0 size-full cursor-pointer outline-none"
        >
          {/* YouTube's own thumbnail, largest first: maxres is not made for every
              video, and the 120 px grey it answers with instead is told apart by
              its width (`minWidth`), so the always-there one stands in. */}
          <Image
            src={first}
            fallbacks={rest}
            minWidth={121}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover group-hover/yt:scale-[1.015]"
          />
          {(title || channel) && (
            <span className="absolute inset-x-0 top-0 flex flex-col items-start gap-0.5 bg-linear-to-b from-black/70 to-transparent px-4 pt-3 pb-8 text-left">
              {title && (
                <span className="line-clamp-2 font-medium text-[0.95em] text-white/95">
                  {title}
                </span>
              )}
              {channel && (
                <span className="text-[0.8em] text-white/65">{channel}</span>
              )}
            </span>
          )}
          <span className="absolute top-1/2 left-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/15 backdrop-blur-md transition-[background-color,scale] duration-200 group-hover/yt:scale-105 group-hover/yt:bg-black/70 group-focus-visible/yt:ring-2 group-focus-visible/yt:ring-white/80">
            <Play className="ml-0.5 size-6 fill-current" />
          </span>
        </button>
      )}
    </div>
  )
}
