import "server-only"

import { createHash, randomBytes, randomInt } from "node:crypto"
import { and, eq, isNotNull, lt, sql } from "drizzle-orm"
import { db } from "@/db"
import { apiKeys, cliLogins, users } from "@/db/schema"

// KEYS TO E-ID'S API, and how the CLI gets one. A key is `eid_` and 32 random
// bytes; only its SHA-256 is kept (db/schema `api_key`), so a key is shown once,
// to whatever asked for it, and a leaked database holds none. A request carries
// it as `Authorization: Bearer eid_…` (`keyHolder`).
//
// The CLI signs in with the OAuth device flow (RFC 8628, as `gh` does):
//
//   eid login ─ POST /api/v1/login ─▶ a device code (the CLI's alone) and a user
//               code ("WXYZ-BCDF"), minutes long          (`startLogin`)
//   the person, signed in, opens e-id.to/cli?code=WXYZ-BCDF and approves it
//                                                         (`answerLogin`)
//   eid login ─ POST /api/v1/login/token, every few seconds, with the device
//               code ─▶ waiting, refused, gone, or the key (`claimLogin`)
//
// Works over ssh (the browser can be anywhere), and the key goes only to the CLI
// that asked, in the answer to its own question: never through a URL.

const KEY_PREFIX = "eid_"
/** How long a sign-in waits for its person. */
const LOGIN_MS = 10 * 60 * 1000
/** How often the CLI may ask (RFC 8628 `interval`, seconds). */
export const LOGIN_INTERVAL_S = 3
/** A user code's letters: consonants only, so a code is never a word, and none
 *  two people confuse when read aloud. */
const CODE_LETTERS = "BCDFGHJKLMNPQRSTVWXZ"
/** A key's `last_used_at` is written at most this often, not on every request. */
const USED_EVERY_MS = 60 * 60 * 1000

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex")

/** A new key for `userId`, named `name`: the key itself, returned this once. */
export async function createKey(userId: string, name: string): Promise<string> {
  const key = `${KEY_PREFIX}${randomBytes(32).toString("base64url")}`
  await db.insert(apiKeys).values({
    id: crypto.randomUUID(),
    user_id: userId,
    name,
    prefix: key.slice(0, KEY_PREFIX.length + 6),
    hash: sha256(key),
    created_at: new Date(),
  })
  return key
}

/** Whose key a request carries, or null: none, not ours, or revoked. */
export async function keyHolder(
  request: Request,
): Promise<{ userId: string; keyId: string } | null> {
  const header = request.headers.get("authorization") ?? ""
  const key = /^Bearer (eid_[A-Za-z0-9_-]+)$/.exec(header)?.[1]
  if (!key) return null
  const [row] = await db
    .select({
      id: apiKeys.id,
      user_id: apiKeys.user_id,
      last_used_at: apiKeys.last_used_at,
    })
    .from(apiKeys)
    .where(eq(apiKeys.hash, sha256(key)))
  if (!row) return null
  const now = Date.now()
  if (!row.last_used_at || now - row.last_used_at.getTime() > USED_EVERY_MS)
    await db
      .update(apiKeys)
      .set({ last_used_at: new Date(now) })
      .where(eq(apiKeys.id, row.id))
  return { userId: row.user_id, keyId: row.id }
}

/** A person's keys, for their list at /cli: never the key, only its prefix. */
export async function keysOf(userId: string) {
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.prefix,
      created_at: apiKeys.created_at,
      last_used_at: apiKeys.last_used_at,
    })
    .from(apiKeys)
    .where(eq(apiKeys.user_id, userId))
    .orderBy(sql`${apiKeys.created_at} DESC`)
}

/** Revokes one of `userId`'s keys; false where they have no such key. */
export async function revokeKey(userId: string, id: string): Promise<boolean> {
  const gone = await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.user_id, userId)))
    .returning({ id: apiKeys.id })
  return gone.length > 0
}

const userCode = () => {
  const pick = () => CODE_LETTERS[randomInt(CODE_LETTERS.length)] as string
  const four = () => Array.from({ length: 4 }, pick).join("")
  return `${four()}-${four()}`
}

