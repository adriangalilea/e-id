import { revalidateTag } from "next/cache"
import { answer, bodyAs, fail, withKey } from "@/lib/api"
import { LinkCreateBody, Links, ShortLinkOut } from "@/lib/api-schemas"
import { linkCode } from "@/lib/link-names"
import { shortLinksOf, writeShortLink } from "@/lib/short-links"

// Your short links and sends (lib/short-links): `GET` lists them with what you
// may keep, `POST` makes a short link, through the same path the site's list
// writes with, every limit and check in it. Bodies and answers: lib/api-schemas
// (`LinkCreate`, `Links`, `ShortLink`).

const expire = (tag: string) => revalidateTag(tag, { expire: 0 })

/** `until` as the day the link stops after: a day as given, or "<n>d" from
 *  today (UTC). */
function dayOf(until: string): string {
  const days = /^(\d{1,4})d$/.exec(until)?.[1]
  return days
    ? new Date(Date.now() + Number(days) * 86_400_000)
        .toISOString()
        .slice(0, 10)
    : until
}

export const GET = withKey(async (_request, { userId }) =>
  answer(Links, await shortLinksOf(userId)),
)

export const POST = withKey(
  async (request, { userId }) => {
    const b = await bodyAs(request, LinkCreateBody)
    if (b instanceof Response) return b
    const written = await writeShortLink(
      userId,
      {
        id: null,
        value: b.to,
        slug: b.name ?? linkCode(),
        label: b.label ?? "",
        expires: b.until ? dayOf(b.until) : "",
        maxVisits: b.opens ?? null,
        public: b.onCard ?? false,
      },
      expire,
    )
    if (!written.ok)
      return fail(422, {
        code: "refused",
        message: Object.values(written.errors).join(" "),
        fields: written.errors,
      })
    return answer(ShortLinkOut, written.link, 201)
  },
  { write: true },
)
