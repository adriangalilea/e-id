"use client"

// SHIMMER: a surface of facets, as skin in the sun in Twilight, or frost, or
// crushed diamond: a microscopic facet every few pixels, each tilted its own way.
// At rest the facets turn slowly on their own under a soft light whose angle
// wavers across the surface, so they flash all over it at their own moments; a
// light at the hand gathers the sparkle under the pointer. Both together by
// default (`rest`, `hand`). Round each flash a soft sheen, everywhere a faint
// frost, and each flash can carry a diamond's fire (`colour`).
//
//   <div className="relative">            positioned: the shimmer fills it
//     <Shimmer strength={0.75} />
//     <ShimmerLift>…a card…</ShimmerLift>  under the hand, the surface parts round it
//   </div>
//
// LIFTING: what the hand brings forward out of the surface (a card picked up) is
// wrapped in `ShimmerLift`, or named with `liftShimmer(element)`. Every shimmer
// on the page then clears over that element, as it now lies above the surface,
// and nudges its sparks out from its outline, read again every frame, so the
// parting follows the element as it lifts, tilts and floats; let go, it closes
// where the element last was. What always stands in front is simply laid above
// the shimmer; behind it, the shimmer lies over what it covers.
//
// What is bright inside a box blooms with `Halation` (ui/halation), film's glow.
// It only lightens (`plus-lighter`), stands still under reduced motion, fills its
// positioned parent (`absolute inset-0`) and takes no pointer. One small fragment
// shader, drawn only while its box is on screen and the page is shown: at the
// screen's own rate while the hand moves it, thirty frames a second otherwise.

import * as React from "react"
import { cn } from "@/lib/utils"

/** Every knob, each in the unit it is felt in. */
export interface ShimmerProps {
  /** How bright the flashes are, 0 to 1. */
  strength?: number
  /** The whole layer's opacity, 0 to 1, over everything else. */
  opacity?: number
  /** A speck's side in CSS pixels. Unset, one device pixel, the finest the
   *  screen draws. */
  size?: number
  /** How soft a speck is: the radius it is spread over, in CSS pixels (a
   *  gaussian's spread), 0 a hard pixel (default). Half a pixel takes the edge
   *  off a flash on a dark ground without blurring the layer. */
  soft?: number
  /** The facets' spacing in CSS pixels (a facet per cell at most). */
  cell?: number
  /** The share of cells that hold a facet, 0 to 1. */
  density?: number
  /** How much the facets glow unlit, a frost over the surface, 0 to 1. */
  frost?: number
  /** How much of a diamond's fire a flash carries, 0 white to 1 spectral. */
  colour?: number
  /** At rest, how fast the facets turn, 1 their natural pace. */
  speed?: number
  /** How far the facets wander round their places, 1 their natural drift, 0
   *  still; under the hand they wander wider and tremble. */
  drift?: number
  /** How much the hand's motion moves the surface, 0 none: pushed along the
   *  hand's way and curled round its path, late and heavy, and settling back. A
   *  whisper by default (0.15); much past a half it reads as a slurry. */
  flow?: number
  /** How far the whole surface sways, in CSS pixels, 0 still (default): slowly,
   *  up and down over some eighteen seconds there and back with a little
   *  sideways on its own longer beat, as cards floating on a page do. */
  sway?: number
  /** Alive at rest (default): the facets turn on their own and flash all over
   *  the surface. */
  rest?: boolean
  /** A light at the hand (default): the sparkle gathers under the pointer. With
   *  `rest` off it drifts when no hand is there. */
  hand?: boolean
  /** Its edges faded to nothing in the shader, never by a mask on the canvas (a
   *  pass over the whole layer each frame): an ellipse centred at `x`, `y` with
   *  radii `rx`, `ry`, shares of the box (CSS's `radial-gradient(ellipse rx ry
   *  at x y)`), whole within `inner` of its radius; and `foot`, the share of its
   *  height from which it fades to nothing at its foot. */
  fade?: {
    x: number
    y: number
    rx: number
    ry: number
    inner: number
    foot?: number
  }
  className?: string
}

const reduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

