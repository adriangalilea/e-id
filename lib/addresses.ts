import {
  EMOJI_DOMAIN,
  EMOJI_DOMAIN_PUNYCODE,
  MAIN_DOMAIN,
  SHORT_DOMAIN,
} from "@/lib/const"

// WHICH OF E-ID'S DOMAINS TO HAND OUT. Every address opens the same page on all
// of them (next.config sends Safari to 👤.to and every other browser to e-id.to),
// so the choice is only where the address is going: the emoji where it is shown
// as written, the emoji spelled out (xn--mq8h.to, the same domain as a browser
// sends it) where a field refuses the emoji but shows it back, the short one to
// say or type, the plain one where an emoji is refused for good. A copy is
// always the whole address, `https://` and all: without it, the emoji domain is
// a link nowhere checked (CHECKED), and with it, everywhere it is accepted.
// One choice for every place that copies an address (components/addresses).

export const FORMS = [
  {
    id: "emoji",
    host: EMOJI_DOMAIN,
    for: "in a post or a message: X and GitHub show 👤.to",
  },
  {
    id: "spelled",
    host: EMOJI_DOMAIN_PUNYCODE,
    for: "the emoji spelled out, for a field that refuses it: X's website field takes it and shows 👤.to",
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

/** What a place did with an address on a form: a link, text (no link), refused
 *  (not saved), or not checked. `shows` is what it drew where that differs from
 *  what was typed. */
export type Verdict =
  | { is: "link"; bare: boolean; shows?: string }
  | { is: "text" }
  | { is: "refused"; says: string }
  | { is: "unchecked" }

/** Where an address was checked, how, and what it does there. Facts measured, not
 *  remembered: each says how it was checked, so it can be checked again. Addresses
 *  are written with "/you". */
export const CHECKED: {
  place: string
  how: string
  verdicts: Record<FormId, Verdict>
}[] = [
  {
    place: "X, your profile's website",
    how: "by hand, 2026-10-16, Edit profile › Website",
    verdicts: {
      emoji: {
        is: "refused",
        says: `Url can't include "invalid characters"`,
      },
      spelled: { is: "link", bare: false, shows: "👤.to/you" },
      short: { is: "unchecked" },
      main: { is: "unchecked" },
    },
  },
  {
    place: "X, a post",
    how: "twitter-text 3.1.0, the library X finds links with (extractUrls)",
    verdicts: {
      emoji: { is: "link", bare: false, shows: "👤.to/you" },
      spelled: { is: "link", bare: true },
      short: { is: "link", bare: true },
      main: { is: "link", bare: true },
    },
  },
  {
    place: "Telegram, a message",
    how: "by hand, 2026-10-16, Telegram for macOS",
    verdicts: {
      emoji: { is: "unchecked" },
      spelled: { is: "unchecked" },
      short: { is: "link", bare: true },
      main: { is: "unchecked" },
    },
  },
  {
    place: "GitHub, markdown",
    how: "GitHub's markdown API, GFM (gh api markdown)",
    verdicts: {
      emoji: { is: "link", bare: false },
      spelled: { is: "link", bare: false },
      short: { is: "link", bare: false },
      main: { is: "link", bare: false },
    },
  },
  {
    place: "markdown-it",
    how: "linkify-it 6.1.0, markdown-it's links (Discourse, many docs sites)",
    verdicts: {
      emoji: { is: "link", bare: false },
      spelled: { is: "link", bare: false },
      short: { is: "link", bare: false },
      main: { is: "link", bare: false },
    },
  },
]

/** Places not checked yet: each needs a phone or an account, by hand, then CHECKED. */
export const UNCHECKED = [
  "X's bio",
  "iMessage",
  "WhatsApp",
  "LinkedIn",
  "Instagram's bio",
  "GitHub's profile website",
] as const
