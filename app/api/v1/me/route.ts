import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users } from "@/db/schema"
import { FORMS, urlOf } from "@/lib/addresses"
import { withKey } from "@/lib/api"

// Whose key this is: their name and their address in each of e-ID's spellings
// (lib/addresses), what `eid whoami` prints.

export const GET = withKey(async (_request, { userId }) => {
  const [user] = await db
    .select({ username: users.username, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
  if (!user?.username) throw new Error(`/api/v1/me: ${userId} has no username`)
  const { username } = user
  return Response.json({
    username,
    name: user.name,
    addresses: Object.fromEntries(
      FORMS.map((f) => [f.host, urlOf(f.id, `/${username}`)]),
    ),
  })
})
