import {
  compactNumber,
  type ProfileCount,
  type ProfileFacts,
} from "@/lib/social-profile-core"

/** A channel as its address names it: `@handle`, a youtube.com/@handle link, or a
 *  /channel/UC… link, or the handle bare (`Adrian_Galilea`, as a profile stores
 *  it), as the path to fetch. THROWS on anything else. */
export function youtubeChannelPath(input: string): string {
  const s = input.trim().replace(/\/$/, "")
  // A channel id first: bare, it would read as a handle too.
  const id =
    /^(?:(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/channel\/)?(UC[\w-]{22})$/.exec(
      s,
    )?.[1]
  if (id) return `channel/${id}`
  const handle =
    // `@handle`, its address, or the handle bare (as a profile stores it).
    /^(?:(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/)?@([\w.-]{3,30})$/i.exec(
      s,
    )?.[1] ?? /^([\w.-]{3,30})$/.exec(s)?.[1]
  if (handle) return `@${handle}`
  throw new Error(`youtube: "${input}" is no channel`)
}

type Json = Record<string, unknown>

/** The value at a path of keys, or undefined where the path breaks. */
function at(value: unknown, ...path: (string | number)[]): unknown {
  let v = value
  for (const key of path) {
    if (v === null || typeof v !== "object") return undefined
    v = (v as Json)[key]
  }
  return v
}

const text = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined

/** The data the page is rendered from. THROWS when the page carries none. */
export function youtubeInitialData(html: string): Json {
  const start = html.indexOf("var ytInitialData = ")
  if (start < 0) throw new Error("youtube: the page carries no ytInitialData")
  const from = start + "var ytInitialData = ".length
  const end = html.indexOf(";</script>", from)
  if (end < 0) throw new Error("youtube: ytInitialData has no end")
  return JSON.parse(html.slice(from, end)) as Json
}

/** "21.4M subscribers", "1.8K videos", "1 subscriber". */
function countIn(part: string): ProfileCount | undefined {
  const m = /^([\d.,]+[KMB]?)\s+(subscribers?|videos?)$/i.exec(part.trim())
  if (!m?.[1] || !m[2]) return undefined
  const unit = m[2].toLowerCase()
  return {
    value: compactNumber(m[1]),
    unit: unit.endsWith("s") ? unit : `${unit}s`,
  }
}

/** A channel's facts from its page's data. THROWS when the channel's metadata is
 *  not where it was read from. */
export function youtubeFromData(data: Json): ProfileFacts {
  const meta = at(data, "metadata", "channelMetadataRenderer")
  const name = text(at(meta, "title"))
  const vanity = text(at(meta, "vanityChannelUrl"))
  const id = text(at(meta, "externalId"))
  if (!name || !id)
    throw new Error("youtube: no channel metadata on the page (moved, or none)")
  const handle = vanity ? /\/@([^/]+)$/.exec(vanity)?.[1] : undefined
  const header = at(
    data,
    "header",
    "pageHeaderRenderer",
    "content",
    "pageHeaderViewModel",
  )
  const rows = at(
    header,
    "metadata",
    "contentMetadataViewModel",
    "metadataRows",
  )
  const parts = (Array.isArray(rows) ? rows : []).flatMap((row) => {
    const p = at(row, "metadataParts")
    return Array.isArray(p) ? p : []
  })
  const counts = parts
    .map((p) => text(at(p, "text", "content")))
    .flatMap((t) => (t ? (countIn(t) ?? []) : []))
    // Subscribers lead: they say how many follow it.
    .sort((a, b) =>
      a.unit === "subscribers" ? -1 : b.unit === "subscribers" ? 1 : 0,
    )
  const runs = at(
    header,
    "title",
    "dynamicTextViewModel",
    "text",
    "attachmentRuns",
  )
  const verified = JSON.stringify(runs ?? null).includes("CHECK_CIRCLE_FILLED")
  const photo = text(at(meta, "avatar", "thumbnails", 0, "url"))
  const bio = text(at(meta, "description"))
  return {
    platform: "youtube",
    url: handle
      ? `https://www.youtube.com/@${handle}`
      : `https://www.youtube.com/channel/${id}`,
    handle: handle ?? id,
    name,
    kind: "channel",
    ...(bio ? { bio } : {}),
    ...(photo ? { photo } : {}),
    ...(verified ? { verified: true } : {}),
    counts,
  }
}

/** Fetch a channel by its handle or its address. */
export async function fetchYoutubeChannel(
  channel: string,
): Promise<ProfileFacts> {
  const path = youtubeChannelPath(channel)
  const res = await fetch(`https://www.youtube.com/${path}?hl=en`, {
    headers: {
      "accept-language": "en",
      accept: "text/html",
      cookie: "SOCS=CAI",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
    },
  })
  if (res.status === 404) throw new Error(`youtube: no channel ${path}`)
  if (!res.ok) throw new Error(`youtube: ${path} answered HTTP ${res.status}`)
  return youtubeFromData(youtubeInitialData(await res.text()))
}
