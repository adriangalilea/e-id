import "server-only";

import { cacheLife } from "next/cache";
import type { SelectSocial } from "@/db/schema";
import type { GithubProfile } from "@/lib/github-data";
import { getGithubProfile } from "@/lib/github";
import {
  fetchTelegramProfile,
  type TelegramProfile,
} from "@/lib/telegram-profile-data";
import { fetchTweet, type Tweet } from "@/lib/tweet-data";
import { unfurl, type Unfurl } from "@/lib/web-preview-unfurl";
import { youtubeFacts, type YouTubeFacts } from "@/lib/youtube-data";

/** A profile's presence on each of its socials, as the registry's items draw it:
 *  the GitHub profile and calendar, the website's preview, the highlighted video
 *  and post, the Telegram profile. Null where the social has none or the place
 *  would not answer. */
export type Presence = {
  github: GithubProfile | null;
  website: Unfurl | null;
  youtube: YouTubeFacts | null;
  tweet: Tweet | null;
  telegram: TelegramProfile | null;
};

// Each read below is cached a day: what it shows changes on its own place, never by
// e-id, so it is regenerated on a visit after that. One that fails is logged with
// its cause and kept minutes, so a place that was down or a value that was wrong
// does not leave the profile without it for a day.

export async function getWebsite(url: string): Promise<Unfurl | null> {
  "use cache";
  try {
    const facts = await unfurl(url);
    cacheLife("days");
    return facts;
  } catch (error) {
    console.error(`website preview of ${url}:`, error);
    cacheLife("minutes");
    return null;
  }
}

export async function getVideo(id: string): Promise<YouTubeFacts | null> {
  "use cache";
  try {
    const facts = await youtubeFacts(`https://youtu.be/${id}`);
    cacheLife("days");
    return facts;
  } catch (error) {
    console.error(`highlighted video ${id}:`, error);
    cacheLife("minutes");
    return null;
  }
}

export async function getTweet(id: string): Promise<Tweet | null> {
  "use cache";
  try {
    const tweet = await fetchTweet(id);
    cacheLife("days");
    return tweet;
  } catch (error) {
    console.error(`highlighted tweet ${id}:`, error);
    cacheLife("minutes");
    return null;
  }
}

export async function getTelegram(
  handle: string,
): Promise<TelegramProfile | null> {
  "use cache";
  try {
    const profile = await fetchTelegramProfile(handle);
    cacheLife("days");
    return profile;
  } catch (error) {
    console.error(`telegram profile ${handle}:`, error);
    cacheLife("minutes");
    return null;
  }
}

/** The first social of a platform that carries a value. */
function first(socials: SelectSocial[], platform: SelectSocial["platform"]) {
  return socials.find((s) => s.platform === platform && s.value);
}

export async function getPresence(socials: SelectSocial[]): Promise<Presence> {
  const github = first(socials, "github")?.value;
  const website = first(socials, "website")?.value;
  const video = first(socials, "youtube")?.custom_data?.highlight;
  const tweet = first(socials, "twitter")?.custom_data?.highlight;
  const telegram = first(socials, "telegram")?.value;
  const [g, w, v, t, tg] = await Promise.all([
    github ? getGithubProfile(github) : null,
    website ? getWebsite(website) : null,
    video ? getVideo(video) : null,
    tweet ? getTweet(tweet) : null,
    telegram ? getTelegram(telegram) : null,
  ]);
  return { github: g, website: w, youtube: v, tweet: t, telegram: tg };
}
