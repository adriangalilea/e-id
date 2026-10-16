// WHY A LINK WAS TAKEN DOWN, in a person's words: a Web Risk threat
// (lib/web-risk) or an admin's hand. Client-safe, so the owner's list and the
// link's preview say it the same way.

/** What Web Risk is asked about. Malware and phishing are the two that get a
 *  whole domain flagged; unwanted software rides along at no cost. */
export const THREATS = [
  "MALWARE",
  "SOCIAL_ENGINEERING",
  "UNWANTED_SOFTWARE",
] as const
export type Threat = (typeof THREATS)[number]

const WORDS: Record<Threat | "admin", string> = {
  MALWARE: "taken down: Web Risk lists it as malware",
  SOCIAL_ENGINEERING: "taken down: Web Risk lists it as phishing",
  UNWANTED_SOFTWARE: "taken down: Web Risk lists it as unwanted software",
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
