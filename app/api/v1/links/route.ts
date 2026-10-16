import { revalidateTag } from "next/cache"
import { bodyOf, fail, withKey } from "@/lib/api"
import { linkCode } from "@/lib/link-names"
import { shortLinksOf, writeShortLink } from "@/lib/short-links"

// Your short links (lib/short-links): `GET` lists them with what you may keep,
// `POST` makes one, through the same path the site's list writes with, every
// limit and check in it.
//
//   POST { to, name?, until?, opens?, onCard?, label? }
//     to      where it goes
//     name    its address name, /you/<name>; none, a made-up code
//     until   the last day it opens: "2026-12-31", or "7d" for seven days from
//             today (UTC)
//     opens   how many times it opens, 1 for one use
//     onCard  on your card too (then `label` names it there)

const expire = (tag: string) => revalidateTag(tag, { expire: 0 })

/** `until` as the day the link stops after: a day as given, or "<n>d" from
 *  today. Null for none; undefined for one that is neither. */
function dayOf(until: unknown): string | null | undefined {
  if (until === undefined || until === null) return null
  if (typeof until !== "string") return undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(until)) return until
  const days = /^(\d{1,4})d$/.exec(until)?.[1]
  if (!days) return undefined
  return new Date(Date.now() + Number(days) * 86_400_000)
    .toISOString()
    .slice(0, 10)
}

export const GET = withKey(async (_request, { userId }) =>
  Response.json(await shortLinksOf(userId)),
)

export const POST = withKey(
  async (request, { userId }) => {
    const body = await bodyOf(request)
    if (body instanceof Response) return body
    const b = body as Record<string, unknown>
    const until = dayOf(b.until)
    if (until === undefined)
      return fail(400, {
        code: "bad_until",
        message: 'A day ("2026-12-31") or a number of days ("7d").',
      })
    const written = await writeShortLink(
      userId,
      {
        id: null,
        value: b.to,
        slug: b.name ?? linkCode(),
        label: b.label ?? "",
        expires: until ?? "",
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
    return Response.json(written.link, { status: 201 })
  },
  { write: true },
)
