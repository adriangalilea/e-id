// THE HOME'S CAPTURES, as `pnpm links` (scripts/links.ts) writes them into
// lib/link-shots.json: one lead's profile on a laptop and on a phone, and the
// pages their links open, each the registry's `BrowserCapture` (@ag/browser,
// lib/browser-capture), drawn as it is. The one place the JSON is given its type.

import type { BrowserCapture } from "@/lib/browser-capture";
import MANIFEST from "@/lib/link-shots.json";

export type LinkShots = {
  /** Whose captures these are: the home's lead when they were taken. */
  handle: string;
  /** Their profile on a laptop. */
  profile: BrowserCapture;
  /** Their profile on a phone, with where its save is (`found.save`). */
  phone: BrowserCapture;
  /** The first page of each platform they link to, by platform. */
  shots: Partial<Record<string, BrowserCapture>>;
};

// JSON's strings are wider than the asset's kinds; scripts/links.ts writes it
// typed as `LinkShots`, which is what makes this cast true.
export const SHOTS = MANIFEST as LinkShots;
