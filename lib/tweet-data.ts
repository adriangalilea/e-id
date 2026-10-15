import type { Person } from "@/lib/person"
import type { Unfurl } from "@/lib/web-preview-facts"

export interface TweetAuthor extends Person {
  handle: string
  avatar: string
  /** The badge beside the name: X's blue, a business's gold, a government's grey. */
  verified?: "blue" | "business" | "government"
  /** Businesses wear a rounded square instead of a circle. */
  square?: boolean
}

/** A stretch of the text: plain, or a link with what X shows for it (a mention, a
 *  hashtag, a shortened url's display form). */
export interface TweetRun {
  text: string
  href?: string
}

export type TweetMedia =
  | { kind: "photo"; src: string; width: number; height: number; alt?: string }
  | {
      kind: "video" | "gif"
      src: string
      poster: string
      width: number
      height: number
    }

export interface Tweet {
  id: string
  url: string
  author: TweetAuthor
  /** ISO 8601. */
  date: string
  body: TweetRun[]
  media: TweetMedia[]
  /** The post this one quotes, drawn inside it. */
  quote?: Tweet
  /** The link card under the text (a page's unfurl, or an X article). */
  card?: Unfurl
  likes: number
  replies: number
  edited?: boolean
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
}
function decode(s: string): string {
  return s.replace(/&(amp|lt|gt|quot|#39);/g, (_, k: string) => {
    return ENTITIES[k] as string
  })
}

/** The id inside any form of a post's address, or the id itself. */
export function tweetId(urlOrId: string): string {
  const id = /^\d+$/.test(urlOrId)
    ? urlOrId
    : /(?:twitter|x)\.com\/[^/]+\/status(?:es)?\/(\d+)/.exec(urlOrId)?.[1]
  if (!id) throw new Error(`tweet: not a post address: ${urlOrId}`)
  return id
}

// What the syndication endpoint answers with, the parts read here.
interface RawEntity {
  indices: [number, number]
}
interface RawTweet {
  __typename?: string
  id_str: string
  text: string
  display_text_range: [number, number]
  created_at: string
  favorite_count?: number
  conversation_count?: number
  reply_count?: number
  isEdited?: boolean
  user: {
    name: string
    screen_name: string
    profile_image_url_https: string
    profile_image_shape?: string
    is_blue_verified?: boolean
    verified_type?: string | null
  }
  entities?: {
    urls?: (RawEntity & {
      url: string
      expanded_url: string
      display_url: string
    })[]
    user_mentions?: (RawEntity & { screen_name: string })[]
    hashtags?: (RawEntity & { text: string })[]
    symbols?: (RawEntity & { text: string })[]
    media?: RawEntity[]
  }
  mediaDetails?: {
    type: "photo" | "video" | "animated_gif"
    media_url_https: string
    ext_alt_text?: string | null
    original_info: { width: number; height: number }
    video_info?: {
      variants: { content_type: string; bitrate?: number; url: string }[]
    }
  }[]
  quoted_tweet?: RawTweet
  card?: {
    url: string
    binding_values: Record<
      string,
      { string_value?: string; image_value?: { url: string } } | undefined
    >
  } | null
  article?: {
    rest_id: string
    title: string
    preview_text?: string
    cover_media?: { media_info?: { original_img_url?: string } }
  }
  poll?: unknown
}

/** The text between `display_text_range` as runs, entities as links. Indices count
 *  code points of the ESCAPED text (`&amp;` is five), so the text is sliced first and
 *  each slice decoded after. */
function bodyOf(t: RawTweet): TweetRun[] {
  const chars = Array.from(t.text)
  const [from, to] = t.display_text_range
  const e = t.entities ?? {}
  const links: { at: [number, number]; run: TweetRun }[] = [
    ...(e.urls ?? []).map((u) => ({
      at: u.indices,
      run: { text: u.display_url, href: u.expanded_url },
    })),
    ...(e.user_mentions ?? []).map((m) => ({
      at: m.indices,
      run: {
        text: `@${m.screen_name}`,
        href: `https://x.com/${m.screen_name}`,
      },
    })),
    ...(e.hashtags ?? []).map((h) => ({
      at: h.indices,
      run: {
        text: `#${h.text}`,
        href: `https://x.com/hashtag/${encodeURIComponent(h.text)}`,
      },
    })),
    ...(e.symbols ?? []).map((s) => ({
      at: s.indices,
      run: {
        text: `$${s.text}`,
        href: `https://x.com/search?q=%24${encodeURIComponent(s.text)}`,
      },
    })),
  ]
    .filter((l) => l.at[0] >= from && l.at[1] <= to)
    .sort((a, b) => a.at[0] - b.at[0])
  const runs: TweetRun[] = []
  let at = from
  for (const l of links) {
    if (l.at[0] < at) throw new Error(`tweet ${t.id_str}: entities overlap`)
    if (l.at[0] > at)
      runs.push({ text: decode(chars.slice(at, l.at[0]).join("")) })
    runs.push(l.run)
    at = l.at[1]
  }
  const tail = decode(chars.slice(at, to).join("")).trimEnd()
  if (tail) runs.push({ text: tail })
  return runs
}

