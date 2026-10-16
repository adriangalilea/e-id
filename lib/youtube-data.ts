// A YOUTUBE VIDEO'S FACTS, framework-free: which video a link names (every form YouTube
// hands out: watch?v=, youtu.be/, /shorts/, /embed/, /live/, with a start time as
// t=1m30s, t=90 or start=90), and its title and channel from YouTube's oEmbed, the
// endpoint its own embeds read, no key. Fetched once at authoring time and shipped as
// data beside the link (`mise youtube <url>`), the way tweet and web-preview do, so a
// page never depends on YouTube answering to draw.

export interface YouTubeRef {
  id: string
  /** seconds in, when the link names a start */
  start?: number
  /** a Short: drawn upright, 9:16 */
  short: boolean
}

export interface YouTubeFacts extends YouTubeRef {
  title: string
  channel: string
  channelUrl: string
}

const ID = /^[\w-]{11}$/

/** `1m30s`, `90s`, `90`, `1h2m3s` as seconds. */
function secondsOf(t: string | null): number | undefined {
  if (!t) return undefined
  if (/^\d+$/.test(t)) return Number(t)
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(t)
  if (!m || t === "") return undefined
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)
}

/** The video a link names, or null when it names none. */
export function youtubeOf(link: string): YouTubeRef | null {
  let url: URL
  try {
    url = new URL(link)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^(?:www|m|music)\./, "")
  const start = secondsOf(
    url.searchParams.get("t") ?? url.searchParams.get("start"),
  )
  let id: string | null = null
  let short = false
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0] ?? null
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const [, first, second] = url.pathname.split("/")
    if (first === "watch") id = url.searchParams.get("v")
    else if (first === "shorts" || first === "embed" || first === "live") {
      id = second ?? null
      short = first === "shorts"
    }
  }
  if (!id || !ID.test(id)) return null
  return { id, short, ...(start !== undefined && { start }) }
}

/** A video's title and channel, from YouTube's oEmbed. Screams on a link that names no
 *  video or a video YouTube will not describe (private, removed). */
export async function youtubeFacts(link: string): Promise<YouTubeFacts> {
  const ref = youtubeOf(link)
  if (!ref) throw new Error(`youtube-data: ${link} names no video`)
  const watch = `https://www.youtube.com/watch?v=${ref.id}`
  const res = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(watch)}&format=json`,
  )
  if (!res.ok)
    throw new Error(`youtube-data: oEmbed answered ${res.status} for ${ref.id}`)
  const o = (await res.json()) as {
    title: string
    author_name: string
    author_url: string
  }
  return {
    ...ref,
    title: o.title,
    channel: o.author_name,
    channelUrl: o.author_url,
  }
}
