export const forbiddenUsernames: string[] = [
  "ninja",
  "null",
  "",
  "about",
] as const;

export const PROD_URL = "https://e-id.to";
export const MAIN_DOMAIN = "e-id.to";
export const SHORT_DOMAIN = "eid.to";
export const EMOJI_DOMAIN = "👤.to";
export const EMOJI_DOMAIN_PUNYCODE = "xn--mq8h.to";

/** How long a sign-in lasts, in seconds: the session and its display cookie (lib/chip). */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
