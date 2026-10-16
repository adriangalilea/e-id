import { after } from "next/server"
import {
  cardLinkOf,
  getProfile,
  getPublicLinks,
  openOwnLink,
  type Profile,
  readOwnLink,
  stillOpens,
} from "@/lib/data"
import { LINK_SLUG, platformNamed } from "@/lib/link-names"
import { ANYWHERE } from "@/lib/link-safety"
import { renamedAnswer } from "@/lib/renamed"
import { peekSend } from "@/lib/sends"
import { getSession } from "@/lib/session"
import { unsureOf } from "@/lib/trust"
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
// A link that goes wherever its owner wrote (a website, a link of their own:
// lib/link-safety) and that e-ID is not sure of (an account in its first week,
// a destination Safe Browsing never answered for: lib/trust `unsureOf`) opens its
// preview instead, `/you/<name>+`: whose it is and where it goes, then the way
// on, a form posted here (POST, below), so a pasted address can never skip it.
// Its open is counted there, on the way on, never on the look.
//
// A name that opens nothing of theirs (no such platform or link, a typo, a
// platform they have no public link on, a link that stopped) goes to their
// profile: the person was the point, and a 404 left the visitor with nothing.
// Only a person who does not exist is a 404.

type Params = { params: Promise<{ username: string; link: string }> }

const previewOf = (request: Request, username: string, name: string) =>
  new URL(`/${username}/${name.toLowerCase()}+`, request.url)

/** One of their own links, where `name` can be one. */
const ownName = (name: string) =>
  !platformNamed(name) && LINK_SLUG.test(name.toLowerCase())

/** Their public link on the platform `name` names, if it is one they have. */
async function platformLink(profile: Profile, name: string) {
  const platform = platformNamed(name)
  if (!platform) return undefined
  return (await getPublicLinks(profile.id)).find(
    (l) => l.platform === platform && l.value,
  )
}

export async function GET(request: Request, { params }: Params) {
  const { username, link: name } = await params
  const profile = await getProfile(username)
  if (!profile)
    return (
      (await renamedAnswer(username, `/${name}`)) ??
      new Response(`no e-ID is called ${username}`, { status: 404 })
    )
  const link = await platformLink(profile, name)
  // Read before it is opened, so one e-ID is not sure of costs no open.
  const kept = ownName(name) ? await readOwnLink(profile.id, name) : null
  const ownOpens = kept?.kind === "url" && stillOpens(kept)
  const anywhere = link ? ANYWHERE.includes(link.platform) : ownOpens
  const unsure = anywhere
    ? await unsureOf(
        profile.id,
        (link ? link.checked_at : kept?.checked_at) ?? null,
      )
    : null
  // Not a platform's: one of their own links, by its address name, counted as
  // it opens unless a crawler asked (lib/data `openOwnLink`).
  const own =
    ownOpens && !unsure
      ? await openOwnLink(
          profile.id,
          name,
          !isCrawler(request.headers.get("user-agent") ?? ""),
        )
      : null
  const to = unsure ? null : link ? cardLinkOf(link).url : own
  // Counted once answered (lib/visit-store): what was asked for, and what it
  // opened, null where nothing: a link people want that the person has not got,
  // or one of theirs that stopped opening. A preview in front of a link counts
  // as the link asked for.
  if (visitsEnabled)
    after(() =>
      hits()(request, {
        owner: profile.id,
        name: name.toLowerCase(),
        opened: link ? link.platform : own || unsure ? "link" : null,
      }),
    )
  if (unsure) return Response.redirect(previewOf(request, username, name), 307)
  if (to) return Response.redirect(to, 307)
  // A send (lib/sends) has no address to go to: its page says what it is and
  // how to get it, the open counted by `eid get` when the file is asked for. A
  // send for people opens its page to them alone, signed in; to anyone else its
  // address goes to the profile, as a name of theirs that opens nothing does.
  const shown =
    kept?.kind === "send" &&
    !kept.stopped_why &&
    (!kept.addressed ||
      (await peekSend(username, name, {
        userId: (await getSession())?.user.id ?? null,
        password: null,
      }).then((p) => p.ok)))
  if (shown) return Response.redirect(previewOf(request, username, name), 307)
  return Response.redirect(new URL(`/${username}`, request.url), 307)
}

/** The way on from a preview ("continue to …"): the open counted and the redirect
 *  (303, a form's answer). Where it stopped opening since the preview was drawn,
 *  back to the preview, which says why. */
export async function POST(request: Request, { params }: Params) {
  const { username, link: name } = await params
  const profile = await getProfile(username)
  if (!profile)
    return new Response(`no e-ID is called ${username}`, { status: 404 })
  const link = await platformLink(profile, name)
  const to = link
    ? cardLinkOf(link).url
    : ownName(name)
      ? await openOwnLink(profile.id, name, true)
      : null
  return Response.redirect(to ?? previewOf(request, username, name), 303)
}
