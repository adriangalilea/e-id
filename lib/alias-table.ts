import { eq, isNotNull } from "drizzle-orm"
import { db } from "@/db"
import { usernameAliases, users } from "@/db/schema"

// EVERY OLD NAME AND WHO IT IS NOW, for the proxy (proxy.ts), which answers an old
// name's page with a real 308 before the page is rendered: a link preview (Telegram,
// iMessage, Slack) follows a redirect but never a page's refresh, so an old link
// shared anywhere previews as the person's card. Read whole and kept a minute per
// server: one query a minute instead of one per profile view, and an alias made in
// that minute is still answered by the page itself (lib/renamed).

const FRESH_MS = 60_000

let table: { at: number; to: Promise<Map<string, string>> } | null = null

async function read(): Promise<Map<string, string>> {
  const rows = await db
    .select({ alias: usernameAliases.alias_normalized, to: users.username })
    .from(usernameAliases)
    .innerJoin(users, eq(users.id, usernameAliases.user_id))
    .where(isNotNull(users.username))
  return new Map(rows.map((r) => [r.alias, r.to as string]))
}

/** The username an old name answers to now, or null for a name that is no alias.
 *  Where the table cannot be read it is null, logged and not kept: every page under
 *  a single name passes here, and none of them may fail with the database. The
 *  page still answers an alias itself. */
export async function aliasOf(name: string): Promise<string | null> {
  if (!table || Date.now() - table.at > FRESH_MS)
    table = { at: Date.now(), to: read() }
  const at = table
  try {
    return (await at.to).get(name.toLowerCase()) ?? null
  } catch (error) {
    console.error("alias table:", error)
    if (table === at) table = null
    return null
  }
}
