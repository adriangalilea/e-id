import { and, asc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm"
import { revalidateTag } from "next/cache"
import { db } from "@/db"
import { links } from "@/db/schema"
import { required } from "@/lib/env"
import { ANYWHERE } from "@/lib/link-safety"
import { getLinkUrl } from "@/lib/links"
import { profileTag } from "@/lib/tags"
import { hrefOf } from "@/lib/web-preview-facts"
import { threatOf } from "@/lib/web-risk"

// EVERY DESTINATION ASKED AGAIN, daily (vercel.json `crons`): a page that was
// clean when its link was saved can be phishing a week later, and Web Risk lists
// it once Google finds it. The links asked longest ago first (never asked, first
// of all), BATCH a run; one listed now is taken down there and then (it opens
// nothing and leaves the card, lib/data) and its owner's page drawn again. Called
// by Vercel's cron with CRON_SECRET, by nobody else.

/** How many links a run asks about: every link once in a few days at most, at a
 *  pace Web Risk's quota and one function's time both hold. */
const BATCH = 500
/** How many questions are in flight at once. */
const AT_ONCE = 10

export async function GET(request: Request) {
  if (
    request.headers.get("authorization") !== `Bearer ${required("CRON_SECRET")}`
  )
    return new Response("not yours", { status: 401 })
  const due = await db
    .select({
      id: links.id,
      user_id: links.user_id,
      platform: links.platform,
      value: links.value,
    })
    .from(links)
    .where(
      and(
        inArray(links.platform, [...ANYWHERE]),
        isNull(links.stopped_at),
        isNotNull(links.value),
      ),
    )
    .orderBy(sql`${links.checked_at} IS NOT NULL`, asc(links.checked_at))
    .limit(BATCH)
  const stopped: string[] = []
  for (let i = 0; i < due.length; i += AT_ONCE)
    await Promise.all(
      due.slice(i, i + AT_ONCE).map(async (link) => {
        if (!link.value)
          throw new Error(`recheck: link ${link.id} lost its value`)
        const url = hrefOf(getLinkUrl(link.platform, link.value))
        const threat = await threatOf(url)
        const now = new Date()
        await db
          .update(links)
          .set({
            checked_at: now,
            ...(threat && { stopped_at: now, stopped_why: threat }),
          })
          .where(eq(links.id, link.id))
        if (!threat) return
        console.warn(`recheck: took down ${link.id} (${url}): ${threat}`)
        stopped.push(link.id)
        if (link.user_id) revalidateTag(profileTag(link.user_id), { expire: 0 })
      }),
    )
  return Response.json({ checked: due.length, stopped })
}
