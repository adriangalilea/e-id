import { EMOJI_DOMAIN, MAIN_DOMAIN, SHORT_DOMAIN } from "@/lib/const"

// WHICH OF E-ID'S DOMAINS TO HAND OUT. Every address opens the same page on all
// three (next.config sends Safari to 👤.to and every other browser to e-id.to), so
// the choice is only where the address is going: the emoji where it is shown as
// written, the short one to say or type, the plain one where an emoji is refused.
// A copy is always the whole address, `https://` and all: without it, the emoji
// domain is a link nowhere checked (CHECKED), and with it, everywhere.
// One choice for every place that copies an address (components/addresses).

export const FORMS = [
  {
    id: "emoji",
    host: EMOJI_DOMAIN,
    for: "where it is shown as written: X and GitHub show 👤.to",
  },
  {
    id: "short",
    host: SHORT_DOMAIN,
    for: "the shortest, to say, type or print, and for a terminal",
  },
  {
    id: "main",
    host: MAIN_DOMAIN,
    for: "where an emoji is refused or garbled",
  },
] as const

export type Form = (typeof FORMS)[number]
export type FormId = Form["id"]

export const FORM_IDS = FORMS.map((f) => f.id)

export function formOf(id: FormId): Form {
  const form = FORMS.find((f) => f.id === id)
  if (!form) throw new Error(`no address form "${id}"`)
  return form
}

/** An address on a form, as copied: `path` is "/you" or "/you/cv". */
export function urlOf(id: FormId, path: string): string {
  if (!path.startsWith("/")) throw new Error(`a path starts with /: "${path}"`)
  return `https://${formOf(id).host}${path}`
}

/** What turns an address into a link, written as each form: with its scheme, and
 *  bare (as a person types it). */
export type Linked = { scheme: boolean; bare: boolean }

/** Where an address was checked, how, and what it does there. Facts measured, not
 *  remembered: each says how it was checked, so it can be checked again. */
export const CHECKED: {
  place: string
  how: string
  linked: Record<FormId, Linked>
  /** What the place shows of a linked address. */
  shows: string
}[] = [
  {
    place: "X",
    how: "twitter-text 3.1.0, the library X finds links with (extractUrls)",
    linked: {
      emoji: { scheme: true, bare: false },
      short: { scheme: true, bare: true },
      main: { scheme: true, bare: true },
    },
    shows: "the address without https://, the emoji as it is: 👤.to/you",
  },
  {
    place: "GitHub",
    how: "GitHub's markdown API, GFM (gh api markdown)",
    linked: {
      emoji: { scheme: true, bare: false },
      short: { scheme: true, bare: false },
      main: { scheme: true, bare: false },
    },
    shows: "the address as written, https:// and the emoji",
  },
  {
    place: "markdown-it",
    how: "linkify-it 6.1.0, markdown-it's links (Discourse, many docs sites)",
    linked: {
      emoji: { scheme: true, bare: false },
      short: { scheme: true, bare: false },
      main: { scheme: true, bare: false },
    },
    shows: "the address as written",
  },
]

/** Places not checked yet: each needs a phone or an account, by hand, then CHECKED. */
export const UNCHECKED = [
  "Telegram",
  "iMessage",
  "WhatsApp",
  "LinkedIn",
  "Instagram's bio",
] as const
