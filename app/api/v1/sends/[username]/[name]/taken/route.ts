import { fail, withKey } from "@/lib/api"
import { markTaken } from "@/lib/sends"

// `eid get` has the file of a send addressed to you: it leaves your inbox, and its
// sender's `eid ls` says when you took it (lib/sends). Said after the file came,
// never when its ticket was given: a send looked at and declined still waits.

export const POST = withKey<{ username: string; name: string }>(
  async (_request, { userId }, { username, name }) => {
    if (!(await markTaken(username, name, userId)))
      return fail(404, {
        code: "not_found",
        message: `No send for you at ${username}/${name}.`,
      })
    return new Response(null, { status: 204 })
  },
)
