import { answer, fail, withKey } from "@/lib/api"
import { Inbox } from "@/lib/api-schemas"
import { inboxOf } from "@/lib/sends"

// `eid inbox`: the sends addressed to you, still being sent and not taken yet, with
// who sends each (lib/sends). `wait=<s>` (25 at most) holds the answer until
// something arrives after `after`, or the time is up: `eid inbox --watch` asks
// again and again, so nothing runs on e-ID's side between its questions, and an
// arrival is answered within a second and a half.
//
// A send's time is kept to the second, so `now` is said a second early: asking
// again after it can show one already shown (the CLI knows them by address), and
// never misses one.

export const maxDuration = 30

const MOST_WAIT_S = 25
const EVERY_MS = 1500

export const GET = withKey(async (request, { userId }) => {
  const url = new URL(request.url)
  const wait = Number(url.searchParams.get("wait") ?? 0)
  if (!Number.isFinite(wait) || wait < 0 || wait > MOST_WAIT_S)
    return fail(400, {
      code: "bad_query",
      message: `wait is seconds, 0 to ${MOST_WAIT_S}.`,
    })
  const afterSaid = url.searchParams.get("after")
  const after = afterSaid ? new Date(afterSaid) : null
  if (after && Number.isNaN(after.getTime()))
    return fail(400, { code: "bad_query", message: "after is an ISO time." })
  const until = Date.now() + wait * 1000
  for (;;) {
    const asked = new Date(Math.floor(Date.now() / 1000) * 1000 - 1000)
    const waiting = await inboxOf(userId, after)
    if (waiting.length > 0 || Date.now() >= until || request.signal.aborted)
      return answer(Inbox, { waiting, now: asked.toISOString() })
    await new Promise((r) => setTimeout(r, EVERY_MS))
  }
})
