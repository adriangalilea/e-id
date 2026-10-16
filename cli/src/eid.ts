// THE eid CLI: your e-ID from a terminal (README, To do › the CLI). A client of
// e-ID's API (app/api/v1) and nothing else: every limit and check is the
// server's, so the site and the CLI can never disagree. Its shapes are the
// server's own types, imported, erased at build (`bun build`, one file, no
// dependencies at run time). Its commands are a table (commands.ts) that the
// help, the agent skill (skill.ts) and the dispatcher below all read.
//
// Signed in with the OAuth device flow (lib/api-keys): `eid login` shows a code,
// opens the page that approves it, and keeps the key it is given in
// $XDG_CONFIG_HOME/eid/config.json (0600). A command that needs a signed-in
// machine signs it in first, so `npx e-id link …` works on a machine that never
// saw eid. EID_URL points it at another e-ID (the dev server).

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
import {
  COMMANDS,
  type CommandName,
  commandNamed,
  detail,
  overview,
} from "./commands"
import { installSkill, refreshSkill, skill } from "./skill"

const VERSION = "0.1.0"

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

async function login(browser: boolean): Promise<Config> {
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
  console.error(
    `${ui.ok("signed in")} as ${ui.accent(got.username)} on ${BASE}`,
  )
  return config
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

type Values = {
  until?: string
  opens?: string
  card?: string
  on?: string
  dir?: string
  json?: boolean
  "no-browser"?: boolean
}

type Context = {
  rest: string[]
  values: Values
  /** The answer as JSON (`--json`), or `human` for a person. */
  out: (data: unknown, human: () => void) => void
  /** This machine signed in, signing it in first where it is not (in a
   *  terminal; a script is told to run eid login). */
  session: () => Promise<Config>
  /** Where the browser may open: not over ssh, not with --no-browser. */
  browser: boolean
  /** The domain addresses are printed on (--on). */
  domain: string
}

/** What each command does: one for every command in the table, by type. */
const RUN: Record<CommandName, (c: Context) => Promise<void>> = {
  async login({ browser }) {
    await login(browser)
  },
  async logout() {
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
  },
  async whoami({ out }) {
    const config = readConfig()
    if (!config)
      return out({ signedIn: false, base: BASE }, () =>
        console.log(`Not signed in to ${BASE}: eid login`),
      )
    const me = await api<{
      username: string
      name: string | null
      addresses: Record<string, string>
    }>("/me", { key: config.key })
    out({ signedIn: true, ...me }, () =>
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
  },
  async link({ rest, values, out, session, domain }) {
    const [to, name] = rest
    if (!to) throw new Said("eid link <url> [name]")
    const opens = values.opens === undefined ? undefined : Number(values.opens)
    if (opens !== undefined && !Number.isInteger(opens))
      throw new Said("--opens is a whole number")
    const { key, username } = await session()
    const link = await api<KeptShortLink>("/links", {
      method: "POST",
      key,
      body: {
        to,
        name,
        until: values.until,
        opens,
        ...(values.card !== undefined && { onCard: true, label: values.card }),
      },
    })
    const address = addressOn(domain, `/${username}/${link.slug}`)
    const copied = copy(address)
    out({ ...link, address }, () =>
      console.log(`${address}${copied ? ui.muted(" (copied)") : ""}`),
    )
  },
  async ls({ out, session }) {
    const { key, username } = await session()
    const mine = await api<{ links: KeptShortLink[]; allowance: Allowance }>(
      "/links",
      { key },
    )
    out(mine, () => {
      if (mine.links.length === 0)
        return console.log(ui.muted("No short links yet: eid link <url>"))
      console.log(
        table(
          mine.links.map((l) => [ui.accent(`/${username}/${l.slug}`), said(l)]),
        ),
      )
      const { most, next } = mine.allowance
      console.log(
        ui.muted(
          `${mine.links.length} of ${most}${next ? `, ${next.most} from ${next.on}` : ""}`,
        ),
      )
    })
  },
  async rm({ rest, out, session }) {
    const [name] = rest
    if (!name) throw new Said("eid rm <name>")
    await api(`/links/${encodeURIComponent(name)}`, {
      method: "DELETE",
      key: (await session()).key,
    })
    out({ deleted: name }, () => console.log(`${ui.ok("deleted")} /${name}`))
  },
  async stats({ out, session }) {
    const stats = await api<{ views: number; hits: number }>("/stats", {
      key: (await session()).key,
    })
    out(stats, () =>
      console.log(
        kv([
          ["visits", String(stats.views)],
          ["links opened", String(stats.hits)],
        ]),
      ),
    )
  },
  async card({ rest, session }) {
    const username = rest[0] ?? (await session()).username
    const res = await fetch(`${BASE}/${encodeURIComponent(username)}/txt`, {
      headers: { "user-agent": `eid/${VERSION}` },
    })
    if (res.status === 404) throw new Said(`No e-ID is called ${username}`)
    if (!res.ok) throw new Error(`/${username}/txt: HTTP ${res.status}`)
    process.stdout.write(await res.text())
  },
  async skill({ rest, values }) {
    if (rest[0] === undefined) return void process.stdout.write(skill(VERSION))
    if (rest[0] !== "install") throw new Said("eid skill [install]")
    const file = installSkill(VERSION, values.dir)
    console.log(`${ui.ok("installed")} ${file}`)
  },
  async help({ rest }) {
    const [name] = rest
    if (!name) return console.log(overview(VERSION))
    const command = commandNamed(name)
    if (!command) throw new Said(`No command "${name}". eid help`)
    console.log(detail(command))
  },
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      until: { type: "string" },
      opens: { type: "string" },
      card: { type: "string" },
      on: { type: "string" },
      dir: { type: "string" },
      json: { type: "boolean" },
      "no-browser": { type: "boolean" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
  })
  refreshSkill(VERSION)
  if (values.version) return console.log(VERSION)
  const [name = "help", ...rest] = positionals
  if (values.help) return RUN.help({ rest: [name] } as Context)

  const domain = values.on ?? "eid.to"
  if (!(DOMAINS as readonly string[]).includes(domain))
    throw new Said(`--on is one of ${DOMAINS.join(", ")}`)
  const command = commandNamed(name)
  if (!command) throw new Said(`No command "${name}". eid help`)

  const json = values.json === true
  const browser = !values["no-browser"] && !process.env.SSH_CONNECTION
  const context: Context = {
    rest,
    values,
    out: (data, human) =>
      json ? console.log(JSON.stringify(data, null, 2)) : human(),
    browser,
    domain,
    session: async () => {
      const config = readConfig()
      if (config) return config
      if (json || !process.stdin.isTTY)
        throw new Said(`Not signed in to ${BASE}: run eid login`)
      console.error(ui.muted(`Signing this machine in to ${BASE} first.`))
      return login(browser)
    },
  }
  await RUN[command.name as CommandName](context)
}

main().catch((error: unknown) => {
  if (error instanceof Said) {
    console.error(ui.bad(error.message))
    process.exit(1)
  }
  throw error
})

// Every command in the table has a runner (RUN's type says so); this says the
// table has no runner it lacks.
for (const name of Object.keys(RUN))
  if (!COMMANDS.some((c) => c.name === name))
    throw new Error(`eid: a runner for "${name}", which no command names`)
