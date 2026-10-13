"use client"

import * as React from "react"

// WHETHER THE PAGE SHOWS SOMETHING NOW: the tab is visible (the Page Visibility API)
// and, given an element, the element is inside the viewport (an IntersectionObserver).
// Work done only to be seen asks it before working: a label's clock (relative-time),
// a poll that asks the server again (use-poll).
//
//   useOnScreen()          the tab is visible
//   useOnScreen(element)   the tab is visible and the element is in the viewport
//
// The element is a value, held in state by a callback ref (`ref={setElement}`), never
// a ref object read inside an effect: a node that mounts late or is replaced is
// watched from the render that has it. `null` is an element not mounted yet, so not
// on screen; `undefined` is no element asked about.
//
// One IntersectionObserver for every element on the page and one listener on the
// document, however many labels a table holds. False on the server and until the
// first observation (a frame after mount), so work that must happen once whatever is
// shown (a label's first text) does not wait for it.

type Watch = { seen: boolean | null; calls: Set<(seen: boolean) => void> }

const watched = new Map<Element, Watch>()
let observer: IntersectionObserver | null = null

function watch(element: Element, call: (seen: boolean) => void): () => void {
  observer ??= new IntersectionObserver((entries) => {
    for (const entry of entries) {
      // An entry queued before its element was let go arrives after it.
      const w = watched.get(entry.target)
      if (!w) continue
      w.seen = entry.isIntersecting
      for (const c of w.calls) c(entry.isIntersecting)
    }
  })
  let w = watched.get(element)
  if (!w) {
    w = { seen: null, calls: new Set() }
    watched.set(element, w)
    observer.observe(element)
  }
  w.calls.add(call)
  // A second watcher of an element already observed gets no first callback of its
  // own: it is told what the first one was.
  if (w.seen !== null) call(w.seen)
  const mine = w
  return () => {
    mine.calls.delete(call)
    if (mine.calls.size > 0) return
    watched.delete(element)
    observer?.unobserve(element)
  }
}

function subscribeVisibility(change: () => void): () => void {
  document.addEventListener("visibilitychange", change)
  return () => document.removeEventListener("visibilitychange", change)
}
const tabVisible = () => document.visibilityState === "visible"
const onServer = () => false

/** Whether the tab is visible and, given an element, the element is in the viewport. */
export function useOnScreen(element?: Element | null): boolean {
  const visible = React.useSyncExternalStore(
    subscribeVisibility,
    tabVisible,
    onServer,
  )
  const [seen, setSeen] = React.useState(false)
  React.useEffect(() => {
    if (!element) {
      setSeen(false)
      return
    }
    return watch(element, setSeen)
  }, [element])
  return visible && (element === undefined || seen)
}
