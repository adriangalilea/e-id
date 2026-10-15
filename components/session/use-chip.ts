"use client"

import { useSyncExternalStore } from "react"
import {
  CHIP_COOKIE,
  CHIP_COOKIE_OPTIONS,
  type Chip,
  chipValue,
  parseChip,
  sameChip,
} from "@/lib/chip"

// The browser's side of the display cookie (lib/chip). Every island that draws
// from it reads it through useChip, so a rewrite here redraws all of them.

const listeners = new Set<() => void>()
let lastRaw: string | null = null
let lastChip: Chip | null = null

function snapshot(): Chip | null {
  const raw = document.cookie
  if (raw !== lastRaw) {
    lastRaw = raw
    lastChip = parseChip(raw)
  }
  return lastChip
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The signed-in user as this browser remembers them: null when signed out,
 *  undefined while the page is not yet the browser's (prerender, hydration), so a
 *  static page and its first client render agree. */
export function useChip(): Chip | null | undefined {
  return useSyncExternalStore(subscribe, snapshot, () => undefined)
}

/** Corrects the cookie from a server answer (the real session), when it differs. */
export function writeChip(chip: Chip | null) {
  if (sameChip(chip, snapshot())) return
  const attributes = [
    `Path=${CHIP_COOKIE_OPTIONS.path}`,
    `SameSite=${CHIP_COOKIE_OPTIONS.sameSite}`,
    `Max-Age=${chip ? CHIP_COOKIE_OPTIONS.maxAge : 0}`,
    CHIP_COOKIE_OPTIONS.secure ? "Secure" : "",
  ].filter(Boolean)
  const value = chip ? encodeURIComponent(chipValue(chip)) : ""
  // biome-ignore lint/suspicious/noDocumentCookie: written synchronously, as the listeners below read it at once; the Cookie Store API is async
  document.cookie = `${CHIP_COOKIE}=${value}; ${attributes.join("; ")}`
  for (const listener of listeners) listener()
}
