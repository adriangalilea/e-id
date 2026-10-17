import { bodyAs, fail } from "@/lib/api"
import { keyHolder } from "@/lib/api-keys"
import { SendAnswerBody } from "@/lib/api-schemas"
import { allowed, callerOf } from "@/lib/rate-limit"
import { said } from "@/lib/sends"

// What someone who was shown a send answered (`eid get` asks first): yes, and the
// download starts, the open counted; no, and a send for them leaves their inbox. Its
// sender sees either live (lib/sends `said`). Asked as taking it is (a key for a send
// for people, the `e-id-password` header for one behind a password), so nobody answers
// for a send they could not have; held to a few a minute a caller.

const SAID = { most: 20, windowMs: 60_000 }

export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string; name: string }> },
) {
  const { username, name } = await params
  if (!allowed(`answer:${callerOf(request.headers)}`, SAID.most, SAID.windowMs))
    return fail(429, {
      code: "slow_down",
      message: `At most ${SAID.most} a minute.`,
    })
  const body = await bodyAs(request, SendAnswerBody)
  if (body instanceof Response) return body
  const who = await keyHolder(request)
  const ok = await said(
    username,
    name,
    {
      userId: who?.userId ?? null,
      password: request.headers.get("e-id-password"),
    },
    body.answer === "yes" ? "asked" : "declined",
  )
  if (!ok)
    return fail(404, {
      code: "not_found",
      message: `Nothing is being sent to you at ${username}/${name}.`,
    })
  return new Response(null, { status: 204 })
}
