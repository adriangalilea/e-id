import { answer, fail, withKey } from "@/lib/api"
import { SendEvents } from "@/lib/api-schemas"
import { eventsOf, heard } from "@/lib/sends"

// What is happening to one of your sends, for `eid send` to print live (lib/sends
// `eventsOf`): each download starting ("asked") and each file come ("got"), by whom
// where they were signed in. `after=<id>` asks for what came after the last event
// seen; `wait=<s>` (25 at most) holds the answer until one arrives, as the inbox
// does, so nothing runs on e-ID's side between the CLI's questions.

export const maxDuration = 30

const MOST_WAIT_S = 25
const EVERY_MS = 1000

export const GET = withKey<{ name: string }>(
  async (request, { userId }, { name }) => {
    const url = new URL(request.url)
    const after = Number(url.searchParams.get("after") ?? 0)
    const wait = Number(url.searchParams.get("wait") ?? 0)
    if (!Number.isInteger(after) || after < 0)
      return fail(400, { code: "bad_query", message: "after is an event id." })
    if (!Number.isFinite(wait) || wait < 0 || wait > MOST_WAIT_S)
      return fail(400, {
        code: "bad_query",
        message: `wait is seconds, 0 to ${MOST_WAIT_S}.`,
      })
    // Each question is the sender's machine heard from (lib/sends): a send whose
    // machine stops asking is paused for whoever would take it.
    if (!(await heard(userId, name)))
      return fail(404, {
        code: "not_found",
        message: `You are sending nothing at /${name}.`,
      })
    const until = Date.now() + wait * 1000
    for (;;) {
      const events = await eventsOf(userId, name, after)
      if (!events)
        return fail(404, {
          code: "not_found",
          message: `You are sending nothing at /${name}.`,
        })
      if (events.length > 0 || Date.now() >= until || request.signal.aborted)
        return answer(SendEvents, { events })
      await new Promise((r) => setTimeout(r, EVERY_MS))
    }
  },
)