/** The video to play inline: an embed in prose does not need the 1080p master, so the
 *  richest mp4 under this budget, else the leanest there is. */
const VIDEO_BUDGET_BPS = 2_000_000

function mediaOf(t: RawTweet): TweetMedia[] {
  return (t.mediaDetails ?? []).map((m) => {
    const { width, height } = m.original_info
    if (m.type === "photo")
      return {
        kind: "photo",
        src: m.media_url_https,
        width,
        height,
        ...(m.ext_alt_text ? { alt: m.ext_alt_text } : {}),
      }
    const mp4 = (m.video_info?.variants ?? [])
      .filter((v) => v.content_type === "video/mp4")
      .sort((a, b) => (a.bitrate ?? 0) - (b.bitrate ?? 0))
    if (!mp4.length) throw new Error(`tweet ${t.id_str}: a video with no mp4`)
    const pick =
      mp4.filter((v) => (v.bitrate ?? 0) <= VIDEO_BUDGET_BPS).at(-1) ??
      (mp4[0] as (typeof mp4)[number])
    return {
      kind: m.type === "animated_gif" ? "gif" : "video",
      src: pick.url,
      poster: m.media_url_https,
      width,
      height,
    }
  })
}

function cardOf(t: RawTweet): Unfurl | undefined {
  if (t.article)
    return {
      url: `https://x.com/i/article/${t.article.rest_id}`,
      site: "X",
      title: t.article.title,
      ...(t.article.preview_text
        ? { description: t.article.preview_text }
        : {}),
      ...(t.article.cover_media?.media_info?.original_img_url
        ? { image: t.article.cover_media.media_info.original_img_url }
        : {}),
    }
  if (!t.card) return undefined
  const v = t.card.binding_values
  const title = v.title?.string_value
  if (!title) throw new Error(`tweet ${t.id_str}: a card with no title`)
  const expanded = t.entities?.urls?.find((u) => u.url === t.card?.url)
  const image =
    v.thumbnail_image_large?.image_value?.url ??
    v.summary_photo_image_large?.image_value?.url ??
    v.photo_image_full_size_large?.image_value?.url
  const domain = v.domain?.string_value ?? v.vanity_url?.string_value
  return {
    url: expanded?.expanded_url ?? t.card.url,
    site: domain ?? new URL(expanded?.expanded_url ?? t.card.url).hostname,
    title,
    ...(v.description?.string_value
      ? { description: v.description.string_value }
      : {}),
    ...(image ? { image } : {}),
  }
}

function fromRaw(t: RawTweet): Tweet {
  if (t.poll) throw new Error(`tweet ${t.id_str}: polls are not drawn yet`)
  const u = t.user
  const verified =
    u.verified_type === "Business"
      ? "business"
      : u.verified_type === "Government"
        ? "government"
        : u.is_blue_verified
          ? "blue"
          : undefined
  const card = cardOf(t)
  const quote = t.quoted_tweet ? fromRaw(t.quoted_tweet) : undefined
  // X drops the link that ends a post when the card under the text IS that link.
  const body = bodyOf(t)
  if (card && body.at(-1)?.href === card.url) {
    body.pop()
    const last = body.at(-1)
    if (last && !last.href) {
      last.text = last.text.trimEnd()
      if (!last.text) body.pop()
    }
  }
  return {
    id: t.id_str,
    url: `https://x.com/${u.screen_name}/status/${t.id_str}`,
    author: {
      name: u.name,
      handle: `@${u.screen_name}`,
      // `_normal` is 48 px; `_200x200` is crisp at the sizes a post draws on a 2x screen.
      avatar: u.profile_image_url_https.replace("_normal.", "_200x200."),
      ...(verified ? { verified } : {}),
      ...(u.profile_image_shape === "Square" ? { square: true } : {}),
    },
    date: new Date(t.created_at).toISOString(),
    body,
    media: mediaOf(t),
    ...(quote ? { quote } : {}),
    ...(card ? { card } : {}),
    likes: t.favorite_count ?? 0,
    replies: t.conversation_count ?? t.reply_count ?? 0,
    ...(t.isEdited ? { edited: true } : {}),
  }
}

/** Fetch a post by its address or id. THROWS on a post that is gone or private (the
 *  endpoint answers a tombstone or nothing), and on any shape not drawn yet. */
export async function fetchTweet(urlOrId: string): Promise<Tweet> {
  const id = tweetId(urlOrId)
  // The endpoint wants a token derived from the id; this is the widget's own formula.
  const token = ((Number(id) / 1e15) * Math.PI)
    .toString(36)
    .replace(/(0+|\.)/g, "")
  const res = await fetch(
    `https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${token}`,
  )
  if (!res.ok) throw new Error(`tweet ${id}: HTTP ${res.status}`)
  const raw = (await res.json()) as RawTweet
  if (raw.__typename !== "Tweet")
    throw new Error(
      `tweet ${id}: ${raw.__typename ?? "no post"} (deleted or private)`,
    )
  return fromRaw(raw)
}
