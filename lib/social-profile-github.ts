import type { ProfileFacts } from "@/lib/social-profile-core"

/** A login as GitHub accepts it: letters, digits and single hyphens, at most 39,
 *  never starting or ending with a hyphen; an @, a github.com link or spaces around
 *  it are forgiven. */
export function githubLogin(input: string): string {
  const l = input
    .trim()
    .replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/$/, "")
  if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(l))
    throw new Error(`github: "${input}" is no login`)
  return l
}

/** What the endpoint answers that the profile reads. */
export interface GithubUserJson {
  login: string
  html_url: string
  avatar_url: string
  type: string
  name: string | null
  bio: string | null
  followers: number
  public_repos: number
}

/** A profile's facts from the endpoint's answer. */
export function githubFromJson(user: GithubUserJson): ProfileFacts {
  const bio = user.bio?.trim()
  const org = user.type === "Organization"
  return {
    platform: "github",
    url: user.html_url,
    handle: user.login,
    name: user.name?.trim() || user.login,
    kind: org ? "organization" : "person",
    ...(bio ? { bio } : {}),
    photo: user.avatar_url,
    // An organization has no followers worth leading with; its repositories are it.
    counts: org
      ? [{ value: user.public_repos, unit: "repositories" }]
      : [
          { value: user.followers, unit: "followers" },
          { value: user.public_repos, unit: "repositories" },
        ],
  }
}

/** Fetch a profile by its login (or its github.com link). */
export async function fetchGithubProfile(
  login: string,
  { token }: { token?: string } = {},
): Promise<ProfileFacts> {
  const l = githubLogin(login)
  const res = await fetch(`https://api.github.com/users/${l}`, {
    headers: {
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  })
  if (res.status === 404) throw new Error(`github: no user ${l}`)
  if (!res.ok) throw new Error(`github: users/${l} answered HTTP ${res.status}`)
  return githubFromJson((await res.json()) as GithubUserJson)
}
