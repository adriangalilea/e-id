"use client"

// The one video element. Every `<video>` the registry draws is this one, so the three
// questions every video answers are answered once:
//
//   WHEN IT PLAYS: `play`.
//     "manual"  the person decides (the browser's bar with `controls`, or a player
//               around it). The default.
//     "hover"   while the pointer or focus is on it (or on `interactionRef`, the card
//               it belongs to); on touch, while it is on screen.
//     "visible" while it is on screen.
//     "once"    on arriving on screen, then again only on a fresh hover or focus.
//     "follow"  the page decides: `playing` says whether, and `at` (ms), when given,
//               the instant it must show (a stage whose clock moves the video). It is
//               held unseen until it shows that instant, the poster standing in.
//     Automatic plays ("hover", "visible", "once") wait out reduced motion and a
//     hidden tab, load ahead before they are seen, and a pause from `pauseButton`
//     survives them. The sound of every video the person did not start (automatic or
//     followed) is one decision for the page: they start muted, and unmuting one (its
//     `controls`) turns the sound on for all of them; with sound on, one pauses when
//     the window loses focus.
//   WHAT STANDS IN BEFORE ITS FIRST FRAME: the poster, at the frame's aspect when
//     `width` and `height` are given (the space is reserved), the video fading in once
//     frames arrive. Without them the frame fills a parent the caller sizes.
//   WHAT IT SHOWS WHEN IT STOPS: `rest`. "hold" stays on the frame it reached; "poster"
//     goes back to the start and the poster.
//   WHAT PART OF IT PLAYS: all of it, or `span`: it starts at the span's start and goes
//     back there at its end, round and round (a tile of a film under the hand), the
//     start being where it rests under "poster" too.
//
// And what every video owes the page: one voice at a time (lib/audible: a video that
// starts with sound claims the page's one floor, and whatever held it, another video,
// a gallery cell, a reading, is silenced; `voice` names the voice a video speaks for,
// so a reading and its own video claim as one), and it releases its media when it leaves
// (pause, drop the source, reload empty), because a detached element that was
// playing keeps its sound by the spec's own rule. The source is set by an effect, not
// by the attribute, so a remount (React's dev double mount) puts back what the
// release took.

