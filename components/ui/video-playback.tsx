"use client"

// A video's decoder as the owner of a timebase (lib/timebase): the other owner beside
// ui/playback's clip clock, read by the same followers. `VideoPlayback` owns it;
// `VideoPicture` is where the picture goes, anywhere inside; ui/player's PlayerBar,
// PlayerKeys, PlayerGestures, PlayerTransport, PlayerSpeed and PlayerSound move and
// read it like any other.
//
//   <VideoPlayback src="/film.mp4" label="the film" fps={25}>
//     <VideoPicture><PlayerGestures /></VideoPicture>
//     <PlayerBar label="the film"><PlayerSpeed /><PlayerSound /></PlayerBar>
//     <PlayerKeys />
//   </VideoPlayback>
//
// The element's ownership (the clock, coalesced seeks, steps, previews, the loop, the
// remembered volume, a refused autoplay) is ui/media-timebase's, shared with
// ui/audio's AudioPlayback; what is a video's alone lives here: the instant is the
// frame the browser PRESENTED (requestVideoFrameCallback), never the clock's coarse
// `timeupdate`, so a follower that says "frame 112" means the frame on screen; the
// picture's stage; and its zoom.

import * as React from "react"
import { useBackdropSource } from "@/components/ui/backdrop"
import { BackdropScope, MaterialProvider } from "@/components/ui/material"
import {
  Caption,
  CaptionLines,
  CaptionsProvider,
  useCaptions,
  useMediaCaptions,
} from "@/components/ui/media-captions"
import {
  useMediaTimebase,
  useStageAwake,
  useStageClicks,
} from "@/components/ui/media-timebase"
import { pinchInput } from "@/components/ui/pinch-input"
import {
  OutlineProvider,
  onScreenChange,
  type PictureZoom,
  PictureZoomProvider,
  type PictureZoomState,
  PLAYER_FLASH,
  PlayerLayer,
  screenHolder,
  TimebaseProvider,
  toggleFullscreen,
  usePictureZoomState,
  useTimebase,
  useTimebaseState,
} from "@/components/ui/playback"
import {
  soundReadable,
  TimebaseSoundSource,
  useSoundTap,
} from "@/components/ui/sound-source"
import { Video, type VideoProps } from "@/components/ui/video"
import { type Captions, linesAt } from "@/lib/captions"
import { type Chapter, type Outline, outlineOf, type Span } from "@/lib/clip"
import { zoomAt } from "@/lib/lightbox-motion"
import {
  centreOn,
  clampView,
  FIT_VIEW,
  fitted,
  frameView,
  type PinchRung,
  pinchRaw,
  pinchRung,
  pinchScale,
  rungTaken,
  type Size,
  settle,
  stepIn,
  stepOut,
  stopsOf,
  type View,
  zoomLabel,
} from "@/lib/picture-zoom"
import { msOf, shownAt } from "@/lib/timebase"
import { cn } from "@/lib/utils"

type PictureProps = Pick<
  VideoProps,
  | "src"
  | "label"
  | "poster"
  | "blurDataURL"
  | "sizes"
  | "optimizePoster"
  | "width"
  | "height"
  | "muted"
  | "loop"
  | "preload"
  | "crossOrigin"
  | "voice"
> & {
  /** When it plays by itself, ui/video's automatic policies: "visible" (a feature
   *  demo that plays on sight), "hover", "once". Default "manual": the person decides.
   *  Whichever starts it, the player's controls work the same. */
  play?: "manual" | "hover" | "visible" | "once"
}

/** How far a pinch may carry the scale past the ladder's ends before it settles back:
 *  under fit and over the most, the hand still feels the picture move. */
const PINCH_UNDER = 0.8
const PINCH_OVER = 1.15

/** The zoom of one picture: lib/picture-zoom's ladder over a view, measured by
 *  VideoPicture, moved by gestures, keys and a finder. */
