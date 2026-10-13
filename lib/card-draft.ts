import type { SelectSocial, SocialPlatform } from "@/db/schema";

// The card a visitor fills on the home, as data: its shape and what is computed
// from it, read by the browser that keeps it (lib/draft) and by the server that
// claims it or reads its places (db/actions). No React, no browser.

/** The card a visitor fills on the home before they have an account: what they
 *  wrote on it, kept in the browser (lib/draft) so it is still theirs after a
 *  reload and after signing in, when the account takes it. */
export type Draft = {
  name: string;
  /** Already a valid username's characters (`toHandle`). */
  handle: string;
  /** ISO 3166 alpha-2, "XX" for none. */
  country: string;
  /** Where they are, in the order they were added; a value is the username, the
   *  address or the URL there. */
  places: Place[];
  /** The photo, GitHub's for the GitHub place (`Filled`); none until it answers. */
  image: string | null;
  /** What GitHub filled in for which login, so a fill for another login replaces
   *  it, and never what the visitor wrote themselves (`fill`). */
  auto: Filled | null;
  /** Signing in to make it theirs: set by the address's claim, so the account
   *  the sign-in comes back with takes the card (components/landing/hero-cards,
   *  `Claim`). */
  claiming: boolean;
};

export type Place = { platform: SocialPlatform; value: string };

/** What a fill from GitHub put on the card. */
export type Filled = {
  login: string;
  name: string | null;
  handle: string;
  country: string | null;
  image: string;
  places: Place[];
};

/** What is written on the card and claimed with it: none of the browser's own
 *  state, and no photo (the account's is its provider's, set at sign-up). */
export type Written = Omit<Draft, "claiming" | "auto" | "image">;

export const BLANK: Draft = {
  name: "",
  handle: "",
  country: "XX",
  places: [],
  image: null,
  auto: null,
  claiming: false,
};

/** Nothing on the card at all. */
export function isBlank(draft: Draft): boolean {
  return (
    !draft.name && !draft.handle && draft.country === "XX" && !draft.places.length
  );
}

/** The places that say where: written, not still being written. */
export function filledPlaces(draft: Draft): Place[] {
  return draft.places.filter((p) => p.value.trim() !== "");
}

/** The card's places as a profile's socials, public and in their order, for what
 *  draws a profile before the account exists (its presence, its sections). */
export function asSocials(places: Place[]): SelectSocial[] {
  return places.map((place, order) => ({
    id: `${place.platform}-${order}`,
    user_id: null,
    platform: place.platform,
    value: place.value.trim(),
    image: null,
    order,
    context_message: null,
    public: true,
    custom_data: {},
  }));
}

/** The card with GitHub's answer for its GitHub place laid on it (`next`, null
 *  when GitHub has no such person or the place is gone): each field the last
 *  fill wrote and the visitor left as it was takes the new fill's, an empty one
 *  takes it too, and anything the visitor wrote stays. The places the last fill
 *  added and the visitor left go; the new fill's join where the card has none on
 *  that platform. */
export function fill(draft: Draft, next: Filled | null): Partial<Draft> {
  const last = draft.auto;
  const keep = <T>(now: T, was: T | undefined, empty: T) =>
    now !== empty && now !== was;
  const added = (p: Place) =>
    last?.places.some((l) => l.platform === p.platform && l.value === p.value);
  const kept = draft.places.filter((p) => !added(p));
  return {
    name: keep(draft.name, last?.name ?? undefined, "")
      ? draft.name
      : (next?.name ?? ""),
    handle: keep(draft.handle, last?.handle, "")
      ? draft.handle
      : (next?.handle ?? ""),
    country: keep(draft.country, last?.country ?? undefined, "XX")
      ? draft.country
      : (next?.country ?? "XX"),
    image: next?.image ?? null,
    places: [
      ...kept,
      ...(next?.places ?? []).filter(
        (p) => !kept.some((k) => k.platform === p.platform),
      ),
    ],
    auto: next,
  };
}

/** What a username may hold (lib/username), as the visitor types: lowercase, and
 *  every other character dropped. */
export function toHandle(typed: string): string {
  return typed.toLowerCase().replace(/[^a-z0-9_-]/g, "");
}
