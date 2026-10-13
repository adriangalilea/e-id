"use client"

// A HOLOGRAM, as a security laminate is one: nearly invisible face on, and as the
// surface turns a BAND of iridescent light runs across it, showing its print only
// where the band is. The band answers the hand, never a clock: `HoloLight`
// measures the pointer over what it holds (`--px`, `--py` from 0 to 1, `--hx` in px,
// `data-hover` while it is there) and everything inside reads that; the band falls
// by the hand's place and the tilt it gives, eased as the lean is (`AT`).
//
//   <HoloLight>                        the hand's light
//     <HoloLean pose="flat">           a lean toward it
//       <div class="relative rounded-2xl …">
//         <Holo print="laminate" seal="top-4 right-4 size-16" />
//         …the card's content
//         <FoilEdge />                 a one-pixel ring of foil on its rim
//       </div>
//     </HoloLean>
//   </HoloLight>
//
// The prints are lib/holo-prints' (masks), coloured by lib/foil's spectrum, added to
// the light (`plus-lighter`) so they light the surface and never paint over it. At
// rest a whisper (6%); under the hand a quarter, so what is written over it always
// reads: it should be found, not shown. Only the coming and going is timed. Under
// reduced motion nothing follows the hand and nothing leans.

import type * as React from "react"
import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { foilGradient } from "@/lib/foil"
import {
  type Emblem,
  emblems,
  guilloche,
  printUrl,
  SPARK,
  seal as sealArt,
  web,
} from "@/lib/holo-prints"

/** Where the light rests with no hand on it: a little above the middle, where a
 *  page's light comes from. */
const REST = { x: 0.5, y: 0.35 }

/** WHERE THE LIGHT FALLS across a surface, 0 to 1 along the band's diagonal: a
 *  hologram shows what it does by the angle it is seen at, so the band answers
 *  the surface's tilt as much as the hand's place. Part where the hand is across
 *  (`--px`), part how far up or down (`--py`, which tilts it toward or away and
 *  the hand's place across alone never moved), both about the light's rest, so
 *  at rest it is the middle. Eased like the lean it goes with (`MOVES`), never a
 *  snap to the pointer. A registered number, so the easing can run. */
const AT =
  "calc(0.5 + (var(--px, 0.5) - 0.5) * 0.65 + (var(--py, 0.35) - 0.35) * 0.4)"
const MOVES = "--holo-at 600ms cubic-bezier(0.22, 1, 0.36, 1)"
if (typeof CSS !== "undefined" && CSS.registerProperty)
  try {
    CSS.registerProperty({
      name: "--holo-at",
      syntax: "<number>",
      inherits: true,
      initialValue: "0.5",
    })
  } catch {
    // Registered already: this module evaluated again (a reload in development).
  }

/** The band of light: a diagonal stripe where the light falls (`AT`), full within
 *  8% of it and down to the print's floor 40% away (shares of the gradient's
 *  line), as a mask. The floor (`--holo-floor`, 0 to 1, none by default) is how
 *  much of the print stays outside the band: a real card's print is on its whole
 *  face, the light only makes it shine. */
const OFF = "rgb(0 0 0 / var(--holo-floor, 0))"
const BAND = `linear-gradient(115deg, ${OFF} calc(var(--holo-at) * 100% - 40%), black calc(var(--holo-at) * 100% - 8%), black calc(var(--holo-at) * 100% + 8%), ${OFF} calc(var(--holo-at) * 100% + 40%))`

/** The foil under a print, four times its surface's width, slid across with the
 *  light so its hue drifts as the angle changes. */
const FOIL_UNDER: React.CSSProperties = {
  backgroundImage: foilGradient(),
  backgroundSize: "400% 100%",
  backgroundPosition: "calc(var(--holo-at) * 100%) 0",
}

/** How a lean follows the hand: about its rest, ±3° across and ±2° up and down when
 *  `flat` (facing the reader), ±4° and ±3° about a pose turned 14° away when
 *  `turned` (beside a headline). A lean, not a swing: a surface holds links, and
 *  what the hand aims at must stay where it is. In its own perspective, so it needs
 *  nothing of its parent. */
