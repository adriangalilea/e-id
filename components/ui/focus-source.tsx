"use client"

// Where focus came from, so the focus ring (tokens) answers the keyboard and nothing
// else. Mount it once, in the root layout.
//
// The browser alone cannot keep that promise: a click gives a button focus (Chrome,
// Firefox), and the next key pressed anywhere (space, a player's J, an arrow on a
// page that listens to keys) is its cue that "a keyboard is in use", so the ring
// lands on whatever was last clicked. This marks focus that arrived from a press
// with `data-focus-pointer` until it leaves, and the ring (the base rule and the
// `focus-visible:` variant, both in tokens) skips a marked element. Focus that
// arrives by the keyboard's own navigation (Tab, an arrow moving through a group,
// Home, End, the page keys) is never marked, so it is always ringed: the keyboard
// keeps every ring it should have. Without this mounted, the ring is the browser's
// `:focus-visible`, as before.

import * as React from "react"

/** Keys that move focus: after one of them, focus is the keyboard's. */
const NAVIGATION = new Set([
  "Tab",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "PageUp",
  "PageDown",
])

const MARK = "data-focus-pointer"

export function FocusSource() {
  React.useEffect(() => {
    let pointer = false
    const onPointer = (e: PointerEvent) => {
      pointer = true
      // A press on what already holds focus (reached by Tab, then clicked) moves no
      // focus, so no focusin marks it: mark it here.
      const held = document.activeElement
      if (held && e.target instanceof Node && held.contains(e.target))
        held.setAttribute(MARK, "")
    }
    const onKey = (e: KeyboardEvent) => {
      if (NAVIGATION.has(e.key)) pointer = false
    }
    const onFocusIn = (e: FocusEvent) => {
      if (pointer && e.target instanceof Element)
        e.target.setAttribute(MARK, "")
    }
    const onFocusOut = (e: FocusEvent) => {
      if (e.target instanceof Element) e.target.removeAttribute(MARK)
    }
    document.addEventListener("pointerdown", onPointer, true)
    document.addEventListener("keydown", onKey, true)
    document.addEventListener("focusin", onFocusIn, true)
    document.addEventListener("focusout", onFocusOut, true)
    return () => {
      document.removeEventListener("pointerdown", onPointer, true)
      document.removeEventListener("keydown", onKey, true)
      document.removeEventListener("focusin", onFocusIn, true)
      document.removeEventListener("focusout", onFocusOut, true)
    }
  }, [])
  return null
}
