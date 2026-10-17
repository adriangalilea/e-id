import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users } from "@/db/schema"
import { answer, bodyAs, fail, withKey } from "@/lib/api"
import { SendCreateBody, SendMade } from "@/lib/api-schemas"
import { writeSend } from "@/lib/sends"

// `eid send`: a file served from your machine, named under your page
// (lib/sends): for anyone with the address, behind a password, or for the people
// named (`to`), where it waits in their inbox. The CLI names it once sendme is
// serving, and deletes the name (DELETE /links/:name) when it stops.

export const POST = withKey(
  async (request, { userId }) => {
    const body = await bodyAs(request, SendCreateBody)
    if (body instanceof Response) return body
    const written = await writeSend(userId, body)
    if (!written.ok)
      return fail(422, {
        code: written.taken ? "taken" : "refused",
        message: Object.values(written.errors).join(" "),
        fields: written.errors,
      })
    const [user] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, userId))
    if (!user?.username) throw new Error(`POST /sends: ${userId} has no name`)
    return answer(
      SendMade,
      {
        from: user.username,
        slug: written.slug,
        file: body.file,
        to: written.to,
      },
      201,
    )
  },
  { write: true },
)
