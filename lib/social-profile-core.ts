export type SocialPlatform = "telegram" | "github" | "youtube"

/** What is behind the handle. Said beside the handle unless it is what the
 *  platform's profiles usually are (`PLATFORMS[p].usual`). */
export type ProfileKind =
  | "person"
  | "organization"
  | "bot"
  | "channel"
  | "group"

/** A count the platform shows, in its own unit: 9 343 606 "subscribers". */
export interface ProfileCount {
  value: number
  /** Plural, lowercase: "followers", "subscribers", "repositories". */
  unit: string
}

export interface ProfileFacts {
  platform: SocialPlatform | (string & {})
  /** The profile's page. */
  url: string
  /** The handle, without the @, as the platform spells it. */
  handle: string
  /** The name they go by; the handle when they set none. */
  name: string
  kind: ProfileKind
  bio?: string
  /** Absolute URL of the photo. Platforms' CDN addresses change: keep facts days. */
  photo?: string
  verified?: boolean
  /** What the platform counts, the one that matters most first (a compact row
   *  shows only it). */
  counts: ProfileCount[]
}

/** What a platform is called and how its profiles are opened. `tone` is the colour
 *  its button wears, where the platform has one people know it by. */
export interface PlatformFacts {
  name: string
  usual: ProfileKind
  tone?: string
  /** The colour of its verified check, where the platform draws it in one. */
  check?: string
  /** The words that open a profile there. */
  open: (kind: ProfileKind) => string
}

export const PLATFORMS: Record<SocialPlatform, PlatformFacts> = {
  telegram: {
    name: "Telegram",
    usual: "person",
    tone: "#2aabee",
    check: "#2aabee",
    open: (kind) => (kind === "person" ? "send a message" : "open in Telegram"),
  },
  github: {
    name: "GitHub",
    usual: "person",
    open: () => "open on GitHub",
  },
  youtube: {
    name: "YouTube",
    usual: "channel",
    tone: "#ff0033",
    open: () => "open on YouTube",
  },
}

/** The platform's facts when this family knows it, else undefined. */
export function platformOf(platform: string): PlatformFacts | undefined {
  return Object.hasOwn(PLATFORMS, platform)
    ? PLATFORMS[platform as SocialPlatform]
    : undefined
}

const COMPACT = new Intl.NumberFormat("en", { notation: "compact" })

/** "9.3M subscribers", "1 follower". */
export function countText({ value, unit }: ProfileCount): string {
  const word = value === 1 ? unit.replace(/s$/, "") : unit
  return `${COMPACT.format(value)} ${word}`
}

/** "21.4M" → 21 400 000, "1.8K" → 1800, "1,234" → 1234: a count a platform shows
 *  rounded, read back as the number it stands for. THROWS on anything else. */
export function compactNumber(text: string): number {
  const m = /^([\d.,]+)\s*([KMB])?$/i.exec(text.trim())
  if (!m?.[1]) throw new Error(`social-profile: "${text}" is no count`)
  const n = Number(m[1].replace(/,/g, ""))
  const scale = { K: 1e3, M: 1e6, B: 1e9 }[
    (m[2] ?? "").toUpperCase() as "K" | "M" | "B"
  ]
  return Math.round(n * (scale ?? 1))
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
  nbsp: " ",
}

/** HTML entities decoded: what a page's markup says as text. */
export function decodeEntities(s: string): string {
  return s.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n =
        code[1] === "x" || code[1] === "X"
          ? Number.parseInt(code.slice(2), 16)
          : Number.parseInt(code.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : m
    }
    return ENTITIES[code.toLowerCase()] ?? m
  })
}
