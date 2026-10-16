import "server-only"

import { and, eq, isNull, sql } from "drizzle-orm"
import type { z } from "zod"
import { db } from "@/db"
import { links, users } from "@/db/schema"
import type { SendCreateBody } from "@/lib/api-schemas"
import type { CardErrors } from "@/lib/card-edit"
import { slugProblem } from "@/lib/card-edit"
import { linkCode } from "@/lib/link-names"
import { allowanceOf, reached } from "@/lib/trust"

// A FILE SENT FROM ITS OWNER'S MACHINE, named under their page (README, To do ›
// the CLI › 2): `eid send` serves it with sendme (n0's, peer to peer, the file
// never through e-ID) and names its ticket here, a link of theirs of `kind`
// "send" in the one namespace (`/you/<name>`), held to what they may keep. A
// browser opening the name gets its page (the link's preview, app/[username]/
// [link]/preview), `eid get` the ticket (`readSend`, counting the open). The
// name goes when the sender stops serving (the CLI deletes it, DELETE
// /links/:name). Never on the card, never asked of Safe Browsing: its value is
// a ticket, not an address.

export type SendWritten =
  | { ok: true; slug: string }
  | { ok: false; errors: CardErrors }

/** Names a send of `userId`'s. */
export async function writeSend(
  userId: string,
  body: z.output<typeof SendCreateBody>,
): Promise<SendWritten> {
  const slug = (body.name ?? linkCode()).toLowerCase()
  const why = slugProblem(slug)
  if (why) return { ok: false, errors: { name: why } }
  const owned = await db
    .select({ id: links.id, order: links.order })
    .from(links)
    .where(and(eq(links.user_id, userId), eq(links.platform, "link")))
  const allowance = await allowanceOf(userId)
  if (owned.length >= allowance.most)
    return { ok: false, errors: { name: reached(allowance) } }
  try {
    await db.insert(links).values({
      id: crypto.randomUUID(),
      user_id: userId,
      platform: "link",
      kind: "send",
      slug,
      value: body.ticket,
      public: false,
      order: Math.max(-1, ...owned.map((l) => l.order ?? -1)) + 1,
      custom_data: { file: body.file },
    })
  } catch (error) {
    const said = String((error as { cause?: unknown }).cause ?? error)
    if (/UNIQUE constraint failed: link\.user_id, link\.slug/.test(said))
      return {
        ok: false,
        errors: { name: `You already have a link at /${slug}.` },
      }
    throw error
  }
  return { ok: true, slug }
}

/** A send by whose it is and its name, as `eid get` asks for it: the ticket
 *  and the file, the open counted. Null where there is none (never named, the
 *  sender stopped, taken down). */
export async function readSend(username: string, slug: string) {
  const [row] = await db
    .update(links)
    .set({ visits: sql`${links.visits} + 1` })
    .where(
      and(
        eq(links.slug, slug.toLowerCase()),
        eq(links.kind, "send"),
        isNull(links.stopped_at),
        sql`${links.user_id} = (SELECT ${users.id} FROM ${users} WHERE ${users.username_normalized} = ${username.toLowerCase()})`,
      ),
    )
    .returning({ ticket: links.value, data: links.custom_data })
  if (!row?.ticket || !row.data?.file) return null
  return { ticket: row.ticket, file: row.data.file }
}
