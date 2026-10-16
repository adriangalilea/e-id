import { fail } from "@/lib/api"
import { keyHolder } from "@/lib/api-keys"
import { allowed, callerOf } from "@/lib/rate-limit"
import { markGot } from "@/lib/sends"

// `eid get` has the file: its sender sees it live, and a send for you leaves your
// inbox, its sender's `eid ls` saying when you took it (lib/sends `markGot`). Said
// after the file came, never when its ticket was given: a send looked at and
// declined still waits. Asked as taking it is (a key for a send for people, the
// `e-id-password` header for one behind a password), so nobody says it of a send
// they could not have; and held to a few a minute a caller.

const SAID = { most: 20, windowMs: 60_000 }

export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string; name: string }> },
) {
  const { username, name } = await params
  if (!allowed(`got:${callerOf(request.headers)}`, SAID.most, SAID.windowMs))
    return fail(429, {
      code: "slow_down",
      message: `At most ${SAID.most} a minute.`,
    })
  const who = await keyHolder(request)
  const got = await markGot(username, name, {
    userId: who?.userId ?? null,
    password: request.headers.get("e-id-password"),
  })
  if (!got)
    return fail(404, {
      code: "not_found",
      message: `Nothing is being sent to you at ${username}/${name}.`,
    })
  return new Response(null, { status: 204 })
}
