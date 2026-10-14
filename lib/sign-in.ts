import { signIn } from "@/lib/auth-client";
import { EMOJI_DOMAIN_PUNYCODE } from "@/lib/const";
import { type HandoffProvider, handoffStartUrl } from "@/lib/handoff";

/** Signs in from the page the browser is on and comes back to it. On 👤.to the
 *  OAuth runs on e-id.to and the session is handed back (lib/handoff); anywhere
 *  else better-auth signs in on this host. Browser only. Settles only if it
 *  fails: on success the page leaves for the provider, so whatever waits on it
 *  (@ag/account-menu's busy press) waits until then. */
export function startSignIn(provider: HandoffProvider = "github"): Promise<void> {
  const here = window.location.pathname;
  if (window.location.hostname === EMOJI_DOMAIN_PUNYCODE) {
    window.location.assign(handoffStartUrl(provider, here));
    return new Promise(() => {});
  }
  return signIn.social({ provider, callbackURL: here }).then(({ error }) => {
    if (error) throw new Error(`sign in with ${provider}: ${error.message}`);
    return new Promise<void>(() => {});
  });
}
