// VISITS, kept by the site itself: the server half of a page in the event stream (the
// utils contract, "Web pages"). page-sensor posts each page's lines to the site's own
// route; this module reads them, puts each page in a visit and keeps the rows the views
// read (user-flows). The three are one family: the page, the store, the views.
// Framework-free: a route is a Request in and a Response out, and the store is the
// app's own SQLite through ts-utils' metrics drivers (libSQL / Turso, D1).
//
//     // app/api/events/route.ts
//     export const POST = visitsRoute({ db: libsqlDriver(client), site: "untitled.garden", services: ["garden-web"] })
//
//     // a view
//     const visits = await readVisits(libsqlDriver(client), { site: "untitled.garden", days: 14 })
//
// A VISIT is one caller's pages, each within VISIT_GAP_MS of the one before, within one
// UTC day. The caller is a hash of its IP and user agent with the site and a random
// salt of the day, the salt deleted once the day is over (one store can hold several
// sites, never linking a person across them): a visitor is recognisable within a day,
// never across two, and once the salt is gone by no one. The IP and user agent are
// never stored; nothing is kept in the browser.
//
// ROWS: `visits_visit` (one per visit: when, how many pages, where it came from, coarse
// country and viewport, whether a probe or the site's staff made it), `visits_page`
// (one per page span: its place, path, how it was reached, how long it was on screen,
// the sections it reached, the vitals), `visits_event` (every line of the page's trace
// as written: the page span's own start and end, fetch spans, named events, errors, so
// a page's trace is read back from its lines alone, on the visitor's one clock) and
// `visits_views` (per day, per page, how many visits read it, each once, the staff's
// and probes' never: a count with nothing of who; a visit reads a page by opening it or
// by a `view` line naming it, a post shown whole elsewhere). Pages and visits are kept
// VISIT_DAYS, events EVENT_DAYS, a probe's or staff's FLAGGED_DAYS; old rows go on the
// first write of each day. Views are kept for good: they are what a page's all-time
// count is read from (`readViews`). Provision VISITS_SCHEMA once, never on a request
// (an older store runs VISITS_MIGRATIONS first).
//
// OWNERS: a site whose pages belong to people (a profile, what is under it) says whose
// each page is (`ownerOf`), by an id that never changes, so a person renamed keeps
// their history whole. Each page row carries it, and `visits_owner_views` counts, per
// owner and day, the visits that read any of their pages, each once: kept for good,
// like the views. A person reading their own pages (`readerOf`) is kept, flagged
// `self`, and never counted, in their numbers or a page's.
//
// HITS: a visit to an address that is a redirect (a person's `/gh`) loads no page, so
// no sensor writes it; the route that redirects records it (`visitHits`): whose, the
// name asked for, what it opened (null: nothing), the outside referrer, the country,
// and the day's caller hash, so a caller asking twice in a day is one. A crawler (a
// link preview, a search engine) is kept, flagged, and never counted. `visits_hit`
// keeps them VISIT_DAYS, `visits_owner_hits` the counts for good. `readOwner` reads
// one owner's numbers, and only aggregates: a visit can cross several people's pages,
// so no one is shown another's trace.
//
// REFUSED: a line that is no event, a service the site did not name, a line outside a
// page's trace, a field named like a person (ip, user_agent, email, user, name, phone).
// A crawler's batch is dropped whole and answered 204.

import type {
  MetricsDriver,
  MetricsReader,
  SqlStatement,
  SqlValue,
} from "@adriangalilea/metrics/sqlite"
import { type LogEvent, parseEvent } from "@adriangalilea/utils/log"

/** Pages further apart than this are two visits, as every analytics tool counts them. */
export const VISIT_GAP_MS = 30 * 60_000
export const VISIT_DAYS = 180
export const EVENT_DAYS = 30
/** A probe's or the staff's visits: the developer's view, kept a week. */
export const FLAGGED_DAYS = 7

const MAX_BYTES = 64 * 1024
const DAY_MS = 86_400_000

