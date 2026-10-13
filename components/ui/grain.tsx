"use client"

// GRAIN: light in the surface itself, alive, so a page reads as a material and
// never as flat colour. Two looks:
//
//   snow      RETRO. A screen's static: every pixel a faint speck and a few bright,
//             all jumping to new places a dozen times a second.
//   shimmer   A SURFACE OF FACETS, as skin in the sun in Twilight, or frost, or
//             crushed diamond: a microscopic facet every few pixels, each tilted its
//             own way. At rest the facets turn slowly on their own under a soft
//             light whose angle wavers across the surface, so they flash all over
//             it at their own moments; a light at the hand gathers the sparkle
//             under the pointer. Both together by default (`rest`, `hand`). Round
//             each flash a soft sheen, everywhere a faint frost, and each flash
//             can carry a diamond's fire (`colour`).
//
// What is bright inside a box blooms with `Halation` (ui/halation), film's glow:
// wrap the page and the sparkle blooms with the rest of it.
//
// Every look only lightens (`plus-lighter`), stands still under reduced motion,
// fills its positioned parent (`absolute inset-0`; a page wears one as a fixed
// layer over everything, `fixed inset-0 z-50`) and takes no pointer. Snow costs
// nothing per frame (one tile the compositor moves); shimmer is one small fragment
// shader, drawn each frame only while the box is on screen and the page is shown.

import * as React from "react"
import { cn } from "@/lib/utils"

export type GrainLook = "snow" | "shimmer"

/** Every knob, each in the unit it is felt in. A look reads the ones it has. */
export interface GrainProps {
  look?: GrainLook
  /** How bright it is, 0 to 1: snow's specks, shimmer's flashes. */
  strength?: number
  /** The whole layer's opacity, 0 to 1, over everything else. */
  opacity?: number
  /** The grain's size: a speck's side in CSS pixels. Unset, one device pixel, the
   *  finest the screen draws; 1 or 2 for a coarser, more retro grain. */
  size?: number
  /** snow: the share of pixels that are a bright speck rather than the faint snow. */
  sparkle?: number
  /** snow: new places a second. */
  rate?: number
  /** shimmer: the facets' spacing in CSS pixels (a facet per cell at most). */
  cell?: number
  /** shimmer: the share of cells that hold a facet, 0 to 1. */
  density?: number
  /** shimmer: how much the facets glow unlit, a frost over the surface, 0 to 1. */
  frost?: number
  /** shimmer: how much of a diamond's fire a flash carries, 0 white to 1 spectral. */
  colour?: number
  /** shimmer at rest: how fast the facets turn, 1 their natural pace. */
  speed?: number
  /** shimmer: how far the facets wander round their places, 1 their natural
   *  drift, 0 still; under the hand they wander wider and tremble. */
  drift?: number
  /** shimmer: how much the hand's motion moves the surface, 0 none: the surface
   *  is pushed along the hand's way and curled round its path, late and heavy,
   *  and settles back. A whisper by default (0.15); much past a half it reads as
   *  a slurry, the facets' grid stretching where the wake pulls hardest. */
  flow?: number
  /** shimmer: alive at rest (default): the facets turn on their own and flash all
   *  over the surface, visual interest with nothing moving. */
  rest?: boolean
  /** shimmer: a light at the hand (default): the sparkle gathers under the
   *  pointer. With `rest` off it drifts when no hand is there. Both on, the
   *  surface twinkles everywhere and brightens where the hand is. */
  hand?: boolean
  className?: string
}

export function Grain({ look = "snow", ...props }: GrainProps) {
  return look === "snow" ? <Snow {...props} /> : <Shimmer {...props} />
}

/** A seeded random, the same sequence for the same seed everywhere (mulberry32). */
function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const reduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

// SNOW ----------------------------------------------------------------------

/** The snow's tile side, in specks: large enough that its repeat is never seen. */
const TILE = 256

