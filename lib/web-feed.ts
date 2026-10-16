// A SITE'S FEED, READ: the latest of what it published, from its RSS 2.0 or Atom
// feed (a blog, a YouTube channel's uploads, a podcast, a changelog). `parseFeed` is
// string work on the XML and nothing else, so it runs anywhere; `feedOf` finds the
// feed a page names (<link rel="alternate">); `readFeed` fetches one, on a server,
// through `publicFetch`, since the address usually comes from a person.
//
// What an item is: a title, where it opens, when, and its picture where the feed
// carries one (media:thumbnail, an enclosure image). Items without a title or an
// address are no items; a date that does not parse leaves the item undated, last.

import { publicFetch } from "@/lib/public-fetch"
import { hrefOf } from "@/lib/web-preview-facts"

export interface FeedItem {
  title: string
  /** Absolute URL of the item. */
  url: string
  /** When it was published, ISO 8601; absent where the feed does not say. */
  at?: string
  /** Absolute URL of its picture, where the feed carries one. */
  image?: string
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, code: string) => {
      if (code[0] === "#") {
        const n =
          code[1] === "x" || code[1] === "X"
            ? Number.parseInt(code.slice(2), 16)
            : Number.parseInt(code.slice(1), 10)
        return Number.isFinite(n) ? String.fromCodePoint(n) : m
      }
      return ENTITIES[code.toLowerCase()] ?? m
    })
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/** The text of the first `<tag>` in `xml` (any namespace prefix), decoded. */
function text(xml: string, tag: string): string | undefined {
  const m = new RegExp(
    `<(?:[\\w-]+:)?${tag}\\b[^>]*>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>`,
    "i",
  ).exec(xml)
  const v = m?.[1] ? decode(m[1]) : ""
  return v || undefined
}

/** An attribute of the first `<tag …>` matching `where`. */
function attr(
  xml: string,
  tag: string,
  name: string,
  where: (element: string) => boolean = () => true,
): string | undefined {
  for (const m of xml.matchAll(
    new RegExp(`<(?:[\\w-]+:)?${tag}\\b[^>]*>`, "gi"),
  )) {
    if (!where(m[0])) continue
    const v = new RegExp(`\\b${name}=["']([^"']+)["']`, "i").exec(m[0])?.[1]
    if (v) return decode(v)
  }
  return undefined
}

const absolute = (href: string | undefined, base: string) => {
  if (!href) return undefined
  try {
    return new URL(href, base).href
  } catch {
    return undefined
  }
}

const iso = (date: string | undefined) => {
  if (!date) return undefined
  const ms = Date.parse(date)
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString()
}

/** The items of an RSS 2.0 or Atom feed, newest first. `base` is the feed's own
 *  address, against which relative links are read. */
export function parseFeed(xml: string, base: string): FeedItem[] {
  const atom = /<feed\b/i.test(xml)
  const blocks = xml.match(
    atom ? /<entry\b[\s\S]*?<\/entry>/gi : /<item\b[\s\S]*?<\/item>/gi,
  )
  const items = (blocks ?? []).flatMap((block): FeedItem[] => {
    const title = text(block, "title")
    const url = absolute(
      atom
        ? (attr(
            block,
            "link",
            "href",
            (e) => !/\brel=["'](?!alternate)/i.test(e),
          ) ?? attr(block, "link", "href"))
        : (text(block, "link") ?? attr(block, "link", "href")),
      base,
    )
    if (!title || !url) return []
    const at = iso(
      atom
        ? (text(block, "published") ?? text(block, "updated"))
        : (text(block, "pubDate") ?? text(block, "date")),
    )
    const image = absolute(
      attr(block, "thumbnail", "url") ??
        attr(block, "content", "url", (e) =>
          /medium=["']image|image\//i.test(e),
        ) ??
        attr(block, "enclosure", "url", (e) => /type=["']image\//i.test(e)),
      base,
    )
    return [{ title, url, ...(at && { at }), ...(image && { image }) }]
  })
  return items.sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""))
}

/** The feed a page names, absolute: its first `<link rel="alternate">` of an RSS
 *  or Atom type; null where it names none. */
export function feedOf(html: string, base: string): string | null {
  const head = /<head\b[\s\S]*?<\/head>/i.exec(html)?.[0] ?? html
  const href = attr(
    head,
    "link",
    "href",
    (e) =>
      /\brel=["'][^"']*alternate/i.test(e) &&
      /\btype=["']application\/(rss|atom)\+xml/i.test(e),
  )
  return absolute(href, base) ?? null
}

/** A feed's items, fetched from the public internet only (`publicFetch`). THROWS
 *  on a feed that does not answer 2xx or holds no items. */
export async function readFeed(url: string): Promise<FeedItem[]> {
  const href = hrefOf(url)
  const res = await publicFetch(href, {
    headers: {
      accept:
        "application/atom+xml, application/rss+xml, application/xml;q=0.9, */*;q=0.5",
    },
  })
  if (!res.ok) throw new Error(`readFeed ${href}: HTTP ${res.status}`)
  const xml = (await res.text()).slice(0, 2 * 1024 * 1024)
  const items = parseFeed(xml, res.url || href)
  if (items.length === 0) throw new Error(`readFeed ${href}: no items`)
  return items
}