/** Run explicitly during provisioning, never on a request. */
export const VISITS_SCHEMA = [
  "CREATE TABLE IF NOT EXISTS visits_salt (day TEXT PRIMARY KEY, salt TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS visits_caller (day TEXT NOT NULL, caller TEXT NOT NULL, visit TEXT NOT NULL, last INTEGER NOT NULL, PRIMARY KEY (day, caller))",
  "CREATE TABLE IF NOT EXISTS visits_visit (id TEXT PRIMARY KEY, site TEXT NOT NULL, day TEXT NOT NULL, started INTEGER NOT NULL, last INTEGER NOT NULL, pages INTEGER NOT NULL, referrer TEXT, source TEXT, country TEXT, viewport TEXT, probe INTEGER NOT NULL, staff INTEGER NOT NULL)",
  "CREATE INDEX IF NOT EXISTS visits_visit_day ON visits_visit (site, day)",
  "CREATE TABLE IF NOT EXISTS visits_page (span_id TEXT PRIMARY KEY, trace_id TEXT NOT NULL, visit TEXT NOT NULL, seq INTEGER NOT NULL, site TEXT NOT NULL, day TEXT NOT NULL, at INTEGER NOT NULL, host TEXT NOT NULL, path TEXT NOT NULL, place TEXT, route TEXT, nav TEXT NOT NULL, from_path TEXT, build TEXT, dur_ms REAL, reached TEXT, ttfb_ms REAL, lcp_ms REAL, inp_ms REAL, cls REAL, owner TEXT, self INTEGER NOT NULL DEFAULT 0)",
  "CREATE INDEX IF NOT EXISTS visits_page_visit ON visits_page (visit, seq)",
  "CREATE INDEX IF NOT EXISTS visits_page_trace ON visits_page (trace_id)",
  "CREATE INDEX IF NOT EXISTS visits_page_day ON visits_page (site, day)",
  "CREATE INDEX IF NOT EXISTS visits_page_owner ON visits_page (site, owner, day)",
  "CREATE TABLE IF NOT EXISTS visits_event (id INTEGER PRIMARY KEY, visit TEXT NOT NULL, trace_id TEXT NOT NULL, day TEXT NOT NULL, at INTEGER NOT NULL, line TEXT NOT NULL)",
  "CREATE INDEX IF NOT EXISTS visits_event_visit ON visits_event (visit, id)",
  "CREATE INDEX IF NOT EXISTS visits_event_day ON visits_event (day)",
  "CREATE TABLE IF NOT EXISTS visits_views (site TEXT NOT NULL, day TEXT NOT NULL, host TEXT NOT NULL, path TEXT NOT NULL, views INTEGER NOT NULL, PRIMARY KEY (site, day, host, path))",
  "CREATE TABLE IF NOT EXISTS visits_owner_views (site TEXT NOT NULL, owner TEXT NOT NULL, day TEXT NOT NULL, views INTEGER NOT NULL, PRIMARY KEY (site, owner, day))",
  "CREATE TABLE IF NOT EXISTS visits_hit (id INTEGER PRIMARY KEY, site TEXT NOT NULL, day TEXT NOT NULL, at INTEGER NOT NULL, owner TEXT NOT NULL, name TEXT NOT NULL, opened TEXT, referrer TEXT, country TEXT, caller TEXT NOT NULL, crawler INTEGER NOT NULL, self INTEGER NOT NULL)",
  "CREATE INDEX IF NOT EXISTS visits_hit_owner ON visits_hit (site, owner, day)",
  "CREATE INDEX IF NOT EXISTS visits_hit_caller ON visits_hit (day, caller)",
  "CREATE TABLE IF NOT EXISTS visits_owner_hits (site TEXT NOT NULL, owner TEXT NOT NULL, day TEXT NOT NULL, name TEXT NOT NULL, opened TEXT NOT NULL, hits INTEGER NOT NULL, PRIMARY KEY (site, owner, day, name, opened))",
] as const

/** What a store provisioned before a change needs, run once, in order, BEFORE
 *  VISITS_SCHEMA (which then adds the new tables and indexes). A store made from
 *  VISITS_SCHEMA after a change's date needs none of it. */
export const VISITS_MIGRATIONS = [
  {
    on: "2026-10-16",
    statements: [
      "ALTER TABLE visits_page ADD COLUMN owner TEXT",
      "ALTER TABLE visits_page ADD COLUMN self INTEGER NOT NULL DEFAULT 0",
    ],
  },
] as const

export interface VisitsOptions {
  /** The site's own SQLite, VISITS_SCHEMA provisioned. */
  readonly db: MetricsDriver
  /** The registrable domain whose pages these are: its subdomains share its visits. */
  readonly site: string
  /** The other domains the same pages are served on (a short domain, an emoji
   *  one in punycode): their pages are the site's, never another site's, and
   *  a visit coming from one has no outside referrer. */
  readonly domains?: readonly string[]
  /** The services the site's pages write as (`garden-web`); any other line is refused. */
  readonly services: readonly string[]
  /** Who called, from the request. The default reads Cloudflare's, then Vercel's, then any proxy's headers. */
  readonly caller?: (request: Request) => Caller
  /**
   * The site's own people reading (its signed-in owner, a development host): the
   * pages a batch starts are flagged staff, as a page saying so itself is. Asked
   * only of a batch that starts a page, on the server, where the session is.
   */
  readonly staff?: (request: Request) => boolean | Promise<boolean>
  /**
   * Whose a page is, where the site's pages belong to people: an id that never
   * changes (never a name, which can), or null for the site's own pages. Asked once
   * for each page kept.
   */
  readonly ownerOf?: (
    host: string,
    path: string,
  ) => string | null | Promise<string | null>
  /**
   * The owner reading, where the reader is one (signed in): their own pages are
   * kept, flagged `self`, never counted. Asked only of a batch that starts a page.
   * Only ever hides a view, so a value the browser could forge is good enough.
   */
  readonly readerOf?: (
    request: Request,
  ) => string | null | Promise<string | null>
  readonly now?: () => number
}

/** The request's caller: hashed with the day's salt, never stored. `country` is two letters, kept. */
export interface Caller {
  readonly ip: string
  readonly agent: string
  readonly country?: string
}

export function callerOf(request: Request): Caller {
  const h = request.headers
  const ip =
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    ""
  const country = (
    h.get("cf-ipcountry") ?? h.get("x-vercel-ip-country")
  )?.toUpperCase()
  return {
    ip,
    agent: h.get("user-agent") ?? "",
    country: country && /^[A-Z]{2}$/.test(country) ? country : undefined,
  }
}

/** Crawlers are no visitors: dropped, never stored. A probe (an automated browser) says so itself and is kept, flagged. */
const CRAWLER =
  /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|monitor|curl|wget|python-requests|go-http-client/i

/** Whether a user agent is a crawler's (a search engine, a link preview, a
 *  monitor, a command-line client) and never a person's: what a site must not
 *  count, or let use up a link meant for one open. */
