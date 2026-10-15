"use client"

// An input drawn as what the hands do: keys, a pointer action, or both. `<Shortcut
// input="mod+click" />` draws ⌘ and a mouse with its left button lit; "shift+drag",
// "alt+scroll", "secondary-click", "mod+shift+k" read the same way, the pointer
// action last. Keys are kbd's own caps; `mod` is ⌘ on a Mac and Ctrl elsewhere, and
// off a Mac every modifier reads as a word (Ctrl, Shift), the way those systems print
// a shortcut. The platform is read once on the client (lib/keys decides it); the
// server draws the Mac's and the client corrects it after hydration.
//
// A POINTER ACTION IS NOT A KEY, SO IT IS NOT A CAP: it is drawn bare, at the caps'
// height and centre, after a quiet "+". A cap says "press this key"; a mouse in a cap
// would read as a key labelled with a mouse. Between keys there is no joiner, kbd's
// convention; the "+" marks only the change of hand, keyboard to pointer.
//
// The glyphs are one family on lucide's grid (24, stroke 2): a mouse whose lit button
// is the click (left, right, the wheel), with a mark beside it for what is not a
// single press (two ripples, a wheel's arrows, a clock). lucide's own mouse-left and
// mouse-right mark a button with a dot, and it has no double, middle, scroll or
// long-press mouse, so those are drawn here. Drag is lucide's closed hand, the cursor
// macOS shows while dragging; hover is its resting arrow.
//
// A screen reader hears words ("Command click"), never glyphs: the drawing is
// aria-hidden and the words ride beside it.

import { HandGrab, MousePointer2 } from "lucide-react"
import { useSyncExternalStore } from "react"
import { KbdCap } from "@/components/ui/kbd"
import { type Material, useMaterial } from "@/components/ui/material"
import {
  combo,
  keyName,
  modifiers,
  type Platform,
  platformOf,
} from "@/lib/keys"
import { cn } from "@/lib/utils"

/** What a pointer can do, as people write it. */
export const POINTERS = [
  "click",
  "double-click",
  "secondary-click",
  "middle-click",
  "drag",
  "scroll",
  "hover",
  "long-press",
] as const
export type Pointer = (typeof POINTERS)[number]

/** Other names for the same action. */
const ALIASES: Record<string, Pointer> = {
  "right-click": "secondary-click",
  "context-click": "secondary-click",
  dblclick: "double-click",
  wheel: "scroll",
  hold: "long-press",
}

/** The action as a person says it. */
const SPOKEN: Record<Pointer, string> = {
  click: "click",
  "double-click": "double click",
  "secondary-click": "right click",
  "middle-click": "middle click",
  drag: "drag",
  scroll: "scroll",
  hover: "hover",
  "long-press": "long press",
}

/** An input: the keys held (as lib/keys caps, macOS order) and what the pointer
 *  does, either of which may be absent but not both. */
export interface ShortcutParts {
  keys: string[]
  pointer: Pointer | null
}

function pointerOf(token: string): Pointer | null {
  const t = token.trim().toLowerCase()
  return (POINTERS as readonly string[]).includes(t)
    ? (t as Pointer)
    : (ALIASES[t] ?? null)
}

/** "mod+click", "shift+drag", "secondary-click", "mod+shift+k" to its parts, or
 *  null when it is not an input. A pointer action comes last; what is before it
 *  must be modifiers. Framework-free, like lib/keys. */
export function shortcut(
  text: string,
  platform: Platform = "mac",
): ShortcutParts | null {
  const parts = text.trim().split("+")
  const pointer = pointerOf(parts.at(-1) ?? "")
  if (pointer) {
    const held = parts.slice(0, -1)
    if (held.length === 0) return { keys: [], pointer }
    const caps = modifiers(held, platform)
    return caps ? { keys: caps, pointer } : null
  }
  const caps = combo(text, platform)
  return caps ? { keys: caps, pointer: null } : null
}

/** The input in words, for a screen reader and a hover title: "Command click",
 *  "Control Shift K", "Right click"; off a Mac ⌥ is "Alt". */
