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
// The mark lives on `<html>`, never on the focused element, which React owns: a mark
// written onto an element of a Suspense boundary not hydrated yet was read by React
// as an attribute the server never rendered (a hydration mismatch). And it listens
// from the first moment of the page: `listen` is self-contained and runs inline while
// the page is parsed, so a press before the page hydrates is known too (a press then,
// a key after, rang the pressed button); an effect runs it where the component mounts
// on the client alone. It listens once per document, for as long as the document
// lives, whatever mounts it.

import * as React from "react"

/** The document's listeners, once. Self-contained: serialized into the page. */
function listen() {
  const root = document.documentElement
  const own = root as HTMLElement & { agFocusSource?: true }
  if (own.agFocusSource) return
  own.agFocusSource = true
  // Keys that move focus: after one of them, focus is the keyboard's.
  const navigation = [
    "Tab",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Home",
    "End",
    "PageUp",
    "PageDown",
  ]
  let pointer = false
  const mark = (on: boolean) => root.toggleAttribute("data-focus-pointer", on)
  document.addEventListener(
    "pointerdown",
    (e) => {
      pointer = true
      // A press on what already holds focus (reached by Tab, then clicked) moves no
      // focus, so no focusin marks it: mark it here.
      const held = document.activeElement
      if (held && e.target instanceof Node && held.contains(e.target))
        mark(true)
    },
    true,
  )
  document.addEventListener(
    "keydown",
    (e) => {
      if (navigation.includes(e.key)) pointer = false
    },
    true,
  )
  document.addEventListener("focusin", () => mark(pointer), true)
}

const SCRIPT = `(${listen})()`

export function FocusSource() {
  React.useEffect(listen, [])
  // biome-ignore lint/security/noDangerouslySetInnerHtml: the module's own function, serialized, so it runs while the page is parsed
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
}
