// THE eid CLI: your e-ID from a terminal (README, To do › the CLI). A client of
// e-ID's API (app/api/v1) and nothing else: every limit and check is the
// server's, so the site and the CLI can never disagree. Its shapes are the
// server's own types, imported, erased at build (`bun build`, one file, no
// dependencies at run time).
//
// Signed in with the OAuth device flow (lib/api-keys): `eid login` shows a code,
// opens the page that approves it, and keeps the key it is given in
// $XDG_CONFIG_HOME/eid/config.json (0600). EID_URL points it at another e-ID
// (the dev server: http://localhost:3456).

import { execFileSync, spawn } from "node:child_process"
import {
  chmodSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { homedir, hostname } from "node:os"
import { join } from "node:path"
import { parseArgs } from "node:util"
import { kv, spinner, table, ui } from "@adriangalilea/utils/cli"
import type { ApiError } from "@/lib/api"
import type { KeptShortLink } from "@/lib/card-edit"
import type { Allowance } from "@/lib/trust"

const VERSION = "0.1.0"

const HELP = `eid ${VERSION}: your e-ID from a terminal

  eid login                 sign this machine in (opens the browser; over
                            ssh, or with --no-browser, prints where)
  eid logout                sign it out, revoking its key
  eid whoami                who you are, and your addresses
  eid link <url> [name]     a short link to <url>, at /you/<name> (a made-up
                            code without one); printed and copied
      --until <day|Nd>        the last day it opens: 2026-12-31, or 7d
      --opens <n>             how many times it opens (1: one use)
      --card <label>          on your card too, named <label>
      --on <domain>           eid.to (default), e-id.to, 👤.to, xn--mq8h.to
  eid ls                    your short links
  eid rm <name>             delete one
  eid stats                 your numbers
  eid card [username]       a card as text (yours without a name)

  --json                    the answer as JSON, for scripts
  EID_URL                   another e-ID (http://localhost:3456)
`

/** The domains an address can be printed on (lib/addresses FORMS). */
const DOMAINS = ["eid.to", "e-id.to", "👤.to", "xn--mq8h.to"] as const

const BASE = (process.env.EID_URL ?? "https://e-id.to").replace(/\/$/, "")
const CONFIG_DIR = join(
  process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"),
  "eid",
)
const CONFIG = join(CONFIG_DIR, "config.json")

type Config = { base: string; key: string; username: string }

/** A failure the person caused or can fix: said plainly, exit 1, no stack. */
class Said extends Error {}

function readConfig(): Config | null {
  try {
    const config = JSON.parse(readFileSync(CONFIG, "utf8")) as Config
    return config.base === BASE ? config : null
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null
    throw error
  }
}

function signedIn(): Config {
  const config = readConfig()
  if (!config) throw new Said(`Not signed in to ${BASE}: run eid login`)
  return config
}

/** One question to the API: its JSON, or its error said as e-ID words it. */
async function api<T>(
  path: string,
  init: { method?: string; body?: unknown; key?: string } = {},
): Promise<T> {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method: init.method ?? "GET",
    headers: {
      "content-type": "application/json",
      "user-agent": `eid/${VERSION}`,
      ...(init.key && { authorization: `Bearer ${init.key}` }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  if (res.status === 204) return undefined as T
  const type = res.headers.get("content-type") ?? ""
  if (!type.includes("application/json"))
    throw new Error(`${path}: HTTP ${res.status}, ${type || "no body"}`)
  const body = (await res.json()) as T | { error: ApiError }
  if (!res.ok) {
    const error = (body as { error?: ApiError }).error
    if (!error) throw new Error(`${path}: HTTP ${res.status} with no error`)
    throw Object.assign(new Said(error.message), { code: error.code })
  }
  return body as T
}

/** `command` run where it exists; false where it does not. */
function tryRun(command: string, args: string[], input?: string): boolean {
  try {
    execFileSync(command, args, {
      input,
      stdio: [input === undefined ? "ignore" : "pipe", "ignore", "ignore"],
    })
    return true
  } catch {
    return false
  }
}

/** Copies `text` with the system's clipboard; false where it has none. */
const copy = (text: string) =>
  process.platform === "darwin"
    ? tryRun("pbcopy", [], text)
    : process.platform === "win32"
      ? tryRun("clip", [], text)
      : tryRun("wl-copy", [], text) ||
        tryRun("xclip", ["-selection", "clipboard"], text)

function openInBrowser(url: string) {
  const [command, args] =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]]
  spawn(command, args, { stdio: "ignore", detached: true })
    .on("error", () => {})
    .unref()
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function login(browser: boolean) {
  const host = hostname()
    .replace(/\.local$/, "")
    .replace(/[^\w.-]/g, "-")
  const start = await api<{
    device_code: string
    user_code: string
    verification_uri_complete: string
    interval: number
    expires_in: number
  }>("/login", { method: "POST", body: { host } })
  console.error(
    `${ui.muted("code")} ${ui.head(start.user_code)}  ${ui.muted("approve it at")} ${start.verification_uri_complete}`,
  )
  if (browser) openInBrowser(start.verification_uri_complete)
  const until = Date.now() + start.expires_in * 1000
  let every = start.interval * 1000
  const got = await spinner("waiting for you in the browser", async () => {
    for (;;) {
      await sleep(every)
      if (Date.now() > until)
        throw new Said("Took too long: run eid login again")
      try {
        return await api<{ key: string; username: string }>("/login/token", {
          method: "POST",
          body: { device_code: start.device_code },
        })
      } catch (error) {
        const code = (error as { code?: string }).code
        if (code === "authorization_pending") continue
        if (code === "slow_down") {
          every += 5000
          continue
        }
        throw error
      }
    }
  })
  mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 })
  const config: Config = { base: BASE, key: got.key, username: got.username }
  writeFileSync(CONFIG, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 })
  chmodSync(CONFIG, 0o600)
  console.log(`${ui.ok("signed in")} as ${ui.accent(got.username)} on ${BASE}`)
}

