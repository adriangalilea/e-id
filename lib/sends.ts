import "server-only"

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"
import { and, desc, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm"
import type { z } from "zod"
import { db } from "@/db"
import { links, sendEvents, sendTo, users } from "@/db/schema"
import type { SendCreateBody } from "@/lib/api-schemas"
import type { CardErrors } from "@/lib/card-edit"
import { slugProblem } from "@/lib/card-edit"
import { linkCode } from "@/lib/link-names"
import { allowanceOf, reached } from "@/lib/trust"

// A FILE SENT FROM ITS OWNER'S MACHINE, named under their page (README, To do ›
// the CLI): `eid send` serves it with sendme (n0's, peer to peer, the file never
// through e-ID) and names its ticket here, a link of theirs of `kind` "send" in the
// one namespace (`/you/<name>`), held to what they may keep. The name goes when the
// sender stops serving (the CLI deletes it, DELETE /links/:name). Never on the card,
// never asked of Safe Browsing: its value is a ticket, not an address.
//
// WHO IS GIVEN THE TICKET is all e-ID decides (a ticket is a bearer capability:
// whoever holds it fetches the file while it is served):
//
//   public     whoever has the address (`eid get eid.to/ada/notes`), no account
//   password   whoever has the address and says its password (hashed here, checked
//              here), for someone without an account
//   addressed  `--to ada,bob`: only those people's keys, and their inbox shows it;
//              to anyone else it does not exist (the same not found as a stopped one)
//
// Taking asks first, in the CLI: e-ID tells who sent what before anything comes.
//
// WHETHER ITS MACHINE IS STILL THERE: `eid send` asks for its send's events without
// pause, each question held 25 s at most, and each is the machine heard from
// (`heard`). A send unheard for AWAY_AFTER_MS is paused: nobody is given its ticket
// (a ticket to a machine that is gone is a download that hangs), and its page says
// so. Heard again (a laptop opened), it is live again. Unheard for GONE_AFTER_MS, the
// daily sweep deletes it, the name with it (`sweepSends`).

/** Two questions missed: the machine is not answering. */
export const AWAY_AFTER_MS = 60_000
/** A day unheard: the machine is not coming back for this send. */
const GONE_AFTER_MS = 24 * 3600_000

/** Whether a send heard from at `seen` is live now (its machine answering). */
export const liveAt = (seen: Date | null, now = Date.now()) =>
  seen !== null && now - seen.getTime() < AWAY_AFTER_MS

export type SendWritten =
  | { ok: true; slug: string; to: string[] }
  /** `taken`: the name is one of theirs already (a send still going, a link). */
  | { ok: false; errors: CardErrors; taken?: true }

/** A send's password, kept: scrypt with its own salt, `scrypt$<salt>$<hash>`. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 32)
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`
}

function passwordMatches(kept: string, said: string): boolean {
  const [scheme, salt, hash] = kept.split("$")
  if (scheme !== "scrypt" || !salt || !hash)
    throw new Error(`a send's password is kept in an unknown form: ${scheme}`)
  const want = Buffer.from(hash, "base64")
  return timingSafeEqual(
    scryptSync(said, Buffer.from(salt, "base64"), want.length),
    want,
  )
}

/** Names a send of `userId`'s: public, behind a password, or for the people named. */
export async function writeSend(
  userId: string,
  body: z.output<typeof SendCreateBody>,
): Promise<SendWritten> {
  const slug = (body.name ?? linkCode()).toLowerCase()
  const why = slugProblem(slug)
  if (why) return { ok: false, errors: { name: why } }
  const named = [...new Set((body.to ?? []).map((n) => n.toLowerCase()))]
  const people =
    named.length === 0
      ? []
      : await db
          .select({ id: users.id, username: users.username })
          .from(users)
          .where(inArray(users.username_normalized, named))
  const unknown = named.filter(
    (n) => !people.some((p) => p.username?.toLowerCase() === n),
  )
  if (unknown.length > 0)
    return {
      ok: false,
      errors: { to: `Nobody on e-ID is called ${unknown.join(", ")}.` },
    }
  if (people.some((p) => p.id === userId))
    return {
      ok: false,
      errors: { to: "A send to yourself is a file you have." },
    }
  const owned = await db
    .select({ id: links.id, order: links.order })
    .from(links)
    .where(and(eq(links.user_id, userId), eq(links.platform, "link")))
  const allowance = await allowanceOf(userId)
  if (owned.length >= allowance.most)
    return { ok: false, errors: { name: reached(allowance) } }
  const id = crypto.randomUUID()
  try {
    await db.batch([
      db.insert(links).values({
        id,
        user_id: userId,
        platform: "link",
        kind: "send",
        slug,
        value: body.ticket,
        public: false,
        seen_at: new Date(),
        order: Math.max(-1, ...owned.map((l) => l.order ?? -1)) + 1,
        custom_data: {
          file: body.file,
          ...(body.password && { password: hashPassword(body.password) }),
        },
      }),
      ...people.map((p) =>
        db.insert(sendTo).values({ link_id: id, user_id: p.id }),
      ),
    ])
  } catch (error) {
    const said = String((error as { cause?: unknown }).cause ?? error)
    if (/UNIQUE constraint failed: link\.user_id, link\.slug/.test(said))
      return {
        ok: false,
        taken: true,
        errors: { name: `You already have a link at /${slug}.` },
      }
    throw error
  }
  return { ok: true, slug, to: people.map((p) => p.username ?? "") }
}

export type SendRead =
  | {
      ok: true
      ticket: string
      file: { name: string; size: number }
      from: { username: string; name: string | null }
    }
  | { ok: false; why: "not_found" | "password" }
  | { ok: false; why: "away"; seen: Date | null }

/** A send by whose it is and its name, as `eid get` asks for it, given who asks
 *  (`userId`, null without a key) and the password they say: its ticket, its file
 *  and its sender, the open counted. An addressed send asked for by anyone else is
 *  not found, as a stopped one is; one whose machine is not answering is away, said
 *  only to whoever may have it. `again`: the same download asking a second time,
 *  after its connection dropped (the ticket may be new, the sender back), counted
 *  once already. */
export async function readSend(
  username: string,
  slug: string,
  asker: Asker,
  again = false,
): Promise<SendRead> {
  const may = await mayHave(username, slug, asker)
  if (!may.ok) return may
  if (!may.live) return { ok: false, why: "away", seen: may.seen }
  if (again)
    return { ok: true, ticket: may.ticket, file: may.file, from: may.from }
  await db.batch([
    db
      .update(links)
      .set({ visits: sql`${links.visits} + 1` })
      .where(eq(links.id, may.id)),
    // A download starting, for its sender to see live.
    db.insert(sendEvents).values({
      link_id: may.id,
      kind: "asked",
      user_id: asker.userId,
      at: new Date(),
    }),
  ])
  return {
    ok: true,
    ticket: may.ticket,
    file: may.file,
    from: may.from,
  }
}

/** Who sends what at `/username/slug`, for whoever may have it (its people, or
 *  whoever says its password): the preview before taking it, on its page. Nothing is
 *  counted and no ticket is given. */
export async function peekSend(
  username: string,
  slug: string,
  asker: Asker,
): Promise<
  | {
      ok: true
      file: { name: string; size: number }
      from: { username: string; name: string | null }
      forYou: boolean
      /** Its machine answering now; false while it is paused. */
      live: boolean
    }
  | { ok: false; why: "not_found" | "password" }
> {
  const may = await mayHave(username, slug, asker)
  if (!may.ok) return may
  return {
    ok: true,
    file: may.file,
    from: may.from,
    forYou: may.forYou,
    live: may.live,
  }
}

type Asker = { userId: string | null; password: string | null }

/** The one gate on a send: whether `asker` may have it. An addressed send asked for
 *  by anyone but its people and its sender is not found, as a stopped one is; one
 *  behind a password needs it said, except by its sender. */
async function mayHave(username: string, slug: string, asker: Asker) {
  const [row] = await db
    .select({
      id: links.id,
      owner: links.user_id,
      ticket: links.value,
      data: links.custom_data,
      seen: links.seen_at,
      username: users.username,
      name: users.name,
    })
    .from(links)
    .innerJoin(users, eq(users.id, links.user_id))
    .where(
      and(
        eq(links.slug, slug.toLowerCase()),
        eq(links.kind, "send"),
        isNull(links.stopped_at),
        eq(users.username_normalized, username.toLowerCase()),
      ),
    )
  if (!row?.ticket || !row.data?.file || !row.username)
    return { ok: false as const, why: "not_found" as const }
  const people = await db
    .select({ userId: sendTo.user_id })
    .from(sendTo)
    .where(eq(sendTo.link_id, row.id))
  const addressed = people.length > 0
  const theirs = people.some((p) => p.userId === asker.userId)
  if (addressed && !theirs && row.owner !== asker.userId)
    return { ok: false as const, why: "not_found" as const }
  if (
    row.data.password &&
    row.owner !== asker.userId &&
    !(asker.password && passwordMatches(row.data.password, asker.password))
  )
    return { ok: false as const, why: "password" as const }
  return {
    ok: true as const,
    id: row.id,
    ticket: row.ticket,
    file: row.data.file,
    from: { username: row.username, name: row.name },
    forYou: theirs,
    seen: row.seen,
    live: liveAt(row.seen),
  }
}

/** `ownerId`'s machine, heard from on its send `slug`: live again if it was paused.
 *  False where they have no send there. */
export async function heard(ownerId: string, slug: string): Promise<boolean> {
  const done = await db
    .update(links)
    .set({ seen_at: new Date() })
    .where(
      and(
        eq(links.user_id, ownerId),
        eq(links.slug, slug.toLowerCase()),
        eq(links.kind, "send"),
      ),
    )
    .returning({ id: links.id })
  return done.length > 0
}

/** Every send unheard for a day, deleted with its name, its people and its events:
 *  machines that went away and never came back. How many. */
export async function sweepSends(): Promise<number> {
  // Both columns are kept in seconds (mode "timestamp"); a raw expression is
  // compared with the raw number.
  const before = Math.floor((Date.now() - GONE_AFTER_MS) / 1000)
  const gone = await db
    .delete(links)
    .where(
      and(
        eq(links.kind, "send"),
        lt(sql`coalesce(${links.seen_at}, ${links.created_at})`, before),
      ),
    )
    .returning({ id: links.id })
  return gone.length
}

/** Someone who may have the send says its file came: its sender sees it live
 *  (`got`), and for one of its people it leaves their inbox and `eid ls` says when
 *  (the first time, however often it is said). Held to the same gate as taking it,
 *  so nobody can say it of a send they could not have. False where they may not. */
export async function markGot(
  username: string,
  slug: string,
  asker: Asker,
): Promise<boolean> {
  const may = await mayHave(username, slug, asker)
  if (!may.ok) return false
  await db.batch([
    db.insert(sendEvents).values({
      link_id: may.id,
      kind: "got",
      user_id: asker.userId,
      at: new Date(),
    }),
    ...(may.forYou && asker.userId
      ? [
          db
            .update(sendTo)
            .set({ taken_at: sql`coalesce(${sendTo.taken_at}, unixepoch())` })
            .where(
              and(eq(sendTo.link_id, may.id), eq(sendTo.user_id, asker.userId)),
            ),
        ]
      : []),
  ])
  return true
}

export type SendEvent = {
  /** Increasing: ask again for those after the last one seen. */
  id: number
  kind: "asked" | "got"
  /** Their username, signed in; null for someone without a key. */
  who: string | null
  at: string
}

/** What happened to `ownerId`'s send `slug` after event `after`, oldest first: what
 *  `eid send` prints live. Null where they have no send there (it stopped). */
export async function eventsOf(
  ownerId: string,
  slug: string,
  after: number,
): Promise<SendEvent[] | null> {
  const [link] = await db
    .select({ id: links.id })
    .from(links)
    .where(
      and(
        eq(links.user_id, ownerId),
        eq(links.slug, slug.toLowerCase()),
        eq(links.kind, "send"),
      ),
    )
  if (!link) return null
  const rows = await db
    .select({
      id: sendEvents.id,
      kind: sendEvents.kind,
      who: users.username,
      at: sendEvents.at,
    })
    .from(sendEvents)
    .leftJoin(users, eq(users.id, sendEvents.user_id))
    .where(and(eq(sendEvents.link_id, link.id), gt(sendEvents.id, after)))
    .orderBy(sendEvents.id)
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    who: r.who,
    at: r.at.toISOString(),
  }))
}

