// THE eid CLI: your e-ID from a terminal (README, To do › the CLI). A client of
// e-ID's API (app/api/v1) and nothing else: every limit and check is the
// server's, so the site and the CLI can never disagree. Its commands are a table
// (commands.ts) that the help, the agent skill (skill.ts) and the dispatcher
// below all read. What `--json` prints is the API's own answer, typed by the
// schemas the server validates and answers with (lib/api-schemas, imported as
// types only and erased at build: `bun build`, one file, no dependencies at run
// time), and a failure is the API's error shape, so a program reads eid the way
// it reads the API.
//
// Signed in with the OAuth device flow (lib/api-keys): `eid login` shows a code,
// opens the page that approves it, and keeps the key it is given in
// $XDG_CONFIG_HOME/eid/config.json (0600). A command that needs a signed-in
// machine signs it in first, so `npx @e-id/eid link …` works on a machine that
// never saw eid. EID_URL points it at another e-ID (the dev server).

import { type ChildProcess, execFileSync, spawn } from "node:child_process"
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { homedir, hostname, tmpdir } from "node:os"
import { basename, join, resolve } from "node:path"
import { createInterface } from "node:readline/promises"
import { parseArgs } from "node:util"
import { indent, kv, spinner, table, ui } from "@adriangalilea/utils/cli"
import type { z } from "zod"
import type * as S from "@/lib/api-schemas"
import type { Card } from "@/lib/card-schema"
import { linkPlatforms } from "@/lib/platforms"
import pkg from "../package.json" with { type: "json" }
import {
  COMMANDS,
  type CommandName,
  commandNamed,
  detail,
  GLOBAL,
  overview,
} from "./commands"
import { sendme } from "./sendme"
import { installSkill, refreshSkill, skill } from "./skill"

/** This eid's version: package.json's, bundled in at build, the one source
 *  (CI releases what it says). */
const VERSION = pkg.version

type ShortLink = z.infer<typeof S.ShortLinkOut>
type Links = z.infer<typeof S.Links>
type Me = z.infer<typeof S.Me>
type Send = z.infer<typeof S.SendOut>
type SendMade = z.infer<typeof S.SendMade>
type SendEvents = z.infer<typeof S.SendEvents>
type Inbox = z.infer<typeof S.Inbox>
type Waiting = Inbox["waiting"][number]
type Stats = z.infer<typeof S.Stats>
type MyCard = z.infer<typeof S.MyCard>
type ApiError = z.infer<typeof S.ApiErrorSchema>["error"]

/** The domains an address can be printed on (lib/addresses FORMS). */
const DOMAINS = ["eid.to", "e-id.to", "👤.to", "xn--mq8h.to"] as const

/** The platforms a card links, as `eid set` names them. */
const PLATFORMS = linkPlatforms.filter((p) => p !== "link")

const BASE = (process.env.EID_URL ?? "https://e-id.to").replace(/\/$/, "")
const CONFIG_DIR = join(
  process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"),
  "eid",
)
const CONFIG = join(CONFIG_DIR, "config.json")

type Config = { base: string; key: string; username: string }

/** A failure the person caused or can fix: said plainly, exit 1, no stack;
 *  under --json, the API's error shape with its code. */
class Said extends Error {
  constructor(
    message: string,
    readonly code = "refused",
    readonly fields?: Record<string, string>,
  ) {
    super(message)
  }
}

function readConfig(): Config | null {
  try {
    const config = JSON.parse(readFileSync(CONFIG, "utf8")) as Config
    return config.base === BASE ? config : null
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null
    throw error
  }
}

