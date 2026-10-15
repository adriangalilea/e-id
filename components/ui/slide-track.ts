import {
  clamp,
  GLIDE,
  GLIDE_ENTRY,
  GLIDE_ENTRY_MIN,
  GLIDE_MAX,
  GLIDE_MIN,
  glide as glideCurve,
  SWIPE_END,
  swipeBreak,
  swipeCommitPx,
  swipeEnvelope,
  swipeGive,
} from "@/lib/lightbox-motion"

/** The scroller's own rules, as utilities: a row that scrolls sideways under no
 *  scrollbar, snapping each slide to its centre and stopping on every one, the
 *  snapping stood down while the engine drives (`data-stepping`). A hand never pans
 *  it (`touch-action`): the engine moves it, for every pointer. */
export const SLIDE_TRACK =
  "flex overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [scroll-snap-type:x_mandatory] data-[stepping]:[scroll-snap-type:none]"

/** A slide: the track's whole width, snapped at its centre, never skipped. */
export const SLIDE =
  "w-full shrink-0 [scroll-snap-align:center] [scroll-snap-stop:always]"

export interface SlideTrackOptions {
  /** The scroller. */
  el: HTMLElement
  /** How many slides it holds now. */
  count: () => number
  /** The slide the binder calls current. */
  current: () => number
  /** Under reduced motion a glide is a cut. */
  reduced: () => boolean
  /** Where the track is heading changed: a slide bought or stepped to, the chrome
   *  answering the decision rather than the arrival; null, it is on the current. */
  onAim: (i: number | null) => void
  /** The track arrived on a slide other than the current one. */
  onArrive: (i: number) => void
  /** A decision, for the binder's trace (`swipe → 3`). */
  trace?: (line: string) => void
  /** A gesture's whole trajectory as a table, once it ends (debug only). */
  report?: (table: string) => void
  /** Whether the trajectory recorder runs. */
  debug?: () => boolean
}

export interface SlideTrack {
  /** One wheel event's sideways travel, px, and the stream's speed (px a ms, a
   *  hint for the glide that decides nothing). */
  wheel(dx: number, vx: number): void
  /** A finger's sideways travel, px, the slides' way (a finger moving right brings
   *  the slide from the left: pass its negative). */
  finger(dx: number): void
  /** The hand let go: whatever it offered and did not pay for goes back. */
  release(): void
  /** Another hand takes over (a pointer coming down, a key): the swipe ends and a
   *  glide stops where it is. */
  drop(): void
  /** Glide to slide `i`, chaining on a glide in flight. */
  glideTo(i: number, vx?: number): void
  /** Put slide `i` under the reader at once (a wrap, a resize). */
  jumpTo(i: number): void
  /** Re-measure the slide's pitch: the scroller changed size. */
  measure(): void
  /** The slide nearest where the track stands. */
  landed(): number
  /** Where the track is heading, if anywhere but the current slide. */
  aim(): number | null
  /** Set where it is heading (a step decided elsewhere). */
  aimAt(i: number | null): void
  /** A hand is on it, or the engine is moving it: the browser's own settling must
   *  not be read as a choice. */
  busy(): boolean
  /** Stop a glide where it stands, the swipe untouched (the binder leaving). */
  stop(): void
  /** The browser brought it to rest (`scrollsnapchange`, `scrollend`): the slide
   *  under the reader is current, unless a hand or a glide of ours is moving it. */
  settle(): void
  dispose(): void
}

