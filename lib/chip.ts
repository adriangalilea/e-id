import { SESSION_MAX_AGE } from "@/lib/const"

// The display cookie: who this browser is signed in as, for drawing only. The
// session cookie is httpOnly and public pages are static, so neither the page nor
// its scripts can ask who is signed in without a function call; this cookie
// answers for free. It holds the username (null until they pick one) and the
// avatar, never a secret, and is never trusted: every action and every
// signed-in page reads the real session. Written by the server where the session
// changes (auth.ts on sign-in and sign-out, lib/chip-server on a username
// change) and by the browser when a server answer shows it out of date.

export const CHIP_COOKIE = "eid-chip"

export type Chip = { u: string | null; i: string | null }

export const CHIP_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax",
  maxAge: SESSION_MAX_AGE,
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
} as const

/** The cookie's value, before the cookie layer URI-encodes it. */
export function chipValue(chip: Chip): string {
  return JSON.stringify(chip)
}

export function chipOf(user: {
  username?: string | null
  image?: string | null
}): Chip {
  return { u: user.username ?? null, i: user.image ?? null }
}

export function sameChip(a: Chip | null, b: Chip | null) {
  return a?.u === b?.u && a?.i === b?.i
}

/** The chip in a Cookie header's value, or null when there is none. A cookie is
 *  input from the browser: one that does not parse is reported and read as no
 *  chip, so the page draws signed out instead of failing. */
export function parseChip(cookieHeader: string): Chip | null {
  const match = cookieHeader.match(new RegExp(`(?:^|; )${CHIP_COOKIE}=([^;]*)`))
  if (!match) return null
  try {
    const chip = JSON.parse(decodeURIComponent(match[1]))
    if (chip && "u" in chip && "i" in chip) return chip as Chip
  } catch {}
  console.error(`malformed ${CHIP_COOKIE} cookie: ${match[1]}`)
  return null
}
