"use client"

// WHO A KEY BELONGS TO, page-wide. Every item that answers keys on the page (a player's
// Space and arrows, a gallery's quick look, a list's letters, a lightbox) registers
// here instead of listening on the document itself, and ONE listener hands each press
// to one of them:
//
//   1. Nothing at all when the press belongs to what it landed in (`ownsKeys`, lib/keys):
//      already taken, typed into a field, or a key a widget answers itself (Space on a
//      switch, an arrow in tabs). A shortcut never also does what the focused control
//      just did.
//   2. A modal (an open lightbox) takes every press; nothing behind it hears one.
//   3. Else the instances in order: the one holding focus (the deepest first), the
//      one under the pointer, the one last pressed or focused in, then the rest, newest
//      first. Each says whether the press was its (`onKey` returns true) and the first
//      that takes it ends the press: a gallery and a player on one page never both
//      answer Space.
//   4. Never an instance or a layer whose root is inside an `inert` subtree: inert is
//      the platform saying nothing in there takes interaction (a picture of a control,
//      a page under a modal of its own), and a key is interaction.
//   5. An instance inside `[data-keys="held"]` only while the hand holds it: focus is
//      in it, or it was the last thing pressed or focused in. Never for the pointer
//      resting over it, never page-wide. For a page of live examples (a gallery of
//      cards, each a real player or list): every example works under the hand, and
//      the page's own keys stay the page's.
//
// THE ESCAPE LADDER is the same listener: the layers open now (a window-filling
// player, a full view, a sheet of keys) in the order they opened, and Esc closes the
// innermost one only, and only when nothing inside it took the Esc first (a menu open
// over the full view closes itself, not the view). Base UI's own popups and dialogs
// close themselves and are seen here as roles that own Escape.
//
// It installs itself with its first instance and leaves with its last, so a page with no
// keyboard items carries no listener at all.
//
// It listens on the document, after the page's own handlers, so what stops a press on
// its way up never reaches it: Base UI's dialog popups stop the arrows, Home and End.
// An item answering those inside a Base UI dialog (the lightbox) answers on its own
// element, asking `ownedHere` first, and registers here too (as a modal) so nothing
// behind it hears a key.

import * as React from "react"
import {
  type KeyPress,
  type KeyTarget,
  ownsKeys,
} from "@/lib/keys"

/** Input types a person types text into. */
const TEXT_INPUTS = new Set([
  "text",
  "search",
  "email",
  "url",
  "tel",
  "password",
  "number",
  "date",
  "datetime-local",
  "month",
  "time",
  "week",
])

/** An element's role, written or implied by its tag (`<button>` is a button, a range
 *  input a slider). */
function roleOf(el: Element): string | null {
  const written = el.getAttribute("role")?.trim().split(/\s+/)[0]
  if (written) return written
  switch (el.tagName) {
    case "BUTTON":
    case "SUMMARY":
      return "button"
    case "A":
      return el.hasAttribute("href") ? "link" : null
    case "SELECT":
      return "listbox"
    case "INPUT": {
      const type = (el as HTMLInputElement).type
      if (type === "checkbox") return "checkbox"
      if (type === "radio") return "radio"
      if (type === "range") return "slider"
      if (
        ["button", "submit", "reset", "image", "color", "file"].includes(type)
      )
        return "button"
      return null
    }
    default:
      return null
  }
}

function editable(el: Element): boolean {
  if (el instanceof HTMLTextAreaElement) return !el.readOnly
  if (el instanceof HTMLInputElement)
    return TEXT_INPUTS.has(el.type) && !el.readOnly
  return el instanceof HTMLElement && el.isContentEditable
}

/** What a key landed in, as `ownsKeys` reads it: whether it takes typing, and the roles
 *  from it up to `root` (not included), nearest first. `own` are the roles of the
 *  listener's own parts, left out: a gallery moving focus over its options, a timeline
 *  over its ruler, answers those keys itself. */
export function keyTargetOf(
  target: EventTarget | null,
  root: Element | null = null,
  own: readonly string[] = [],
): KeyTarget {
  const start = target instanceof Element ? target : null
  const roles: string[] = []
  let typing = false
  for (let el = start; el && el !== root; el = el.parentElement) {
    if (el === document.body || el === document.documentElement) break
    if (el === start && editable(el)) typing = true
    const role = roleOf(el)
    if (role && !own.includes(role)) roles.push(role)
  }
  return { editable: typing, roles }
}

