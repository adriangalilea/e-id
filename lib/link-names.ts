import type { LinkPlatform } from "@/db/schema"
import { getLinkUrl } from "@/lib/links"

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

/** What comes before a username on a platform, as its address is written
 *  ("github.com/", "youtube.com/@"), from the one function that builds the address
 *  (lib/links); nothing for what is written whole (an email, a website, a link). */
export function prefixOf(platform: LinkPlatform): string {
  const address = getLinkUrl(platform, "").replace(/^(https?:\/\/|mailto:)/, "")
  return /[/@]$/.test(address) ? address : ""
}

/** A pasted address read as the username it ends in, where the platform takes a
 *  username ("https://github.com/adrian" on github is "adrian"). */
export function usernameIn(platform: LinkPlatform, typed: string): string {
  const prefix = prefixOf(platform)
  const trimmed = typed.trim()
  if (!prefix) return trimmed
  const bare = trimmed.replace(/^https?:\/\/(www\.)?/, "")
  return bare.startsWith(prefix) ? bare.slice(prefix.length) : trimmed
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
