import "server-only";

import type { SocialFacts } from "@/components/social_component";
import type { SelectSocial } from "@/db/schema";
import { getGithubProfile } from "@/lib/github";
import { getTweet } from "@/lib/tweet";

/** What a profile's socials show beyond their links: the GitHub calendar of its
 *  github social and the post its twitter social highlights, each read once and
 *  cached (lib/github, lib/tweet). */
export async function getSocialFacts(
  socials: SelectSocial[],
): Promise<SocialFacts> {
  const login = socials.find(
    (social) => social.platform === "github" && social.value,
  )?.value;
  const tweetId = socials.find(
    (social) => social.platform === "twitter" && social.custom_data?.highlight,
  )?.custom_data?.highlight;
  const [github, tweet] = await Promise.all([
    login ? getGithubProfile(login) : null,
    tweetId ? getTweet(tweetId) : null,
  ]);
  return { github, tweet };
}