/** Whether `event` belongs to what it landed in (lib/keys' `ownsKeys`), read from the
 *  page, with roles counted up to `root` (an item's own element, whose own role does
 *  not count against it) and the listener's `own` roles left out. Every keyboard
 *  handler in the registry asks this before it answers a key. */
export function ownedHere(
  event: KeyboardEvent,
  root: Element | null = null,
  own: readonly string[] = [],
): boolean {
  return ownsKeys(event as KeyPress, keyTargetOf(event.target, root, own))
}

/** Whether something typed lands in a field (a text field, a textarea, an editable
 *  element): what a clipboard handler or a grid's own keys leave alone. */
export const typingIn = (target: EventTarget | null): boolean =>
  keyTargetOf(target, target instanceof Element ? target.parentElement : null)
    .editable

/** Where an instance lives: its element, read when a key comes (it may mount later). */
type RootOf = () => Element | null

interface Instance {
  root: RootOf
  /** Answer the press: true when it was this instance's (the router then takes it from
   *  the page: `preventDefault`). */
  onKey: (event: KeyboardEvent) => boolean
  modal: boolean
  /** The roles of its own focusable parts (a gallery's options), which do not count
   *  as a control owning the press. */
  own: readonly string[]
  /** Mount order: newer instances come first among equals. */
  born: number
}

interface Layer {
  root: RootOf
  onEscape: () => void
  /** When it opened: the latest open is the innermost. */
  opened: number
}

const instances = new Set<Instance>()
const layers = new Set<Layer>()
let born = 0
let installed = false
/** The element under the pointer, and the one last pressed or focused into. */
let under: Element | null = null
let touched: Element | null = null

const holds = (root: Element | null, el: Element | null) =>
  !!root && !!el && root.contains(el)

/** Inside an `inert` subtree: what the platform says takes no interaction (a picture
 *  of a control, a page under a modal of its own), so no press is offered to it and
 *  none of its layers closes on Esc. */
const asleep = (root: Element | null) => !!root?.closest("[inert]")

/** Inside a region whose instances take a press only while held (rule 5). */
const heldOnly = (root: Element | null) => !!root?.closest('[data-keys="held"]')

/** The instances a press is offered to, in order (see the header). */
function ranked(): Instance[] {
  const focus = document.activeElement
  const awake = [...instances].filter((i) => {
    const r = i.root()
    if (asleep(r)) return false
    return !heldOnly(r) || holds(r, focus) || holds(r, touched)
  })
  const modal = awake.filter((i) => i.modal)
  const pool = modal.length
    ? awake.filter((i) =>
        modal.some((m) => m === i || holds(m.root(), i.root())),
      )
    : awake
  const rank = (i: Instance) => {
    const r = i.root()
    if (holds(r, focus)) return 0
    if (holds(r, under)) return 1
    if (holds(r, touched)) return 2
    return 3
  }
  return pool.sort((a, b) => {
    const d = rank(a) - rank(b)
    if (d !== 0) return d
    // Nested roots holding the same focus: the inner one first.
    const ra = a.root()
    const rb = b.root()
    if (ra && rb && ra !== rb) {
      if (ra.contains(rb)) return 1
      if (rb.contains(ra)) return -1
    }
    return b.born - a.born
  })
}

/** Offers a press to `list` in order; true once one took it. */
function offer(event: KeyboardEvent, list: Instance[]): boolean {
  for (const i of list) {
    if (ownedHere(event, i.root(), i.own)) continue
    if (i.onKey(event)) {
      event.preventDefault()
      return true
    }
  }
  return false
}

