import "server-only";

import {
  type Card,
  CARD_SCHEMA_URL,
  cardSchema,
  formatsOf,
} from "@/lib/card-schema";
import { EMOJI_DOMAIN, PROD_URL } from "@/lib/const";
import { cardLinkOf, getProfile, getPublicLinks } from "@/lib/data";
import { handleOf, shortName } from "@/lib/link-names";
import { getLinkProfile, readsProfile } from "@/lib/presence";

// A person's card in the open format (lib/card-schema), at /<username>/json (and
// card.json, and the profile's own address asked for JSON), linked from the
// profile (<link rel="alternate">). One builder, `cardOf`, and everything that
// draws a card off the site reads what it returns: the share image, the embed,
// oEmbed, the contact.

export { type Card, CARD_TYPE } from "@/lib/card-schema";

/** The card of `username`, or null when nobody has that handle. Parsed by the
 *  format's own schema on the way out: a card this site would publish wrong
 *  fails here, loudly, never in a reader. */
export async function cardOf(username: string): Promise<Card | null> {
  const profile = await getProfile(username);
  if (!profile) return null;
  // In their order (getPublicLinks returns it).
  const rows = await getPublicLinks(profile.id);
  const links = await Promise.all(
    rows.map(async (row, i) => {
      const { name, url } = cardLinkOf(row);
      const value = row.value ?? "";
      // The route the redirect resolves (app/[username]/[link]) is the first
      // link of its platform's: only that one has one.
      const short = shortName(row.platform);
      const first = rows.findIndex((r) => r.platform === row.platform) === i;
      const handle = handleOf(row.platform, value);
      // Who they are there, where the platform is read (lib/presence: cached a
      // day, a failed read a few minutes, so a card never waits on it twice).
      const facts =
        readsProfile(row.platform) && value
          ? await getLinkProfile(row.platform, value)
          : null;
      return {
        platform: row.platform,
        name,
        url,
        ...(short && first && {
          route: `https://${EMOJI_DOMAIN}/${profile.username}/${short}`,
        }),
        ...(handle && { handle }),
        ...(row.note && { note: row.note }),
        ...(facts && {
          profile: {
            name: facts.name,
            handle: facts.handle,
            photo: facts.photo ?? null,
            count: facts.counts[0] ?? null,
            verified: facts.verified ?? false,
          },
        }),
      };
    }),
  );
  return cardSchema.parse({
    $schema: CARD_SCHEMA_URL,
    version: 1,
    id: `${PROD_URL}/${profile.username}`,
    address: `https://${EMOJI_DOMAIN}/${profile.username}`,
    handle: profile.username,
    name: profile.name || profile.username,
    photo: profile.image,
    country: profile.country_code === "XX" ? null : profile.country_code,
    bio: profile.bio,
    links,
    formats: formatsOf(profile.username),
    agent: null,
  });
}
