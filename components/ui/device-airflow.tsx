"use client"

// The air a MacBook's fans move, as a particle flow inside the base's face
// (device-frame's MacbookInternals draws everything else). Fine particles with
// short fading trails are carried along the airflow: in at each end of the
// base, through that end's fan, inward over the components, bent up and out
// at the hinge toward the viewer. A particle's place is a pure function of
// time (its streamline, its start and its speed), so a held frame (`t`) is
// exact and a live one simply reads the clock. Drawn in the base's own units
// (1000 × 37) scaled to the canvas.
import * as React from "react"

const W = 1000
const H = 37
/** The base's outline in its own units (device-frame's SHELL). */
const SHELL =
  "M 1.7 0.5 H 998.3 Q 999.5 0.5 999.5 1.7 V 12 A 25 24.5 0 0 1 974.5 36.5 H 25.5 A 25 24.5 0 0 1 0.5 12 V 1.7 Q 0.5 0.5 1.7 0.5 Z"
const FAN = [160, 840]
const LINES = 22
const PARTICLES = 320 // per side: grain, not objects
const TRAIL = 0.012 // of a streamline's length: a fleck, not a streak

/** A stable pseudo-random 0..1 per particle and purpose: scattered, never
 *  in step, and the same every frame. */
function hash(i: number, salt: number): number {
  const v = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return v - Math.floor(v)
}

type Point = [number, number]

/** One streamline as points evenly spaced along it: in at the side edge,
 *  through the fan, inward, then up to the hinge. The vent runs the whole
 *  hinge, so the exits are spread evenly from just past the fan's outlet to
 *  a little past the middle: higher lines leave sooner, over the battery;
 *  the lowest run on over the chip and cross the centre, so the two fans'
 *  currents overlap and the air rises over the whole chip, where its heat
 *  is, with no gap between them. */
function streamline(side: number, k: number): Point[] {
  const dir = side === 0 ? 1 : -1
  const cx = FAN[side] as number
  const outlet = cx + dir * 72
  const y = 16 + k * 0.68
  const edge = side === 0 ? 6 : 994
  const first = outlet + dir * 24
  const last = 500 + dir * 14
  const exit = first + ((last - first) * k) / (LINES - 1)
  const bend = exit - dir * 14
  // The turn never starts behind the outlet.
  const ease =
    dir === 1
      ? Math.max(outlet + 2, bend - 22)
      : Math.min(outlet - 2, bend + 22)
  const curve: Point[] = [
    [outlet, y],
    [ease, y],
    [bend, y * 0.55],
    [exit, 0],
  ]
  const raw: Point[] = []
  for (let i = 0; i <= 40; i++) {
    const s = i / 40
    raw.push([edge + (outlet - edge) * s, y])
  }
  for (let i = 1; i <= 60; i++) {
    const s = i / 60
    const [p0, p1, p2, p3] = curve as [Point, Point, Point, Point]
    const u = 1 - s
    raw.push([
      u ** 3 * p0[0] +
        3 * u * u * s * p1[0] +
        3 * u * s * s * p2[0] +
        s ** 3 * p3[0],
      u ** 3 * p0[1] +
        3 * u * u * s * p1[1] +
        3 * u * s * s * p2[1] +
        s ** 3 * p3[1],
    ])
  }
  return resample(raw, 160)
}

/** Points evenly spaced by arc length, so a particle's speed is constant. */
function resample(points: Point[], n: number): Point[] {
  const lengths = [0]
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1] as Point
    const [bx, by] = points[i] as Point
    lengths.push((lengths[i - 1] as number) + Math.hypot(bx - ax, by - ay))
  }
  const total = lengths[lengths.length - 1] as number
  const out: Point[] = []
  let j = 0
  for (let i = 0; i < n; i++) {
    const target = (i / (n - 1)) * total
    while (j < lengths.length - 2 && (lengths[j + 1] as number) < target) j++
    const a = points[j] as Point
    const b = points[j + 1] as Point
    const span = (lengths[j + 1] as number) - (lengths[j] as number) || 1
    const f = (target - (lengths[j] as number)) / span
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f])
  }
  return out
}

const LINES_BY_SIDE = [0, 1].map((side) =>
  Array.from({ length: LINES }, (_, k) => streamline(side, k)),
)