// LIFTING --------------------------------------------------------------------

/** What the hand has brought forward, if anything: one at a time, as one hand
 *  holds one card. Read by every shimmer each frame, so no render follows. */
let lifted: Element | null = null

/** Every shimmer on the page parted round `element` while it is lifted; null,
 *  whole again. For an element you hold already; `ShimmerLift` does it for you. */
export function liftShimmer(element: Element | null) {
  lifted = element
}

/** What comes forward out of the shimmer under the hand: while the pointer is
 *  on it, every shimmer clears over it and parts round it, following its
 *  outline as it moves. A `div`, taking every prop one does. */
export function ShimmerLift({
  onPointerEnter,
  onPointerLeave,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="shimmer-lift"
      onPointerEnter={(e) => {
        liftShimmer(e.currentTarget)
        onPointerEnter?.(e)
      }}
      onPointerLeave={(e) => {
        if (lifted === e.currentTarget) liftShimmer(null)
        onPointerLeave?.(e)
      }}
      {...props}
    />
  )
}

// THE SHADER -----------------------------------------------------------------

const VERTEX = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`

/** How many marks the hand's wake keeps, and how long one lives: one a tenth of
 *  a second the hand moves, so the wake holds a mark for its whole life and none
 *  is dropped while it is still moving the surface. */
const WAKE = 16
const WAKE_EVERY = 0.1
const WAKE_LIFE = WAKE * WAKE_EVERY

/** The fragment shader. The surface is cut into cells (`uCell` device pixels, in
 *  the PAGE's coordinates, so a scroll carries the facets under the light); a
 *  cell holds a facet with `uDensity`'s chance, placed somewhere in it and
 *  leaning its own way. A facet's flash is how nearly its tilt sends a light
 *  straight to the eye (Blinn's half vector, to a high power, so only a few
 *  degrees count); its sheen the same to a low power. Each speck is drawn:
 *  flash, sheen and a faint frost, white or a diamond's fire, hard or spread
 *  (`uSoft`). */
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
uniform float uSoft;
uniform float uSpeed;
uniform float uFrost;
uniform int uHand;
uniform float uDrift;
uniform float uEnergy;
// The hand's wake: where it was (page px), how fast it went (px a second), how
// long ago (s). The newest last; an empty one has an age past its life.
uniform vec4 uWake[${WAKE}];
uniform float uWakeAge[${WAKE}];
uniform float uFlow;
uniform float uSway;
uniform vec4 uPart;
uniform float uPartOpen;
uniform vec4 uFade;
uniform float uFadeInner;
uniform float uFoot;

// The surface as the hand's wake has moved it: each mark in the wake pushes the
// surface along the way the hand went and curls it round the hand's path, within
// a reach of its own; the push builds over a moment and settles slowly back (it
// has mass, it is no liquid), gone by the end of the mark's life, so what the
// hand moves follows late and comes home late, and nothing snaps.
vec2 flowed(vec2 at) {
  vec2 moved = vec2(0.0);
  float reach = uHeight * 0.22;
  for (int i = 0; i < ${WAKE}; i++) {
    float age = uWakeAge[i];
    if (age > ${WAKE_LIFE.toFixed(2)}) continue;
    vec2 d = at - uWake[i].xy;
    float near = exp(-dot(d, d) / (reach * reach));
    if (near < 0.002) continue;
    // Builds to its height at a third of a second, then settles, to nothing by
    // the end of its life.
    float swell = (age / 0.33) * exp(1.0 - age / 0.33) * exp(-age / 1.6)
      * (1.0 - smoothstep(${(WAKE_LIFE * 0.65).toFixed(2)}, ${WAKE_LIFE.toFixed(2)}, age));
    vec2 v = uWake[i].zw;
    float speed = length(v);
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

// How far a point lies outside the lifted box (uPart: its middle and half its
// size, page px), negative inside: a rounded rectangle, its corner a card's (7.4%
// of its half-width), so everything follows its outline, corners and all.
float boxDistance(vec2 at) {
  float corner = uPart.z * 0.074;
  vec2 q = abs(at - uPart.xy) - (uPart.zw - corner);
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - corner;
}

// The surface parted by a box come up through it (uPartOpen 0 to 1): what is
// lifted lies above the surface, so over it nothing sparkles, the change soft
// along its outline; just outside its edge the sparks are pushed a little way
// out, straight away from the nearest edge, the most at the edge and none a
// band beyond it. Its z: how much of the light stays.
vec3 parted(vec2 at) {
  if (uPartOpen <= 0.0) return vec3(at, 1.0);
  float d = boxDistance(at);
  float band = uPart.w * 0.3;
  float soft = uPart.w * 0.04;
  float keep = 1.0 - uPartOpen * (1.0 - smoothstep(-soft, soft, d));
  if (d < 0.0 || d > band) return vec3(at, keep);
  float e = 1.0;
  vec2 away = normalize(vec2(
    boxDistance(at + vec2(e, 0.0)) - boxDistance(at - vec2(e, 0.0)),
    boxDistance(at + vec2(0.0, e)) - boxDistance(at - vec2(0.0, e))
  ));
  float fall = 1.0 - d / band;
  return vec3(at - away * band * 0.1 * fall * fall * uPartOpen, keep);
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
  // Under the hand it is stirred: it wanders wider and trembles.
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
  // AT REST it also turns slowly about the upright at a pace of its own.
  if (uRest == 1) turn += uTime * uSpeed * (0.25 + hash(cell + 2.2) * 0.9);
  n = normalize(vec3(cos(turn) * lean, sin(turn) * lean, 1.0));
  // How nearly it sends a light to the eye, from either light it is under: the
  // soft light from above and in front, its angle wavering across the surface in
  // long slow waves (at rest); and the light at the hand, as strong as the hand's
  // energy (uEnergy), so nothing is ever switched off.
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
  vec2 sway = uSway * vec2(0.35 * sin(uTime * 0.22 + 1.7), sin(uTime * 0.35));
  vec3 nudged = parted(flowed(vec2(gl_FragCoord.x, uSize.y - gl_FragCoord.y + uScroll) + sway));
  vec2 at = nudged.xy;
  vec2 home = floor(at / uCell);
  vec2 here = floor(at / uSpeck);
  float light = 0.0;
  vec3 tone = vec3(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 cell = home + vec2(float(i), float(j));
      vec2 centre; float flash; float sheen; vec3 n;
      if (facet(cell, centre, flash, sheen, n) == 0.0) continue;
      vec2 o = here - floor(centre / uSpeck);
      // The frost is each facet's own, most faint and a few clear (its cube), so
      // no lattice of equal dots shows the cells.
      float frost = uFrost * 3.0 * pow(hash(cell + 11.3), 3.0);
      float l;
      if (uSoft > 0.0) {
        // Spread: the speck's light falling off round it as a gaussian of
        // uSoft device pixels, gone by three of them.
        float d2 = dot(o, o) * uSpeck * uSpeck;
        if (d2 > 9.0 * uSoft * uSoft) continue;
        l = (flash + sheen * 0.3 + frost) * exp(-d2 / (2.0 * uSoft * uSoft));
      } else {
        // Hard: its own speck lit, and at its brightest the four specks beside
        // it catch a little, a cross one speck long.
        float arm = abs(o.x) + abs(o.y);
        if (arm > 1.0) continue;
        l = arm == 0.0
          ? flash + sheen * 0.3 + frost
          : flash * 0.3 * smoothstep(0.5, 1.0, flash);
      }
      vec3 fire = spectrum(hash(cell + 9.1) + dot(n.xy, vec2(0.7, 0.7)) * 1.5);
      tone += mix(vec3(1.0), fire, uColour * (1.0 - flash * 0.5)) * l;
      light += l;
    }
  }
  if (light <= 0.0) { gl_FragColor = vec4(0.0); return; }
  // Its edges, faded here rather than by a mask on the canvas: an ellipse, inside
  // it whole, to nothing at its rim, and toward the foot from uFoot down. Shares
  // of the box, from its top left.
  vec2 inBox = vec2(gl_FragCoord.x / uSize.x, 1.0 - gl_FragCoord.y / uSize.y);
  float fade = 1.0;
  if (uFade.z > 0.0)
    fade *= 1.0 - smoothstep(uFadeInner, 1.0, length((inBox - uFade.xy) / uFade.zw));
  if (uFoot < 1.0) fade *= 1.0 - smoothstep(uFoot, 1.0, inBox.y);
  float a = clamp(light * uStrength * nudged.z * fade, 0.0, 1.0);
  gl_FragColor = vec4(tone / light * a, a);
}`

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) throw new Error("Shimmer: no shader")
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    throw new Error(`Shimmer: ${gl.getShaderInfoLog(shader)}`)
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

