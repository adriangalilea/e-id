import { after } from "next/server"
import { cardLinkOf, getProfile, getPublicLinks, openOwnLink } from "@/lib/data"
import { LINK_SLUG, platformNamed } from "@/lib/link-names"
import { renamedAnswer } from "@/lib/renamed"
import { hits, visitsEnabled } from "@/lib/visit-store"
import { isCrawler } from "@/lib/visits"

// A LINK'S ROUTE: 👤.to/<username>/<name> opens their link on that platform
// (github, or gh; lib/link-names), their first public one of its kind: the
// `route` the card's data gives it (lib/card). A redirect, never a page of ours.
// Temporary (307): a person changes their links, and a browser that kept the
// old one would send people to it. The card's own files (lib/const, `CARD_FILES`)
// are named routes beside this one, and win over it.
//
// Any other name is one of their own links (a `link`, db/schema): `/you/cv`
// opens wherever they pointed it, on the card or not, until its day or its opens
// run out.
//
// A name that opens nothing of theirs (no such platform or link, a typo, a
// platform they have no public link on, a link that stopped) goes to their
// profile: the person was the point, and a 404 left the visitor with nothing.
// Only a person who does not exist is a 404.

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string; link: string }> },
) {
  const { username, link: name } = await params
  const profile = await getProfile(username)
  if (!profile)
    return (
      (await renamedAnswer(username, `/${name}`)) ??
      new Response(`no e-ID is called ${username}`, { status: 404 })
    )
  const platform = platformNamed(name)
  const link = platform
    ? (await getPublicLinks(profile.id)).find(
        (l) => l.platform === platform && l.value,
      )
    : undefined
  // Not a platform's: one of their own links, by its address name, counted as
  // it opens unless a crawler asked (lib/data `openOwnLink`).
  const own =
    !platform && LINK_SLUG.test(name.toLowerCase())
      ? await openOwnLink(
          profile.id,
          name,
          !isCrawler(request.headers.get("user-agent") ?? ""),
        )
      : null
  const to = link ? cardLinkOf(link).url : own
  // Counted once answered (lib/visit-store): what was asked for, and what it
  // opened, null where nothing: a link people want that the person has not got,
  // or one of theirs that stopped opening.
  if (visitsEnabled)
    after(() =>
      hits()(request, {
        owner: profile.id,
        name: name.toLowerCase(),
        opened: link ? link.platform : own ? "link" : null,
      }),
    )
  if (!to) return Response.redirect(new URL(`/${username}`, request.url), 307)
  return Response.redirect(to, 307)
}
