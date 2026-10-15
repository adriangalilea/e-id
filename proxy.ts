import { type NextRequest, NextResponse } from "next/server"
import { aliasOf } from "@/lib/alias-table"

// AN OLD NAME'S PAGE, answered before the page: a permanent redirect to the name
// it is now (lib/alias-table). The page cannot send one itself: its loading state
// has been sent before it knows the name is an alias, so it can only refresh, which
// a link preview does not follow. Only a person's page passes here; what is under a
// name (`/old/gh`, `/old/card.json`) is a route that redirects on its own.

export async function proxy(request: NextRequest) {
  const to = await aliasOf(request.nextUrl.pathname.slice(1))
  if (!to) return NextResponse.next()
  const url = request.nextUrl.clone()
  url.pathname = `/${to}`
  return NextResponse.redirect(url, 308)
}

export const config = {
  matcher: "/:username([A-Za-z0-9_-]+)",
}
