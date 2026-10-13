export type TelegramKind = "user" | "bot" | "channel" | "group"

export interface TelegramProfile {
  /** The handle, without the @, as Telegram spells it. */
  handle: string
  /** https://t.me/<handle> */
  url: string
  kind: TelegramKind
  name: string
  bio?: string
  /** Absolute URL of the profile photo on Telegram's CDN. */
  photo?: string
  /** A channel's subscribers, a group's members, as Telegram counts them. */
  followers?: number
  verified?: boolean
}

/** A handle as Telegram accepts it: 4 to 32 of letters, digits and underscores,
 *  starting with a letter; an @, a t.me link or spaces around it are forgiven. */
export function telegramHandle(input: string): string {
  const h = input
    .trim()
    .replace(/^(?:https?:\/\/)?(?:www\.)?(?:t|telegram)\.me\//i, "")
    .replace(/^@/, "")
    .replace(/\/$/, "")
  if (!/^[a-z][a-z0-9_]{3,31}$/i.test(h))
    throw new Error(`telegram: "${input}" is no handle`)
  return h
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

function decode(s: string): string {
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

/** The text of the first element with this class: its tags dropped, `<br>` a line. */
function textOf(html: string, cls: string): string | undefined {
  const m = new RegExp(
    `<div class="${cls}\\b[^"]*"[^>]*>([\\s\\S]*?)</div>`,
    "i",
  ).exec(html)
  if (!m?.[1]) return undefined
  const text = decode(
    m[1]
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .trim(),
  )
  return text || undefined
}

/** "10 404 944 subscribers", "1 234 members, 56 online": the first number, its
 *  thin-space and space groupings read through. */
function countOf(extra: string): number | undefined {
  const m = /^([\d\s  ,.]+)\s+(?:subscribers|members)/i.exec(extra)
  if (!m?.[1]) return undefined
  return Number(m[1].replace(/[^\d]/g, ""))
}

/** Read a profile's facts from the HTML of its t.me page. THROWS on a page with no
 *  profile (a handle nobody has, a private one). */
export function telegramFromHtml(
  handle: string,
  html: string,
): TelegramProfile {
  const h = telegramHandle(handle)
  const titleBlock =
    /<div class="tgme_page_title"[^>]*>([\s\S]*?)<\/div>/i.exec(html)?.[1]
  const name = textOf(html, "tgme_page_title")?.replace(/\s*✔$/, "")
  if (!titleBlock || !name)
    throw new Error(
      `telegram: no profile at t.me/${h} (no one has it, or private)`,
    )
  const extra = textOf(html, "tgme_page_extra") ?? ""
  const followers = countOf(extra)
  const kind: TelegramKind = /subscribers/i.test(extra)
    ? "channel"
    : /members/i.test(extra)
      ? "group"
      : // t.me offers a bot "Start Bot" where it offers a person "Send Message".
        />\s*Start Bot\s*</i.test(html)
        ? "bot"
        : "user"
  const photo = /<img class="tgme_page_photo_image"[^>]*\bsrc="([^"]+)"/i.exec(
    html,
  )?.[1]
  const bio = textOf(html, "tgme_page_description")
  return {
    handle: h,
    url: `https://t.me/${h}`,
    kind,
    name,
    ...(bio ? { bio } : {}),
    ...(photo ? { photo: decode(photo) } : {}),
    ...(followers !== undefined ? { followers } : {}),
    ...(/verified-icon/.test(titleBlock) ? { verified: true } : {}),
  }
}

/** Fetch a public profile by its handle (or its t.me link). */
export async function fetchTelegramProfile(
  handle: string,
): Promise<TelegramProfile> {
  const h = telegramHandle(handle)
  const res = await fetch(`https://t.me/${h}`, {
    headers: { "accept-language": "en", accept: "text/html" },
  })
  if (!res.ok)
    throw new Error(`telegram: t.me/${h} answered HTTP ${res.status}`)
  return telegramFromHtml(h, await res.text())
}