async function logout() {
  const config = readConfig()
  if (!config) return console.log(`Not signed in to ${BASE}.`)
  await api("/key", { method: "DELETE", key: config.key }).catch(
    (error: unknown) => {
      // A key revoked at /cli already is signed out all the same.
      if ((error as { code?: string }).code !== "unauthorized") throw error
    },
  )
  rmSync(CONFIG)
  console.log(
    `${ui.ok("signed out")} of ${BASE}: this machine's key is revoked`,
  )
}

/** An address on one of e-ID's domains, as copied: always with https://. */
const addressOn = (domain: string, path: string) => `https://${domain}${path}`

function said(link: KeptShortLink): string {
  const parts = [
    new URL(/^https?:/.test(link.value) ? link.value : `https://${link.value}`)
      .hostname,
  ]
  parts.push(link.visits === 1 ? "opened once" : `opened ${link.visits} times`)
  if (link.stopped) parts.push(ui.bad("taken down"))
  if (link.expires) parts.push(`until ${link.expires}`)
  if (link.maxVisits !== null)
    parts.push(`${link.maxVisits - link.visits} opens left`)
  if (link.public) parts.push("on your card")
  return parts.join(" · ")
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      until: { type: "string" },
      opens: { type: "string" },
      card: { type: "string" },
      on: { type: "string" },
      json: { type: "boolean" },
      "no-browser": { type: "boolean" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
  })
  const [command, ...rest] = positionals
  const json = values.json === true
  const out = (data: unknown, human: () => void) =>
    json ? console.log(JSON.stringify(data, null, 2)) : human()

  if (values.version) return console.log(VERSION)
  if (values.help || !command) return console.log(HELP)

  const domain = values.on ?? "eid.to"
  if (!(DOMAINS as readonly string[]).includes(domain))
    throw new Said(`--on is one of ${DOMAINS.join(", ")}`)

  switch (command) {
    case "login":
      // Over ssh the browser would open on the far machine, if at all: the
      // address is printed and opened wherever the person is.
      return login(!values["no-browser"] && !process.env.SSH_CONNECTION)
    case "logout":
      return logout()
    case "whoami": {
      const me = await api<{
        username: string
        name: string | null
        addresses: Record<string, string>
      }>("/me", { key: signedIn().key })
      return out(me, () =>
        console.log(
          kv([
            ["name", me.name ?? ui.muted("none")],
            ["username", ui.accent(me.username)],
            ...Object.values(me.addresses).map(
              (a, i) => [i === 0 ? "address" : "", a] as [string, string],
            ),
          ]),
        ),
      )
    }
    case "link": {
      const [to, name] = rest
      if (!to) throw new Said("eid link <url> [name]")
      const { key, username } = signedIn()
      const opens =
        values.opens === undefined ? undefined : Number(values.opens)
      if (opens !== undefined && !Number.isInteger(opens))
        throw new Said("--opens is a whole number")
      const link = await api<KeptShortLink>("/links", {
        method: "POST",
        key,
        body: {
          to,
          name,
          until: values.until,
          opens,
          ...(values.card !== undefined && {
            onCard: true,
            label: values.card,
          }),
        },
      })
      const address = addressOn(domain, `/${username}/${link.slug}`)
      const copied = copy(address)
      return out({ ...link, address }, () =>
        console.log(`${address}${copied ? ui.muted(" (copied)") : ""}`),
      )
    }
    case "ls": {
      const { key, username } = signedIn()
      const mine = await api<{ links: KeptShortLink[]; allowance: Allowance }>(
        "/links",
        { key },
      )
      return out(mine, () => {
        if (mine.links.length === 0)
          return console.log(ui.muted("No short links yet: eid link <url>"))
        console.log(
          table(
            mine.links.map((l) => [
              ui.accent(`/${username}/${l.slug}`),
              said(l),
            ]),
          ),
        )
        console.log(
          ui.muted(
            `${mine.links.length} of ${mine.allowance.most}${mine.allowance.next ? `, ${mine.allowance.next.most} from ${mine.allowance.next.on}` : ""}`,
          ),
        )
      })
    }
    case "rm": {
      const [name] = rest
      if (!name) throw new Said("eid rm <name>")
      await api(`/links/${encodeURIComponent(name)}`, {
        method: "DELETE",
        key: signedIn().key,
      })
      return out({ deleted: name }, () =>
        console.log(`${ui.ok("deleted")} /${name}`),
      )
    }
    case "stats": {
      const stats = await api<{ views: number; hits: number }>("/stats", {
        key: signedIn().key,
      })
      return out(stats, () =>
        console.log(
          kv([
            ["visits", String(stats.views)],
            ["links opened", String(stats.hits)],
          ]),
        ),
      )
    }
    case "card": {
      const username = rest[0] ?? signedIn().username
      const res = await fetch(`${BASE}/${encodeURIComponent(username)}/txt`, {
        headers: { "user-agent": `eid/${VERSION}` },
      })
      if (res.status === 404) throw new Said(`No e-ID is called ${username}`)
      if (!res.ok) throw new Error(`/${username}/txt: HTTP ${res.status}`)
      return process.stdout.write(await res.text())
    }
    default:
      throw new Said(`No command "${command}". eid --help`)
  }
}

main().catch((error: unknown) => {
  if (error instanceof Said) {
    console.error(ui.bad(error.message))
    process.exit(1)
  }
  throw error
})
