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
};

const KEY = "eid:draft";
const EMPTY: Draft = { name: "", handle: "", country: "XX", places: [] };

/** What a username may hold (lib/username), as the visitor types: lowercase, and
 *  every other character dropped. */
export function toHandle(typed: string): string {
  return typed.toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

// One parsed draft per stored string, so the snapshot is stable between writes.
let cache: { raw: string | null; draft: Draft } = { raw: null, draft: EMPTY };

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