const POSES = {
  flat: "perspective(2000px) rotateY(calc((var(--px, 0.5) - 0.5) * 6deg)) rotateX(calc((var(--py, 0.35) - 0.35) * -4deg))",
  turned:
    "perspective(2000px) rotateY(calc(-14deg + (var(--px, 0.5) - 0.5) * 8deg)) rotateX(calc(6deg - (var(--py, 0.35) - 0.35) * 6deg))",
} as const

export type HoloPose = keyof typeof POSES

/** What leans toward the hand, anywhere inside a `HoloLight` (the front card of a
 *  stack, while the ones behind do something else). Quick under the hand, slow home;
 *  still under reduced motion. Its transform is `--holo-lean`, so a breakpoint can
 *  stand it straight (`max-lg:[transform:none]`). */
export function HoloLean({
  pose = "flat",
  children,
  className,
}: {
  pose?: HoloPose
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="holo-lean"
      className={cn(
        "[transform:var(--holo-lean)] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[hover]/holo:duration-240 motion-reduce:[transform:none]",
        className,
      )}
      style={{ "--holo-lean": POSES[pose] } as React.CSSProperties}
    >
      {children}
    </div>
  )
}

/** The hand's light over what it holds: the pointer's place as `--px`, `--py` (0 to
 *  1) and `--hx` (px across), and `data-hover` while it is there, once a frame. On
 *  leaving the light goes back to rest. Everything inside reads it: a `Holo`, a
 *  `FoilEdge`, a `HoloLean`, and your own styles (`group-data-[hover]/holo:`). */
export function HoloLight({
  children,
  rest = REST,
  lit,
  as: Element = "div",
  className,
}: {
  children: React.ReactNode
  /** Where the light rests with no hand on it. */
  rest?: { x: number; y: number }
  /** Lit as if a hand were on it when none is (a still, a comparison). */
  lit?: boolean
  /** `span` inside a line of text. */
  as?: "div" | "span"
  className?: string
}) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) throw new Error("HoloLight: no element to measure")
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let frame = 0
    let at = rest
    const write = () => {
      frame = 0
      el.style.setProperty("--px", at.x.toFixed(3))
      el.style.setProperty("--py", at.y.toFixed(3))
      el.style.setProperty("--hx", `${(at.x * el.offsetWidth).toFixed(1)}px`)
    }
    const soon = () => {
      if (!frame) frame = requestAnimationFrame(write)
    }
    const move = (e: PointerEvent) => {
      const box = el.getBoundingClientRect()
      const clamp = (n: number) => Math.min(1, Math.max(0, n))
      at = {
        x: clamp((e.clientX - box.left) / box.width),
        y: clamp((e.clientY - box.top) / box.height),
      }
      el.setAttribute("data-hover", "")
      soon()
    }
    const leave = () => {
      at = rest
      if (!lit) el.removeAttribute("data-hover")
      soon()
    }
    el.addEventListener("pointermove", move)
    el.addEventListener("pointerleave", leave)
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener("pointermove", move)
      el.removeEventListener("pointerleave", leave)
    }
  }, [rest, lit])
  return (
    <Element
      ref={ref as React.Ref<HTMLDivElement & HTMLSpanElement>}
      data-slot="holo-light"
      data-hover={lit ? "" : undefined}
      className={cn("group/holo", className)}
      style={
        {
          "--px": rest.x,
          "--py": rest.y,
        } as React.CSSProperties
      }
    >
      {children}
    </Element>
  )
}

export type HoloPrint = "laminate" | "web" | "none"

/** The print laid over a surface: the laminate (guilloché ribbons and the emblem
 *  repeated), the web (people linked, laid whole), or none (the seal alone). */
function printStyle(
  print: HoloPrint,
  emblem: Emblem,
): React.CSSProperties | null {
  if (print === "laminate")
    return {
      maskImage: `${printUrl(guilloche())}, ${printUrl(emblems(emblem))}`,
      maskSize: "160px 40px, 72px 72px",
    }
  if (print === "web")
    return {
      maskImage: printUrl(web(emblem)),
      maskSize: "100% 100%",
      maskRepeat: "no-repeat",
    }
  return null
}

