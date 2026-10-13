import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { fetchGithub, type GithubProfile } from "@/lib/github-data";
import { githubTag } from "@/lib/tags";

/** A GitHub login's profile and contribution calendar, as the registry's `github`
 *  item draws it. GitHub owns it and it changes daily whatever e-id does, so it is
 *  the one read here on a timer: kept a day, regenerated on a visit after that.
 *
 *  When GitHub cannot answer (no token, a revoked one, a login that is gone) the
 *  profile renders without it, and that answer is kept minutes, not a day: a
 *  failure cached like a success is how every profile lost its calendar for good
 *  behind an expired token, the cause logged once a build and never again. */
export async function getGithubProfile(
  login: string,
): Promise<GithubProfile | null> {
  "use cache";
  cacheTag(githubTag(login));

  const token = process.env.API_GITHUB_TOKEN;
  if (!token) {
    console.error(`GitHub calendar for ${login}: API_GITHUB_TOKEN is not set`);
    cacheLife("minutes");
    return null;
  }
  try {
    const facts = await fetchGithub(`https://github.com/${login.trim()}`, token);
    if (facts.kind !== "profile")
      throw new Error(`github.com/${login} is a ${facts.kind}, not a profile`);
    cacheLife("days");
    return facts;
  } catch (error) {
    // HTTP 401 here is API_GITHUB_TOKEN revoked or expired: a new classic token
    // with read:user, in the environment the build and the server read.
    console.error(`GitHub calendar for ${login}:`, error);
    cacheLife("minutes");
    return null;
  }
}
