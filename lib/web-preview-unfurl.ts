export interface Unfurl {
  url: string
  /** The site's own name (og:site_name), else its host. */
  site: string
  title: string
  description?: string
  /** Absolute URL of the preview image (og:image, twitter:image). */
  image?: string
  /** Absolute URL of the site's icon, when the page names one. */
  favicon?: string
}

/** The host a link is shown as: no scheme, no `www.`, no path. */
export function hostOf(url: string): string {
  const u = new URL(/^https?:\/\//.test(url) ? url : `https://${url}`)
  return u.hostname.replace(/^www\./, "")
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

/** The `content` of the first <meta> whose property or name is one of `keys`, in
 *  either attribute order. */
function meta(html: string, keys: string[]): string | undefined {
  for (const key of keys) {
    const k = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const re = new RegExp(
      `<meta\\b(?:[^>]*?\\b(?:property|name)=["']${k}["'][^>]*?\\bcontent=["']([^"']*)["']|[^>]*?\\bcontent=["']([^"']*)["'][^>]*?\\b(?:property|name)=["']${k}["'])`,
      "i",
    )
    const m = re.exec(html)
    const v = m?.[1] ?? m?.[2]
    if (v) return decode(v.trim())
  }
  return undefined
}

function iconOf(html: string, base: string): string | undefined {
  const m =
    /<link\b[^>]*\brel=["'](?:shortcut )?icon["'][^>]*\bhref=["']([^"']+)["']/i.exec(
      html,
    ) ??
    /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["'](?:shortcut )?icon["']/i.exec(
      html,
    )
  return m?.[1] ? new URL(decode(m[1]), base).href : undefined
}

/** Fetch a page and read its facts. THROWS on a page with no title: a preview with
 *  nothing to say is not a preview, and a card drawn from an empty fetch is the bug
 *  this refuses to hide. */
export async function unfurl(url: string): Promise<Unfurl> {
  const href = /^https?:\/\//.test(url) ? url : `https://${url}`
  // YouTube serves a bot a consent shell with no <title>; it publishes oEmbed for
  // exactly this, so a video's facts come from there: title, channel, thumbnail.
  if (/^(www\.)?(youtube\.com|youtu\.be)$/.test(hostOf(href))) {
    const res = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(href)}`,
    )
    if (!res.ok) throw new Error(`unfurl ${href}: oEmbed HTTP ${res.status}`)
    const o = (await res.json()) as {
      title?: string
      author_name?: string
      thumbnail_url?: string
    }
    if (!o.title) throw new Error(`unfurl ${href}: oEmbed has no title`)
    return {
      url: href,
      site: "YouTube",
      title: o.title,
      description: o.author_name,
      image: o.thumbnail_url,
      favicon:
        "https://www.youtube.com/s/desktop/f8c8418d/img/favicon_32x32.png",
    }
  }
  const res = await fetch(href, {
    headers: {
      // A browser's document request: the page as a reader is served it, in English.
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml",
      "accept-language": "en",
    },
    redirect: "follow",
  })
  if (!res.ok) throw new Error(`unfurl ${href}: HTTP ${res.status}`)
  const html = (await res.text()).slice(0, 512 * 1024)
  const tag = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]
  const title =
    meta(html, ["og:title", "twitter:title"]) ??
    (tag ? decode(tag).trim() : undefined)
  if (!title) throw new Error(`unfurl ${href}: the page has no title`)
  const image = meta(html, ["og:image", "og:image:url", "twitter:image"])
  return {
    url: href,
    site: meta(html, ["og:site_name"]) ?? hostOf(href),
    title,
    description: meta(html, [
      "og:description",
      "twitter:description",
      "description",
    ]),
    image: image ? new URL(image, res.url || href).href : undefined,
    favicon: iconOf(html, res.url || href),
  }
}
