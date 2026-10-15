import "server-only"

import { and, eq, gt } from "drizzle-orm"
import { db } from "@/db"
import { releasedNames, usernameAliases, users } from "@/db/schema"
import { usernameProblem } from "@/lib/username-rules"

/** The database, or a transaction on it: what a write runs on. */
export type Writer = Pick<typeof db, "update" | "delete">

/** How long a deleted account's names are held from anyone else. */
export const RELEASE_HOLD_MS = 90 * 24 * 60 * 60 * 1000

/** The holder of a name a deleted account left, while it is held: no user's id. */
export const RELEASED = "released"

/** Who holds `username`, as their username or as an alias of theirs (a former
 *  name, one more they hold: db/schema `usernameAliases`); RELEASED for a name a
 *  deleted account left, within RELEASE_HOLD_MS; or null when nobody does. An
 *  alias and a released name are held as a username is, or the links still
 *  pointing at them would open a stranger. */
export async function holderOf(username: string): Promise<string | null> {
  const normalized = username.trim().toLowerCase()
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username_normalized, normalized))
    .limit(1)
  if (user) return user.id
  const [alias] = await db
    .select({ id: usernameAliases.user_id })
    .from(usernameAliases)
    .where(eq(usernameAliases.alias_normalized, normalized))
    .limit(1)
  if (alias) return alias.id
  const [released] = await db
    .select({ name: releasedNames.name_normalized })
    .from(releasedNames)
    .where(
      and(
        eq(releasedNames.name_normalized, normalized),
        gt(releasedNames.until, new Date()),
      ),
    )
    .limit(1)
  return released ? RELEASED : null
}

/** A user's names, their username and every alias, normalized: what is theirs
 *  under the site's address. */
export async function namesOf(userId: string): Promise<string[]> {
  const [user] = await db
    .select({ username: users.username_normalized })
    .from(users)
    .where(eq(users.id, userId))
  const aliases = await db
    .select({ alias: usernameAliases.alias_normalized })
    .from(usernameAliases)
    .where(eq(usernameAliases.user_id, userId))
  return [
    ...(user?.username ? [user.username] : []),
    ...aliases.map((a) => a.alias),
  ]
}

/** Holds a deleted account's names from anyone else for RELEASE_HOLD_MS. */
export async function holdReleased(names: readonly string[]): Promise<void> {
  if (names.length === 0) return
  const until = new Date(Date.now() + RELEASE_HOLD_MS)
  await db
    .insert(releasedNames)
    .values(names.map((name_normalized) => ({ name_normalized, until })))
    .onConflictDoUpdate({
      target: releasedNames.name_normalized,
      set: { until },
    })
}

/** What a provider calls a new account (a GitHub login, an email's local part)
 *  as its username, when it is one and nobody holds it; else null, and the person
 *  picks their address on the home's card. Never a made-up variant: an address is
 *  chosen or it is theirs elsewhere already. */
export async function providedUsername(seed: string): Promise<string | null> {
  const username = seed.trim().toLowerCase()
  if (usernameProblem(username)) return null
  return (await holderOf(username)) ? null : username
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
  const valid = username.trim()
  const why = usernameProblem(valid)
  if (why) throw new Error(why)
  const normalized = valid.toLowerCase()
  const holder = await holderOf(normalized)
  if (holder && holder !== userId) throw new Error("Username is taken.")
  // One of their own aliases taken back as the username: it stops being one.
  await writer
    .delete(usernameAliases)
    .where(
      and(
        eq(usernameAliases.alias_normalized, normalized),
        eq(usernameAliases.user_id, userId),
      ),
    )

  const updated = await writer
    .update(users)
    .set({ username: valid, username_normalized: valid.toLowerCase() })
    .where(eq(users.id, userId))
    .returning({ id: users.id })
  if (updated.length !== 1) throw new Error(`claimUsername: no user ${userId}`)
  return valid
}
