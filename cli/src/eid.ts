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
import {
  bar,
  indent,
  kv,
  link,
  spinner,
  table,
  ui,
} from "@adriangalilea/utils/cli"
import type { z } from "zod"
import type * as S from "@/lib/api-schemas"
import { bare, cardLines } from "@/lib/card-lines"
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
/** Here once this machine was told that a send shows the two machines each other's
 *  IP address: it is said on the first send only. */
const TOLD = join(CONFIG_DIR, "told-peer-to-peer")

type Config = { base: string; key: string; username: string }

/** The name each file was last sent under from this machine, by its full path, so
 *  sending it again gives the same address (`eid send`). Per e-ID (EID_URL). */
const SENT = join(CONFIG_DIR, "sent.json")

function readSentNames(): Record<string, string> {
  try {
    const all = JSON.parse(readFileSync(SENT, "utf8")) as Record<
      string,
      Record<string, string>
    >
    return all[BASE] ?? {}
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {}
    throw error
  }
}

function writeSentNames(names: Record<string, string>) {
  const all = existsSync(SENT)
    ? (JSON.parse(readFileSync(SENT, "utf8")) as Record<
        string,
        Record<string, string>
      >)
    : {}
  mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 })
  writeFileSync(SENT, JSON.stringify({ ...all, [BASE]: names }, null, 2), {
    mode: 0o600,
  })
}

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
      `for ${link.to
        .map((p) =>
          p.taken
            ? `${p.username} ${ui.ok("(took it)")}`
            : p.declined
              ? `${p.username} ${ui.warn("(said no)")}`
              : p.username,
        )
        .join(", ")}`,
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
    child.on("exit", (code, signal) => {
      if (code === 0) return done()
      // sendme's last words, where they say what went wrong; its progress lines
      // ("getting collection …") say nothing about it.
      const last = said.trim().split("\n").at(-1) ?? ""
      fail(
        new Said(
          `the connection dropped (${/error/i.test(last) ? last : (signal ?? `sendme ${code}`)})`,
          "unreachable",
        ),
      )
    })
  })
}

/** A question for the person at the terminal, on stderr so stdout stays the answer.
 *  Ctrl-C at it is Ctrl-C, which readline would otherwise swallow. */
async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr })
  rl.on("SIGINT", () => process.kill(process.pid, "SIGINT"))
  try {
    return (await rl.question(question)).trim()
  } catch (error) {
    // Ctrl-D at the question is no answer, so the default one.
    if ((error as Error).name === "AbortError") {
      process.stderr.write("\n")
      return ""
    }
    throw error
  } finally {
    rl.close()
  }
}

/** A question whose answer is never shown as it is typed (a password): read key by
 *  key with the terminal in raw mode, so it is in no scrollback and no recording. */
function askHidden(question: string): Promise<string> {
  const input = process.stdin
  process.stderr.write(question)
  input.setRawMode(true)
  input.resume()
  return new Promise((done) => {
    let typed: string[] = []
    const finish = () => {
      input.off("data", onKey)
      input.setRawMode(false)
      input.pause()
      process.stderr.write("\n")
    }
    const onKey = (chunk: Buffer) => {
      for (const c of chunk.toString("utf8")) {
        if (c === "\u0003") {
          finish()
          process.kill(process.pid, "SIGINT")
          return
        }
        if (c === "\r" || c === "\n") {
          finish()
          done(typed.join(""))
          return
        }
        typed =
          c === "\u007f" || c === "\b" ? typed.slice(0, -1) : [...typed, c]
      }
    }
    input.on("data", onKey)
  })
}

/** A path as a person reads it: under their home, from ~. */
const fromHome = (path: string) =>
  path === homedir() || path.startsWith(`${homedir()}/`)
    ? `~${path.slice(homedir().length)}`
    : path

const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

/** When, from now: "just now", "5 minutes ago", "yesterday". */
function ago(iso: string): string {
  const seconds = (Date.parse(iso) - Date.now()) / 1000
  const far = Math.abs(seconds)
  if (far < 60) return "just now"
  const [n, unit]: [number, Intl.RelativeTimeFormatUnit] =
    far < 3600
      ? [seconds / 60, "minute"]
      : far < 86400
        ? [seconds / 3600, "hour"]
        : [seconds / 86400, "day"]
  return RELATIVE.format(Math.round(n), unit)
}