export function isCrawler(agent: string): boolean {
  return CRAWLER.test(agent)
}

/** A field named like a person: refused, so no page or server ever writes one. */
const PERSONAL = new Set(["ip", "user_agent", "email", "user", "name", "phone"])

const utcDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10)
const daysBefore = (ms: number, days: number): string =>
  utcDay(ms - days * DAY_MS)

function hex(bytes: ArrayBuffer | Uint8Array): string {
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("")
}

async function sha256(text: string): Promise<string> {
  return hex(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
  )
}

/** Inside the site: one of its domains, a subdomain of one, or a local development
 *  host. */
function inside(host: string, domains: readonly string[]): boolean {
  const name = host.replace(/:\d+$/, "")
  return (
    domains.some((d) => name === d || name.endsWith(`.${d}`)) ||
    name === "localhost" ||
    name.endsWith(".localhost")
  )
}

/** Every domain a site's pages are served on: `site` and its `domains`, each
 *  checked as a domain (an emoji domain in its punycode). */
function domainsOf(site: string, more: readonly string[] = []): string[] {
  const all = [site, ...more]
  for (const d of all)
    if (!/^[a-z0-9.-]+$/.test(d))
      throw new Error(
        `visits: a site's domain is a domain (punycode for an emoji one), got ${d}`,
      )
  return all
}

export interface Rejection {
  readonly line: number
  readonly why: string
}

const json = (status: number, body: unknown): Response =>
  new Response(`${JSON.stringify(body)}\n`, {
    status,
    headers: { "content-type": "application/json" },
  })

const str = (v: unknown): string | null => (typeof v === "string" ? v : null)
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null

/** The day pruning last ran, per process: old rows go on the first write of each day. */
let pruned = ""

/** The route: a page's batch in, `204`, or `400 {accepted, rejected}` with the accepted lines kept. */
export function visitsRoute(
  options: VisitsOptions,
): (request: Request) => Promise<Response> {
  const { db, site, services } = options
  const ours = domainsOf(site, options.domains)
  if (services.length === 0)
    throw new Error("visits: name the services the site's pages write as")
  const now = options.now ?? Date.now
  const callerFrom = options.caller ?? callerOf

  return async (request) => {
    if (request.method !== "POST")
      return json(405, { why: "a batch is a POST" })
    const type = (request.headers.get("content-type") ?? "")
      .toLowerCase()
      .replaceAll(" ", "")
    if (!type.startsWith("text/plain"))
      return json(415, { why: "want Content-Type: text/plain;charset=utf-8" })
    const origin = request.headers.get("origin")
    if (origin && !inside(new URL(origin).host, ours))
      return json(403, { why: "a page of another site" })
    const body = await request.arrayBuffer()
    if (body.byteLength > MAX_BYTES)
      return json(413, { why: "a batch is at most 64 KB" })
    const caller = callerFrom(request)
    if (CRAWLER.test(caller.agent)) return new Response(null, { status: 204 })

    const rejected: Rejection[] = []
    const events: { n: number; line: string; e: LogEvent }[] = []
    new TextDecoder()
      .decode(body)
      .split("\n")
      .forEach((line, i) => {
        const n = i + 1
        const why = refusal(line, services)
        if (typeof why === "string") rejected.push({ line: n, why })
        else events.push({ n, line, e: why })
      })

    const at = now()
    const day = utcDay(at)
    const statements: SqlStatement[] = []
    if (pruned !== day) {
      statements.push(...pruning(at))
      pruned = day
    }
    const paging = events.some(
      ({ e }) => e.msg === "page" && e.phase !== undefined,
    )
    const staff =
      paging && options.staff !== undefined
        ? await options.staff(request)
        : false
    const reader =
      paging && options.readerOf !== undefined
        ? await options.readerOf(request)
        : null
    const { visitOf, viewers } = await assign(
      db,
      site,
      { caller, staff, reader, ownerOf: options.ownerOf, ours },
      day,
      at,
      events,
      statements,
    )
    let accepted = 0
    for (const { n, line, e } of events) {
      const visit = visitOf(e.trace_id as string)
      if (visit === undefined) {
        rejected.push({ line: n, why: "no page of this trace was kept" })
        continue
      }
      accepted++
      if (e.msg === "page" && e.phase === "end") statements.push(pageEnd(e))
      // A post read where it was shown (a note in a feed): a view of its page.
      const host = str(e.fields?.host)
      const path = str(e.fields?.path)
      if (
        e.msg === "view" &&
        e.phase === undefined &&
        host !== null &&
        path?.startsWith("/") &&
        inside(host, ours)
      ) {
        let viewer = viewers.get(visit)
        if (viewer === undefined) {
          viewer = await viewerOf(db, visit)
          viewers.set(visit, viewer)
        }
        statements.push(...view(viewer, { site, day, host, path }, false))
      }
      statements.push({
        sql: "INSERT INTO visits_event (visit, trace_id, day, at, line) VALUES (?, ?, ?, ?, ?)",
        args: [visit, e.trace_id as string, day, at, line],
      })
    }
    if (statements.length > 0) await db.transact(statements)
    if (rejected.length === 0) return new Response(null, { status: 204 })
    rejected.sort((a, b) => a.line - b.line)
    return json(400, { accepted, rejected })
  }
}

