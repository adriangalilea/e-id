import { CARD_FILES, CARD_SHORT } from "@/lib/const"
import { getLinkUrl } from "@/lib/links"
import type { LinkPlatform } from "@/lib/platforms"

// A LINK BY NAME, after a person's address: 👤.to/adriangalilea/github opens
// their GitHub, and so does /gh. The names a platform goes by in an address, the
// short ones people type, and the name it is written by. One table: the redirect
// (app/[username]/[link]) reads it, the card's data names its routes by it
// (lib/card), and the home shows them.

/** The platforms an address can name, and the names each answers to. A `link`
 *  (anywhere at all) has none: it has no route of its own. */
export const LINK_NAMES: Record<
  Exclude<LinkPlatform, "link">,
  readonly string[]
> = {
  github: ["github", "gh"],
  twitter: ["twitter", "x", "tw"],
  youtube: ["youtube", "yt"],
  instagram: ["instagram", "ig"],
  telegram: ["telegram", "tg"],
  email: ["email", "mail"],
  website: ["website", "web", "site"],
  self: ["self"],
}

/** Each known platform's name as people write it, the name its link goes by
 *  (lib/card-schema, `links[].name`); a `link` is named by its label. */
export const PLATFORM_NAME: Record<Exclude<LinkPlatform, "link">, string> = {
  github: "GitHub",
  twitter: "X",
  youtube: "YouTube",
  instagram: "Instagram",
  telegram: "Telegram",
  email: "Email",
  website: "Website",
  self: "e-ID",
}

/** A link as a card draws it: where it is, what it is called, where it opens. */
export type CardLink = { platform: LinkPlatform; name: string; url: string }

/** The name a link goes by: its owner's label, else its platform's name. A
 *  `link` has no platform name, so it must carry a label. */
export function linkName(platform: LinkPlatform, label: string | null): string {
  if (label) return label
  if (platform === "link") throw new Error("a link with no label has no name")
  return PLATFORM_NAME[platform]
}

/** The platform a name in an address stands for, or null for none. */
export function platformNamed(
  name: string,
): Exclude<LinkPlatform, "link"> | null {
  const wanted = name.toLowerCase()
  for (const [platform, names] of Object.entries(LINK_NAMES))
    if (names.includes(wanted)) return platform as Exclude<LinkPlatform, "link">
  return null
}

/** A link's address name as it is written: lowercase letters and digits, single
 *  hyphens between, at most 40. */
export const LINK_SLUG = /^[a-z0-9](?:-?[a-z0-9]){0,39}$/

/** A made-up address name for a link the owner has not named: six letters and
 *  digits, at least one a digit, so it is never a platform's name or a word. */
export function linkCode(): string {
  const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"
  for (;;) {
    const code = Array.from(
      crypto.getRandomValues(new Uint8Array(6)),
      (b) => ALPHABET[b % ALPHABET.length],
    ).join("")
    if (/\d/.test(code)) return code
  }
}

/** Why `name` cannot be one of a person's own links (`/you/<name>`), or null
 *  where it can. Every card already answers to its platforms' names, from its
 *  links, so those are never a person's to give; the card's own files and their
 *  short names (lib/const) are e-ID's. */
export function refusedLinkName(name: string): string | null {
  const wanted = name.toLowerCase()
  const platform = platformNamed(wanted)
  if (platform)
    return `${wanted} opens your ${PLATFORM_NAME[platform]} link on every card`
  if (
    (CARD_FILES as readonly string[]).includes(wanted) ||
    Object.hasOwn(CARD_SHORT, wanted)
  )
    return `${wanted} is your card's own file`
  return null
}

/** What comes before a username on a platform, as its address is written
 *  ("github.com/", "youtube.com/@"), from the one function that builds the address
 *  (lib/links); nothing for what is written whole (an email, a website, a link). */
export function prefixOf(platform: LinkPlatform): string {
  const address = getLinkUrl(platform, "").replace(/^(https?:\/\/|mailto:)/, "")
  return /[/@]$/.test(address) ? address : ""
}

/** The addresses a platform's profiles were at before its own (`prefixOf`), which
 *  people still paste: X's were Twitter's. */
const FORMER_PREFIXES: Partial<Record<LinkPlatform, readonly string[]>> = {
  twitter: ["twitter.com/"],
}

/** A pasted address read as the username it ends in, where the platform takes a
 *  username ("https://github.com/adrian" on github is "adrian", and
 *  "twitter.com/adrian" on X is too). */
export function usernameIn(platform: LinkPlatform, typed: string): string {
  const prefix = prefixOf(platform)
  const trimmed = typed.trim()
  if (!prefix) return trimmed
  const bare = trimmed.replace(/^https?:\/\/(www\.|mobile\.)?/, "")
  const at = [prefix, ...(FORMER_PREFIXES[platform] ?? [])].find((p) =>
    bare.startsWith(p),
  )
  return at ? bare.slice(at.length) : trimmed
}

/** The username a link holds, where the platform takes one; null for what is
 *  written whole (a website, an email, a link). */
export function handleOf(platform: LinkPlatform, value: string): string | null {
  return prefixOf(platform) ? value : null
}

/** The shortest name a platform goes by in an address, the one routes are
 *  written with (/gh); null for a `link`, which has no route. */
export function shortName(platform: LinkPlatform): string | null {
  if (platform === "link") return null
  return LINK_NAMES[platform].reduce((a, b) => (b.length < a.length ? b : a))
}