function onKeyDown(event: KeyboardEvent) {
  if (event.isComposing) return
  const order = ranked()
  const open = [...layers].filter((l) => !asleep(l.root()))
  // Esc: a modal first (it is above every layer), then the innermost layer, and only
  // then an instance that answers it itself.
  if (event.key === "Escape" && open.length > 0) {
    if (event.defaultPrevented) return
    if (
      offer(
        event,
        order.filter((i) => i.modal),
      )
    )
      return
    const top = open.sort((a, b) => b.opened - a.opened)[0] as Layer
    if (ownedHere(event, top.root())) return
    event.preventDefault()
    top.onEscape()
    return
  }
  offer(event, order)
}
const onPointerOver = (event: PointerEvent) => {
  under = event.target instanceof Element ? event.target : null
}
const onTouch = (event: Event) => {
  if (event.target instanceof Element) touched = event.target
}
const onPointerLeavePage = () => {
  under = null
}

function install() {
  if (installed || typeof document === "undefined") return
  installed = true
  document.addEventListener("keydown", onKeyDown)
  document.addEventListener("pointerover", onPointerOver, { passive: true })
  document.addEventListener("pointerdown", onTouch, { passive: true })
  document.addEventListener("focusin", onTouch)
  document.documentElement.addEventListener("pointerleave", onPointerLeavePage)
}
function uninstall() {
  if (!installed || instances.size > 0 || layers.size > 0) return
  installed = false
  document.removeEventListener("keydown", onKeyDown)
  document.removeEventListener("pointerover", onPointerOver)
  document.removeEventListener("pointerdown", onTouch)
  document.removeEventListener("focusin", onTouch)
  document.documentElement.removeEventListener(
    "pointerleave",
    onPointerLeavePage,
  )
  under = null
  touched = null
}

/** Puts an instance on the router from an effect (a binder that sets up its own
 *  listeners); returns the way off. `useKeys` is the hook form. */
export function registerKeys(instance: {
  root: RootOf
  onKey: (event: KeyboardEvent) => boolean
  modal?: boolean
  own?: readonly string[]
}): () => void {
  const i: Instance = { modal: false, own: [], ...instance, born: ++born }
  instances.add(i)
  install()
  return () => {
    instances.delete(i)
    uninstall()
  }
}

/** Opens a layer Escape closes (the innermost open one first); returns the way off,
 *  which the layer calls when it closes by any other means. `useEscape` is the hook. */
export function openLayer(layer: {
  root: RootOf
  onEscape: () => void
}): () => void {
  const l: Layer = { ...layer, opened: ++born }
  layers.add(l)
  install()
  return () => {
    layers.delete(l)
    uninstall()
  }
}

const rootOf = (
  root: React.RefObject<Element | null> | RootOf | undefined,
): RootOf =>
  typeof root === "function" ? root : () => (root ? root.current : null)

/** An item's keys, on the router: `onKey` answers a press and returns true when it was
 *  the item's (the press is then taken from the page). `root` is the item's element:
 *  focus, the pointer or a last press inside it puts it first; without one it answers
 *  only what nothing nearer takes. Read at press time, so it always sees the latest
 *  props. */
export function useKeys(
  onKey: (event: KeyboardEvent) => boolean,
  {
    root,
    enabled = true,
    modal = false,
    own,
  }: {
    root?: React.RefObject<Element | null> | RootOf
    /** Off, it is not on the router at all (a hidden or inert instance). */
    enabled?: boolean
    /** Takes every press while mounted; nothing outside its root hears one. */
    modal?: boolean
    /** The roles of its own focusable parts (a gallery's "option"), which it answers
     *  for itself. */
    own?: readonly string[]
  } = {},
): void {
  const answer = React.useEffectEvent(onKey)
  const where = React.useRef(root)
  where.current = root
  const ownKey = own?.join(" ") ?? ""
  React.useEffect(() => {
    if (!enabled) return
    return registerKeys({
      root: () => rootOf(where.current)(),
      onKey: (event) => answer(event),
      modal,
      own: ownKey ? ownKey.split(" ") : [],
    })
  }, [enabled, modal, ownKey])
}

/** A layer Escape closes while `active`: the innermost open layer, and only when
 *  nothing inside it took the Esc first. */
export function useEscape(
  onEscape: () => void,
  {
    active,
    root,
  }: { active: boolean; root?: React.RefObject<Element | null> | RootOf },
): void {
  const close = React.useEffectEvent(onEscape)
  const where = React.useRef(root)
  where.current = root
  React.useEffect(() => {
    if (!active) return
    return openLayer({
      root: () => rootOf(where.current)(),
      onEscape: () => close(),
    })
  }, [active])
}