function createPictureZoom(
  element: () => HTMLVideoElement | null,
): PictureZoom & { measure: (stage: Size, natural: Size) => void } {
  let state: PictureZoomState = {
    view: FIT_VIEW,
    box: null,
    stage: null,
    fill: 1,
    max: 1,
    moving: false,
    said: null,
  }
  const listeners = new Set<() => void>()
  let natural: Size | null = null
  let said = 0
  // The raw stretch a pinch began at (lib/picture-zoom's pinchRaw).
  let pinchBase = 1
  const set = (patch: Partial<PictureZoomState>) => {
    state = { ...state, ...patch }
    for (const l of listeners) l()
  }
  // A new view, kept in bounds, its change named when the name changes (a camera's
  // `quiet` move is not the person zooming, and names nothing).
  const show = (view: View, moving: boolean, quiet = false) => {
    const { box, stage, fill } = state
    if (!box || !stage) return
    const next = clampView(view, box, stage)
    const before = zoomLabel(state.view.s, fill)
    const after = zoomLabel(next.s, fill)
    set({
      view: next,
      moving,
      said: quiet || before === after ? state.said : { text: after, n: ++said },
    })
  }
  return {
    get: () => state,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    measure: (stage, size) => {
      const box = fitted(size, stage)
      const { fill, max } = stopsOf(box, stage)
      // Another picture (a playlist's next) starts whole; the same one on a resized
      // stage keeps its scale.
      const same =
        natural !== null && natural.w === size.w && natural.h === size.h
      natural = size
      const view = same ? clampView(state.view, box, stage) : FIT_VIEW
      set({ box, stage, fill, max: Math.max(max, 1), view })
    },
    pinch: (stretch, at, how = {}) => {
      if (how.start) pinchBase = pinchRaw(state.view.s, state.fill)
      const scale = Math.min(
        Math.max(pinchScale(pinchBase * stretch, state.fill), PINCH_UNDER),
        state.max * PINCH_OVER,
      )
      show(zoomAt(state.view, scale, at), true, how.quiet)
    },
    pan: (dx, dy) =>
      show({ ...state.view, x: state.view.x + dx, y: state.view.y + dy }, true),
    step: (direction, at = { x: 0, y: 0 }) => {
      const s = state.view.s
      const scale =
        direction > 0
          ? stepIn(s, state.fill, state.max)
          : stepOut(s, state.fill)
      show(zoomAt(state.view, scale, at), false)
    },
    fit: (how = {}) => show(FIT_VIEW, false, how.quiet),
    centreOn: (point) => {
      const { box, stage } = state
      if (box && stage) show(centreOn(point, state.view, box, stage), true)
    },
    frame: (rect, how = {}) => {
      const { box, stage } = state
      if (box && stage)
        show(
          frameView(rect, box, stage, state.max, how.margin ?? 0.2),
          // Not eased: placed as asked, for a path already smooth (a camera), and
          // quiet: a camera's move is not the person zooming.
          how.eased === false,
          how.eased === false,
        )
    },
    end: () => {
      const scale = settle(state.view.s, state.max)
      show(zoomAt(state.view, scale, { x: 0, y: 0 }), false)
    },
    picture: element,
  }
}

const PictureContext = React.createContext<{
  picture: PictureProps
  attach: (el: HTMLVideoElement | null) => void
  zoom: ReturnType<typeof createPictureZoom> | null
  /** The decoder once a VideoPicture has attached it: what a VideoCrop draws from. */
  element: HTMLVideoElement | null
} | null>(null)

export interface VideoPlaybackProps extends PictureProps {
  /** Frames per second when known; otherwise measured from the frames presented while
   *  it plays at 1×, and stepping waits until it is known. */
  fps?: number
  /** The video's chapters, the first level of its outline. */
  chapters?: Chapter[]
  /** Loop this span, ms. */
  range?: Span
  /** Where it starts, ms. */
  start?: number
  autoPlay?: boolean
  /** Remember volume, mute and speed across visits: the watching player's ergonomic
   *  (a film picks up at the volume you left it). Default: on when the person decides
   *  when it plays, off for a video that plays itself (a feature demo starts muted
   *  and playing on every load, its sound the page's decision). */
  remember?: boolean
  /** It reached its end (not under `loop`): a playlist's `advance`. */
  onEnded?: () => void
  /** The picture zooms (lib/picture-zoom): a pinch or ctrl-wheel at the hand, + - 0
   *  with PlayerKeys, a drag or scroll pans while zoomed, PlayerZoomFinder shows where. */
  zoom?: boolean
  /** The languages it is captioned in, a WebVTT file each (lib/captions): drawn over
   *  the picture in the shared caption look, rising above the chrome's foot while it
   *  shows; PlayerCaptions picks one or none, C turns them on and off (PlayerKeys).
   *  Another origin needs `crossOrigin` and CORS headers, as for the video. */
  captions?: readonly Captions[]
  /** Its sound, for a drawing inside (ui/sound-source): the element is tapped at the
   *  first play a press asks for and its spectrum handed down, so a sound-ribbon (a
   *  halo round a talking head) reads it with no wiring. Off by default: a tapped
   *  element's sound runs through Web Audio for the rest of its life. Another origin
   *  needs `crossOrigin` and CORS headers. */
  sound?: boolean
  className?: string
  children: React.ReactNode
}

