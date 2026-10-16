// THE FACTS OF A LINK. A web preview is drawn from six facts: the url, the site, a
// title, a description, an image, an icon. This module owns their type and how a link
// is written and shown (`hrefOf`, `hostOf`), and fetches nothing, so it is safe in a
// browser: the card (web-preview) and the browser window read it there. The fetch that
// reads the facts from a page is `web-preview-unfurl`, a server's.

export interface Unfurl {
  url: string
  /** The site's own name (og:site_name), else its host. */
  site: string
  title: string
  description?: string
  /** Absolute URL of the preview image (og:image, twitter:image). */
  image?: string
  /** Absolute URL of the site's icon, when the page names one. */
  favicon?: string
}

/** A link as an address: as written when it names its scheme (`https://`,
 *  `file://`, which a fetch then refuses), else on https (`example.com/x`). */
export function hrefOf(url: string): string {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`
}

/** The host a link is shown as: no scheme, no `www.`, no path. */
export function hostOf(url: string): string {
  return new URL(hrefOf(url)).hostname.replace(/^www\./, "")
}
