// THE SITE ON YOUR MACHINE, ON PRODUCTION'S DATA, READ-ONLY: `pnpm dev:production`
// (the dev server, :3456) and `pnpm build:production` (a production build, its
// profiles prerendered from the real data). Any package script, named as the
// argument (`bun scripts/dev-production.ts <script>`), runs with production's
// database behind a token that can only read and lives a day, minted now
// (`turso`), and the GitHub App's secret and the Safe Browsing key read from
// 1Password (`op`) so signing in with GitHub and checking links work locally. Nothing is written to disk: every value lives in this
// process's environment and the script's. A write the page tries fails at the
// database, which is the point.
//
// Needs `turso` (logged in) and `op` (signed in). Sign-in with Google is off
// locally (its credentials are production's only).
import assert from "node:assert/strict"
import { execFileSync, spawn } from "node:child_process"

/** Production's database, by its Turso name: its address is asked of Turso,
 *  which answers only the account that owns it. */
const DATABASE = "e-id-migration-better-auth"
/** The GitHub App's client (public: every sign-in sends it to the browser) and
 *  where its secret is in 1Password (a pointer, read only with 1Password open). */
const GITHUB_CLIENT_ID = "Iv1.e0894ce8ac7d6472"
const GITHUB_SECRET = "op://Private/e-ID GitHub App client secret/password"
/** The Safe Browsing key (lib/safe-browsing), the same one production uses: a
 *  question about an address costs nothing and writes nothing. */
const SAFE_BROWSING_KEY = "op://Private/e-ID Safe Browsing API key/credential"

const run = (cmd: string, args: string[], what: string): string => {
  try {
    return execFileSync(cmd, args, { encoding: "utf8" }).trim()
  } catch (e) {
    throw new Error(
      `dev:production: ${what} failed (${cmd}): ${(e as Error).message.split("\n")[0]}`,
    )
  }
}

const url = run(
  "turso",
  ["db", "show", DATABASE, "--url"],
  "reading the database's address",
)
assert.ok(url.startsWith("libsql://"), `dev:production: turso answered ${url}`)
const token = run(
  "turso",
  ["db", "tokens", "create", DATABASE, "--read-only", "--expiration", "1d"],
  "minting a read-only database token",
)
assert.ok(token.length > 20, "dev:production: turso gave no token")
const githubSecret = run(
  "op",
  ["read", GITHUB_SECRET],
  "reading the GitHub App secret",
)
const safeBrowsingKey = run(
  "op",
  ["read", SAFE_BROWSING_KEY],
  "reading the Safe Browsing key",
)
const githubToken = run(
  "gh",
  ["auth", "token"],
  "reading your GitHub token (profiles)",
)

const script = process.argv[2] ?? "dev"
console.log(
  `${script} on production's data: ${DATABASE}, read-only for a day; GitHub sign-in on`,
)
const server = spawn("pnpm", [script], {
  stdio: "inherit",
  env: {
    ...process.env,
    DB_URL: url,
    DB_AUTH_TOKEN: token,
    BETTER_AUTH_URL: "http://localhost:3456",
    // A local secret: sessions made here are never production's.
    BETTER_AUTH_SECRET: "local-development-only-not-production",
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: githubSecret,
    GOOGLE_CLIENT_ID: "off-locally",
    GOOGLE_CLIENT_SECRET: "off-locally",
    API_GITHUB_TOKEN: githubToken,
    SAFE_BROWSING_KEY: safeBrowsingKey,
  },
})
server.on("exit", (code) => process.exit(code ?? 0))
