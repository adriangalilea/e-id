import "server-only";

import { EMOJI_DOMAIN, PROD_URL } from "@/lib/const";
import { getProfile, getPublicSocials, placeOf } from "@/lib/data";

// THE OPEN CARD FORMAT: an e-id card as data anyone can read, at
// /<username>/card.json, linked from the profile (<link rel="alternate">). One
// builder, `cardOf`, and everything that draws a card off the site reads what it
// returns: the share image, the embed, oEmbed. A field is added, never renamed
// or removed; `version` moves only when a reader would read it wrongly.

/** The media type a profile names its card by, in its `<link rel="alternate">`. */
export const CARD_TYPE = "application/vnd.e-id.card+json";

/** A person's card. */
export type Card = {
  version: 1;
  /** The profile's canonical address; what the card is about. */
  id: string;
  /** The address people share, on the emoji domain. */
  address: string;
  handle: string;
  /** The name they go by; the handle when they have set none. */
  name: string;
  /** An image of them, or null. */
  photo: string | null;
  /** ISO 3166-1 alpha-2, or null when unset. */
  country: string | null;
  bio: string | null;
  /** Where they are, in their order. */
  places: { platform: string; url: string }[];
  /** Their own agent, for a visitor's assistant to talk to: e-id points to it and
   *  runs none. Reserved; null until a person sets one. */
  agent: { mcp: string } | null;
};

/** The card of `username`, or null when nobody has that handle. */
export async function cardOf(username: string): Promise<Card | null> {
  const profile = await getProfile(username);
  if (!profile) return null;
  const socials = await getPublicSocials(profile.id);
  return {
    version: 1,
    id: `${PROD_URL}/${profile.username}`,
    address: `https://${EMOJI_DOMAIN}/${profile.username}`,
    handle: profile.username,
    name: profile.name || profile.username,
    photo: profile.image,
    country: profile.country_code === "XX" ? null : profile.country_code,
    bio: profile.bio,
    places: socials.map(placeOf),
    agent: null,
  };
}
