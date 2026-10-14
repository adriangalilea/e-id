import {
  compactNumber,
  decodeEntities,
  type ProfileFacts,
  type ProfileKind,
} from "@/lib/social-profile-core"

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

/** The text of the first element with this class: its tags dropped, `<br>` a line. */
function textOf(html: string, cls: string): string | undefined {
  const m = new RegExp(
    `<div class="${cls}\\b[^"]*"[^>]*>([\\s\\S]*?)</div>`,
    "i",
  ).exec(html)
  if (!m?.[1]) return undefined
  const text = decodeEntities(
    m[1]
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .trim(),
  )
  return text || undefined
}

/** "10 404 944 subscribers", "1 234 members, 56 online": the first number in its
 *  unit, the groupings read through (`\s` takes the thin and no-break spaces t.me
 *  groups digits with). */
function countOf(extra: string): ProfileFacts["counts"] {
  const m = /^([\d\s,.]+?)\s+(subscribers|members)/i.exec(extra.trim())
  if (!m?.[1] || !m[2]) return []
  return [
    {
      value: compactNumber(m[1].replace(/[^\d]/g, "")),
      unit: m[2].toLowerCase(),
    },
  ]
}

/** Read a profile's facts from the HTML of its t.me page. THROWS on a page with no
 *  profile (a handle nobody has, a private one). */
export function telegramFromHtml(handle: string, html: string): ProfileFacts {
  const h = telegramHandle(handle)
  const titleBlock =
    /<div class="tgme_page_title"[^>]*>([\s\S]*?)<\/div>/i.exec(html)?.[1]
  const name = textOf(html, "tgme_page_title")?.replace(/\s*✔$/, "")
  if (!titleBlock || !name)
    throw new Error(
      `telegram: no profile at t.me/${h} (no one has it, or private)`,
    )
  const extra = textOf(html, "tgme_page_extra") ?? ""
  const kind: ProfileKind = /subscribers/i.test(extra)
    ? "channel"
    : /members/i.test(extra)
      ? "group"
      : // t.me offers a bot "Start Bot" where it offers a person "Send Message".
        />\s*Start Bot\s*</i.test(html)
        ? "bot"
        : "person"
  const photo = /<img class="tgme_page_photo_image"[^>]*\bsrc="([^"]+)"/i.exec(
    html,
  )?.[1]
  const bio = textOf(html, "tgme_page_description")
  return {
    platform: "telegram",
    url: `https://t.me/${h}`,
    handle: h,
    name,
    kind,
    ...(bio ? { bio } : {}),
    ...(photo ? { photo: decodeEntities(photo) } : {}),
    ...(/verified-icon/.test(titleBlock) ? { verified: true } : {}),
    counts: countOf(extra),
  }
}

/** Fetch a public profile by its handle (or its t.me link). */
export async function fetchTelegramProfile(
  handle: string,
): Promise<ProfileFacts> {
  const h = telegramHandle(handle)
  const res = await fetch(`https://t.me/${h}`, {
    headers: { "accept-language": "en", accept: "text/html" },
  })
  if (!res.ok)
    throw new Error(`telegram: t.me/${h} answered HTTP ${res.status}`)
  return telegramFromHtml(h, await res.text())
}