export function VideoPlayback({
  fps,
  chapters,
  range,
  start = 0,
  autoPlay = false,
  remember: rememberProp,
  onEnded,
  zoom: zooms = false,
  sound = false,
  captions: offered = NO_CAPTIONS,
  className,
  children,
  ...picture
}: VideoPlaybackProps) {
  const [el, setEl] = React.useState<HTMLVideoElement | null>(null)
  const readable = soundReadable(picture.src, picture.crossOrigin)
  if (sound && !readable)
    throw new Error(
      `VideoPlayback "${picture.label}": \`sound\` needs the video's spectrum, and this src is on another origin; pass \`crossOrigin\` (its server must send CORS headers)`,
    )
  const { tap, ...heard } = useSoundTap(sound ? el : null, readable)
  const video = React.useRef<HTMLVideoElement | null>(null)
  video.current = el
  const zoom = React.useMemo(
    () => (zooms ? createPictureZoom(() => video.current) : null),
    [zooms],
  )
  // On when the person decides when it plays, off for a video that plays itself.
  const remember = rememberProp ?? (picture.play ?? "manual") === "manual"
  const { timebase, root } = useMediaTimebase(el, {
    fps,
    range,
    start,
    autoPlay,
    remember,
    onEnded,
    beforePlay: sound ? tap : undefined,
  })
  const captions = useMediaCaptions(el, offered, remember)

  const outline = React.useMemo<Outline>(
    () => outlineOf({ duration: 1, chapters: chapters ?? [] }),
    [chapters],
  )
  // A plain value: VideoPlayback re-renders only when its props change or its element
  // attaches; the instant reaches followers through the store, not through here.
  const pictureValue = { picture, attach: setEl, zoom, element: el }

  return (
    <div
      ref={root}
      data-slot="video-playback"
      className={cn("relative flex flex-col gap-2", className)}
    >
      <PlayerLayer>
        <TimebaseProvider timebase={timebase}>
          <OutlineProvider outline={outline}>
            <PictureZoomProvider zoom={zoom}>
              <CaptionsProvider captions={captions}>
                <PictureContext.Provider value={pictureValue}>
                  {sound ? (
                    <TimebaseSoundSource sound={heard}>
                      {children}
                    </TimebaseSoundSource>
                  ) : (
                    children
                  )}
                </PictureContext.Provider>
              </CaptionsProvider>
            </PictureZoomProvider>
          </OutlineProvider>
        </TimebaseProvider>
      </PlayerLayer>
    </div>
  )
}

const NO_CAPTIONS: readonly Captions[] = []

/** The lines being said over the picture, at the shown instant (a preview on the bar
 *  shows that instant's line), each in the shared caption look, the file's own line
 *  breaks kept. Low over the picture while it plays untouched; risen above the
 *  chrome's foot while the chrome shows (awake, focused, paused, previewing), by the
 *  foot's own measured height (`--ag-player-foot`, set by PlayerFoot). Takes no
 *  pointer. */