const at = (line: Point[], s: number): Point => {
  const f = Math.min(1, Math.max(0, s)) * (line.length - 1)
  const i = Math.floor(f)
  const a = line[i] as Point
  const b = (line[i + 1] ?? a) as Point
  return [a[0] + (b[0] - a[0]) * (f - i), a[1] + (b[1] - a[1]) * (f - i)]
}

/** A point anywhere in the current: `u` across it (0 the highest streamline,
 *  1 the lowest), `s` along it, between the two streamlines it falls on. */
function place(lines: Point[][], u: number, s: number): Point {
  const f = u * (lines.length - 1)
  const i = Math.floor(f)
  const a = at(lines[i] as Point[], s)
  const b = at((lines[i + 1] ?? lines[i]) as Point[], s)
  return [a[0] + (b[0] - a[0]) * (f - i), a[1] + (b[1] - a[1]) * (f - i)]
}

/** The air's own blue, saturated enough to read as cold over dark aluminium. */
const ICE = [96, 168, 255]
const EMBER = [255, 140, 64]

export interface AirflowProps {
  /** Each fan's speed, 0..1, left then right. */
  fans: number[]
  /** How much heat the air picks up over the chip, 0..1 (it warms a little). */
  warmth: number
  /** Each fan's turns per second (the frame's fanTurnRate). */
  rates: number[]
  /** Turns each fan has made by `t`, held; live, rate × the clock. */
  turns?: number[]
  /** Seconds, for a caller that owns time; omitted, it reads the clock. */
  t?: number
}

/** How far along its path a fan throws the air per turn: a blower moves a
 *  set volume each revolution, so the air keeps pace with the slats. */
const AIR_PER_TURN = 0.07

