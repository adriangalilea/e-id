import { revalidateTag } from "next/cache"
import { answer, bodyAs, fail, withKey } from "@/lib/api"
import { CardPatchBody, MyCard } from "@/lib/api-schemas"
import { editableCard, writeCard } from "@/lib/card-write"

// Your card (lib/card-write): `GET` as you edit it, hidden links too; `PATCH`
// changes its words (name, bio, country, vouches) and writes it back through
// the path the site's editor writes with, every check in it. Never a whole-card
// replace: a script replacing everything is easy to get wrong. Its links:
// /card/links/:platform.

const expire = (tag: string) => revalidateTag(tag, { expire: 0 })

export const GET = withKey(async (_request, { userId }) =>
  answer(MyCard, await editableCard(userId)),
)

export const PATCH = withKey(
  async (request, { userId }) => {
    const patch = await bodyAs(request, CardPatchBody)
    if (patch instanceof Response) return patch
    const card = await editableCard(userId)
    const written = await writeCard(
      userId,
      {
        ...card,
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.bio !== undefined && { bio: patch.bio }),
        ...(patch.country !== undefined && {
          country: patch.country.toUpperCase(),
        }),
        ...(patch.vouches !== undefined && { vouches: patch.vouches }),
      },
      expire,
    )
    if (!written.ok)
      return fail(422, {
        code: "refused",
        message: Object.values(written.errors).join(" "),
        fields: written.errors,
      })
    return answer(MyCard, await editableCard(userId))
  },
  { write: true },
)