function PictureCaptions() {
  const captions = useCaptions()
  if (!captions?.shown) throw new Error("PictureCaptions: no captions shown")
  const { lines, shown } = captions
  // The lines at the shown instant, as a key: re-renders only when they change.
  const key = useTimebaseState((s) =>
    linesAt(lines, shownAt(s))
      .map((l) => lines.indexOf(l))
      .join(","),
  )
  const raised = useTimebaseState((s) => !s.playing || s.preview !== null)
  const showing = key ? key.split(",").map((i) => lines[Number(i)]) : []
  return (
    <CaptionLines
      data-slot="video-picture-captions"
      data-raised={raised || undefined}
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 z-10 px-[4%] pb-[3%]",
        "transition-[translate] duration-200 ease-out motion-reduce:transition-none",
        "data-raised:translate-y-[calc(-1*var(--ag-player-foot,0px))] group-focus-within/picture:translate-y-[calc(-1*var(--ag-player-foot,0px))] group-data-[awake]/picture:translate-y-[calc(-1*var(--ag-player-foot,0px))]",
      )}
    >
      {showing.map(
        (line) =>
          line && (
            <Caption
              key={`${line.span.from}-${line.text}`}
              lang={shown.lang}
              className="whitespace-pre-line"
            >
              {line.voice && <span className="sr-only">{line.voice}: </span>}
              {line.text}
            </Caption>
          ),
      )}
    </CaptionLines>
  )
}

/** The picture's zoom from the hand, on the stage: measured (the stage and the
 *  picture's own size, and again when either changes), a pinch (a trackpad's, which
 *  arrives as a ctrl-wheel, or two fingers) on the ladder every player shares
 *  (lib/player-input's pinchRung: in the page a spread fills the screen; filling it, a
 *  spread zooms at the hand and a close at fit leaves; zoomed, a pinch zooms), and while
 *  zoomed a scroll, a drag or one finger pans. Before a rung is taken the picture
 *  follows the fingers, growing toward the screen it will fill or shrinking toward the
 *  page it goes back to. Leaving the screen, however it is left, the picture is whole
 *  again. PlayerGestures stands down for all of these when the picture zooms. */
function useZoomInput(
  zoom: ReturnType<typeof createPictureZoom> | null,
  stage: React.RefObject<HTMLDivElement | null>,
  el: HTMLVideoElement | null,
  panned: React.RefObject<boolean>,
  root: () => HTMLElement | null,
) {
  React.useEffect(() => {
    const box = stage.current
    if (!zoom || !box || !el) return
    // This player holds the screen (the picture, or a part of the player holding it).
    const full = () => screenHolder()?.contains(box) ?? false
    // One pinch, trackpad or fingers: its rung, chosen where its direction is first
    // known and kept to its end ("spent" once taken: the rest of it moves nothing).
    let rung: PinchRung | "spent" | null = null
    const begin = (out: boolean) => {
      rung = pinchRung({ out, full: full(), zooms: true, zoomed: zoomed() })
    }
    const pinchTo = (
      stretch: number,
      at: { x: number; y: number },
      start: boolean,
    ) => {
      if (rung === null || rung === "none" || rung === "spent") return
      // Only the zoom rung is a zoom: on its way to fullscreen or out of it the
      // picture follows the fingers and names nothing.
      const following = rung !== "zoom"
      if (rungTaken(rung, stretch)) {
        toggleFullscreen(root(), rung === "fullscreen")
        zoom.fit({ quiet: true })
        rung = "spent"
        return
      }
      zoom.pinch(stretch, at, { start, quiet: following })
    }
    // A pinch let go. One that was only following the fingers toward a rung it never
    // took goes back to whole, quietly: settled on the nearest stop instead, a spread
    // short of fullscreen left the picture zoomed at its fill, a zoom nobody asked for.
    const letGo = () => {
      if (rung === "fullscreen" || rung === "leave") zoom.fit({ quiet: true })
      else zoom.end()
      rung = null
    }
    // Leaving the screen (a pinch, Esc, F, the button), the picture is whole again: a
    // zoom is a way of looking at the screen, not a state the page keeps.
    let wasFull = full()
    const offScreen = onScreenChange(() => {
      const now = full()
      if (wasFull && !now) zoom.fit({ quiet: true })
      wasFull = now
    })
    const measure = () => {
      const r = box.getBoundingClientRect()
      if (!(el.videoWidth > 0 && r.width > 0 && r.height > 0)) return
      zoom.measure(
        { w: r.width, h: r.height },
        { w: el.videoWidth, h: el.videoHeight },
      )
    }
    measure()
    const resize = new ResizeObserver(measure)
    resize.observe(box)
    el.addEventListener("loadedmetadata", measure)
    el.addEventListener("resize", measure)
    // A point of the stage, as px from its centre.
    const fromCentre = (clientX: number, clientY: number) => {
      const r = box.getBoundingClientRect()
      return {
        x: clientX - r.left - r.width / 2,
        y: clientY - r.top - r.height / 2,
      }
    }
    const zoomed = () => zoom.get().view.s > 1.001
    const onChrome = (target: EventTarget | null) =>
      target instanceof Element &&
      target.closest(
        "[data-slot=player-chrome] button, [data-slot=player-chrome] [role=slider], [data-slot=player-bar], [data-slot=player-zoom-finder]",
      ) !== null

    // The hand (ui/pinch-input): a pinch on the ladder at its centre; zoomed, a wheel,
    // a drag or one finger pans.
    const stopReading = pinchInput(box, {
      accepts: (target) => !onChrome(target),
      begin: (out) => {
        panned.current = true
        begin(out)
      },
      pinch: (stretch, at, start) =>
        pinchTo(stretch, fromCentre(at.x, at.y), start),
      end: letGo,
      wheel: (e) => {
        if (!zoomed()) return false
        zoom.pan(-e.deltaX, -e.deltaY)
        return true
      },
      wheelEnd: letGo,
      // A finger is always read (a pinch may leave it zoomed, its pan going on); a
      // mouse only while zoomed. Whole, a drag is the page's.
      press: (e) => {
        panned.current = false
        return e.pointerType === "touch" || zoomed()
      },
      drag: (dx, dy) => {
        if (!zoomed()) return
        panned.current = true
        zoom.pan(dx, dy)
      },
      release: () => zoom.end(),
    })
    // Zoomed, a finger is the picture's on both axes; whole, the page keeps scrolling.
    const touch = () => {
      box.style.touchAction = zoomed() ? "none" : "pan-y"
    }
    touch()
    const unsubscribe = zoom.subscribe(touch)
    return () => {
      resize.disconnect()
      unsubscribe()
      stopReading()
      box.style.touchAction = ""
      el.removeEventListener("loadedmetadata", measure)
      el.removeEventListener("resize", measure)
      offScreen()
    }
  }, [zoom, stage, el, panned, root])
}

