import { signIn } from "@/lib/auth-client"
import { EMOJI_DOMAIN_PUNYCODE } from "@/lib/const"
import { type HandoffProvider, handoffStartUrl } from "@/lib/handoff"

/** Signs in from the page the browser is on and comes back to it, signed in, or
 *  with why not in `?error=` (said by the bar, components/footer). On 👤.to the
 *  OAuth runs on e-id.to and the session is handed back (lib/handoff); anywhere
 *  else better-auth signs in on this host. Browser only. Settles only if it
 *  fails: on success the page leaves for the provider, so whatever waits on it
 *  (@ag/account-menu's busy press) waits until then. */
export function startSignIn(provider: HandoffProvider): Promise<void> {
  const here = window.location.pathname
  if (window.location.hostname === EMOJI_DOMAIN_PUNYCODE) {
    window.location.assign(handoffStartUrl(provider, here))
    return new Promise(() => {})
  }
  return signIn
    .social({ provider, callbackURL: here, errorCallbackURL: here })
    .then(({ error }) => {
      if (error) throw new Error(`sign in with ${provider}: ${error.message}`)
      return new Promise<void>(() => {})
    })
}

/** The query parameter better-auth returns a failed sign-in's reason in. */
export const SIGN_IN_ERROR_PARAM = "error"

/** A failed sign-in's reason (better-auth's error code) as the person reads it:
 *  what happened and what to do. Better-auth's codes are listed in its
 *  reference (docs/reference/errors); any other is said as itself. */
export function signInErrorMessage(code: string): string {
  switch (code) {
    case "account_not_linked":
      return "This email already has an e-ID, made with your other sign-in. Use that one."
    case "access_denied":
      return "The sign-in was cancelled."
    case "state_mismatch":
    case "state_not_found":
    case "state_invalid":
      return "The sign-in took too long or was opened twice. Try again."
    case "email_not_found":
      return "Your provider shared no email. Make one visible to it, or use another sign-in."
    default:
      return `Try again. If it keeps happening, tell us: ${code}.`
  }
}
