import { revalidateTag } from "next/cache"
import { answer, bodyAs, fail, withKey } from "@/lib/api"
import { CardLinkPutBody, CardPlatform, MyCard } from "@/lib/api-schemas"
import { editableCard, writeCard } from "@/lib/card-write"

// One platform's link on your card (a card holds one per platform): `PUT` sets
// it (your handle there, or the address for a website or an email), `DELETE`
// takes it off. Both write the whole card back through the editor's path
// (lib/card-write), so its checks hold: the handle's form, Safe Browsing for a
// website, the 12 marks. Links of your own are /links.

const expire = (tag: string) => revalidateTag(tag, { expire: 0 })

/** The platform in the path, or the 404 that says there is no such one. */
function platformOf(raw: string) {
  const parsed = CardPlatform.safeParse(raw.toLowerCase())
  return parsed.success
    ? parsed.data
    : fail(404, {
        code: "not_found",
        message: `No platform "${raw}" on a card: ${CardPlatform.options.join(", ")}.`,
      })
}

/** The written card, or the 422 that says why it was refused. */
async function written(userId: string, card: unknown) {
  const done = await writeCard(userId, card, expire)
  if (!done.ok)
    return fail(422, {
      code: "refused",
      message: Object.values(done.errors).join(" "),
      fields: done.errors,
    })
  return answer(MyCard, await editableCard(userId))
}

export const PUT = withKey<{ platform: string }>(
  async (request, { userId }, params) => {
    const platform = platformOf(params.platform)
    if (platform instanceof Response) return platform
    const body = await bodyAs(request, CardLinkPutBody)
    if (body instanceof Response) return body
    const card = await editableCard(userId)
    const had = card.links.some((l) => l.platform === platform)
    const links = had
      ? card.links.map((l) =>
          l.platform === platform
            ? {
                ...l,
                value: body.value,
                public: body.public ?? l.public,
                note: body.note ?? l.note,
              }
            : l,
        )
      : [
          ...card.links,
          {
            id: null,
            platform,
            value: body.value,
            label: "",
            note: body.note ?? "",
            highlight: "",
            public: body.public ?? true,
            slug: "",
            visits: 0,
          },
        ]
    return written(userId, { ...card, links })
  },
  { write: true },
)

export const DELETE = withKey<{ platform: string }>(
  async (_request, { userId }, params) => {
    const platform = platformOf(params.platform)
    if (platform instanceof Response) return platform
    const card = await editableCard(userId)
    if (!card.links.some((l) => l.platform === platform))
      return fail(404, {
        code: "not_found",
        message: `Your card has no ${platform} link.`,
      })
    return written(userId, {
      ...card,
      links: card.links.filter((l) => l.platform !== platform),
    })
  },
  { write: true },
)
