import type { SelectLink } from "@/db/schema"
import type { LinkPlatform } from "@/lib/platforms"

// The card a visitor fills on the home, as data: its shape and what is computed
// from it, read by the browser that keeps it (lib/draft) and by the server that
// claims it or reads its links (db/actions). No React, no browser.

/** The card a visitor fills on the home before they have an account: what they
 *  wrote on it, kept in the browser (lib/draft) so it is still theirs after a
 *  reload and after signing in, when the account takes it. */
export type Draft = {
  name: string
  /** Already a valid username's characters (`toHandle`). */
  handle: string
  /** ISO 3166 alpha-2, "XX" for none. */
  country: string
  /** Their links, in the order they were added; a value is the username, the
   *  address or the URL there. */
  links: DraftLink[]
  /** The photo, GitHub's for the GitHub link (`Filled`); none until it answers. */
  image: string | null
  /** What GitHub filled in for which login, so a fill for another login replaces
   *  it, and never what the visitor wrote themselves (`fill`). */
  auto: Filled | null
  /** Signing in to make it theirs: set by the address's claim, so the account
   *  the sign-in comes back with takes the card (components/landing/hero-cards,
   *  `Claim`). */
  claiming: boolean
}

export type DraftLink = { platform: LinkPlatform; value: string }

/** What a fill from GitHub put on the card. */
export type Filled = {
  login: string
  name: string | null
  handle: string
  country: string | null
  image: string
  links: DraftLink[]
}

/** What is written on the card and claimed with it: none of the browser's own
 *  state, and no photo (the account's is its provider's, set at sign-up). */
export type Written = Omit<Draft, "claiming" | "auto" | "image">

export const BLANK: Draft = {
  name: "",
  handle: "",
  country: "XX",
  links: [],
  image: null,
  auto: null,
  claiming: false,
}

/** Nothing on the card at all. */
export function isBlank(draft: Draft): boolean {
  return (
    !draft.name &&
    !draft.handle &&
    draft.country === "XX" &&
    !draft.links.length
  )
}

/** The links that say where: written, not still being written. */
export function filledLinks(draft: Draft): DraftLink[] {
  return draft.links.filter((l) => l.value.trim() !== "")
}

/** The card's links as a profile's, public and in their order, for what draws a
 *  profile before the account exists (its presence, its sections). */
export function asLinks(links: DraftLink[]): SelectLink[] {
  return links.map((link, order) => ({
    id: `${link.platform}-${order}`,
    user_id: null,
    platform: link.platform,
    value: link.value.trim(),
    label: null,
    image: null,
    order,
    note: null,
    public: true,
    custom_data: {},
    slug: null,
    expires_at: null,
    max_visits: null,
    visits: 0,
    created_at: null,
    checked_at: null,
    stopped_at: null,
    stopped_why: null,
  }))
}

/** The card with GitHub's answer for its GitHub link laid on it (`next`, null
 *  when GitHub has no such person or the link is gone): each field the last fill
 *  wrote and the visitor left as it was takes the new fill's, an empty one takes
 *  it too, and anything the visitor wrote stays. The links the last fill added
 *  and the visitor left go; the new fill's join where the card has none on that
 *  platform. */
export function fill(draft: Draft, next: Filled | null): Partial<Draft> {
  const last = draft.auto
  const keep = <T>(now: T, was: T | undefined, empty: T) =>
    now !== empty && now !== was
  const added = (l: DraftLink) =>
    last?.links.some((a) => a.platform === l.platform && a.value === l.value)
  const kept = draft.links.filter((l) => !added(l))
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
    links: [
      ...kept,
      ...(next?.links ?? []).filter(
        (l) => !kept.some((k) => k.platform === l.platform),
      ),
    ],
    auto: next,
  }
}

/** What a username may hold (lib/username), as the visitor types: lowercase, and
 *  every other character dropped. */
export function toHandle(typed: string): string {
  return typed.toLowerCase().replace(/[^a-z0-9_-]/g, "")
}
