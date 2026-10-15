"use client"

// A media element's captions (lib/captions) as a player reads them. The owner
// (VideoPlayback) puts each language's WebVTT file on its element as a <track>, and
// this reads the shown one's lines off the element's TextTrack, its mode "hidden": the
// browser parses and loads, and never draws (its own rendering sits under the
// player's chrome and ignores the page's type). What shows and when is ours: the lines
// at the timebase's shown instant, so a preview on the bar shows that instant's line.
//
// The choice (on, off, which language) is ONE decision a person makes for every
// player, kept with the volume where the owner remembers (media-timebase's rule):
// turned on here, captions are on in the next video, in the language last picked where
// that video has it. Never chosen, a file marked `default` shows.
//
// `Caption` is the look of a line over a picture, shared: the player's captions and
// transcript's TranscriptCaptions draw their lines in it, so captions read the same
// whoever wrote them.

import * as React from "react"
import { useRemembered } from "@/components/ui/remembered"
import {
  type CaptionLine,
  type Captions,
  type CaptionsChoice,
  checkCaptions,
  linesOf,
  NEVER_CHOSEN,
  shownOf,
  toggledChoice,
} from "@/lib/captions"
import { fields, isBoolean, setting } from "@/lib/remembered-core"
import { cn } from "@/lib/utils"

const orNull =
  <T,>(parse: (x: unknown) => T | undefined) =>
  (x: unknown): T | null | undefined =>
    x === null ? null : parse(x)

/** The captions choice, kept across visits for every player (ui/remembered). */
export const CAPTIONS = setting<CaptionsChoice>("media:captions", {
  initial: NEVER_CHOSEN,
  keep: "always",
  parse: fields<CaptionsChoice>({
    on: orNull(isBoolean),
    lang: orNull((x) => (typeof x === "string" && x ? x : undefined)),
  }),
})

/** A medium's captions, for the player's controls and its picture. */
export interface MediaCaptions {
  /** The languages it is captioned in, in the order given. */
  offered: readonly Captions[]
  /** The ones showing, or null (off, or never chosen and no default). */
  shown: Captions | null
  /** The shown captions' lines, once their file has loaded; empty before. */
  lines: readonly CaptionLine[]
  /** Show these (a language), or none (null). */
  choose: (lang: string | null) => void
  /** On and off: on, in the language last picked. */
  toggle: () => void
}

const CaptionsContext = React.createContext<MediaCaptions | null>(null)

/** Hands a medium's captions to everything inside (an owner renders it). */
export function CaptionsProvider({
  captions,
  children,
}: {
  captions: MediaCaptions | null
  children: React.ReactNode
}) {
  return (
    <CaptionsContext.Provider value={captions}>
      {children}
    </CaptionsContext.Provider>
  )
}

/** The captions of the medium around, or null where it has none: a control for them
 *  is then absent, not dimmed (nothing to turn on). */
export function useCaptions(): MediaCaptions | null {
  const captions = React.useContext(CaptionsContext)
  return captions && captions.offered.length > 0 ? captions : null
}

/** The captions an element carries (its <track>s, one per file offered), the choice
 *  kept across visits when `remember` (else for this player's life), and the shown
 *  file's lines read off the element once loaded. */
export function useMediaCaptions(
  el: HTMLMediaElement | null,
  offered: readonly Captions[],
  remember: boolean,
): MediaCaptions {
  checkCaptions(offered)
  const [kept, keep] = useRemembered(CAPTIONS)
  const [own, setOwn] = React.useState<CaptionsChoice>(NEVER_CHOSEN)
  const choice = remember ? kept : own
  const setChoice = remember ? keep : setOwn
  const shown = shownOf(offered, choice)
  const [lines, setLines] = React.useState<{
    src: string
    lines: readonly CaptionLine[]
  } | null>(null)

  const src = shown?.src ?? null
  React.useEffect(() => {
    if (!el) return
    const tags = [...el.querySelectorAll("track")]
    // Every file but the shown one is off; the shown one loads and stays undrawn.
    for (const tag of tags)
      tag.track.mode = tag.getAttribute("src") === src ? "hidden" : "disabled"
    const tag = tags.find((t) => t.getAttribute("src") === src)
    if (!src || !tag) return
    const read = () => {
      const entries = tag.track.cues
      if (!entries) return
      setLines({
        src,
        lines: linesOf(
          [...entries].map((e) => ({
            startTime: e.startTime,
            endTime: e.endTime,
            text: (e as VTTCue).text,
          })),
        ),
      })
    }
    const failed = () =>
      console.error(
        `captions: ${src} did not load (a wrong path, or another origin without CORS and crossOrigin)`,
      )
    // HTMLTrackElement.LOADED
    if (tag.readyState === 2) read()
    tag.addEventListener("load", read)
    tag.addEventListener("error", failed)
    return () => {
      tag.removeEventListener("load", read)
      tag.removeEventListener("error", failed)
    }
  }, [el, src])

  return {
    offered,
    shown,
    lines: lines && lines.src === src ? lines.lines : [],
    choose: (lang) =>
      setChoice((was: CaptionsChoice) => ({
        on: lang !== null,
        lang: lang ?? was.lang,
      })),
    toggle: () =>
      setChoice((was: CaptionsChoice) => toggledChoice(offered, was)),
  }
}

/** The look of a caption line over a picture: light type on a dark plate, centred and
 *  balanced (text-wrap: balance splits a long line into rows of even length). Its
 *  padding and corners are in em, so it is one look at any size: a thumbnail's, a
 *  player's, fullscreen. */
export const CAPTION =
  "relative max-w-full rounded-[0.5em] bg-black/70 px-[0.75em] py-[0.4em] text-center text-balance font-medium text-white leading-snug tracking-[-0.006em] antialiased"

/** A caption's size, stated in what a reader feels: a full line (the subtitling norm's
 *  longest, 42 characters) spans this share of the picture's width, at the type's
 *  average advance per em. 0.6 is the broadcast proportion (24 px on an 850 px
 *  picture); a full line as wide as the margins allow (0.84, 34 px there) reads as a
 *  headline over the film. Floored for a thumbnail, capped for a wall. */
const CAPTION_CHARS = 42
const CAPTION_MEASURE = 0.6
const CAPTION_ADVANCE = 0.5
export const CAPTION_SIZE = `clamp(12px, ${((CAPTION_MEASURE * 100) / (CAPTION_CHARS * CAPTION_ADVANCE)).toFixed(3)}cqi, 44px)`

/** Where caption lines stand: a column centred in the box it spans, which is the
 *  container its lines are sized against (CAPTION_SIZE), so the box must span the
 *  picture. Not hidden from assistive technology and not live: a braille reader reads
 *  the lines (each line's speaker in words), nobody is interrupted by them. */
export function CaptionLines({
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn("@container", className)}
      style={
        { "--ag-caption-size": CAPTION_SIZE, ...style } as React.CSSProperties
      }
    >
      <div className="flex flex-col items-center gap-[0.3em] text-(length:--ag-caption-size)">
        {children}
      </div>
    </div>
  )
}

/** One caption line in the shared look. */
export function Caption({
  lang,
  className,
  style,
  children,
}: {
  lang?: string
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <p
      data-slot="caption"
      lang={lang}
      className={cn(CAPTION, className)}
      style={style}
    >
      {children}
    </p>
  )
}