/** The tile: white everywhere, its alpha the noise. Every pixel a faint snow (up
 *  to a fifth), `sparkle` of them a bright speck (a half to all). */
function tile(sparkle: number): string {
  const canvas = document.createElement("canvas")
  canvas.width = TILE
  canvas.height = TILE
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Grain: no 2d canvas")
  const image = ctx.createImageData(TILE, TILE)
  const px = image.data
  const random = seeded(7)
  for (let i = 0; i < px.length; i += 4) {
    const bright = random() < sparkle
    const a = bright ? 0.5 + random() * 0.5 : random() * random() * 0.2
    px[i] = 255
    px[i + 1] = 255
    px[i + 2] = 255
    px[i + 3] = Math.round(a * 255)
  }
  ctx.putImageData(image, 0, 0)
  return canvas.toDataURL()
}

/** One tile made once, laid on a layer larger than the box, the layer jumping
 *  between places by a transform the compositor runs (Web Animations, `steps`). */
function Snow({
  strength = 0.07,
  opacity = 1,
  sparkle = 0.04,
  rate = 12,
  size,
  className,
}: GrainProps) {
  const layer = React.useRef<HTMLDivElement>(null)
  // The tile and a speck's size in CSS pixels, both the screen's to know.
  const [made, setMade] = React.useState<{ url: string; speck: number }>()

  React.useEffect(() => {
    setMade({ url: tile(sparkle), speck: size ?? 1 / window.devicePixelRatio })
  }, [sparkle, size])

  React.useEffect(() => {
    const el = layer.current
    if (!el || !made || reduced()) return
    // A second's worth of places, each a whole number of specks into the tile (so
    // a speck lands on a pixel), each shown for one step: with `jump-none` the
    // steps land exactly on the places, and none is passed through.
    const random = seeded(11)
    const places = Array.from({ length: rate }, () => ({
      transform: `translate(${-Math.floor(random() * TILE) * made.speck}px, ${-Math.floor(random() * TILE) * made.speck}px)`,
    }))
    const animation = el.animate(places, {
      duration: 1000,
      iterations: Number.POSITIVE_INFINITY,
      easing: `steps(${rate}, jump-none)`,
    })
    return () => animation.cancel()
  }, [made, rate])

  const span = made ? TILE * made.speck : 0
  return (
    <div
      aria-hidden
      data-slot="grain"
      data-look="snow"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden mix-blend-plus-lighter",
        className,
      )}
      style={{ opacity: strength * opacity }}
    >
      {made && (
        <div
          ref={layer}
          className="absolute -inset-(--grain-span) [image-rendering:pixelated] will-change-transform"
          style={
            {
              "--grain-span": `${span}px`,
              backgroundImage: `url(${made.url})`,
              backgroundSize: `${span}px ${span}px`,
            } as React.CSSProperties
          }
        />
      )}
    </div>
  )
}

// SHIMMER --------------------------------------------------------------------

const VERTEX = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`

/** The shimmer's fragment shader. The surface is cut into cells (`uCell` device
 *  pixels, in the PAGE's coordinates, so a scroll carries the facets under the
 *  light); a cell holds a facet with `uDensity`'s chance, placed somewhere in it
 *  and leaning its own way. A facet's flash is how nearly its tilt sends a light
 *  straight to the eye (Blinn's half vector, to a high power, so only a few
 *  degrees count); its sheen the same to a low power. Each speck is drawn: flash,
 *  sheen and a faint frost, white or a diamond's fire. */
const FRAGMENT = `
precision highp float;
uniform vec2 uSize;
uniform vec2 uLight;
uniform float uScroll;
uniform float uHeight;
uniform float uCell;
uniform float uDensity;
uniform float uStrength;
uniform float uColour;
uniform int uRest;
uniform float uTime;
uniform float uSpeck;
uniform float uSpeed;
uniform float uFrost;
uniform int uHand;
uniform float uDrift;
uniform float uEnergy;
// The hand's wake: where it was (page px), how fast it went (px a second), how
// long ago (s). A dozen, the newest last; an empty one has an age past its life.
uniform vec4 uWake[12];
uniform float uWakeAge[12];
uniform float uFlow;