/** What anyone may know of the send at `/username/slug`, as its page and its link
 *  preview show it: who sends it, and its file unless it is behind a password.
 *  Null where there is no send there to show anyone: none, stopped, or for people
 *  (theirs alone: its address is the profile's). */
export async function sendShownAt(username: string, slug: string) {
  const [row] = await db
    .select({
      username: users.username,
      name: users.name,
      image: users.image,
      data: links.custom_data,
      id: links.id,
    })
    .from(links)
    .innerJoin(users, eq(users.id, links.user_id))
    .where(
      and(
        eq(links.slug, slug.toLowerCase()),
        eq(links.kind, "send"),
        isNull(links.stopped_at),
        eq(users.username_normalized, username.toLowerCase()),
      ),
    )
  if (!row?.username || !row.data?.file) return null
  const [addressed] = await db
    .select({ id: sendTo.user_id })
    .from(sendTo)
    .where(eq(sendTo.link_id, row.id))
    .limit(1)
  if (addressed) return null
  return {
    at: `/${row.username}/${slug.toLowerCase()}`,
    from: { name: row.name ?? row.username, image: row.image },
    file: row.data.password ? null : row.data.file,
  }
}

export type Waiting = {
  /** As `eid get` takes it: "ada/notes". */
  address: string
  from: { username: string; name: string | null; image: string | null }
  file: { name: string; size: number }
  /** When it was sent, ISO. */
  since: string
  /** Its sender's machine answering now; false while the send is paused. */
  live: boolean
}

