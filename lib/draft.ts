import { useSyncExternalStore } from "react";
import type { SocialPlatform } from "@/db/schema";

/** The card a visitor fills on the home before they have an account: what they
 *  wrote on it, kept in the browser (`localStorage`) so it is still theirs after a
 *  reload and after signing in, where picking the username starts from it. */
export type Draft = {
  name: string;
  /** Already a valid username's characters (`toHandle`). */
  handle: string;
  /** ISO 3166 alpha-2, "XX" for none. */
  country: string;
  places: SocialPlatform[];
  /** The photo, GitHub's for the handle (`Filled`); none until it answers. */
  image: string | null;
  /** What GitHub filled in for which login, so a fill for another login replaces
   *  it, and never what the visitor wrote themselves (`fill`). */
  auto: Filled | null;
  /** Signing in to make it theirs: set by the address's claim, so the account
   *  the sign-in comes back with takes the card (components/landing/hero-cards,
   *  `Claim`). */
  claiming: boolean;
};

/** What a fill from GitHub put on the card. */
export type Filled = {
  login: string;
  name: string | null;
  country: string | null;
  image: string;
  places: SocialPlatform[];
};

/** What is written on the card and claimed with it: none of the browser's own
 *  state, and no photo (the account's is its provider's, set at sign-up). */
export type Written = Omit<Draft, "claiming" | "auto" | "image">;

const KEY = "eid:draft";
const EMPTY: Draft = {
  name: "",
  handle: "",
  country: "XX",
  places: [],
  image: null,
  auto: null,
  claiming: false,
};

/** The card with GitHub's answer for its handle laid on it (`next`, null when
 *  GitHub has no such person): each field the last fill wrote and the visitor
 *  left as it was takes the new fill's, an empty one takes it too, and anything
 *  the visitor wrote stays. The places the last fill added and the new one does
 *  not go; the new one's join. */
export function fill(draft: Draft, next: Filled | null): Partial<Draft> {
  const last = draft.auto;
  const mine = <T>(now: T, was: T | undefined, empty: T) =>
    now !== empty && now !== was;
  const keptPlaces = draft.places.filter((p) => !last?.places.includes(p));
  return {
    name: mine(draft.name, last?.name ?? undefined, "")
      ? draft.name
      : (next?.name ?? ""),
    country: mine(draft.country, last?.country ?? undefined, "XX")
      ? draft.country
      : (next?.country ?? "XX"),
    image: next?.image ?? null,
    places: [
      ...keptPlaces,
      ...(next?.places ?? []).filter((p) => !keptPlaces.includes(p)),
    ],
    auto: next,
  };
}

/** What a username may hold (lib/username), as the visitor types: lowercase, and
 *  every other character dropped. */
export function toHandle(typed: string): string {
  return typed.toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

// One parsed draft per stored string, so the snapshot is stable between writes.
let cache: { raw: string | null; draft: Draft } = { raw: null, draft: EMPTY };

/** The draft as it is now, outside a render (an answer arriving). */
export function readDraft(): Draft {
  return read();
}

function read(): Draft {
  const raw = localStorage.getItem(KEY);
  if (raw !== cache.raw)
    cache = { raw, draft: raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY };
  return cache.draft;
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab writing the same draft.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The draft, empty on the server and until the browser's is read. */
export function useDraft(): Draft {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function writeDraft(patch: Partial<Draft>) {
  localStorage.setItem(KEY, JSON.stringify({ ...read(), ...patch }));
  for (const listener of listeners) listener();
}

/** The card handed over: blank again. */
export function clearDraft() {
  localStorage.removeItem(KEY);
  for (const listener of listeners) listener();
}