/** One question to the API: its JSON, or its error, said as e-ID words it. */
async function api<T>(
  path: string,
  init: {
    method?: string
    body?: unknown
    key?: string
    /** A send's password, said in a header, never in the address. */
    password?: string
  } = {},
): Promise<T> {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method: init.method ?? "GET",
    headers: {
      "content-type": "application/json",
      "user-agent": `eid/${VERSION}`,
      ...(init.key && { authorization: `Bearer ${init.key}` }),
      ...(init.password && { "e-id-password": init.password }),
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
    throw new Said(error.message, error.code, error.fields)
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
  const start = await api<z.infer<typeof S.LoginStarted>>("/login", {
    method: "POST",
    body: { host },
  })
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
        throw new Said("Took too long: run eid login again", "expired_token")
      try {
        return await api<z.infer<typeof S.LoggedIn>>("/login/token", {
          method: "POST",
          body: { device_code: start.device_code },
        })
      } catch (error) {
        const code = (error as Said).code
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

/** A link's address as a person writes it: no scheme, no `mailto:`. */
const bare = (url: string) =>
  url.replace(/^(https?:\/\/|mailto:)/, "").replace(/\/$/, "")

const BYTES = new Intl.NumberFormat("en", {
  notation: "compact",
  style: "unit",
  unit: "byte",
  unitDisplay: "narrow",
})

function said(link: ShortLink): string {
  const parts = [
    link.file
      ? `sending ${link.file.name}`
      : new URL(
          /^https?:/.test(link.value) ? link.value : `https://${link.value}`,
        ).hostname,
  ]
  if (link.to)
    parts.push(
      `for ${link.to.map((p) => (p.taken ? `${p.username} ${ui.ok("(took it)")}` : p.username)).join(", ")}`,
    )
  else
    parts.push(
      link.visits === 1 ? "opened once" : `opened ${link.visits} times`,
    )
  if (link.locked) parts.push("behind a password")
  if (link.stopped) parts.push(ui.bad("taken down"))
  if (link.expires) parts.push(`until ${link.expires}`)
  if (link.maxVisits !== null)
    parts.push(`${link.maxVisits - link.visits} opens left`)
  if (link.public) parts.push("on your card")
  return parts.join(" · ")
}

/** A card for a person reading a terminal: who, their line, every link with
 *  where it goes and its e-ID route (the person's part dimmed, the name that
 *  is the route's own lit), and the ways to get the rest. Read from card.json,
 *  the same data the page draws. */
function cardShown(card: Card): string {
  const home = `eid.to/${card.handle}`
  const rows = card.links.map((l) => [
    ui.head(l.name),
    bare(l.url),
    l.route
      ? `${ui.muted(`${home}/`)}${ui.accent(l.route.slice(l.route.lastIndexOf("/") + 1))}`
      : "",
  ])
  return [
    "",
    `  ${ui.head(card.name)}`,
    `  ${ui.accent(`@${card.handle}`)}${card.country ? ui.muted(` · ${card.country}`) : ""}`,
    ...(card.bio ? ["", ...card.bio.split("\n").map((l) => `  ${l}`)] : []),
    ...(rows.length ? ["", indent(table(rows), 2)] : []),
    "",
    `  ${ui.muted(`${home} · as json: ${home}/json · as a contact: ${home}.vcf`)}`,
    "",
  ].join("\n")
}

/** A send's address as someone gives it (eid.to/ada/notes, with or without
 *  https://, on any of e-ID's domains, or ada/notes) as whose and which. */
function sendAt(address: string): { username: string; name: string } {
  const parts = address
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .split("/")
  const host = new URL(BASE).host
  if (parts.length === 3 && [...DOMAINS, host].includes(parts[0] as string))
    parts.shift()
  const [username, name] = parts
  if (parts.length !== 2 || !username || !name)
    throw new Said(
      `Not an address of a send: ${address} (it looks like eid.to/ada/notes)`,
      "bad_address",
    )
  return { username, name }
}

/** A folder's size: every file under it, in bytes. */
function sizeOf(path: string): number {
  return readdirSync(path, { withFileTypes: true }).reduce((total, entry) => {
    const at = join(path, entry.name)
    return (
      total +
      (entry.isDirectory()
        ? sizeOf(at)
        : entry.isFile()
          ? statSync(at).size
          : 0)
    )
  }, 0)
}

/** The ticket sendme prints once `send` has the file ready; a throw, with what
 *  sendme said, where it ends first. */
function ticketFrom(child: ChildProcess): Promise<string> {
  return new Promise((done, fail) => {
    let said = ""
    child.stdout?.on("data", (chunk: Buffer) => {
      said += chunk.toString()
      const ticket = /sendme receive (blob[a-z0-9]+)/.exec(said)?.[1]
      if (ticket) done(ticket)
    })
    child.stderr?.on("data", (chunk: Buffer) => {
      said += chunk.toString()
    })
    child.on("exit", (code) =>
      fail(new Error(`sendme send ended (${code}) before its ticket: ${said}`)),
    )
  })
}

/** sendme run to its end in `cwd`; what it said, thrown, where it failed. */
function sendmeRun(bin: string, args: string[], cwd: string): Promise<void> {
  return new Promise((done, fail) => {
    const child = spawn(bin, args, { cwd, stdio: ["ignore", "pipe", "pipe"] })
    let said = ""
    child.stdout.on("data", (c: Buffer) => {
      said += c.toString()
    })
    child.stderr.on("data", (c: Buffer) => {
      said += c.toString()
    })
    child.on("exit", (code) =>
      code === 0
        ? done()
        : fail(
            new Said(
              `The file did not come: the sender may have stopped sending. sendme said: ${said.trim().split("\n").at(-1) ?? code}`,
              "unreachable",
            ),
          ),
    )
  })
}

/** A question for the person at the terminal, on stderr so stdout stays the answer. */
async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr })
  try {
    return (await rl.question(question)).trim()
  } finally {
    rl.close()
  }
}

