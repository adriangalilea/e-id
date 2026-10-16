import "server-only"

import { sql } from "drizzle-orm"
import type { z } from "zod"
import { db } from "@/db"
import { apiKeyDays } from "@/db/schema"
import { keyHolder } from "@/lib/api-keys"
import type { ApiError } from "@/lib/api-schemas"
import { errorsOf } from "@/lib/card-edit"
import { allowed } from "@/lib/rate-limit"

// E-ID'S API, `/api/v1` (app/api/v1): JSON in and out, a key in
// `Authorization: Bearer eid_…` (lib/api-keys). What every route hears and says
// is a schema in lib/api-schemas: a body is parsed by its schema (`bodyAs`), and
// an answer by its own before it leaves (`answer`), so a route that drifts from
// the published shape throws here instead of telling a client something else.
// Every refusal is one shape, `{ error: { code, message, fields? } }` (`fail`).

export const fail = (status: number, error: ApiError) =>
  Response.json({ error }, { status })

/** `data` as `schema` says it is, answered; a throw where it is not. */
export const answer = <S extends z.ZodType>(
  schema: S,
  data: z.input<S>,
  status = 200,
) => Response.json(schema.parse(data), { status })

/** The body parsed by `schema`, or the 400 that says what is wrong with it. */
export async function bodyAs<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.output<S> | Response> {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return fail(400, { code: "bad_json", message: "The body is not JSON." })
  }
  const parsed = schema.safeParse(json)
  if (parsed.success) return parsed.data
  const fields = errorsOf(parsed.error)
  return fail(400, {
    code: "bad_body",
    message: Object.entries(fields)
      .map(([field, why]) => `${field || "body"}: ${why}`)
      .join(" "),
    fields,
  })
}

/** Writes a key may make in a minute, in this server's memory (lib/rate-limit),
 *  and on a day (UTC), counted in the database across every server. */
const WRITES_A_MINUTE = 60
const WRITES_A_DAY = 1000

/** One more write of `keyId` today, counted as it is asked for: how many it
 *  has made today with this one. One statement, so two servers counting at
 *  once never lose one. */
async function writeToday(keyId: string): Promise<number> {
  const day = new Date().toISOString().slice(0, 10)
  const [row] = await db
    .insert(apiKeyDays)
    .values({ key_id: keyId, day, writes: 1 })
    .onConflictDoUpdate({
      target: [apiKeyDays.key_id, apiKeyDays.day],
      set: { writes: sql`${apiKeyDays.writes} + 1` },
    })
    .returning({ writes: apiKeyDays.writes })
  if (!row) throw new Error(`writeToday: nothing counted for ${keyId}`)
  return row.writes
}

/** A route that needs a key: `handler` runs with whose it is, anyone else is
 *  told 401. `write` routes are held to WRITES_A_MINUTE and WRITES_A_DAY a key
 *  (a refused write is counted too: asking is what is held back). */
export function withKey<P>(
  handler: (
    request: Request,
    who: { userId: string; keyId: string },
    params: P,
  ) => Promise<Response>,
  { write = false } = {},
) {
  return async (request: Request, context: { params: Promise<P> }) => {
    const who = await keyHolder(request)
    if (!who)
      return fail(401, {
        code: "unauthorized",
        message: "No key, or one that is not e-ID's any more: run `eid login`.",
      })
    if (write) {
      if (!allowed(`api:${who.keyId}`, WRITES_A_MINUTE, 60_000))
        return fail(429, {
          code: "slow_down",
          message: `At most ${WRITES_A_MINUTE} writes a minute.`,
        })
      if ((await writeToday(who.keyId)) > WRITES_A_DAY)
        return fail(429, {
          code: "slow_down",
          message: `At most ${WRITES_A_DAY} writes a day; more tomorrow (UTC).`,
        })
    }
    return handler(request, who, await context.params)
  }
}
