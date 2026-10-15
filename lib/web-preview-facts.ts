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
