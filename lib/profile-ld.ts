import type { SelectLink } from "@/db/schema";
import { PROD_URL } from "@/lib/const";
import type { Profile } from "@/lib/data";
import { getLinkUrl } from "@/lib/links";

/** A profile's canonical address: e-id.to, where crawlers land. */
export function profileUrl(username: string) {
  return `${PROD_URL}/${username}`;
}

/** schema.org ProfilePage for a profile: the person, their handle, and every
 *  public link as sameAs, so a search engine ties the accounts to one person. */
export function profileJsonLd(user: Profile, links: SelectLink[]) {
  const sameAs = links
    .filter((link) => link.platform !== "email" && link.value)
    .map((link) => getLinkUrl(link.platform, link.value ?? ""));
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: profileUrl(user.username),
    dateCreated: user.createdAt.toISOString(),
    mainEntity: {
      "@type": "Person",
      name: user.name ?? user.username,
      alternateName: `@${user.username}`,
      identifier: user.username,
      url: profileUrl(user.username),
      ...(user.image && { image: user.image }),
      ...(user.bio && { description: user.bio }),
      ...(sameAs.length > 0 && { sameAs }),
    },
  };
}

/** JSON for an inline script: `<` escaped so no value can close the tag. */
export function inlineJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
