import "server-only"

import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users } from "@/db/schema"
import { usernameSchema } from "@/lib/username-rules"

/** The database, or a transaction on it: what a write runs on. */
export type Writer = Pick<typeof db, "update">

/** What a provider calls a new account (a GitHub login, an email's local part)
 *  as its username, when it is one and nobody holds it; else null, and the person
 *  picks their address on the home's card. Never a made-up variant: an address is
 *  chosen or it is theirs elsewhere already. */
export async function providedUsername(seed: string): Promise<string | null> {
  const parsed = usernameSchema.safeParse(seed.toLowerCase())
  if (!parsed.success) return null
  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username_normalized, parsed.data))
    .limit(1)
  return taken ? null : parsed.data
}

/** Gives a user a username. Throws the validation message for an invalid one and
 *  the database's unique-constraint error for a taken one. Run on `writer`, a
 *  transaction for a rename written with other changes (db/actions, `saveCard`).
 *  The caller expires the caches (lib/tags): an action with updateTag, a route
 *  handler with revalidateTag. */
export async function claimUsername(
  userId: string,
  username: string,
  writer: Writer = db,
): Promise<string> {
  const parsed = usernameSchema.safeParse(username)
  if (!parsed.success) throw new Error(parsed.error.issues[0].message)
  const valid = parsed.data

  const updated = await writer
    .update(users)
    .set({ username: valid, username_normalized: valid.toLowerCase() })
    .where(eq(users.id, userId))
    .returning({ id: users.id })
  if (updated.length !== 1) throw new Error(`claimUsername: no user ${userId}`)
  return valid
}