/** Why a line is refused, or its event. */
function refusal(line: string, services: readonly string[]): string | LogEvent {
  if (line.length === 0) return "empty line"
  let e: LogEvent | null
  try {
    e = parseEvent(line)
  } catch (err) {
    return (err as Error).message.slice(0, 300)
  }
  if (e === null) return "not an event"
  if (!services.includes(e.service))
    return `service ${e.service} is not one of the site's pages`
  if (e.trace_id === undefined) return "outside any page's trace"
  const personal = Object.keys(e.fields ?? {}).find((k) => PERSONAL.has(k))
  if (personal !== undefined) return `a field named like a person: ${personal}`
  if (e.msg === "page" && e.phase !== undefined && e.parent_id !== undefined)
    return "a page span is the root of its trace"
  return e
}

/**
 * Puts each page the batch names and no earlier batch kept in a visit (the caller's
 * open one, else a new one) and adds its rows to `statements`; returns each trace's
 * visit, the batch's pages first, then pages kept before. Batches arrive in any order
 * (a hidden page's beacon can overtake the fetch carrying its start), and a page
 * span's end carries every field of its start, so whichever of the two arrives first
 * keeps the page.
 */
async function assign(
  db: MetricsDriver,
  site: string,
  {
    caller,
    staff,
    reader,
    ownerOf,
    ours,
  }: {
    caller: Caller
    staff: boolean
    reader: string | null
    ownerOf: VisitsOptions["ownerOf"]
    ours: readonly string[]
  },
  day: string,
  at: number,
  events: readonly { e: LogEvent }[],
  statements: SqlStatement[],
): Promise<{
  visitOf: (trace: string) => string | undefined
  viewers: Map<string, Viewer>
}> {
  const viewers = new Map<string, Viewer>()
  const traces = [...new Set(events.map(({ e }) => e.trace_id as string))]
  // One event per page, its start where the batch has it.
  const opened = new Map<string, LogEvent>()
  for (const { e } of events)
    if (
      e.msg === "page" &&
      e.phase !== undefined &&
      (e.phase === "start" || !opened.has(e.trace_id as string))
    )
      opened.set(e.trace_id as string, e)
  const starts = [...opened.values()]
  const known = new Map<string, string>()
  if (traces.length > 0) {
    const rows = await db.query({
      sql: `SELECT trace_id, visit FROM visits_page WHERE site = ? AND trace_id IN (${traces.map(() => "?").join(",")})`,
      args: [site, ...traces],
    })
    for (const r of rows) known.set(String(r.trace_id), String(r.visit))
  }
  if (starts.length === 0) return { visitOf: (t) => known.get(t), viewers }

  const id = await callerHash(db, site, day, caller)
  const [open] = [
    ...(await db.query({
      sql: "SELECT c.visit, c.last, v.pages FROM visits_caller c JOIN visits_visit v ON v.id = c.visit WHERE c.day = ? AND c.caller = ?",
      args: [day, id],
    })),
  ]
  /** The visit the batch's pages join: its pages so far and what it has viewed. */
  let visit: ({ id: string; pages: number } & Viewer) | null =
    open && at - Number(open.last) <= VISIT_GAP_MS
      ? {
          id: String(open.visit),
          pages: Number(open.pages),
          ...(await viewerOf(db, String(open.visit))),
        }
      : null
  for (const e of starts) {
    if (known.has(e.trace_id as string)) continue
    const f = e.fields ?? {}
    const flag = (k: "probe" | "staff") =>
      f[k] === true || (k === "staff" && staff) ? 1 : 0
    if (visit === null) {
      const referrer = str(f.referrer)
      visit = {
        id: hex(crypto.getRandomValues(new Uint8Array(8))),
        pages: 0,
        flagged: false,
        seen: new Set(),
        owners: new Set(),
      }
      statements.push({
        sql: "INSERT INTO visits_visit (id, site, day, started, last, pages, referrer, source, country, viewport, probe, staff) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)",
        args: [
          visit.id,
          site,
          day,
          at,
          at,
          referrer !== null && !inside(referrer, ours) ? referrer : null,
          str(f.source),
          caller.country ?? null,
          str(f.viewport),
          flag("probe"),
          flag("staff"),
        ],
      })
    }
    visit.pages += 1
    known.set(e.trace_id as string, visit.id)
    const host = str(f.host) ?? ""
    const path = str(f.path) ?? "/"
    const owner = ownerOf ? await ownerOf(host, path) : null
    const self = owner !== null && owner === reader
    visit.flagged ||= flag("probe") === 1 || flag("staff") === 1
    viewers.set(visit.id, visit)
    statements.push(...view(visit, { site, day, host, path }, self))
    if (owner !== null && !self && !visit.flagged && !visit.owners.has(owner)) {
      visit.owners.add(owner)
      statements.push({
        sql: "INSERT INTO visits_owner_views (site, owner, day, views) VALUES (?, ?, ?, 1) ON CONFLICT (site, owner, day) DO UPDATE SET views = views + 1",
        args: [site, owner, day],
      })
    }
    statements.push(
      {
        sql: "INSERT OR IGNORE INTO visits_page (span_id, trace_id, visit, seq, site, day, at, host, path, place, route, nav, from_path, build, owner, self) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [
          e.span_id as string,
          e.trace_id as string,
          visit.id,
          visit.pages,
          site,
          day,
          at,
          host,
          path,
          str(f.place),
          str(f.route),
          str(f.nav) ?? "navigate",
          str(f.from),
          str(f.build),
          owner,
          self ? 1 : 0,
        ],
      },
      {
        sql: "UPDATE visits_visit SET last = ?, pages = ?, probe = max(probe, ?), staff = max(staff, ?) WHERE id = ?",
        args: [at, visit.pages, flag("probe"), flag("staff"), visit.id],
      },
    )
  }
  if (visit !== null)
    statements.push({
      sql: "INSERT INTO visits_caller (day, caller, visit, last) VALUES (?, ?, ?, ?) ON CONFLICT (day, caller) DO UPDATE SET visit = excluded.visit, last = excluded.last",
      args: [day, id, visit.id, at],
    })
  return { visitOf: (t) => known.get(t), viewers }
}

