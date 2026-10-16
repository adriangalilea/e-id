import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { LinkUp } from "@/app/admin/link-up"
import { PathTree, TopPaths } from "@/components/ui/user-flows"
import { db } from "@/db"
import { links, users } from "@/db/schema"
import { isAdmin } from "@/lib/env"
import { ANYWHERE } from "@/lib/link-safety"
import { getSession } from "@/lib/session"
import { pathTree, topPaths } from "@/lib/user-flows-core"
import { SITE, visitDriver, visitsEnabled } from "@/lib/visit-store"
import { readOwners, readVisits } from "@/lib/visits"

// THE SITE'S OWN NUMBERS, for e-ID's admins (ADMIN_USER_IDS) and nobody else: a
// 404 to anyone else, signed in or not. First the links people point anywhere
// (a website, a link of their own), each with a switch to take it down. Then the
// last 30 days of visits as where people
// went (ui user-flows: every profile is one place), where they came from, whose
// pages were read most, and the names asked of a person that opened nothing.

export const metadata: Metadata = {
  title: "admin",
  robots: { index: false, follow: false },
}

const DAYS = 30
const fmt = new Intl.NumberFormat("en")

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-16">
      <Suspense fallback={null}>
        <Admins>
          <LinksMade />
          <Report />
        </Admins>
      </Suspense>
    </main>
  )
}

/** What only an admin reaches: anyone else is a 404. */
async function Admins({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || !isAdmin(session.user.id)) notFound()
  return children
}

/** How many of the newest links that go anywhere the list shows. */
const NEWEST = 100

const WHEN = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})

/** The links people point wherever they like, newest first (the ones made
 *  before their making was kept last): whose, where, what Safe Browsing last said,
 *  and a switch to take one down or put it back (lib/link-safety). */
async function LinksMade() {
  const rows = await db
    .select({
      id: links.id,
      username: users.username,
      platform: links.platform,
      slug: links.slug,
      value: links.value,
      visits: links.visits,
      created_at: links.created_at,
      checked_at: links.checked_at,
      stopped_why: links.stopped_why,
    })
    .from(links)
    .innerJoin(users, eq(links.user_id, users.id))
    .where(
      and(
        inArray(links.platform, [...ANYWHERE]),
        eq(links.kind, "url"),
        isNotNull(links.value),
      ),
    )
    .orderBy(sql`${links.created_at} IS NULL`, desc(links.created_at))
    .limit(NEWEST)
  return (
    <Section title={`links that go anywhere, the newest ${NEWEST}`}>
      <ul className="flex flex-col text-sm">
        {rows.map((l) => (
          <li
            key={l.id}
            className="flex items-center gap-3 border-border border-t py-2 first:border-t-0"
          >
            <div className="flex min-w-0 grow flex-col">
              <span className="font-mono">
                /{l.username}/{l.platform === "link" ? l.slug : "web"}
              </span>
              <span className="truncate text-foreground/55 text-xs">
                {l.value}
              </span>
              <span className="text-foreground/40 text-xs">
                {[
                  l.created_at ? `made ${WHEN.format(l.created_at)}` : null,
                  `opened ${fmt.format(l.visits)}`,
                  l.checked_at
                    ? `checked ${WHEN.format(l.checked_at)}`
                    : "never checked",
                  // The raw reason: an admin's record, never a warning shown.
                  l.stopped_why ? `taken down: ${l.stopped_why}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            <LinkUp id={l.id} up={l.stopped_why === null} />
          </li>
        ))}
      </ul>
    </Section>
  )
}

async function Report() {
  if (!visitsEnabled) return <p>Visits are off: no VISITS_DATABASE_URL.</p>
  const store = visitDriver()
  const [visits, { owners, missed }] = await Promise.all([
    readVisits(store, { site: SITE, days: DAYS }),
    readOwners(store, { site: SITE, days: DAYS }),
  ])
  const named =
    owners.length === 0
      ? []
      : await db
          .select({ id: users.id, username: users.username })
          .from(users)
          .where(
            inArray(
              users.id,
              owners.map((o) => o.owner),
            ),
          )
  const nameOf = new Map(named.map((u) => [u.id, u.username]))
  const referrers = new Map<string, number>()
  for (const v of visits) {
    const from = v.referrer ?? "direct or e-ID"
    referrers.set(from, (referrers.get(from) ?? 0) + 1)
  }
  return (
    <>
      <header>
        <h1 className="font-medium text-2xl">e-ID, last {DAYS} days</h1>
        <p className="font-mono text-muted-foreground text-sm">
          {fmt.format(visits.length)} visits ·{" "}
          {fmt.format(visits.reduce((n, v) => n + v.pages, 0))} pages
        </p>
      </header>
      <Section title="where people went">
        <TopPaths rows={topPaths(visits)} total={visits.length} />
      </Section>
      <Section title="what they did after landing">
        <PathTree nodes={pathTree(visits)} />
      </Section>
      <Section title="where they came from">
        <Counts
          rows={[...referrers].sort((a, b) => b[1] - a[1]).slice(0, 15)}
        />
      </Section>
      <Section title="whose pages were read (visits · links opened)">
        <Counts
          rows={owners.map((o) => [
            `@${nameOf.get(o.owner) ?? o.owner}`,
            o.views,
            o.hits,
          ])}
        />
      </Section>
      <Section title="names asked for that opened nothing">
        <Counts rows={missed.map((m) => [`/${m.name}`, m.hits])} />
      </Section>
    </>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-muted-foreground text-sm">{title}</h2>
      {children}
    </section>
  )
}

function Counts({
  rows,
}: {
  rows: readonly (readonly [string, ...number[]])[]
}) {
  if (rows.length === 0)
    return <p className="text-muted-foreground text-sm">none yet</p>
  return (
    <ul className="font-mono text-sm">
      {rows.map(([label, ...ns]) => (
        <li key={label} className="flex justify-between gap-4 py-0.5">
          <span className="truncate">{label}</span>
          <span>{ns.map((n) => fmt.format(n)).join(" · ")}</span>
        </li>
      ))}
    </ul>
  )
}