/** Who a send is from: "Ada Lovelace @ada", or "@ada" with no name on their card. */
const fromWhom = (
  from: { username: string; name: string | null },
  domain: string,
) => {
  // Their page, clickable where the terminal links: who this is, one press away.
  const page = `${domain}/${from.username.toLowerCase()}`
  const handle = ui.accent(`@${from.username}`)
  const who =
    from.name && from.name.toLowerCase() !== from.username.toLowerCase()
      ? `${ui.head(from.name)} ${handle}`
      : handle
  // The emoji domain spelled as DNS knows it, for whatever opens the link.
  const host = domain === "👤.to" ? "xn--mq8h.to" : domain
  return `${who}  ${link(ui.muted(page), `https://${host}/${from.username.toLowerCase()}`)}`
}

/** Said before sendme is fetched, the first time a machine needs it. */
const fetchingSendme = () =>
  console.error(ui.muted("  fetching sendme, once (about 4 MB)"))

type Taken = { file: string; size: number; path: string; from: string }

/** What has come of a download in `dir`: the bytes sendme keeps there as it fetches
 *  (`.sendme-recv-<hash>`, by the file's content). */
function arrivedIn(dir: string): number {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith(".sendme-recv-"))
    .reduce((total, e) => total + sizeOf(join(dir, e.name)), 0)
}

/** What `eid send` prints for each thing that happens to its send. */
const SAYS: Record<SendEvents["events"][number]["kind"], string> = {
  asked: "said yes, downloading",
  got: ui.ok("got it"),
  declined: ui.warn("said no"),
}

/** How often a paused send is asked about while `eid get` waits for its machine. */
const AWAY_POLL_MS = 15_000
/** How many dropped connections one `eid get` picks up from before it stops and
 *  says so (what came is kept: running it again picks up from there). */
const MOST_DROPS = 8

/** A send taken: its ticket asked for (with this machine's key where it has one, so a
 *  send for its person is given; with the password where it has one), who sends what
 *  and where it goes shown (on stderr; not under `json` when nothing is asked), asked
 *  about unless `yes`, the file brought into `dir` with sendme, and, for a send
 *  addressed to this person, e-ID told it came. Null where it is declined. */