/** Who sends what, as asked before taking it: "Ada Lovelace @ada: notes.zip (2.4MB)". */
const offered = (
  from: { username: string; name: string | null },
  file: { name: string; size: number },
) =>
  `${from.name ? `${ui.head(from.name)} ` : ""}${ui.accent(`@${from.username}`)}${ui.muted(":")} ${file.name} ${ui.muted(`(${BYTES.format(file.size)})`)}`

type Taken = { file: string; size: number; path: string; from: string }

/** A send taken: its ticket asked for (with this machine's key where it has one, so a
 *  send for its person is given; with the password where it has one), who sends what
 *  shown and asked about unless `yes`, the file brought into `dir` with sendme, and,
 *  for a send addressed to this person, e-ID told it came. Null where it is declined. */
async function take(
  address: string,
  o: { dir: string; yes: boolean; password: string | undefined },
): Promise<Taken | null> {
  const at = sendAt(address)
  const key = readConfig()?.key
  const path = `/sends/${encodeURIComponent(at.username)}/${encodeURIComponent(at.name)}`
  let password = o.password
  let send: Send
  for (;;) {
    try {
      send = await api<Send>(path, { key, password })
      break
    } catch (error) {
      if ((error as Said).code !== "password" || !process.stdin.isTTY)
        throw error
      if (password) console.error(ui.bad("not the password"))
      password = await ask(`password for ${at.username}/${at.name}: `)
    }
  }
  if (!o.yes) {
    if (!process.stdin.isTTY)
      throw new Said(
        `${at.username}/${at.name} is ${send.file.name} from @${send.from}: say --yes to take it without a terminal to ask in`,
        "unconfirmed",
      )
    console.error(
      offered({ username: send.from, name: send.fromName }, send.file),
    )
    if (!/^y(es)?$/i.test(await ask("take it? (y/N) "))) {
      console.error(ui.muted("left where it is"))
      return null
    }
  }
  const target = join(o.dir, send.file.name)
  if (existsSync(target))
    throw new Said(`${target} is already there: --dir somewhere else`, "exists")
  mkdirSync(o.dir, { recursive: true })
  const bin = await sendme(() =>
    console.error(ui.muted("fetching sendme, once (about 4 MB)…")),
  )
  await spinner(
    `getting ${send.file.name} (${BYTES.format(send.file.size)}) from ${send.from}`,
    () => sendmeRun(bin, ["receive", send.ticket, "--no-progress"], o.dir),
  )
  // The file is here: its sender sees it live, and a send for this person leaves
  // their inbox. Said as the file was asked for (the key, the password); the file
  // is had either way, so a refusal here is said, never thrown.
  await api(`${path}/taken`, { method: "POST", key, password }).catch(
    (error: unknown) => {
      if (!(error instanceof Said)) throw error
      console.error(
        ui.muted(`the sender was not told it came: ${error.message}`),
      )
    },
  )
  return {
    file: send.file.name,
    size: send.file.size,
    path: target,
    from: send.from,
  }
}

