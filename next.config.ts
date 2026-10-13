import type { NextConfig } from "next";
import { EMOJI_DOMAIN_PUNYCODE, MAIN_DOMAIN, SHORT_DOMAIN } from "./lib/const";

// Every path a person can open, never the auth API or the build's assets: the
// OAuth callback must land on the host it was sent from.
const PAGES = "/:path((?!api/|_next/).*)";

const escaped = (domain: string) => domain.replaceAll(".", "\\.");
const host = (...domains: string[]) =>
  `(?:www\\.)?(?:${domains.map(escaped).join("|")})`;

// Safari shows the emoji domain in its address bar (👤.to) and Chrome does not,
// so Safari is sent to the emoji domain and everything else to e-id.to. These run
// in Vercel's router, before any function and before the cache.
const SAFARI = ".*Version/.*Safari.*";
const NOT_SAFARI = ".*(?:Chrome|CriOS).*";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // The share image's renderer is a native addon (lib/card-image): loaded from
  // node_modules at run time, never bundled.
  serverExternalPackages: ["@resvg/resvg-js"],
  // Its fonts are read from disk at run time; the trace is told, since a path
  // built from process.cwd() is not followed.
  outputFileTracingIncludes: { "/[username]/opengraph-image": ["./assets/fonts/*"] },
  async redirects() {
    return [
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
        has: [{ type: "host", value: host(SHORT_DOMAIN, EMOJI_DOMAIN_PUNYCODE) }],
        missing: [{ type: "header", key: "user-agent", value: SAFARI }],
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
    ];
  },
};

export default nextConfig;
