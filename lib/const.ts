export const forbiddenUsernames: string[] = [
  "ninja",
  "null",
  "",
  "about",
  // The site's own routes beside the profiles (app/api, app/dev).
  "api",
  "dev",
  // The address the error page's card reads (components/notice).
  "error",
] as const

export const PROD_URL = "https://e-id.to"
export const MAIN_DOMAIN = "e-id.to"
export const SHORT_DOMAIN = "eid.to"
export const EMOJI_DOMAIN = "👤.to"
export const EMOJI_DOMAIN_PUNYCODE = "xn--mq8h.to"

/** The brand's address as people read it, and as browsers send it. Safari shows
 *  the emoji in its address bar, so Safari is served here (next.config). */
export const EMOJI_URL = `https://${EMOJI_DOMAIN}`
export const EMOJI_ORIGIN = `https://${EMOJI_DOMAIN_PUNYCODE}`

/** How long a sign-in lasts, in seconds: the session and its display cookie (lib/chip). */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7