export function createSlideTrack(o: SlideTrackOptions): SlideTrack {
  const { el } = o
  const trace = (text: string) => o.trace?.(text)

  /** A slide's pitch, CACHED: `clientWidth` is a layout read, asked several times a
   *  wheel event, each one between `scrollLeft` writes. Uncached, wheel events
   *  arrived 33 ms apart carrying 189 px each while the page reflowed. The room
   *  between two slides is the track's own `column-gap`, read here, never a number
   *  kept beside it: one in rem drifted the track off every slide on a page whose
   *  rem is not 16 px. */
  let slot = 0
  /** The pitch to the fraction of a pixel: `clientWidth` rounds, and a track
   *  536.5 px wide measured 536 put the sixth slide 2.5 px off its snap point,
   *  which the snapping then took back as a jump. */
  const measure = () => {
    const gap = Number.parseFloat(getComputedStyle(el).columnGap)
    slot = el.getBoundingClientRect().width + (Number.isFinite(gap) ? gap : 0)
  }
  const slotW = () => slot
  const landed = () =>
    Math.min(o.count() - 1, Math.max(0, Math.round(el.scrollLeft / slotW())))

  let aiming: number | null = null
  const aimAt = (i: number | null) => {
    aiming = i
    o.onAim(i)
  }
  const arrive = (i: number) => {
    if (i === o.current()) {
      // Back on the slide it already called current: whatever it was heading for is
      // over, and the next step counts from here.
      aimAt(null)
      return
    }
    aimAt(i)
    o.onArrive(i)
  }

  let base = 0
  let swipeTravel = 0
  let glide = 0
  let swipe = false
  let swipeAnchor = 0
  let swipeHand = 0
  let swipeDone = false
  let swipeEnv = 0
  let swipeDir = 0
  let swipeTimer = 0
  let swipeWhy = ""

  /** What the slide costs, and how far the slides lean on the way to it. Bought,
   *  they lean nothing: they are ON the slide. */
  const swipeLine = () => swipeCommitPx(slotW())
  const give = () => (swipeDone ? 0 : swipeGive(swipeTravel, swipeLine()))
  const paint = () => {
    el.scrollLeft = clamp(base + give(), 0, (o.count() - 1) * slotW())
  }
  /** Hand the track back to the machine where it stands. */
  const rebase = () => {
    base = el.scrollLeft
    swipeTravel = 0
  }
  const stopGlide = () => {
    if (!glide) return
    cancelAnimationFrame(glide)
    glide = 0
    // Cut short between two slides: the magnets come back and the browser takes it
    // to the nearest; not while a hand is on the track.
    if (!swipe) delete el.dataset.stepping
  }

  // ---- the trajectory recorder (debug only). What the hand asked for against what
  // the slides actually did, sample by sample, so "it feels slow" becomes a number.
  // It records NUMBERS ONLY while the gesture runs and formats once at the end: an
  // instrument that reads the DOM or touches React per event becomes the thing it is
  // measuring (the lightbox was once slowed to a crawl by a trace that called
  // getComputedStyle on every wheel event).
  type Shot = { t: number; dx: number; sum: number; at: number }
  let shots: Shot[] = []
  let shotT0 = 0
  let shotFrom = 0
  let shotWhy = ""
  /** Wheel arrivals only. A glide frame shares a timestamp with the event that
   *  started it, and those zero gaps dragged the median to 1 ms and printed
   *  "1000Hz" over a stream running at thirty. */
  let shotEvents: number[] = []
  /** Frames the PAGE drew, against the events it was fed. Equal and low is the
   *  renderer over budget (a 165 ms move gets five frames, the jag); events
   *  slower than frames is the device. */
  let shotFrames = 0
  let shotRaf = 0
  const shotTick = () => {
    shotFrames++
    shotRaf = requestAnimationFrame(shotTick)
  }
  /** `at` is the value JUST WRITTEN, never read back off the element: reading
   *  `scrollLeft` after writing it forces a synchronous layout, once per event. */
  const shoot = (dx: number, sum: number, at: number, wheel = true) => {
    if (!o.debug?.()) return
    const now = performance.now()
    if (!shots.length) {
      shotT0 = now
      shotFrom = swipeAnchor
      shotWhy = swipeWhy
      shotFrames = 0
      shotEvents = []
      shotRaf = requestAnimationFrame(shotTick)
    }
    const t = Math.round(now - shotT0)
    if (wheel) shotEvents.push(t)
    shots.push({ t, dx: Math.round(dx), sum, at })
  }
  const shootGlide = () => {
    if (!o.debug?.() || !shots.length) return
    shoot(0, (shots[shots.length - 1] as Shot).sum, base + give(), false)
  }
  /** How many rows a table gets: enough to see a shape, few enough to paste. */
  const TRACE_ROWS = 16
  /** One gesture, compressed: its header the verdict and the input stream's health,
   *  its table evenly downsampled, the shape of the two columns being the point.
   *  A wheel arrives once a display frame, so the median gap is the REFRESH RATE
   *  (33 ms is a 30 Hz screen, not a fault); a stall is the spread, read at the
   *  90th percentile, not the worst (at 125 Hz one 32 ms gap in sixty is a hiccup).
   *  The slides walking BACKWARDS against the hand (`back`, the worst retreat in
   *  slides) is a snap-back under a finger still moving. */
  const report = (why: string) => {
    cancelAnimationFrame(shotRaf)
    shotRaf = 0
    if (!o.debug?.() || shots.length < 2) {
      shots = []
      return
    }
    const w = slotW()
    const last = shots[shots.length - 1] as Shot
    const first = shots[0] as Shot
    const hand = Math.abs(last.sum) / w
    const moved = (last.at - first.at) / w
    const gaps = shotEvents
      .slice(1)
      .map((t, i) => t - (shotEvents[i] as number))
      .sort((a, b) => a - b)
    const gapMs = Math.max(1, (gaps[gaps.length >> 1] ?? 0) as number)
    const worst = (gaps[Math.floor(gaps.length * 0.9)] ?? 0) as number
    const rate = `@${gapMs}ms ${Math.round(1000 / gapMs)}Hz${
      worst > 2.5 * gapMs ? ` JANK ${worst}ms` : ""
    }`
    const maxDx = Math.max(...shots.map((s) => Math.abs(s.dx)))
    let back = 0
    for (let i = 1; i < shots.length; i++) {
      const d = ((shots[i] as Shot).at - (shots[i - 1] as Shot).at) / w
      if (Math.sign(d) === -Math.sign(last.sum)) back = Math.max(back, -d)
    }
    const step = Math.max(1, Math.ceil(shots.length / TRACE_ROWS))
    const rows = shots
      .filter((_, i) => i % step === 0 || i === shots.length - 1)
      .map(
        (s) =>
          `${String(s.t).padStart(5)}${String(s.dx).padStart(6)}${((s.sum / w) * 100).toFixed(0).padStart(6)}${(((s.at - first.at) / w) * 100).toFixed(0).padStart(6)}`,
      )
    o.report?.(
      [
        `── ${shotFrom}→${swipeAnchor} (${shotWhy}) · ${last.t}ms · ${shots.length}ev ${rate} · ${Math.round((shotFrames * 1000) / Math.max(1, last.t))}fps · maxdx ${maxDx}`,
        `   hand ${hand.toFixed(2)} · pics ${moved.toFixed(2)} · ${(Math.abs(last.sum) / Math.max(1, last.t)).toFixed(2)}px/ms · back ${back.toFixed(2)} · ${why}`,
        `   ms    dx hand%track%  (% of a slide, from the start)`,
        ...rows,
      ].join("\n"),
    )
    shots = []
  }

  /** The track arrives at slide `i`, from where the slides stand, at the speed it
   *  already had (`vx`, px a ms): a swipe committing with the fingers moving
   *  continues at their speed instead of stalling and being shoved. */
  const glideTo = (i: number, vx = 0) => {
    stopGlide()
    // MAGNETS DOWN BEFORE ANYTHING READS THE SCROLLER: a mandatory container
    // re-snaps at the next layout, and reading `scrollLeft` forces it.
    el.dataset.stepping = ""
    // Derived from the ground truth every time: the browser moves this scroller
    // too, and a remembered `base` would be stale.
    base = el.scrollLeft - give()
    const to = i * slotW()
    const from = base
    const d = to - from
    if (o.reduced() || Math.abs(d) < 0.5) {
      base = to
      paint()
      // Home already, or a cut: the magnets come back here too (the lightbox's
      // own gesture end did it for it; a track nothing else tends must not be
      // left unsnapped).
      if (!swipe) delete el.dataset.stepping
      arrive(i)
      return
    }
    // Far to go, longer to go it; bounded, never linear in the distance.
    const ms = clamp(
      GLIDE * Math.sqrt(Math.abs(d) / slotW()),
      GLIDE_MIN,
      GLIDE_MAX,
    )
    const m0 = d * clamp((vx * ms) / d, GLIDE_ENTRY_MIN, GLIDE_ENTRY)
    const t0 = performance.now()
    const step = (t: number) => {
      const s = Math.min(1, (t - t0) / ms)
      base = from + glideCurve(d, m0, s)
      paint()
      shootGlide()
      if (s < 1) {
        glide = requestAnimationFrame(step)
        return
      }
      // Exactly home, on a snap point, so handing the magnets back is invisible.
      glide = 0
      base = to
      paint()
      shootGlide()
      if (!swipe) delete el.dataset.stepping
      arrive(i)
      if (!swipe) report(`landed on ${i}`)
    }
    glide = requestAnimationFrame(step)
  }

  /** The slide, bought: one per gesture, and the gesture is spent. */
  const buySlide = (dir: number, vx: number) => {
    const next = clamp(swipeAnchor + dir, 0, o.count() - 1)
    if (next === swipeAnchor) {
      // The end of the row: the offset held at the line, so the lean cannot run
      // off an edge with nothing behind it.
      swipeTravel = dir * swipeLine()
      return
    }
    swipeDone = true
    swipeDir = dir
    swipeAnchor = next
    rebase()
    // The chrome moves with the decision, not the arrival: the counter (a tab) is
    // the answer to the gesture, and a stream opening on top anchors here.
    aimAt(next)
    trace(`swipe → ${next}`)
    glideTo(next, vx)
  }
  /** A gesture takes the track, anchored where it is HEADING, so a swipe onto a
   *  glide in flight counts from the slide it is going to. */
  const open = (why: string) => {
    // The last gesture's glide may still run: read it out now, or its rows and this
    // one's share a table.
    report("cut short by the next")
    // Held apart from the recording's copy (`shotWhy`): the next gesture's reason
    // once overwrote the one still being reported.
    swipeWhy = why
    swipe = true
    stopGlide()
    el.dataset.stepping = ""
    swipeDone = false
    swipeDir = 0
    swipeHand = 0
    swipeAnchor = aiming ?? landed()
    rebase()
  }
  /** Travel, from whatever pushes: one rule for a wheel and a finger. */
  const feed = (dx: number, vx: number) => {
    swipeHand += dx
    // SPENT: the slide is bought, the slides are on it, and what still arrives moves
    // nothing. Leaning toward a slide it could not buy is the drift past the snap
    // point; buying one is the slot machine.
    if (swipeDone) {
      shoot(dx, swipeHand, base)
      return
    }
    swipeTravel += dx
    if (Math.abs(swipeTravel) >= swipeLine())
      buySlide(Math.sign(swipeTravel), vx)
    // 1:1 under the band: macOS has already put its acceleration in these deltas,
    // and a gain on top was a second acceleration.
    paint()
    shoot(dx, swipeHand, base + give())
  }
  const end = () => {
    if (!swipe) return
    swipe = false
    clearTimeout(swipeTimer)
    // What the hand offered and did not pay for goes back. Rebase first, or the
    // offset would be added on top of the slide it winds back to.
    rebase()
    glideTo(swipeAnchor, 0)
    if (!glide) report(`ended on ${swipeAnchor}`)
  }

  measure()
  return {
    wheel(dx, vx) {
      // Only a SPENT gesture can be interrupted: one still choosing owns every delta.
      const broke = swipeDone ? swipeBreak(dx, swipeEnv, swipeDir) : null
      swipeEnv = swipeEnvelope(dx, swipeEnv)
      if (swipe && broke) end()
      if (!swipe) {
        open(broke ?? "new stream")
        swipeEnv = Math.abs(dx)
      }
      // Silence ends a wheel: it never says.
      clearTimeout(swipeTimer)
      swipeTimer = window.setTimeout(end, SWIPE_END)
      feed(dx, vx)
    },
    finger(dx) {
      if (!swipe) open("finger")
      feed(dx, 0)
    },
    release: end,
    drop() {
      end()
      stopGlide()
    },
    glideTo,
    jumpTo(i) {
      stopGlide()
      el.scrollTo({ left: i * slotW(), behavior: "instant" })
      base = el.scrollLeft
    },
    measure,
    landed,
    aim: () => aiming,
    aimAt,
    busy: () => swipe || glide !== 0,
    stop: stopGlide,
    settle() {
      // The browser carried it to rest on a snap point: that slide is current.
      // Nothing of ours may be moving it.
      if (swipe || glide) return
      arrive(landed())
    },
    dispose() {
      stopGlide()
      clearTimeout(swipeTimer)
      cancelAnimationFrame(shotRaf)
    },
  }
}
