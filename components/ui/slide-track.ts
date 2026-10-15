import {
  carryMs,
  clamp,
  GLIDE,
  GLIDE_ENTRY,
  GLIDE_ENTRY_MIN,
  GLIDE_MAX,
  GLIDE_MIN,
  glide as glideCurve,
  SAMPLES,
  type Sample,
  SWIPE_END,
  SWIPE_LIFT,
  SWIPE_LIFT_EVENTS,
  SWIPE_TIP,
  swipeAgain,
  swipeBreak,
  swipeEnvelope,
  swipeGain,
  swipePace,
  swipeTip,
  velocity,
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
  /** One wheel event's sideways travel, px, and what the wheel phase
   *  (`lib/lightbox-wheel-phase`) read: `handBack`, it opened a stream since the
   *  last event fed here (its `start`, held by the binder over the events it kept
   *  back), and `coasting`, its `momentum`. */
  wheel(dx: number, handBack: boolean, coasting: boolean): void
  /** A finger's sideways travel, px, the slides' way (a finger moving right brings
   *  the slide from the left: pass its negative). */
  finger(dx: number): void
  /** The hand let go: the slides land where its motion would have coasted. */
  release(): void
  /** Another hand takes over (a pointer coming down, a key): the swipe ends and a
   *  glide stops where it is. */
  drop(): void
  /** Glide to slide `i`, chaining on a glide in flight. */
  glideTo(i: number): void
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
  const debugging = () => o.debug?.() ?? false

  // ---- THE INSTRUMENT (debug only). Every decision is one line, `track <what>`,
  // with the engine's whole state after it: the anchor (a), the hand's travel this
  // gesture (h, px of trackpad or finger), the slides' offset from the anchor it
  // makes (o: h by the wheel's gain, or 1:1), where the machine has the track (b),
  // what was last
  // WRITTEN to the scroller (w), and the flags (step: snapping held off, swipe: a
  // hand on it, done: the gesture spent, glide: a glide running, aim). A decision
  // line never reads the scroller (a read after a write forces a layout, and the
  // instrument becomes the thing it measures). The screen's truth is read ONCE a
  // frame by the watchdog, which says, the moment it happens:
  //   MOVED          the scroller is not where the engine last wrote it (the
  //                  browser moved it: a snap, a pan, a resize)
  //   STUCK STEPPING the snapping held off while nothing of ours drives the track
  //   OFF A SLIDE    the track at rest between two slides
  let written = Number.NaN
  const r = (n: number) => (Number.isFinite(n) ? Math.round(n) : "-")
  const flags = () =>
    `${el.dataset.stepping !== undefined ? " step" : ""}${swipe ? " swipe" : ""}${swipeDone ? " done" : ""}${glide ? " glide" : ""} aim ${aiming ?? "-"}`
  const say = (what: string) => {
    if (!debugging()) return
    trace(
      `track ${what} · a ${swipeAnchor} h ${r(swipeHand)} o ${r(give())} b ${r(base)} w ${r(written)}${flags()}`,
    )
  }
  const stepOn = (why: string) => {
    if (el.dataset.stepping === undefined) say(`snap off (${why})`)
    el.dataset.stepping = ""
  }
  const stepOff = (why: string) => {
    if (el.dataset.stepping !== undefined) {
      delete el.dataset.stepping
      say(`snap on (${why})`)
    }
  }
  let watch = 0
  let idleSince = 0
  const watchdog = () => {
    watch = requestAnimationFrame(watchdog)
    if (!debugging()) return
    const at = el.scrollLeft
    if (Number.isFinite(written) && Math.abs(at - written) > 1) {
      trace(
        `track MOVED · wrote ${r(written)}, reads ${r(at)} (${r(at - written)} px, slide ${(at / slot).toFixed(2)})${flags()}`,
      )
      written = at
    }
    const busy = swipe || glide !== 0
    if (busy) {
      idleSince = 0
      return
    }
    const now = performance.now()
    if (!idleSince) idleSince = now
    if (now - idleSince < 400) return
    if (el.dataset.stepping !== undefined) {
      trace(`track STUCK STEPPING · at ${r(at)}${flags()}`)
      idleSince = now + 2000
    }
    const off = at / slot - Math.round(at / slot)
    if (Math.abs(off * slot) > 1) {
      trace(
        `track OFF A SLIDE · at ${r(at)}, slide ${(at / slot).toFixed(3)}${flags()}`,
      )
      idleSince = now + 2000
    }
  }

  /** A slide's pitch, CACHED: a layout read, asked several times a wheel event,
   *  each one between `scrollLeft` writes. Uncached, wheel events arrived 33 ms
   *  apart carrying 189 px each while the page reflowed. The room between two
   *  slides is the track's own `column-gap`, read here, never a number kept beside
   *  it: one in rem drifted the track off every slide on a page whose rem is not
   *  16 px. The width is the LAYOUT's, to the fraction (the computed `width`):
   *  `clientWidth` rounds (a track 536.5 px wide measured 536 put the sixth slide
   *  2.5 px off its snap point), and `getBoundingClientRect` is the width as DRAWN,
   *  transforms included, so a stage measured while it scaled in would carry a
   *  wrong pitch for the whole session. */
  let slot = 0
  const measure = () => {
    const style = getComputedStyle(el)
    const gap = Number.parseFloat(style.columnGap)
    slot = Number.parseFloat(style.width) + (Number.isFinite(gap) ? gap : 0)
    if (!(slot > 0)) throw new Error(`slide-track: a pitch of ${slot}`)
    if (debugging())
      trace(
        `track measure · pitch ${slot.toFixed(2)} (width ${style.width}, gap ${style.columnGap}, drawn ${el.getBoundingClientRect().width.toFixed(2)}, client ${el.clientWidth})`,
      )
  }
  const slotW = () => slot
  const landed = () =>
    Math.min(o.count() - 1, Math.max(0, Math.round(el.scrollLeft / slotW())))

  let aiming: number | null = null
  const aimAt = (i: number | null) => {
    if (aiming !== i) say(`aim ${i ?? "-"}`)
    aiming = i
    o.onAim(i)
  }
  const arrive = (i: number) => {
    say(`arrive ${i} (current ${o.current()})`)
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

  /** Where the hand has the slides, px from their anchor (`swipeTravel`, already
   *  held to the slides there are). Decided, nothing: the glide has them. */
  const give = () => (swipeDone ? 0 : swipeTravel)
  const paint = () => {
    written = clamp(base + give(), 0, (o.count() - 1) * slotW())
    el.scrollLeft = written
  }
  /** Hand the track back to the machine where it stands. */
  const rebase = () => {
    base = el.scrollLeft
    swipeTravel = 0
  }
  const stopGlide = (why: string) => {
    if (!glide) return
    cancelAnimationFrame(glide)
    glide = 0
    say(`glide cut (${why})`)
    // Cut short between two slides: the magnets come back and the browser takes it
    // to the nearest; not while a hand is on the track.
    if (!swipe) stepOff("glide cut")
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

  /** The track arrives at slide `i`, from where the slides stand. A machine's move
   *  (a key, a tab pressed) leaves briskly (`GLIDE_ENTRY_MIN`); a hand's (`carry`,
   *  the slides' own speed `vx` px a ms) leaves at EXACTLY that speed, whichever way
   *  it goes, so a decision is never a jump in speed: measured in the gym, the floor
   *  launched slides moving 0.5 px/ms at 17 px/ms, "so disconnected". */
  const glideTo = (i: number, vx = 0, carry = false) => {
    stopGlide("a new glide")
    // MAGNETS DOWN BEFORE ANYTHING READS THE SCROLLER: a mandatory container
    // re-snaps at the next layout, and reading `scrollLeft` forces it.
    stepOn("glide")
    // Derived from the ground truth every time: the browser moves this scroller
    // too, and a remembered `base` would be stale.
    base = el.scrollLeft - give()
    const to = i * slotW()
    const from = base
    const d = to - from
    if (o.reduced() || Math.abs(d) < 0.5) {
      say(`glide ${i}: home already (${r(d)} px)`)
      base = to
      paint()
      // Home already, or a cut: the magnets come back here too (the lightbox's
      // own gesture end did it for it; a track nothing else tends must not be
      // left unsnapped).
      if (!swipe) stepOff("home already")
      arrive(i)
      return
    }
    // A key's: far to go, longer to go it, bounded, never linear in the distance.
    // A hand's: as long as the way takes at the hand's own speed (`carryMs`).
    const ms = carry
      ? carryMs(d, vx, slotW())
      : clamp(GLIDE * Math.sqrt(Math.abs(d) / slotW()), GLIDE_MIN, GLIDE_MAX)
    const m0 =
      d *
      clamp((vx * ms) / d, carry ? -GLIDE_ENTRY : GLIDE_ENTRY_MIN, GLIDE_ENTRY)
    say(
      `glide ${i}: ${r(from)} → ${r(to)} in ${Math.round(ms)} ms, leaving at ${(m0 / ms).toFixed(2)} px/ms (hand ${vx.toFixed(2)})`,
    )
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
      say(`glide ${i}: landed`)
      if (!swipe) stepOff("landed")
      arrive(i)
      if (!swipe) report(`landed on ${i}`)
    }
    glide = requestAnimationFrame(step)
  }

  /** The slides' own speed now, px a ms, off their timed offsets: a hand held
   *  still before it ended reads as stopped (`velocity`). */
  const speed = () => velocity(trail, performance.now()).x
  /** Decided: on to the slide `step` away (1, -1) or back to the anchor (0), from
   *  where the slides stand at the speed they had, and the gesture is spent, so
   *  what the device still sends moves nothing. */
  const settleOn = (step: number, why: string) => {
    const v = speed()
    const pct = `${Math.round((swipeTravel / slotW()) * 100)}% at ${v.toFixed(2)} px/ms`
    swipeDone = true
    swipeDir = step || Math.sign(swipeTravel)
    // Watching for the hand again starts once this push has lifted: a slide that
    // tipped under a hand still speeding up must not read the rest of that one
    // push as a second (two slides a gesture, the slot machine).
    // A lift is a push already lifted, so it watches at once.
    spentPeak = strokePeak
    spentLow = Number.POSITIVE_INFINITY
    const now = swipePace(strokes)
    if (now !== null) spentPace(now)
    rebase()
    if (!step) {
      say(`back (${why}): ${pct}`)
      glideTo(swipeAnchor, v, true)
      return
    }
    swipeAnchor += step
    // The chrome moves with the decision, not the arrival: the counter (a tab) is
    // the answer to the gesture, and a stream opening on top anchors here.
    aimAt(swipeAnchor)
    say(`tip to ${swipeAnchor} (${why}): ${pct}`)
    glideTo(swipeAnchor, v, true)
  }
  /** The hand is gone: the slides land where its motion would have coasted. */
  const decide = (why: string) => {
    const step = swipeTip(swipeTravel, speed(), slotW())
    const to = swipeAnchor + step
    settleOn(to >= 0 && to < o.count() ? step : 0, why)
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
    stopGlide("a hand took over")
    stepOn("a hand")
    swipeDone = false
    swipeDir = 0
    swipeHand = 0
    swipeAnchor = aiming ?? landed()
    rebase()
    spentDropped = 0
    settleIgnored = false
    strokes = []
    strokePeak = 0
    spentPeak = 0
    spentLow = Number.POSITIVE_INFINITY
    trail = []
    say(`open (${why})`)
  }
  /** Deltas a spent gesture swallowed, said once when it ends. */
  let spentDropped = 0
  let settleIgnored = false
  /** The slides' offset, timed: their speed when a decision takes them over. */
  let trail: Sample[] = []

  /** The wheel gesture's last deltas, the fastest pace it has had, and, once it
   *  is decided (lifted, tipped, anything), the slowest since: what tells the
   *  hand lifting (`SWIPE_LIFT`) and the hand coming back after it (`swipeAgain`:
   *  a coast never speeds up). */
  let strokes: number[] = []
  let strokePeak = 0
  /** Decided: the fastest the pace has been since, and its lowest once that push
   *  lifted (infinite before: not watching yet). */
  let spentPeak = 0
  let spentLow = Number.POSITIVE_INFINITY
  const spentPace = (pace: number) => {
    spentPeak = Math.max(spentPeak, pace)
    if (spentLow < Number.POSITIVE_INFINITY || pace < SWIPE_LIFT * spentPeak)
      spentLow = Math.min(spentLow, pace)
  }
  /** The lift needs BOTH the pace fallen under half its peak and the phase seeing
   *  the device coast (`coasting`, its even decay). The pace alone read a slow hand
   *  wobbling at 2-3 px an event (3, 3, 2, 2, 1) as one lifting, and the slides fell
   *  back from under a finger still down (the gym, 2026-10-15). The two mistakes are
   *  not equal: a lift called early tears the slides from the hand; one called late
   *  lets them follow the device's coast a moment, as any scroll does, until the
   *  silence. A slow hand barely coasts, so it ends on the silence. */
  const lift = (coasting: boolean) => {
    const pace = swipePace(strokes)
    if (pace === null) return
    strokePeak = Math.max(strokePeak, pace)
    if (!coasting || pace >= SWIPE_LIFT * strokePeak) return
    decide(
      `lifted: ${pace.toFixed(1)} of a peak ${strokePeak.toFixed(1)} px an event, coasting`,
    )
  }
  /** Travel, from whatever pushes, `gain` px of slide a px of hand: one rule for a
   *  wheel and a finger. The offset is held to the slides there are (nothing is
   *  behind the first or the last, so leaning toward it shows nothing and costs
   *  nothing to come back from) and to one slide either way. */
  const feed = (dx: number, gain: number) => {
    swipeHand += dx
    // SPENT: the slide is decided, a glide has the slides, and what still arrives
    // moves nothing. Buying another on the same gesture is the slot machine.
    if (swipeDone) {
      spentDropped += Math.abs(dx)
      shoot(dx, swipeHand, base)
      return
    }
    const w = slotW()
    swipeTravel = clamp(
      swipeTravel + dx * gain,
      swipeAnchor > 0 ? -w : 0,
      swipeAnchor < o.count() - 1 ? w : 0,
    )
    trail = [...trail, { x: swipeTravel, y: 0, t: performance.now() }].slice(
      -SAMPLES,
    )
    paint()
    shoot(dx, swipeHand, base + give())
  }
  const end = (why: string) => {
    if (!swipe) return
    say(
      `end (${why})${spentDropped ? `, ${Math.round(spentDropped)} px of tail swallowed` : ""}`,
    )
    swipe = false
    clearTimeout(swipeTimer)
    if (!swipeDone) decide(why)
    else if (!glide) {
      // Spent and at rest: put it exactly on its slide and hand the magnets back.
      // A glide still running is left to land (re-aiming it here, at no speed,
      // stalled it under a finger that had just let go).
      rebase()
      glideTo(swipeAnchor, 0)
    }
    if (!glide) report(`ended on ${swipeAnchor}`)
  }

  measure()
  watch = requestAnimationFrame(watchdog)
  const silence = () => end("silence")
  return {
    wheel(dx, handBack, coasting) {
      const pace = swipePace([...strokes, dx].slice(-SWIPE_LIFT_EVENTS))
      // Only a SPENT gesture can be interrupted: one still choosing owns every delta.
      const broke = swipeDone
        ? handBack
          ? "phase"
          : pace !== null && swipeAgain(pace, spentLow)
            ? `the pace again (${pace.toFixed(1)}, from a low of ${spentLow.toFixed(1)} px an event)`
            : swipeBreak(dx, swipeEnv, swipeDir)
        : null
      swipeEnv = swipeEnvelope(dx, swipeEnv)
      if (swipe && broke) end(`a hand back: ${broke}`)
      if (!swipe) {
        open(broke ?? "new stream")
        swipeEnv = Math.abs(dx)
      }
      strokes = [...strokes, dx].slice(-SWIPE_LIFT_EVENTS)
      // Silence ends a wheel: it never says.
      clearTimeout(swipeTimer)
      swipeTimer = window.setTimeout(silence, SWIPE_END)
      feed(dx, swipeGain(slotW()))
      // Past its halfway point a slide tips, the hand still on the glass: a
      // trackpad is not the picture, so nothing is torn from under the fingers.
      if (swipe && !swipeDone && Math.abs(swipeTravel) >= SWIPE_TIP * slotW())
        settleOn(Math.sign(swipeTravel), "past its tip")
      else if (swipe && !swipeDone) lift(coasting)
      else if (swipeDone && pace !== null) spentPace(pace)
    },
    finger(dx) {
      if (!swipe) open("finger")
      // 1:1: the picture is under the finger, and stays there until it lifts.
      feed(dx, 1)
    },
    release: () => end("released"),
    drop() {
      end("dropped for another hand")
      stopGlide("dropped for another hand")
    },
    glideTo: (i) => glideTo(i),
    jumpTo(i) {
      stopGlide("a jump")
      el.scrollTo({ left: i * slotW(), behavior: "instant" })
      base = el.scrollLeft
      written = base
      say(`jump ${i}`)
    },
    measure,
    landed,
    aim: () => aiming,
    aimAt,
    busy: () => swipe || glide !== 0,
    stop: () => stopGlide("stopped"),
    settle() {
      // The browser carried it to rest on a snap point: that slide is current.
      // Nothing of ours may be moving it.
      if (swipe || glide) {
        // Every write of ours raises one: said once a gesture, not once a frame.
        if (!settleIgnored) say("browser settled, ignored: ours is moving it")
        settleIgnored = true
        return
      }
      const i = landed()
      say(`browser settled on ${i}`)
      arrive(i)
    },
    dispose() {
      stopGlide("disposed")
      clearTimeout(swipeTimer)
      cancelAnimationFrame(shotRaf)
      cancelAnimationFrame(watch)
    },
  }
}
