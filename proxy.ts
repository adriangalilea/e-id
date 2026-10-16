import { type NextRequest, NextResponse } from "next/server"
import { aliasOf } from "@/lib/alias-table"

// TWO ANSWERS BEFORE THE PAGE.
//
// An old name's page: a permanent redirect to the name it is now
// (lib/alias-table). The page cannot send one itself: its loading state has been
// sent before it knows the name is an alias, so it can only refresh, which a link
// preview does not follow. What is under a name (`/old/gh`, `/old/card.json`) is a
// route that redirects on its own.
//
// A link's preview, `/you/<name>+` (bit.ly's convention): shown at that address,
// the link's own page under it (app/[username]/[link]/preview), so whoever
// distrusts a link sees whose it is and where it goes before opening it, and
// the open is never used.

const PREVIEW = /^\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)\+$/

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone()
  const preview = PREVIEW.exec(url.pathname)
  if (preview) {
    const [, name, link] = preview
    const to = await aliasOf(name as string)
    if (to) {
      url.pathname = `/${to}/${link}+`
      return NextResponse.redirect(url, 308)
    }
    url.pathname = `/${name}/${link}/preview`
    return NextResponse.rewrite(url)
  }
  const to = await aliasOf(url.pathname.slice(1))
  if (!to) return NextResponse.next()
  url.pathname = `/${to}`
  return NextResponse.redirect(url, 308)
}

export const config = {
  matcher: [
    "/:username([A-Za-z0-9_-]+)",
    "/:username([A-Za-z0-9_-]+)/:link([A-Za-z0-9_-]+\\+)",
  ],
}
