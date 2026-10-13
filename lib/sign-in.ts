import { signIn } from "@/lib/auth-client";
import { EMOJI_DOMAIN_PUNYCODE } from "@/lib/const";
import { type HandoffProvider, handoffStartUrl } from "@/lib/handoff";

/** Signs in from the page the browser is on and comes back to it. On 👤.to the
 *  OAuth runs on e-id.to and the session is handed back (lib/handoff); anywhere
 *  else better-auth signs in on this host. Browser only. */
export function startSignIn(provider: HandoffProvider = "github") {
  const here = window.location.pathname;
  if (window.location.hostname === EMOJI_DOMAIN_PUNYCODE) {
    window.location.assign(handoffStartUrl(provider, here));
    return;
  }
  signIn.social({ provider, callbackURL: here });
}