import {
  type ComponentProps,
  type RefObject,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import { cn } from "@/lib/utils"
import { claim, type VoiceKey } from "@/lib/audible"
import type { Span } from "@/lib/clip"
import { msOf, seekSeconds } from "@/lib/timebase"
import { Image, Img } from "@/components/ui/image"
import { useMediaIntent } from "@/components/ui/image-intent"
import { useWater } from "@/components/ui/water"

export type VideoPlay = "manual" | "hover" | "visible" | "once" | "follow"

export type VideoProps = Omit<
  ComponentProps<"video">,
  "width" | "height" | "className" | "autoPlay" | "src" | "controls" | "poster"
> & {
  src: string
  /** The accessible name. */
  label: string
  /** When it plays (see the header). Default "manual". */
  play?: VideoPlay
  /** "follow": whether the page wants it playing. */
  playing?: boolean
  /** "follow": the instant it must show, ms. */
  at?: number
  /** What it shows when it stops: the frame it reached, or the poster. Default "hold". */
  rest?: "hold" | "poster"
  /** Where it starts, ms. */
  start?: number
  /** The part it plays, ms: from the span's start, back there at its end, round and
   *  round. Not with `start` (the span's start is where it starts) or `at` (the page
   *  holds the instant then). */
  span?: Span
  /** The browser's own bar. Default on for "manual". */
  controls?: boolean
  /** A small play/pause button over an automatic play: the person can always stop it. */
  pauseButton?: boolean
  /** The frame's intrinsic size: the space is reserved at its aspect before it loads. */
  width?: number
  height?: number
  poster?: string
  /** A tiny blurred image of the poster: Image's placeholder when optimized, else
   *  painted under the poster in the first paint until its pixels arrive. */
  blurDataURL?: string
  /** Responsive poster width, using the same sizes syntax as Image. */
  sizes?: string
  /** Pass the poster through Next's optimizer (default). False for any-origin posters
   *  the optimizer is not configured for (a CDN frame, an avatar). */
  optimizePoster?: boolean
  /** How an unoptimized poster arrives: "fade" in once decoded (the registry's
   *  picture arrival), or "instant", in the first paint (a still that must stand
   *  for the video from the server's HTML on, like a stage resting mid-clip). */
  posterArrival?: "fade" | "instant"
  className?: string
  videoClassName?: string
  /** The element whose hover and focus count as looking at this video (its card). */
  interactionRef?: RefObject<HTMLElement | null>
  /** The voice it speaks for on the page's one floor (lib/audible): a key shared with
   *  what it plays for (a reading's), so the two are silenced together, never each
   *  other. Default: the video alone. */
  voice?: VoiceKey
}

/** How far the video may be from `at` and still be showing it, ms. */
const FOLLOW_TOLERANCE = 150

/** The pauses and plays a Video makes itself, marked just before it makes them. */
type Own = { pause: boolean; play: boolean }
/** Marks a pause as ours, only when it will pause something (a mark never outlives
 *  its event). */
function ownPause(own: Own, el: HTMLVideoElement) {
  if (!el.paused) own.pause = true
}
/** Marks a play as ours, only when it will start something. */
function ownPlay(own: Own, el: HTMLVideoElement) {
  if (el.paused) own.play = true
}

/** Videos the page silenced for another voice: their pause is the page's, not the
 *  person's, so they still play again when the person comes back to them. */
const silenced = new WeakSet<HTMLVideoElement>()

/** Whether the page's automatic videos speak: ONE decision for the page. Unmuting any
 *  of them turns the sound on for all (scrolling on to the next keeps it, without
 *  asking again), muting any turns it off for all. Which one is heard is the floor's
 *  (lib/audible): the one that starts with sound silences the rest. */
let pageSound = false
const soundFollowers = new Set<(on: boolean) => void>()
function setPageSound(on: boolean) {
  if (pageSound === on) return
  pageSound = on
  for (const follow of soundFollowers) follow(on)
}

/** How far ahead of the viewport an automatic video starts loading: a play() on a cold
 *  file drops the poster before a frame is decoded and flashes a half-drawn picture. */
const WARM_MARGIN = "1200px 0px"

/** A refused or interrupted play is the next decision, not an error: a pause landing
 *  while play() is pending rejects it (AbortError), a low-power mode refuses quiet
 *  playback (NotAllowedError). Anything else is real and throws. */
function tolerate(error: unknown) {
  const expected =
    error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "NotAllowedError")
  if (!expected) throw error
}

/** Plays a page-driven video. Refused with sound (a page load before any press), the
 *  page's sound turns off until the person turns it on and it plays muted; refused muted
 *  too (a low-power mode), `refused` hands it to the person, the poster standing in. */
function playOwn(own: Own, el: HTMLVideoElement, refused: () => void) {
  ownPlay(own, el)
  el.play().catch((e: unknown) => {
    tolerate(e)
    if (!(e instanceof DOMException && e.name === "NotAllowedError")) return
    if (el.muted) return refused()
    setPageSound(false)
    ownPlay(own, el)
    el.play().catch((again: unknown) => {
      tolerate(again)
      refused()
    })
  })
}

/** Stops a video the way `rest` says, "poster" going back to `home` (seconds: its
 *  start, or its span's). True when it went back to the poster. */
function stopAt(
  el: HTMLVideoElement,
  rest: "hold" | "poster",
  home: number,
): boolean {
  el.pause()
  if (rest !== "poster" || el.readyState === 0 || el.ended) return false
  el.currentTime = home
  return true
}

export function Video({ src, ...props }: VideoProps) {
  return <VideoSource key={src} src={src} {...props} />
}