export function spoken(
  parts: ShortcutParts,
  platform: Platform = "mac",
): string {
  const words = [
    ...parts.keys.map((cap) => keyName(cap, platform)),
    ...(parts.pointer ? [SPOKEN[parts.pointer]] : []),
  ].join(" ")
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const noop = () => () => {}
/** The platform this page runs on; the Mac on the server and during hydration. */
export function usePlatform(): Platform {
  return useSyncExternalStore(
    noop,
    () => platformOf(navigator.platform),
    () => "mac",
  )
}

// ── the glyphs. One grid: 24 high, lucide's stroke, the mouse's body at x 4–16 so
// a mark fits to its right. A glyph without a mark crops its view to the body.

const BODY = "M4 8a6 6 0 0 1 12 0v8a6 6 0 0 1-12 0z"
const LEFT = "M10 2a6 6 0 0 0-6 6v3h6z"
const RIGHT = "M10 2a6 6 0 0 1 6 6v3h-6z"
const WHEEL = "M10 5.5v3"

/** Each mouse glyph: what is lit, what is stroked, and the mark beside it if any, on
 *  the side it belongs to: a mark about a button sits by that button (a double
 *  click's ripples come off the left one), a mark about the whole hand sits right. */
const MICE: Record<
  Exclude<Pointer, "drag" | "hover">,
  { fill: string[]; stroke: string[]; mark: "left" | "right" | null }
> = {
  click: { fill: [LEFT], stroke: [], mark: null },
  "secondary-click": { fill: [RIGHT], stroke: [], mark: null },
  "middle-click": {
    fill: ["M8.5 6a1.5 1.5 0 0 1 3 0v2.5a1.5 1.5 0 0 1-3 0z"],
    stroke: [],
    mark: null,
  },
  "double-click": {
    fill: [LEFT],
    // two ripples off the left button: the press, again
    stroke: ["M1.5 5.5a4.5 4.5 0 0 0 0 6", "M-1.5 3.5a7.5 7.5 0 0 0 0 10"],
    mark: "left",
  },
  scroll: {
    fill: [],
    // the wheel, and the way it turns
    stroke: [
      WHEEL,
      "M20.5 5v14",
      "m18 7.5 2.5-2.5 2.5 2.5",
      "m18 16.5 2.5 2.5 2.5-2.5",
    ],
    mark: "right",
  },
  "long-press": {
    fill: [LEFT],
    // a clock: held
    stroke: ["M20.5 15.5a3 3 0 1 1 0 6a3 3 0 0 1 0-6", "M20.5 17v1.6l1 .8"],
    mark: "right",
  },
}

/** The glyph for a pointer action, at the height of the text it sits in. */
export function PointerGlyph({
  pointer,
  className,
}: {
  pointer: Pointer
  className?: string
}) {
  // Decorative: the words for it are `spoken`, said beside it.
  const size = cn("h-[1.15em] w-auto shrink-0", className)
  if (pointer === "drag")
    return (
      <HandGrab aria-hidden data-slot="shortcut-pointer" className={size} />
    )
  if (pointer === "hover")
    return (
      <MousePointer2
        aria-hidden
        data-slot="shortcut-pointer"
        className={size}
      />
    )
  const m = MICE[pointer]
  return (
    <svg
      aria-hidden
      data-slot="shortcut-pointer"
      viewBox={
        m.mark === "right"
          ? "2 0 22.5 24"
          : m.mark === "left"
            ? "-4.5 0 22.5 24"
            : "2 0 16 24"
      }
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={size}
    >
      {m.fill.map((d) => (
        <path key={d} d={d} fill="currentColor" stroke="none" />
      ))}
      <path d={BODY} />
      {m.fill.includes(LEFT) || m.fill.includes(RIGHT) ? (
        <path d="M10 2v9M4 11h12" strokeWidth={1.5} />
      ) : null}
      {m.stroke.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}

const SIZES = {
  default: "",
  sm: "text-[11px]",
} as const

export interface ShortcutProps {
  /** The whole input as text: "mod+click", "shift+drag", "secondary-click",
   *  "mod+shift+k". */
  input?: string
  /** Or in parts: the keys held, as lib/keys reads them ("mod", "shift", "k"). */
  keys?: string[]
  /** …and what the pointer does. */
  pointer?: Pointer
  /** Draw for this platform instead of the one the page runs on (a docs page
   *  showing both). */
  platform?: Platform
  /** `sm` for a menu row or a tooltip; the default follows the text it sits in. */
  size?: keyof typeof SIZES
  /** Its keys' material: plain keys, or keys of glass (on glass, the joiner and the
   *  pointer take the text's own colour). */
  material?: Material
  className?: string
}

export function Shortcut({
  input,
  keys,
  pointer,
  platform,
  size = "default",
  material,
  className,
}: ShortcutProps) {
  const own = usePlatform()
  const p = platform ?? own
  const m = useMaterial(material)
  const ink = m === "glass" ? "text-current" : "text-foreground"
  const text =
    input ?? [...(keys ?? []), ...(pointer ? [pointer] : [])].join("+")
  const parts = shortcut(text, p)
  if (!parts) throw new Error(`Shortcut: "${text}" is not an input`)
  const words = spoken(parts, p)
  return (
    <kbd
      data-slot="shortcut"
      data-material={m}
      title={words}
      className={cn(
        "not-prose inline-flex items-center align-[-0.12em] font-[inherit] not-italic",
        SIZES[size],
        className,
      )}
    >
      <span aria-hidden className="inline-flex items-center gap-[0.3em]">
        {parts.keys.length > 0 && (
          <span className="inline-flex gap-[0.25em]">
            {parts.keys.map((cap, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: caps repeat, position is identity
              <KbdCap key={i} cap={cap} platform={p} material={m} />
            ))}
          </span>
        )}
        {parts.keys.length > 0 && parts.pointer && (
          <span
            data-slot="shortcut-joiner"
            className={cn("text-[0.8em] opacity-40", ink)}
          >
            +
          </span>
        )}
        {parts.pointer && (
          <PointerGlyph
            pointer={parts.pointer}
            className={cn("opacity-75", ink)}
          />
        )}
      </span>
      <span className="sr-only">{words}</span>
    </kbd>
  )
}
