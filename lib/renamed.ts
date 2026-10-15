import "server-only"

import { renamedTo } from "@/lib/data"

// AN OLD NAME STILL ARRIVES. Every route under a username asks this where the name
// found nobody, before it answers 404: a name someone used to have, or one more they
// hold (db/schema `usernameAliases`), answers with a permanent redirect to the same
// thing under their username, so every link already out there keeps working.

/** A 308 to `rest` (`/card.json`, `/gh`, or nothing for the page) under the
 *  username `username` now answers to, or null when it answers to nobody. The
 *  address is relative, on whichever host was asked: the card's files are
 *  prerendered, where reading the request's own URL is refused. */
export async function renamedAnswer(
  username: string,
  rest = "",
): Promise<Response | null> {
  const to = await renamedTo(username)
  if (!to) return null
  return new Response(null, {
    status: 308,
    headers: { location: `/${to}${rest}` },
  })
}
