"use client"

import { BrowserCapturePage } from "@/components/ui/browser"
import type { BrowserCapture } from "@/lib/browser-capture"

/** Where one route of the address lands: its end (app/[username]/[link]: /gh),
 *  where it redirects, and what is there: the site as it really looks (`shot`,
 *  captured by `pnpm captures`), or, where nothing is captured (an email's compose
 *  window), drawn here. */
export type Landing = {
  end: string
  /** Its link's platform's icon (lib/links, `getLinkIcon`). */
  icon: React.ReactNode
  url: string
  shot?: BrowserCapture
  page?: React.ReactNode
}

/** ONE LINK, and where each of its routes leads: the address itself (`home`) to
 *  the holder's profile (`profile`), then each route (`/gh`) to its link's real
 *  page (a capture: most sites refuse to be framed), each written as it is
 *  shared. */
export function routePages(
  home: string,
  profile: React.ReactNode,
  landings: Landing[],
): { address: string; page: React.ReactNode }[] {
  return [
    { address: home, page: profile },
    ...landings.map((l) => {
      const page = l.shot ? (
        <BrowserCapturePage key={l.end} capture={l.shot} />
      ) : (
        l.page
      )
      if (!page) throw new Error(`link-map: ${l.end} has nothing to show`)
      return { address: `${home}/${l.end}`, page }
    }),
  ]
}