type Values = {
  until?: string
  opens?: string
  card?: string
  on?: string
  dir?: string
  to?: string
  password?: string
  yes?: boolean
  watch?: boolean
  "accept-from"?: string
  json?: boolean
  "no-browser"?: boolean
}

/** A list as typed on the command line, "ada, bob" or "ada,bob", lower case. */
const listed = (said: string | undefined) =>
  (said ?? "")
    .split(",")
    .map((n) => n.trim().replace(/^@/, "").toLowerCase())
    .filter(Boolean)

type Context = {
  rest: string[]
  values: Values
  json: boolean
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
  async login({ browser, out }) {
    const config = await login(browser)
    out({ username: config.username, base: BASE }, () => {})
  },
  async logout({ out }) {
    const config = readConfig()
    if (!config)
      return out({ signedOut: false, base: BASE }, () =>
        console.log(`Not signed in to ${BASE}.`),
      )
    await api("/key", { method: "DELETE", key: config.key }).catch(
      (error: unknown) => {
        // A key revoked at /cli already is signed out all the same.
        if ((error as Said).code !== "unauthorized") throw error
      },
    )
    rmSync(CONFIG)
    out({ signedOut: true, base: BASE }, () =>
      console.log(
        `${ui.ok("signed out")} of ${BASE}: this machine's key is revoked`,
      ),
    )
  },
  async whoami({ out }) {
    const config = readConfig()
    if (!config)
      return out({ signedIn: false, base: BASE }, () =>
        console.log(`Not signed in to ${BASE}: eid login`),
      )
    const me = await api<Me>("/me", { key: config.key })
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
    if (!to) throw new Said("eid link <url> [name]", "usage")
    const opens = values.opens === undefined ? undefined : Number(values.opens)
    if (opens !== undefined && !Number.isInteger(opens))
      throw new Said("--opens is a whole number", "usage")
    const { key, username } = await session()
    const link = await api<ShortLink>("/links", {
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
  async send({ rest, values, out, session, domain, json }) {
    const [given, name] = rest
    if (!given) throw new Said("eid send <path> [name]", "usage")
    const to = listed(values.to)
    if (values.to !== undefined && to.length === 0)
      throw new Said("--to names people: --to ada,bob", "usage")
    const path = resolve(given)
    if (!existsSync(path))
      throw new Said(`Nothing at ${path} to send`, "not_found")
    const stat = statSync(path)
    const file = {
      name: basename(path),
      size: stat.isDirectory() ? sizeOf(path) : stat.size,
    }
    const { key, username } = await session()
    const bin = await sendme(() =>
      console.error(ui.muted("fetching sendme, once (about 4 MB)…")),
    )
    const work = mkdtempSync(join(tmpdir(), "eid-send-"))
    const child = spawn(bin, ["send", path, "--no-progress"], {
      cwd: work,
      stdio: ["ignore", "pipe", "pipe"],
    })
    let slug: string | null = null
    const stop = async (code: number) => {
      child.kill()
      if (slug)
        await api(`/links/${slug}`, { method: "DELETE", key }).catch(
          (error: unknown) =>
            console.error(
              ui.bad(
                `the name /${slug} was not taken away: ${(error as Error).message}; eid rm ${slug}`,
              ),
            ),
        )
      rmSync(work, { recursive: true, force: true })
      process.exit(code)
    }
    try {
      const ticket = await spinner(`getting ${file.name} ready`, () =>
        ticketFrom(child),
      )
      const sent = await api<SendMade>("/sends", {
        method: "POST",
        key,
        body: {
          ticket,
          file,
          name,
          ...(to.length > 0 && { to }),
          ...(values.password !== undefined && { password: values.password }),
        },
      })
      slug = sent.slug
    } catch (error) {
      child.kill()
      rmSync(work, { recursive: true, force: true })
      throw error
    }
    process.on("SIGINT", () => void stop(0))
    process.on("SIGTERM", () => void stop(0))
    child.on("exit", (code) => {
      console.error(ui.bad(`sendme stopped (${code}): the send is over`))
      void stop(1)
    })
    const address = addressOn(domain, `/${username}/${slug}`)
    const command = `npx @e-id/eid get ${bare(address)}`
    const copied = !json && copy(command)
    out({ from: username, slug, file, to, address, command }, () =>
      console.log(`${command}${copied ? ui.muted(" (copied)") : ""}`),
    )
    // Said whoever reads: a person, or a program whose stdout is the JSON.
    const whom =
      to.length > 0
        ? `for ${to.join(", ")} only: it waits in their eid inbox, and nobody else can open it`
        : values.password !== undefined
          ? "for whoever has the address and the password"
          : "for whoever has the address"
    console.error(
      ui.muted(
        `sending ${file.name} (${BYTES.format(file.size)}) ${whom}, until you stop (Ctrl-C), straight from this machine. Where the two machines connect directly, each sees the other's IP address.`,
      ),
    )
    // Live: each download as it starts and as it lands, asked of e-ID one held
    // question at a time (GET /links/:name/events). A person reads them on stderr;
    // with --json each is a line on stdout, after the send's own.
    // The file is served whatever happens here: a question that fails (the network
    // gone a moment) is asked again a little later, never the end of the send.
    let after = 0
    for (;;) {
      const answered = await api<SendEvents>(
        `/links/${encodeURIComponent(slug)}/events?wait=25&after=${after}`,
        { key },
      ).catch((error: unknown) => {
        if (error instanceof Said && error.code === "not_found") throw error
        return null
      })
      if (!answered) {
        await sleep(5000)
        continue
      }
      for (const e of answered.events) {
        after = e.id
        if (json) console.log(JSON.stringify(e))
        else
          console.error(
            `${ui.muted(new Date(e.at).toTimeString().slice(0, 8))}  ${e.who ? ui.accent(`@${e.who}`) : "someone"} ${e.kind === "got" ? ui.ok("got it") : "is getting it"}`,
          )
      }
    }
  },
  async get({ rest, values, out }) {
    const [address] = rest
    if (!address) throw new Said("eid get <address>", "usage")
    const got = await take(address, {
      dir: resolve(values.dir ?? "."),
      yes: values.yes === true,
      password: values.password,
    })
    if (!got) return out({ taken: false, address }, () => {})
    out(got, () => console.log(`${ui.ok("got")} ${got.path}`))
  },
  async inbox({ values, out, session, json }) {
    const { key } = await session()
    const shown = (w: Waiting) =>
      `${offered(w.from, w.file)}  ${ui.muted(`eid get ${w.address} · since ${w.since.slice(0, 16).replace("T", " ")}`)}`
    if (!values.watch) {
      const inbox = await api<Inbox>("/inbox", { key })
      return out(inbox, () =>
        console.log(
          inbox.waiting.length === 0
            ? ui.muted("Nothing waiting for you.")
            : inbox.waiting.map(shown).join("\n"),
        ),
      )
    }
    const accepted = new Set(listed(values["accept-from"]))
    if (!json && !process.stdin.isTTY && accepted.size === 0)
      throw new Said(
        "eid inbox --watch asks about each send, and there is no terminal to ask in: --json to list them, --accept-from to take from people you name",
        "unconfirmed",
      )
    const dir = resolve(values.dir ?? ".")
    const seen = new Set<string>()
    let after: string | undefined
    if (!json)
      console.error(
        ui.muted(
          `waiting for sends to you${accepted.size ? `, taking ${[...accepted].join(", ")}'s without asking` : ""} (Ctrl-C to stop)`,
        ),
      )
    for (;;) {
      const inbox = await api<Inbox>(
        `/inbox?wait=25${after ? `&after=${encodeURIComponent(after)}` : ""}`,
        { key },
      )
      after = inbox.now
      // Oldest first, as they arrived; one shown before is not shown again.
      for (const w of [...inbox.waiting].reverse()) {
        if (seen.has(w.address)) continue
        seen.add(w.address)
        if (json) {
          console.log(JSON.stringify(w))
          continue
        }
        const known = accepted.has(w.from.username.toLowerCase())
        if (known) console.error(shown(w))
        const got = await take(w.address, {
          dir,
          yes: known,
          password: undefined,
        }).catch((error: unknown) => {
          // One send that cannot be taken (its sender stopped, a file of that name
          // here already) is said, and the watch goes on.
          if (!(error instanceof Said)) throw error
          console.error(ui.bad(`${w.address}: ${error.message}`))
          return null
        })
        if (got) console.log(`${ui.ok("got")} ${got.path}`)
      }
    }
  },
  async ls({ out, session }) {
    const { key, username } = await session()
    const mine = await api<Links>("/links", { key })
    out(mine, () => {
      if (mine.links.length === 0)
        return console.log(ui.muted("No short links yet: eid link <url>"))
      console.log(
        table(
          mine.links.map((l) => [
            `${ui.muted(`/${username}/`)}${ui.accent(l.slug)}`,
            said(l),
          ]),
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
    if (!name) throw new Said("eid rm <name>", "usage")
    await api(`/links/${encodeURIComponent(name)}`, {
      method: "DELETE",
      key: (await session()).key,
    })
    out({ deleted: name }, () => console.log(`${ui.ok("deleted")} /${name}`))
  },
  async card({ rest, out, session }) {
    const username = rest[0] ?? (await session()).username
    const res = await fetch(`${BASE}/${encodeURIComponent(username)}/json`, {
      headers: { "user-agent": `eid/${VERSION}` },
    })
    if (res.status === 404)
      throw new Said(`No e-ID is called ${username}`, "not_found")
    if (!res.ok) throw new Error(`/${username}/json: HTTP ${res.status}`)
    const card = (await res.json()) as Card
    out(card, () => console.log(cardShown(card)))
  },
  async set({ rest, out, session }) {
    const [what, ...words] = rest
    const value = words.join(" ")
    if (!what || !value) throw new Said("eid set <what> <value>", "usage")
    const { key } = await session()
    const field = what.toLowerCase()
    const card =
      field === "name" || field === "bio" || field === "country"
        ? await api<MyCard>("/card", {
            method: "PATCH",
            key,
            body: { [field]: value },
          })
        : field === "vouches"
          ? await api<MyCard>("/card", {
              method: "PATCH",
              key,
              body: { vouches: /^(on|yes|true)$/i.test(value) },
            })
          : (PLATFORMS as readonly string[]).includes(field)
            ? await api<MyCard>(`/card/links/${field}`, {
                method: "PUT",
                key,
                body: { value },
              })
            : null
    if (!card)
      throw new Said(
        `Set what? name, bio, country, vouches, or a platform: ${PLATFORMS.join(", ")}`,
        "usage",
      )
    out(card, () => console.log(`${ui.ok("set")} ${field}`))
  },
  async unset({ rest, out, session }) {
    const [platform] = rest
    if (!platform) throw new Said("eid unset <platform>", "usage")
    const card = await api<MyCard>(
      `/card/links/${encodeURIComponent(platform.toLowerCase())}`,
      { method: "DELETE", key: (await session()).key },
    )
    out(card, () => console.log(`${ui.ok("took off")} ${platform}`))
  },
  async stats({ out, session }) {
    const stats = await api<Stats>("/stats", { key: (await session()).key })
    out(stats, () =>
      console.log(
        kv([
          ["visits", String(stats.views)],
          ["links opened", String(stats.hits)],
        ]),
      ),
    )
  },
  async skill({ rest, values, out }) {
    if (rest[0] === undefined)
      return out({ skill: skill(VERSION) }, () =>
        process.stdout.write(skill(VERSION)),
      )
    if (rest[0] !== "install") throw new Said("eid skill [install]", "usage")
    const file = installSkill(VERSION, values.dir)
    out({ installed: file }, () => console.log(`${ui.ok("installed")} ${file}`))
  },
  async help({ rest, out }) {
    const [name] = rest
    if (!name)
      return out({ version: VERSION, commands: COMMANDS, global: GLOBAL }, () =>
        console.log(overview(VERSION)),
      )
    const command = commandNamed(name)
    if (!command) throw new Said(`No command "${name}". eid help`, "usage")
    out(command, () => console.log(detail(command)))
  },
}

/** Whether the answer is to be JSON, read before the arguments are parsed, so
 *  a bad argument is answered as JSON too. */
const JSON_OUT = process.argv.includes("--json")

async function main() {
  let parsed: ReturnType<typeof parse>
  try {
    parsed = parse()
  } catch (error) {
    throw new Said((error as Error).message, "usage")
  }
  const { values, positionals } = parsed
  refreshSkill(VERSION)
  if (values.version)
    return console.log(
      JSON_OUT ? JSON.stringify({ version: VERSION }) : VERSION,
    )
  const [name = "help", ...rest] = values.help
    ? ["help", ...positionals]
    : positionals

  const domain = values.on ?? "eid.to"
  if (!(DOMAINS as readonly string[]).includes(domain))
    throw new Said(`--on is one of ${DOMAINS.join(", ")}`, "usage")
  const command = commandNamed(name)
  if (!command) throw new Said(`No command "${name}". eid help`, "usage")

  const browser = !values["no-browser"] && !process.env.SSH_CONNECTION
  const context: Context = {
    rest,
    values,
    json: JSON_OUT,
    out: (data, human) =>
      JSON_OUT ? console.log(JSON.stringify(data, null, 2)) : human(),
    browser,
    domain,
    session: async () => {
      const config = readConfig()
      if (config) return config
      if (!process.stdin.isTTY)
        throw new Said(
          `Not signed in to ${BASE}: run eid login`,
          "unauthorized",
        )
      console.error(ui.muted(`Signing this machine in to ${BASE} first.`))
      return login(browser)
    },
  }
  await RUN[command.name as CommandName](context)
}

function parse() {
  return parseArgs({
    allowPositionals: true,
    options: {
      until: { type: "string" },
      opens: { type: "string" },
      card: { type: "string" },
      on: { type: "string" },
      dir: { type: "string" },
      to: { type: "string" },
      password: { type: "string" },
      yes: { type: "boolean", short: "y" },
      watch: { type: "boolean" },
      "accept-from": { type: "string" },
      json: { type: "boolean" },
      "no-browser": { type: "boolean" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
  })
}

main().catch((error: unknown) => {
  if (error instanceof Said) {
    if (JSON_OUT)
      console.log(
        JSON.stringify({
          error: {
            code: error.code,
            message: error.message,
            ...(error.fields && { fields: error.fields }),
          },
        }),
      )
    else console.error(ui.bad(error.message))
    process.exit(1)
  }
  // A bug of eid's: the stack for whoever reports it, and still the one shape
  // for a program reading stdout.
  if (JSON_OUT)
    console.log(
      JSON.stringify({
        error: { code: "crash", message: (error as Error).message },
      }),
    )
  throw error
})

// Every command in the table has a runner (RUN's type says so); this says the
// table has no runner it lacks.
for (const name of Object.keys(RUN))
  if (!COMMANDS.some((c) => c.name === name))
    throw new Error(`eid: a runner for "${name}", which no command names`)
