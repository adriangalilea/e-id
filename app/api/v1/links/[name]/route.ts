import { revalidateTag } from "next/cache"
import { fail, withKey } from "@/lib/api"
import { removeShortLink, shortLinksOf } from "@/lib/short-links"

// One of your short links by its name, /you/<name>: `DELETE` takes it away.

const expire = (tag: string) => revalidateTag(tag, { expire: 0 })

export const DELETE = withKey<{ name: string }>(
  async (_request, { userId }, { name }) => {
    const { links } = await shortLinksOf(userId)
    const link = links.find((l) => l.slug === name.toLowerCase())
    if (!link)
      return fail(404, {
        code: "not_found",
        message: `You have no short link at /${name}.`,
      })
    if (!(await removeShortLink(userId, link.id, expire)))
      throw new Error(`DELETE /links/${name}: ${link.id} went missing`)
    return new Response(null, { status: 204 })
  },
  { write: true },
)
