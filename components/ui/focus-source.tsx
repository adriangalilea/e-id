"use client"

// Where focus came from, so the focus ring (tokens) answers the keyboard and nothing
// else. Mount it once, in the root layout.
//
// The browser alone cannot keep that promise: a click gives a button focus (Chrome,
// Firefox), and the next key pressed anywhere (space, a player's J, an arrow on a
// page that listens to keys) is its cue that "a keyboard is in use", so the ring
// lands on whatever was last clicked. This says, on the document element, whether
// the focus the page holds now came from a press (`data-focus-pointer`), and the
// ring (the base rule and the `focus-visible:` variant, both in tokens) skips
// focus held under that mark. Focus that arrives by the keyboard's own navigation
// (Tab, an arrow moving through a group, Home, End, the page keys) clears it, so it
// is always ringed: the keyboard keeps every ring it should have. Without this
// mounted, the ring is the browser's `:focus-visible`, as before.
//
// The mark lives on `<html>`, never on the focused element. The listeners start once
// the root has hydrated, while a Suspense boundary below may not have yet: a press
// in that window focused one of the boundary's elements, a mark written onto it was
// then read by React as an attribute the server never rendered, and hydration
// reported a mismatch. `<html>` is hydrated before any effect runs, and React never
// compares its attributes again.

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
    const root = document.documentElement
    let pointer = false
    const mark = (on: boolean) => root.toggleAttribute(MARK, on)
    const onPointer = (e: PointerEvent) => {
      pointer = true
      // A press on what already holds focus (reached by Tab, then clicked) moves no
      // focus, so no focusin marks it: mark it here.
      const held = document.activeElement
      if (held && e.target instanceof Node && held.contains(e.target))
        mark(true)
    }
    const onKey = (e: KeyboardEvent) => {
      if (NAVIGATION.has(e.key)) pointer = false
    }
    const onFocusIn = () => mark(pointer)
    document.addEventListener("pointerdown", onPointer, true)
    document.addEventListener("keydown", onKey, true)
    document.addEventListener("focusin", onFocusIn, true)
    return () => {
      document.removeEventListener("pointerdown", onPointer, true)
      document.removeEventListener("keydown", onKey, true)
      document.removeEventListener("focusin", onFocusIn, true)
      mark(false)
    }
  }, [])
  return null
}
