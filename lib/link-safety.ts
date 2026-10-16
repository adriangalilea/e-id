import "server-only"

import { getLinkUrl } from "@/lib/links"
import type { LinkPlatform } from "@/lib/platforms"
import { refusal, threatOf } from "@/lib/safe-browsing"
import { hrefOf } from "@/lib/web-preview-facts"

// A LINK THAT GOES WHEREVER ITS OWNER WROTE, asked of Safe Browsing before it is
// kept (lib/safe-browsing). A platform's link goes to that platform (github.com/<you>), so
// only these two can point somewhere bad: a website, and a link of your own
// (`/you/<name>`, on the card or a short link). Every writer of links asks here:
// the card, the short links, the card drafted at sign-up.

/** The platforms whose link goes wherever its owner wrote. */
export const ANYWHERE: readonly LinkPlatform[] = ["website", "link"]

/** Why the first of these destinations Safe Browsing lists is refused, or null when
 *  none is. Only what goes anywhere is asked; the rest pass unasked. */
export async function refusedDestination(
  written: { platform: LinkPlatform; value: string }[],
): Promise<string | null> {
  const asked = written.filter((w) => ANYWHERE.includes(w.platform))
  // A website is kept as its owner wrote it, often without its scheme: asked
  // as the address it opens.
  const threats = await Promise.all(
    asked.map((w) => threatOf(hrefOf(getLinkUrl(w.platform, w.value)))),
  )
  const threat = threats.find((t) => t !== null)
  return threat ? refusal(threat) : null
}