async function take(
  address: string,
  o: {
    dir: string
    yes: boolean
    password: string | undefined
    json: boolean
    /** The domain addresses are printed on (--on). */
    domain: string
  },
): Promise<Taken | null> {
  const at = sendAt(address)
  const key = readConfig()?.key
  const path = `/sends/${encodeURIComponent(at.username)}/${encodeURIComponent(at.name)}`
  let password = o.password
  let send: Send
  // A send whose machine is not answering is waited for, said once.
  let waitSaid = false
  const waitFor = async (error: Said) => {
    if (!waitSaid)
      console.error(
        `  ${ui.warn(error.message)}\n  ${ui.muted("waiting for it · Ctrl-C to stop")}`,
      )
    waitSaid = true
    await sleep(AWAY_POLL_MS)
  }
  for (;;) {
    try {
      send = await api<Send>(path, { key, password })
      break
    } catch (error) {
      if ((error as Said).code === "away") {
        await waitFor(error as Said)
        continue
      }
      if ((error as Said).code !== "password" || !process.stdin.isTTY)
        throw error
      if (password) console.error(`  ${ui.bad("not the password")}`)
      password = await askHidden(`  password for ${at.username}/${at.name}: `)
    }
  }
  const target = join(o.dir, send.file.name)
  if (!o.json || !o.yes)
    console.error(
      `\n${kv(
        [
          [
            "from",
            fromWhom({ username: send.from, name: send.fromName }, o.domain),
          ],
          [
            "file",
            `${send.file.name}  ${ui.muted(BYTES.format(send.file.size))}`,
          ],
          ["into", `${fromHome(o.dir)}  ${ui.muted("(--dir to change)")}`],
        ],
        { indent: 2 },
      )}\n`,
    )
  if (existsSync(target))
    throw new Said(
      `${fromHome(target)} is already there: --dir somewhere else`,
      "exists",
    )
  // The answer reaches its sender live (yes: it is coming; no: they are told), said
  // as the send was asked for; the file is had or left either way, so a refusal of
  // the answer is said, never thrown.
  const answer = (said: "yes" | "no") =>
    api(`${path}/answer`, {
      method: "POST",
      key,
      password,
      body: { answer: said },
    }).catch((error: unknown) => {
      if (!(error instanceof Said)) throw error
      console.error(ui.muted(`  the sender was not told: ${error.message}`))
    })
  if (!o.yes) {
    if (!process.stdin.isTTY)
      throw new Said(
        `${at.username}/${at.name} is ${send.file.name} from @${send.from}: say --yes to take it without a terminal to ask in`,
        "unconfirmed",
      )
    if (
      !/^y(es)?$/i.test(
        await ask(`  ${ui.head("take it?")} ${ui.muted("(y/N)")} `),
      )
    ) {
      await answer("no")
      console.error(
        ui.muted(`  left where it is: @${send.from} sees you said no`),
      )
      return null
    }
  }
  await answer("yes")
  mkdirSync(o.dir, { recursive: true })
  const bin = await sendme(fetchingSendme)
  // A dropped connection is picked up where it stopped: sendme keeps what came in
  // the folder (.sendme-recv-<hash>, by the file's content) and fetches only the
  // rest, from whatever ticket the send has now (its sender may have come back).
  let ticket = send.ticket
  const size = BYTES.format(send.file.size)
  for (let drops = 0; ; ) {
    try {
      await spinner(`${send.file.name} ${ui.muted(size)}`, async (set) => {
        // How much has come, read off what sendme keeps as it fetches: a bar,
        // never a guess.
        const every = setInterval(() => {
          const had = Math.min(send.file.size, arrivedIn(o.dir))
          set(
            `${send.file.name} ${bar(had, send.file.size, 24)} ${ui.muted(`${BYTES.format(had)} of ${size}`)}`,
          )
        }, 250)
        try {
          await sendmeRun(bin, ["receive", ticket, "--no-progress"], o.dir)
        } finally {
          clearInterval(every)
          set(`${send.file.name} ${ui.muted(size)}`)
        }
      })
      break
    } catch (error) {
      if (!(error instanceof Said)) throw error
      drops++
      if (drops > MOST_DROPS)
        throw new Said(
          `The file did not come: ${error.message}, ${MOST_DROPS} times.\n  What came is kept in ${fromHome(o.dir)}: eid get picks up from there.`,
          error.code,
        )
      console.error(ui.muted(`  picking up where it stopped`))
      await sleep(Math.min(30_000, 2000 * 2 ** (drops - 1)))
      for (;;) {
        try {
          ticket = (await api<Send>(path, { key, password })).ticket
          break
        } catch (asked) {
          if (asked instanceof Said && asked.code === "away") {
            await waitFor(asked)
            continue
          }
          if (asked instanceof Said)
            throw new Said(
              `${asked.message}\n  What came is kept in ${fromHome(o.dir)}: eid get picks up from there if they send it again.`,
              asked.code,
            )
          // This machine's own network, gone a moment: asked again shortly.
          await sleep(5000)
        }
      }
    }
  }
  // The file is here: its sender sees it live, and a send for this person leaves
  // their inbox. Said as the file was asked for (the key, the password); the file
  // is had either way, so a refusal here is said, never thrown.
  await api(`${path}/taken`, { method: "POST", key, password }).catch(
    (error: unknown) => {
      if (!(error instanceof Said)) throw error
      console.error(
        ui.muted(`  the sender was not told it came: ${error.message}`),
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
  stay?: boolean
  self?: boolean
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
    const named = listed(values.to)
    if (values.to !== undefined && named.length === 0)
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
    // --self: this account is one it is for, so the file waits in its own inbox,
    // for its other machines.
    const to = values.self
      ? [...new Set([...named, username.toLowerCase()])]
      : named
    const bin = await sendme(fetchingSendme)
    const work = mkdtempSync(join(tmpdir(), "eid-send-"))
    const child = spawn(bin, ["send", path, "--no-progress"], {
      cwd: work,
      stdio: ["ignore", "pipe", "pipe"],
    })
    let slug: string | null = null
    // Stopping is one way out, whoever asks: Ctrl-C (0, said quietly) or sendme
    // ending on its own (1, said as the failure it is). The name goes either way.
    let stopping = false
    const stop = async (code: number) => {
      if (stopping) return
      stopping = true
      child.kill()
      if (code === 0 && !json)
        console.log(ui.muted(`\n  stopped: /${slug ?? ""} is gone`))
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
      const ticket = await spinner(
        `${file.name} ${ui.muted(BYTES.format(file.size))}`,
        () => ticketFrom(child),
      )
      // The same file sent again keeps its address: the name it had last time on
      // this machine, unless one is given or that one is taken now.
      const remembered = name ? undefined : readSentNames()[path]
      const made = (as: string | undefined) =>
        api<SendMade>("/sends", {
          method: "POST",
          key,
          body: {
            ticket,
            file,
            name: as,
            ...(to.length > 0 && { to }),
            ...(values.password !== undefined && {
              password: values.password,
            }),
          },
        })
      const sent = await made(name ?? remembered).catch((error: unknown) => {
        if (remembered && error instanceof Said && error.code === "taken")
          return made(undefined)
        throw error
      })
      slug = sent.slug
      writeSentNames({ ...readSentNames(), [path]: sent.slug })
    } catch (error) {
      child.kill()
      rmSync(work, { recursive: true, force: true })
      throw error
    }
    process.on("SIGINT", () => void stop(0))
    process.on("SIGTERM", () => void stop(0))
    child.on("exit", (code) => {
      if (stopping) return
      console.error(ui.bad(`sendme stopped (${code}): the send is over`))
      void stop(1)
    })
    const address = addressOn(domain, `/${username}/${slug}`)
    const command = `npx @e-id/eid get ${bare(address)}`
    const copied = !json && copy(command)
    // A person reads a few aligned lines, then each download as it happens; what is
    // said once (the IP note) is said once on a machine, and always in `eid help
    // send` and on the privacy page.
    out({ from: username, slug, file, to, address, command }, () => {
      const forWhom =
        to.length > 0
          ? `${to.map((p) => (p === username.toLowerCase() ? ui.accent("you") : ui.accent(`@${p}`))).join(", ")} only ${ui.muted(to.length === 1 && values.self ? "(in your eid inbox, on your other machines)" : "(in their eid inbox)")}`
          : values.password !== undefined
            ? "anyone with the address and the password"
            : "anyone with the address"
      console.log(
        `\n${kv(
          [
            ["address", bare(address)],
            ["get it", `${command}${copied ? ui.muted("  (copied)") : ""}`],
            ["for", forWhom],
          ],
          { indent: 2 },
        )}\n`,
      )
      if (!existsSync(TOLD)) {
        console.log(
          ui.muted(
            "  Peer to peer: where the two machines connect directly, each sees the other's IP address. (said once)\n",
          ),
        )
        mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 })
        writeFileSync(TOLD, "")
      }
      console.log(
        ui.muted(
          to.length > 0 && !values.stay
            ? "  sending from this machine until each has answered · Ctrl-C to stop"
            : "  sending from this machine · Ctrl-C to stop",
        ),
      )
    })
    // Live: each download as it starts and as it lands, asked of e-ID one held
    // question at a time (GET /links/:name/events). A person reads them on stderr;
    // with --json each is a line on stdout, after the send's own.
    // The file is served whatever happens here: a question that fails (the network
    // gone a moment) is asked again a little later, never the end of the send.
    let after = 0
    // Who of those it is for has taken it or said no.
    const answeredBy = new Set<string>()
    for (;;) {
      const answered = await api<SendEvents>(
        `/links/${encodeURIComponent(slug)}/events?wait=25&after=${after}`,
        { key },
      ).catch((error: unknown) => {
        if (error instanceof Said && error.code === "not_found") return "gone"
        return null
      })
      // Its name was taken away while this machine was not heard from (a day
      // asleep): the send is over here too.
      if (answered === "gone") {
        console.error(
          ui.bad(
            `  /${slug} is gone: e-ID did not hear from this machine for a day. eid send again to send it under the same name.`,
          ),
        )
        slug = null
        return void (await stop(1))
      }
      if (!answered) {
        await sleep(5000)
        continue
      }
      // Ids only increase: one at or before the last printed is an answer that
      // reached here twice, never a new event.
      for (const e of answered.events) {
        if (e.id <= after) continue
        after = e.id
        if (e.who && e.kind !== "asked") answeredBy.add(e.who.toLowerCase())
        if (json) console.log(JSON.stringify(e))
        else
          console.log(
            `  ${ui.muted(new Date(e.at).toTimeString().slice(0, 8))}  ${e.who ? ui.accent(`@${e.who}`) : "someone"} ${SAYS[e.kind]}`,
          )
      }
      // A send for people is over once each has taken it or said no: nothing is
      // left to wait for, and the name goes. --stay keeps it served.
      if (
        to.length > 0 &&
        !values.stay &&
        to.every((p) => answeredBy.has(p.toLowerCase()))
      ) {
        if (!json) console.log(ui.muted("\n  everyone it was for has answered"))
        return void (await stop(0))
      }
    }
  },
  async get({ rest, values, out, json, domain }) {
    const [address] = rest
    if (!address) throw new Said("eid get <address>", "usage")
    const got = await take(address, {
      dir: resolve(values.dir ?? "."),
      yes: values.yes === true,
      password: values.password,
      json,
      domain,
    })
    if (!got) return out({ taken: false, address }, () => {})
    out(got, () => console.log(`  saved to ${fromHome(got.path)}\n`))
  },
  async inbox({ values, out, session, json, domain }) {
    const { key } = await session()
    if (!values.watch) {
      const inbox = await api<Inbox>("/inbox", { key })
      return out(inbox, () =>
        console.log(
          inbox.waiting.length === 0
            ? ui.muted("  Nothing waiting for you.")
            : `\n${indent(
                table(
                  inbox.waiting.map((w: Waiting) => [
                    fromWhom(w.from, domain),
                    w.file.name,
                    ui.muted(BYTES.format(w.file.size)),
                    w.live ? ui.muted(ago(w.since)) : ui.warn("paused"),
                    ui.muted(`eid get ${w.address}`),
                  ]),
                ),
                2,
              )}\n`,
        ),
      )
    }
    const accepted = new Set(listed(values["accept-from"]))
    if (!json && !process.stdin.isTTY && accepted.size === 0)
      throw new Said(
        "eid inbox --watch asks about each send, and there is no terminal to ask in: --json to list them, --accept-from to take from people you name",
        "unconfirmed",
      )
    // A file waited for lands where downloads land; --dir says otherwise.
    const dir = resolve(values.dir ?? join(homedir(), "Downloads"))
    // Waits for the next send and ends once one is taken; --stay keeps waiting, as
    // does taking from people named without asking (a machine left to receive).
    const stay = values.stay === true || accepted.size > 0
    const seen = new Set<string>()
    let after: string | undefined
    if (!json) {
      console.error(
        ui.muted(
          `\n  waiting for ${stay ? "sends" : "a send"} to you · into ${fromHome(dir)} (--dir to change) · Ctrl-C to stop`,
        ),
      )
      if (accepted.size)
        console.error(
          ui.muted(
            `  taking what ${[...accepted].map((p) => `@${p}`).join(", ")} send without asking`,
          ),
        )
      process.on("SIGINT", () => {
        console.error(ui.muted("\n  stopped watching"))
        process.exit(0)
      })
    }
    for (;;) {
      // A question that fails (the network gone a moment) is asked again a little
      // later; a key that stopped working ends the watch.
      const inbox = await api<Inbox>(
        `/inbox?wait=25${after ? `&after=${encodeURIComponent(after)}` : ""}`,
        { key },
      ).catch((error: unknown) => {
        if (error instanceof Said && error.code === "unauthorized") throw error
        return null
      })
      if (!inbox) {
        await sleep(5000)
        continue
      }
      after = inbox.now
      // Oldest first, as they arrived; one shown before is not shown again.
      for (const w of [...inbox.waiting].reverse()) {
        if (seen.has(w.address)) continue
        seen.add(w.address)
        if (json) {
          console.log(JSON.stringify(w))
          continue
        }
        const got = await take(w.address, {
          dir,
          yes: accepted.has(w.from.username.toLowerCase()),
          password: undefined,
          json,
          domain,
        }).catch((error: unknown) => {
          // One send that cannot be taken (its sender stopped, a file of that name
          // here already) is said, and the watch goes on.
          if (!(error instanceof Said)) throw error
          console.error(`  ${ui.bad(`${w.address}: ${error.message}`)}`)
          return null
        })
        if (!got) continue
        console.log(`  saved to ${fromHome(got.path)}\n`)
        if (!stay) return
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
    out(card, () => console.log(cardLines(card, (role, s) => ui[role](s))))
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
      to: { type: "string", short: "t" },
      password: { type: "string" },
      yes: { type: "boolean", short: "y" },
      watch: { type: "boolean" },
      stay: { type: "boolean" },
      self: { type: "boolean", short: "s" },
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