/** What waits for `userId`: every send addressed to them, still being sent, not
 *  taken yet, newest first; with `after`, only what was sent after it. */
export async function inboxOf(
  userId: string,
  after: Date | null,
): Promise<Waiting[]> {
  const rows = await db
    .select({
      slug: links.slug,
      data: links.custom_data,
      created: links.created_at,
      seen: links.seen_at,
      username: users.username,
      name: users.name,
      image: users.image,
    })
    .from(sendTo)
    .innerJoin(links, eq(links.id, sendTo.link_id))
    .innerJoin(users, eq(users.id, links.user_id))
    .where(
      and(
        eq(sendTo.user_id, userId),
        isNull(sendTo.taken_at),
        eq(links.kind, "send"),
        isNull(links.stopped_at),
        ...(after ? [gt(links.created_at, after)] : []),
      ),
    )
    .orderBy(desc(links.created_at))
  return rows.map((r) => {
    if (!r.slug || !r.username || !r.data?.file || !r.created)
      throw new Error(`inboxOf: a send for ${userId} is missing its name`)
    return {
      address: `${r.username}/${r.slug}`,
      from: { username: r.username, name: r.name, image: r.image },
      file: r.data.file,
      since: r.created.toISOString(),
      live: liveAt(r.seen),
    }
  })
}

/** Who each of `linkIds` is for and when they took it: the outbox (`eid ls`). */
export async function peopleOf(
  linkIds: string[],
): Promise<Map<string, { username: string; taken: string | null }[]>> {
  const out = new Map<string, { username: string; taken: string | null }[]>()
  if (linkIds.length === 0) return out
  const rows = await db
    .select({
      linkId: sendTo.link_id,
      username: users.username,
      taken: sendTo.taken_at,
    })
    .from(sendTo)
    .innerJoin(users, eq(users.id, sendTo.user_id))
    .where(inArray(sendTo.link_id, linkIds))
  for (const r of rows) {
    if (!r.username)
      throw new Error(`peopleOf: a recipient of ${r.linkId} has no name`)
    const list = out.get(r.linkId) ?? []
    list.push({ username: r.username, taken: r.taken?.toISOString() ?? null })
    out.set(r.linkId, list)
  }
  return out
}