// The surface as the hand's wake has moved it: each mark in the wake pushes the
// surface along the way the hand went and curls it round the hand's path, within
// a reach of its own; the push builds over a moment and settles slowly back (it
// has mass, it is no liquid), so what the hand moves follows late and comes home
// late. The pixel is read from where the surface came from.
vec2 flowed(vec2 at) {
  vec2 moved = vec2(0.0);
  float reach = uHeight * 0.22;
  for (int i = 0; i < 12; i++) {
    float age = uWakeAge[i];
    if (age > 2.5) continue;
    vec2 d = at - uWake[i].xy;
    float near = exp(-dot(d, d) / (reach * reach));
    if (near < 0.002) continue;
    // Builds to its height at a third of a second, then settles over two.
    float swell = (age / 0.33) * exp(1.0 - age / 0.33) * exp(-age / 1.6);
    vec2 v = uWake[i].zw;
    float speed = length(v);
    // Along the way the hand went, and round its path (the side the point lies
    // on decides which way it turns).
    vec2 along = v * 0.06;
    vec2 round = vec2(-d.y, d.x) / reach * speed * 0.04
      * sign(v.x * d.y - v.y * d.x);
    moved += (along + round) * near * swell;
  }
  float most = uHeight * 0.06;
  float m = length(moved);
  if (m > most) moved *= most / m;
  return at - moved * uFlow;
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
vec3 spectrum(float h) {
  return clamp(abs(fract(h + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
}
// A cell's facet: whether it has one, its centre (page px), and its flash.
float facet(vec2 cell, out vec2 centre, out float flash, out float sheen, out vec3 n) {
  if (hash(cell + 0.37) > uDensity) return 0.0;
  centre = (cell + 0.2 + 0.6 * vec2(hash(cell + 1.7), hash(cell + 3.1))) * uCell;
  // DRIFT: it wanders round its place on a path of its own, two slow sines each
  // way at rates no other facet shares, which reads as Brownian, never as a loop.
  // Under the hand it is stirred: it wanders wider and trembles, the surface
  // alive where the hand is. A third of a cell at rest, under a cell stirred, so
  // a pixel need only look at its neighbouring cells to find it.
  float stir = 0.0;
  if (uHand == 1) {
    vec2 d = centre - uLight;
    stir = exp(-dot(d, d) / (uHeight * uHeight * 0.16)) * uEnergy;
  }
  float ph = hash(cell + 13.7) * 6.2832;
  vec2 wander = vec2(
    sin(uTime * (0.31 + hash(cell + 4.4) * 0.4) + ph)
      + 0.5 * sin(uTime * (0.77 + hash(cell + 6.1) * 0.6) + ph * 1.7),
    cos(uTime * (0.27 + hash(cell + 8.2) * 0.4) + ph * 1.3)
      + 0.5 * cos(uTime * (0.69 + hash(cell + 5.5) * 0.6) + ph * 0.6)
  ) / 1.5;
  vec2 tremble = vec2(
    sin(uTime * (3.1 + hash(cell + 2.9) * 2.0) + ph),
    cos(uTime * (2.7 + hash(cell + 7.3) * 2.0) + ph * 2.1)
  );
  centre += (wander * (0.3 + 0.25 * stir) + tremble * 0.3 * stir) * uDrift * uCell;
  // A facet leans its own way, most nearly flat and some far (up to about 20
  // degrees), as glitter on a surface does.
  float turn = hash(cell + 5.3) * 6.2832;
  float lean = 0.04 + pow(hash(cell + 7.9), 1.5) * 0.34;
  // AT REST it also turns slowly about the upright at a pace of its own, as skin
  // breathing in the sun.
  if (uRest == 1) turn += uTime * uSpeed * (0.25 + hash(cell + 2.2) * 0.9);
  n = normalize(vec3(cos(turn) * lean, sin(turn) * lean, 1.0));
  // How nearly it sends a light to the eye, from either light it is under: the
  // soft light from above and in front, its angle wavering across the surface in
  // long slow waves (at rest), so flashes come all over it at their own moments;
  // and the light at the hand, so they gather where the hand is.
  // The hand's light is as strong as the hand's energy (uEnergy): full while it
  // moves, easing away once it rests, so nothing is ever switched off.
  float rest = 0.0;
  float hand = 0.0;
  if (uRest == 1) {
    vec2 wave = vec2(
      sin(uTime * 0.07 + centre.y * 0.0013 + centre.x * 0.0004),
      cos(uTime * 0.05 + centre.x * 0.0011 - centre.y * 0.0005)
    ) * 0.1;
    rest = max(dot(n, normalize(vec3(wave + vec2(0.0, 0.19), 1.0))), 0.0);
  }
  if (uHand == 1) {
    vec3 l = normalize(vec3(uLight - centre, uHeight));
    hand = max(dot(n, normalize(l + vec3(0.0, 0.0, 1.0))), 0.0);
  }
  flash = max(pow(rest, 400.0), pow(hand, 400.0) * uEnergy);
  sheen = max(pow(rest, 40.0), pow(hand, 40.0) * uEnergy);
  return 1.0;
}
void main() {
  // The page's pixel: down from the top, plus the scroll.
  vec2 at = flowed(vec2(gl_FragCoord.x, uSize.y - gl_FragCoord.y + uScroll));
  vec2 home = floor(at / uCell);
  vec2 here = floor(at / uSpeck);
  // The facets that may have drifted onto this pixel: its own cell's and its
  // neighbours'.
  float light = 0.0;
  vec3 tone = vec3(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 cell = home + vec2(float(i), float(j));
      vec2 centre; float flash; float sheen; vec3 n;
      if (facet(cell, centre, flash, sheen, n) == 0.0) continue;
      // A facet is a speck of light (uSpeck, a device pixel unless sized): its
      // own speck lit by its flash, its sheen and the frost; at its brightest the
      // four specks beside it catch a little, a cross one speck long.
      vec2 o = here - floor(centre / uSpeck);
      float arm = abs(o.x) + abs(o.y);
      if (arm > 1.0) continue;
      // The frost is each facet's own, most faint and a few clear (its cube), so
      // no lattice of equal dots shows the cells.
      float frost = uFrost * 3.0 * pow(hash(cell + 11.3), 3.0);
      float l = arm == 0.0
        ? flash + sheen * 0.3 + frost
        : flash * 0.3 * smoothstep(0.5, 1.0, flash);
      vec3 fire = spectrum(hash(cell + 9.1) + dot(n.xy, vec2(0.7, 0.7)) * 1.5);
      tone += mix(vec3(1.0), fire, uColour * (1.0 - flash * 0.5)) * l;
      light += l;
    }
  }
  if (light <= 0.0) { gl_FragColor = vec4(0.0); return; }
  float a = clamp(light * uStrength, 0.0, 1.0);
  gl_FragColor = vec4(tone / light * a, a);
}`

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) throw new Error("Grain: no shader")
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    throw new Error(`Grain: ${gl.getShaderInfoLog(shader)}`)
  return shader
}

/** Where the light drifts with no hand on the page, as shares of the box: a slow
 *  loop round its upper middle, a full turn in about forty seconds. */
const wandering = (seconds: number) => ({
  x: 0.5 + 0.32 * Math.sin(seconds * 0.157),
  y: 0.38 + 0.22 * Math.sin(seconds * 0.11 + 1.3),
})

/** After this long without the hand, the light drifts again. */
const IDLE_MS = 2500

/** The knobs a facet look draws with, each frame (so moving one costs a frame,
 *  never a new program). */
type Knobs = Required<
  Pick<
    GrainProps,
    | "strength"
    | "cell"
    | "density"
    | "frost"
    | "colour"
    | "speed"
    | "drift"
    | "flow"
    | "rest"
    | "hand"
  >
> & { size: number | undefined }

function Shimmer({
  rest = true,
  hand = true,
  strength = 1,
  opacity = 1,
  size,
  cell = 3,
  density = 0.55,
  frost = 0.02,
  colour = 0.3,
  speed = 1,
  drift = 1,
  flow = 0.15,
  className,
}: GrainProps) {
  const ref = React.useRef<HTMLCanvasElement>(null)
  const knobs = React.useRef<Knobs>(null as unknown as Knobs)
  knobs.current = {
    rest,
    hand,
    strength,
    size,
    cell,
    density,
    frost,
    colour,
    speed,
    drift,
    flow,
  }

  React.useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true })
    if (!gl) throw new Error("Grain: no WebGL")
    const program = gl.createProgram()
    if (!program) throw new Error("Grain: no program")
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX))
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(`Grain: ${gl.getProgramInfoLog(program)}`)
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook
    gl.useProgram(program)
    // One triangle over the whole box.
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    )
    const p = gl.getAttribLocation(program, "p")
    gl.enableVertexAttribArray(p)
    gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0)
    const u = (name: string) => gl.getUniformLocation(program, name)
    const uSize = u("uSize")
    const uLight = u("uLight")
    const uScroll = u("uScroll")
    const uHeight = u("uHeight")
    const uTime = u("uTime")
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    // Canvas pixels per CSS pixel: the screen's, so a speck is a device pixel.
    let k = 1
    let dpr = 1
    const fit = () => {
      dpr = window.devicePixelRatio
      k = dpr
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * k))
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * k))
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(uSize, canvas.width, canvas.height)
      // The light hangs above the page a third of the box's diagonal: the facets'
      // leans (up to 20°) send it to the eye from within about a quarter of the
      // diagonal round the point under it, the sparkling patch the hand carries.
      gl.uniform1f(uHeight, Math.hypot(canvas.width, canvas.height) * 0.3)
    }

    // The hand, in CSS pixels in the box, and when it last moved.
    let pointer: { x: number; y: number } | null = null
    let moved = 0
    // The hand's light has mass: it follows the pointer on a short spring, and
    // its energy rises while the hand moves and eases away once it rests.
    let light: { x: number; y: number } | null = null
    let energy = 0
    let then = 0
    // The hand's wake: a dozen marks, each where the hand was, its velocity
    // there and when, in the canvas's page pixels; the oldest is replaced.
    const WAKE = 12
    const wake = new Float32Array(WAKE * 4)
    const wakeAt = new Float64Array(WAKE).fill(Number.NEGATIVE_INFINITY)
    const ages = new Float32Array(WAKE)
    let next = 0
    let mark: { x: number; y: number; t: number } | null = null
    const draw = (now: number) => {
      const m = knobs.current
      const device = Math.max(2, Math.round(m.cell * dpr))
      gl.uniform1f(u("uCell"), (device * k) / dpr)
      gl.uniform1f(
        u("uSpeck"),
        Math.max(1, Math.round((m.size ?? 1 / dpr) * dpr)) * (k / dpr),
      )
      gl.uniform1f(u("uDensity"), m.density)
      gl.uniform1f(u("uStrength"), m.strength)
      gl.uniform1f(u("uFrost"), m.frost)
      gl.uniform1f(u("uColour"), m.colour)
      gl.uniform1f(u("uSpeed"), m.speed)
      gl.uniform1f(u("uDrift"), m.drift)
      gl.uniform1i(u("uRest"), m.rest ? 1 : 0)
      gl.uniform1f(u("uFlow"), m.flow)
      const box = canvas.getBoundingClientRect()
      const dt = Math.min(0.1, (now - then) / 1000)
      then = now
      // Where the light should be: at the hand; with no hand and nothing alive at
      // rest, a slow wander so the surface stays lit.
      const idle = !pointer || now - moved > IDLE_MS
      const wanders = idle && !m.rest
      const target = wanders
        ? (() => {
            const d = wandering(now / 1000)
            return { x: d.x * box.width, y: d.y * box.height }
          })()
        : (pointer ?? { x: box.width / 2, y: box.height / 2 })
      light ??= target
      const follow = 1 - Math.exp(-dt / 0.12)
      light = {
        x: light.x + (target.x - light.x) * follow,
        y: light.y + (target.y - light.y) * follow,
      }
      // Energy: up within a sixth of a second while the hand moves (or the light
      // wanders), down over a second and a bit once it rests.
      const moving = wanders || (pointer !== null && now - moved < 150)
      energy = moving
        ? energy + (1 - energy) * (1 - Math.exp(-dt / 0.15))
        : energy * Math.exp(-dt / 1.1)
      gl.uniform1i(u("uHand"), m.hand ? 1 : 0)
      gl.uniform1f(u("uEnergy"), energy)
      // The facets are the page's: where the box stands in the page (a fixed layer
      // moves through it as the page scrolls; a box in the page does not), so a
      // scroll carries the surface under a light that stays put on the screen.
      const top = (box.top + window.scrollY) * k
      gl.uniform1f(uScroll, top)
      gl.uniform1f(uTime, now / 1000)
      gl.uniform2f(uLight, light.x * k, light.y * k + top)
      for (let i = 0; i < WAKE; i++)
        ages[i] = (now - (wakeAt[i] as number)) / 1000
      gl.uniform4fv(u("uWake[0]"), wake)
      gl.uniform1fv(u("uWakeAge[0]"), ages)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    fit()
    // Under reduced motion it stands still: one moment of it, the hand ignored,
    // still redrawn each frame so a knob that changes shows.
    const still = reduced()
    // Thirty frames a second at most: the drift is slow and a flash lasts a
    // fifth of a second, so more would spend the GPU on nothing the eye takes.
    let frame = 0
    let last = 0
    let shown = true
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      if (!shown || document.hidden || now - last < 32) return
      last = now
      draw(still ? 4000 : now)
    }
    frame = requestAnimationFrame(tick)
    const move = (e: PointerEvent) => {
      if (still) return
      const box = canvas.getBoundingClientRect()
      pointer = { x: e.clientX - box.left, y: e.clientY - box.top }
      const t = performance.now()
      moved = t
      // A mark in the wake every twentieth of a second the hand moves, its
      // velocity over that span, all in the canvas's page pixels.
      const top = (box.top + window.scrollY) * k
      const here = { x: pointer.x * k, y: pointer.y * k + top, t }
      if (!mark) {
        mark = here
        return
      }
      const span = (t - mark.t) / 1000
      if (span < 0.05) return
      const i = next
      next = (next + 1) % WAKE
      wake.set(
        [here.x, here.y, (here.x - mark.x) / span, (here.y - mark.y) / span],
        i * 4,
      )
      wakeAt[i] = t
      mark = here
    }
    window.addEventListener("pointermove", move, { passive: true })
    const seen = new IntersectionObserver(([entry]) => {
      shown = entry?.isIntersecting ?? true
    })
    seen.observe(canvas)
    const resized = new ResizeObserver(() => fit())
    resized.observe(canvas)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("pointermove", move)
      seen.disconnect()
      resized.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden
      data-slot="grain"
      data-look="shimmer"
      className={cn(
        "pointer-events-none absolute inset-0 size-full mix-blend-plus-lighter",
        className,
      )}
      style={{ opacity }}
    />
  )
}