function VideoSource({
  src,
  label,
  play = "manual",
  playing: wanted,
  at,
  rest = "hold",
  start,
  span,
  controls = play === "manual",
  pauseButton = false,
  width,
  height,
  poster,
  blurDataURL,
  sizes = "100vw",
  optimizePoster = true,
  posterArrival = "fade",
  className,
  videoClassName,
  interactionRef,
  voice,
  children,
  onPlaying,
  onPause,
  onEnded,
  onError,
  ref,
  ...props
}: VideoProps) {
  const frame = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  useImperativeHandle(ref, () => video.current as HTMLVideoElement, [])
  // Its claim on the page's one floor while it sounds: given back when it leaves, or
  // dropped when another voice takes the floor (it pauses then, a pause that is the
  // page's, not the person's).
  const floor = useRef<(() => void) | null>(null)
  const speak = (el: HTMLVideoElement) => {
    floor.current?.()
    floor.current = claim(voice ?? el, () => {
      floor.current = null
      if (el.paused) return
      silenced.add(el)
      el.pause()
    })
  }
  const automatic = play === "hover" || play === "visible" || play === "once"
  const follows = play === "follow"
  // Played by something other than the person: its sound is the page's decision.
  const pageDriven = automatic || follows
  if (follows && wanted === undefined)
    throw new Error(`Video "${label}": play="follow" needs \`playing\``)
  if (span && (start !== undefined || at !== undefined))
    throw new Error(
      `Video "${label}": \`span\` says where it starts and what it plays; not with \`start\` or \`at\``,
    )
  if (span && !(span.to > span.from && span.from >= 0))
    throw new Error(
      `Video "${label}": span ${span.from}..${span.to} is no part of a video`,
    )
  // Where it starts and rests, seconds: the span's start, else the top.
  const home = span ? seekSeconds(span.from) : 0
  const spanFrom = span?.from
  const spanTo = span?.to
  const intent = useMediaIntent(frame, interactionRef)
  const { setManual } = intent
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  // A frame has been shown: from then on, "hold" keeps the video over the poster.
  const [shown, setShown] = useState(false)
  // The video knows its size (the empty frame's ground can go), and has decoded a
  // frame (the poster can go, unless the video is held unseen).
  const [sized, setSized] = useState(false)
  const [loaded, setLoaded] = useState(false)
  // "follow" with `at`: the video has shown an instant asked of it.
  const [onInstant, setOnInstant] = useState(false)
  const [completedAt, setCompletedAt] = useState<number | null>(null)
  // What the automatic plays want right now.
  const autoWants = useRef(false)
  // The pauses and plays this component makes itself, marked just before it makes
  // them (only when the call will change anything, so a mark never outlives its
  // event). One it did not make is the person's, and an automatic video takes it as
  // the person's decision: a pause holds (nothing automatic plays it again, not a
  // return to the window, not scrolling back) until they play it again.
  const own = useRef<Own>({ pause: false, play: false })
  // Whether the play under way was ours.
  const lastPlayOwn = useRef(false)

  // The source is the effect's to set and to release (see the header).
  useEffect(() => {
    const el = video.current
    if (!el) throw new Error(`Video "${label}" rendered no element`)
    el.src = src
    return () => {
      floor.current?.()
      floor.current = null
      el.pause()
      el.removeAttribute("src")
      el.load()
    }
  }, [src, label])

  // Automatic plays: hover, visible, once.
  const trigger =
    play === "once"
      ? completedAt === null
        ? "visible"
        : "intent"
      : play === "visible"
        ? "visible"
        : "intent"
  const autoPlay =
    automatic &&
    intent.active(trigger) &&
    (completedAt === null || intent.activation > completedAt)
  useEffect(() => {
    if (!automatic) return
    const el = video.current
    if (!el) return
    autoWants.current = autoPlay
    if (autoPlay) {
      setFailed(false)
      playOwn(own.current, el, () => {
        setFailed(true)
        setManual(false)
      })
    } else {
      ownPause(own.current, el)
      if (stopAt(el, rest, home)) setShown(false)
    }
    return () => {
      autoWants.current = false
    }
  }, [automatic, autoPlay, setManual, rest, home])

  // A span plays round and round: at its end, back to its start. Read on the frames
  // the browser presents, so it never shows one past the end; `timeupdate` (four a
  // second) would let a quarter of a second of the next part through.
  useEffect(() => {
    const el = video.current
    if (!el || spanFrom === undefined || spanTo === undefined) return
    let handle = 0
    const watch = () => {
      if (msOf(el.currentTime) >= spanTo) el.currentTime = seekSeconds(spanFrom)
      handle = el.requestVideoFrameCallback(watch)
    }
    handle = el.requestVideoFrameCallback(watch)
    return () => el.cancelVideoFrameCallback(handle)
  }, [spanFrom, spanTo])

  // What every page-driven video (automatic or followed) owes the page: the page's one
  // sound decision (the muted property set here, synchronously, since React's `muted`
  // prop is not reflected and an autoplay policy reads the property), its buffer warmed
  // before it is seen, and no voice talking over another window: with sound on, it
  // pauses when the window loses focus and plays on when it returns, if it still should.
  useEffect(() => {
    if (!pageDriven) return
    const el = video.current
    if (!el) return
    let applying = false
    const apply = (on: boolean) => {
      applying = true
      el.muted = !on
      queueMicrotask(() => {
        applying = false
      })
    }
    apply(pageSound)
    soundFollowers.add(apply)
    const onVolume = () => {
      if (!applying) setPageSound(!el.muted)
    }
    const warm = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        el.preload = "auto"
        warm.disconnect()
      },
      { rootMargin: WARM_MARGIN },
    )
    warm.observe(el)
    // Only what the window's blur paused plays on when it returns: a video the
    // person paused stays paused.
    let blurred = false
    const onBlur = () => {
      if (el.paused || el.muted) return
      blurred = true
      ownPause(own.current, el)
      el.pause()
    }
    const onFocus = () => {
      const resume = blurred && autoWants.current && el.paused
      blurred = false
      if (!resume) return
      ownPlay(own.current, el)
      el.play().catch(tolerate)
    }
    el.addEventListener("volumechange", onVolume)
    window.addEventListener("blur", onBlur)
    window.addEventListener("focus", onFocus)
    return () => {
      soundFollowers.delete(apply)
      warm.disconnect()
      el.removeEventListener("volumechange", onVolume)
      window.removeEventListener("blur", onBlur)
      window.removeEventListener("focus", onFocus)
    }
  }, [pageDriven])

  // The page's word: play, hold, and (with `at`) the instant to show.
  useEffect(() => {
    if (!follows) return
    const el = video.current
    if (!el) return
    autoWants.current = wanted === true
    if (at !== undefined) {
      const ms = msOf(el.currentTime)
      // Once it has shown an asked instant it stays seen while it seeks to the
      // next: the poster is one still, and flashing it back mid-scrub would show
      // the wrong picture.
      if (Math.abs(ms - at) > FOLLOW_TOLERANCE) el.currentTime = seekSeconds(at)
      else if (el.readyState >= 2) setOnInstant(true)
    }
    if (wanted && el.paused) playOwn(own.current, el, () => setFailed(true))
    if (!wanted && !el.paused && stopAt(el, rest, home)) setShown(false)
  })

  const onFrameCheck = () => {
    const el = video.current
    if (!el || at === undefined) return
    if (
      el.readyState >= 2 &&
      Math.abs(msOf(el.currentTime) - at) <= FOLLOW_TOLERANCE
    )
      setOnInstant(true)
  }

  // Unseen until it can honestly stand for the picture: automatic plays until frames
  // come (and again at rest under "poster"), a followed instant until it shows it.
  const hidden =
    follows && at !== undefined
      ? !onInstant
      : (automatic || follows) && !playing && !shown
  // Asked to play (by the hand, by sight, by the page it follows) and no frame up yet:
  // its poster lies under falling water (the registry's water) until the picture
  // comes in over it. A manual video's own controls say it is loading.
  const asked = automatic ? autoPlay : follows ? wanted === true : false
  const water = useWater<HTMLImageElement>(
    poster && asked && hidden && !failed ? "falling" : null,
  )

  return (
    <div
      ref={frame}
      data-slot="video"
      data-playing={playing}
      // Nothing stays under a painted video: whatever does shows through its
      // anti-aliased rounded edge as a light, stepped rim. The ground is for an empty
      // frame with no poster, until the video knows its size; the poster (below)
      // only while it stands in.
      className={cn(
        "not-prose relative isolate block max-w-full overflow-hidden",
        width && height ? "aspect-(--video-aspect)" : "size-full",
        width && height && !poster && !sized && "bg-foreground/4",
        className,
      )}
      // An unoptimized poster's blur is painted under it in the first paint, for as
      // long as the poster stands in: the poster's pixels simply cover it.
      style={
        {
          ...(width && height
            ? { "--video-aspect": `${width} / ${height}` }
            : {}),
          ...(blurDataURL && !optimizePoster && (hidden || !loaded)
            ? {
                backgroundImage: `url(${blurDataURL})`,
                backgroundSize: "cover",
              }
            : {}),
        } as React.CSSProperties
      }
    >
      {poster &&
        (hidden || !loaded) &&
        (optimizePoster ? (
          <Image
            ref={water.ref}
            style={water.style}
            src={poster}
            alt=""
            fill
            sizes={sizes}
            blurDataURL={blurDataURL}
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            imageClassName={cn(
              "rounded-[inherit] object-cover",
              videoClassName,
            )}
          />
        ) : posterArrival === "fade" ? (
          <Img
            ref={water.ref}
            style={water.style}
            src={poster}
            alt=""
            className={cn(
              "pointer-events-none absolute inset-0 size-full rounded-[inherit] object-cover",
              videoClassName,
            )}
          />
        ) : (
          // biome-ignore lint/performance/noImgElement: a still that must be in the first paint, any origin
          <img
            ref={water.ref}
            style={water.style}
            src={poster}
            alt=""
            className={cn(
              "pointer-events-none absolute inset-0 size-full rounded-[inherit] object-cover",
              videoClassName,
            )}
          />
        ))}
      {water.filter}
      <video
        {...props}
        ref={video}
        width={width}
        height={height}
        aria-label={label}
        playsInline
        // Focus is how a keyboard asks a hover or once video to play; a video that
        // plays on sight alone takes no stop in the tab order.
        tabIndex={play === "hover" || play === "once" ? 0 : undefined}
        muted={pageDriven || props.muted}
        controls={controls}
        loop={
          play === "once"
            ? completedAt !== null && autoPlay && props.loop
            : props.loop
        }
        preload={props.preload ?? (pageDriven ? "none" : "metadata")}
        // Rounded on its own layer: Chrome clips a composited video to a parent's
        // rounded corners without anti-aliasing (a stepped corner), and rounds an
        // element's own corners smoothly.
        className={cn(
          "relative block size-full rounded-[inherit] object-cover transition-[opacity,filter] duration-300 ease-out motion-reduce:transition-none",
          // Only where scripts run: without them nothing would ever reveal it.
          hidden &&
            "[@media(scripting:enabled)]:opacity-0 motion-safe:[@media(scripting:enabled)]:blur-sm",
          videoClassName,
        )}
        onLoadedMetadata={(e) => {
          setSized(true)
          if (start !== undefined || span)
            e.currentTarget.currentTime = seekSeconds(start ?? span?.from ?? 0)
          props.onLoadedMetadata?.(e)
        }}
        onLoadedData={(e) => {
          setLoaded(true)
          onFrameCheck()
          props.onLoadedData?.(e)
        }}
        onSeeked={(e) => {
          onFrameCheck()
          props.onSeeked?.(e)
        }}
        onPlay={(e) => {
          // Whose play this is: ours, or the person's (their decision, which an
          // automatic video now follows).
          lastPlayOwn.current = own.current.play
          if (automatic && !own.current.play) setManual(true)
          own.current.play = false
          props.onPlay?.(e)
        }}
        onPlaying={(e) => {
          const el = e.currentTarget
          // A start we asked for that landed after the policy changed its mind.
          if (automatic && !autoWants.current && lastPlayOwn.current) {
            ownPause(own.current, el)
            el.pause()
            return
          }
          if (!el.muted) speak(el)
          setPlaying(true)
          setShown(true)
          onPlaying?.(e)
        }}
        onPause={(e) => {
          const el = e.currentTarget
          // Ours, the page silencing it for another voice, or the video reaching its
          // end (the browser fires a pause there too): none of them the person's.
          const machine = own.current.pause || silenced.delete(el) || el.ended
          own.current.pause = false
          if (automatic && !machine) setManual(false)
          setPlaying(false)
          onPause?.(e)
        }}
        onEnded={(e) => {
          setPlaying(false)
          if (play === "once") setCompletedAt(intent.activation)
          onEnded?.(e)
        }}
        onError={(e) => {
          setFailed(true)
          setPlaying(false)
          onError?.(e)
        }}
      >
        {children}
      </video>
      {automatic && pauseButton && (
        <button
          type="button"
          data-slot="video-pause"
          aria-label={`${playing ? "Pause" : "Play"} ${label}`}
          aria-pressed={playing}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (!playing) setCompletedAt(null)
            setManual(!playing)
          }}
          className="absolute right-2 bottom-2 rounded-full bg-black/60 px-3 py-2 text-white text-xs"
        >
          {failed ? "retry" : playing ? "pause" : "play"}
        </button>
      )}
    </div>
  )
}