/** What a visit has read, for its views: whether it is the staff's or a probe's (never
 *  counted), each page (host and path) it opened or was shown (a "view" line), each a
 *  view once, and each owner whose pages it read (not as their owner), each once. */
interface Viewer {
  flagged: boolean
  readonly seen: Set<string>
  readonly owners: Set<string>
}

const viewKey = (host: string, path: string) => `${host}\0${path}`

async function viewerOf(db: MetricsReader, visit: string): Promise<Viewer> {
  const [v] = [
    ...(await db.query({
      sql: "SELECT probe, staff FROM visits_visit WHERE id = ?",
      args: [visit],
    })),
  ]
  if (v === undefined) throw new Error(`visits: no visit ${visit}`)
  const read = await db.query({
    sql: "SELECT host, path FROM visits_page WHERE visit = ? UNION SELECT json_extract(line, '$.fields.host'), json_extract(line, '$.fields.path') FROM visits_event WHERE visit = ? AND json_extract(line, '$.msg') = 'view' AND json_extract(line, '$.phase') IS NULL",
    args: [visit, visit],
  })
  const owners = await db.query({
    sql: "SELECT DISTINCT owner FROM visits_page WHERE visit = ? AND owner IS NOT NULL AND self = 0",
    args: [visit],
  })
  return {
    flagged: Number(v.probe) === 1 || Number(v.staff) === 1,
    seen: new Set(
      [...read].map((r) => viewKey(String(r.host), String(r.path))),
    ),
    owners: new Set([...owners].map((r) => String(r.owner))),
  }
}

/** A page read by a visit: a view of it, the first time this visit reads it, unless
 *  its owner is the one reading (`self`). */
function view(
  viewer: Viewer,
  at: { site: string; day: string; host: string; path: string },
  self: boolean,
): SqlStatement[] {
  const key = viewKey(at.host, at.path)
  const first = !viewer.seen.has(key)
  viewer.seen.add(key)
  return first && !viewer.flagged && !self
    ? [
        {
          sql: "INSERT INTO visits_views (site, day, host, path, views) VALUES (?, ?, ?, ?, 1) ON CONFLICT (site, day, host, path) DO UPDATE SET views = views + 1",
          args: [at.site, at.day, at.host, at.path],
        },
      ]
    : []
}

/** What a page span's end adds to its row. */
function pageEnd(e: LogEvent): SqlStatement {
  const f = e.fields ?? {}
  const reached = Array.isArray(f.reached)
    ? JSON.stringify(f.reached.filter((s) => typeof s === "string"))
    : null
  return {
    sql: "UPDATE visits_page SET dur_ms = ?, reached = ?, ttfb_ms = ?, lcp_ms = ?, inp_ms = ?, cls = ? WHERE span_id = ?",
    args: [
      num(e.dur_ms),
      reached,
      num(f.ttfb_ms),
      num(f.lcp_ms),
      num(f.inp_ms),
      num(f.cls),
      e.span_id as string,
    ],
  }
}

/** Each store's salt of the day as this process last read it: a salt never changes
 *  within its day. */
const salted = new WeakMap<MetricsDriver, { day: string; salt: string }>()

/** The day's salt: random, made on the day's first page, deleted once the day is over. */
async function saltOf(db: MetricsDriver, day: string): Promise<string> {
  const known = salted.get(db)
  if (known?.day === day) return known.salt
  await db.transact([
    {
      sql: "INSERT INTO visits_salt (day, salt) VALUES (?, ?) ON CONFLICT (day) DO NOTHING",
      args: [day, hex(crypto.getRandomValues(new Uint8Array(32)))],
    },
    { sql: "DELETE FROM visits_salt WHERE day < ?", args: [day] },
    { sql: "DELETE FROM visits_caller WHERE day < ?", args: [day] },
  ])
  const [row] = [
    ...(await db.query({
      sql: "SELECT salt FROM visits_salt WHERE day = ?",
      args: [day],
    })),
  ]
  const salt = row?.salt
  if (typeof salt !== "string") throw new Error(`visits: no salt for ${day}`)
  salted.set(db, { day, salt })
  return salt
}

/** The day's hash of a caller on a site: who it is within the day, never across. */
async function callerHash(
  db: MetricsDriver,
  site: string,
  day: string,
  caller: Caller,
): Promise<string> {
  // The site is in the hash: one store can hold several sites, and a person reading
  // two of them is two callers, never one visit across sites nor a link between them.
  const hash = await sha256(
    `${await saltOf(db, day)}\0${site}\0${caller.ip}\0${caller.agent}`,
  )
  return hash.slice(0, 32)
}

