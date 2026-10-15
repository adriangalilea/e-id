import "server-only"

import { cacheLife } from "next/cache"
import type { SelectLink } from "@/db/schema"
import { getGithubProfile } from "@/lib/github"
import type { GithubProfile } from "@/lib/github-data"
import type { LinkPlatform } from "@/lib/platforms"
import type { ProfileFacts } from "@/lib/social-profile-core"
import { fetchGithubProfile } from "@/lib/social-profile-github"
import { fetchTelegramProfile } from "@/lib/social-profile-telegram"
import { fetchYoutubeChannel } from "@/lib/social-profile-youtube"
import { fetchTweet, type Tweet } from "@/lib/tweet-data"
import { type Unfurl, unfurl } from "@/lib/web-preview-unfurl"
import { type YouTubeFacts, youtubeFacts } from "@/lib/youtube-data"

/** A profile's presence behind each of its links, as the registry's items draw
 *  it: the GitHub profile and calendar, the website's preview, the highlighted
 *  video and post. Null where the link has none or its site would not answer.
 *  `profiles`: who they are behind each link read as a profile
 *  (@ag/social-profile: Telegram, GitHub, YouTube), the compact view behind each
 *  mark on their card and the Telegram tab. */
export type Presence = {
  github: GithubProfile | null
  website: Unfurl | null
  youtube: YouTubeFacts | null
  tweet: Tweet | null
  profiles: ProfileFacts[]
}

// Each read below is cached a day: what it shows changes on its own site, never by
// e-id, so it is regenerated on a visit after that. One that fails is logged with
// its cause and kept minutes, so a site that was down or a value that was wrong
// does not leave the profile without it for a day.

export async function getWebsite(url: string): Promise<Unfurl | null> {
  "use cache"
  try {
    const facts = await unfurl(url)
    cacheLife("days")
    return facts
  } catch (error) {
    console.error(`website preview of ${url}:`, error)
    cacheLife("minutes")
    return null
  }
}

export async function getVideo(id: string): Promise<YouTubeFacts | null> {
  "use cache"
  try {
    const facts = await youtubeFacts(`https://youtu.be/${id}`)
    cacheLife("days")
    return facts
  } catch (error) {
    console.error(`highlighted video ${id}:`, error)
    cacheLife("minutes")
    return null
  }
}

export async function getTweet(id: string): Promise<Tweet | null> {
  "use cache"
  try {
    const tweet = await fetchTweet(id)
    cacheLife("days")
    return tweet
  } catch (error) {
    console.error(`highlighted tweet ${id}:`, error)
    cacheLife("minutes")
    return null
  }
}

/** The platforms whose profile a link can be read as (@ag/social-profile). */
export type ProfilePlatform = "telegram" | "github" | "youtube"

const PROFILE_READERS: Record<
  ProfilePlatform,
  (handle: string) => Promise<ProfileFacts>
> = {
  telegram: fetchTelegramProfile,
  // A token raises GitHub's 60 reads an hour to 5000; the profile reads without.
  github: (login) =>
    fetchGithubProfile(login, { token: process.env.API_GITHUB_TOKEN }),
  youtube: fetchYoutubeChannel,
}

/** Who someone is behind a link: its profile's facts, or null where the site
 *  would not answer. `handle` is the link's value (a handle, or its address). */
export async function getLinkProfile(
  platform: ProfilePlatform,
  handle: string,
): Promise<ProfileFacts | null> {
  "use cache"
  try {
    const profile = await PROFILE_READERS[platform](handle)
    cacheLife("days")
    return profile
  } catch (error) {
    console.error(`${platform} profile ${handle}:`, error)
    cacheLife("minutes")
    return null
  }
}

/** Whether a platform's links are read as profiles. */
export function readsProfile(platform: string): platform is ProfilePlatform {
  return Object.hasOwn(PROFILE_READERS, platform)
}

/** The first link of a platform that carries a value. */
function first(links: SelectLink[], platform: LinkPlatform) {
  return links.find((l) => l.platform === platform && l.value)
}

export async function getPresence(links: SelectLink[]): Promise<Presence> {
  const github = first(links, "github")?.value
  const website = first(links, "website")?.value
  const video = first(links, "youtube")?.custom_data?.highlight
  const tweet = first(links, "twitter")?.custom_data?.highlight
  const read = (["telegram", "github", "youtube"] as const).flatMap(
    (platform) => {
      const value = first(links, platform)?.value
      return value ? [{ platform, value }] : []
    },
  )
  const [g, w, v, t, profiles] = await Promise.all([
    github ? getGithubProfile(github) : null,
    website ? getWebsite(website) : null,
    video ? getVideo(video) : null,
    tweet ? getTweet(tweet) : null,
    Promise.all(read.map((l) => getLinkProfile(l.platform, l.value))),
  ])
  return {
    github: g,
    website: w,
    youtube: v,
    tweet: t,
    profiles: profiles.filter((p) => p !== null),
  }
}
