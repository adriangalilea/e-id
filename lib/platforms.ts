// Where a link can go, for every side: the database stores it (db/schema), the
// card format names it (lib/card-schema), the editor offers it (lib/card-edit),
// the pages draw it. Plain data, no zod, no database: the browser reads it too.

/** A platform e-ID knows, or `link`, anywhere at all (its `label` names it). */
export const linkPlatforms = [
  "email",
  "youtube",
  "github",
  "twitter",
  "website",
  "self",
  "instagram",
  "telegram",
  "link",
] as const

export type LinkPlatform = (typeof linkPlatforms)[number]

/** The platforms a person can add a link on: every known one. A `link`
 *  (anywhere at all, named by its label) is ready in the data and the card
 *  format, and not offered yet: no picker lists it and no save takes one. */
export const OFFERED: readonly LinkPlatform[] = linkPlatforms.filter(
  (p) => p !== "link",
)

/** The platforms a highlight is read on (components/profile-links). */
export const HIGHLIGHTED: readonly LinkPlatform[] = ["youtube", "twitter"]

/** A platform this site knows, from a card it wrote: one it does not know is a
 *  card from somewhere else, or a platform added here and not yet drawn. */
export function knownPlatform(platform: string): LinkPlatform {
  if (!(linkPlatforms as readonly string[]).includes(platform))
    throw new Error(
      `a card link on "${platform}", a platform e-ID does not know`,
    )
  return platform as LinkPlatform
}