function pruning(at: number): SqlStatement[] {
  const kept = daysBefore(at, VISIT_DAYS)
  const flagged = daysBefore(at, FLAGGED_DAYS)
  const events = daysBefore(at, EVENT_DAYS)
  return [
    {
      sql: "DELETE FROM visits_page WHERE day < ? OR (day < ? AND visit IN (SELECT id FROM visits_visit WHERE probe = 1 OR staff = 1))",
      args: [kept, flagged],
    },
    {
      sql: "DELETE FROM visits_event WHERE day < ? OR (day < ? AND visit IN (SELECT id FROM visits_visit WHERE probe = 1 OR staff = 1))",
      args: [events, flagged],
    },
    {
      sql: "DELETE FROM visits_visit WHERE day < ? OR (day < ? AND (probe = 1 OR staff = 1))",
      args: [kept, flagged],
    },
    {
      sql: "DELETE FROM visits_hit WHERE day < ? OR (day < ? AND (crawler = 1 OR self = 1))",
      args: [kept, flagged],
    },
  ]
}

// --- hits ----------------------------------------------------------------------

/** A redirect a site answered: whose address it was, the name asked for (`gh`), and
 *  what it opened (`github`), or null where it opened nothing of theirs. */
export interface Hit {
  readonly owner: string
  readonly name: string
  readonly opened: string | null
}

/**
 * The recorder a site's redirect routes call, after answering (Next's `after`):
 * each hit a row, and counted once per caller, day, owner and name, never a
 * crawler's (a link preview fetching the address) or the owner's own.
 *
 *     const hits = visitHits({ db, site: "e-id.to", readerOf })
 *     after(() => hits(request, { owner: user.id, name: "gh", opened: "github" }))
 */
export function visitHits(
  options: Pick<
    VisitsOptions,
    "db" | "site" | "domains" | "caller" | "readerOf" | "now"
  >,
): (request: Request, hit: Hit) => Promise<void> {
  const { db, site } = options
  const ours = domainsOf(site, options.domains)
  const now = options.now ?? Date.now
  const callerFrom = options.caller ?? callerOf
  return async (request, hit) => {
    const at = now()
    const day = utcDay(at)
    const caller = callerFrom(request)
    const crawler = CRAWLER.test(caller.agent)
    const self =
      options.readerOf !== undefined &&
      (await options.readerOf(request)) === hit.owner
    const id = await callerHash(db, site, day, caller)
    const referer = request.headers.get("referer")
    const outside = referer ? URL.parse(referer)?.host : undefined
    const statements: SqlStatement[] = []
    if (pruned !== day) {
      statements.push(...pruning(at))
      pruned = day
    }
    if (!crawler && !self) {
      const [again] = [
        ...(await db.query({
          sql: "SELECT 1 FROM visits_hit WHERE day = ? AND caller = ? AND site = ? AND owner = ? AND name = ? AND crawler = 0 AND self = 0 LIMIT 1",
          args: [day, id, site, hit.owner, hit.name],
        })),
      ]
      if (again === undefined)
        statements.push({
          sql: "INSERT INTO visits_owner_hits (site, owner, day, name, opened, hits) VALUES (?, ?, ?, ?, ?, 1) ON CONFLICT (site, owner, day, name, opened) DO UPDATE SET hits = hits + 1",
          args: [site, hit.owner, day, hit.name, hit.opened ?? ""],
        })
    }
    statements.push({
      sql: "INSERT INTO visits_hit (site, day, at, owner, name, opened, referrer, country, caller, crawler, self) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [
        site,
        day,
        at,
        hit.owner,
        hit.name,
        hit.opened,
        outside && !inside(outside, ours) ? outside : null,
        caller.country ?? null,
        id,
        crawler ? 1 : 0,
        self ? 1 : 0,
      ],
    })
    await db.transact(statements)
  }
}

// --- reading -------------------------------------------------------------------

/**
 * One visit, as the views read it: the places it moved through in order (a page's
 * place, else its path), a move within a place being no new one, and how many pages it
 * saw.
 */
export interface VisitRow {
  readonly id: string
  readonly started: number
  readonly places: readonly string[]
  readonly pages: number
  /** The outside host it landed from. */
  readonly referrer?: string
  readonly source?: string
  readonly country?: string
  readonly viewport?: string
  readonly probe: boolean
  readonly staff: boolean
}

/** A named event as a step of a visit: where it happened, then its name
 *  (`trash:main action`), right after the page it was written on. */
export const eventStep = (place: string, event: string): string =>
  `${place}:${event}`

/**
 * The visits of the last `days` UTC days, today included, oldest first. A probe's and
 * the staff's are left out unless `flagged`: they are no product number. `events` names
 * the lines (by message) that are steps of a visit too, each right after the page it
 * was written on, as `eventStep(place, name)`: a project's main action is where a funnel
 * ends.
 */
