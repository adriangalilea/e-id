import { cardLinkOf, getProfile, getPublicLinks } from "@/lib/data"
import { platformNamed } from "@/lib/link-names"
import { renamedAnswer } from "@/lib/renamed"

// A LINK'S ROUTE: 👤.to/<username>/<name> opens their link on that platform
// (github, or gh; lib/link-names), their first public one of its kind: the
// `route` the card's data gives it (lib/card). A redirect, never a page of ours.
// Temporary (307): a person changes their links, and a browser that kept the
// old one would send people to it. The card's own files (lib/const, `CARD_FILES`)
// are named routes beside this one, and win over it.
//
// A name that opens nothing of theirs (no such platform, a typo, a platform they
// have no public link on) goes to their profile: the person was the point, and a
// 404 left the visitor with nothing. Only a person who does not exist is a 404.

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string; link: string }> },
) {
  const { username, link: name } = await params
  const profile = await getProfile(username)
  if (!profile)
    return (
      (await renamedAnswer(request, username, `/${name}`)) ??
      new Response(`no e-ID is called ${username}`, { status: 404 })
    )
  const platform = platformNamed(name)
  const link = platform
    ? (await getPublicLinks(profile.id)).find(
        (l) => l.platform === platform && l.value,
      )
    : undefined
  if (!link) return Response.redirect(new URL(`/${username}`, request.url), 307)
  return Response.redirect(cardLinkOf(link).url, 307)
}
