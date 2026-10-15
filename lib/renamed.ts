import "server-only"

import { renamedTo } from "@/lib/data"

// AN OLD NAME STILL ARRIVES. Every route under a username asks this where the name
// found nobody, before it answers 404: a name someone used to have, or one more they
// hold (db/schema `usernameAliases`), answers with a permanent redirect to the same
// thing under their username, so every link already out there keeps working.

/** A 308 to `rest` (`/card.json`, `/gh`, or nothing for the page) under the
 *  username `username` now answers to, or null when it answers to nobody. */
export async function renamedAnswer(
  request: Request,
  username: string,
  rest = "",
): Promise<Response | null> {
  const to = await renamedTo(username)
  if (!to) return null
  return Response.redirect(new URL(`/${to}${rest}`, request.url), 308)
}
