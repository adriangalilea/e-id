"use client"

import { useSyncExternalStore } from "react"
import { BLANK, type Draft } from "@/lib/card-draft"

// The visitor's card (lib/card-draft) as the browser keeps it: in localStorage,
// so it is still theirs after a reload and after signing in, every reader
// redrawn on a write, here or in another tab.

/** Versioned: a card stored in an earlier shape is never read as this one. */
const KEY = "eid:card"

// One parsed draft per stored string, so the snapshot is stable between writes.
let cache: { raw: string | null; draft: Draft } = { raw: null, draft: BLANK }

/** The draft as it is now, outside a render too (an answer arriving). */
export function readDraft(): Draft {
  const raw = localStorage.getItem(KEY)
  if (raw !== cache.raw)
    cache = { raw, draft: raw ? { ...BLANK, ...JSON.parse(raw) } : BLANK }
  return cache.draft
}

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Another tab writing the same draft.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listener()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

/** The draft, blank on the server and until the browser's is read. */
export function useDraft(): Draft {
  return useSyncExternalStore(subscribe, readDraft, () => BLANK)
}

export function writeDraft(patch: Partial<Draft>) {
  localStorage.setItem(KEY, JSON.stringify({ ...readDraft(), ...patch }))
  for (const listener of listeners) listener()
}

/** The card handed over, or started over: blank again. */
export function clearDraft() {
  localStorage.removeItem(KEY)
  for (const listener of listeners) listener()
}
