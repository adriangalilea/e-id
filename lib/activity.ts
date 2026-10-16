import "server-only"

import { cacheLife } from "next/cache"
import type { SelectLink } from "@/db/schema"
import { fetchGithub, type GithubRepo } from "@/lib/github-data"
import { getVideo, getWebsite } from "@/lib/presence"
import { publicFetch } from "@/lib/public-fetch"
import { feedOf, readFeed } from "@/lib/web-feed"
import { hostOf, hrefOf, type Unfurl } from "@/lib/web-preview-facts"
import { type YouTubeFacts, youtubeOf } from "@/lib/youtube-data"

// WHAT A PERSON MADE LATELY, from the links on their card, as the things
// themselves, each drawn by the registry's own card for it on the profile's
// "latest" (components/profile-links): the repositories they pushed to last
// (GitHub's repo card, its latest commits under it), their newest posts (the
// feed their website names, each its link preview, picture and all) and their
// newest upload (a YouTube channel's feed, its player card). Newest first, from
// the last 12 months, two a source. Nothing to set up: a link that has a feed is
// read. Each list is read on its own and cached an hour, each thing as its card
// reads it (a repo an hour, a page or a video a day); one that fails is logged,
// kept minutes, and the rest still show.

/** One thing made, and when: a repository, a post, a video. */
export type Made =
  | { kind: "code"; at: string; repo: GithubRepo }
  | { kind: "post"; at: string; page: Unfurl }
  | { kind: "video"; at: string; video: YouTubeFacts }

/** A thing a source lists, before it is read as its card. */
type Found = { url: string; title: string; at: string }

/** How far back "lately" reaches: an upload from years ago is no news. */
const LATELY_MS = 365 * 24 * 60 * 60 * 1000
/** At most this many from one source, so one busy feed does not fill it. */
const PER_SOURCE = 2
/** At most this many in all: a few things, each whole, never a list. */
const MOST = 5

/** A source's things made lately, newest first, at most PER_SOURCE. Inside each
 *  cached read, where the clock may be read (a prerender may not). */
function lately(items: Found[]): Found[] {
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
async function videosOf(handle: string): Promise<Found[] | null> {
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
    return lately(items.flatMap((i) => (i.at ? [{ ...i, at: i.at }] : [])))
  } catch (error) {
    console.error(`latest videos of ${handle}:`, error)
    cacheLife("minutes")
    return null
  }
}

/** The repositories a login pushed to last, its own and not forks. */
async function codeOf(login: string): Promise<Found[] | null> {
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
      pushed_at: string
      fork: boolean
      archived: boolean
    }[]
    cacheLife("hours")
    return lately(
      repos
        .filter((r) => !r.fork && !r.archived)
        .map((r) => ({ url: r.html_url, title: r.name, at: r.pushed_at })),
    )
  } catch (error) {
    console.error(`latest code of ${login}:`, error)
    cacheLife("minutes")
    return null
  }
}

/** The posts of the feed a website names on its page (`<link rel="alternate">`);
 *  none where it names none. Through `publicFetch`: the address is a person's. */
async function writingOf(site: string): Promise<Found[] | null> {
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
    return lately(items.flatMap((i) => (i.at ? [{ ...i, at: i.at }] : [])))
  } catch (error) {
    console.error(`latest writing of ${site}:`, error)
    cacheLife("minutes")
    return null
  }
}

/** A repository as its card reads it, its latest commits with it. */
async function repoOf(url: string): Promise<GithubRepo | null> {
  "use cache"
  try {
    const token = process.env.API_GITHUB_TOKEN
    if (!token) throw new Error("API_GITHUB_TOKEN is not set")
    const facts = await fetchGithub(url, token)
    if (facts.kind !== "repo") throw new Error(`${url} is a ${facts.kind}`)
    cacheLife("hours")
    return facts
  } catch (error) {
    console.error(`latest repository ${url}:`, error)
    cacheLife("minutes")
    return null
  }
}

/** The first link of a platform that carries a value. */
const first = (links: SelectLink[], platform: SelectLink["platform"]) =>
  links.find((l) => l.platform === platform && l.value)?.value ?? null

/** What a person made lately, newest first, each read as its card. */
export async function getMade(links: SelectLink[]): Promise<Made[]> {
  const youtube = first(links, "youtube")
  const github = first(links, "github")
  const website = first(links, "website")
  const [videos, code, posts] = await Promise.all([
    youtube ? videosOf(youtube) : null,
    github ? codeOf(github) : null,
    website ? writingOf(website) : null,
  ])
  const found = [
    ...(code ?? []).map((f) => ({ ...f, kind: "code" as const })),
    ...(posts ?? []).map((f) => ({ ...f, kind: "post" as const })),
    ...(videos ?? []).map((f) => ({ ...f, kind: "video" as const })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, MOST)
  const made = await Promise.all(
    found.map(async (f): Promise<Made | null> => {
      if (f.kind === "code") {
        const repo = await repoOf(f.url)
        return repo && { kind: "code", at: f.at, repo }
      }
      if (f.kind === "video") {
        const id = youtubeOf(f.url)?.id
        const video = id ? await getVideo(id) : null
        return video && { kind: "video", at: f.at, video }
      }
      // A post whose page will not unfurl is still the post: its title and its
      // site, from the feed.
      const page = (await getWebsite(f.url)) ?? {
        url: f.url,
        site: hostOf(f.url),
        title: f.title,
      }
      return { kind: "post", at: f.at, page }
    }),
  )
  return made.filter((m) => m !== null)
}
