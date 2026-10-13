"use client"

// REMEMBERED settings in the page (lib/remembered-core is the rule): one value per setting
// for the whole page, so every place that reads it agrees and follows a change at once;
// other tabs follow too (a setting kept "always" or while idle). A "tab" setting lives
// in the tab's sessionStorage, the rest in localStorage; a page that may not keep
// anything (a private window refusing storage) keeps them for the page alone. On the
// server, and before the page hydrates, every setting is its default.
//
//   const [size, setSize, reset] = useRemembered(SIZE)
//   remember(SIZE, 320)   recall(SIZE)   outside React

import * as React from "react"
import {
  forget,
  PREFIX,
  read,
  type Setting,
  type Shelf,
  touch,
  write,
} from "@/lib/remembered-core"

const memory = new Map<string, string>()
/** Where a page that may not keep anything keeps it: this page, until it goes. */
const pageOnly: Shelf = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => void memory.set(k, v),
  removeItem: (k) => void memory.delete(k),
}

function shelfOf(s: Setting<unknown>): Shelf {
  try {
    const store = s.keep === "tab" ? window.sessionStorage : window.localStorage
    store.getItem(PREFIX)
    return store
  } catch {
    return pageOnly
  }
}

const values = new Map<string, unknown>()
const listeners = new Map<string, Set<() => void>>()
// Read once a page: the first read touches it, so a setting in use is never forgotten.
const touched = new Set<string>()

function tell(key: string) {
  for (const fn of listeners.get(key) ?? []) fn()
}

/** The setting's value now. */
export function recall<T>(s: Setting<T>): T {
  if (!values.has(s.key)) {
    const shelf = shelfOf(s as Setting<unknown>)
    const now = Date.now()
    values.set(s.key, read(s, shelf, now))
    if (!touched.has(s.key)) {
      touch(s, shelf, now)
      touched.add(s.key)
    }
  }
  return values.get(s.key) as T
}

/** Set it, kept as its setting says, and every reader follows. */
export function remember<T>(s: Setting<T>, value: T): void {
  write(s, shelfOf(s as Setting<unknown>), value, Date.now())
  values.set(s.key, value)
  tell(s.key)
}

/** Back to its default, kept nowhere. */
export function reset<T>(s: Setting<T>): void {
  forget(s, shelfOf(s as Setting<unknown>))
  values.set(s.key, s.initial)
  tell(s.key)
}

// Another tab set one: its value read again here.
let watching = false
function watchTabs() {
  if (watching) return
  watching = true
  window.addEventListener("storage", (e) => {
    if (!e.key?.startsWith(PREFIX)) return
    const key = e.key.slice(PREFIX.length)
    if (!values.has(key)) return
    values.delete(key)
    tell(key)
  })
}

function subscribe(key: string, fn: () => void) {
  watchTabs()
  const set = listeners.get(key) ?? new Set()
  set.add(fn)
  listeners.set(key, set)
  return () => {
    set.delete(fn)
  }
}

/** A setting's value, its setter (a value, or one from the value before), and its way
 *  back to the default. */
export function useRemembered<T>(
  s: Setting<T>,
): [T, (next: T | ((was: T) => T)) => void, () => void] {
  const value = React.useSyncExternalStore(
    (fn) => subscribe(s.key, fn),
    () => recall(s),
    () => s.initial,
  )
  const set = React.useCallback(
    (next: T | ((was: T) => T)) =>
      remember(
        s,
        typeof next === "function" ? (next as (was: T) => T)(recall(s)) : next,
      ),
    [s],
  )
  const back = React.useCallback(() => reset(s), [s])
  return [value, set, back]
}