/** Where the picture goes. A click plays and pauses; a double click is fullscreen.
 *  Children sit over the picture (PlayerGestures, a caption, an answering layer), in the
 *  dark scheme (material's MaterialProvider), so chrome over it is light ink in either
 *  theme without a part saying so.
 *  While a pointer moves over it the picture is `data-awake`: what shows "on hover"
 *  over it reads that (`group-data-[awake]/picture:`), never `:hover`, so it fades a
 *  moment after the hand stops, fullscreen too; the cursor hides with it while it
 *  plays.
 *
 *  Its shape: the video's own (`width` and `height`), else 16:9 until the caller sizes
 *  it, or `aspect`, a stage of one shape whatever plays in it. A playlist wants the
 *  stage: its videos differ in shape, and the player must not change size between
 *  them; a video of another shape fits inside, whole, with black on two sides.
 *
 *  `fullscreen`: the picture, its chrome over it, is what fullscreen fills (the button,
 *  F, a double click, a pinch), not the player's whole root: for a page laid out
 *  around the player, whose root holds the page. Its popups then open inside it.
 *
 *  `clicks={false}`: the picture is a part of something that answers the hand itself
 *  (film-wall's tile): no play and pause on a click, no fullscreen on a double click,
 *  no pointer cursor, and the cursor never hides. */
