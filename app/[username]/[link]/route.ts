import { cardLinkOf, getProfile, getPublicLinks } from "@/lib/data"
import { platformNamed } from "@/lib/link-names"

// A LINK'S ROUTE: 👤.to/<username>/<name> opens their link on that platform
// (github, or gh; lib/link-names), their first public one of its kind: the
// `route` the card's data gives it (lib/card). A redirect, never a page of ours.
// Temporary (307): a person changes their links, and a browser that kept the
// old one would send people to it. The card's own files (card.json, card.svg,
// card.vcf) are named routes beside this one, and win over it.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string; link: string }> },
) {
  const { username, link: name } = await params
  const platform = platformNamed(name)
  if (!platform)
    return new Response(`no link is called ${name}`, { status: 404 })
  const profile = await getProfile(username)
  if (!profile)
    return new Response(`no e-ID is called ${username}`, { status: 404 })
  const link = (await getPublicLinks(profile.id)).find(
    (l) => l.platform === platform && l.value,
  )
  if (!link)
    return new Response(`${username} has no public ${platform}`, {
      status: 404,
    })
  return Response.redirect(cardLinkOf(link).url, 307)
}
