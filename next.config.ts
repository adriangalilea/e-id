import type { NextConfig } from "next"
import { EMOJI_DOMAIN_PUNYCODE, MAIN_DOMAIN, SHORT_DOMAIN } from "./lib/const"

// Every path a person can open, never the auth API or the build's assets: the
// OAuth callback must land on the host it was sent from.
const PAGES = "/:path((?!api/|_next/).*)"

const escaped = (domain: string) => domain.replaceAll(".", "\\.")
const host = (...domains: string[]) =>
  `(?:www\\.)?(?:${domains.map(escaped).join("|")})`

// Safari shows the emoji domain in its address bar (👤.to) and Chrome does not,
// so Safari is sent to the emoji domain and everything else to e-id.to. These run
// in Vercel's router, before any function and before the cache.
const SAFARI = ".*Version/.*Safari.*"
const NOT_SAFARI = ".*(?:Chrome|CriOS).*"
/** A command-line client: answered with the card as text, on whichever domain it
 *  asked, since it does not follow a redirect unless told to (`curl -L`). */
const CLI = "(?:curl|Wget|HTTPie|xh)/.*"

const nextConfig: NextConfig = {
  cacheComponents: true,
  // One prefetch per route (its static shell), shared by every link to it: the
  // home's pile of cards links to a dozen profiles, which were a prefetch each.
  partialPrefetching: true,
  // The share image's renderer is a native addon (lib/card-image): loaded from
  // node_modules at run time, never bundled.
  serverExternalPackages: ["@resvg/resvg-js"],
  // The home's captures (public/links, `pnpm captures`) are named with their
  // content's hash as a query (`?v=`), so one taken again is a new address to
  // the image loader's cache; every other local picture has none.
  images: {
    localPatterns: [{ pathname: "/links/**" }, { pathname: "/**", search: "" }],
  },
  // The card's fonts are read from disk by the renderer that draws it (the share
  // image, the embed's card and byline); the trace is told, since a path built from
  // process.cwd() is not followed. Pages that embed a card load the same files
  // straight from the CDN (`headers`, below).
  outputFileTracingIncludes: {
    "/[username]/opengraph-image": ["./public/fonts/*.ttf"],
    "/[username]/card.svg": ["./public/fonts/*.ttf"],
    "/[username]/byline.svg": ["./public/fonts/*.ttf"],
  },
  // The fonts, for pages on other origins (the embed): readable across origins,
  // and kept a year (their names change with them).
  async headers() {
    return [
      {
        source: "/fonts/:file*",
        headers: [
          { key: "access-control-allow-origin", value: "*" },
          {
            key: "cache-control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ]
  },
  // A person's contact (app/[username]/card.vcf) at the address people share
  // with `.vcf` on it, and at the profile's own address when what is asked for
  // is a vCard (`Accept: text/vcard`): one address, its HTML or its contact.
  // Before the file system, so the profile's page never answers either; in
  // Vercel's router, before its cache, so the contact is cached as its own path
  // and never served for the page (a page's `Vary` is Next's own: one set here
  // is dropped).
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/:username([A-Za-z0-9_-]+)\\.vcf",
          destination: "/:username/card.vcf",
        },
        {
          source: "/:username([A-Za-z0-9_-]+)",
          has: [
            { type: "header", key: "accept", value: ".*text/(?:x-)?vcard.*" },
          ],
          destination: "/:username/card.vcf",
        },
        // The card as data (lib/card-schema) at `/json` after the address, as
        // each link is at its route (`/gh`), and at the address itself
        // when JSON is what is asked for first (a browser asks for HTML first,
        // so it never gets this).
        {
          source: "/:username([A-Za-z0-9_-]+)/json",
          destination: "/:username/card.json",
        },
        // The card as text for a terminal (lib/card-text): at `/txt`, and at the
        // address itself for a command-line client, which asks for `*/*` and
        // is told by its name alone.
        {
          source: "/:username([A-Za-z0-9_-]+)/txt",
          destination: "/:username/card.txt",
        },
        {
          source: "/:username([A-Za-z0-9_-]+)",
          has: [{ type: "header", key: "user-agent", value: CLI }],
          destination: "/:username/card.txt",
        },
        {
          source: "/:username([A-Za-z0-9_-]+)",
          has: [
            {
              type: "header",
              key: "accept",
              value:
                "(?:application/json|application/vnd\\.e-id\\.card\\+json).*",
            },
          ],
          destination: "/:username/card.json",
        },
      ],
    }
  },
  async redirects() {
    return [
      // What the faq said, the home says now (components/landing/features).
      { source: "/about", destination: "/", permanent: true },
      {
        source: PAGES,
        has: [
          { type: "host", value: host(MAIN_DOMAIN, SHORT_DOMAIN) },
          { type: "header", key: "user-agent", value: SAFARI },
        ],
        missing: [{ type: "header", key: "user-agent", value: NOT_SAFARI }],
        destination: `https://${EMOJI_DOMAIN_PUNYCODE}/:path`,
        permanent: false,
      },
      {
        source: PAGES,
        has: [
          { type: "host", value: host(SHORT_DOMAIN, EMOJI_DOMAIN_PUNYCODE) },
        ],
        missing: [
          { type: "header", key: "user-agent", value: SAFARI },
          { type: "header", key: "user-agent", value: CLI },
        ],
        destination: `https://${MAIN_DOMAIN}/:path`,
        permanent: true,
      },
      {
        source: PAGES,
        has: [
          { type: "host", value: host(SHORT_DOMAIN, EMOJI_DOMAIN_PUNYCODE) },
          { type: "header", key: "user-agent", value: NOT_SAFARI },
        ],
        destination: `https://${MAIN_DOMAIN}/:path`,
        permanent: true,
      },
    ]
  },
}

export default nextConfig