export async function readVisits(
  db: MetricsReader,
  q: {
    site: string
    days: number
    flagged?: boolean
    events?: readonly string[]
    now?: number
  },
): Promise<VisitRow[]> {
  if (!(Number.isInteger(q.days) && q.days >= 1))
    throw new Error(`visits: days is a whole number of days, got ${q.days}`)
  const since = daysBefore(q.now ?? Date.now(), q.days - 1)
  const args: SqlValue[] = [q.site, since]
  const flags = q.flagged ? "" : " AND v.probe = 0 AND v.staff = 0"
  const rows = [
    ...(await db.query({
      sql: `SELECT v.id, v.started, v.referrer, v.source, v.country, v.viewport, v.probe, v.staff, p.place, p.path, p.trace_id FROM visits_visit v JOIN visits_page p ON p.visit = v.id WHERE v.site = ? AND v.day >= ?${flags} ORDER BY v.started, v.id, p.seq`,
      args,
    })),
  ]
  // Each page's named events, in the order written: lines (no phase) of its trace.
  const events = new Map<string, string[]>()
  if (q.events && q.events.length > 0) {
    const named = [
      ...(await db.query({
        sql: `SELECT e.trace_id, json_extract(e.line, '$.msg') AS msg FROM visits_event e JOIN visits_visit v ON v.id = e.visit WHERE v.site = ? AND v.day >= ?${flags} AND json_extract(e.line, '$.phase') IS NULL AND json_extract(e.line, '$.msg') IN (${q.events.map(() => "?").join(",")}) ORDER BY e.id`,
        args: [...args, ...q.events],
      })),
    ]
    for (const r of named) {
      const list = events.get(String(r.trace_id)) ?? []
      list.push(String(r.msg))
      events.set(String(r.trace_id), list)
    }
  }
  const visits = new Map<
    string,
    VisitRow & { places: string[]; pages: number; at: string | undefined }
  >()
  for (const r of rows) {
    const id = String(r.id)
    let v = visits.get(id)
    if (v === undefined) {
      v = {
        id,
        started: Number(r.started),
        places: [],
        pages: 0,
        at: undefined,
        referrer: str(r.referrer) ?? undefined,
        source: str(r.source) ?? undefined,
        country: str(r.country) ?? undefined,
        viewport: str(r.viewport) ?? undefined,
        probe: Number(r.probe) === 1,
        staff: Number(r.staff) === 1,
      }
      visits.set(id, v)
    }
    // A move within a place is no new step, even past an event written there.
    const place = str(r.place) ?? String(r.path)
    if (v.at !== place) v.places.push(place)
    v.at = place
    v.pages += 1
    // Pressed twice in a row is one step.
    for (const name of events.get(String(r.trace_id)) ?? []) {
      const step = eventStep(place, name)
      if (v.places.at(-1) !== step) v.places.push(step)
    }
  }
  return [...visits.values()].map(({ at: _, ...v }) => v)
}

/**
 * How many visits read each of a host's pages, all time: a page's view count, from
 * `visits_views` (each visit once, the staff's and probes' never). `paths` limits it to
 * those pages; a page no visit read is absent.
 */
export async function readViews(
  db: MetricsReader,
  q: { site: string; host: string; paths?: readonly string[] },
): Promise<Record<string, number>> {
  const only =
    q.paths === undefined
      ? ""
      : ` AND path IN (${q.paths.map(() => "?").join(",") || "NULL"})`
  const rows = await db.query({
    sql: `SELECT path, SUM(views) AS views FROM visits_views WHERE site = ? AND host = ?${only} GROUP BY path`,
    args: [q.site, q.host, ...(q.paths ?? [])],
  })
  return Object.fromEntries(
    [...rows].map((r) => [String(r.path), Number(r.views)]),
  )
}

/** One owner's numbers: only counts, never a visit (a visit can cross other people's
 *  pages). The crawlers', probes', staff's and the owner's own are in none of them. */
export interface OwnerReport {
  /** Visits that read any of their pages, each once a day: every one of the last
   *  `days`, oldest first, a day with none at 0. */
  readonly days: readonly { day: string; views: number }[]
  /** The same, all time. */
  readonly views: number
  /** What their addresses opened in the last `days`, most first: each name asked
   *  for and what it opened (null: nothing of theirs, a link they do not have). */
  readonly opened: readonly {
    name: string
    opened: string | null
    hits: number
  }[]
  /** Hits that opened something, all time. */
  readonly hits: number
  /** Where the visits that read their pages came from, outside the site (null: no
   *  referrer, typed or the site's own), in the last `days` up to VISIT_DAYS. */
  readonly referrers: readonly { referrer: string | null; visits: number }[]
  /** The same visits' countries (null: unknown). */
  readonly countries: readonly { country: string | null; visits: number }[]
}

export async function readOwner(
  db: MetricsReader,
  q: { site: string; owner: string; days: number; now?: number },
): Promise<OwnerReport> {
  if (!(Number.isInteger(q.days) && q.days >= 1))
    throw new Error(`visits: days is a whole number of days, got ${q.days}`)
  const at = q.now ?? Date.now()
  const since = daysBefore(at, q.days - 1)
  const owned = [q.site, q.owner]
  const recent = [...owned, since]
  const [perDay, all, opened, hits, referrers, countries] = await Promise.all([
    db.query({
      sql: "SELECT day, views FROM visits_owner_views WHERE site = ? AND owner = ? AND day >= ?",
      args: recent,
    }),
    db.query({
      sql: "SELECT COALESCE(SUM(views), 0) AS n FROM visits_owner_views WHERE site = ? AND owner = ?",
      args: owned,
    }),
    db.query({
      sql: "SELECT name, opened, SUM(hits) AS hits FROM visits_owner_hits WHERE site = ? AND owner = ? AND day >= ? GROUP BY name, opened ORDER BY hits DESC, name",
      args: recent,
    }),
    db.query({
      sql: "SELECT COALESCE(SUM(hits), 0) AS n FROM visits_owner_hits WHERE site = ? AND owner = ? AND opened != ''",
      args: owned,
    }),
    db.query({
      sql: "SELECT v.referrer AS key, COUNT(DISTINCT v.id) AS n FROM visits_page p JOIN visits_visit v ON v.id = p.visit WHERE p.site = ? AND p.owner = ? AND p.day >= ? AND p.self = 0 AND v.probe = 0 AND v.staff = 0 GROUP BY v.referrer ORDER BY n DESC",
      args: recent,
    }),
    db.query({
      sql: "SELECT v.country AS key, COUNT(DISTINCT v.id) AS n FROM visits_page p JOIN visits_visit v ON v.id = p.visit WHERE p.site = ? AND p.owner = ? AND p.day >= ? AND p.self = 0 AND v.probe = 0 AND v.staff = 0 GROUP BY v.country ORDER BY n DESC",
      args: recent,
    }),
  ])
  const counted = new Map(
    [...perDay].map((r) => [String(r.day), Number(r.views)]),
  )
  const total = (rows: Iterable<Record<string, unknown>>) =>
    Number([...rows][0]?.n ?? 0)
  return {
    days: Array.from({ length: q.days }, (_, i) => {
      const day = daysBefore(at, q.days - 1 - i)
      return { day, views: counted.get(day) ?? 0 }
    }),
    views: total(all),
    opened: [...opened].map((r) => ({
      name: String(r.name),
      opened: str(r.opened) || null,
      hits: Number(r.hits),
    })),
    hits: total(hits),
    referrers: [...referrers].map((r) => ({
      referrer: str(r.key),
      visits: Number(r.n),
    })),
    countries: [...countries].map((r) => ({
      country: str(r.key),
      visits: Number(r.n),
    })),
  }
}

