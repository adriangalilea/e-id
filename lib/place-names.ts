import type { SocialPlatform } from "@/db/schema";

// A PLACE BY NAME, after a person's address: 👤.to/adriangalilea/github opens
// their GitHub, and so does /gh. The name a place goes by in an address, and
// the short names people type for it. One table: the redirect (app/[username]/
// [place]) reads it, and the home shows the names it gives (features).

export const PLACE_NAMES: Record<SocialPlatform, readonly string[]> = {
  github: ["github", "gh"],
  twitter: ["twitter", "x", "tw"],
  youtube: ["youtube", "yt"],
  instagram: ["instagram", "ig"],
  telegram: ["telegram", "tg"],
  email: ["email", "mail"],
  website: ["website", "web", "site"],
  self: ["self"],
};

/** The platform a name in an address stands for, or null for none. */
export function platformNamed(name: string): SocialPlatform | null {
  const wanted = name.toLowerCase();
  for (const [platform, names] of Object.entries(PLACE_NAMES))
    if (names.includes(wanted)) return platform as SocialPlatform;
  return null;
}

/** The shortest name a place goes by, the one the home shows. */
export function shortName(platform: SocialPlatform): string {
  const names = PLACE_NAMES[platform];
  return names.reduce((a, b) => (b.length < a.length ? b : a));
}
