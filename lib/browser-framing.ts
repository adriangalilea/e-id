import {
  type Unfurl,
  unfurl,
} from "@/lib/web-preview-unfurl"

/** A page for the browser to show live: framed, or, refused, drawn from its facts. */
export type LivePage =
  | { url: string; frames: true }
  | {
      url: string
      frames: false
      /** Why, as the header said it (`x-frame-options: deny`). */
      reason: string
      /** The page's unfurl, drawn in its place. */
      facts: Unfurl
    }

export type Framing = { frames: true } | { frames: false; reason: string }

/** One source of a `frame-ancestors` list matched against the origin that frames. */
function admits(source: string, origin: URL): boolean {
  if (source === "*") return true
  if (/^[a-z][a-z0-9+.-]*:$/i.test(source)) return origin.protocol === source
  const m = /^(?:([a-z][a-z0-9+.-]*):\/\/)?(\*\.)?([^/:]+)(?::(\d+|\*))?/i.exec(
    source,
  )
  if (!m) return false
  const [, scheme, wild, host, port] = m
  if (scheme && `${scheme}:` !== origin.protocol) return false
  if (port && port !== "*" && port !== origin.port) return false
  return wild ? origin.hostname.endsWith(`.${host}`) : origin.hostname === host
}

/** Whether `url` may be framed by a page at `origin` (absent: any foreign origin,
 *  so only a page that allows every origin frames). Reads the headers of the page as
 *  served after redirects. THROWS on a page that does not answer 2xx: a frame of an
 *  error page is no live page. */
export async function framing(url: string, origin?: string): Promise<Framing> {
  const href = /^https?:\/\//.test(url) ? url : `https://${url}`
  const res = await fetch(href, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  })
  if (!res.ok) throw new Error(`framing ${href}: HTTP ${res.status}`)
  await res.body?.cancel()
  const page = new URL(res.url || href)
  const by = origin ? new URL(origin) : null
  // CSP's frame-ancestors decides where it is sent; X-Frame-Options only where not.
  const csp = res.headers.get("content-security-policy")
  const ancestors = csp
    ?.split(/[;,]/)
    .map((d) => d.trim().split(/\s+/))
    .find((d) => d[0]?.toLowerCase() === "frame-ancestors")
  if (ancestors) {
    const sources = ancestors.slice(1)
    const said = `frame-ancestors ${sources.join(" ")}`
    if (sources.includes("'none'")) return { frames: false, reason: said }
    const ok = sources.some((s) =>
      s === "'self'"
        ? by?.origin === page.origin
        : s === "*" || (by !== null && admits(s, by)),
    )
    return ok ? { frames: true } : { frames: false, reason: said }
  }
  const xfo = res.headers.get("x-frame-options")?.trim().toLowerCase()
  if (xfo === "deny") return { frames: false, reason: "x-frame-options: deny" }
  if (xfo === "sameorigin" && by?.origin !== page.origin)
    return { frames: false, reason: "x-frame-options: sameorigin" }
  if (xfo?.startsWith("allow-from"))
    return { frames: false, reason: `x-frame-options: ${xfo}` }
  return { frames: true }
}

/** A page ready for the browser: framed when it allows `origin`, else its unfurl. */
export async function livePage(
  url: string,
  origin?: string,
): Promise<LivePage> {
  const href = /^https?:\/\//.test(url) ? url : `https://${url}`
  const f = await framing(href, origin)
  return f.frames
    ? { url: href, frames: true }
    : { url: href, frames: false, reason: f.reason, facts: await unfurl(href) }
}