/** A sign-in begun from the CLI on `host`: what the CLI holds and shows. */
export async function startLogin(host: string, origin: string) {
  const now = Date.now()
  // The ones nobody answered in time, let go.
  await db.delete(cliLogins).where(lt(cliLogins.expires_at, new Date(now)))
  const device = randomBytes(32).toString("base64url")
  const code = userCode()
  await db.insert(cliLogins).values({
    device_hash: sha256(device),
    user_code: code,
    host,
    expires_at: new Date(now + LOGIN_MS),
  })
  return {
    device_code: device,
    user_code: code,
    verification_uri: `${origin}/cli`,
    verification_uri_complete: `${origin}/cli?code=${code}`,
    expires_in: LOGIN_MS / 1000,
    interval: LOGIN_INTERVAL_S,
  }
}

/** The sign-in a user code names, while it waits: for the approval page. */
export async function loginNamed(code: string) {
  const [row] = await db
    .select({ host: cliLogins.host, expires_at: cliLogins.expires_at })
    .from(cliLogins)
    .where(
      and(
        eq(cliLogins.user_code, code.toUpperCase()),
        sql`${cliLogins.user_id} IS NULL`,
        eq(cliLogins.denied, false),
      ),
    )
  return row && row.expires_at.getTime() > Date.now() ? row : null
}

/** `userId` approving (or refusing) the sign-in `code` names; false where none
 *  waits under it. */
export async function answerLogin(
  code: string,
  userId: string,
  approve: boolean,
): Promise<boolean> {
  const answered = await db
    .update(cliLogins)
    .set(approve ? { user_id: userId } : { denied: true })
    .where(
      and(
        eq(cliLogins.user_code, code.toUpperCase()),
        sql`${cliLogins.user_id} IS NULL`,
        eq(cliLogins.denied, false),
        sql`${cliLogins.expires_at} > ${Math.floor(Date.now() / 1000)}`,
      ),
    )
    .returning({ host: cliLogins.host })
  return answered.length > 0
}

/** Whether the CLI has taken the key of the sign-in `code` names, approved by
 *  `userId`: its row goes as the key is handed out (`claimLogin`). False while it
 *  waits for the CLI's next question. */
export async function loginTaken(code: string, userId: string) {
  const [row] = await db
    .select({ user_id: cliLogins.user_id })
    .from(cliLogins)
    .where(eq(cliLogins.user_code, code.toUpperCase()))
  if (row && row.user_id !== userId)
    throw new Error(`loginTaken: ${code} was not approved by ${userId}`)
  return !row
}

export type Claimed =
  | { state: "authorization_pending" }
  | { state: "access_denied" }
  | { state: "expired_token" }
  | { state: "ok"; key: string; username: string }

/** The CLI asking after its sign-in: the key once approved, taken once (the row
 *  goes as it is read, so two questions never take two keys). */
export async function claimLogin(device: string): Promise<Claimed> {
  const hash = sha256(device)
  const [taken] = await db
    .delete(cliLogins)
    .where(
      and(
        eq(cliLogins.device_hash, hash),
        isNotNull(cliLogins.user_id),
        sql`${cliLogins.expires_at} > ${Math.floor(Date.now() / 1000)}`,
      ),
    )
    .returning({ user_id: cliLogins.user_id, host: cliLogins.host })
  if (taken?.user_id) {
    const [user] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, taken.user_id))
    if (!user?.username)
      throw new Error(`claimLogin: ${taken.user_id} has no username`)
    return {
      state: "ok",
      key: await createKey(taken.user_id, `eid on ${taken.host}`),
      username: user.username,
    }
  }
  const [row] = await db
    .select({ denied: cliLogins.denied, expires_at: cliLogins.expires_at })
    .from(cliLogins)
    .where(eq(cliLogins.device_hash, hash))
  if (!row || row.expires_at.getTime() <= Date.now())
    return { state: "expired_token" }
  if (row.denied) {
    await db.delete(cliLogins).where(eq(cliLogins.device_hash, hash))
    return { state: "access_denied" }
  }
  return { state: "authorization_pending" }
}