export function VideoPicture({
  aspect,
  fullscreen = false,
  clicks: clickable = true,
  className,
  videoClassName,
  inPicture,
  children,
}: {
  /** The stage's shape, as CSS writes it ("16 / 9", "1"). */
  aspect?: string
  /** The picture is what fullscreen fills. */
  fullscreen?: boolean
  /** A click plays and pauses, a double click fills the screen. Default true. */
  clicks?: boolean
  className?: string
  videoClassName?: string
  /** Drawn on the picture itself, moving and scaling with its zoom: boxes around
   *  what was found, placed in shares of the frame. Fills the picture's own box inside
   *  the stage, whatever the stage's shape (a stage, fullscreen). */
  inPicture?: React.ReactNode
  /** Over the stage, still while the picture zooms: chrome. */
  children?: React.ReactNode
}) {
  const ctx = React.useContext(PictureContext)
  if (!ctx) throw new Error("VideoPicture: place it inside a VideoPlayback")
  const stage = React.useRef<HTMLDivElement>(null)
  const [el, setEl] = React.useState<HTMLVideoElement | null>(null)
  const { attach, zoom } = ctx
  const attachHere = React.useCallback(
    (node: HTMLVideoElement | null) => {
      attach(node)
      setEl(node)
    },
    [attach],
  )
  // The frame's pixels, read for the surfaces over it, when they can be read: the same
  // origin, or CORS with `crossOrigin` (the rule the sound's spectrum keeps). The black
  // stage round a letterboxed frame reads as black.
  const readable = soundReadable(ctx.picture.src, ctx.picture.crossOrigin)
  const backdrop = useBackdropSource(readable ? el : null, {
    fit: "contain",
    outside: 0,
  })
  // The picture's own shape, once the video knows it: where `inPicture` is drawn.
  const [frame, setFrame] = React.useState<{ w: number; h: number } | null>(
    null,
  )
  React.useEffect(() => {
    if (!el) return
    const read = () =>
      setFrame(
        el.videoWidth && el.videoHeight
          ? { w: el.videoWidth, h: el.videoHeight }
          : null,
      )
    read()
    el.addEventListener("loadedmetadata", read)
    el.addEventListener("resize", read)
    return () => {
      el.removeEventListener("loadedmetadata", read)
      el.removeEventListener("resize", read)
    }
  }, [el])
  // A drag that panned is not a click.
  const panned = React.useRef(false)
  const { root } = useTimebase()
  useZoomInput(zoom, stage, el, panned, root)
  const clicks = useStageClicks(panned)
  const view = usePictureZoomState((s) => s.view)
  const moving = usePictureZoomState((s) => s.moving)
  const said = usePictureZoomState((s) => s.said)
  const [saying, setSaying] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (!said) return
    setSaying(said.text)
    const t = window.setTimeout(() => setSaying(null), 700)
    return () => window.clearTimeout(t)
  }, [said])
  const zoomed = view.s > 1.001
  const awake = useStageAwake(stage)
  const captions = useCaptions()
  // This picture is the fullscreen element right now.
  const [full, setFull] = React.useState(false)
  React.useEffect(() => {
    if (!fullscreen) return
    const read = () => setFull(screenHolder() === stage.current)
    read()
    return onScreenChange(read)
  }, [fullscreen])
  const playing = useTimebaseState((s) => s.playing)
  // Under a stage the video fills it and fits inside (its own size would give its
  // frame its own shape, and the stage would cut it).
  const picture = aspect
    ? { ...ctx.picture, width: undefined, height: undefined }
    : ctx.picture
  // The stage's clicks are a pointer's shortcut: the bar's play button and PlayerKeys
  // are the accessible controls.
  return (
    <div
      ref={stage}
      data-slot="video-picture"
      data-zoomed={zoomed || undefined}
      // What `toggleFullscreen` fills inside the player's root.
      data-fullscreen={fullscreen || undefined}
      data-awake={awake || undefined}
      // `group/picture`: chrome over it (ui/player's PlayerChrome) shows while it is
      // awake.
      className={cn(
        "group/picture relative overflow-hidden rounded-xl bg-black [&:fullscreen]:rounded-none",
        clickable && "cursor-pointer",
        zoomed && "cursor-grab active:cursor-grabbing",
        clickable && playing && !awake && "cursor-none",
        !aspect && !(picture.width && picture.height) && "aspect-video",
        className,
      )}
      // The stage states its shape: the view inside sizes itself to the stage
      // (`container-type: size`, for what is drawn on the picture), so the video can
      // never give the stage its height; without a shape the stage was 0 tall.
      style={{
        aspectRatio:
          aspect ??
          (picture.width && picture.height
            ? `${picture.width} / ${picture.height}`
            : undefined),
      }}
      {...(clickable ? clicks : {})}
    >
      {/* The view: one transform over the whole picture, from the stage's centre.
          Eased when it settles or steps, never under a hand. */}
      <div
        data-slot="video-picture-view"
        className={cn(
          "relative size-full origin-center [container-type:size]",
          zoom && !moving && "transition-transform duration-200 ease-out",
          "motion-reduce:transition-none",
        )}
        style={
          zoom
            ? {
                transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`,
              }
            : undefined
        }
      >
        <Video
          {...picture}
          ref={attachHere}
          play={picture.play ?? "manual"}
          controls={false}
          className="rounded-[inherit]"
          videoClassName={cn("object-contain", videoClassName)}
        >
          {/* Each language's file, for the browser to parse and load; never drawn by
              it (ui/media-captions keeps them "hidden"), the picture's own layer
              draws the lines. */}
          {captions?.offered.map((c) => (
            <track
              key={c.src}
              kind="captions"
              src={c.src}
              srcLang={c.lang}
              label={c.label}
            />
          ))}
        </Video>
        {inPicture && frame && (
          // The picture's own box, contained in the view as the video is.
          <div
            data-slot="video-picture-in"
            className="pointer-events-none absolute inset-0 m-auto w-(--ag-picture-w) [aspect-ratio:var(--ag-picture-shape)]"
            style={
              {
                "--ag-picture-shape": `${frame.w} / ${frame.h}`,
                "--ag-picture-w": `min(100cqw, 100cqh * ${frame.w} / ${frame.h})`,
              } as React.CSSProperties
            }
          >
            {inPicture}
          </div>
        )}
      </div>
      {captions?.shown && <PictureCaptions />}
      {/* What stands over a picture (PlayerChrome and its parts, a zoom finder, their
          tooltips and menus) wears the scheme the frame under it asks for, read
          live (ui/backdrop): light glass over snow, dark over night, with no part
          saying so. A picture whose pixels cannot be read (another origin, no
          CORS) stands it all in the dark scheme. Popups open inside the picture
          only while it is the fullscreen element (the only place they show then);
          otherwise in the player's layer, unclipped by a picture narrower than
          they are. */}
      <BackdropScope source={backdrop}>
        <MaterialProvider scheme={readable ? "backdrop" : "dark"}>
          {fullscreen ? (
            <PlayerLayer active={full}>{children}</PlayerLayer>
          ) : (
            children
          )}
        </MaterialProvider>
      </BackdropScope>
      {zoom && (
        <span role="status" className="sr-only">
          {said ? `zoom ${said.text}` : ""}
        </span>
      )}
      {saying && (
        <span aria-hidden className={PLAYER_FLASH}>
          {saying}
        </span>
      )}
    </div>
  )
}

/** The video element of the VideoPlayback around, once its VideoPicture has attached
 *  it; null before. For what acts on the element itself (film-wall gives a tile's its
 *  voice under the hand); time is the timebase's, never read off it. */
export function useVideoElement(): HTMLVideoElement | null {
  const ctx = React.useContext(PictureContext)
  if (!ctx) throw new Error("useVideoElement: place it inside a VideoPlayback")
  return ctx.element
}

/** Where one person's face is in the picture over a span of time: a shot (ms) and the
 *  square around the face (its centre and half its side, in the video's own pixels). */
export interface CropShot {
  from: number
  to: number
  x: number
  y: number
  r: number
}

/** Of one face's shots, the one at `ms`, if the face is in the picture then. */
export function shotAt(
  shots: readonly CropShot[],
  ms: number,
): CropShot | undefined {
  return shots.find((s) => ms >= s.from && ms < s.to)
}

/** How far either side of an instant the framing looks, ms: a face detector's square
 *  wobbles from sample to sample, and a head does not. */
const FRAMING_MS = 400

/** One shot running straight into the next with the face near where it was: the same
 *  shot, the head moving. Anything else is a cut. */
const linked = (a: CropShot, b: CropShot) =>
  b.from === a.to && Math.hypot(b.x - a.x, b.y - a.y) <= a.r

/** The square round one face at `ms`, following the head: its shots measured every so
 *  often (a face detector's) are a run of short shots, and within a run the square is
 *  the samples' path averaged over an instant either side (the head, not the detector's
 *  jitter); a cut is kept, the average never reaching across one. A pure function of
 *  time, so a seek, a pause and every crop of the same face agree. */
export function framed(
  shots: readonly CropShot[],
  ms: number,
): { x: number; y: number; r: number } | undefined {
  const i = shots.findIndex((s) => ms >= s.from && ms < s.to)
  if (i < 0) return undefined
  // The run this instant belongs to.
  let lo = i
  let hi = i
  while (lo > 0 && linked(shots[lo - 1] as CropShot, shots[lo] as CropShot))
    lo--
  while (
    hi < shots.length - 1 &&
    linked(shots[hi] as CropShot, shots[hi + 1] as CropShot)
  )
    hi++
  const start = (shots[lo] as CropShot).from
  const end = (shots[hi] as CropShot).to - 1
  // The samples' path inside the run: from one sample's square to the next's.
  const path = (t: number) => {
    let j = lo
    while (j < hi && t >= (shots[j] as CropShot).to) j++
    const s = shots[j] as CropShot
    const next = j < hi ? (shots[j + 1] as CropShot) : undefined
    if (!next) return s
    const f = (t - s.from) / (s.to - s.from)
    return {
      x: s.x + (next.x - s.x) * f,
      y: s.y + (next.y - s.y) * f,
      r: s.r + (next.r - s.r) * f,
    }
  }
  // Averaged over the moment around `ms`, the nearer instants weighing more.
  const STEPS = 8
  let x = 0
  let y = 0
  let r = 0
  let total = 0
  for (let k = -STEPS; k <= STEPS; k++) {
    const t = Math.min(end, Math.max(start, ms + (k / STEPS) * FRAMING_MS))
    const w = STEPS + 1 - Math.abs(k)
    const p = path(t)
    x += p.x * w
    y += p.y * w
    r += p.r * w
    total += w
  }
  return { x: x / total, y: y / total, r: r / total }
}

/** Whether a face is in the picture at the instant shown (a preview's too). */
export function useInShot(shots: readonly CropShot[]): boolean {
  return useTimebaseState((s) => shotAt(shots, shownAt(s)) !== undefined)
}

/** A piece of the picture, drawn live: one person's face out of a shot that holds
 *  several, each frame as the decoder presents it (requestVideoFrameCallback), so every
 *  face in a scene moves, the listening ones too. `shots` say where the face is and
 *  when; between them nothing is drawn (`useInShot` says so, for whatever stands in: a
 *  faceless voice). Needs the VideoPicture of the VideoPlayback around it on the page,
 *  the one element every crop reads. */
export function VideoCrop({
  shots,
  className,
  style,
}: {
  shots: readonly CropShot[]
  className?: string
  style?: React.CSSProperties
}) {
  const ctx = React.useContext(PictureContext)
  if (!ctx) throw new Error("VideoCrop: place it inside a VideoPlayback")
  const el = ctx.element
  const canvas = React.useRef<HTMLCanvasElement>(null)
  React.useEffect(() => {
    const c = canvas.current
    const g = c?.getContext("2d")
    if (!el || !c || !g) return
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      c.width = Math.round(c.clientWidth * dpr)
      c.height = Math.round(c.clientHeight * dpr)
    }
    const draw = () => {
      const s = framed(shots, msOf(el.currentTime))
      // Out of the picture: nothing, never the last frame it was in.
      if (!s) return g.clearRect(0, 0, c.width, c.height)
      if (el.readyState < 2) return
      g.clearRect(0, 0, c.width, c.height)
      g.drawImage(
        el,
        s.x - s.r,
        s.y - s.r,
        2 * s.r,
        2 * s.r,
        0,
        0,
        c.width,
        c.height,
      )
    }
    const resize = new ResizeObserver(() => {
      size()
      draw()
    })
    resize.observe(c)
    let frame = 0
    const loop = () => {
      draw()
      frame = el.requestVideoFrameCallback(loop)
    }
    frame = el.requestVideoFrameCallback(loop)
    // A seek while paused presents a frame too; a still page draws it once loaded.
    el.addEventListener("seeked", draw)
    el.addEventListener("loadeddata", draw)
    return () => {
      resize.disconnect()
      el.cancelVideoFrameCallback(frame)
      el.removeEventListener("seeked", draw)
      el.removeEventListener("loadeddata", draw)
    }
  }, [el, shots])
  return (
    <canvas
      ref={canvas}
      data-slot="video-crop"
      aria-hidden
      className={cn("block size-full", className)}
      style={style}
    />
  )
}
