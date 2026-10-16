// WHAT A PERSON IS TOLD ABOUT A LINK SAFE BROWSING FLAGGED, under Google's terms
// for its data (developers.google.com/safe-browsing/v4/usage-limits): a warning
// says what the page MAY do, never that it surely does; links to more about that
// kind of threat; carries "Advisory provided by Google"; and is shown only on an
// answer still valid when shown (minutes old), so only where Safe Browsing was
// just asked: refusing a link as it is saved, and a link's preview, which asks
// again (lib/safe-browsing). A link taken down days ago is told as e-ID's own
// act (`takenDown`), never as a warning. Client-safe, so the owner's list, the
// preview and the admin's list say it the same way.

/** What Safe Browsing answers with (v5 `ThreatType`, less its "unspecified"). */
export const THREATS = [
  "MALWARE",
  "SOCIAL_ENGINEERING",
  "UNWANTED_SOFTWARE",
  "POTENTIALLY_HARMFUL_APPLICATION",
] as const
export type Threat = (typeof THREATS)[number]

export const isThreat = (x: string): x is Threat =>
  (THREATS as readonly string[]).includes(x)

/** The attribution every warning from Safe Browsing's data carries. */
export const ADVISORY = {
  text: "Advisory provided by Google",
  url: "https://developers.google.com/safe-browsing/v4/advisory",
} as const

/** A warning for each threat, in qualified words (Google's suggested ones, cut
 *  to a line), and where to read more about that kind. */
export const WARNINGS: Record<Threat, { says: string; more: string }> = {
  SOCIAL_ENGINEERING: {
    says: "This address may be a phishing page: it could try to trick you into giving away a password or a card number.",
    more: "https://www.antiphishing.org/",
  },
  MALWARE: {
    says: "This address may harm your computer: it is suspected of installing malware.",
    more: "https://developers.google.com/search/docs/monitor-debug/security/malware",
  },
  UNWANTED_SOFTWARE: {
    says: "This address may try to install software that makes unwanted changes to your device.",
    more: "https://www.google.com/about/unwanted-software-policy.html",
  },
  POTENTIALLY_HARMFUL_APPLICATION: {
    says: "This address may offer an app suspected of harming your device.",
    more: "https://developers.google.com/android/play-protect/potentially-harmful-applications",
  },
}

/** A warning as one line of text, for where only text goes (a form's error, a
 *  terminal): the warning, where to read more, the attribution. */
export const warningText = (threat: Threat) =>
  `${WARNINGS[threat].says} More: ${WARNINGS[threat].more} · ${ADVISORY.text} (${ADVISORY.url})`

/** That a link is down, as e-ID's own act: a safety check took it down, or an
 *  admin. Throws on a reason nobody wrote: a bug, never a word to show. */
export function takenDown(why: string): string {
  if (why === "admin") return "taken down by e-ID"
  if (isThreat(why)) return "taken down by e-ID after a safety check"
  throw new Error(`a link taken down for "${why}"`)
}
