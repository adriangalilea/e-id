// WHY A LINK WAS TAKEN DOWN, in a person's words: a Safe Browsing threat
// (lib/safe-browsing) or an admin's hand. Client-safe, so the owner's list, the
// link's preview and the admin's list say it the same way.

/** What Safe Browsing answers with (v5 `ThreatType`, less its "unspecified"). */
export const THREATS = [
  "MALWARE",
  "SOCIAL_ENGINEERING",
  "UNWANTED_SOFTWARE",
  "POTENTIALLY_HARMFUL_APPLICATION",
] as const
export type Threat = (typeof THREATS)[number]

const WORDS: Record<Threat | "admin", string> = {
  MALWARE: "taken down: Google Safe Browsing lists it as malware",
  SOCIAL_ENGINEERING: "taken down: Google Safe Browsing lists it as phishing",
  UNWANTED_SOFTWARE:
    "taken down: Google Safe Browsing lists it as unwanted software",
  POTENTIALLY_HARMFUL_APPLICATION:
    "taken down: Google Safe Browsing lists it as a harmful app",
  admin: "taken down by e-ID",
}

/** That a link is down and why, from its `stopped_why`. Throws on anything else:
 *  a reason nobody wrote is a bug, never a word to show. */
export function takenDown(why: string): string {
  if (!(why in WORDS)) throw new Error(`a link taken down for "${why}"`)
  return WORDS[why as keyof typeof WORDS]
}

export const isThreat = (x: string): x is Threat =>
  (THREATS as readonly string[]).includes(x)