/** The owners whose pages were read most in the last `days`, most first: each
 *  owner's visits (each once a day) and the hits of their addresses that opened
 *  something, and the names asked of anyone that opened nothing, most first: the
 *  links people want. For the site's own view of every owner. */
export async function readOwners(
  db: MetricsReader,
  q: { site: string; days: number; limit?: number; now?: number },
): Promise<{
  owners: readonly { owner: string; views: number; hits: number }[]
  missed: readonly { name: string; hits: number }[]
}> {
  if (!(Number.isInteger(q.days) && q.days >= 1))
    throw new Error(`visits: days is a whole number of days, got ${q.days}`)
  const since = daysBefore(q.now ?? Date.now(), q.days - 1)
  const limit = q.limit ?? 20
  const [owners, missed] = await Promise.all([
    db.query({
      sql: "SELECT owner, SUM(views) AS views, SUM(hits) AS hits FROM (SELECT owner, views, 0 AS hits FROM visits_owner_views WHERE site = ? AND day >= ? UNION ALL SELECT owner, 0, hits FROM visits_owner_hits WHERE site = ? AND day >= ? AND opened != '') GROUP BY owner ORDER BY views DESC, hits DESC LIMIT ?",
      args: [q.site, since, q.site, since, limit],
    }),
    db.query({
      sql: "SELECT name, SUM(hits) AS hits FROM visits_owner_hits WHERE site = ? AND day >= ? AND opened = '' GROUP BY name ORDER BY hits DESC, name LIMIT ?",
      args: [q.site, since, limit],
    }),
  ])
  return {
    owners: [...owners].map((r) => ({
      owner: String(r.owner),
      views: Number(r.views),
      hits: Number(r.hits),
    })),
    missed: [...missed].map((r) => ({
      name: String(r.name),
      hits: Number(r.hits),
    })),
  }
}

/**
 * Forgets an owner, for an account that is deleted: their counts and hits, the rows of
 * the pages that were theirs (others' visits keep their other pages) with those pages'
 * lines, and every page's views under the addresses that were theirs (`paths`: each
 * name's root, `/ada`, with what is under it), which `ownerOf` cannot tell once they are
 * gone. Nothing of theirs is left to read.
 */
export async function forgetOwner(
  db: MetricsDriver,
  q: { site: string; owner: string; paths: readonly string[] },
): Promise<void> {
  for (const p of q.paths)
    if (!/^\/[^/]+$/.test(p))
      throw new Error(`visits: an owner's address is one segment, got ${p}`)
  await db.transact([
    {
      sql: "DELETE FROM visits_event WHERE trace_id IN (SELECT trace_id FROM visits_page WHERE site = ? AND owner = ?)",
      args: [q.site, q.owner],
    },
    {
      sql: "DELETE FROM visits_page WHERE site = ? AND owner = ?",
      args: [q.site, q.owner],
    },
    {
      sql: "DELETE FROM visits_owner_views WHERE site = ? AND owner = ?",
      args: [q.site, q.owner],
    },
    {
      sql: "DELETE FROM visits_owner_hits WHERE site = ? AND owner = ?",
      args: [q.site, q.owner],
    },
    {
      sql: "DELETE FROM visits_hit WHERE site = ? AND owner = ?",
      args: [q.site, q.owner],
    },
    // An exact prefix, never LIKE: a name can hold `_`, which LIKE reads as any.
    ...q.paths.map((p) => ({
      sql: "DELETE FROM visits_views WHERE site = ? AND (path = ? OR substr(path, 1, ?) = ?)",
      args: [q.site, p, p.length + 1, `${p}/`],
    })),
  ])
}

/** One visit's page rows and its lines as written, in the order kept: each page's
 *  trace (its own start and end, its requests, its events) by trace id. */
export async function readVisit(
  db: MetricsReader,
  id: string,
): Promise<{
  pages: Record<string, unknown>[]
  lines: string[]
}> {
  const pages = [
    ...(await db.query({
      sql: "SELECT * FROM visits_page WHERE visit = ? ORDER BY seq",
      args: [id],
    })),
  ]
  const lines = [
    ...(await db.query({
      sql: "SELECT line FROM visits_event WHERE visit = ? ORDER BY id",
      args: [id],
    })),
  ].map((r) => String(r.line))
  return { pages, lines }
}