/** At rest, at most a frame every this many ms (thirty a second): the drift is
 *  slow and a flash lasts a fifth of a second, so more would spend the GPU on
 *  nothing the eye takes. While the hand moves it, or a lift opens or closes,
 *  every frame the screen shows: the light and the surface follow a moving
 *  hand, and at thirty a quick circle was drawn as a few jumps. */
const RESTING_FRAME_MS = 32

type Knobs = Required<
  Pick<
    ShimmerProps,
    | "strength"
    | "soft"
    | "cell"
    | "density"
    | "frost"
    | "colour"
    | "speed"
    | "drift"
    | "flow"
    | "sway"
    | "rest"
    | "hand"
  >
> & {
  size: number | undefined
  fade: ShimmerProps["fade"]
}

export function Shimmer({
  rest = true,
  hand = true,
  strength = 1,
  opacity = 1,
  size,
  soft = 0,
  cell = 3,
  density = 0.55,
  frost = 0.02,
  colour = 0.3,
  speed = 1,
  drift = 1,
  flow = 0.15,
  sway = 0,
  fade,
  className,
}: ShimmerProps) {
  const ref = React.useRef<HTMLCanvasElement>(null)
  const knobs = React.useRef<Knobs>(null as unknown as Knobs)
  knobs.current = {
    fade,
    rest,
    hand,
    strength,
    size,
    soft,
    cell,
    density,
    frost,
    colour,
    speed,
    drift,
    flow,
    sway,
  }

  React.useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    // No antialiasing: one triangle over the whole box has no edge to smooth, and
    // asking for it kept a multisampled copy of the whole canvas every frame.
    const gl = canvas.getContext("webgl", {
      premultipliedAlpha: true,
      antialias: false,
    })
    if (!gl) throw new Error("Shimmer: no WebGL")
    const program = gl.createProgram()
    if (!program) throw new Error("Shimmer: no program")
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX))
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(`Shimmer: ${gl.getProgramInfoLog(program)}`)
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
    const fit = () => {
      k = window.devicePixelRatio
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
    // The hand's wake: each mark where the hand was, its velocity there and
    // when, in the canvas's page pixels; the oldest is replaced.
    const wake = new Float32Array(WAKE * 4)
    const wakeAt = new Float64Array(WAKE).fill(Number.NEGATIVE_INFINITY)
    const ages = new Float32Array(WAKE)
    let next = 0
    let lastMark = Number.NEGATIVE_INFINITY
    let mark: { x: number; y: number; t: number } | null = null
    // The parting: how open (eased toward 1 while something is lifted), and the
    // last box it was round, so it closes where it was.
    let parting = 0
    let parted: { x: number; y: number; width: number; height: number } | null =
      null

    /** Whether the surface is moving with the hand or a lift: drawn every frame
     *  then. */
    const busy = (now: number) =>
      energy > 0.02 ||
      now - lastMark < WAKE_LIFE * 1000 ||
      Math.abs((lifted ? 1 : 0) - parting) > 0.002

    const draw = (now: number) => {
      const m = knobs.current
      const cellPx = Math.max(2, Math.round(m.cell * k))
      gl.uniform1f(u("uCell"), cellPx)
      gl.uniform1f(u("uSpeck"), Math.max(1, Math.round((m.size ?? 1 / k) * k)))
      // A spread past a third of a cell would reach facets the pixel does not
      // look at (its own cell and the next): held there.
      gl.uniform1f(u("uSoft"), Math.min(m.soft * k, cellPx / 3))
      gl.uniform1f(u("uDensity"), m.density)
      gl.uniform1f(u("uStrength"), m.strength)
      gl.uniform1f(u("uFrost"), m.frost)
      gl.uniform1f(u("uColour"), m.colour)
      gl.uniform1f(u("uSpeed"), m.speed)
      gl.uniform1f(u("uDrift"), m.drift)
      gl.uniform1i(u("uRest"), m.rest ? 1 : 0)
      gl.uniform1f(u("uFlow"), m.flow)
      gl.uniform1f(u("uSway"), m.sway * k)
      const f = m.fade
      gl.uniform4f(u("uFade"), f?.x ?? 0, f?.y ?? 0, f?.rx ?? 0, f?.ry ?? 0)
      gl.uniform1f(u("uFadeInner"), f?.inner ?? 0)
      gl.uniform1f(u("uFoot"), f?.foot ?? 1)
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
      // Parting: round what is lifted, read where it is now (it lifts, tilts and
      // floats); opening over about half a second, closing as long once let go.
      if (lifted) {
        const r = lifted.getBoundingClientRect()
        parted = {
          x: r.left - box.left,
          y: r.top - box.top,
          width: r.width,
          height: r.height,
        }
      }
      parting += ((lifted ? 1 : 0) - parting) * (1 - Math.exp(-dt / 0.18))
      gl.uniform1f(u("uPartOpen"), parted && parting > 0.002 ? parting : 0)
      // The facets are the page's: where the box stands in the page (a fixed layer
      // moves through it as the page scrolls; a box in the page does not), so a
      // scroll carries the surface under a light that stays put on the screen.
      const top = (box.top + window.scrollY) * k
      if (parted)
        gl.uniform4f(
          u("uPart"),
          (parted.x + parted.width / 2) * k,
          (parted.y + parted.height / 2) * k + top,
          (parted.width / 2) * k,
          (parted.height / 2) * k,
        )
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
    // still redrawn so a knob that changes shows.
    const still = reduced()
    // Off screen or in a hidden tab it asks for no frames at all, and starts
    // again when it is seen.
    let frame = 0
    let last = 0
    let shown = true
    const running = () => shown && !document.hidden
    const tick = (now: number) => {
      frame = 0
      if (!running()) return
      frame = requestAnimationFrame(tick)
      if (!busy(now) && now - last < RESTING_FRAME_MS) return
      last = now
      draw(still ? 4000 : now)
    }
    const resume = () => {
      if (frame === 0 && running()) frame = requestAnimationFrame(tick)
    }
    resume()
    document.addEventListener("visibilitychange", resume)
    const move = (e: PointerEvent) => {
      if (still) return
      const box = canvas.getBoundingClientRect()
      pointer = { x: e.clientX - box.left, y: e.clientY - box.top }
      const t = performance.now()
      moved = t
      // A mark in the wake every tenth of a second the hand moves, its velocity
      // over that span, all in the canvas's page pixels.
      const top = (box.top + window.scrollY) * k
      const here = { x: pointer.x * k, y: pointer.y * k + top, t }
      if (!mark) {
        mark = here
        return
      }
      const span = (t - mark.t) / 1000
      if (span < WAKE_EVERY) return
      const i = next
      next = (next + 1) % WAKE
      wake.set(
        [here.x, here.y, (here.x - mark.x) / span, (here.y - mark.y) / span],
        i * 4,
      )
      wakeAt[i] = t
      lastMark = t
      mark = here
    }
    window.addEventListener("pointermove", move, { passive: true })
    const seen = new IntersectionObserver(([entry]) => {
      shown = entry?.isIntersecting ?? true
      resume()
    })
    seen.observe(canvas)
    const resized = new ResizeObserver(() => fit())
    resized.observe(canvas)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener("visibilitychange", resume)
      window.removeEventListener("pointermove", move)
      seen.disconnect()
      resized.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden
      data-slot="shimmer"
      className={cn(
        "pointer-events-none absolute inset-0 size-full mix-blend-plus-lighter",
        className,
      )}
      style={{ opacity }}
    />
  )
}
