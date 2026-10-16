import "server-only"

import { keyHolder } from "@/lib/api-keys"
import { allowed } from "@/lib/rate-limit"

// E-ID'S API, `/api/v1` (app/api/v1): JSON in and out, a key in
// `Authorization: Bearer eid_…` (lib/api-keys). Every error is one shape,
// `{ error: { code, message, fields? } }`, so a client (the `eid` CLI) says what
// went wrong without parsing words; `fields` holds a refused write's reasons by
// field, the same the site's forms show.

export type ApiError = {
  code: string
  message: string
  fields?: Record<string, string>
}

export const fail = (status: number, error: ApiError) =>
  Response.json({ error }, { status })

/** Writes a key may make in a minute, in this server's memory (lib/rate-limit). */
const WRITES_A_MINUTE = 60

/** A route that needs a key: `handler` runs with whose it is, anyone else is
 *  told 401. `write` routes are held to WRITES_A_MINUTE a key. */
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
    if (write && !allowed(`api:${who.keyId}`, WRITES_A_MINUTE, 60_000))
      return fail(429, {
        code: "slow_down",
        message: `At most ${WRITES_A_MINUTE} writes a minute.`,
      })
    return handler(request, who, await context.params)
  }
}

/** The body as JSON, or a 400 to answer with. */
export async function bodyOf(request: Request): Promise<unknown | Response> {
  try {
    return await request.json()
  } catch {
    return fail(400, { code: "bad_json", message: "The body is not JSON." })
  }
}
