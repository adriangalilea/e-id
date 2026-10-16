import "server-only"

import { cacheLife } from "next/cache"
import type { SelectLink } from "@/db/schema"
import { publicFetch } from "@/lib/public-fetch"
import { feedOf, readFeed } from "@/lib/web-feed"
import { hrefOf } from "@/lib/web-preview-facts"

// WHAT A PERSON MADE LATELY, from the links on their card: their videos (a YouTube
// channel's uploads feed), their code (the GitHub repositories they pushed to
// last) and their writing (the RSS or Atom feed their website names), newest first,
// as the profile's "latest" (components/profile-links). Nothing to set up: a link
// that has a feed is read. Each source is read on its own and cached an hour; one
// that fails is logged and kept minutes, and the rest still show.

/** One thing made: what, where it opens, when, and its picture where it has one. */
export type Made = {
  platform: "youtube" | "github" | "website"
  title: string
  url: string
  /** ISO 8601. */
  at: string
  image?: string
  /** A line under the title: a repository's description. */
  detail?: string
}

/** How far back "lately" reaches: an upload from years ago is no news. */
const LATELY_MS = 365 * 24 * 60 * 60 * 1000
/** At most this many from one source, so one busy feed does not fill it. */
const PER_SOURCE = 3
/** At most this many in all. */
const MOST = 8

/** A source's items made lately, newest first, at most PER_SOURCE. Inside each
 *  cached read, where the clock may be read (a prerender may not). */
function lately(items: Made[]): Made[] {
  const since = Date.now() - LATELY_MS
  return items
    .filter((i) => Date.parse(i.at) >= since)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, PER_SOURCE)
}

const BROWSER = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
  "accept-language": "en",
}

/** A channel's uploads, from the feed its page names (`channel_id`). */
async function videosOf(handle: string): Promise<Made[] | null> {
  "use cache"
  try {
    const at = handle.startsWith("UC")
      ? `channel/${handle}`
      : `@${handle.replace(/^@/, "")}`
    const page = await fetch(`https://www.youtube.com/${at}?hl=en`, {
      headers: { ...BROWSER, accept: "text/html", cookie: "SOCS=CAI" },
    })
    if (!page.ok) throw new Error(`HTTP ${page.status}`)
    const id = /feeds\/videos\.xml\?channel_id=([\w-]+)/.exec(
      await page.text(),
    )?.[1]
    if (!id) throw new Error("the channel's page names no feed")
    const items = await readFeed(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`,
    )
    cacheLife("hours")
    return lately(
      items.flatMap((i) =>
        i.at ? [{ platform: "youtube" as const, ...i, at: i.at }] : [],
      ),
    )
  } catch (error) {
    console.error(`latest videos of ${handle}:`, error)
    cacheLife("minutes")
    return null
  }
}

/** The repositories a login pushed to last, its own and not forks. */
async function codeOf(login: string): Promise<Made[] | null> {
  "use cache"
  try {
    const token = process.env.API_GITHUB_TOKEN
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(login)}/repos?type=owner&sort=pushed&per_page=10`,
      {
        headers: {
          accept: "application/vnd.github+json",
          ...(token && { authorization: `Bearer ${token}` }),
        },
      },
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const repos = (await res.json()) as {
      name: string
      html_url: string
      description: string | null
      pushed_at: string
      fork: boolean
      archived: boolean
    }[]
    cacheLife("hours")
    return lately(
      repos
        .filter((r) => !r.fork && !r.archived)
        .map((r) => ({
          platform: "github" as const,
          title: r.name,
          url: r.html_url,
          at: r.pushed_at,
          ...(r.description && { detail: r.description }),
        })),
    )
  } catch (error) {
    console.error(`latest code of ${login}:`, error)
    cacheLife("minutes")
    return null
  }
}

/** The posts of the feed a website names on its page (`<link rel="alternate">`);
 *  none where it names none. Through `publicFetch`: the address is a person's. */
async function writingOf(site: string): Promise<Made[] | null> {
  "use cache"
  try {
    // A website is stored as its owner wrote it, often without its scheme.
    const page = await publicFetch(hrefOf(site), {
      headers: { ...BROWSER, accept: "text/html" },
    })
    if (!page.ok) throw new Error(`HTTP ${page.status}`)
    const feed = feedOf(
      (await page.text()).slice(0, 512 * 1024),
      page.url || site,
    )
    cacheLife("hours")
    if (!feed) return []
    const items = await readFeed(feed)
    return lately(
      items.flatMap((i) =>
        i.at ? [{ platform: "website" as const, ...i, at: i.at }] : [],
      ),
    )
  } catch (error) {
    console.error(`latest writing of ${site}:`, error)
    cacheLife("minutes")
    return null
  }
}

/** The first link of a platform that carries a value. */
const first = (links: SelectLink[], platform: SelectLink["platform"]) =>
  links.find((l) => l.platform === platform && l.value)?.value ?? null

/** What a person made lately, newest first, from their public links. */
export async function getMade(links: SelectLink[]): Promise<Made[]> {
  const youtube = first(links, "youtube")
  const github = first(links, "github")
  const website = first(links, "website")
  const sources = await Promise.all([
    youtube ? videosOf(youtube) : null,
    github ? codeOf(github) : null,
    website ? writingOf(website) : null,
  ])
  return sources
    .flatMap((items) => items ?? [])
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, MOST)
}