export function DeviceAirflow({ fans, rates, turns, warmth, t }: AirflowProps) {
  const canvas = React.useRef<HTMLCanvasElement>(null)
  // The body is drawn here first, at the visible canvas's size.
  const offscreen = React.useRef<HTMLCanvasElement | null>(null)
  const props = React.useRef({ fans, rates, turns, warmth, t })
  props.current = { fans, rates, turns, warmth, t }

  const draw = React.useCallback((time: number) => {
    const el = canvas.current
    if (!el) return
    const ctx = el.getContext("2d")
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const { width, height } = el.getBoundingClientRect()
    if (el.width !== Math.round(width * dpr)) el.width = Math.round(width * dpr)
    if (el.height !== Math.round(height * dpr))
      el.height = Math.round(height * dpr)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, el.width, el.height)
    ctx.setTransform(el.width / W, 0, 0, el.height / H, 0, 0)
    ctx.save()
    ctx.clip(new Path2D(SHELL))
    ctx.globalCompositeOperation = "lighter"
    ctx.lineCap = "round"
    const px = W / el.width // one device pixel, in base units across
    const { fans: f, warmth: w } = props.current
    const colour = (x: number, alpha: number) => {
      // Cool from the fans, only tinted warm toward the middle: mixed further,
      // blue and orange meet as grey and the air over the chip reads as a
      // void.
      const toward = 1 - Math.min(1, Math.abs(x - 500) / 340)
      const k = Math.min(1, w * toward * 0.22)
      const rgb = ICE.map((v, n) =>
        Math.round(v + ((EMBER[n] as number) - v) * k),
      )
      return `rgb(${rgb.join(" ")} / ${alpha})`
    }
    // The current's body: one smooth shape per fan, never a set of lines:
    // under its highest streamline (in at the side, up to the hinge past the
    // fan), along the hinge to the centre, down, and back along the bottom of
    // the band. The two shapes meet exactly at the centre and are drawn
    // together, unblurred, so they join with no seam and no gap under the
    // chip; the whole body is thinned where it leaves at the top, then
    // softened once as it is laid on.
    offscreen.current ??= document.createElement("canvas")
    const off = offscreen.current
    if (off.width !== el.width) off.width = el.width
    if (off.height !== el.height) off.height = el.height
    const o = off.getContext("2d")
    if (o) {
      o.setTransform(1, 0, 0, 1, 0, 0)
      o.clearRect(0, 0, off.width, off.height)
      o.setTransform(el.width / W, 0, 0, el.height / H, 0, 0)
      for (const side of [0, 1]) {
        const fan = Math.min(1, Math.max(0, f[side] ?? f[0] ?? 0))
        if (fan === 0) continue
        const lines = LINES_BY_SIDE[side] as Point[][]
        const top = lines[0] as Point[]
        const low = lines[lines.length - 1] as Point[]
        const floor = (low[0] as Point)[1]
        const shape = new Path2D()
        top.forEach(([x, y], i) => {
          if (i === 0) shape.moveTo(x, y)
          else shape.lineTo(x, y)
        })
        shape.lineTo(500, 0)
        shape.lineTo(500, floor)
        shape.lineTo((low[0] as Point)[0], floor)
        shape.closePath()
        const edge = (top[0] as Point)[0]
        const strength = 0.09 + 0.15 * fan
        const along = o.createLinearGradient(edge, 0, 500, 0)
        along.addColorStop(0, colour(edge, 0))
        for (const stop of [0.03, 0.25, 0.5, 0.75, 1]) {
          const x = edge + (500 - edge) * stop
          along.addColorStop(stop, colour(x, strength))
        }
        o.fillStyle = along
        o.fill(shape)
      }
      // Leaving: thin it in the last few units before the hinge, so the
      // exhaust never reads as heating the screen, while the air rising over
      // the chip stays visible.
      o.globalCompositeOperation = "destination-out"
      const leave = o.createLinearGradient(0, 0, 0, 8)
      leave.addColorStop(0, "rgb(0 0 0 / 0.6)")
      leave.addColorStop(1, "rgb(0 0 0 / 0)")
      o.fillStyle = leave
      o.fillRect(0, 0, W, 8)
      o.globalCompositeOperation = "source-over"
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.filter = `blur(${1.6 * (el.width / W)}px)`
      ctx.drawImage(off, 0, 0)
      ctx.restore()
    }
    for (const side of [0, 1]) {
      const fan = Math.min(1, Math.max(0, f[side] ?? f[0] ?? 0))
      if (fan === 0) continue
      const lines = LINES_BY_SIDE[side] as Point[][]
      const turned =
        props.current.turns?.[side] ??
        (props.current.rates[side] as number) * time
      // The particles: each its own place across the current (between two
      // streamlines), a slow sideways wander, its own start, speed and trail,
      // all hashed so nothing lines up, and a held frame is exact.
      for (let i = 0; i < PARTICLES; i++) {
        const u0 = hash(i, side * 7 + 1)
        const start = hash(i, side * 7 + 2)
        const speed = 0.6 + hash(i, side * 7 + 3) * 0.8
        const wander = hash(i, side * 7 + 4) * Math.PI * 2
        const trail = TRAIL * (0.5 + hash(i, side * 7 + 5))
        // The fan sets the pace: the air goes as far as the fan has turned.
        const s = (start + turned * AIR_PER_TURN * speed) % 1
        const across = (s2: number) =>
          Math.min(
            1,
            Math.max(0, u0 + 0.05 * Math.sin(s2 * 9 + wander + time * 0.7)),
          )
        const p = place(lines, across(s), s)
        const q = place(lines, across(s - trail), s - trail)
        // Faint as it enters, fading as it leaves at the top.
        // Present from the intake, fading as it leaves at the top.
        const life = Math.min(1, s / 0.02) * Math.min(1, p[1] / 14)
        const alpha = life * (0.04 + fan * 0.1)
        const g = ctx.createLinearGradient(q[0], q[1], p[0], p[1])
        g.addColorStop(0, colour(p[0], 0))
        g.addColorStop(1, colour(p[0], alpha))
        ctx.strokeStyle = g
        ctx.lineWidth = 0.7 * px
        ctx.beginPath()
        ctx.moveTo(q[0], q[1])
        ctx.lineTo(p[0], p[1])
        ctx.stroke()
      }
    }
    ctx.restore()
  }, [])

  // Held: draw the instant asked for. Live: read the clock every frame.
  React.useEffect(() => {
    if (t !== undefined) {
      draw(t)
      return
    }
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
    if (reduced) {
      draw(0)
      return
    }
    let frame = 0
    const loop = (now: number) => {
      draw(now / 1000)
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [t, draw])

  // A held frame must redraw when the fans or the heat change at the same t.
  // biome-ignore lint/correctness/useExhaustiveDependencies: redraw on the inputs
  React.useEffect(() => {
    if (t !== undefined) draw(t)
  }, [fans, turns, warmth])

  return <canvas ref={canvas} aria-hidden className="device-airflow" />
}
