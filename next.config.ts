import assert from "node:assert/strict"
import { readdirSync } from "node:fs"
import type { NextConfig } from "next"
import {
  CARD_FILES,
  CARD_SHORT,
  EMOJI_DOMAIN_PUNYCODE,
  forbiddenUsernames,
  MAIN_DOMAIN,
  SHORT_DOMAIN,
} from "./lib/const"

// The card's files as the app has them, against the list a person's own link
// names are refused by (lib/link-names): a route added under a person's address
// and not listed would let a link of theirs be named after it.
const cardFiles = readdirSync("app/[username]", { withFileTypes: true })
  .filter((e) => e.name !== "[link]")
  .flatMap((e) =>
    e.isDirectory()
      ? [e.name]
      : e.name.startsWith("opengraph-image.")
        ? ["opengraph-image"]
        : [],
  )
assert.deepEqual(
  cardFiles.toSorted(),
  [...CARD_FILES].sort(),
  "app/[username] has routes lib/const CARD_FILES does not list, or the other way",
)

// The site's own pages at the root (app/privacy, app/terms, app/admin), as the app
// has them: a name in an address is a person's unless it is one of these, so the
// rewrites below (a vCard, JSON, a terminal's text) never take /privacy for
// someone. Each is a reserved username too (lib/const), asserted.
const SITE_PAGES = readdirSync("app", { withFileTypes: true })
  .filter((e) => e.isDirectory() && !/^[[(_]/.test(e.name))
  .filter((e) => readdirSync(`app/${e.name}`).some((f) => /^page\./.test(f)))
  .map((e) => e.name)
for (const page of SITE_PAGES)
  assert.ok(
    forbiddenUsernames.includes(page),
    `app/${page} is a page at the root, and lib/const forbiddenUsernames lets someone take it as a username`,
  )
/** A person's name in an address: anything but the site's own pages. */
const PERSON = `/:username((?!(?:${SITE_PAGES.join("|")})(?:$|[./]))[A-Za-z0-9_-]+)`

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
          source: `${PERSON}\\.vcf`,
          destination: "/:username/card.vcf",
        },
        {
          source: PERSON,
          has: [
            { type: "header", key: "accept", value: ".*text/(?:x-)?vcard.*" },
          ],
          destination: "/:username/card.vcf",
        },
        // The card's files at their short names (`/json`, `/txt`), as each link
        // is at its route (`/gh`).
        ...Object.entries(CARD_SHORT).map(([short, file]) => ({
          source: `${PERSON}/${short}`,
          destination: `/:username/${file}`,
        })),
        // The card as text for a terminal (lib/card-text) at the address itself
        // for a command-line client, which asks for `*/*` and is told by its
        // name alone; and as data (lib/card-schema) when JSON is what is asked
        // for first (a browser asks for HTML first, so it never gets this).
        {
          source: PERSON,
          has: [{ type: "header", key: "user-agent", value: CLI }],
          destination: "/:username/card.txt",
        },
        {
          source: PERSON,
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