/** THE HOLOGRAM over the positioned, rounded surface it is placed in (absolute,
 *  inset 0, its corners): its print and, if placed, its seal, in the foil, shown in
 *  the band of light at the hand (inside a `HoloLight`). Draw it first in the
 *  surface, so what is written there paints over it. */
export function Holo({
  print = "laminate",
  seal,
  emblem = SPARK,
  strength = { rest: 0.06, lit: 0.26 },
  floor,
  className,
}: {
  print?: HoloPrint
  /** Where the seal sits and how big, as classes (`bottom-6 left-1/3 size-14`), or
   *  none. A seal biting a photo's corner is where an ID puts one, so the photo
   *  cannot be swapped. */
  seal?: string
  /** The glyph the prints repeat and the seal holds: your mark. */
  emblem?: Emblem
  /** Its opacity with no hand on it and under the hand. */
  strength?: { rest: number; lit: number }
  /** How much of the print stays outside the band of light, 0 to 1 (none by
   *  default). Also inherited as `--holo-floor`, so a surface can set it for
   *  the holograms on it. */
  floor?: number
  className?: string
}) {
  const art = printStyle(print, emblem)
  return (
    <span
      aria-hidden
      data-slot="holo"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] mix-blend-plus-lighter",
        "opacity-(--holo-rest) group-data-[hover]/holo:opacity-(--holo-lit)",
        className,
      )}
      style={
        {
          "--holo-rest": strength.rest,
          "--holo-lit": strength.lit,
          ...(floor !== undefined && { "--holo-floor": floor }),
          "--holo-at": AT,
          transition: `opacity 500ms cubic-bezier(0.22, 1, 0.36, 1), ${MOVES}`,
          maskImage: BAND,
        } as React.CSSProperties
      }
    >
      {art && (
        <span
          data-slot="holo-print"
          data-print={print}
          className="absolute inset-0"
          style={{ ...FOIL_UNDER, ...art }}
        />
      )}
      {seal && (
        <span
          data-slot="holo-seal"
          className={cn("absolute", seal)}
          style={{
            ...FOIL_UNDER,
            maskImage: printUrl(sealArt(emblem)),
            maskSize: "contain",
            maskRepeat: "no-repeat",
          }}
        />
      )}
    </span>
  )
}

/** A FOIL EDGE: a one-pixel ring of the foil over the rim of the positioned, rounded
 *  box it is placed in, the foil's own security feature. Barely there at rest (6%),
 *  its spectrum laid across the screen (`fixed`), so an edge's colour is where it
 *  stands and shifts as the page scrolls; inside a `HoloLight` under the hand it is
 *  lit in a band where the light falls instead, at half (fuller, it outshone the
 *  card it edges). Composed, not built in: the surface's
 *  own material is untouched. */
export function FoilEdge({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      data-slot="foil-edge"
      className={cn(
        "pointer-events-none absolute inset-0 z-1 rounded-[inherit] p-px mix-blend-plus-lighter",
        "opacity-[0.06] [--edge-floor:1] group-data-[hover]/holo:opacity-50 group-data-[hover]/holo:[--edge-floor:0]",
        className,
      )}
      style={
        {
          background: `${foilGradient()} fixed`,
          // Where the light falls, as the hologram's own (`AT`), eased with it.
          "--holo-at": AT,
          transition: `opacity 300ms ease-out, ${MOVES}`,
          // The band (its floor 1 at rest: the whole ring), intersected with the
          // ring (the border box less the content box, one pixel in).
          maskImage:
            "linear-gradient(100deg, rgb(0 0 0 / var(--edge-floor)) calc(var(--holo-at) * 100% - 40%), black calc(var(--holo-at) * 100%), rgb(0 0 0 / var(--edge-floor)) calc(var(--holo-at) * 100% + 40%)), linear-gradient(#000 0 0), linear-gradient(#000 0 0)",
          maskClip: "border-box, content-box, border-box",
          maskComposite: "intersect, exclude, add",
        } as React.CSSProperties
      }
    />
  )
}
