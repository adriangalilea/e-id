import { EMOJI_ORIGIN, PROD_URL } from "@/lib/const"

// SIGNING IN ON THE EMOJI DOMAIN. Safari is served on 👤.to (xn--mq8h.to), a
// different site from e-id.to, so it holds its own cookies. OAuth stays on
// e-id.to, the one callback GitHub and Google know, and the session is handed
// across in one redirect:
//
//   👤.to page ─ sign in ─▶ e-id.to/api/handoff/start   (OAuth begins on e-id.to)
//   GitHub ─▶ e-id.to/api/auth/callback/github           (session on e-id.to)
//         ─▶ e-id.to/api/handoff/issue                   (one-time token, 3 min, single use)
//         ─▶ 👤.to/api/handoff/claim                     (same session, cookie on 👤.to)
//         ─▶ the page the user signed in from
//
// Both hosts then hold a cookie for the SAME session row: signing out on either
// deletes it for both. Every hop is a top-level navigation, so each cookie is
// first-party where it is set and Safari's tracking prevention has nothing to
// block. The routes live under /api, which next.config's host redirects never
// touch.

export const HANDOFF_PROVIDERS = ["github", "google"] as const
export type HandoffProvider = (typeof HANDOFF_PROVIDERS)[number]

/** A path on this site to come back to: "/", "/name", never another origin. */
export function isLocalPath(path: string | null): path is string {
  return (
    path?.startsWith("/") === true &&
    !path.startsWith("//") &&
    !path.includes("\\")
  )
}

/** Where a 👤.to page sends the browser to sign in. */
export function handoffStartUrl(provider: HandoffProvider, to: string) {
  const url = new URL("/api/handoff/start", PROD_URL)
  url.searchParams.set("provider", provider)
  url.searchParams.set("to", to)
  return url.toString()
}

/** Where OAuth returns, on e-id.to: relative, better-auth resolves it on its
 *  baseURL. */
export function handoffIssuePath(to: string) {
  return `/api/handoff/issue?to=${encodeURIComponent(to)}`
}

/** Where e-id.to hands the session to 👤.to. */
export function handoffClaimUrl(token: string, to: string) {
  const url = new URL("/api/handoff/claim", EMOJI_ORIGIN)
  url.searchParams.set("token", token)
  url.searchParams.set("to", to)
  return url.toString()
}
