/** Names no one can hold: e-ID's own, kept before short names are sold
 *  (lib/username-rules), since each is a path at the root or an address at
 *  `@eid.to` someone would otherwise own. */
export const forbiddenUsernames: string[] = [
  "ninja",
  "null",
  "",
  // The site's own routes beside the profiles (app/api, app/dev, app/cli,
  // app/flags, app/embed.js, the old /about).
  "api",
  "dev",
  "cli",
  "flags",
  "embed",
  "about",
  // The address the error page's card reads (components/notice).
  "error",
  // Paths e-ID will want: an account, its pages, its money, its words.
  "admin",
  "app",
  "www",
  "help",
  "login",
  "logout",
  "signin",
  "signup",
  "auth",
  "account",
  "settings",
  "edit",
  "new",
  "me",
  "you",
  "card",
  "cards",
  "blog",
  "docs",
  "status",
  "terms",
  "privacy",
  "pricing",
  "premium",
  "support",
  "static",
  "assets",
  // Addresses a mail domain keeps for itself (`you@eid.to`, README).
  "mail",
  "email",
  "postmaster",
  "hostmaster",
  "webmaster",
  "abuse",
  "security",
  "noreply",
  "no-reply",
  "info",
  "contact",
  "hello",
  // The name itself.
  "e-id",
  "eid",
  "official",
  "team",
  "staff",
] as const

export const PROD_URL = "https://e-id.to"
export const MAIN_DOMAIN = "e-id.to"
export const SHORT_DOMAIN = "eid.to"
export const EMOJI_DOMAIN = "👤.to"
export const EMOJI_DOMAIN_PUNYCODE = "xn--mq8h.to"

/** The brand's address as browsers send it. Safari shows the emoji in its
 *  address bar, so Safari is served here (next.config). */
export const EMOJI_ORIGIN = `https://${EMOJI_DOMAIN_PUNYCODE}`

/** The card's own files under a person's address (app/[username]/<file>): named
 *  routes, which win over a link of the same name (app/[username]/[link]). A new
 *  file there is listed here, or a person could name a link of theirs after it. */
export const CARD_FILES = [
  "card.json",
  "card.svg",
  "card.vcf",
  "card.txt",
  "byline.svg",
  "opengraph-image",
] as const

/** The short names the card's files are also at (`/you/json`), rewritten to the
 *  file by next.config. */
export const CARD_SHORT: Record<string, (typeof CARD_FILES)[number]> = {
  json: "card.json",
  txt: "card.txt",
}

/** How long a sign-in lasts, in seconds: the session and its display cookie (lib/chip). */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7
